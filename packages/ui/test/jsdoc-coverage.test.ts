import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * JSDoc ratchet for the props reference (apps/playground/src/generated/api.json, scripts/gen-docs.mjs).
 *
 * `test/jsdoc-baseline.json` lists, per component, how many of its own props (those declared in src, not inherited
 * from React or Radix) have no JSDoc description. The numbers may only fall:
 *   - a component's count rising, or a component missing from the baseline gaining an undocumented prop, fails;
 *   - a count that fell (or reached zero) while the baseline still lists the old number fails too, so the baseline
 *     tightens as descriptions are written. Fix it with `node scripts/gen-docs.mjs --update-baseline`.
 * Describe a prop with a JSDoc comment above it; an `@default` tag gives its default when the destructuring default is not literal.
 */
const PKG = path.resolve(__dirname, "..");

type Stats = { components: number; props: number; undocumentedProps: number; missing: Record<string, number> };
type Baseline = { total: number; components: Record<string, number> };

const baseline: Baseline = JSON.parse(readFileSync(path.join(PKG, "test/jsdoc-baseline.json"), "utf8"));
const stats: Stats = JSON.parse(execFileSync(process.execPath, [path.join(PKG, "scripts/gen-docs.mjs"), "--stats"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

describe("JSDoc ratchet (props without a description)", () => {
  it("no component gets more undocumented props than the baseline allows", () => {
    const rose = Object.entries(stats.missing)
      .filter(([name, n]) => n > (baseline.components[name] ?? 0))
      .map(([name, n]) => `${name}: ${baseline.components[name] ?? 0} -> ${n}`);
    expect(rose, "props without a JSDoc description: describe them (a line above the prop)").toEqual([]);
  });

  it("the total never rises", () => {
    expect(stats.undocumentedProps).toBeLessThanOrEqual(baseline.total);
  });

  it("the baseline is current: props that gained a description are removed from it", () => {
    const fixed = Object.entries(baseline.components)
      .filter(([name, n]) => (stats.missing[name] ?? 0) < n)
      .map(([name, n]) => `${name}: ${n} -> ${stats.missing[name] ?? 0}`);
    expect(fixed, "run `node scripts/gen-docs.mjs --update-baseline` to lock the improvement in").toEqual([]);
    expect(stats.undocumentedProps).toBe(baseline.total);
  });

  it("the generator finds the components (guards against an empty scan passing the ratchet)", () => {
    expect(stats.components).toBeGreaterThan(900);
    expect(stats.props).toBeGreaterThan(5000);
  });
});
