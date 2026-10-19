import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { seedColorStyle } from "../src/primitives/avatar";
import { chartColors } from "../src/lib/tokens";
import { contrast, evalColor, over, stockTokens, type Mode, type RGBA } from "./contrast";

/** AA leftovers of the improvement plan (A4): each pair that used to fall under 4.5:1 is pinned here. */

const MODES: Mode[] = ["light", "dark"];
const color = (value: string, mode: Mode) => evalColor(value, stockTokens(mode));
const token = (name: string, mode: Mode) => color(`var(${name})`, mode);

describe.each(MODES)("A4 contrast leftovers (%s)", (mode) => {
  it("destructive button label passes AA at rest and on hover (white on the dark red was 3.8:1)", () => {
    expect(contrast(token("--destructive-foreground", mode), token("--destructive", mode))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("--destructive-foreground", mode), token("--destructive-hover", mode))).toBeGreaterThanOrEqual(4.5);
  });

  it("red text on the page and on cards still passes AA (the fix must not touch --destructive)", () => {
    for (const surface of ["--background", "--card", "--popover"]) {
      expect(contrast(token("--destructive", mode), token(surface, mode)), surface).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("soft avatar initials pass AA for every palette colour", () => {
    for (const hue of chartColors) {
      const style = seedColorStyle(hue, "soft");
      const pick = (value: string) => {
        const pair = /^light-dark\((.*)\)$/.exec(value);
        if (!pair) return value;
        // two colour-mix() arguments: split at the top-level comma
        let depth = 0;
        const inner = pair[1]!;
        for (let i = 0; i < inner.length; i++) {
          if (inner[i] === "(") depth++;
          else if (inner[i] === ")") depth--;
          else if (inner[i] === "," && depth === 0) return (mode === "light" ? inner.slice(0, i) : inner.slice(i + 1)).trim();
        }
        throw new Error(value);
      };
      const fg = color(pick(String(style.color)), mode);
      const bg = color(String(style.backgroundColor), mode);
      expect(contrast(fg, bg), `${hue} initials`).toBeGreaterThanOrEqual(4.5);
    }
  });

  describe("Dropzone", () => {
    const source = readFileSync(path.resolve(__dirname, "../src/primitives/dropzone.tsx"), "utf8");
    const literal = /READABLE_PRIMARY = "text-\[([^"\]]+)\]"/.exec(source)?.[1];

    it("keeps its brand-coloured title in one readable class instead of plain text-primary", () => {
      expect(literal).toBeTruthy();
      expect(source).not.toMatch(/font-(semibold|medium) text-primary"/);
    });

    it("the title passes AA on the page, the hover fill and the accept tint", () => {
      const ink = color(literal!.replaceAll("_", " "), mode);
      const bg = token("--background", mode);
      const accept = over(
        (() => {
          const soft = token("--primary-soft", mode);
          return [soft[0], soft[1], soft[2], soft[3] * 0.6] as RGBA;
        })(),
        bg,
      );
      for (const [name, surface] of [["background", bg], ["hover", token("--subtle", mode)], ["accept", accept]] as const) {
        expect(contrast(ink, surface), name).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("the reject message passes AA on its tint", () => {
      const bg = token("--background", mode);
      const soft = token("--destructive-soft", mode);
      const reject = over([soft[0], soft[1], soft[2], soft[3] * 0.6] as RGBA, bg);
      expect(contrast(token("--destructive", mode), reject)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
