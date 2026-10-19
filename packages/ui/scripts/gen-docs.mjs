#!/usr/bin/env node
// Generates the props reference the playground shows under every demo: apps/playground/src/generated/api.json.
// It is read from the real types and JSDoc of src (see docs/extract-api.mjs), so it cannot drift while the check passes.
//
//   node scripts/gen-docs.mjs                    rewrite api.json
//   node scripts/gen-docs.mjs --check            exit 1 if api.json differs from what would be generated
//   node scripts/gen-docs.mjs --stats            print the JSDoc coverage (what test/jsdoc-coverage.test.ts gates) as JSON
//   node scripts/gen-docs.mjs --update-baseline  rewrite test/jsdoc-baseline.json (only after props gained descriptions)
//   node scripts/gen-docs.mjs --notes-lint [Name ...]  check docs/notes/*.md (all, or the named ones) against api.json and the source
//   node scripts/gen-docs.mjs --notes-types [Name ...] type-check the `## Example` blocks of the notes against the real source
//
// It also writes apps/playground/src/generated/notes.json from docs/notes/*.md (the per-component notes the Notes panel shows);
// --check covers both files.
//
// Run it after changing a component's props or their JSDoc: `pnpm docs:gen` at the repo root (`pnpm docs:check` checks).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApi, coverage, serialize } from "./docs/extract-api.mjs";
import { checkNoteExamples } from "./docs/note-examples.mjs";
import { lintNotes, loadNotes, modulesWithoutNote, serializeNotes } from "./docs/notes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(ROOT, "../../apps/playground/src/generated/api.json");
const NOTES_OUT = path.resolve(ROOT, "../../apps/playground/src/generated/notes.json");
const BASELINE = path.join(ROOT, "test/jsdoc-baseline.json");
const argv = process.argv.slice(2);
const args = new Set(argv);

const api = buildApi({ root: ROOT });
const cov = coverage(api);

if (args.has("--notes-types")) {
  const { notes } = loadNotes(ROOT);
  const only = argv.filter((a) => !a.startsWith("--"));
  const problems = checkNoteExamples({ root: ROOT, notes, only: only.length ? only : undefined });
  for (const p of problems) console.error(`${p.name}.md example, line ${p.line}: ${p.message}`);
  const withExample = [...notes.values()].filter((n) => n.example).length;
  console.log(`${withExample} notes have an example, ${problems.length} type errors`);
  if (problems.length) process.exit(1);
} else if (args.has("--notes-lint")) {
  const { notes, errors: parseErrors } = loadNotes(ROOT);
  const only = argv.filter((a) => !a.startsWith("--"));
  const errors = lintNotes({ root: ROOT, api, notes, parseErrors, only: only.length ? only : undefined });
  const missing = modulesWithoutNote(api, notes);
  for (const e of errors) console.error(e);
  console.log(`${notes.size} notes, ${errors.length} problems, ${missing.length} primitive modules without a note${missing.length && only.length === 0 ? ": " + missing.join(", ") : ""}`);
  if (errors.length) process.exit(1);
} else if (args.has("--stats")) {
  process.stdout.write(JSON.stringify(cov));
} else if (args.has("--update-baseline")) {
  const sorted = Object.fromEntries(Object.entries(cov.missing).sort((a, b) => a[0].localeCompare(b[0])));
  writeFileSync(BASELINE, JSON.stringify({ total: cov.undocumentedProps, components: sorted }, null, 1) + "\n");
  console.log(`jsdoc baseline: ${cov.undocumentedProps} props without a description in ${Object.keys(sorted).length} components`);
} else {
  const next = serialize(api);
  const before = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  const loaded = loadNotes(ROOT);
  const notesNext = serializeNotes(loaded.notes, api);
  const notesBefore = existsSync(NOTES_OUT) ? readFileSync(NOTES_OUT, "utf8") : "";
  if (args.has("--check")) {
    if (before !== next) {
      console.error("apps/playground/src/generated/api.json is stale: run `pnpm docs:gen`");
      process.exit(1);
    }
    if (notesBefore !== notesNext) {
      console.error("apps/playground/src/generated/notes.json is stale: run `pnpm docs:gen`");
      process.exit(1);
    }
    console.log("api.json and notes.json are up to date");
  } else {
    if (notesBefore !== notesNext) writeFileSync(NOTES_OUT, notesNext);
    console.log(`${notesBefore === notesNext ? "unchanged" : "wrote"} ${path.relative(process.cwd(), NOTES_OUT)}: ${loaded.notes.size} notes`);
    mkdirSync(path.dirname(OUT), { recursive: true });
    if (before !== next) writeFileSync(OUT, next);
    console.log(
      `${before === next ? "unchanged" : "wrote"} ${path.relative(process.cwd(), OUT)}: ${cov.components} components, ${Object.keys(api.hooks).length} hooks, ` +
        `${cov.props} props (${cov.undocumentedProps} without a description)`
    );
  }
}
