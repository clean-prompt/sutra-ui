#!/usr/bin/env node
// Generates the props reference the playground shows under every demo: apps/playground/src/generated/api.json.
// It is read from the real types and JSDoc of src (see docs/extract-api.mjs), so it cannot drift while the check passes.
//
//   node scripts/gen-docs.mjs                    rewrite api.json
//   node scripts/gen-docs.mjs --check            exit 1 if api.json differs from what would be generated
//   node scripts/gen-docs.mjs --stats            print the JSDoc coverage (what test/jsdoc-coverage.test.ts gates) as JSON
//   node scripts/gen-docs.mjs --update-baseline  rewrite test/jsdoc-baseline.json (only after props gained descriptions)
//
// Run it after changing a component's props or their JSDoc: `pnpm docs:gen` at the repo root (`pnpm docs:check` checks).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApi, coverage, serialize } from "./docs/extract-api.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(ROOT, "../../apps/playground/src/generated/api.json");
const BASELINE = path.join(ROOT, "test/jsdoc-baseline.json");
const args = new Set(process.argv.slice(2));

const api = buildApi({ root: ROOT });
const cov = coverage(api);

if (args.has("--stats")) {
  process.stdout.write(JSON.stringify(cov));
} else if (args.has("--update-baseline")) {
  const sorted = Object.fromEntries(Object.entries(cov.missing).sort((a, b) => a[0].localeCompare(b[0])));
  writeFileSync(BASELINE, JSON.stringify({ total: cov.undocumentedProps, components: sorted }, null, 1) + "\n");
  console.log(`jsdoc baseline: ${cov.undocumentedProps} props without a description in ${Object.keys(sorted).length} components`);
} else {
  const next = serialize(api);
  const before = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (args.has("--check")) {
    if (before !== next) {
      console.error("apps/playground/src/generated/api.json is stale: run `pnpm docs:gen`");
      process.exit(1);
    }
    console.log("api.json is up to date");
  } else {
    mkdirSync(path.dirname(OUT), { recursive: true });
    if (before !== next) writeFileSync(OUT, next);
    console.log(
      `${before === next ? "unchanged" : "wrote"} ${path.relative(process.cwd(), OUT)}: ${cov.components} components, ${Object.keys(api.hooks).length} hooks, ` +
        `${cov.props} props (${cov.undocumentedProps} without a description)`
    );
  }
}
