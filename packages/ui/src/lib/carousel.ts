/** Pure helpers for `Carousel`: which slide is showing, and where the arrows lead. */

/** The slide that shows most: the highest intersection ratio, the lowest index on a tie; `-1` when none is visible. */
export function activeSlide(ratios: readonly number[]): number {
  let best = -1;
  let max = 0;
  ratios.forEach((ratio, i) => {
    if (ratio > max) {
      max = ratio;
      best = i;
    }
  });
  return best;
}

/** The slide a step from `index` leads to. At an end it stays (`loop` false) or rewinds to the other end (`loop` true). */
export function stepSlide(index: number, count: number, dir: 1 | -1, loop: boolean): number {
  if (count <= 0) return 0;
  const next = index + dir;
  if (next >= 0 && next < count) return next;
  return loop ? (dir === 1 ? 0 : count - 1) : Math.min(count - 1, Math.max(0, index));
}

/** Milliseconds per slide of an `autoplay` prop: `true` is 5 s, a number is taken as given (at least 1 s), anything else is off (0). */
export function autoplayInterval(autoplay: boolean | number | undefined): number {
  if (autoplay === true) return 5000;
  return typeof autoplay === "number" && autoplay > 0 ? Math.max(1000, autoplay) : 0;
}
