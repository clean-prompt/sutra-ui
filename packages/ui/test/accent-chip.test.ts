import { describe, expect, it } from "vitest";
import { accentClasses } from "../src/lib/accent";
import { chartColors } from "../src/lib/tokens";
import { contrast, evalColor, stockTokens, type Mode } from "./contrast";

/** `accentClasses.chip` (provider and source chips): a 15% tint of the accent with text that passes AA in both themes. */

const MODES: Mode[] = ["light", "dark"];

/** The chip's two arbitrary values as plain CSS for one accent: `[tint, light text, dark text]`. */
function chipColors(accent: string): [string, string, string] {
  const css = (s: string) => s.replaceAll("var(--sutra-accent,var(--primary))", accent).replaceAll("_", " ");
  const tint = /bg-\[(color-mix\([^\]]+\))\]/.exec(accentClasses.chip)![1]!;
  const pair = /text-\[color:light-dark\((.+)\)\]/.exec(accentClasses.chip)![1]!;
  const at = pair.indexOf("),color-mix") + 1;
  return [css(tint), css(pair.slice(0, at)), css(pair.slice(at + 1))];
}

describe("accentClasses.chip", () => {
  it("has no dark: variant and no palette class", () => {
    expect(accentClasses.chip).not.toMatch(/dark:|-(?:red|blue|green|sky|indigo)-\d/);
    expect(accentClasses.chip).toContain("light-dark(");
  });

  describe.each(MODES)("contrast (%s)", (mode) => {
    const tokens = stockTokens(mode);
    it.each(chartColors.map((c, i) => [i + 1, c] as const))("chart-%i text passes AA on its own tint", (_n, hue) => {
      const [tint, light, dark] = chipColors(hue);
      for (const surface of ["--background", "--card"]) {
        const bg = evalColor(tint.replace(/transparent\)$/, `var(${surface}))`), tokens);
        const fg = evalColor(mode === "light" ? light : dark, tokens);
        expect(contrast(fg, bg), `${hue} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});
