/**
 * The brand's shared constants and the one source of the crescent geometry (internal): the two inks, and the Sutra mark L10, a
 * crescent bead on an upright thread (chosen 2026-10-21). `brand.tsx` draws the mark from `CRESCENT_FINE` and `CRESCENT_BOLD`;
 * the Sutradhar sting draws its bead from `CRESCENT_BEAD`. design/brand/crescent.mjs is the design-time twin of `crescent` (it
 * prints the same strings; `test/assets-review-fixes.test.tsx` pins them).
 */

/** The two inks of the brand: warm near-black on warm paper. Tiles and app icons use them literally so the artwork never shifts with a theme. */
export const INK = "#1c1915";
export const PAPER = "#f7f5f0";

const n = (v: number) => String(+v.toFixed(2));

interface CrescentSpec {
  /** Disc centre (x defaults to the middle of the 64 box). */
  cx?: number;
  cy: number;
  /** Disc radius, and the oval bite's radii. */
  R: number;
  rx: number;
  ry: number;
  /** How far above the disc's centre the bite's centre sits. */
  d: number;
  /** Thread width, and the paper gap round the bead. */
  t: number;
  g: number;
  /** Centres of the thread's round ends. */
  top: number;
  bottom: number;
}

/**
 * The crescent bead (a disc with an oval bite that breaks through its top, so it has two horns) and the thread above and below
 * it (each stops a paper gap short of the bowl), as three filled path strings.
 */
function crescent({ cx = 32, cy, R, rx, ry, d, t, g, top, bottom }: CrescentSpec) {
  const ecy = cy - d;
  /* the horn tips: where the disc and the oval meet, on the upper side (bisection on y) */
  const fn = (y: number) => R * R - (y - cy) ** 2 - rx * rx * (1 - ((y - ecy) / ry) ** 2);
  let lo = ecy - ry;
  let hi = ecy;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (fn(lo) * fn(m) <= 0) hi = m;
    else lo = m;
  }
  const yt = (lo + hi) / 2;
  const h = Math.sqrt(Math.max(0, R * R - (yt - cy) ** 2));
  const bead = `M${n(cx - h)} ${n(yt)}A${n(R)} ${n(R)} 0 1 0 ${n(cx + h)} ${n(yt)}A${n(rx)} ${n(ry)} 0 1 1 ${n(cx - h)} ${n(yt)}Z`;
  const w = t / 2;
  /* the thread above: a round top, and a bottom that follows the bowl's floor a gap g above it (the floor's curvature circle) */
  const rho = (rx * rx) / ry;
  const rc = rho - g;
  const ccy = ecy + ry - rho;
  const yEnd = ccy + Math.sqrt(rc * rc - w * w);
  const above = `M${n(cx - w)} ${n(top)}A${n(w)} ${n(w)} 0 0 1 ${n(cx + w)} ${n(top)}V${n(yEnd)}A${n(rc)} ${n(rc)} 0 0 1 ${n(cx - w)} ${n(yEnd)}Z`;
  /* the thread below: a top that hugs the bead's base a gap g under it, and a round bottom */
  const ro = R + g;
  const yStart = cy + Math.sqrt(ro * ro - w * w);
  const below = `M${n(cx - w)} ${n(yStart)}A${n(ro)} ${n(ro)} 0 0 0 ${n(cx + w)} ${n(yStart)}V${n(bottom)}A${n(w)} ${n(w)} 0 0 1 ${n(cx - w)} ${n(bottom)}Z`;
  return { bead, above, below };
}

/** Fills the height of the 64 box (the glyph). */
const FINE_SPEC: CrescentSpec = { cy: 30.7, R: 17, rx: 8.5, ry: 13, d: 8, t: 4.4, g: 1.8, top: 5.1, bottom: 58.9 };
/** Sits inside a tile with a margin, heavier thread (tiles, favicon, badge). */
const BOLD_SPEC: CrescentSpec = { cy: 30.95, R: 13.6, rx: 6.8, ry: 10.4, d: 6.4, t: 4.6, g: 1.6, top: 10.45, bottom: 53.55 };

export const CRESCENT_FINE = crescent(FINE_SPEC);
export const CRESCENT_BOLD = crescent(BOLD_SPEC);

/** The fine crescent bead centred at the origin, horns up (the sting moves it about and turns it). */
export const CRESCENT_BEAD = crescent({ ...FINE_SPEC, cx: 0, cy: 0 }).bead;
/** The mark's proportions in the 64 box: bead radius, thread width, paper gap, and how far the thread rises above the centre. */
export const MARK = { R: FINE_SPEC.R, t: FINE_SPEC.t, g: FINE_SPEC.g, top: Number((FINE_SPEC.cy - FINE_SPEC.top).toFixed(2)) };
