import { readFileSync } from "node:fs";
import path from "node:path";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTheme } from "../src/hooks/use-theme";
import { chartColors, chartColorVars, themeStyles } from "../src/lib/tokens";
import { readSutraCss } from "./helpers/css";

const STYLES = path.resolve(__dirname, "../src/styles");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const paperCss = strip(readFileSync(path.join(STYLES, "paper.css"), "utf8"));
const sutraCss = strip(readSutraCss());

/** Top-level `selector { declarations }` rules of a flat stylesheet (no nested blocks inside the ones we read). */
function rulesOf(css: string): { selector: string; decls: Map<string, string> }[] {
  const out: { selector: string; decls: Map<string, string> }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of css.matchAll(re)) {
    const decls = new Map<string, string>();
    const selector = m[1]!.split(";").pop()!.trim(); // drop preceding @import/@source statements
    if (selector.startsWith("@")) continue;
    for (const d of m[2]!.split(";")) {
      const i = d.indexOf(":");
      if (i > 0) decls.set(d.slice(0, i).trim(), d.slice(i + 1).trim().replace(/\s+/g, " "));
    }
    out.push({ selector: selector.replace(/\s+/g, " "), decls });
  }
  return out;
}

const paperRules = rulesOf(paperCss);
const light = paperRules.find((r) => r.selector === '[data-style="paper"]')!.decls;
const darkRule = paperRules.find((r) => r.selector.includes(".dark") && r.selector.includes("data-style"))!;
const dark = darkRule.decls;

/** Semantic surface tokens of the stock theme: what a style has to cover. */
const stockSemantic = (() => {
  const names = new Set<string>();
  for (const r of rulesOf(sutraCss).filter((r) => r.selector === ":root")) {
    for (const name of r.decls.keys()) {
      if (!name.startsWith("--")) continue;
      if (/^--(n|b)-/.test(name) || /^--(success|warning|danger|info)-\d/.test(name)) continue; // primitive scales
      if (/^--(success|warning|destructive|info)(-|$)/.test(name)) continue; // status hues stay
      if (name.startsWith("--sutra-")) continue; // shape
      names.add(name);
    }
  }
  return [...names].sort();
})();

describe("shadow hooks", () => {
  const themeShadows = [...sutraCss.matchAll(/^\s*--shadow-([a-z0-9-]+):\s*([^;]+);$/gm)].map((m) => ({ name: m[1]!, value: m[2]! }));

  it("every theme shadow reads --sutra-shadow-<name> first (Tailwind inlines plain theme shadows)", () => {
    expect(themeShadows.length).toBeGreaterThanOrEqual(9);
    for (const { name, value } of themeShadows) expect(value, name).toMatch(new RegExp("^var\\(--sutra-shadow-" + name + ", .+\\)$"));
  });

  it("paper replaces every one of them", () => {
    for (const { name } of themeShadows) expect(light.has("--sutra-shadow-" + name), name).toBe(true);
  });
});

describe("paper.css coverage", () => {
  it("finds the blocks", () => {
    expect(light.size).toBeGreaterThan(30);
    expect(dark.size).toBeGreaterThan(20);
    expect(stockSemantic).toContain("--background");
    expect(stockSemantic).toContain("--primary-soft-foreground");
  });

  it("targets the element itself, dark ancestors and dark descendants", () => {
    expect(darkRule.selector).toContain('[data-style="paper"]:is(.dark, [data-theme="dark"])');
    expect(darkRule.selector).toContain(':is(.dark, [data-theme="dark"]) [data-style="paper"]');
    expect(darkRule.selector).toContain('[data-style="paper"] :is(.dark, [data-theme="dark"])');
  });

  it("defines every semantic colour token of the stock theme, in light and in dark", () => {
    expect(stockSemantic.filter((t) => t !== "--color-scheme" && !light.has(t))).toEqual([]);
    expect(stockSemantic.filter((t) => t !== "--color-scheme" && !dark.has(t))).toEqual([]);
  });

  it("restores any status token it overrides in light when dark", () => {
    const status = (n: string) => /^--(success|warning|destructive|info)(-|$)/.test(n);
    expect([...light.keys()].filter((n) => status(n) && !dark.has(n))).toEqual([]);
  });

  it("writes colour tokens as literals (no var() chains that go stale in nested themes)", () => {
    for (const [name, value] of [...light, ...dark]) {
      if (!stockSemantic.includes(name) || name === "--color-scheme") continue;
      expect(value, name).toMatch(/^(#[0-9a-f]{3,8}|rgb\()/i);
    }
  });

  it("is flat: only floating layers have a shadow, and dark deepens it", () => {
    for (const t of ["--sutra-shadow-xs", "--sutra-shadow-sm", "--sutra-shadow-md", "--sutra-shadow-inner-highlight", "--sutra-shadow-skeuo"]) {
      expect(light.get(t), t).toBe("0 0 #0000");
    }
    for (const t of ["--sutra-shadow-lg", "--sutra-shadow-xl", "--sutra-shadow-2xl", "--sutra-shadow-3xl"]) {
      expect(light.get(t), t).toBe("var(--paper-float)");
      expect(dark.get(t), t).toBe("var(--paper-float)");
    }
    expect(dark.get("--paper-float")).not.toBe(light.get("--paper-float"));
  });
});

/* ---- contrast ----------------------------------------------------------------------------------------------- */

type RGBA = [number, number, number, number];
function parseColor(value: string): RGBA {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join("") : hex[1]!;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) as RGBA;
  }
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
  throw new Error(`unparsed colour: ${value}`);
}
const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i]! * fg[3] + bg[i]! * (1 - fg[3])).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: RGBA, b: RGBA) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("paper.css contrast (%s)", (_mode, tokens) => {
  const color = (t: string) => parseColor(tokens.get(`--${t}`)!);
  const surfaces = ["background", "card", "popover", "dialog", "subtle", "muted", "secondary"];
  /** Opaque stand-ins for the translucent hover fill over each page/card surface. */
  const accentOver = (base: string) => over(color("accent"), color(base));
  const min = (fg: RGBA, bgs: RGBA[]) => Math.min(...bgs.map((bg) => ratio(fg, bg)));

  it("body text passes AAA on every surface", () => {
    expect(min(color("foreground"), surfaces.map(color))).toBeGreaterThanOrEqual(7);
  });

  it("muted text passes AA on every surface and hover fill", () => {
    const bgs = [...surfaces.map(color), accentOver("background"), accentOver("card"), accentOver("popover")];
    expect(min(color("muted-foreground"), bgs)).toBeGreaterThanOrEqual(4.5);
  });

  it("hovered menu items stay readable", () => {
    const bgs = ["background", "card", "popover"].map(accentOver);
    expect(min(color("accent-foreground"), bgs)).toBeGreaterThanOrEqual(4.5);
  });

  it("primary buttons (rest and hover) pass AA", () => {
    expect(ratio(color("primary-foreground"), color("primary"))).toBeGreaterThanOrEqual(7);
    expect(ratio(color("primary-foreground"), color("primary-hover"))).toBeGreaterThanOrEqual(7);
  });

  it("primary-soft chips pass AA", () => {
    const bgs = ["background", "card"].map((b) => over(color("primary-soft"), color(b)));
    expect(min(color("primary-soft-foreground"), bgs)).toBeGreaterThanOrEqual(4.5);
  });

  it("status colours used as text pass AA on the page, cards and wells", () => {
    const stock = new Map<string, string>();
    for (const r of rulesOf(sutraCss).filter((r) => r.selector === ":root")) for (const [k, v] of r.decls) stock.set(k, v);
    if (_mode === "dark") for (const r of rulesOf(sutraCss).filter((r) => r.selector.startsWith(".dark"))) for (const [k, v] of r.decls) stock.set(k, v);
    const resolve = (name: string): RGBA => {
      let v = tokens.get(name) ?? stock.get(name)!;
      for (let i = 0; i < 4 && v.startsWith("var("); i++) {
        const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v)![1]!;
        v = tokens.get(ref) ?? stock.get(ref)!;
      }
      return parseColor(v);
    };
    const plain = ["background", "card", "popover", "subtle", "muted"].map(color);
    for (const t of ["--success", "--destructive", "--info"]) expect(min(resolve(t), plain), t).toBeGreaterThanOrEqual(4.5);
    // White on the stock dark red button is 3.8:1 in the stock dark theme too (one token serves both red text on
    // black and a red fill), so only the light pair is held to AA here.
    if (_mode === "light") expect(ratio(resolve("--destructive-foreground"), resolve("--destructive"))).toBeGreaterThanOrEqual(4.5);
  });

  it("inverse and code surfaces pass AA", () => {
    expect(ratio(color("inverse-foreground"), color("inverse"))).toBeGreaterThanOrEqual(7);
    expect(ratio(color("code-foreground"), color("code"))).toBeGreaterThanOrEqual(7);
    expect(ratio(color("code-muted"), color("code"))).toBeGreaterThanOrEqual(4.5);
  });

  it("hairlines are visible but quiet", () => {
    const border = over(color("border"), color("background"));
    const r = ratio(border, color("background"));
    expect(r).toBeGreaterThan(1.05);
    expect(r).toBeLessThan(1.6);
  });
});

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("paper chart palette (%s)", (_mode, tokens) => {
  const palette = Array.from({ length: 8 }, (_, i) => tokens.get(`--chart-${i + 1}`)!);

  it("has eight distinct colours", () => {
    expect(palette.every(Boolean)).toBe(true);
    expect(new Set(palette).size).toBe(8);
  });

  it("every colour is visible (3:1) on the page and on cards", () => {
    const surfaces = ["background", "card"].map((n) => parseColor(tokens.get(`--${n}`)!));
    for (const c of palette) for (const s of surfaces) expect(ratio(parseColor(c), s), c).toBeGreaterThanOrEqual(3);
  });
});

it("the stock --chart-N variables are exactly the chartColors list (charts read the variables, canvas the hex)", () => {
  const stock = new Map<string, string>();
  for (const r of rulesOf(sutraCss).filter((r) => r.selector === ":root")) for (const [k, v] of r.decls) stock.set(k, v);
  chartColors.forEach((hex, i) => expect(stock.get(`--chart-${i + 1}`), `--chart-${i + 1}`).toBe(hex));
  expect(chartColorVars).toEqual(chartColors.map((hex, i) => `var(--chart-${i + 1}, ${hex})`));
});

it("white on the brand ramp's mid step passes AA (gradients and tiles use it)", () => {
  expect(ratio(parseColor(light.get("--b-fg")!), parseColor(light.get("--b-500")!))).toBeGreaterThanOrEqual(4.5);
  expect(ratio(parseColor(light.get("--b-fg")!), parseColor(light.get("--b-700")!))).toBeGreaterThanOrEqual(4.5);
});

/* ---- theme hook ---------------------------------------------------------------------------------------------- */

describe("useTheme style", () => {
  afterEach(() => {
    const root = document.documentElement;
    root.className = "";
    for (const k of ["brand", "neutral", "radius", "style"]) delete root.dataset[k];
  });

  it("lists the styles", () => {
    expect(themeStyles).toEqual(["default", "paper"]);
  });

  it("leaves the stock look without an attribute and keeps the theme shape unchanged", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toEqual({ mode: "light", brand: "indigo", neutral: "zinc", radius: "rounded" });
    expect(document.documentElement.dataset.style).toBeUndefined();
  });

  it("sets and clears data-style", () => {
    const { result } = renderHook(() => useTheme({ style: "paper" }));
    const root = document.documentElement;
    expect(root.dataset.style).toBe("paper");
    expect(result.current.theme.style).toBe("paper");
    act(() => result.current.setTheme({ style: "default" }));
    expect(root.dataset.style).toBeUndefined();
    act(() => result.current.setTheme({ style: "paper", mode: "dark" }));
    expect(root.dataset.style).toBe("paper");
    expect(root.classList.contains("dark")).toBe(true);
  });

  it("keeps a style set before hydration and ignores unknown values", () => {
    document.documentElement.dataset.style = "paper";
    const kept = renderHook(() => useTheme());
    expect(kept.result.current.theme.style).toBe("paper");
    kept.unmount();
    document.documentElement.dataset.style = "nonsense";
    const unknown = renderHook(() => useTheme());
    expect(unknown.result.current.theme.style).toBeUndefined();
  });
});
