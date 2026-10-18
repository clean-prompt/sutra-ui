/* Shared numeric helpers. Pure; never throw on bad input. */

/** Rounding strategy shared by the formatters. */
export type RoundingMode = "floor" | "ceil" | "round" | "trunc";

/** Constrains `n` to `[min, max]` (NaN → `min`; swapped bounds are tolerated). */
export function clamp(n: number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (Number.isNaN(n)) return lo;
  return Math.min(Math.max(n, lo), hi);
}

/** Rounds `n` to `decimals` places, half away from zero, without float artefacts (`1.005` → `1.01`). */
export function roundTo(n: number, decimals = 0, mode: RoundingMode = "round"): number {
  if (!Number.isFinite(n) || Number.isInteger(n)) return n + 0;
  const d = Number.isFinite(decimals) ? Math.max(0, Math.min(20, Math.trunc(decimals))) : 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const fn =
    mode === "floor"
      ? sign < 0
        ? Math.ceil
        : Math.floor
      : mode === "ceil"
        ? sign < 0
          ? Math.floor
          : Math.ceil
        : mode === "trunc"
          ? Math.trunc
          : Math.round;
  // Shift via the exponent so 1.005 stays 1.005 (not 1.00499…) before rounding.
  const shifted = Number(`${abs}e${d}`);
  if (Number.isFinite(shifted)) {
    const back = Number(`${fn(shifted)}e-${d}`);
    if (Number.isFinite(back)) return sign * back + 0;
  }
  const f = 10 ** d;
  return (sign * fn(abs * f)) / f + 0;
}

/** Position of `value` between `min` and `max` as a percentage, clamped to 0–100 (0 for an empty range or NaN). */
export function toPercent(value: number, max: number, min = 0): number {
  const range = max - min;
  if (!Number.isFinite(range) || range <= 0 || !Number.isFinite(value)) {
    if (value === Infinity && range > 0) return 100;
    return 0;
  }
  return clamp(((value - min) / range) * 100, 0, 100);
}
