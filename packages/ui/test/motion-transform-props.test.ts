import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tailwind v4 sets `translate-*`, `scale-*` and `rotate-*` through the individual CSS properties `translate`, `scale`
 * and `rotate`, not through `transform`. A `transition-[…,transform]` list therefore never animates `active:scale-95`,
 * `rotate-90` or `hover:-translate-y-0.5`: they snap. (Bare `transition-transform` is fine, v4 expands it to all four.)
 * Every arbitrary transition list that names `transform` must also name the three individual properties.
 */
const SRC = path.resolve(__dirname, "../src");
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(SRC).filter((f) => /\.tsx?$/.test(f));

describe("transition lists that name transform", () => {
  it("also name translate, scale and rotate", () => {
    const offenders: string[] = [];
    let lists = 0;
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/transition-\[([^\]]*)\]/g)) {
        const parts = m[1]!.split(",").map((p) => p.trim());
        if (!parts.includes("transform")) continue;
        lists++;
        const missing = ["translate", "scale", "rotate"].filter((p) => !parts.includes(p));
        if (missing.length) offenders.push(`${path.relative(SRC, file)}: ${m[0]} (missing ${missing.join(", ")})`);
      }
    }
    expect(lists).toBeGreaterThanOrEqual(25); // the scan really found the lists
    expect(offenders).toEqual([]);
  });

  it("the shared chevron-turn utility names all four properties", () => {
    const css = readFileSync(path.join(SRC, "styles/sutra.css"), "utf8");
    expect(css).toMatch(/@utility chevron-turn \{\s*transition-property:\s*transform,\s*translate,\s*scale,\s*rotate/);
  });
});
