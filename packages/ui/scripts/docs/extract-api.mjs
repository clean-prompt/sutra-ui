// Reads the public exports of @sutra/ui with the TypeScript compiler API and describes every component
// (and hook): where it lives, which entry exports it, its own props (type as written, required, default,
// JSDoc description, @deprecated), the `data-slot` names it renders (`slot`, plus `slots` when there are several) and the cva variants it exposes.
//
// "Own" props are those declared inside src/. Everything inherited from React (HTML attributes) or a
// dependency (Radix) is not listed; it shows up as `inherits` instead, so the tables stay readable.
//
// Used by gen-docs.mjs (writes apps/playground/src/generated/api.json) and by test/jsdoc-coverage.test.ts.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parseSizeClasses } from "./sizing.mjs";

const toPosix = (p) => p.split(path.sep).join("/");
const squash = (s) => s.replace(/\s+/g, " ").trim();
const MAX_TYPE = 400;
const clip = (s) => (s.length > MAX_TYPE ? `${s.slice(0, MAX_TYPE - 1)}…` : s);
/** Bases that are on every element and tell the reader nothing. */
const NOISE = new Set(["DOMAttributes", "AriaAttributes", "Attributes", "ClassAttributes", "RefAttributes"]);
const LAYERS = ["primitives", "patterns", "kits", "blocks", "assets"];

/** The names exported by a source file (aliases followed), as `Map<name, symbol>`. */
function exportsOf(checker, sourceFile) {
  const mod = checker.getSymbolAtLocation(sourceFile);
  const out = new Map();
  if (!mod) return out;
  for (const s of checker.getExportsOfModule(mod)) out.set(s.getName(), s);
  return out;
}

const resolveAlias = (checker, sym) => (sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym);

function docText(checker, sym) {
  return ts.displayPartsToString(sym.getDocumentationComment(checker)).trim();
}

function tagText(sym, checker, name) {
  const tag = sym.getJsDocTags(checker).find((t) => t.name === name);
  if (!tag) return undefined;
  return ts.displayPartsToString(tag.text).trim() || "true";
}

/** First function-like node under `node` whose first parameter is an object pattern or a plain `props` name. */
function findImplementation(node) {
  let found;
  const visit = (n) => {
    if (found) return;
    if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)) && n.parameters.length > 0) {
      const p = n.parameters[0];
      if (ts.isObjectBindingPattern(p.name) || ts.isIdentifier(p.name)) {
        found = n;
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/** `{ a = 1, b: c = "x" }` in the component's parameter (or `const { a = 1 } = props` in its body): name -> default text. */
function destructuringDefaults(decl) {
  const out = new Map();
  const impl = findImplementation(decl);
  if (!impl) return out;
  const read = (pattern) => {
    for (const el of pattern.elements) {
      if (!el.initializer || el.dotDotDotToken) continue;
      const key = el.propertyName ?? el.name;
      if (ts.isIdentifier(key) || ts.isStringLiteral(key)) out.set(key.text, squash(el.initializer.getText()));
    }
  };
  const p = impl.parameters[0];
  if (ts.isObjectBindingPattern(p.name)) read(p.name);
  else if (impl.body && ts.isBlock(impl.body)) {
    const propsName = p.name.text;
    const visit = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer && ts.isIdentifier(n.initializer) && n.initializer.text === propsName) read(n.name);
      else if (!ts.isFunctionLike(n) || n === impl) ts.forEachChild(n, visit);
    };
    visit(impl.body);
  }
  return out;
}

/** The class text of a cva value: string literals in source order, shared constants (`hitAreaTouch`) as `@name`. */
function classText(node) {
  const out = [];
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) {
      out.push(n.head.text);
      for (const span of n.templateSpans) {
        visit(span.expression);
        out.push(span.literal.text);
      }
    } else if (ts.isPropertyAssignment(n)) {
      // Nested parts (`{ track: "h-1", thumb: "size-4" }`): the key labels what follows as `track:`.
      if (n.name && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name))) out.push(`${n.name.text}:`);
      visit(n.initializer);
    } else if (ts.isIdentifier(n) && !["cn", "cva", "undefined"].includes(n.text)) out.push(`@${n.text}`);
    else if (ts.isCallExpression(n)) n.arguments.forEach(visit);
    else ts.forEachChild(n, visit);
  };
  visit(node);
  return squash(out.join(" "));
}

/** Top-level `const sizes = { sm: "...", md: "..." }` style maps (a const whose name mentions size): `Map<constName, {key: classText}>`. */
function sizeMaps(sourceFile) {
  const out = new Map();
  for (const st of sourceFile.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      let init = d.initializer;
      while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression(init) || ts.isParenthesizedExpression(init))) init = init.expression;
      if (!ts.isIdentifier(d.name) || !/size/i.test(d.name.text) || !init || !ts.isObjectLiteralExpression(init)) continue;
      const entries = init.properties.filter((p) => ts.isPropertyAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)));
      if (entries.length < 2 || entries.length !== init.properties.length) continue;
      out.set(d.name.text, Object.fromEntries(entries.map((p) => [p.name.text, classText(p.initializer)])));
    }
  }
  return out;
}

/** The keys of an object literal in source order: literal names, plus the keys of any `...spread` (resolved by type, e.g. `...toneClasses.text`). */
function literalKeys(checker, obj) {
  const keys = [];
  for (const p of obj.properties) {
    if (ts.isSpreadAssignment(p)) {
      const spread = checker.getTypeAtLocation(p.expression);
      // A spread of a non-literal type (a union, an index signature) has no fixed keys to list.
      if (spread.flags & ts.TypeFlags.Object && !checker.getIndexInfosOfType(spread).length) for (const prop of checker.getPropertiesOfType(spread)) keys.push(prop.getName());
    } else if (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name))) keys.push(p.name.text);
  }
  return [...new Set(keys)];
}

const unwrap = (e) => {
  while (e && (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e))) e = e.expression;
  return e;
};
/** A bare size name (`sm`, `icon-sm`, `display-xs`): the value of a map that hands the size on to another component, no classes. */
const BARE_SIZE = /^(?:icon|(?:icon-|display-)?(?:[23]?xs|sm|md|lg|xl|2xl|default))$/;
const SIZE_ORDER = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];

/** Every top-level `const name = { ... }` object literal of a file: `Map<name, ObjectLiteralExpression>`. */
function objectConsts(sourceFile) {
  const out = new Map();
  for (const st of sourceFile.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      const init = unwrap(d.initializer);
      if (ts.isIdentifier(d.name) && init && ts.isObjectLiteralExpression(init)) out.set(d.name.text, init);
    }
  }
  return out;
}

const propKey = (p) => (ts.isPropertyAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)) ? p.name.text : null);

/**
 * What a component's `size` prop selects inside its render function (no cva `size` variant, no `sizes` const): lookups in a module
 * const (`barHeight[size]`, or per variant `triggerSize[variant][size]`, shown as `variant: classes`) and `size === "sm" ? a : size === "md" ? b : c`
 * chains (the last branch belongs to the one size left). `sizeKeys` are the literal values of the prop's type.
 * Returns `{ [size]: classText }` when at least two sizes set something a sizing column can read, else undefined.
 */
function renderSizes(decl, objects, sizeKeys) {
  if (sizeKeys.length < 2) return undefined;
  const found = {};
  // One lookup is a map size -> classes. It counts only when it covers every size (a partial one is about something else), a branch that
  // only names a size (`size === "sm" ? "xs" : "sm"`, passed on to a child) sets no classes, and the same classes twice count once.
  const take = (map) => {
    if (!sizeKeys.every((k) => map[k])) return;
    for (const [key, text] of Object.entries(map)) {
      if (!sizeKeys.includes(key) || text.split(" ").every((t) => sizeKeys.includes(t) || BARE_SIZE.test(t))) return;
    }
    for (const [key, text] of Object.entries(map)) if (sizeKeys.includes(key) && !(found[key] ??= []).includes(text)) found[key].push(text);
  };
  const isSize = (e) => e && ts.isIdentifier(e) && e.text === "size";
  const visit = (n) => {
    if (ts.isElementAccessExpression(n) && isSize(n.argumentExpression)) {
      const target = unwrap(n.expression);
      if (ts.isIdentifier(target) && objects.has(target.text)) {
        const map = {};
        for (const p of objects.get(target.text).properties) {
          const key = propKey(p);
          if (key !== null && !ts.isObjectLiteralExpression(unwrap(p.initializer))) map[key] = classText(p.initializer);
        }
        take(map);
      } else if (ts.isElementAccessExpression(target) && ts.isIdentifier(unwrap(target.expression)) && objects.has(unwrap(target.expression).text)) {
        const map = {};
        for (const outer of objects.get(unwrap(target.expression).text).properties) {
          const inner = propKey(outer) !== null ? unwrap(outer.initializer) : undefined;
          if (!inner || !ts.isObjectLiteralExpression(inner)) continue;
          for (const p of inner.properties) {
            const key = propKey(p);
            if (key !== null) map[key] = squash(`${map[key] ?? ""} ${propKey(outer)}: ${classText(p.initializer)}`);
          }
        }
        take(map);
      }
    } else if (ts.isConditionalExpression(n) && !(ts.isConditionalExpression(n.parent) && n.parent.whenFalse === n)) {
      const pairs = [];
      let tail = n;
      const test = (c) => {
        const cond = unwrap(c);
        if (!ts.isBinaryExpression(cond) || cond.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return null;
        return isSize(cond.left) && ts.isStringLiteral(cond.right) ? cond.right.text : isSize(cond.right) && ts.isStringLiteral(cond.left) ? cond.left.text : null;
      };
      while (ts.isConditionalExpression(tail) && test(tail.condition) !== null) {
        pairs.push([test(tail.condition), tail.whenTrue]);
        tail = unwrap(tail.whenFalse);
      }
      if (pairs.length) {
        const map = Object.fromEntries(pairs.map(([key, value]) => [key, classText(value)]));
        const left = sizeKeys.filter((k) => !(k in map));
        if (left.length === 1) map[left[0]] = classText(tail);
        take(map);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(decl);
  const keys = Object.keys(found);
  if (SIZE_ORDER.some((k) => keys.includes(k)) && keys.every((k) => SIZE_ORDER.includes(k))) keys.sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  const sizes = Object.fromEntries(keys.map((k) => [k, squash(found[k].join(" "))]));
  // Only when the classes say something a sizing column can read (a height, a width, padding, a text step, an icon size).
  const readable = keys.filter((k) => {
    const p = parseSizeClasses(sizes[k]);
    return p.parts.length > 0 || [p.height, p.width, p.maxWidth, p.padX, p.padY, p.text, p.icon].some((v) => v !== null);
  });
  return readable.length >= 2 && readable.length === keys.length ? sizes : undefined;
}

/** cva() calls in a file: `Map<constName, { variants: {prop: values[]}, defaults: {prop: value} }>`. */
function cvaTable(sourceFile, checker) {
  const table = new Map();
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "cva" && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) {
      const config = n.arguments[1];
      const entry = { variants: {}, defaults: {} };
      if (config && ts.isObjectLiteralExpression(config)) {
        for (const prop of config.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isObjectLiteralExpression(prop.initializer) || !ts.isIdentifier(prop.name)) continue;
          if (prop.name.text === "variants") {
            for (const v of prop.initializer.properties) {
              if (ts.isPropertyAssignment(v) && ts.isObjectLiteralExpression(v.initializer) && v.name && (ts.isIdentifier(v.name) || ts.isStringLiteral(v.name) || ts.isNumericLiteral(v.name))) {
                entry.variants[v.name.text] = literalKeys(checker, v.initializer);
                if (v.name.text === "size") {
                  entry.sizeClasses = Object.fromEntries(
                    v.initializer.properties
                      .filter((p) => ts.isPropertyAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)))
                      .map((p) => [p.name.text, classText(p.initializer)])
                  );
                }
              }
            }
          } else if (prop.name.text === "defaultVariants") {
            for (const d of prop.initializer.properties) {
              if (ts.isPropertyAssignment(d) && ts.isIdentifier(d.name)) entry.defaults[d.name.text] = squash(d.initializer.getText());
            }
          }
        }
      }
      table.set(n.parent.name.text, entry);
    }
    ts.forEachChild(n, visit);
  };
  visit(sourceFile);
  return table;
}

/** The string values an expression can take that the source spells out: literals, both sides of `?:` / `??` / `||`, a literal-typed identifier, a destructured default. */
function stringValues(checker, expr, defaults) {
  const out = [];
  const visit = (e) => {
    if (ts.isStringLiteralLike(e)) out.push(e.text);
    else if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isNonNullExpression(e)) visit(e.expression);
    else if (ts.isConditionalExpression(e)) {
      visit(e.whenTrue);
      visit(e.whenFalse);
    } else if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      visit(e.left);
      visit(e.right);
    } else if (ts.isIdentifier(e)) {
      const type = checker.getTypeAtLocation(e);
      const literals = (type.isUnion() ? type.types : [type]).filter((t) => t.isStringLiteral()).map((t) => t.value);
      if (literals.length) out.push(...literals);
      else {
        const d = defaults.get(e.text);
        if (d) {
          const m = /^(["`])([^"`${}]*)\1$/.exec(d);
          if (m) out.push(m[2]);
        }
      }
    }
  };
  visit(expr);
  return out;
}

/**
 * Every `data-slot` name a component declaration renders, in source order: the JSX attribute (`data-slot="x"`, `data-slot={cond ? "a" : "b"}`,
 * `data-slot={slotName}` with a literal type or default) and the object key (`{ "data-slot": "x" }`, also inside spreads), then the same
 * from the file-private helpers (a non-exported function or const of the same file) it refers to, transitively.
 */
function slotNames(checker, decl, defaults, publicDecls) {
  const sf = decl.getSourceFile();
  const found = [];
  const seen = new Set([decl]);
  const queue = [decl];
  // A helper is file-private: not `export`ed and not exposed through an `export { }` list or an entry (those are components of their own).
  const isExported = (d) => (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Export) !== 0 || publicDecls.has(d);
  const take = (expr) => {
    if (expr) for (const v of stringValues(checker, expr, defaults)) if (!found.includes(v)) found.push(v);
  };
  while (queue.length) {
    const root = queue.shift();
    const visit = (n) => {
      if (ts.isJsxAttribute(n) && ts.isIdentifier(n.name) && n.name.text === "data-slot" && n.initializer) {
        take(ts.isJsxExpression(n.initializer) ? n.initializer.expression : n.initializer);
      } else if (ts.isPropertyAssignment(n) && (ts.isStringLiteral(n.name) || ts.isIdentifier(n.name)) && n.name.text === "data-slot") {
        take(n.initializer);
      } else if (ts.isIdentifier(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
        const target = checker.getSymbolAtLocation(n)?.valueDeclaration;
        if (target && !seen.has(target) && target.getSourceFile() === sf && (ts.isFunctionDeclaration(target) || ts.isVariableDeclaration(target)) && !isExported(target)) {
          const top = ts.isVariableDeclaration(target) ? target.parent.parent.parent : target.parent;
          if (top === sf) {
            seen.add(target);
            queue.push(target);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(root);
  }
  return found;
}

/** `file#constName` of the `cva()` whose `variants` declare this prop (a prop derived from `VariantProps<typeof x>`), else undefined. */
function cvaOrigin(prop) {
  for (const d of prop.declarations ?? []) {
    for (let n = d.parent; n; n = n.parent) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "cva" && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) {
        return `${n.getSourceFile().fileName}#${n.parent.name.text}`;
      }
    }
  }
  return undefined;
}

/** True when the prop has a type annotation in the source (not one derived from `VariantProps<typeof cva>`). */
function writtenType(prop) {
  return (prop.declarations ?? []).some(hasWrittenType);
}

/** The union of a cva variant's keys in declaration order (a true/false variant is a boolean). */
function variantType(values) {
  if (values.length && values.every((v) => v === "true" || v === "false")) return "boolean";
  return clip(values.map((v) => (/^\d+$/.test(v) ? v : JSON.stringify(v))).join(" | "));
}

const hasWrittenType = (d) => (ts.isPropertySignature(d) || ts.isPropertyDeclaration(d) || ts.isParameter(d)) && !!d.type;

function propInfo(checker, prop, ctx) {
  const at = ctx.at;
  const decl = prop.valueDeclaration ?? prop.declarations?.[0];
  let type;
  // The type as written. A union props type (`type: "single"` | `type: "multiple"`) has one declaration per branch: join them.
  const written = [...new Set((prop.declarations ?? []).filter(hasWrittenType).map((d) => squash(d.type.getText())))];
  if (written.length) type = written.length === 1 ? written[0] : written.map((t) => (t.includes("=>") ? `(${t})` : t)).join(" | ");
  else type = checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, at), undefined, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
  if (prop.flags & ts.SymbolFlags.Optional) type = type.replace(/\s*\|\s*undefined$/, "");
  const info = { name: prop.getName(), type: clip(type), required: !(prop.flags & ts.SymbolFlags.Optional) && !ctx.branchOnly.has(prop.getName()) };
  const description = docText(checker, prop);
  if (description) info.description = description;
  const dflt = tagText(prop, checker, "default") ?? tagText(prop, checker, "defaultValue");
  if (dflt && dflt !== "true") info.default = dflt;
  const dep = tagText(prop, checker, "deprecated");
  if (dep) info.deprecated = dep === "true" ? "Deprecated." : dep;
  return info;
}

/** Splits a props type's properties into own (declared in src) and inherited (names of the declaring interfaces). */
function splitProps(checker, propsType, srcDir) {
  const own = [];
  const inherited = new Map();
  // A union of props (discriminated by `type`) lists the shared props first, then those only some branches have (never required).
  const common = checker.getPropertiesOfType(propsType);
  const branchOnly = new Set();
  const all = [...common];
  if (propsType.isUnion()) {
    const seen = new Set(common.map((p) => p.getName()));
    for (const branch of propsType.types) {
      for (const p of checker.getPropertiesOfType(branch)) {
        if (seen.has(p.getName())) continue;
        seen.add(p.getName());
        branchOnly.add(p.getName());
        all.push(p);
      }
    }
  }
  for (const prop of all) {
    const decl = prop.valueDeclaration ?? prop.declarations?.[0];
    const file = decl?.getSourceFile().fileName;
    if (file && toPosix(file).startsWith(toPosix(srcDir) + "/")) {
      own.push(prop);
      continue;
    }
    let owner = decl?.parent;
    while (owner && !ts.isInterfaceDeclaration(owner) && !ts.isTypeAliasDeclaration(owner)) owner = owner.parent;
    const name = owner?.name?.text;
    if (name && !NOISE.has(name)) inherited.set(name, (inherited.get(name) ?? 0) + 1);
  }
  return { own, branchOnly, inherits: [...inherited.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4).map(([n]) => n) };
}

/** Describes the public API of the package at `root` (packages/ui). */
export function buildApi({ root }) {
  const srcDir = path.join(root, "src");
  const cfg = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
  const entryFiles = readdirSync(path.join(srcDir, "entries")).filter((f) => f.endsWith(".ts")).sort();
  const rootNames = [path.join(srcDir, "index.ts"), ...entryFiles.map((f) => path.join(srcDir, "entries", f))];
  const program = ts.createProgram({ rootNames, options: { ...parsed.options, noEmit: true, types: [], skipLibCheck: true } });
  const checker = program.getTypeChecker();

  /** name -> entries that export it ("index" is the root `@sutra/ui`). */
  const entriesOf = new Map();
  const entrySize = new Map();
  const symbols = new Map();
  const addEntry = (entryName, file) => {
    const sf = program.getSourceFile(file);
    if (!sf) return;
    const names = exportsOf(checker, sf);
    entrySize.set(entryName, names.size);
    for (const [name, sym] of names) {
      if (!entriesOf.has(name)) entriesOf.set(name, []);
      entriesOf.get(name).push(entryName);
      if (!symbols.has(name)) symbols.set(name, sym);
    }
  };
  addEntry("index", rootNames[0]);
  for (const f of entryFiles) addEntry(f.replace(/\.ts$/, ""), path.join(srcDir, "entries", f));

  const primaryEntry = (name) => {
    const list = entriesOf.get(name) ?? [];
    const narrow = list.filter((e) => e !== "index" && e !== "core");
    const pool = narrow.length ? narrow : list.filter((e) => e !== "index");
    const best = (pool.length ? pool : list).slice().sort((a, b) => (entrySize.get(a) ?? 0) - (entrySize.get(b) ?? 0) || a.localeCompare(b))[0];
    return best ?? "index";
  };

  const components = {};
  const hooks = {};
  const entryOfName = {};
  const cvaCache = new Map();
  const sizeCache = new Map();
  const objectCache = new Map();
  const publicDecls = new Set([...symbols.values()].map((x) => resolveAlias(checker, x).valueDeclaration).filter(Boolean));

  for (const [name, exported] of [...symbols.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sym = resolveAlias(checker, exported);
    // Value names only (the install line imports values); the icon set is one entry, `@sutra/ui/icons`.
    if (sym.flags & ts.SymbolFlags.Value && !/^Ri[A-Z]/.test(name)) entryOfName[name] = primaryEntry(name);
    if (!(sym.flags & (ts.SymbolFlags.Variable | ts.SymbolFlags.Function | ts.SymbolFlags.Class))) continue;
    const decl = sym.valueDeclaration;
    if (!decl) continue;
    const file = toPosix(decl.getSourceFile().fileName);
    if (!file.startsWith(toPosix(srcDir) + "/")) continue;
    const moduleId = file.slice(toPosix(srcDir).length + 1).replace(/\.tsx?$/, "");
    const [layer, kit] = moduleId.split("/");
    const isComponent = /^[A-Z][A-Za-z0-9]*[a-z0-9][A-Za-z0-9]*$/.test(name) && LAYERS.includes(layer);
    const isHook = /^use[A-Z]/.test(name);
    if (!isComponent && !isHook) continue;

    const type = checker.getTypeOfSymbolAtLocation(sym, decl);
    const sigs = type.getCallSignatures();
    if (sigs.length === 0) continue;
    const sig = sigs[0];
    const param = sig.getParameters()[0];
    const propsType = param ? checker.getTypeOfSymbolAtLocation(param, decl) : undefined;

    const impl = decl;
    const defaults = destructuringDefaults(impl);
    const text = impl.getText();
    const sf = decl.getSourceFile();
    if (!cvaCache.has(sf.fileName)) cvaCache.set(sf.fileName, cvaTable(sf, checker));
    const cvas = cvaCache.get(sf.fileName);
    if (!sizeCache.has(sf.fileName)) sizeCache.set(sf.fileName, sizeMaps(sf));
    const sizeTable = sizeCache.get(sf.fileName);

    let own = [];
    let inherits = [];
    let branchOnly = new Set();
    if (propsType) ({ own, inherits, branchOnly } = splitProps(checker, propsType, srcDir));
    const ownNames = new Set(own.map((p) => p.getName()));

    // cva variants this component uses: the cva constants named in its body, else the file's only cva when it matches a prop.
    const used = [...cvas.keys()].filter((c) => new RegExp(`\\b${c}\\b`).test(text));
    if (used.length === 0 && cvas.size === 1) {
      const [only] = [...cvas.keys()];
      if (Object.keys(cvas.get(only).variants).some((v) => ownNames.has(v))) used.push(only);
    }
    const variants = {};
    const variantDefaults = {};
    let sizes;
    // A prop that comes from another cva (a component typed with `ButtonProps` in a file that has its own cva) is not described by this one.
    const origins = new Map(own.map((p) => [p.getName(), cvaOrigin(p)]));
    const fits = (k, c) => !origins.get(k) || origins.get(k) === `${sf.fileName}#${c}`;
    for (const c of used) {
      for (const [k, values] of Object.entries(cvas.get(c).variants)) if (ownNames.has(k) && !variants[k] && fits(k, c)) variants[k] = values;
      for (const [k, v] of Object.entries(cvas.get(c).defaults)) if (!(k in variantDefaults) && ownNames.has(k) && fits(k, c)) variantDefaults[k] = v;
      if (!sizes && cvas.get(c).sizeClasses && ownNames.has("size") && fits("size", c)) sizes = cvas.get(c).sizeClasses;
    }

    // No cva `size` variant: a `const sizes = {...}` map in the file that the component uses and whose keys are its sizes.
    if (!sizes && ownNames.has("size")) {
      const sizeProp = own.find((p) => p.getName() === "size");
      const typeText = sizeProp ? checker.typeToString(checker.getTypeOfSymbolAtLocation(sizeProp, decl)) : "";
      for (const [c, map] of sizeTable) {
        if (!new RegExp(`\\b${c}\\b`).test(text)) continue;
        const keys = Object.keys(map);
        // A map from a size to another component's size name (`{ sm: "icon-sm" }`) sets no classes of its own.
        const bare = Object.values(map).every((text) => text.split(" ").every((t) => BARE_SIZE.test(t)));
        if (!bare && keys.length >= 2 && keys.every((k) => typeText.includes(k) || /^(Size|Density)/.test(typeText) || /Size/.test(typeText))) {
          sizes = map;
          break;
        }
      }
    }

    // Still none: the size is picked in the render function (a lookup in a module const, a `size === "sm" ?` chain), here or in a
    // part that reads it from a context this component provides (Tabs and its triggers).
    if (!sizes && ownNames.has("size")) {
      const sizeProp = own.find((p) => p.getName() === "size");
      const type = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(sizeProp, decl));
      const keys = (type.isUnion() ? type.types : [type]).filter((t) => t.isStringLiteral() || t.isNumberLiteral()).map((t) => String(t.value));
      if (!objectCache.has(sf.fileName)) objectCache.set(sf.fileName, objectConsts(sf));
      const objects = objectCache.get(sf.fileName);
      sizes = renderSizes(decl, objects, keys);
      if (!sizes) {
        const contexts = [...text.matchAll(/\b(\w+)\.Provider\b/g)].map((m) => m[1]);
        for (const st of sf.statements) {
          if (sizes || st === decl.parent.parent || st === decl) continue;
          if (!(ts.isVariableStatement(st) || ts.isFunctionDeclaration(st)) || !contexts.some((c) => st.getText().includes(`useContext(${c})`))) continue;
          sizes = renderSizes(st, objects, keys);
        }
      }
    }

    const props = own
      .map((p) => {
        const info = propInfo(checker, p, { at: decl, branchOnly });
        if (variants[info.name] && !writtenType(p)) info.type = variantType(variants[info.name]);
        if (info.default === undefined) {
          const d = defaults.get(info.name) ?? variantDefaults[info.name];
          if (d !== undefined) info.default = d;
        }
        return info;
      })
      .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));

    const entry = { kind: isHook ? "hook" : "component", module: moduleId, layer, entries: (entriesOf.get(name) ?? []).slice().sort(), entry: entryOfName[name] };
    if (layer === "kits") entry.kit = kit;
    // The component's JSDoc, else the one on its `<Name>Props` interface.
    const propsSym = symbols.get(`${name}Props`);
    const description = docText(checker, sym) || (propsSym ? docText(checker, resolveAlias(checker, propsSym)) : "");
    if (description) entry.description = description;
    const dep = tagText(sym, checker, "deprecated");
    if (dep) entry.deprecated = dep === "true" ? "Deprecated." : dep;
    // Every slot the declaration renders, in source order (only when it renders more than one; `slot` is the first).
    const allSlots = slotNames(checker, decl, defaults, publicDecls);
    if (allSlots.length) entry.slot = allSlots[0];
    if (allSlots.length > 1) entry.slots = allSlots;
    if (Object.keys(variants).length) entry.variants = variants;
    // What each `size` step sets: the class text of the cva `size` variant (read by the playground's Sizing page).
    if (sizes) {
      entry.sizes = sizes;
      // The module extends small targets to 24px with `hitArea` / `hitAreaTouch` (lib/cn).
      if (/\bhitArea/.test(sf.text)) entry.hitArea = true;
    }
    if (inherits.length) entry.inherits = inherits;
    if (isHook) entry.signature = clip(squash(checker.signatureToString(sig, undefined, ts.TypeFormatFlags.NoTruncation)));
    entry.props = props;
    (isHook ? hooks : components)[name] = entry;
  }

  return { components, hooks, entries: entryOfName };
}

/** Coverage numbers for components: own props, props without a description, per component. */
export function coverage(api) {
  const missing = {};
  let props = 0;
  let undocumented = 0;
  let documentedComponents = 0;
  for (const [name, c] of Object.entries(api.components)) {
    props += c.props.length;
    const gap = c.props.filter((p) => !p.description).length;
    undocumented += gap;
    if (gap === 0) documentedComponents++;
    if (gap > 0) missing[name] = gap;
  }
  return {
    components: Object.keys(api.components).length,
    componentsWithoutDescription: Object.values(api.components).filter((c) => !c.description).length,
    componentsFullyDocumented: documentedComponents,
    props,
    undocumentedProps: undocumented,
    missing,
  };
}

/** One component per line so a diff of the generated file reads. */
export function serialize(api) {
  const block = (obj) => `{\n${Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",\n")}\n}`;
  return `{\n"components":${block(api.components)},\n"hooks":${block(api.hooks)},\n"entries":${JSON.stringify(api.entries)}\n}\n`;
}

export const hasSource = (root) => existsSync(path.join(root, "src", "index.ts"));
