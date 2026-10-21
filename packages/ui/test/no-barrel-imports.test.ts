import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Frozen back-compat barrels (CONVENTIONS: `kits/ai/ai-extras`, `kits/ai/primitives-extra`, `kits/workspace/kanban`,
 * `patterns/counters`, `assets/misc`) are never imported inside the package. `entries/` and `index.ts` have their own check in
 * test/api-surface.test.ts. Detection matches api-surface.test.ts: the file's first 200 bytes say "Back-compat barrel".
 */

const SRC = path.resolve(__dirname, "../src");
const SOURCE_EXTS = [".ts", ".tsx"];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return SOURCE_EXTS.some((e) => entry.name.endsWith(e)) && !entry.name.endsWith(".d.ts") ? [full] : [];
  });
}

const rel = (file: string) => path.relative(SRC, file).split(path.sep).join("/");
const isBackCompatBarrel = (file: string) => /Back-compat barrel/.test(readFileSync(file, "utf8").slice(0, 200));

function resolveSpec(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [...SOURCE_EXTS.map((e) => base + e), ...SOURCE_EXTS.map((e) => path.join(base, `index${e}`))]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const SPEC_RES = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']/gs,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

const allFiles = walk(SRC);
const barrels = allFiles.filter(isBackCompatBarrel);
const scanned = allFiles.filter((f) => !barrels.includes(f) && !rel(f).startsWith("entries/") && rel(f) !== "index.ts");

describe("no in-package import of a frozen back-compat barrel", () => {
  it("finds the five frozen barrels", () => {
    expect(barrels.map(rel).sort()).toEqual([
      "assets/misc.tsx",
      "kits/ai/ai-extras.tsx",
      "kits/ai/primitives-extra.tsx",
      "kits/workspace/kanban.tsx",
      "patterns/counters.tsx",
    ]);
  });

  it("no module in src/ (outside the barrels, entries/ and index.ts) imports or re-exports one", () => {
    const offenders: string[] = [];
    for (const file of scanned) {
      const source = readFileSync(file, "utf8");
      const specs = new Set<string>();
      for (const re of SPEC_RES) for (const m of source.matchAll(re)) specs.add(m[1]!);
      for (const spec of specs) {
        if (!spec.startsWith(".")) continue;
        const target = resolveSpec(file, spec);
        if (target && barrels.includes(target)) offenders.push(`${rel(file)} -> ${rel(target)}`);
      }
    }
    expect(offenders, "import the real module instead of the barrel").toEqual([]);
  });
});
