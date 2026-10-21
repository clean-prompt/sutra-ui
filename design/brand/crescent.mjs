/**
 * The Sutra mark (chosen 2026-10-21: review option L10 "Crescent"): a crescent bead on an upright thread. The bead is a disc
 * with an oval bite that breaks through its top, so it has two sharp horns; the thread comes down through the opening, runs
 * behind the bead's base and on below. Three filled shapes in the 64 box, no masks: the crescent, the thread above (it ends a
 * paper gap above the floor of the bowl) and the thread below (it starts a paper gap under the base).
 *
 * `fine` is the full mark for the bare glyph; `bold` is the same drawing smaller with a heavier thread, for tiles and the
 * favicon. The library draws it from packages/ui/src/assets/brand-internal.ts (the one source of the geometry in the package); this file is
 * the design-time twin and `packages/ui/test/assets-review-fixes.test.tsx` pins both to the same path strings (run
 * `node design/brand/crescent.mjs` to print them).
 */
const n = (v) => String(+(+v).toFixed(2));

/**
 * @param {object} o  cx, cy: disc centre; R: disc radius; rx, ry: the oval bite; d: how far above the disc's centre the bite's
 *                    centre sits; t: thread width; g: paper gap; top, bottom: centres of the thread's round ends.
 */
export function crescent({ cx = 32, cy, R, rx, ry, d, t, g, top, bottom }) {
  const ecy = cy - d;
  // The horn tips: where the disc and the oval meet, on the upper side (bisection on y).
  const f = (y) => R * R - (y - cy) ** 2 - rx * rx * (1 - ((y - ecy) / ry) ** 2);
  let lo = ecy - ry;
  let hi = ecy;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (f(lo) * f(m) <= 0) hi = m;
    else lo = m;
  }
  const yt = (lo + hi) / 2;
  const h = Math.sqrt(Math.max(0, R * R - (yt - cy) ** 2));
  const bead = `M${n(cx - h)} ${n(yt)}A${n(R)} ${n(R)} 0 1 0 ${n(cx + h)} ${n(yt)}A${n(rx)} ${n(ry)} 0 1 1 ${n(cx - h)} ${n(yt)}Z`;

  const w = t / 2;
  // Thread above: a round top, and a bottom that follows the bowl's floor a gap g above it (the floor's curvature circle).
  const rho = (rx * rx) / ry;
  const rc = rho - g;
  const ccy = ecy + ry - rho;
  const yEnd = ccy + Math.sqrt(rc * rc - w * w);
  const above = `M${n(cx - w)} ${n(top)}A${n(w)} ${n(w)} 0 0 1 ${n(cx + w)} ${n(top)}V${n(yEnd)}A${n(rc)} ${n(rc)} 0 0 1 ${n(cx - w)} ${n(yEnd)}Z`;

  // Thread below: a top that hugs the bead's base a gap g under it, and a round bottom.
  const ro = R + g;
  const yStart = cy + Math.sqrt(ro * ro - w * w);
  const below = `M${n(cx - w)} ${n(yStart)}A${n(ro)} ${n(ro)} 0 0 0 ${n(cx + w)} ${n(yStart)}V${n(bottom)}A${n(w)} ${n(w)} 0 0 1 ${n(cx - w)} ${n(bottom)}Z`;

  return { bead, above, below, extent: [top - w, bottom + w] };
}

/** Fills the height of the 64 box (the glyph). */
export const FINE = crescent({ cy: 30.7, R: 17, rx: 8.5, ry: 13, d: 8, t: 4.4, g: 1.8, top: 5.1, bottom: 58.9 });
/** Sits inside a tile with a margin, heavier thread (tiles, favicon, badge). */
export const BOLD = crescent({ cy: 30.95, R: 13.6, rx: 6.8, ry: 10.4, d: 6.4, t: 4.6, g: 1.6, top: 10.45, bottom: 53.55 });

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  console.log(JSON.stringify({ fine: FINE, bold: BOLD }, null, 2));
}
