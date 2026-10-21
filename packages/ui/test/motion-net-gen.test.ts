/**
 * The in-app twin of every reduced-motion block (`<html data-motion="reduce">`) is generated from the `@media` block above it
 * by scripts/gen-motion-net.mjs. These tests run its `--check` (a hand edit of a generated region fails) and pin the transform.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script without declarations
import { BEGIN, END, check, regenerate, twinOf } from "../scripts/gen-motion-net.mjs";
import { readSutraCss } from "./helpers/css";

describe("reduced-motion twins (scripts/gen-motion-net.mjs)", () => {
  it("every generated region in src/styles is what the generator writes (pnpm gen:motion-net)", () => {
    expect(check()).toEqual({ stale: [], problems: [] });
  });

  it("covers the net and the seven component and effect pairs", () => {
    expect(readSutraCss().split(BEGIN).length - 1).toBe(8);
  });

  it("turns the system selectors into the attribute selectors and drops the @media wrapper", () => {
    const css = `@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion="full"])::view-transition-old(*) {
    display: none;
  }
  :where(:root:not([data-motion="full"])) .a {
    animation: none;
  }
}
${BEGIN}
stale
${END}
`;
    const { css: out, problems } = regenerate(css);
    expect(problems).toEqual([]);
    expect(out).toContain(`${BEGIN}\n:root[data-motion="reduce"]::view-transition-old(*) {\n  display: none;\n}\n:where(:root[data-motion="reduce"]) .a {\n  animation: none;\n}\n${END}`);
    expect(out).not.toContain("stale");
  });

  it("refuses a body with no system selector and a marker that does not follow an @media block", () => {
    expect(() => twinOf("a { color: red; }")).toThrow(/no :root:not/);
    expect(regenerate(`.x { color: red; }\n${BEGIN}\n${END}\n`).problems).toHaveLength(1);
  });
});
