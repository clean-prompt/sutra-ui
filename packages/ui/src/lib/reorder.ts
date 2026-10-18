/* Array reordering helpers. Pure; indices are clamped. */
import { clamp } from "./math";


/** Returns a copy of `items` with the element at `from` moved to `to` (indices are clamped). */
export function reorderArray<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length) return next;
  const target = clamp(to, 0, next.length - 1);
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** Moves the element at `index` by `delta` positions (negative = up). */
export function reorderBy<T>(items: readonly T[], index: number, delta: number): T[] {
  return reorderArray(items, index, index + delta);
}
