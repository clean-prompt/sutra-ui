#!/usr/bin/env node
// Generates src/index.ts (the root `@sutra/ui` barrel) and src/entries/core.ts (`@sutra/ui/core`,
// every primitive) from the folder structure.
//
//   node scripts/gen-index.mjs           rewrite the generated files
//   node scripts/gen-index.mjs --check   exit 1 if either file differs from what would be generated
//
// Sections follow the layers: Foundations, Assets, Primitives, Patterns, one section per kit, Blocks.
// Files are sorted within a section. A module is left out of the root when it
//   - reaches an optional peer (package.json `peerDependenciesMeta[x].optional`) through its imports;
//     those live only in their own entry (@sutra/ui/editor, @sutra/ui/terminal),
//   - is listed in INTERNAL below, or
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
 * Foundations: the lib/ and hooks/ modules the root re-exports are exactly those of the
 * `@sutra/ui/tokens` entry (src/entries/tokens.ts). Other lib/hooks modules are internal helpers.
 */
const FOUNDATIONS_ENTRY = "entries/tokens.ts";

/** Modules the root does not `export *` from even though they sit in a public layer: id -> reason. */
export const INTERNAL = {
  "kits/workspace/kanban-internal": "private constants shared by the kanban modules",
  // Its public names (ChatInlineCitation, ChatSourceData) reach the root through kits/ai/chat-source;
  // CitationHoverCard and safeSourceHref are helpers shared by chat-source and Markdown.
  "patterns/inline-citation": "helpers; public names come from kits/ai/chat-source",
};

/**
 * Root-name overrides. When two modules re-exported with `export *` both export a name, ES modules
 * drop it as ambiguous; an explicit `export { name } from` picks the winner. The root keeps the older
 * component versions (different defaults); the lib versions are exported from `@sutra/ui/tokens`.
 */
export const OVERRIDES = {
  formatBytes: "patterns/file-upload", // vs lib/format
  splitDuration: "patterns/countdown", // vs lib/duration
  base32Decode: "kits/identity/totp", // vs lib/encoding
};

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
  const foundations = specifiers(path.join(SRC, FOUNDATIONS_ENTRY))
    .filter((s) => s.startsWith("."))
    .map((s) => resolveRelative(path.join(SRC, FOUNDATIONS_ENTRY), s))
    .sort();

  const sections = [
    { title: "Foundations: lib/ and hooks/ modules (the same set as @sutra/ui/tokens)", modules: foundations },
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
      const reason = peer ? `imports optional peer ${peer}` : id in INTERNAL ? `internal: ${INTERNAL[id]}` : null;
      if (reason) section.excluded.push({ id, reason });
      return !reason;
    });
  }

  // Back-compat barrels add nothing when every module they re-export is already in the root.
  const included = new Set(sections.flatMap((s) => s.modules));
  for (const section of sections) {
    section.modules = section.modules.filter((id) => {
      const targets = barrelTargets(id);
      if (!targets || !targets.every((t) => t && included.has(t))) return true;
      section.excluded.push({ id, reason: "back-compat barrel, all targets exported" });
      included.delete(id);
      return false;
    });
    excluded.push(...section.excluded);
  }

  for (const [name, id] of Object.entries(OVERRIDES)) {
    if (!included.has(id)) throw new Error(`gen-index: override ${name} points at ${id}, which is not in the root`);
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
  out.push("", "/* Root-name overrides: names exported by two modules above (see OVERRIDES in scripts/gen-index.mjs) */");
  for (const [name, id] of Object.entries(OVERRIDES).sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`export { ${name} } from "./${id}";`);
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

/** Every generated file: path relative to the package root -> contents. */
export function generateFiles() {
  const plan = planIndex();
  return { "src/index.ts": generateIndex(plan), "src/entries/core.ts": generateCore(plan) };
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
    console.log("gen-index: src/index.ts and src/entries/core.ts are up to date");
  } else {
    for (const [rel, next] of Object.entries(generateFiles())) {
      const file = path.join(ROOT, rel);
      if (existsSync(file) && readFileSync(file, "utf8") === next) continue;
      writeFileSync(file, next);
      console.log(`gen-index: wrote ${rel}`);
    }
  }
}
