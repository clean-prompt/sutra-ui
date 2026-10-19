#!/usr/bin/env node
/**
 * Sutra brand options: generates every SVG, index.html and (by hand) README.md in this folder.
 *   node build.mjs
 * Everything is drawn in a 64-unit box (marks) and the same 64 box scaled x16 for the 1024 app-icon grid.
 * One script: shared helpers and palette first, then one section per option, then the page.
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ================================================================== */
/* Numbers, colour                                                     */
/* ================================================================== */

const n = (v) => String(+(+v).toFixed(2));
const rad = (d) => (d * Math.PI) / 180;

/** OKLCH to sRGB hex (gamut-clamped by channel). */
export function oklch(L, C, h) {
  const a = C * Math.cos(rad(h)), b = C * Math.sin(rad(h));
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    "#" +
    lin
      .map((c) => {
        c = Math.min(1, Math.max(0, c));
        c = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
        return Math.round(c * 255).toString(16).padStart(2, "0");
      })
      .join("")
  );
}
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export const INK = "#1c1915";
export const PAPER = "#f7f5f0";
export const PAPER_DEEP = "#ece8de";
export const BLACK = "#000000";

/* ================================================================== */
/* The eight dyes                                                      */
/* ================================================================== */

export const apps = ["notes", "tasks", "calendar", "mail", "files", "journal", "finance", "habits"];
export const appName = { notes: "Notes", tasks: "Tasks", calendar: "Calendar", mail: "Mail", files: "Files", journal: "Journal", finance: "Finance", habits: "Habits" };

/** Natural textile dyes, one per app. [L, C, hue] in OKLCH; tile colour carries a paper glyph at >= 3:1. */
export const DYES = {
  turmeric: { en: "turmeric", sa: "haldi", lch: [0.62, 0.118, 84] },
  henna: { en: "henna green", sa: "mehendi", lch: [0.52, 0.105, 140] },
  pomegranate: { en: "pomegranate", sa: "anar", lch: [0.52, 0.17, 18] },
  indigo: { en: "indigo", sa: "nila", lch: [0.42, 0.14, 268] },
  saffron: { en: "saffron", sa: "kesar", lch: [0.6, 0.15, 55] },
  lac: { en: "lac", sa: "laksha", lch: [0.45, 0.13, 335] },
  kohl: { en: "kohl", sa: "kajal", lch: [0.27, 0.012, 70] },
  madder: { en: "madder red", sa: "manjistha", lch: [0.5, 0.125, 38] },
};
export const APP_DYE = {
  notes: "turmeric", tasks: "henna", calendar: "pomegranate", mail: "indigo",
  files: "saffron", journal: "lac", finance: "kohl", habits: "madder",
};
/** shade: 'tile' base, 'deep' for tone-on-tone threads, 'bright' for dark backgrounds, 'tint' for light fills. */
export function dye(name, shade = "tile") {
  const [L, C, h] = DYES[name].lch;
  if (shade === "deep") return oklch(Math.max(L - 0.1, 0.18), C * 0.95, h);
  if (shade === "bright") return oklch(Math.min(L + 0.25, 0.8), C * 1.05, h);
  if (shade === "soft") return oklch(0.9, 0.05, h);
  if (shade === "tint") return oklch(0.93, 0.035, h);
  return oklch(L, C, h);
}
/** The brand dye for the suite mark. */
export const BRAND = "indigo";

/* ================================================================== */
/* SVG helpers                                                         */
/* ================================================================== */

export const RX = 14.3; // tile corner radius in the 64 box (22.4%, the iOS ratio)
export const tile = (fill, rx = RX) => `<rect width="64" height="64" rx="${rx}" fill="${fill}"/>`;
const NS = 'xmlns="http://www.w3.org/2000/svg"';

/** A standalone file: marks use the 64 box, app icons the 1024 grid (the same drawing scaled x16). */
export function file64(inner, title) {
  return `<svg ${NS} viewBox="0 0 64 64" width="256" height="256" role="img" aria-label="${title}">\n<title>${title}</title>\n${inner}\n</svg>\n`;
}
export function file1024(inner, title) {
  return `<svg ${NS} viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="${title}">\n<title>${title}</title>\n<g transform="scale(16)">\n${inner}\n</g>\n</svg>\n`;
}
/** Inline instance for the page. */
export const inline = (inner, size, label = "", vb = "0 0 64 64", h = size) =>
  `<svg ${NS} viewBox="${vb}" width="${size}" height="${h}"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}>${inner}</svg>`;

/** Filled rounded bar (horizontal) with per-end cap style 'round' | 'butt'. */
export function hbar(x0, x1, y, t, capL = "round", capR = "round") {
  const r = t / 2;
  const L = capL === "round" ? `A${n(r)} ${n(r)} 0 0 0 ${n(x0)} ${n(y - r)}` : `L${n(x0)} ${n(y - r)}`;
  const R = capR === "round" ? `A${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(y + r)}` : `L${n(x1)} ${n(y + r)}`;
  return `M${n(x0)} ${n(y - r)}H${n(x1)}${capR === "round" ? `A${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(y + r)}` : `V${n(y + r)}`}H${n(x0)}${capL === "round" ? `A${n(r)} ${n(r)} 0 0 1 ${n(x0)} ${n(y - r)}` : `V${n(y - r)}`}Z`;
}

/** Stroked path, round caps and joins. */
export const stroke = (d, w, color, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"${extra ? " " + extra : ""}/>`;
export const fillp = (d, color, extra = "") => `<path d="${d}" fill="${color}"${extra ? " " + extra : ""}/>`;

/** Colours for each rendering mode. fg = main ink, ac = accent (the dye), bg = what a knockout shows. */
export function modeColors(mode, dyeName = BRAND) {
  if (mode === "mono") return { fg: "currentColor", ac: "currentColor", bg: "none" };
  if (mode === "reversed") return { fg: PAPER, ac: dye(dyeName, "bright"), bg: BLACK };
  return { fg: INK, ac: dye(dyeName), bg: "#ffffff" };
}

/* ================================================================== */
/* Wordmark: lowercase "sutra" drawn as geometric monoline paths       */
/* ================================================================== */

/**
 * Returns { d, width, height, asc } for the word, in a box whose baseline is y = 0 and x starts at 0.
 * xh = x-height (outer), w = stroke. All strokes are round capped; draw with `stroke(d, w, colour)`.
 */
export function wordmarkPath(xh = 22, w = 3.6, spacing = 0.2) {
  const T = -xh + w / 2, B = -w / 2, H = B - T; // centreline top / bottom of x-height letters
  const sp = spacing * xh;
  let x = w / 2; // left centreline of the next letter
  const out = [];
  const adv = (cw) => { x += cw + w + sp; }; // centreline width -> next letter
  // s: two equal semicircles
  {
    const rs = H / 4, cx = x + rs, a = rad(-35);
    const P0 = [cx + rs * Math.cos(a), T + rs + rs * Math.sin(a)];
    const P1 = [cx - rs * Math.cos(a), T + 3 * rs - rs * Math.sin(a)];
    out.push(`M${n(P0[0])} ${n(P0[1])}A${n(rs)} ${n(rs)} 0 1 0 ${n(cx)} ${n(T + 2 * rs)}A${n(rs)} ${n(rs)} 0 1 1 ${n(P1[0])} ${n(P1[1])}`);
    adv(2 * rs);
  }
  // u
  {
    const R = H * 0.3;
    out.push(`M${n(x)} ${n(T)}V${n(B - R)}A${n(R)} ${n(R)} 0 0 0 ${n(x + 2 * R)} ${n(B - R)}M${n(x + 2 * R)} ${n(T)}V${n(B)}`);
    adv(2 * R);
  }
  // t: crossbar from x to xs + cr, stem at xs
  {
    const R = H * 0.22, top = T - xh * 0.4, cl = xh * 0.2, cr = xh * 0.26, xs = x + cl;
    out.push(`M${n(xs)} ${n(top)}V${n(B - R)}A${n(R)} ${n(R)} 0 0 0 ${n(xs + R)} ${n(B)}M${n(x)} ${n(T)}H${n(xs + cr)}`);
    adv(cl + Math.max(R, cr));
  }
  // r
  {
    const R = H * 0.3, ext = H * 0.08;
    out.push(`M${n(x)} ${n(T)}V${n(B)}M${n(x)} ${n(T + R)}A${n(R)} ${n(R)} 0 0 1 ${n(x + R)} ${n(T)}h${n(ext)}`);
    adv(R + ext);
  }
  // a: single-storey bowl + stem
  {
    const R = H / 2;
    out.push(`M${n(x)} ${n(T + R)}a${n(R)} ${n(R)} 0 1 0 ${n(2 * R)} 0a${n(R)} ${n(R)} 0 1 0 ${n(-2 * R)} 0M${n(x + 2 * R)} ${n(T)}V${n(B)}`);
    x += 2 * R + w; // outer right edge
    return { d: out.join(""), width: x - w / 2 + w / 2, height: xh, asc: xh * 1.4 };
  }
}

/** A lockup: mark (64 box) at left, wordmark right. markInner is drawn in the 64 box. */
export function lockup(markInner, fg, { xh = 22, w = 3.6, gap = 14, spacing = 0.2, lift = 0 } = {}) {
  const wm = wordmarkPath(xh, w, spacing);
  const baseline = 32 + xh / 2 + lift;
  const W = 64 + gap + wm.width + 2;
  const inner = `${markInner}<g transform="translate(${n(64 + gap)} ${n(baseline)})">${stroke(wm.d, w, fg)}</g>`;
  return { inner, vb: `0 0 ${n(W)} 64`, w: W, h: 64 };
}

/* ================================================================== */
/* Pictograms (shared line set, 24 box, 2-unit monoline)               */
/* ================================================================== */

/** Each app as a list of stroked path strings in a 24x24 box. Optional `dots` are filled circles [cx, cy]. */
export const PICTO = {
  notes: { d: ["M6.8 3.8h6.9l4.5 4.5v10.9a1.6 1.6 0 0 1-1.6 1.6H6.8a1.6 1.6 0 0 1-1.6-1.6V5.4a1.6 1.6 0 0 1 1.6-1.6Z", "M13.7 3.8v4.5h4.5", "M8.9 13.2h6.2M8.9 16.5h3.8"] },
  tasks: { d: ["M5.5 12.6l4.2 4.3L18.6 6.8"], extra: ["M4 4.2h16"] , simple: true },
  calendar: { d: ["M6.6 5.2h10.8a2.2 2.2 0 0 1 2.2 2.2v10.4a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V7.4a2.2 2.2 0 0 1 2.2-2.2Z", "M4.4 10.2h15.2", "M8.4 3v3.6M15.6 3v3.6"], dots: [[8.6, 14.4], [12, 14.4], [15.4, 14.4]] },
  mail: { d: ["M6.2 5.8h11.6a2.2 2.2 0 0 1 2.2 2.2v8a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 16V8a2.2 2.2 0 0 1 2.2-2.2Z", "M4.6 8.2l7.4 5.1 7.4-5.1"] },
  files: { d: ["M4 7.4a2.2 2.2 0 0 1 2.2-2.2h3.5l2.1 2.5h6a2.2 2.2 0 0 1 2.2 2.2v7.9a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8V7.4Z"] },
  journal: { d: ["M7.4 3.8h9.8a1.6 1.6 0 0 1 1.6 1.6v13.2a1.6 1.6 0 0 1-1.6 1.6H7.4a1.6 1.6 0 0 1-1.6-1.6V5.4a1.6 1.6 0 0 1 1.6-1.6Z", "M10 3.8v16.4", "M13.2 8.2h2.6"] },
  finance: { d: ["M5 19.6h14", "M7.8 16v-3.2M12 16V9.6M16.2 16V6.4"] },
  habits: { d: ["M19.4 12a7.4 7.4 0 1 1-2.6-5.6", "M8.9 12.2l2.2 2.3 4.2-4.6"], dots: [[18.4, 6.2]] },
};
// tasks: list of two checked rows reads better than a lone tick
PICTO.tasks = { d: ["M4.4 7.4l1.5 1.5 2.7-3", "M4.4 15.6l1.5 1.5 2.7-3", "M12 7.6h7.6M12 15.8h7.6"] };

/** Draw a pictogram in the 64 box, centred at (cx, cy) with outer size `size`, monoline `w` (in 64 units). */
export function picto(app, { cx = 32, cy = 32, size = 26, w = 2.4, color = "#fff", dash = null } = {}) {
  const p = PICTO[app];
  const s = size / 24;
  const sw = w / s;
  const g = [];
  for (const d of p.d) g.push(stroke(d, sw, color, dash ? `stroke-dasharray="${dash}"` : ""));
  for (const [x, y] of p.dots ?? []) g.push(`<circle cx="${x}" cy="${y}" r="${n(sw * 0.62)}" fill="${color}"/>`);
  return `<g transform="translate(${n(cx - size / 2)} ${n(cy - size / 2)}) scale(${n(s)})">${g.join("")}</g>`;
}

/* Geometry helpers ------------------------------------------------------------------ */

/** Ring (annulus) as one filled path, even-odd not needed (inner drawn the other way). */
export const ring = (cx, cy, ro, ri) =>
  `M${n(cx - ro)} ${n(cy)}a${n(ro)} ${n(ro)} 0 1 0 ${n(2 * ro)} 0a${n(ro)} ${n(ro)} 0 1 0 ${n(-2 * ro)} 0ZM${n(cx - ri)} ${n(cy)}a${n(ri)} ${n(ri)} 0 1 1 ${n(2 * ri)} 0a${n(ri)} ${n(ri)} 0 1 1 ${n(-2 * ri)} 0Z`;

/** Ring with a horizontal slot (half-height h) cut through one side (-1 left, +1 right): the ring "under" a thread. */
export function ringWithSlot(cx, cy, ro, ri, h, side = -1) {
  const xo = Math.sqrt(ro * ro - h * h), xi = Math.sqrt(ri * ri - h * h);
  const O1 = [cx + side * xo, cy - h], O2 = [cx + side * xo, cy + h];
  const I1 = [cx + side * xi, cy - h], I2 = [cx + side * xi, cy + h];
  const sw = side < 0 ? 1 : 0;
  return `M${n(O1[0])} ${n(O1[1])}A${n(ro)} ${n(ro)} 0 1 ${sw} ${n(O2[0])} ${n(O2[1])}L${n(I2[0])} ${n(I2[1])}A${n(ri)} ${n(ri)} 0 1 ${1 - sw} ${n(I1[0])} ${n(I1[1])}Z`;
}

/**
 * Filled horizontal thread from xa to xb at height y, thickness t. Each end is 'round' | 'butt' | {cx, cy, r, inside}
 * where a circle end hugs the circle (piece inside it when `inside`, outside it otherwise): a clean "under" gap.
 */
export function threadBar(xa, xb, y, t, endA = "round", endB = "round") {
  const r = t / 2, top = y - r, bot = y + r;
  const half = (c) => Math.sqrt(c.r * c.r - r * r);
  let sx, ex, left, right;
  if (endA === "round") { sx = xa + r; left = `A${n(r)} ${n(r)} 0 0 1 ${n(sx)} ${n(top)}`; }
  else if (endA === "butt") { sx = xa; left = "Z"; }
  else { sx = endA.inside ? endA.cx - half(endA) : endA.cx + half(endA); left = `A${n(endA.r)} ${n(endA.r)} 0 0 ${endA.inside ? 1 : 0} ${n(sx)} ${n(top)}`; }
  if (endB === "round") { ex = xb - r; right = `A${n(r)} ${n(r)} 0 0 1 ${n(ex)} ${n(bot)}`; }
  else if (endB === "butt") { ex = xb; right = `L${n(ex)} ${n(bot)}`; }
  else { ex = endB.inside ? endB.cx + half(endB) : endB.cx - half(endB); right = `A${n(endB.r)} ${n(endB.r)} 0 0 ${endB.inside ? 1 : 0} ${n(ex)} ${n(bot)}`; }
  return `M${n(sx)} ${n(top)}H${n(ex)}${right}H${n(sx)}${left}Z`;
}

/* ================================================================== */
/* Option definitions are registered below                             */
/* ================================================================== */
export const options = [];

/* ================================================================== */
/* 01 Bead: pearls on a thread                                         */
/* ================================================================== */

function beadGlyph(c, o = {}) {
  const { ro = 19, w = 11, t = 4.4, g = 2.4, x0 = 4, x1 = 60, cx = 30.8, cy = 32 } = o;
  const ri = ro - w, h = t / 2 + g;
  return [
    fillp(ringWithSlot(cx, cy, ro, ri, h, -1), c.ac),
    fillp(threadBar(x0, 0, cy, t, "round", { cx, cy, r: ri - g, inside: true }), c.fg),
    fillp(threadBar(0, x1, cy, t, { cx, cy, r: ro + g, inside: false }, "round"), c.fg),
  ].join("");
}

options.push({
  slug: "01-bead",
  name: "Bead",
  tagline: "Pearls on a thread",
  idea:
    "A bead with the thread passing over its left rim and under its right rim, so it is plainly strung. The sutra is the thread, and every app is one differently dyed bead on it, so a home screen row reads as a necklace.",
  mark: (mode) => beadGlyph(modeColors(mode)),
  favicon: () => tile(dye(BRAND)) + beadGlyph({ fg: PAPER, ac: PAPER }, { ro: 19, w: 10, t: 5.6, g: 3, x0: 5, x1: 59, cx: 30.5 }),
  suite: () => tile(PAPER) + beadGlyph({ fg: INK, ac: dye(BRAND) }, { ro: 19, w: 8, t: 4, g: 2.2, x0: 0, x1: 64 }),
  icon: (app) => {
    const d = dye(APP_DYE[app]);
    return (
      tile(PAPER) +
      `<rect y="30.7" width="64" height="2.6" fill="${INK}"/>` +
      `<circle cx="32" cy="32" r="21" fill="${d}"/>` +
      picto(app, { size: 26, w: 2.6, color: PAPER })
    );
  },
  lockup: { xh: 22, w: 4.8, gap: 12 },
  pros: ["Reads at once as a thing on a string, and the bead is the dye, so the colour system is the concept.","A home-screen row reads as a necklace: the thread runs edge to edge through every tile.","Cream tile, one dyed disc, one pictogram: calm, flat, and at home beside the paper style.","Flat discs with one pictogram stay readable down to 29 px."],
  cons: ["The over-and-under crossing shows from about 64 px up; at 32 px and 16 px the mark is a ring with a bar, which can read as a diameter or no-entry sign.","Cream tiles have the weakest silhouette on a bright wallpaper; the thread helps but does not fix it.","Mark (ring) and icons (solid disc) are cousins, not the same drawing.","A ring on a line is not very ownable on its own."],
  verdict16: "Fair. The favicon stays a recognisable ring with a line at 16 px, but the crossing is gone, so it relies on the colour and the line to say bead.",
  cmp: {"tile":"Cream tile, dyed disc on a thread","glyph":"Ring bead strung over and under","small":"Fair: ring plus bar, crossing lost","apps":"Colour + pictogram inside the bead","paper":"Excellent: ink ring on paper","change":"Large: new mark, new tile, icons restyled"},
});

/* ================================================================== */
/* 02 Loom: over-and-under weave                                       */
/* ================================================================== */

function hbarP(x0, x1, y, t, capL, capR) {
  const r = t / 2, a = x0 + (capL === "round" ? r : 0), b = x1 - (capR === "round" ? r : 0);
  return `M${n(a)} ${n(y - r)}H${n(b)}${capR === "round" ? `A${n(r)} ${n(r)} 0 0 1 ${n(b)} ${n(y + r)}` : `V${n(y + r)}`}H${n(a)}${capL === "round" ? `A${n(r)} ${n(r)} 0 0 1 ${n(a)} ${n(y - r)}` : `V${n(y - r)}`}Z`;
}
function vbarP(y0, y1, x, t, capT, capB) {
  const r = t / 2, a = y0 + (capT === "round" ? r : 0), b = y1 - (capB === "round" ? r : 0);
  return `M${n(x + r)} ${n(a)}V${n(b)}${capB === "round" ? `A${n(r)} ${n(r)} 0 0 1 ${n(x - r)} ${n(b)}` : `H${n(x - r)}`}V${n(a)}${capT === "round" ? `A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(a)}` : `H${n(x + r)}`}Z`;
}
/**
 * Weave: bars {o:'h'|'v', c (centre line), a, e (extent), k (index), col}. At each crossing the `over` rule picks the
 * bar that stays whole; the other is cut by a gap g each side, with butt ends at the cut and round caps at its true ends.
 */
export function weave(bars, { b = 6, g = 1.8, over = (h, v) => ((h.k + v.k) % 2 === 0 ? "h" : "v") } = {}) {
  let out = "";
  for (const bar of bars) {
    const cuts = [];
    for (const o of bars) {
      if (o.o === bar.o) continue;
      const [h, v] = bar.o === "h" ? [bar, o] : [o, bar];
      if (v.c >= h.a - 0.01 && v.c <= h.e + 0.01 && h.c >= v.a - 0.01 && h.c <= v.e + 0.01 && over(h, v) !== bar.o) cuts.push(bar.o === "h" ? v.c : h.c);
    }
    cuts.sort((p, q) => p - q);
    let s = bar.a;
    const pieces = [];
    for (const c of cuts) {
      const lo = c - b / 2 - g, hi = c + b / 2 + g;
      if (lo > s) pieces.push([s, lo]);
      s = Math.max(s, hi);
    }
    if (s < bar.e) pieces.push([s, bar.e]);
    for (const [p0, p1] of pieces) {
      const ca = p0 === bar.a ? "round" : "butt", cb = p1 === bar.e ? "round" : "butt";
      out += fillp(bar.o === "h" ? hbarP(p0, p1, bar.c, b, ca, cb) : vbarP(p0, p1, bar.c, b, ca, cb), bar.col);
    }
  }
  return out;
}
/** An n x n weave of flush bars centred at (32,32); `rule(i,j)` returns true when row bar i is over column bar j. */
function weaveSquare(nb, { pitch, b, g = "auto", rule, warp, weft, cx = 32, cy = 32 }) {
  if (g === "auto") g = (pitch - b) / 2 + 0.05; // the cut just swallows the short bridge between two under-crossings
  const span = (nb - 1) * pitch, lo = -span / 2 - b / 2, hi = span / 2 + b / 2;
  const bars = [];
  for (let i = 0; i < nb; i++) {
    const c = -span / 2 + i * pitch;
    bars.push({ o: "h", c: cy + c, a: cx + lo, e: cx + hi, k: i, col: weft });
    bars.push({ o: "v", c: cx + c, a: cy + lo, e: cy + hi, k: i, col: warp });
  }
  return weave(bars, { b, g, over: (h, v) => (rule(h.k, v.k) ? "h" : "v") });
}
const plainRule = (i, j) => (i + j) % 2 === 0;
const loomGlyph = (c, o = {}) => weaveSquare(4, { pitch: 12.2, b: 7, g: 1.9, rule: plainRule, warp: c.ac, weft: c.fg, ...o });

/** Weave structures for the eight apps (4 x 4, true = weft over). */
const WEAVES = {
  notes: (i, j) => !(j === 0 && i % 2 === 0) && j !== 3, // weft-faced: ruled lines
  tasks: (i, j) => i >= j, // stair: progress
  calendar: (i, j) => (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0, // basket: day blocks
  mail: (i, j) => (((i - j) % 4) + 4) % 4 < 2, // 2/2 twill: diagonal fold
  files: (i, j) => Math.abs(i - 1.5) + Math.abs(j - 1.5) <= 1.5, // lozenge: nested folders
  journal: (i, j) => !(i === 0 && j % 2 === 0) && i !== 3, // warp-faced: book spines
  finance: (i, j) => (j < 2 ? ((i - j + 4) % 4) < 2 : ((i + j) % 4) < 2), // herringbone: rising chevrons
  habits: (i, j) => Math.min(i, 3 - i, j, 3 - j) % 2 === 0, // concentric squares: rings of habit
};
Object.assign(WEAVES, {});

options.push({
  slug: "02-loom",
  name: "Loom",
  tagline: "Warp and weft",
  idea:
    "Text and textile share a root: a discourse is a woven thing. The mark is a plain weave of four warp and four weft bars, each crossing resolved correctly over and under; every app icon is the same woven tile in its own dye, told apart by a different weave structure.",
  mark: (mode) => loomGlyph(modeColors(mode)),
  favicon: () => tile(dye(BRAND)) + weaveSquare(3, { pitch: 16, b: 11, g: 2.6, rule: plainRule, warp: PAPER, weft: dye(BRAND, "bright") }),
  suite: () => tile(dye(BRAND)) + weaveSquare(4, { pitch: 11.2, b: 6.4, g: 1.6, rule: plainRule, warp: PAPER, weft: dye(BRAND, "bright") }),
  icon: (app) => {
    const d = APP_DYE[app];
    return tile(dye(d)) + weaveSquare(4, { pitch: 12, b: 6.6, g: 1.5, rule: WEAVES[app], warp: PAPER, weft: dye(d, "bright") });
  },
  lockup: { xh: 22, w: 3.8, gap: 12 },
  pros: ["The most ownable shape: a woven square is a real structure, bold in one colour, and nothing like the old knot.","Icons are fabric swatches: eight weave structures in eight dyes make a beautiful sampler on the home screen.","The single-colour mark works through the gaps alone, so ink on paper looks right.","Every crossing is resolved by one rule in the generator, so over and under is correct everywhere."],
  cons: ["Icons have no pictogram: apps are told apart by colour and weave, which has to be learned, and at 29 px the weaves blur into texture.","At 16 px the mark becomes a fine checkerboard; the favicon switches to a bolder 3 by 3 weave.","The busiest of the six; fine detail will sit awkwardly next to flat UI.","Basket and weave motifs are common in craft branding."],
  verdict16: "Weak. At 16 px the 4 by 4 mark is a checkerboard; the bolder 3 by 3 favicon holds as 'woven' but is not a distinct silhouette.",
  cmp: {"tile":"Dyed tile, woven swatch","glyph":"4 by 4 plain weave, two threads","small":"Weak: checkerboard at 16 px","apps":"Colour + weave structure, no pictogram","paper":"Good: gaps carry the structure","change":"Large: new mark, new icon language"},
});

/* ================================================================== */
/* 03 Stitch: needle and running stitch                                */
/* ================================================================== */

/** Needle outline in local coordinates: tip at (0,0), head end at x = len, eye punched out (use fill-rule evenodd). */
function needleD(len, bw, hw, eyeL, eyeW) {
  const taper = len * 0.32, hs = len - eyeL - 7, r = hw;
  const body = `M0 0L${n(taper)} ${n(-bw / 2)}H${n(hs)}Q${n(hs + 2)} ${n(-hw)} ${n(hs + 7)} ${n(-hw)}H${n(len - r)}A${n(r)} ${n(r)} 0 0 1 ${n(len - r)} ${n(hw)}H${n(hs + 7)}Q${n(hs + 2)} ${n(hw)} ${n(hs)} ${n(bw / 2)}H${n(taper)}Z`;
  const er = eyeW / 2, ex = len - r - 0.5, x0 = ex - eyeL / 2 + er, x1 = ex + eyeL / 2 - er;
  const hole = `M${n(x0)} ${n(-er)}H${n(x1)}A${n(er)} ${n(er)} 0 0 1 ${n(x1)} ${n(er)}H${n(x0)}A${n(er)} ${n(er)} 0 0 1 ${n(x0)} ${n(-er)}Z`;
  return body + hole;
}
/** A chain of cubic segments, as path data, with its length. */
function cubics(pts) {
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`, len = 0;
  for (let i = 1; i < pts.length; i += 3) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    d += `C${n(p1[0])} ${n(p1[1])} ${n(p2[0])} ${n(p2[1])} ${n(p3[0])} ${n(p3[1])}`;
    let prev = p0;
    for (let k = 1; k <= 40; k++) {
      const t = k / 40, u = 1 - t;
      const q = [0, 1].map((a) => u ** 3 * p0[a] + 3 * u * u * t * p1[a] + 3 * u * t * t * p2[a] + t ** 3 * p3[a]);
      len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      prev = q;
    }
  }
  return { d, len };
}
/** Running stitch along a path: whole number of dashes, first and last flush with the ends. */
function stitchPath(pts, w, color, dash = 4, gap = 4.2) {
  const { d, len } = cubics(pts);
  const N = Math.max(2, Math.round((len + gap) / (dash + gap)));
  const p = (len + gap) / N;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w)}" stroke-linecap="round" stroke-dasharray="${n(p - gap)} ${n(gap)}"/>`;
}
/** Rounded rect drawn as a running stitch, dashes symmetric about the middle of each side. */
function stitchRect(x, y, w, h, r, sw, color, dash, gap) { // square tiles only: h = w
  const s = w - 2 * r, a = (Math.PI * r) / 2, per = s + a; // one side plus one corner
  const k = Math.max(2, Math.round(per / (dash + gap)));
  const p = per / k, dl = p - gap;
  const d0 = s / 2 - dl / 2;
  const off = ((p - (d0 % p)) % p);
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="none" stroke="${color}" stroke-width="${n(sw)}" stroke-linecap="round" stroke-dasharray="${n(dl)} ${n(gap)}" stroke-dashoffset="${n(off)}"/>`;
}

function stitchGlyph(c, o = {}) {
  const { len = 52, bw = 4.2, hw = 5.4, eyeL = 9.5, eyeW = 3.6, sw = 3.5, tx = 8, ty = 56, dash = 4, gap = 4.6 } = o;
  const thread = [[46.5, 17.5], [58, 11], [63, 28], [56, 41], [49, 52], [32, 58], [16, 58.5]];
  return (
    `<path fill="${c.fg}" fill-rule="evenodd" d="${needleD(len, bw, hw, eyeL, eyeW)}" transform="translate(${tx} ${ty}) rotate(-45)"/>` +
    stitchPath(thread, sw, c.ac, dash, gap)
  );
}

options.push({
  slug: "03-stitch",
  name: "Stitch",
  tagline: "Needle, thread, running stitch",
  idea:
    "Sutra, suture, sew and seam share one root. The mark is a needle with its thread running off in even stitches; each app icon is a small patch of dyed cloth, hemmed with a dashed running stitch, holding one plain pictogram.",
  mark: (mode) => stitchGlyph(modeColors(mode)),
  favicon: () => tile(dye(BRAND)) + stitchGlyph({ fg: PAPER, ac: PAPER }, { len: 48, bw: 5.6, hw: 7, eyeL: 10, eyeW: 4.4, sw: 4.4, tx: 10, ty: 54, dash: 3, gap: 6 }),
  suite: () => tile(dye(BRAND)) + stitchRect(5.5, 5.5, 53, 53, 9, 1.8, dye(BRAND, "soft"), 5, 3.5) + `<g transform="translate(32 32) scale(.62) translate(-32 -32)">${stitchGlyph({ fg: PAPER, ac: dye(BRAND, "bright") })}</g>`,
  icon: (app) => {
    const d = dye(APP_DYE[app]);
    return tile(d) + stitchRect(5.5, 5.5, 53, 53, 9, 1.8, dye(APP_DYE[app], "soft"), 5, 3.5) + picto(app, { size: 27, w: 2.5, color: PAPER });
  },
  lockup: { xh: 22, w: 3.6, gap: 12 },
  pros: ["Needle, thread and running stitch say sew, suture and seam together, and the dashed hem is a friendly, ownable signature on every tile.","Pictograms stay plain and readable inside the hem, so apps are easy to tell apart.","The colour mark is warm and illustrative without a gradient.","Dashes are generated as a whole number, so corners and ends are always clean."],
  cons: ["The needle is a thin diagonal: at 16 px it is a slash with a dot, so the favicon uses a heavier needle and drops the thread.","More illustration than icon; it is the most clip-art-like of the abstract set.","The hem turns into a dotted line at 29 px and is invisible below that.","At a glance the needle can read as a pen or a syringe."],
  verdict16: "Fair to weak. The needle silhouette is clear at 32 px; at 16 px only the slant and the eye remain, and the thread dashes are gone.",
  cmp: {"tile":"Dyed tile with a dashed stitched hem","glyph":"Needle with a running-stitch thread","small":"Fair to weak: needle only","apps":"Colour + plain pictogram","paper":"Good: ink needle on paper","change":"Medium: new mark, hem on the tiles"},
});

/* ================================================================== */
/* 04 Aphorism: terse lines strung on one thread                       */
/* ================================================================== */

/** One continuous thread through horizontal lines of different length, joined by semicircular turns (right, left, right...). */
function serpentine(ys, xs, r, w, col) {
  let d = `M${n(xs[0])} ${n(ys[0])}`;
  for (let i = 0; i < ys.length - 1; i++) d += `H${n(xs[i + 1])}A${n(r)} ${n(r)} 0 0 ${i % 2 === 0 ? 1 : 0} ${n(xs[i + 1])} ${n(ys[i + 1])}`;
  d += `H${n(xs[xs.length - 1])}`;
  return stroke(d, w, col);
}
const aphoGlyph = (c) => serpentine([14, 25.3, 36.7, 48], [10, 48, 20, 46, 28], 5.65, 4.6, c.ac);

const LW = 4.4;
const ln = (x0, x1, y, col) => stroke(`M${n(x0)} ${n(y)}H${n(x1)}`, LW, col);
const dt = (x, y, col, r = LW * 0.64) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${col}"/>`;
const pl = (d, col, w = LW) => stroke(d, w, col);
/** Pictograms built only from horizontal lines, dots and the thread; P paper, A accent, D dim. */
function aphoPicto(app, P, A, D) {
  switch (app) {
    case "notes":
      return ln(14, 50, 17, A) + ln(14, 50, 27, P) + ln(14, 50, 37, P) + ln(14, 34, 47, P);
    case "tasks": {
      const tick = (y) => pl(`M14.2 ${y + 0.5}l3 3 5.4-6.4`, A);
      return tick(18) + tick(32) + `<circle cx="18.2" cy="46" r="3.4" fill="none" stroke="${P}" stroke-width="3.2"/>` + ln(30, 50, 18, P) + ln(30, 50, 32, P) + ln(30, 44, 46, P);
    }
    case "calendar": {
      let s = ln(14, 50, 16, A);
      for (const y of [28, 38, 48]) for (const x of [17, 32, 47]) s += dt(x, y, P, 2.8);
      return s;
    }
    case "mail":
      return pl("M14 18L32 32L50 18", A) + ln(14, 50, 42, P) + ln(14, 36, 50, P);
    case "files":
      return ln(14, 40, 16, P) + pl("M22 16V48", A) + ln(22, 50, 28, P) + ln(22, 50, 38, P) + ln(22, 44, 48, P);
    case "journal":
      return pl("M16 14V50", A) + ln(25, 40, 19, P) + ln(25, 50, 29, P) + ln(25, 50, 39, P) + ln(25, 44, 49, P);
    case "finance":
      return ln(14, 28, 18, P) + ln(14, 40, 32, P) + ln(14, 50, 46, A);
    case "habits": {
      let s = "";
      const on = [[1, 1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]];
      on.forEach((row, ri) => row.forEach((v, ci) => (s += dt(17 + ci * 10, 20 + ri * 12, v ? A : D, 3.5))));
      return s;
    }
  }
  return "";
}

options.push({
  slug: "04-aphorism",
  name: "Aphorism",
  tagline: "Terse lines strung on one thread",
  idea:
    "A sutra is a short rule, and a discourse is many of them strung together. The mark is one unbroken thread running through four lines of different length: it reads as text, as a list and as a thread at once. Every app icon redraws its pictogram with the same lines and one dye-coloured line, on a kohl tile.",
  mark: (mode) => aphoGlyph(modeColors(mode)),
  favicon: () => tile(dye(BRAND)) + serpentine([17, 32, 47], [14, 42, 24, 40], 7.5, 7.2, PAPER),
  suite: () => tile(INK) + serpentine([15, 25.5, 36.5, 47], [14, 46, 22, 44, 29], 5.3, 4.4, PAPER),
  icon: (app) => {
    const dn = APP_DYE[app];
    return tile(INK) + aphoPicto(app, PAPER, dye(dn, "bright"), "#4a463e");
  },
  lockup: { xh: 22, w: 3.6, gap: 12 },
  pros: ["The logo and every icon are built from one element, a line, so the whole suite is one drawing language.","Kohl tiles with a single dyed line are sleek and make the dyes glow; every dye clears 3:1 on kohl.","The mark is a plain monoline: crisp at 32 px and up in one colour, and the favicon drops to three heavier lines.","It reads as text, a list and a thread at once, which is what a sutra is."],
  cons: ["Eight near-black tiles make a heavy home screen, and the tile edge nearly vanishes on a dark wallpaper.","The mark can read as a stylised S, a 3, or a wind symbol.","Line pictograms overlap at 29 px (notes, journal and files are close cousins).","The dye appears only as one accent line, so colour identity is quieter than in the dye-tile options."],
  verdict16: "Fair to good. The four lines are about 1 px thick at 16 px and blur towards three bands in the plain mark; the favicon switches to three heavier lines on a tile and stays clean.",
  cmp: {"tile":"Kohl tile, paper lines, one dyed line","glyph":"One thread through four ragged lines","small":"Fair to good: favicon uses 3 heavier lines","apps":"Pictogram + dye accent","paper":"Excellent: it is the paper style","change":"Large: new mark, dark tiles"},
});

/* ================================================================== */
/* 05 Devanagari: the headline bar and sa                              */
/* ================================================================== */

/**
 * An original, geometric reduction of the first letter of सूत्र: the shirorekha (headline) as the thread, and the
 * letter स (sa) hanging from it: a stem, a small box under the bar, and one long diagonal. Not traced from a font
 * and not the exact letter (no matra, straight strokes, one weight).
 */
function devaGlyph(c, o = {}) {
  const { w = 5, bw = 5, cx = 0, cy = 0, s = 1 } = o;
  const body =
    stroke("M45 13V50", w, c.fg) + stroke("M27 13V28H45", w, c.fg) + stroke("M27 28L13 33L32 50", w, c.fg) + stroke("M9 13H55", bw, c.ac);
  return s === 1 && !cx && !cy ? body : `<g transform="translate(${n(32 + cx)} ${n(32 + cy)}) scale(${n(s)}) translate(-32 -31.5)">${body}</g>`;
}

options.push({
  slug: "05-devanagari",
  name: "Devanagari",
  tagline: "The headline bar and the first letter of सूत्र",
  idea:
    "In Devanagari every word hangs from one unbroken headline, the shirorekha: a thread the letters are strung on. The mark is that bar with a geometric reduction of स (sa), the first letter of सूत्र, hanging beneath it; the app icons hang their pictograms from the same bar.",
  mark: (mode) => devaGlyph(modeColors(mode)),
  favicon: () => tile(dye(BRAND)) + devaGlyph({ fg: PAPER, ac: dye(BRAND, "bright") }, { w: 6.6, bw: 6.6, s: 0.92 }),
  suite: () => tile(dye(BRAND)) + devaGlyph({ fg: PAPER, ac: dye(BRAND, "bright") }, { w: 5.4, bw: 5.4, s: 0.78 }),
  icon: (app) => {
    const d = APP_DYE[app];
    return (
      tile(dye(d)) +
      stroke("M10 12.5H54", 4.2, dye(d, "soft")) +
      stroke("M32 12.5V22", 3, dye(d, "soft")) +
      picto(app, { cx: 32, cy: 40.5, size: 30, w: 2.8, color: PAPER })
    );
  },
  lockup: { xh: 22, w: 3.6, gap: 12 },
  pros: ["The most meaningful: the shirorekha is literally the thread that words are strung on, and the hanging pictograms extend the idea to every icon.","स reads clearly even at 16 px, the strongest small-size mark of the six.","Simple geometry: two kinds of stroke, one weight; icons carry a plain pictogram under a dyed bar.","Culturally grounded without any religious symbol: it is a letter of a living script."],
  cons: ["Only readers of Devanagari get the reference; to everyone else it is an abstract glyph. It is an abstraction of स, not the exact letter, so a native reader should review the proportions before adoption.","Bar and hanger take about a third of each tile, so pictograms are smaller than in the other dye-tile sets.","A Devanagari glyph beside the Latin word needs careful lockup spacing.","The bar and hanger can read as a window title bar or a signpost on a first look."],
  verdict16: "Strong. A bar and one hanging letter, two kinds of stroke: legible at 16 px in one colour.",
  cmp: {"tile":"Dyed tile, bar and hanger above the pictogram","glyph":"Headline bar + reduced स","small":"Strong: reads at 16 px","apps":"Colour + pictogram hung from the bar","paper":"Excellent: ink bar and letter","change":"Large: new mark, new icon frame"},
});

/* ================================================================== */
/* 06 Spool: a reel of thread                                          */
/* ================================================================== */

function spoolGlyph(c, o = {}) {
  const { fx = 8, fw = 36, fh = 9, bx = 13, bw = 26, y0 = 6, y1 = 56, gaps = 3, gh = 1.8, tw = 3.2, tail = true } = o;
  const by0 = y0 + fh, by1 = y1 - fh, band = (by1 - by0 - gaps * gh) / (gaps + 1);
  let s = `<rect x="${fx}" y="${y0}" width="${fw}" height="${fh}" rx="${n(fh / 2)}" fill="${c.fg}"/><rect x="${fx}" y="${y1 - fh}" width="${fw}" height="${fh}" rx="${n(fh / 2)}" fill="${c.fg}"/>`;
  for (let i = 0; i <= gaps; i++) s += `<rect x="${bx}" y="${n(by0 + i * (band + gh))}" width="${bw}" height="${n(band)}" fill="${c.ac}"/>`;
  if (tail) s += stroke(`M${bx + bw - 1} 41C${bx + bw + 8} 41 49 47 52 52C54 56 58 58 62 56`, tw, c.ac);
  return s;
}

options.push({
  slug: "06-spool",
  name: "Spool",
  tagline: "A reel of thread",
  idea:
    "The most literal reading of sutra: a spool of thread with its loose end running off. It is the quiet, flat, classic option: every app icon is a plain dyed tile with one clean pictogram, and the spool stays the mark of the suite itself.",
  mark: (mode) => spoolGlyph(modeColors(mode)),
  favicon: () => tile(dye(BRAND)) + spoolGlyph({ fg: PAPER, ac: dye(BRAND, "bright") }, { fx: 10, fw: 34, fh: 10, bx: 15, bw: 24, y0: 6, y1: 58, gaps: 2, gh: 2.4, tail: false }),
  suite: () => tile(dye(BRAND)) + `<g transform="translate(32 32) scale(.66) translate(-32 -31)">${spoolGlyph({ fg: PAPER, ac: dye(BRAND, "bright") })}</g>`,
  icon: (app) => tile(dye(APP_DYE[app])) + picto(app, { size: 32, w: 2.8, color: PAPER }),
  lockup: { xh: 22, w: 3.6, gap: 12 },
  pros: ["Understood instantly: a spool is the object, so there is nothing to explain.","Flat dyed tiles with large pictograms are the safest, clearest app icons (29 px is easy).","Lowest rollout cost: icons keep today's structure minus the gradient and gloss.","The single-colour mark keeps the flanges and the stripes, so ink on paper works."],
  cons: ["Literal and a little generic: spools are common in sewing and craft brands.","At 16 px the mark is a striped I; the loose thread is lost.","The tiles carry no Sutra-specific device, only colour, so they are the least ownable.","A rigid tail drawn as a handle turns the spool into a mug, so the thread has to stay loose and flowing."],
  verdict16: "Fair. Flanges and stripes survive as an I-shaped reel and still read as a spool; the thread tail is lost, so the favicon omits it.",
  cmp: {"tile":"Plain dyed tile, large pictogram","glyph":"Spool with a loose thread","small":"Fair: striped reel, no tail","apps":"Colour + pictogram","paper":"Good: ink spool on paper","change":"Small: flat tiles, new suite mark"},
});


/* ================================================================== */
/* The current logo and icons (geometry copied from assets/brand.tsx)   */
/* ================================================================== */

let uid = 0;
const CUR_THREAD = "M21.5 10.2c-1.3-1.5-3.2-2.4-5.5-2.4-3.2 0-5.4 1.8-5.4 4.2 0 2.5 2.3 3.4 5.4 4.1 3.2.7 5.6 1.7 5.6 4.3 0 2.5-2.3 4.3-5.6 4.3-2.4 0-4.4-.9-5.7-2.5";
const CUR_LOOP = "M10.3 22.2c-1.2-1.4-1.1-3 .1-3.6 1.2-.6 2.6.3 2.5 1.8";
const CUR_GLYPH = {
  notes: '<path d="M11 8.5h7.5l3.5 3.5v10a1.5 1.5 0 0 1-1.5 1.5H11A1.5 1.5 0 0 1 9.5 22V10A1.5 1.5 0 0 1 11 8.5Z"/><path d="M18.5 8.5V12H22"/><path d="M12.5 15.5h6M12.5 18.5h4"/>',
  tasks: '<rect x="9" y="9" width="14" height="14" rx="3.5"/><path d="m12.6 16.2 2.4 2.4 4.6-5"/>',
  calendar: '<rect x="8.5" y="10" width="15" height="13.5" rx="2.5"/><path d="M8.5 14.5h15M12.5 8v3.5M19.5 8v3.5"/><path d="M12.5 18.2h.01M16 18.2h.01M19.5 18.2h.01" stroke-width="2.6"/>',
  mail: '<rect x="8" y="10" width="16" height="12" rx="2.5"/><path d="m8.8 11.2 6.2 4.8a1.6 1.6 0 0 0 2 0l6.2-4.8"/>',
  files: '<path d="M8.5 12A1.5 1.5 0 0 1 10 10.5h3.6l1.8 2H22a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 22 23H10a1.5 1.5 0 0 1-1.5-1.5V12Z"/><path d="M8.5 15.5h15"/>',
  journal: '<path d="M10 9.5A1.5 1.5 0 0 1 11.5 8H22v14H11.5a1.5 1.5 0 0 0-1.5 1.5V9.5Z"/><path d="M10 23.5A1.5 1.5 0 0 0 11.5 25H22v-3"/><path d="M15 8v6l1.75-1.3L18.5 14V8"/>',
  finance: '<path d="M9 22.5h14"/><path d="M11 19.5v-3M15 19.5v-5.5M19 19.5v-8"/><path d="m10.5 13 3.5-3 2.5 2 5-4.5"/><path d="M19 7.5h2.5V10"/>',
  habits: '<path d="M22.4 18.6A7 7 0 1 1 18.6 9.6"/><path d="m12.8 16 2.3 2.3 4.4-4.6"/><circle cx="21.6" cy="11.2" r="1.3" fill="#ffffff" stroke="none"/>',
};
const CUR_APP = {
  notes: ["#fdc700", "#f54900"], tasks: ["#7c86ff", "#4f39f6"], calendar: ["#ff637e", "#e7000b"], mail: ["#51a2ff", "#155dfc"],
  files: ["#00d3f2", "#0084d1"], journal: ["#a684ff", "#7008e7"], finance: ["#05df72", "#008236"], habits: ["#ff8904", "#ec003f"],
};
function currentMark() {
  const id = `cm${uid++}`;
  return (
    `<g transform="scale(2)"><defs><linearGradient id="${id}a" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7c86ff"/><stop offset="1" stop-color="#4f39f6"/></linearGradient>` +
    `<linearGradient id="${id}b" x1="16" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<rect width="32" height="32" rx="8" fill="url(#${id}a)"/><rect width="32" height="32" rx="8" fill="url(#${id}b)"/><rect x=".5" y=".5" width="31" height="31" rx="7.5" fill="none" stroke="#fff" stroke-opacity=".18"/>` +
    `<g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${CUR_THREAD}"/><path d="${CUR_LOOP}"/></g><circle cx="21.6" cy="10.2" r="1.6" fill="#fff"/></g>`
  );
}
function currentIcon(app) {
  const id = `ci${uid++}`;
  const [from, to] = CUR_APP[app];
  return (
    `<g transform="scale(2)"><defs><linearGradient id="${id}a" x1="2" y1="1" x2="30" y2="31" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>` +
    `<linearGradient id="${id}b" x1="16" y1="0" x2="16" y2="18" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="${id}c"><rect width="32" height="32" rx="7.5"/></clipPath></defs>` +
    `<g clip-path="url(#${id}c)"><rect width="32" height="32" fill="url(#${id}a)"/><rect width="32" height="32" fill="url(#${id}b)"/>` +
    `<path d="M-2 27.5c5.5-3.6 10.4-3.6 15.2-.6 4.8 3 10.6 3.2 18.8-1.6" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round"/></g>` +
    `<rect x=".5" y=".5" width="31" height="31" rx="7" fill="none" stroke="#fff" stroke-opacity=".16"/>` +
    `<g fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CUR_GLYPH[app]}</g></g>`
  );
}
const CURRENT = {
  slug: "current", name: "Current", tagline: "Thread tied into an S, gradient tiles with a glossy shine",
  mark: () => currentMark(), favicon: () => currentMark(), suite: () => currentMark(), icon: (app) => currentIcon(app),
};

/* ================================================================== */
/* Output files                                                         */
/* ================================================================== */

function lockupFor(o, mode) {
  const markInner = o.mark(mode);
  return lockup(markInner, mode === "mono" ? "currentColor" : mode === "reversed" ? PAPER : INK, o.lockup ?? {});
}

function writeFiles() {
  for (const o of options) {
    const dir = join(HERE, o.slug);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "app-icons"), { recursive: true });
    const w = (f, s) => writeFileSync(join(dir, f), s);
    w("mark.svg", file64(o.mark("color"), `Sutra mark, ${o.name}`));
    w("mark-mono.svg", file64(o.mark("mono"), `Sutra mark, ${o.name}, single colour`));
    w("mark-reversed.svg", file64(o.mark("reversed"), `Sutra mark, ${o.name}, for dark backgrounds`));
    w("favicon.svg", file64(o.favicon(), `Sutra favicon, ${o.name}`).replace('width="256" height="256"', 'width="32" height="32"'));
    for (const [mode, f] of [["color", "lockup.svg"], ["reversed", "lockup-reversed.svg"], ["mono", "lockup-mono.svg"]]) {
      const L = lockupFor(o, mode);
      w(f, `<svg ${NS} viewBox="${L.vb}" width="${n(L.w * 4)}" height="256" role="img" aria-label="sutra">\n<title>sutra</title>\n${L.inner}\n</svg>\n`);
    }
    w("app-icons/sutra.svg", file1024(o.suite(), "Sutra"));
    for (const a of apps) w(`app-icons/${a}.svg`, file1024(o.icon(a), `Sutra ${appName[a]}`));
  }
  // drop folders of options that no longer exist (NN-slug)
  const keep = new Set(options.map((o) => o.slug));
  for (const d of readdirSync(HERE)) if (/^\d\d-/.test(d) && !keep.has(d)) rmSync(join(HERE, d), { recursive: true, force: true });
}


/* ================================================================== */
/* index.html                                                           */
/* ================================================================== */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const svgUri = (s) => "data:image/svg+xml," + encodeURIComponent(s);

const CSS = `
:root{--bg:#f7f5f0;--fg:#1c1915;--muted:#6a6459;--line:#ddd7ca;--card:#fffdf9;--chip:#ece8de;--link:#2f3190}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#000;--fg:#f4f1ea;--muted:#a59f92;--line:#2a2722;--card:#0e0d0b;--chip:#1b1916;--link:#a9abff}}
:root[data-theme=dark]{--bg:#000;--fg:#f4f1ea;--muted:#a59f92;--line:#2a2722;--card:#0e0d0b;--chip:#1b1916;--link:#a9abff}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--link)}
header.top{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between}
header.top .brand{font-weight:600;letter-spacing:-.02em;white-space:nowrap}
nav.chips{display:flex;gap:6px;overflow-x:auto;flex:1;scrollbar-width:none}
nav.chips a{flex:none;text-decoration:none;color:var(--fg);background:var(--chip);border-radius:99px;padding:3px 11px;font-size:13px}
@media(max-width:520px){header.top .brand{display:none}}
button.tg{flex:none;font:inherit;font-size:13px;color:var(--fg);background:var(--chip);border:1px solid var(--line);border-radius:99px;padding:3px 11px;cursor:pointer}
main{max-width:1080px;margin:0 auto;padding:0 16px 80px}
h1{font-size:clamp(28px,6vw,44px);line-height:1.1;letter-spacing:-.03em;margin:36px 0 8px}
h2{font-size:clamp(22px,4.5vw,30px);letter-spacing:-.02em;line-height:1.2;margin:0 0 6px}
h3{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:26px 0 10px;font-weight:600}
p{margin:0 0 12px}.lede{color:var(--muted);max-width:68ch}
section.opt{border-top:1px solid var(--line);margin-top:48px;padding-top:28px}
.num{font:600 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);display:block;margin-bottom:6px}
.tagline{color:var(--muted);margin:0 0 14px}
.sws{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.sw{border-radius:14px;padding:16px;display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;border:1px solid transparent;min-height:84px}
.sw.light{background:#fff;color:#1c1915;border-color:#e6e1d6}
.sw.dark{background:#0b0a09;color:#f7f5f0;border-color:#2a2722}
.sw.paper{background:#f7f5f0;color:#1c1915;border-color:#e6e1d6}
.sw.black{background:#000;color:#f7f5f0;border-color:#2a2722}
.sw .lab{flex-basis:100%;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.6;margin-bottom:-4px}
.cap{display:block;font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.55;text-align:center;margin-top:6px}
.it{display:flex;flex-direction:column;align-items:center}
.icons{display:flex;flex-wrap:wrap;gap:14px 16px}
.icons figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.icons.s48 figure{gap:4px}
.icons svg{display:block}
.row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.phone{border-radius:28px;padding:22px 14px 16px;border:1px solid var(--line)}
.phone.pl{background:#d9d3c5}.phone.pd{background:#3a362f}
.phone .g{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 4px;justify-items:center}
.phone figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px}
.phone.pl figure{color:#2b2822}.phone.pd figure{color:#e9e5db}
.phone .dock{margin-top:18px;border-radius:22px;padding:10px;display:flex;justify-content:space-around}
.phone.pl .dock{background:rgba(255,255,255,.4)}.phone.pd .dock{background:rgba(255,255,255,.1)}
.pc{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:620px){.pc{grid-template-columns:1fr}}
ul.pc-list{margin:0;padding-left:18px}ul.pc-list li{margin:3px 0}
.pros h4,.cons h4{margin:0 0 4px;font-size:14px}
.verdict{margin-top:14px;padding:12px 14px;border-radius:12px;background:var(--chip)}
.tab{display:inline-flex;align-items:center;gap:8px;border-radius:10px 10px 0 0;padding:7px 12px;font-size:12px;min-width:160px}
.tab.l{background:#fff;color:#1c1915;border:1px solid #e6e1d6;border-bottom:0}
.tab.d{background:#2a2825;color:#f4f1ea}
.px{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end}
.px canvas{image-rendering:pixelated;border-radius:6px}
.tblwrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
table{border-collapse:collapse;width:100%;min-width:760px;font-size:14px}
th,td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
th{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:600;white-space:nowrap}
tr:last-child td{border-bottom:0}
td:first-child,th:first-child{position:sticky;left:0;background:var(--card);font-weight:600;white-space:nowrap}
.pal{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.pal div.s{border-radius:12px;padding:12px;font-size:12px;line-height:1.35}
.cur .sws{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.rec{background:var(--chip);border-radius:16px;padding:20px 20px 8px}
.rec ol{padding-left:20px}.rec li{margin-bottom:10px}
code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--chip);padding:1px 5px;border-radius:5px}
.rec code{background:var(--bg)}
.swatch-row{display:flex;gap:6px;flex-wrap:wrap}
`;

const BIG = [128, 64, 32, 16];

function markPanels(o) {
  const panel = (cls, mode, lab) =>
    `<div class="sw ${cls}"><span class="lab">${lab}</span>${BIG.map((s) => `<div class="it">${inline(o.mark(mode), s, `Sutra mark ${s}px`)}<span class="cap">${s}</span></div>`).join("")}</div>`;
  return `<div class="sws">${panel("light", "color", "colour on white")}${panel("dark", "reversed", "reversed on dark")}${panel("paper", "mono", "ink on paper (mono)")}</div>`;
}
function lockupPanels(o) {
  const mk = (cls, mode, lab) => {
    const L = lockupFor(o, mode);
    return `<div class="sw ${cls}"><span class="lab">${lab}</span>${inline(L.inner, 64, "sutra", L.vb, 64).replace('width="64"', `width="${n(L.w)}"`)}</div>`;
  };
  return `<div class="sws">${mk("light", "color", "lockup, colour")}${mk("dark", "reversed", "lockup, reversed")}${mk("paper", "mono", "lockup, mono on paper")}</div>`;
}
function iconRow(o, size, labels = true) {
  return `<div class="icons ${size <= 48 ? "s48" : ""}">${["sutra", ...apps]
    .map((a) => `<figure>${inline(a === "sutra" ? o.suite() : o.icon(a), size, a === "sutra" ? "Sutra" : appName[a])}${labels ? `<span>${a === "sutra" ? "Sutra" : appName[a]}</span>` : ""}</figure>`)
    .join("")}</div>`;
}
function phone(o, cls, size = 54) {
  const cell = (a) => `<figure>${inline(o.icon(a), size, appName[a])}<span>${appName[a]}</span></figure>`;
  const dock = ["mail", "notes", "calendar", "tasks"].map((a) => inline(o.icon(a), size, appName[a])).join("");
  return `<div class="phone ${cls}"><div class="g">${apps.map(cell).join("")}</div><div class="dock">${dock}</div></div>`;
}
function tabMock(o) {
  const fav = (s) => inline(o.favicon(), s, "favicon");
  return `<div class="px"><div><div class="tab l">${fav(16)}<span>Sutra</span></div><span class="cap" style="text-align:left">16px tab, light</span></div><div><div class="tab d">${fav(16)}<span>Sutra</span></div><span class="cap" style="text-align:left">16px tab, dark</span></div><div class="it">${fav(32)}<span class="cap">32</span></div></div>`;
}
function pixelStrip(o) {
  const items = [
    ["favicon 16px", svgUri(file64(o.favicon(), "f")), 16],
    ["mark 16px", svgUri(file64(o.mark("color"), "m").replace(/currentColor/g, INK)), 16],
    ["glyph icon 29px", svgUri(file64(o.icon("calendar"), "c")), 29],
    ["suite icon 29px", svgUri(file64(o.suite(), "s")), 29],
  ];
  return `<div class="px">${items
    .map(([lab, uri, px]) => `<div class="it"><canvas width="${px * 5}" height="${px * 5}" style="width:${px * 5}px;height:${px * 5}px;background:#fff" data-src="${uri}" data-px="${px}"></canvas><span class="cap" style="opacity:.8">${lab}, real pixels x5</span></div>`)
    .join("")}</div>`;
}

function optionSection(o, i) {
  return `
<section class="opt" id="o${i + 1}">
  <span class="num">OPTION ${String(i + 1).padStart(2, "0")}</span>
  <h2>${esc(o.name)}</h2>
  <p class="tagline">${esc(o.tagline)}</p>
  <p class="lede">${esc(o.idea)}</p>
  <h3>Mark at 128, 64, 32, 16 px</h3>
  ${markPanels(o)}
  <h3>Lockup</h3>
  ${lockupPanels(o)}
  <h3>App icons at 96 px</h3>
  ${iconRow(o, 96)}
  <h3>At 48 px and 29 px</h3>
  ${iconRow(o, 48, false)}
  <div style="height:12px"></div>
  ${iconRow(o, 29, false)}
  <h3>Home screen</h3>
  <div class="row2">${phone(o, "pl")}${phone(o, "pd")}</div>
  <h3>Favicon and the 16 px check</h3>
  ${tabMock(o)}
  <div style="height:14px"></div>
  ${pixelStrip(o)}
  <h3>Pros and cons</h3>
  <div class="pc"><div class="pros"><h4>Pros</h4><ul class="pc-list">${o.pros.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div><div class="cons"><h4>Cons</h4><ul class="pc-list">${o.cons.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div></div>
  <div class="verdict"><strong>Legibility at 16 px.</strong> ${esc(o.verdict16)}</div>
</section>`;
}

function paletteSection() {
  const rows = apps.map((a) => {
    const d = APP_DYE[a];
    const hex = dye(d);
    const cr = contrast(hex, PAPER);
    return `<div class="s" style="background:${hex};color:${PAPER}"><strong>${esc(appName[a])}</strong><br>${DYES[d].en}<br><span style="opacity:.8">${DYES[d].sa}</span><br><code style="background:transparent;color:inherit;padding:0">${hex}</code><br><span style="opacity:.8">${cr.toFixed(1)}:1 on paper</span></div>`;
  });
  return `<div class="pal">${rows.join("")}</div>`;
}

function curSection() {
  const mk = (cls, label, inner) => `<div class="sw ${cls}"><span class="lab">${label}</span>${inner}</div>`;
  const marks = BIG.map((s) => `<div class="it">${inline(currentMark(), s, "current mark")}<span class="cap">${s}</span></div>`).join("");
  return `
<section class="opt cur" id="current">
  <span class="num">REFERENCE</span>
  <h2>Current</h2>
  <p class="tagline">${esc(CURRENT.tagline)}</p>
  <div class="sws">${mk("light", "tile mark on white", marks)}${mk("dark", "tile mark on dark", marks)}${mk("paper", "tile mark on paper", marks)}</div>
  <h3>App icons at 96 px</h3>
  <div class="icons">${apps.map((a) => `<figure>${inline(currentIcon(a), 96, appName[a])}<span>${appName[a]}</span></figure>`).join("")}</div>
  <h3>At 48 px and 29 px</h3>
  <div class="icons s48">${apps.map((a) => `<figure>${inline(currentIcon(a), 48, appName[a])}</figure>`).join("")}</div>
  <div style="height:12px"></div>
  <div class="icons s48">${apps.map((a) => `<figure>${inline(currentIcon(a), 29, appName[a])}</figure>`).join("")}</div>
  <h3>Home screen</h3>
  <div class="row2">${phone(CURRENT, "pl")}${phone(CURRENT, "pd")}</div>
</section>`;
}

function compareTable() {
  const rows = options.map((o, i) => `<tr><td><a href="#o${i + 1}">${String(i + 1).padStart(2, "0")} ${esc(o.name)}</a></td><td>${esc(o.cmp?.tile ?? "")}</td><td>${esc(o.cmp?.glyph ?? "")}</td><td>${esc(o.cmp?.small ?? "")}</td><td>${esc(o.cmp?.apps ?? "")}</td><td>${esc(o.cmp?.paper ?? "")}</td><td>${esc(o.cmp?.change ?? "")}</td></tr>`);
  return `<div class="tblwrap"><table><thead><tr><th>Option</th><th>App tile</th><th>Mark</th><th>Small sizes</th><th>App identity</th><th>Paper style</th><th>Distance from today</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

const RECOMMENDATION = `
  <h2>Recommendation</h2>
  <div class="rec">
    <ol>
      <li><strong>05 Devanagari.</strong> It is the only option whose idea is the meaning of the word: the headline bar is the thread, the letter hangs from it, and the icons hang their pictograms from the same bar. It is the strongest mark at 16 px (the favicon reads as a letter, not a smudge), it is one weight and two kinds of stroke, and the paper style suits it exactly (ink bar, ink letter). The icon system is distinctive but still plain: the pictogram stays large enough to read at 29 px. <em>Condition:</em> the glyph is an abstraction of स, not the exact letter, so ask a Devanagari reader to look at the proportions (box, diagonal, bar overhang) before it ships; the bar-and-hanger icon frame works even if the letter is later changed.</li>
      <li><strong>04 Aphorism.</strong> The safest strong choice: one line language for the whole suite, the cleanest monoline mark, every dye clears 3:1 on kohl, and the kohl tile is the paper style turned into an icon. Pick it over Devanagari if you want a mark that needs no explanation for anyone, at the cost of a darker home screen and a mark that can read as a stylised S.</li>
    </ol>
    <p>Honourable mentions. <strong>01 Bead</strong> has the loveliest icon row (the necklace) but the weakest mark. <strong>03 Stitch</strong> and <strong>02 Loom</strong> are the most characterful but need the most care at small sizes. <strong>06 Spool</strong> is the lowest-risk, lowest-effort fallback.</p>
  </div>
  <h3>How we would roll it out</h3>
  <ol>
    <li><code>packages/ui/src/assets/brand.tsx</code>: replace <code>THREAD_PATH</code>, <code>THREAD_LOOP</code>, <code>THREAD_BEAD</code>, <code>THREAD_LOOK</code> and <code>THREAD_PAINT</code> with the chosen glyph geometry (64 box, from <code>build.mjs</code>; change the viewBox to <code>0 0 64 64</code>). Keep the <code>SutraMark</code> variant names and props: <code>glyph</code> is the mark in <code>currentColor</code> plus the accent; <code>tile</code> becomes a flat <code>--primary</code> tile with a <code>--primary-foreground</code> glyph (no gradient, no shine, no inner border); <code>solid</code> keeps following the paper style; <code>outline</code> and <code>badge</code> frame the new glyph. Delete the two <code>linearGradient</code> blocks and the ids they needed.</li>
    <li><code>SutraAppIcon</code>: in <code>sutraAppMeta</code> replace the <code>from</code> / <code>to</code> gradient pair with one <code>dye</code> (and a <code>soft</code> tone for the bar or hem), swap <code>appGlyphs</code> for the shared 24-box pictograms in <code>build.mjs</code>, and drop the shine, the wave and the inner hairline. The <code>shape</code> prop (rounded, squircle, circle) stays.</li>
    <li><code>SutraWordmark</code>: ship the drawn <code>sutra</code> path wordmark (<code>wordmarkPath</code> in <code>build.mjs</code>) beside the Geist text one, so the lockup no longer depends on a webfont, and retire the <code>gradient</code> prop. <code>SutraLogo</code> keeps its layouts and sizes.</li>
    <li>Tokens: <code>data-app</code> retunes the brand scale per app (<code>--app-from</code> / <code>--app-to</code>); point those at the eight dyes and set the accent for the paper style to ink as it is today.</li>
    <li>Favicon and app icons: copy the option's <code>favicon.svg</code> to <code>apps/playground/public/favicon.svg</code> and add a <code>rel="icon"</code> link in <code>apps/playground/index.html</code>; export 180, 192 and 512 px PNGs from <code>app-icons/sutra.svg</code> as full-bleed squares (the platform rounds the corners).</li>
    <li>Update the playground Assets page and any brand tests or snapshots (the API snapshot only changes if exports change), then add a short Brand section to the root <code>README.md</code>: the mark variants, the dye table, minimum size (16 px favicon, 24 px mark) and clear space (one stroke width).</li>
  </ol>
`;

function page() {
  const nav = options.map((o, i) => `<a href="#o${i + 1}">${String(i + 1).padStart(2, "0")} ${esc(o.name)}</a>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Sutra: logo and app icon options</title>
<style>${CSS}</style></head><body>
<header class="top"><span class="brand">sutra / brand options</span><nav class="chips"><a href="#compare">Compare</a><a href="#current">Current</a>${nav}<a href="#recommendation">Pick</a></nav><button class="tg" id="tg" type="button">Auto</button></header>
<main>
<h1>Six directions for the Sutra mark and app icons</h1>
<p class="lede">Sutra (sūtra) means thread, the cord on which beads are strung, and also a terse rule, short statements strung into a discourse. It shares a root with sew, suture and seam. Every option below is drawn flat (no gradients, no shadows, no gloss), starts monochrome, and is generated by <code>build.mjs</code>. Scroll the table sideways on a phone.</p>
<h3 id="compare">Comparison</h3>
${compareTable()}
${curSection()}
<h3>The eight dyes (shared by every option)</h3>
<p class="lede">Natural textile dyes: indigo (nila), madder red (manjistha), turmeric (haldi), saffron (kesar), pomegranate (anar), lac (laksha), henna green (mehendi), kohl (kajal). Similar chroma and lightness, and a paper-coloured glyph on each tile reaches at least 3:1 (lowest: turmeric at 3.4:1).</p>
${paletteSection()}
${options.map(optionSection).join("\n")}
<section class="opt" id="recommendation">
  <span class="num">RECOMMENDATION</span>
  ${RECOMMENDATION}
</section>
</main>
<script>
(function(){
  var r=document.documentElement,b=document.getElementById('tg'),m=['auto','light','dark'],i=0;
  try{var s=localStorage.getItem('sutra-brand-theme');if(s&&m.indexOf(s)>0)i=m.indexOf(s)}catch(e){}
  function ap(){if(m[i]==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',m[i]);b.textContent=m[i][0].toUpperCase()+m[i].slice(1)}
  ap();b.addEventListener('click',function(){i=(i+1)%3;ap();try{localStorage.setItem('sutra-brand-theme',m[i])}catch(e){}});
  document.querySelectorAll('canvas[data-src]').forEach(function(c){
    var px=+c.dataset.px,img=new Image();img.onload=function(){
      var t=document.createElement('canvas');t.width=px;t.height=px;var x=t.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,px,px);x.drawImage(img,0,0,px,px);
      var d=c.getContext('2d');d.imageSmoothingEnabled=false;d.drawImage(t,0,0,c.width,c.height)};img.src=c.dataset.src});
})();
</script>
</body></html>
`;
}

export function build() {
  writeFiles();
  writeFileSync(join(HERE, "index.html"), page());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build();
  console.log(`wrote ${options.length} options to ${HERE}`);
}
