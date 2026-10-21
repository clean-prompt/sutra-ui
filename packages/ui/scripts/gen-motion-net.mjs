#!/usr/bin/env node
// Generates the in-app twin (`<html data-motion="reduce">`) of every reduced-motion block in src/styles/*.css.
//
// Reduced motion has two triggers that must do the same thing: the system request (`@media (prefers-reduced-motion:
// reduce)` unless the page says `data-motion="full"`) and the in-app switch (`data-motion="reduce"`). A rule is written
// once, as a top-level `@media (prefers-reduced-motion: reduce) { ... }` block whose selectors start with
// `:where(:root:not([data-motion="full"]))` (or `:root:not([data-motion="full"])`). The block that follows it, between
//
//     /* BEGIN generated: motion twin ... */
//     /* END generated: motion twin */
//
// is derived from it here: the @media wrapper goes, the `:root:not([data-motion="full"])` selector becomes
// `:root[data-motion="reduce"]`, everything else (declarations, comments, nesting) is copied.
//
//   node scripts/gen-motion-net.mjs           rewrite the generated regions
//   node scripts/gen-motion-net.mjs --check   exit 1 if a region differs, or a marker has no @media block above it
//
// Never edit a generated region by hand: change the @media block above it and rerun. test/motion-guard and
// test/motion-attribute still parse the two-block layout, and test/motion-net-gen.test.ts runs the check.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLES = path.join(ROOT, "src/styles");

export const BEGIN = "/* BEGIN generated: motion twin (scripts/gen-motion-net.mjs, from the @media block above; do not edit) */";
export const END = "/* END generated: motion twin */";
const MEDIA = "@media (prefers-reduced-motion: reduce)";
const SYSTEM_WHERE = ':where(:root:not([data-motion="full"]))';
const SYSTEM_ROOT = ':root:not([data-motion="full"])';

/** The top-level `@media (prefers-reduced-motion: reduce)` blocks of `css`, as `{ start, open, end }` offsets (`end` is past the `}`). */
function topLevelMediaBlocks(css) {
  const blocks = [];
  let depth = 0;
  let segStart = 0; // just after the last top-level `}` or `;`
  let blockStart = -1;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i + 2) + 1;
      if (i === 0) throw new Error("unterminated comment");
    } else if (c === '"' || c === "'") {
      for (i++; css[i] !== c; i++) if (css[i] === "\\") i++;
    } else if (c === "{") {
      if (depth === 0) {
        const head = css.slice(segStart, i).replace(/\/\*[\s\S]*?\*\//g, "").trim();
        blockStart = head === MEDIA ? css.indexOf(MEDIA, segStart) : -1;
        open = i;
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        if (blockStart >= 0) blocks.push({ start: blockStart, open, end: i + 1 });
        segStart = i + 1;
      }
    } else if (c === ";" && depth === 0) {
      segStart = i + 1;
    }
  }
  return blocks;
}

/** The `data-motion="reduce"` rules for the body of a system block (the text between the @media braces). */
export function twinOf(body, where = "block") {
  if (!body.includes(SYSTEM_ROOT)) throw new Error(`${where}: no ${SYSTEM_ROOT} selector to derive the twin from`);
  const out = body
    .replaceAll(SYSTEM_WHERE, ':where(:root[data-motion="reduce"])')
    .replaceAll(SYSTEM_ROOT, ':root[data-motion="reduce"]')
    .split("\n")
    .map((line) => (line.startsWith("  ") ? line.slice(2) : line))
    .join("\n")
    .replace(/^\s*\n/, "")
    .replace(/\s+$/, "\n");
  if (out.includes('data-motion="full"')) throw new Error(`${where}: a selector other than the two known system forms mentions data-motion="full"`);
  return out;
}

/** Rewrite the generated regions of one stylesheet. Returns `{ css, problems }`. */
export function regenerate(css, file = "css") {
  const problems = [];
  const blocks = topLevelMediaBlocks(css);
  let out = "";
  let from = 0;
  let at;
  while ((at = css.indexOf(BEGIN, from)) >= 0) {
    const line = css.slice(0, at).split("\n").length;
    const endAt = css.indexOf(END, at);
    if (endAt < 0) {
      problems.push(`${file}:${line}: BEGIN without END`);
      break;
    }
    const source = blocks.filter((b) => b.end <= at).pop();
    if (!source || css.slice(source.end, at).trim() !== "") {
      problems.push(`${file}:${line}: the marker must directly follow a top-level ${MEDIA} block`);
      out += css.slice(from, endAt + END.length);
    } else {
      const body = css.slice(source.open + 1, source.end - 1);
      out += `${css.slice(from, at)}${BEGIN}\n${twinOf(body, `${file}:${line}`)}${END}`;
    }
    from = endAt + END.length;
  }
  out += css.slice(from);
  if (css.includes(END) && !css.includes(BEGIN)) problems.push(`${file}: END without BEGIN`);
  return { css: out, problems };
}

/** The stylesheets under src/styles (the generator runs on all of them; paper.css has no regions today). */
export function styleFiles() {
  return readdirSync(STYLES).filter((f) => f.endsWith(".css")).sort().map((f) => path.join(STYLES, f));
}

/** Files whose generated regions are not what the generator would write, plus structural problems. */
export function check() {
  const stale = [];
  const problems = [];
  for (const file of styleFiles()) {
    const before = readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    const res = regenerate(before, rel);
    problems.push(...res.problems);
    if (res.css !== before) stale.push(rel);
  }
  return { stale, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checkOnly = process.argv.includes("--check");
  let bad = false;
  for (const file of styleFiles()) {
    const before = readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    const res = regenerate(before, rel);
    for (const p of res.problems) console.error(p);
    if (res.problems.length) bad = true;
    if (res.css === before) continue;
    if (checkOnly) bad = true;
    else writeFileSync(file, res.css);
    console.log(`${checkOnly ? "stale" : "updated"}: ${rel}`);
  }
  if (bad) {
    console.error("Reduced-motion twins are stale or malformed: run `node scripts/gen-motion-net.mjs`.");
    process.exit(1);
  }
}
