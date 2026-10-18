/* Breakdown helpers for "by type / by app" charts: keep the biggest parts, fold the rest into "Other",
 * and compute each part's share of the total. Pure; bad values (negative, NaN, ±Infinity) count as 0. */

/** A breakdown value as a finite, non-negative number (anything else becomes 0). */
export function breakdownValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export interface TopWithOtherOptions<T> {
  /** The number each item is ranked by. */
  value: (item: T) => number;
  /** How many items to keep before folding the rest into "Other". Values below 0 count as 0. */
  limit: number;
  /** Builds the "Other" item from the items left over and the sum of their values. */
  other: (rest: T[], total: number) => T;
}

/**
 * The `limit` largest items by value (largest first, ties keep their input order), followed by one
 * "Other" item that summarises the rest. "Other" is left out when nothing is left over.
 */
export function topWithOther<T>(items: readonly T[], options: TopWithOtherOptions<T>): T[] {
  const { value, limit, other } = options;
  const keep = Number.isNaN(limit) ? 0 : Math.max(0, Math.floor(limit));
  const ranked = items
    .map((item, index) => ({ item, index, v: breakdownValue(value(item)) }))
    .sort((a, b) => b.v - a.v || a.index - b.index);
  const top = ranked.slice(0, keep).map((r) => r.item);
  const rest = ranked.slice(keep);
  if (rest.length === 0) return top;
  const total = rest.reduce((sum, r) => sum + r.v, 0);
  return [...top, other(rest.map((r) => r.item), total)];
}

/** Each item with its `share` of the total (0–1). Every share is 0 when the total is 0. */
export function withShares<T extends object>(items: readonly T[], value: (item: T) => number): (T & { share: number })[] {
  const values = items.map((item) => breakdownValue(value(item)));
  const total = values.reduce((sum, v) => sum + v, 0);
  return items.map((item, i) => ({ ...item, share: total > 0 ? values[i]! / total : 0 }));
}

/** A share (0–1) as a whole percent: "46%". Tiny non-zero shares read "<1%" rather than "0%". */
export function formatShare(share: number): string {
  const s = breakdownValue(share);
  if (s > 0 && s < 0.005) return "<1%";
  return `${Math.round(s * 100)}%`;
}
