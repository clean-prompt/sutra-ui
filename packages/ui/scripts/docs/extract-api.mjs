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

/** cva() calls in a file: `Map<constName, { variants: {prop: values[]}, defaults: {prop: value} }>`. */
function cvaTable(sourceFile) {
  const table = new Map();
  const literalKeys = (obj) => obj.properties.map((p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)) ? p.name.text : null)).filter((k) => k !== null);
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
                entry.variants[v.name.text] = literalKeys(v.initializer);
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

const SLOT = /data-slot=(?:"([^"]+)"|\{"([^"]+)"\})/;
const SLOTS = new RegExp(SLOT.source, "g");

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
    if (!cvaCache.has(sf.fileName)) cvaCache.set(sf.fileName, cvaTable(sf));
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
    for (const c of used) {
      for (const [k, values] of Object.entries(cvas.get(c).variants)) if (ownNames.has(k) && !variants[k]) variants[k] = values;
      for (const [k, v] of Object.entries(cvas.get(c).defaults)) if (!(k in variantDefaults)) variantDefaults[k] = v;
      if (!sizes && cvas.get(c).sizeClasses && ownNames.has("size")) sizes = cvas.get(c).sizeClasses;
    }

    // No cva `size` variant: a `const sizes = {...}` map in the file that the component uses and whose keys are its sizes.
    if (!sizes && ownNames.has("size")) {
      const sizeProp = own.find((p) => p.getName() === "size");
      const typeText = sizeProp ? checker.typeToString(checker.getTypeOfSymbolAtLocation(sizeProp, decl)) : "";
      for (const [c, map] of sizeTable) {
        if (!new RegExp(`\\b${c}\\b`).test(text)) continue;
        const keys = Object.keys(map);
        if (keys.length >= 2 && keys.every((k) => typeText.includes(k) || /^(Size|Density)/.test(typeText) || /Size/.test(typeText))) {
          sizes = map;
          break;
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
    const slot = SLOT.exec(text);
    if (slot) entry.slot = slot[1] ?? slot[2];
    // Every slot the declaration renders, in source order (only when it renders more than one; `slot` is the first).
    const allSlots = [...new Set([...text.matchAll(SLOTS)].map((m) => m[1] ?? m[2]))];
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
