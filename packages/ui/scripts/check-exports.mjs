#!/usr/bin/env node
// Verifies the published surface after `pnpm build`: every `exports` subpath resolves through the
// package's own name, its files exist (JS and types), and the module imports under plain Node ESM. `exports` must be
// explicit (no wildcard), and no `*-internal` module of dist may be resolvable through it.
// A second phase imports every subpath again in a Node process whose resolver HIDES every optional peer
// (`peerDependenciesMeta`): a subpath that crashes there, other than the ones in ENTRY_PEERS below, would break
// an app that installs only some of the peers (this is how `@cleanprompt/sutra-ui/editor` once failed without TipTap).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Subpaths that legitimately need an optional peer to import: subpath -> peers (a trailing `/*` matches a scope or a
 * package family), declared here and nowhere else. They load the engine with a static import. Everything else must
 * import with every optional peer missing. Keep it in step with ENGINE_ENTRIES in test/api-surface.test.ts.
 */
const CM = ["@codemirror/*"];
const TT = ["@tiptap/*"];
const ENTRY_PEERS = {
  "./code-editor": CM,
  "./rich-text-editor": TT,
  // The same modules by deep path and by the frozen components/* alias.
  "./kits/editor/code-editor": CM,
  "./kits/editor/rich-text-editor": TT,
  "./components/code-editor": CM,
  "./components/rich-text-editor": TT,
};
const peerMatches = (peer, pattern) => (pattern.endsWith("/*") ? peer.startsWith(pattern.slice(0, -1)) : peer === pattern);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];
const fail = (msg) => failures.push(msg);
const abs = (rel) => path.join(root, rel);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

/** Expand a conditional export into concrete [subpath, jsTarget, typesTarget] triples. */
function expand(key, value) {
  if (!key.includes("*")) return [[key, value.import, value.types]];
  fail(`${key}: wildcard exports are not allowed (they would publish the *-internal modules); run \`pnpm gen:index\``);
  const [jsPre, jsPost] = value.import.split("*");
  const [tPre, tPost] = value.types.split("*");
  const matches = walk(abs(jsPre))
    .map((f) => "./" + path.relative(root, f).split(path.sep).join("/"))
    .filter((f) => f.startsWith(jsPre) && f.endsWith(jsPost))
    .map((f) => f.slice(jsPre.length, f.length - jsPost.length));
  if (matches.length === 0) fail(`${key}: wildcard target ${value.import} matches no files`);
  return matches.map((m) => [key.replace("*", m), jsPre + m + jsPost, tPre + m + tPost]);
}

// ---- package.json shape -----------------------------------------------------------------------
for (const field of ["main", "module", "types"]) {
  if (pkg[field] && !existsSync(abs(pkg[field]))) fail(`"${field}" points at missing ${pkg[field]}`);
}

const targets = [];
for (const [key, value] of Object.entries(pkg.exports)) {
  if (typeof value === "string") {
    if (!existsSync(abs(value))) fail(`${key}: missing ${value}`);
    continue;
  }
  const conditions = Object.keys(value);
  if (conditions[0] !== "types") fail(`${key}: "types" must be the first condition (got ${conditions.join(", ")})`);
  if (!value.import) fail(`${key}: no "import" condition`);
  if (!value.default) fail(`${key}: no "default" condition`);
  else if (value.default !== value.import) fail(`${key}: "default" (${value.default}) differs from "import" (${value.import})`);
  if (!value.types || !value.import) continue;
  targets.push(...expand(key, value));
}

// ---- files: every export target and every Tailwind @source must ship -------------------------
const files = pkg.files ?? [];
const shipped = (rel) => {
  const norm = path.normalize(rel).replace(/^\.\//, "");
  return norm === "package.json" || files.some((f) => norm === path.normalize(f) || norm.startsWith(path.normalize(f) + path.sep));
};
for (const value of Object.values(pkg.exports)) {
  for (const target of typeof value === "string" ? [value] : Object.values(value)) {
    if (!shipped(target.replace("*", "x"))) fail(`export target ${target} is not covered by "files"`);
  }
}
for (const value of Object.values(pkg.exports)) {
  if (typeof value !== "string" || !value.endsWith(".css")) continue;
  const css = readFileSync(abs(value), "utf8");
  for (const [, src] of css.matchAll(/@source\s+(?:not\s+)?["']([^"']+)["']/g)) {
    const scanned = path.relative(root, path.resolve(path.dirname(abs(value)), src));
    if (!shipped(scanned)) fail(`${value} has @source "${src}" (${scanned || "."}) but "files" does not include it`);
  }
}

// ---- resolve and import every subpath ---------------------------------------------------------
let imported = 0;
for (const [subpath, js, types] of targets) {
  const specifier = pkg.name + subpath.slice(1);
  const expected = pathToFileURL(abs(js)).href;
  if (!existsSync(abs(js))) {
    fail(`${specifier}: missing ${js}`);
    continue;
  }
  if (!existsSync(abs(types))) fail(`${specifier}: missing types ${types}`);
  let resolved;
  try {
    resolved = import.meta.resolve(specifier);
  } catch (err) {
    fail(`${specifier}: does not resolve (${err.message})`);
    continue;
  }
  if (resolved !== expected) fail(`${specifier}: resolves to ${resolved}, expected ${expected}`);
  try {
    const mod = await import(specifier);
    // A types-only module (e.g. patterns/chart-types) is empty at runtime; its .d.ts must still export something.
    const typesOnly = existsSync(abs(types)) && /^export\s/m.test(readFileSync(abs(types), "utf8"));
    if (Object.keys(mod).length === 0 && !typesOnly) fail(`${specifier}: module has no exports`);
    imported++;
  } catch (err) {
    fail(`${specifier}: import failed: ${err?.stack?.split("\n").slice(0, 3).join(" | ") ?? err}`);
  }
}

// ---- private modules: no `*-internal` file of dist is reachable through `exports` ----------------
let hidden = 0;
const distRoot = abs("dist");
for (const file of walk(distRoot).filter((f) => f.endsWith("-internal.js"))) {
  const sub = path.relative(distRoot, file).split(path.sep).join("/").replace(/\.js$/, "");
  const specifier = `${pkg.name}/${sub}`;
  let resolved = null;
  try {
    resolved = import.meta.resolve(specifier);
  } catch {
    hidden++;
    continue;
  }
  fail(`${specifier}: an internal module resolves through package exports (${resolved})`);
}
for (const [key, value] of Object.entries(pkg.exports)) {
  const targets = typeof value === "string" ? [value] : Object.values(value);
  if (key.endsWith("-internal") || targets.some((t) => /-internal\.(js|d\.ts)$/.test(t))) fail(`${key}: exports an internal module`);
}

// ---- no optional peer installed: every subpath must still import (except ENTRY_PEERS) -------------
const HIDE_HOOK = `
const peers = JSON.parse(process.env.SUTRA_HIDDEN_PEERS ?? "[]");
export async function resolve(specifier, context, next) {
  const peer = peers.find((p) => specifier === p || specifier.startsWith(p + "/"));
  if (peer) {
    throw Object.assign(new Error("Cannot find package '" + peer + "' imported from " + context.parentURL + " (hidden optional peer)"), { code: "ERR_MODULE_NOT_FOUND", peer });
  }
  return next(specifier, context);
}`;
const CHILD = `
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(process.env.SUTRA_HIDE_HOOK));
const results = {};
for (const specifier of JSON.parse(process.env.SUTRA_SPECIFIERS)) {
  try { await import(specifier); results[specifier] = null; }
  catch (err) { results[specifier] = { code: err?.code ?? null, peer: err?.peer ?? /Cannot find (?:package|module) '([^']+)'/.exec(String(err?.message))?.[1] ?? null, message: String(err?.message ?? err).split("\\n")[0] }; }
}
process.stdout.write("\\n@@RESULT@@" + JSON.stringify(results));`;
const optionalPeers = Object.entries(pkg.peerDependenciesMeta ?? {}).filter(([, meta]) => meta?.optional).map(([name]) => name);
let withoutPeers = 0;
if (optionalPeers.length && targets.length) {
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", CHILD], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      SUTRA_HIDE_HOOK: HIDE_HOOK,
      SUTRA_HIDDEN_PEERS: JSON.stringify(optionalPeers),
      SUTRA_SPECIFIERS: JSON.stringify(targets.map(([subpath]) => pkg.name + subpath.slice(1))),
    },
  });
  const marker = (child.stdout ?? "").lastIndexOf("@@RESULT@@");
  if (marker < 0) {
    fail(`peers-hidden phase: the child process produced no result (exit ${child.status}): ${(child.stderr ?? "").split("\n").slice(0, 4).join(" | ")}`);
  } else {
    const results = JSON.parse(child.stdout.slice(marker + "@@RESULT@@".length));
    const declared = new Set(Object.keys(ENTRY_PEERS));
    for (const key of declared) {
      if (!targets.some(([subpath]) => subpath === key)) fail(`ENTRY_PEERS lists ${key}, which is not an exports key`);
    }
    for (const [subpath] of targets) {
      const specifier = pkg.name + subpath.slice(1);
      const result = results[specifier];
      const allowed = ENTRY_PEERS[subpath];
      if (result === null) {
        withoutPeers++;
        if (allowed) fail(`${specifier}: listed in ENTRY_PEERS but imports fine without ${allowed.join(", ")}; remove it from the map`);
      } else if (!result) {
        fail(`${specifier}: not imported in the peers-hidden phase`);
      } else if (result.peer && allowed?.some((pattern) => peerMatches(result.peer, pattern))) {
        // expected: this subpath loads its engine with a static import
      } else if (result.peer) {
        fail(`${specifier}: needs the optional peer ${result.peer} at import time${allowed ? ` (allowed here: ${allowed.join(", ")})` : ""}. Load it lazily with a dynamic import() or move the module to an entry of its own, then see ENTRY_PEERS`);
      } else {
        fail(`${specifier}: import failed with every optional peer hidden: ${result.message}`);
      }
    }
  }
}

if (failures.length) {
  console.error(`check-exports: ${failures.length} problem(s)\n` + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  `check-exports: ${imported} subpaths resolved and imported from dist, ${withoutPeers} also import with every optional peer hidden (${Object.keys(ENTRY_PEERS).length} declared in ENTRY_PEERS), ${hidden} internal modules not resolvable`
);
