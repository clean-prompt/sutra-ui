#!/usr/bin/env node
// Generates src/index.ts (the root `@sutra/ui` barrel), src/entries/core.ts (`@sutra/ui/core`, every
// primitive) and the `exports` map of package.json from the folder structure.
//
//   node scripts/gen-index.mjs           rewrite the generated files
//   node scripts/gen-index.mjs --check   exit 1 if any of them differs from what would be generated
//
// package.json `exports` is explicit, never a wildcard: the entries (src/entries/*.ts), the CSS files, one deep path per
// module of assets/primitives/patterns/kits/blocks, and the frozen `components/<name>` aliases (scripts/components-aliases.json).
// SUBPATH_ONLY entries (format) stay out of the root. A `*-internal` module gets no subpath at all, so it cannot be imported from outside the package.
//
// Sections follow the layers: Foundations, Assets, Primitives, Patterns, one section per kit, Blocks.
// Files are sorted within a section. A module is left out of the root when it
//   - reaches an optional peer (package.json `peerDependenciesMeta[x].optional`) through its imports;
//     those live only in their own entry (@sutra/ui/editor, @sutra/ui/terminal),
//   - is listed in INTERNAL below or named `*-internal` (private helpers shared by sibling modules), or
//   - is a back-compat barrel (a file made only of `export … from` lines) whose every target is
//     already exported from the root, so it would add nothing.
// Never edit the generated files by hand; change the folders (or the tables below) and rerun this script.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const SOURCE_EXTS = [".ts", ".tsx"];

/**
 * Foundations: the lib/ and hooks/ names the root re-exports are exactly those of the `@sutra/ui/tokens` entry
 * (src/entries/tokens.ts, an explicit list). Other lib/hooks modules and names are internal helpers.
 */
const FOUNDATIONS_ENTRY = "entries/tokens";

/** Modules the root does not `export *` from even though they sit in a public layer: id -> reason. */
export const INTERNAL = {
  "kits/agent-admin/secret-row": "private secret row shared by llm-providers and tool-toggles",
  // Its public names (ChatInlineCitation, ChatSourceData) reach the root through kits/ai/chat-source;
  // CitationHoverCard and safeSourceHref are helpers shared by chat-source and Markdown.
  "patterns/inline-citation": "helpers; public names come from kits/ai/chat-source",
};

/**
 * Subpath-only entries: importable as `@sutra/ui/<name>` but never part of the root barrel (their names are generic enough
 * to collide with an app's own). The root is built from the layer folders and `entries/tokens` only, and `planIndex` throws if
 * one of these ever lands in a root section. test/api-surface.test.ts checks their names against the root.
 */
export const SUBPATH_ONLY = ["format"];

// ---- module discovery -------------------------------------------------------------------------

const toPosix = (p) => p.split(path.sep).join("/");
const stripExt = (p) => p.replace(/\.tsx?$/, "");

function listModules(relDir) {
  const dir = path.join(SRC, relDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && SOURCE_EXTS.includes(path.extname(e.name)) && !/\.(test|d)\.tsx?$/.test(e.name))
    .map((e) => stripExt(`${relDir}/${e.name}`))
    .sort();
}

/** Every module under a folder, recursively (module ids relative to src, sorted). */
function listModulesDeep(relDir) {
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(path.join(SRC, rel), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${rel}/${e.name}`);
      else if (SOURCE_EXTS.includes(path.extname(e.name)) && !/\.(test|d)\.tsx?$/.test(e.name)) out.push(stripExt(`${rel}/${e.name}`));
    }
  };
  walk(relDir);
  return out.sort();
}

function listDirs(relDir) {
  return readdirSync(path.join(SRC, relDir), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Absolute file for a module id (`primitives/button`) or null; directories resolve to their index. */
function fileOf(id) {
  for (const ext of SOURCE_EXTS) if (existsSync(path.join(SRC, id + ext))) return path.join(SRC, id + ext);
  const dir = path.join(SRC, id);
  if (existsSync(dir) && statSync(dir).isDirectory()) {
    for (const ext of SOURCE_EXTS) if (existsSync(path.join(dir, `index${ext}`))) return path.join(dir, `index${ext}`);
  }
  return null;
}

/** Every module specifier in a file (static imports, export-from, dynamic imports). */
function specifiers(file) {
  const src = readFileSync(file, "utf8");
  const specs = new Set();
  for (const re of [
    /\b(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']/gs,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ]) {
    for (const m of src.matchAll(re)) specs.add(m[1]);
  }
  return [...specs];
}

/** Module id a relative specifier in `file` points at, or null. */
function resolveRelative(file, spec) {
  const id = toPosix(path.relative(SRC, path.resolve(path.dirname(file), spec)));
  return fileOf(id) ? id : null;
}

function optionalPeers() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  return Object.entries(pkg.peerDependenciesMeta ?? {})
    .filter(([, meta]) => meta?.optional)
    .map(([name]) => name);
}

/** Returns `id => peer | null`: the first optional peer a module reaches through relative imports. */
export function optionalPeerScanner(peers = optionalPeers()) {
  const memo = new Map();
  const isPeer = (spec) => peers.find((p) => spec === p || spec.startsWith(`${p}/`)) ?? null;
  const visit = (id, stack) => {
    if (memo.has(id)) return memo.get(id);
    if (stack.has(id)) return null; // cycle: the outer visit decides
    stack.add(id);
    const file = fileOf(id);
    let found = null;
    for (const spec of file ? specifiers(file) : []) {
      found = spec.startsWith(".") ? (resolveRelative(file, spec) && visit(resolveRelative(file, spec), stack)) : isPeer(spec);
      if (found) break;
    }
    stack.delete(id);
    memo.set(id, found ?? null);
    return found ?? null;
  };
  return (id) => visit(id, new Set());
}

/** Targets of a back-compat barrel (module ids), or null when the file has anything but `export … from`. */
function barrelTargets(id) {
  const file = fileOf(id);
  const code = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const statements = code.split(";").map((s) => s.trim()).filter(Boolean);
  const targets = [];
  for (const s of statements) {
    const m = /^export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+["'](\.[^"']+)["']$/s.exec(s);
    if (!m) return null;
    targets.push(resolveRelative(file, m[1]));
  }
  return targets.length ? targets : null;
}

// ---- generation -------------------------------------------------------------------------------

/** Plan the root barrel: sections of module ids plus what was left out and why. */
export function planIndex() {
  const reachesPeer = optionalPeerScanner();
  const sections = [
    { title: "Foundations: the lib/ and hooks/ names of @sutra/ui/tokens (an explicit list)", modules: [FOUNDATIONS_ENTRY] },
    { title: "Assets: src/assets", modules: listModules("assets") },
    { title: "Primitives: src/primitives", modules: listModules("primitives") },
    { title: "Patterns: src/patterns", modules: listModules("patterns") },
    ...listDirs("kits").map((kit) => ({ title: `Kit: ${kit} (src/kits/${kit})`, modules: listModules(`kits/${kit}`) })),
    { title: "Blocks: src/blocks (its own barrel)", modules: ["blocks"] },
  ];

  const excluded = [];
  for (const section of sections) {
    section.excluded = [];
    section.modules = section.modules.filter((id) => {
      const peer = reachesPeer(id);
      const reason = peer ? `imports optional peer ${peer}` : id in INTERNAL ? `internal: ${INTERNAL[id]}` : id.endsWith("-internal") ? "internal: private helpers shared by sibling modules" : null;
      if (reason) section.excluded.push({ id, reason });
      return !reason;
    });
  }

  // Back-compat barrels add nothing when every module they re-export is already in the root.
  const included = new Set(sections.flatMap((s) => s.modules));
  for (const section of sections) {
    section.modules = section.modules.filter((id) => {
      if (id === FOUNDATIONS_ENTRY) return true;
      const targets = barrelTargets(id);
      if (!targets || !targets.every((t) => t && included.has(t))) return true;
      section.excluded.push({ id, reason: "back-compat barrel, all targets exported" });
      included.delete(id);
      return false;
    });
    excluded.push(...section.excluded);
  }

  for (const name of SUBPATH_ONLY) {
    if (!fileOf(`entries/${name}`)) throw new Error(`gen-index: SUBPATH_ONLY lists entries/${name}, which does not exist`);
    if (sections.some((section) => section.modules.includes(`entries/${name}`))) throw new Error(`gen-index: entries/${name} is subpath-only and must not be in the root`);
  }
  return { sections, excluded };
}

const HEADER = (what) => [
  "/*",
  ` * ${what}`,
  " * GENERATED by scripts/gen-index.mjs from the folder structure. Do not edit; rerun `pnpm gen:index`.",
  " */",
];

/** src/index.ts: the `@sutra/ui` root barrel. */
export function generateIndex(plan = planIndex()) {
  const out = HEADER("Sutra UI: public API (the `@sutra/ui` root).");
  for (const section of plan.sections) {
    out.push("", `/* ${section.title} */`);
    for (const { id, reason } of [...section.excluded].sort((a, b) => a.id.localeCompare(b.id))) {
      out.push(`// not exported: ${id} (${reason})`);
    }
    for (const id of section.modules) out.push(`export * from "./${id}";`);
  }
  return out.join("\n") + "\n";
}

/** src/entries/core.ts: `@sutra/ui/core`, every primitive the root exports. */
export function generateCore(plan = planIndex()) {
  const primitives = plan.sections.find((s) => s.title.startsWith("Primitives")).modules;
  const out = HEADER("@sutra/ui/core: every primitive (src/primitives), the basic controls everything else builds on.");
  out.push("", ...primitives.map((id) => `export * from "../${id}";`));
  return out.join("\n") + "\n";
}

const conditional = (id) => ({ types: `./dist/${id}.d.ts`, import: `./dist/${id}.js`, default: `./dist/${id}.js` });

/** Modules that get no subpath in `exports`: the `*-internal` helpers. (INTERNAL only keeps a module out of the root.) */
export const isPrivateModule = (id) => id.endsWith("-internal");

/** The folders whose modules are importable by deep path (`@sutra/ui/<folder>/<file>`). */
const DEEP_LAYERS = ["assets", "primitives", "patterns", "kits", "blocks"];

/** The frozen back-compat aliases `@sutra/ui/components/<name>` -> module id (scripts/components-aliases.json). */
function componentAliases() {
  return JSON.parse(readFileSync(path.join(ROOT, "scripts/components-aliases.json"), "utf8"));
}

/** package.json `exports`: explicit keys only, in a stable order. */
export function generateExports() {
  const out = { ".": conditional("index") };
  for (const id of listModules("entries").map((m) => m.slice("entries/".length)).sort()) out[`./${id}`] = conditional(`entries/${id}`);
  out["./styles.css"] = "./src/styles/sutra.css";
  out["./paper.css"] = "./src/styles/paper.css";
  out["./package.json"] = "./package.json";
  for (const layer of DEEP_LAYERS) {
    for (const id of listModulesDeep(layer)) {
      if (isPrivateModule(id) || id === "blocks/index") continue;
      out[`./${id}`] = conditional(id);
    }
  }
  for (const [name, id] of Object.entries(componentAliases()).sort(([a], [b]) => a.localeCompare(b))) {
    if (isPrivateModule(id) || !fileOf(id)) throw new Error(`gen-index: components/${name} points at ${id}, which is private or missing`);
    out[`./components/${name}`] = conditional(id);
  }
  return out;
}

/** package.json with a regenerated `exports` (every other field untouched). */
export function generatePackageJson() {
  const file = path.join(ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  pkg.exports = generateExports();
  return JSON.stringify(pkg, null, 2) + "\n";
}

/** Every generated file: path relative to the package root -> contents. */
export function generateFiles() {
  const plan = planIndex();
  return { "src/index.ts": generateIndex(plan), "src/entries/core.ts": generateCore(plan), "package.json": generatePackageJson() };
}

/** Generated files whose contents on disk differ from what would be generated. */
export function staleFiles() {
  return Object.entries(generateFiles())
    .filter(([rel, next]) => !existsSync(path.join(ROOT, rel)) || readFileSync(path.join(ROOT, rel), "utf8") !== next)
    .map(([rel]) => rel);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes("--check")) {
    const stale = staleFiles();
    if (stale.length) {
      console.error(`gen-index: out of date: ${stale.join(", ")}. Run \`pnpm gen:index\` (node scripts/gen-index.mjs).`);
      process.exit(1);
    }
    console.log("gen-index: src/index.ts, src/entries/core.ts and package.json exports are up to date");
  } else {
    for (const [rel, next] of Object.entries(generateFiles())) {
      const file = path.join(ROOT, rel);
      if (existsSync(file) && readFileSync(file, "utf8") === next) continue;
      writeFileSync(file, next);
      console.log(`gen-index: wrote ${rel}`);
    }
  }
}
