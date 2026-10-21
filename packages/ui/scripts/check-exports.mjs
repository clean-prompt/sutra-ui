#!/usr/bin/env node
// Verifies the published surface after `pnpm build`: every `exports` subpath resolves through the
// package's own name, its files exist (JS and types), and the module imports under plain Node ESM. `exports` must be
// explicit (no wildcard), and no `*-internal` module of dist may be resolvable through it.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

if (failures.length) {
  console.error(`check-exports: ${failures.length} problem(s)\n` + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(`check-exports: ${imported} subpaths resolved and imported from dist, ${hidden} internal modules not resolvable`);
