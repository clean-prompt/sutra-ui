/**
 * Drawn monogram glyphs for `IdentityAvatar` (internal): capitals and digits as round-capped monoline centrelines, in the manner
 * of the drawn `sutra` wordmark. Cap height 20 (y down, baseline at 20); each glyph is `[advance width, path]`. Letters outside
 * this set (accented capitals are reduced to their base letter first, other scripts are not) make the avatar fall back to text.
 */

/** `[width, centreline path]` for each drawn character. */
export const MONOGRAM_GLYPHS: Readonly<Record<string, readonly [number, string]>> = {
  A: [16, "M0 20L8 0L16 20M2.96 12.6H13.04"],
  B: [12.2, "M0 0V20M0 0H6.3A4.85 4.85 0 0 1 6.3 9.7H0M0 9.7H7A5.15 5.15 0 0 1 7 20H0"],
  C: [17.8, "M17.8 3.75A10 10 0 1 0 17.8 16.25"],
  D: [15, "M0 0V20M0 0H5A10 10 0 0 1 5 20H0"],
  E: [11, "M11 0H0V20H11M0 10H9.4"],
  F: [11, "M11 0H0V20M0 10H9.4"],
  G: [20, "M17.8 3.75A10 10 0 1 0 20 10H12"],
  H: [14, "M0 0V20M14 0V20M0 10H14"],
  I: [0, "M0 0V20"],
  J: [11, "M11 0V14A5.5 5.5 0 0 1 0 14"],
  K: [13.4, "M0 0V20M13 0L0 12.6M4.6 8.14L13.4 20"],
  L: [11, "M0 0V20H11"],
  M: [18, "M0 20V0L9 13L18 0V20"],
  N: [15, "M0 20V0L15 20V0"],
  O: [20, "M0 10A10 10 0 1 0 20 10A10 10 0 1 0 0 10"],
  P: [12, "M0 20V0H6.5A5.5 5.5 0 0 1 6.5 11H0"],
  Q: [20.6, "M0 10A10 10 0 1 0 20 10A10 10 0 1 0 0 10M13.4 13.4L20.6 20.6"],
  R: [13, "M0 20V0H6.5A5.5 5.5 0 0 1 6.5 11H0M6.6 11L13 20"],
  S: [10, "M8.83 1.79A5 5 0 1 0 5 10A5 5 0 1 1 1.17 18.21"],
  T: [16, "M0 0H16M8 0V20"],
  U: [14, "M0 0V13A7 7 0 0 0 14 13V0"],
  V: [16, "M0 0L8 20L16 0"],
  W: [22, "M0 0L5.5 20L11 4L16.5 20L22 0"],
  X: [15, "M0 0L15 20M15 0L0 20"],
  Y: [16, "M0 0L8 10L16 0M8 10V20"],
  Z: [14, "M0 0H14L0 20H14"],
  "0": [12, "M0 10A6 10 0 1 0 12 10A6 10 0 1 0 0 10"],
  "1": [5.2, "M0 4.2L5.2 0V20"],
  "2": [12, "M0.6 4.8A5.6 5.3 0 0 1 11.6 5.8C11.6 9.6 7.4 11.8 0.4 20H12"],
  "3": [11.8, "M1 2.2C2.6 0.8 4.2 0 6.2 0C9 0 11 1.8 11 4.6S9 9.4 5.6 9.4C9.4 9.4 11.8 11.6 11.8 14.6C11.8 18 9.2 20 6 20C3.8 20 1.8 19.2 0.4 17.6"],
  "4": [12.6, "M9 20V0L0 14H12.6"],
  "5": [11.8, "M11 0H1.4L0.6 9C2 8.2 3.8 7.8 5.6 7.8C9.2 7.8 11.8 10.4 11.8 13.9C11.8 17.6 9.2 20 5.8 20C3.6 20 1.6 19.2 0.2 17.6"],
  "6": [12, "M10.4 0.8C9.2 0.3 7.9 0 6.6 0C2.8 0 0 3.6 0 10.6C0 16.4 2.6 20 6.2 20C9.6 20 12 17.4 12 13.8C12 10.2 9.6 7.8 6.4 7.8C3.6 7.8 1.2 9.6 0.2 12.4"],
  "7": [12, "M0 0H12L4 20"],
  "8": [11.4, "M5.7 9.2A4.6 4.6 0 1 1 5.7 0A4.6 4.6 0 1 1 5.7 9.2ZM5.7 9.2A5.4 5.4 0 1 0 5.7 20A5.4 5.4 0 1 0 5.7 9.2Z"],
  "9": [12, "M1.6 19.2C2.8 19.7 4.1 20 5.4 20C9.2 20 12 16.4 12 9.4C12 3.6 9.4 0 5.8 0C2.4 0 0 2.6 0 6.2C0 9.8 2.4 12.2 5.6 12.2C8.4 12.2 10.8 10.4 11.8 7.6"],
};

/** Space between two glyphs, centreline to centreline (glyph units). */
const GLYPH_GAP = 6.4;

/** The text with accents removed and upper-cased, as the drawn glyphs are keyed. */
export function glyphKey(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

/** True when every character of `text` has a drawn glyph (otherwise the avatar sets the initials as text). */
export function canDrawMonogram(text: string): boolean {
  const key = glyphKey(text);
  return key.length > 0 && [...key].every((c) => MONOGRAM_GLYPHS[c] !== undefined);
}

export interface MonogramLayout {
  /** One centreline path per glyph, offset along x in glyph units. */
  glyphs: { d: string; x: number }[];
  /** Scale from glyph units to the avatar's pixel box. */
  scale: number;
  /** Top-left corner of the monogram in the pixel box. */
  x: number;
  y: number;
  /** Stroke width in glyph units (so it renders at the wanted pixel width after `scale`). */
  strokeWidth: number;
}

/**
 * Lays out a drawn monogram centred at (`cx`, `cy`) in a box of `size` pixels: a cap height of `capPx` pixels (shrunk to fit
 * `maxWidth`), with a stroke that is a little heavier at small sizes so the letters hold up at 20 px.
 */
export function layoutMonogram(text: string, size: number, opts: { cx: number; cy: number; capPx: number; maxWidth: number }): MonogramLayout {
  const chars = [...glyphKey(text)].filter((c) => MONOGRAM_GLYPHS[c] !== undefined);
  let total = 0;
  const glyphs = chars.map((c, i) => {
    const [w, d] = MONOGRAM_GLYPHS[c]!;
    const x = total + (i ? GLYPH_GAP : 0);
    total = x + w;
    return { d, x };
  });
  let scale = opts.capPx / 20;
  if (total * scale > opts.maxWidth) scale = opts.maxWidth / total;
  const strokePx = 0.028 * size + 1;
  return {
    glyphs,
    scale,
    x: opts.cx - (total * scale) / 2,
    y: opts.cy - 10 * scale,
    strokeWidth: strokePx / scale,
  };
}
