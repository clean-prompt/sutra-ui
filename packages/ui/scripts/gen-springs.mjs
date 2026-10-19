#!/usr/bin/env node
// Generates the spring tokens (`--sutra-spring-<name>` as a CSS `linear()` easing plus `-duration`) from the
// physical springs in src/lib/spring.ts, into the marked blocks of src/styles/sutra.css (stock) and
// src/styles/paper.css (calmer, see springs-css.mjs). The paper block also re-points the theme easings
// (`--ease-spring-<name>`), because a var() chain resolves where it is declared.
//
//   node scripts/gen-springs.mjs           rewrite the blocks
//   node scripts/gen-springs.mjs --check   exit 1 if a block differs from what would be generated
//
// Needs Node 22.18+ (it imports the TypeScript lib directly: type stripping is on by default). Never edit the
// generated blocks by hand: change the numbers in lib/spring.ts (stock) or springs-css.mjs (paper) and rerun.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PAPER_SPRINGS, springBlock, withBlock } from "./springs-css.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { springs, springToLinear } = await import(pathToFileURL(path.join(ROOT, "src/lib/spring.ts")).href);

const FILES = [
  ["src/styles/sutra.css", () => springBlock(springs, springToLinear)],
  ["src/styles/paper.css", () => springBlock(PAPER_SPRINGS, springToLinear, { themeEases: true })],
];

const check = process.argv.includes("--check");
let stale = false;
for (const [file, lines] of FILES) {
  const full = path.join(ROOT, file);
  const before = readFileSync(full, "utf8");
  const after = withBlock(before, lines());
  if (after === before) continue;
  stale = true;
  if (!check) writeFileSync(full, after);
  console.log(`${check ? "stale" : "updated"}: ${file}`);
}
if (check && stale) {
  console.error("Spring tokens are stale: run `node scripts/gen-springs.mjs`.");
  process.exit(1);
}
