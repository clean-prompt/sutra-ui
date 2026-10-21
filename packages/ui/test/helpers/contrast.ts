import { readFileSync } from "node:fs";
import path from "node:path";

/** Contrast helpers for tests: resolve the stock tokens of `styles/sutra.css` and evaluate colours (`#hex`, `rgb()`, `color-mix(in oklab …)`, `var()`). */

export type RGBA = [number, number, number, number];
export type Mode = "light" | "dark";

const STYLES = path.resolve(__dirname, "../../src/styles");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

function declarations(css: string, match: (selector: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1]!.split(";").pop()!.trim().replace(/\s+/g, " ");
    if (selector.startsWith("@") || !match(selector)) continue;
    for (const d of m[2]!.split(";")) {
      const i = d.indexOf(":");
      if (i > 0) out.set(d.slice(0, i).trim(), d.slice(i + 1).trim().replace(/\s+/g, " "));
    }
  }
  return out;
}

const sutraCss = strip(readFileSync(path.join(STYLES, "sutra.css"), "utf8"));

/** Custom properties of the stock theme: `:root`, plus the `.dark` block on top for dark. */
export function stockTokens(mode: Mode): Map<string, string> {
  const tokens = declarations(sutraCss, (s) => s === ":root");
  if (mode === "dark") for (const [k, v] of declarations(sutraCss, (s) => s === '.dark, [data-theme="dark"]')) tokens.set(k, v);
  return tokens;
}

/** Split on commas that are not inside parentheses. */
function splitTop(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toOklab([r, g, b]: RGBA): [number, number, number] {
  const [lr, lg, lb] = [lin(r / 255), lin(g / 255), lin(b / 255)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function fromOklab([L, a, b]: [number, number, number]): RGBA {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return [...rgb.map((v) => Math.min(1, Math.max(0, gam(v))) * 255), 1] as RGBA;
}

/** Evaluate a colour value (opaque inputs for `color-mix`) against a token map. */
export function evalColor(value: string, tokens: Map<string, string>, depth = 0): RGBA {
  const v = value.trim();
  if (depth > 8) throw new Error(`colour too deep: ${value}`);
  const variable = /^var\((--[a-z0-9-]+)(?:\s*,\s*(.+))?\)$/i.exec(v);
  if (variable) {
    const next = tokens.get(variable[1]!) ?? variable[2];
    if (next === undefined) throw new Error(`unknown token ${variable[1]}`);
    return evalColor(next, tokens, depth + 1);
  }
  if (v === "transparent") return [0, 0, 0, 0];
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join("") : hex[1]!;
    return [...[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), 1] as RGBA;
  }
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
  const mix = /^color-mix\((.*)\)$/i.exec(v);
  if (mix) {
    const [space, ...stops] = splitTop(mix[1]!);
    if (space !== "in oklab" || stops.length !== 2) throw new Error(`unsupported colour-mix: ${value}`);
    const parsed = stops.map((stop) => {
      const pct = /^(.*?)\s+([\d.]+)%$/.exec(stop);
      return { color: evalColor(pct ? pct[1]! : stop, tokens, depth + 1), pct: pct ? Number(pct[2]) : undefined };
    });
    const [a, b] = parsed as [(typeof parsed)[number], (typeof parsed)[number]];
    const pa = a.pct ?? (b.pct === undefined ? 50 : 100 - b.pct);
    const pb = b.pct ?? 100 - pa;
    // a transparent stop only lowers the other colour's alpha (premultiplied mixing)
    if (a.color[3] === 0) return [b.color[0], b.color[1], b.color[2], (pb / (pa + pb)) * b.color[3]];
    if (b.color[3] === 0) return [a.color[0], a.color[1], a.color[2], (pa / (pa + pb)) * a.color[3]];
    const la = toOklab(a.color);
    const lb = toOklab(b.color);
    return fromOklab(la.map((x, i) => (x * pa + lb[i]! * pb) / (pa + pb)) as [number, number, number]);
  }
  throw new Error(`unparsed colour: ${value}`);
}

/** Composite a translucent foreground over an opaque background. */
export const over = (fg: RGBA, bg: RGBA): RGBA => [fg[0] * fg[3] + bg[0] * (1 - fg[3]), fg[1] * fg[3] + bg[1] * (1 - fg[3]), fg[2] * fg[3] + bg[2] * (1 - fg[3]), 1];

const luminance = ([r, g, b]: RGBA) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);

/** WCAG contrast ratio of two opaque colours. */
export function contrast(a: RGBA, b: RGBA): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
