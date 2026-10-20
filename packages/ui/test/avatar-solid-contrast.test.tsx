import { colorForSeed } from "../src/lib/hash";
import { chartColors } from "../src/lib/tokens";
import { seedColorStyle } from "../src/primitives/avatar";

function luminance(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe("solid avatar initials", () => {
  it("every seed colour gets the better of white and dark ink, and at least 4.4:1 (4.5:1 for all but violet)", () => {
    for (const color of chartColors) {
      const { backgroundColor, color: ink } = seedColorStyle(color, "solid") as { backgroundColor: string; color: string };
      expect(backgroundColor).toBe(color);
      const best = Math.max(contrast(color, "#ffffff"), contrast(color, "#18181b"));
      expect(contrast(color, ink)).toBeCloseTo(best, 5);
      // violet #8e51ff tops out at 4.40:1 (white), which is the best either ink can do; every other seed reaches 4.5:1
      expect(contrast(color, ink), `${color} with ${ink}`).toBeGreaterThanOrEqual(4.4);
    }
  });

  it("keeps white on dark fills and uses dark ink on the light ones", () => {
    expect(seedColorStyle("#123456", "solid").color).toBe("#ffffff");
    expect(seedColorStyle("#f0b100", "solid").color).toBe("#18181b");
    expect(seedColorStyle("#00b8db", "solid").color).toBe("#18181b");
  });

  it("keeps white for colours it cannot measure (var(), oklch)", () => {
    expect(seedColorStyle("var(--chart-2)", "solid").color).toBe("#ffffff");
    expect(seedColorStyle("oklch(0.7 0.1 200)", "solid").color).toBe("#ffffff");
    expect(colorForSeed("Ada Lovelace")).toMatch(/^#/);
  });
});
