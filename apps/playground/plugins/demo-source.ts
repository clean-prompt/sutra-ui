/**
 * Demo source for the playground: finds every `<Demo>` in src/pages and the src/demos modules they import with the TypeScript compiler API and serves, per
 * page, the JSX it renders (so the "Code" panel can never drift from the demo), the import line for it and the
 * components whose props table belongs under it.
 *
 * Virtual modules (built on request, so dev and build both work; one lazy chunk per page file):
 *   `virtual:demo-source`          route ("components/buttons") -> () => import of that page's sources
 *   `virtual:demo-source/<file>`   Demo key (its `id`, else its string `title`) -> DemoSource
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { Plugin } from "vite";

export interface DemoSource {
  /** The JSX of the demo (or, for a demo built inside a helper component, the whole helper with the Demo frame removed). */
  code: string;
  /** Import lines for the Sutra names the code uses. */
  imports: string;
  /** The Sutra values the code uses (the page's install line is the union of these). */
  names: string[];
  /** Playground-only names the code uses (`Row`, `DemoLabel`, shared constants): not part of the library. */
  helpers: string[];
  /** Components or hooks whose generated props belong under this demo (see `matchProps`). */
  props: string[];
}

interface Api {
  components: Record<string, { layer: string }>;
  hooks: Record<string, unknown>;
  entries: Record<string, string>;
}

/** Lower-cased name -> real name, so `input-otp` finds `InputOTP`. Built once per api object. */
const lowerNames = new WeakMap<Api, Map<string, string>>();
function nameIndex(api: Api): Map<string, string> {
  let index = lowerNames.get(api);
  if (!index) {
    index = new Map([...Object.keys(api.components), ...Object.keys(api.hooks)].map((n) => [n.toLowerCase(), n]));
    lowerNames.set(api, index);
  }
  return index;
}

const VIRTUAL = "virtual:demo-source";
const SUTRA = /^@cleanprompt\/sutra-ui(\/|$)/;

/* ---------------------------------------------------------------------------------------------- */
/* Source reading                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

const literal = (node: ts.Node | undefined): string | null => {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isJsxExpression(node) && node.expression) return literal(node.expression);
  return null;
};

const attrOf = (open: ts.JsxOpeningLikeElement, name: string) => {
  const a = open.attributes.properties.find((p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === name);
  return a?.initializer;
};

function dedent(text: string): string {
  const lines = text.replace(/\t/g, "  ").split("\n");
  while (lines.length && !lines[0]!.trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1]!.trim()) lines.pop();
  const indents = lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut).trimEnd()).join("\n");
}

const words = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
const pascal = (ws: string[]) => ws.map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");
const singular = (w: string) => (w.endsWith("ies") ? `${w.slice(0, -3)}y` : /(s|x|ch|sh)es$/.test(w) ? w.slice(0, -2) : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/**
 * Which generated API entries (components, hooks) belong under a demo: the whole `id` as a name (`toggle-group` ->
 * `ToggleGroup`), else names spelled by runs of words in the title ("Toggle button and toggle group" -> ToggleButton,
 * ToggleGroup), else hooks the code calls. Longest names win; plurals are tried singular.
 */
export function matchProps(id: string | null, title: string | null, usedNames: string[], api: Api | null): string[] {
  if (!api) return [];
  const used = [...new Set(usedNames)];
  const index = nameIndex(api);
  const variants = (ws: string[]) => {
    const last = ws[ws.length - 1]!;
    return [pascal(ws), pascal([...ws.slice(0, -1), singular(last)])];
  };
  const find = (ws: string[]) => variants(ws).map((v) => index.get(v.toLowerCase())).find((v) => v !== undefined);
  if (id) {
    const ws = words(id);
    const whole = find(ws) ?? (ws.length > 1 ? find(["use", ...ws]) : undefined) ?? (ws.length === 1 ? find(["use", ...ws]) : undefined);
    if (whole) return [whole];
  }
  const found: string[] = [];
  if (title) {
    for (const segment of title.split(/[,&/:()—–]|\band\b|\bwith\b|\bvs\b|\bor\b/i)) {
      const ws = words(segment);
      const taken = new Set<number>();
      for (let len = Math.min(4, ws.length); len >= 1; len--) {
        for (let i = 0; i + len <= ws.length; i++) {
          if (len === 1 && i !== 0) continue; // a lone word counts only at the start of a phrase ("Card", not "... card")
          if ([...Array(len).keys()].some((k) => taken.has(i + k))) continue;
          const hit = find(ws.slice(i, i + len));
          if (hit && !found.includes(hit)) {
            found.push(hit);
            for (let k = 0; k < len; k++) taken.add(i + k);
          }
        }
      }
    }
  }
  if (found.length === 0) {
    // The demo's subject is usually the first pattern, kit or block component it renders (not a primitive like Button), else a hook it calls.
    found.push(...used.filter((u) => api.components[u] && api.components[u]!.layer !== "primitives").slice(0, 2));
    if (found.length === 0) found.push(...used.filter((u) => u in api.hooks).slice(0, 2));
  }
  return found.slice(0, 4);
}

interface FileInfo {
  sutraImports: Map<string, { specifier: string; typeOnly: boolean }>;
  locals: Set<string>;
  relativeImports: string[];
}

function fileInfo(sf: ts.SourceFile): FileInfo {
  const sutraImports = new Map<string, { specifier: string; typeOnly: boolean }>();
  const locals = new Set<string>();
  const relativeImports: string[] = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const spec = st.moduleSpecifier.text;
      const clause = st.importClause;
      if (!clause) continue;
      const names: [string, boolean][] = [];
      if (clause.name) names.push([clause.name.text, !!clause.isTypeOnly]);
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const el of clause.namedBindings.elements) names.push([el.name.text, !!(clause.isTypeOnly || el.isTypeOnly)]);
      if (SUTRA.test(spec)) for (const [n, typeOnly] of names) sutraImports.set(n, { specifier: spec, typeOnly });
      else if (spec.startsWith(".")) {
        relativeImports.push(spec);
        for (const [n] of names) locals.add(n);
      }
    } else if (ts.isFunctionDeclaration(st) && st.name) locals.add(st.name.text);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) locals.add(d.name.text);
  }
  return { sutraImports, locals, relativeImports };
}

/** Identifier names used under `node`; a `<Demo>` met on the way is entered through its children only. */
function identifiersUnder(node: ts.Node, skipFrame: ts.Node | null): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node) => {
    if (n === skipFrame && (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n))) {
      if (ts.isJsxElement(n)) n.children.forEach(visit);
      return;
    }
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const isMemberName = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isJsxAttribute(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n);
      if (!isMemberName) out.add(n.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

function importLines(names: string[], imported: Map<string, { specifier: string }>, api: Api | null, usesReact: boolean): string {
  const bySpec = new Map<string, string[]>();
  for (const name of names) {
    const own = imported.get(name)!;
    const entry = /^Ri[A-Z]/.test(name) ? "icons" : api?.entries[name];
    const spec = entry ? (entry === "index" ? "@cleanprompt/sutra-ui" : `@cleanprompt/sutra-ui/${entry}`) : own.specifier;
    if (!bySpec.has(spec)) bySpec.set(spec, []);
    bySpec.get(spec)!.push(name);
  }
  const lines: string[] = [];
  if (usesReact) lines.push('import * as React from "react";');
  for (const spec of [...bySpec.keys()].sort((a, b) => (a === "@cleanprompt/sutra-ui" ? -1 : b === "@cleanprompt/sutra-ui" ? 1 : a.localeCompare(b)))) {
    const list = bySpec.get(spec)!.sort();
    const one = `import { ${list.join(", ")} } from "${spec}";`;
    lines.push(one.length <= 100 ? one : `import {\n${list.map((n) => `  ${n},`).join("\n")}\n} from "${spec}";`);
  }
  return lines.join("\n");
}

/** Every `<Demo>` of one file: Demo key -> source. */
/** A top-level component of a page file (or a sibling demo file), so a Demo that is just `<ThatDemo />` can show its source. */
export interface Declaration {
  node: ts.Node;
  info: FileInfo;
}

/** The top-level function and arrow-function components of a file, by name. */
export function declarationsOf(fileName: string, text: string): Map<string, Declaration> {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const info = fileInfo(sf);
  const out = new Map<string, Declaration>();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) out.set(st.name.text, { node: st, info });
    else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) out.set(d.name.text, { node: st, info });
      }
    }
  }
  return out;
}

export function extractDemos(
  fileName: string,
  text: string,
  api: Api | null,
  declarations: Map<string, Declaration> = new Map()
): { demos: Record<string, DemoSource>; relativeImports: string[]; sutraImports: Map<string, { specifier: string }> } {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const info = fileInfo(sf);
  const demos: Record<string, DemoSource> = {};

  const visit = (n: ts.Node) => {
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText() === "Demo") {
      const id = literal(attrOf(n.openingElement, "id"));
      const title = literal(attrOf(n.openingElement, "title"));
      const key = id ?? title;
      if (key && !demos[key]) {
        const inner = text.slice(n.openingElement.end, n.closingElement.getStart());
        // A demo built inside its own helper component (it owns state or refs) shows the whole helper, minus the Demo frame.
        let fn: ts.Node | undefined = n.parent;
        while (fn && !ts.isFunctionDeclaration(fn) && !(ts.isArrowFunction(fn) && ts.isVariableDeclaration(fn.parent))) fn = fn.parent;
        const name = fn ? (ts.isFunctionDeclaration(fn) ? fn.name?.text : (fn.parent as ts.VariableDeclaration).name.getText()) : undefined;
        let scope: ts.Node = n;
        let code = dedent(inner);
        if (fn && name && !/Page$/.test(name) && ts.isBlock((fn as ts.FunctionDeclaration).body ?? ({} as ts.Node))) {
          const ret = ((fn as ts.FunctionDeclaration).body as ts.Block).statements.find(ts.isReturnStatement);
          let expr = ret?.expression;
          while (expr && ts.isParenthesizedExpression(expr)) expr = expr.expression;
          if (expr === n) {
            const stmt = ts.isFunctionDeclaration(fn) ? fn : fn.parent.parent.parent; // VariableStatement
            const start = stmt.getStart();
            const body = text.slice(start, n.getStart()) + `<>${inner}</>` + text.slice(n.end, stmt.end);
            code = dedent(body.replace(/^export\s+/, ""));
            scope = stmt;
          }
        }
        let owner = info;
        // A demo that is only `<SomeDemo />`: show SomeDemo itself.
        const single = /^<([A-Z]\w*)\s*\/>$/.exec(code);
        const decl = single ? declarations.get(single[1]!) : undefined;
        if (decl) {
          code = dedent(decl.node.getText().replace(/^export\s+/, ""));
          scope = decl.node;
          owner = decl.info;
        }
        const used = identifiersUnder(scope, decl ? null : n);
        const sutra = [...used].filter((u) => {
          const imp = owner.sutraImports.get(u);
          if (!imp || imp.typeOnly) return false;
          return api ? /^Ri[A-Z]/.test(u) || u in api.entries : true;
        });
        const helpers = [...used].filter((u) => owner.locals.has(u) && u !== name && !(decl && declarations.get(u)?.node === decl.node)).sort();
        demos[key] = {
          code,
          imports: importLines(sutra, owner.sutraImports, api, /\bReact\./.test(code)),
          names: sutra.sort(),
          helpers,
          props: matchProps(id, title, sutra.concat([...used].filter((u) => /^use[A-Z]/.test(u))), api),
        };
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { demos, relativeImports: info.relativeImports, sutraImports: info.sutraImports };
}

/* ---------------------------------------------------------------------------------------------- */
/* The plugin                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

/** Routes of App.tsx's page map: "components/buttons" -> "buttons" (the file in src/pages). */
export function pageFiles(appText: string): Record<string, string> {
  const named = new Map<string, string>();
  for (const m of appText.matchAll(/const (\w+) = \(\) => import\("\.\/pages\/([\w-]+)"\)/g)) named.set(m[1]!, m[2]!);
  const out: Record<string, string> = {};
  for (const m of appText.matchAll(/"([\w-]+\/[\w-]+)":\s*lazyPage\(\s*(?:\(\)\s*=>\s*import\("\.\/pages\/([\w-]+)"\)|(\w+))/g)) {
    const file = m[2] ?? named.get(m[3]!);
    if (file) out[m[1]!] = file;
  }
  return out;
}

/**
 * The page or demo module a relative import points at, as a path under src without extension ("demos/gesture-demos"),
 * or null when it is something else (components, lib). `from` is the importing module in the same form ("pages/buttons").
 */
export function siblingModule(from: string, rel: string): string | null {
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(from), rel));
  return /^(pages|demos)\/[\w-]+$/.test(target) ? target : null;
}

export function demoSourcePlugin(): Plugin {
  const src = path.resolve(__dirname, "../src");
  const pagesDir = path.join(src, "pages");
  const demosDir = path.join(src, "demos");
  const apiFile = path.join(src, "generated/api.json");
  let apiCache: { mtime: number; api: Api } | null = null;

  const readApi = (): Api | null => {
    if (!existsSync(apiFile)) return null;
    const mtime = statSync(apiFile).mtimeMs;
    if (apiCache?.mtime !== mtime) apiCache = { mtime, api: JSON.parse(readFileSync(apiFile, "utf8")) as Api };
    return apiCache.api;
  };
  const read = (file: string) => readFileSync(path.join(src, `${file}.tsx`), "utf8");

  /** A page file ("pages/buttons") and the demo modules it imports (`../demos/gesture-demos`), transitively. */
  const closure = (file: string): string[] => {
    const seen: string[] = [];
    const queue = [file];
    while (queue.length) {
      const f = queue.shift()!;
      if (seen.includes(f) || !existsSync(path.join(src, `${f}.tsx`))) continue;
      seen.push(f);
      for (const rel of extractDemos(f, read(f), null).relativeImports) {
        const sibling = siblingModule(f, rel);
        if (sibling) queue.push(sibling);
      }
    }
    return seen;
  };

  return {
    name: "sutra-demo-source",
    resolveId(id) {
      if (id === VIRTUAL || id.startsWith(`${VIRTUAL}/`)) return `\0${id}`;
    },
    load(id) {
      if (id === `\0${VIRTUAL}`) {
        const app = path.join(src, "App.tsx");
        this.addWatchFile(app);
        const routes = pageFiles(readFileSync(app, "utf8"));
        const body = Object.entries(routes)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([route, file]) => `  ${JSON.stringify(route)}: () => import(${JSON.stringify(`${VIRTUAL}/${file}`)}),`)
          .join("\n");
        return `export default {\n${body}\n};\n`;
      }
      if (id.startsWith(`\0${VIRTUAL}/`)) {
        const file = id.slice(`\0${VIRTUAL}/`.length);
        const api = readApi();
        if (api) this.addWatchFile(apiFile);
        const all: Record<string, DemoSource> = {};
        const imported = new Map<string, { specifier: string }>();
        const files = closure(`pages/${file}`);
        const declarations = new Map<string, Declaration>();
        for (const f of files) for (const [name, d] of declarationsOf(f, read(f))) if (!declarations.has(name)) declarations.set(name, d);
        for (const f of files) {
          this.addWatchFile(path.join(src, `${f}.tsx`));
          const found = extractDemos(f, read(f), api, declarations);
          for (const [key, demo] of Object.entries(found.demos)) if (!(key in all)) all[key] = demo;
          for (const [name, imp] of found.sutraImports) imported.set(name, imp);
        }
        // The page's import line: every Sutra value its demos use, each from the entry that exports it.
        const names = [...new Set(Object.values(all).flatMap((d) => d.names))].filter((n) => imported.has(n));
        const imports = importLines(names, imported, api, false);
        return `export default ${JSON.stringify(all)};\nexport const imports = ${JSON.stringify(imports)};\n`;
      }
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(pagesDir) && !file.startsWith(demosDir) && !file.endsWith("generated/api.json") && !file.endsWith("/App.tsx")) return;
      for (const mod of server.moduleGraph.idToModuleMap.values()) if (mod.id?.startsWith(`\0${VIRTUAL}`)) server.moduleGraph.invalidateModule(mod);
    },
  };
}
