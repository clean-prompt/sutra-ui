#!/usr/bin/env node
// Generates the agent-readable docs:
//   apps/playground/public/llms.txt        short index (what the library is, entries, one link per component family)
//   apps/playground/public/llms-full.txt   the conventions digest, primitives in full, patterns in short form, the rest as index lines
//   docs/components/<Name>.md              one page per exported component: import, props, variants, slots, notes, example
//   docs/hooks/<name>.md                   one page per hook
//   skills/sutra-ui/references/entries.md, components.md, sizing.md   (SKILL.md and references/conventions.md are hand-written)
// Inputs: apps/playground/src/generated/api.json (run `pnpm docs:gen` first), docs/notes/*.md and the playground demo sources.
//
//   node scripts/gen-llms.mjs                          write everything
//   node scripts/gen-llms.mjs --check                  exit 1 if anything differs from what would be generated (also checks the skill)
//   node scripts/gen-llms.mjs --stats                  print counts and sizes
//   node scripts/gen-llms.mjs --update-conventions-hash  record the CONVENTIONS.md hash the conventions digest was written against
//
// The playground serves docs/components and docs/hooks at /md/ (plugins/docs-md.ts) so the links in llms.txt resolve.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutputs, collectDemos } from "./docs/llms.mjs";
import { loadNotes } from "./docs/notes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(ROOT, "../..");
const API = path.join(REPO, "apps/playground/src/generated/api.json");
const CONVENTIONS = path.join(ROOT, "CONVENTIONS.md");
const DIGEST = path.join(REPO, "skills/sutra-ui/references/conventions.md");
const SKILL = path.join(REPO, "skills/sutra-ui/SKILL.md");
const OWNED_DIRS = ["docs/components", "docs/hooks"];
const args = new Set(process.argv.slice(2));

if (!existsSync(API)) {
  console.error("apps/playground/src/generated/api.json is missing: run `pnpm docs:gen` first");
  process.exit(1);
}
const hashOf = (file) => createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 12);
const HASH_RE = /<!-- conventions-hash: ([0-9a-f]+) -->/;

if (args.has("--update-conventions-hash")) {
  const text = readFileSync(DIGEST, "utf8");
  const line = `<!-- conventions-hash: ${hashOf(CONVENTIONS)} -->`;
  writeFileSync(DIGEST, HASH_RE.test(text) ? text.replace(HASH_RE, line) : `${line}\n${text}`);
  console.log(`conventions digest now records ${hashOf(CONVENTIONS)}`);
  process.exit(0);
}

const api = JSON.parse(readFileSync(API, "utf8"));
const { notes } = loadNotes(ROOT);
const demos = collectDemos(REPO, api);
const { files, stats } = buildOutputs({ root: ROOT, repo: REPO, api, notesMap: notes, demos });

const problems = [];
const stale = [];
for (const dir of OWNED_DIRS) {
  const abs = path.join(REPO, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) if (f.endsWith(".md") && !files.has(`${dir}/${f}`)) stale.push(`${dir}/${f}`);
}

if (args.has("--stats")) {
  const size = (p) => Buffer.byteLength(files.get(p) ?? "");
  console.log(JSON.stringify({ ...stats, notes: notes.size, llmsTxt: size("apps/playground/public/llms.txt"), llmsFullTxt: size("apps/playground/public/llms-full.txt"), componentMd: [...files.entries()].filter(([p]) => p.startsWith("docs/components/")).reduce((n, [, t]) => n + Buffer.byteLength(t), 0) }));
} else if (args.has("--check")) {
  for (const [rel, text] of files) {
    const abs = path.join(REPO, rel);
    if (!existsSync(abs) || readFileSync(abs, "utf8") !== text) problems.push(rel);
  }
  for (const rel of stale) problems.push(`${rel} (stale: no such component)`);
  // The hand-written skill files must exist and stay small.
  if (!existsSync(SKILL)) problems.push("skills/sutra-ui/SKILL.md (missing)");
  else {
    const skill = readFileSync(SKILL, "utf8");
    if (skill.split("\n").length > 200) problems.push("skills/sutra-ui/SKILL.md (over 200 lines)");
    if (!/^---\nname: sutra-ui\n/.test(skill)) problems.push("skills/sutra-ui/SKILL.md (front-matter must start with name: sutra-ui)");
  }
  if (!existsSync(DIGEST)) problems.push("skills/sutra-ui/references/conventions.md (missing)");
  else {
    const m = HASH_RE.exec(readFileSync(DIGEST, "utf8"));
    if (!m || m[1] !== hashOf(CONVENTIONS)) {
      console.warn("warning: packages/ui/CONVENTIONS.md changed since skills/sutra-ui/references/conventions.md was written: re-read it, update the digest, then run `node packages/ui/scripts/gen-llms.mjs --update-conventions-hash`");
    }
  }
  if (problems.length) {
    console.error(`generated docs are stale (${problems.length}): run \`pnpm docs:llms\`\n${problems.slice(0, 12).map((p) => `  ${p}`).join("\n")}${problems.length > 12 ? "\n  ..." : ""}`);
    process.exit(1);
  }
  console.log(`llms docs are up to date (${files.size} files)`);
} else {
  let written = 0;
  for (const [rel, text] of files) {
    const abs = path.join(REPO, rel);
    if (existsSync(abs) && readFileSync(abs, "utf8") === text) continue;
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
    written += 1;
  }
  for (const rel of stale) unlinkSync(path.join(REPO, rel));
  const m = existsSync(DIGEST) ? HASH_RE.exec(readFileSync(DIGEST, "utf8")) : null;
  if (existsSync(DIGEST) && (!m || m[1] !== hashOf(CONVENTIONS))) console.warn("warning: the conventions digest was written against another CONVENTIONS.md: re-read it, then run with --update-conventions-hash");
  console.log(`wrote ${written} of ${files.size} files (${stats.components} components, ${stats.hooks} hooks, ${stats.examples} examples), removed ${stale.length} stale`);
}
