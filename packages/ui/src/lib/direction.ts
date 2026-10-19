/** Reading direction helpers. Pure and SSR-safe; the React side is `hooks/use-direction`. */

export type Direction = "ltr" | "rtl";

/** `"rtl"` for the string `"rtl"` (any case), else `"ltr"`. */
export function normalizeDirection(value: unknown): Direction {
  return typeof value === "string" && value.trim().toLowerCase() === "rtl" ? "rtl" : "ltr";
}

/** `1` in left-to-right, `-1` in right-to-left: multiplies a logical (start to end) distance into a physical x offset. */
export function inlineSign(dir: Direction): 1 | -1 {
  return dir === "rtl" ? -1 : 1;
}

/** Turns a physical x delta (positive = rightwards) into a logical one (positive = towards the inline end). */
export function toLogicalDelta(dx: number, dir: Direction): number {
  return dir === "rtl" ? -dx : dx;
}

/** Turns a logical delta (positive = towards the inline end) into a physical x delta. Same maths, named for the other direction. */
export const toPhysicalDelta = toLogicalDelta;

/** Which side of the line a physical x offset falls on: `"end"` when it moved towards the inline end, `"start"` otherwise. */
export function inlineSide(dx: number, dir: Direction): "start" | "end" {
  return toLogicalDelta(dx, dir) >= 0 ? "end" : "start";
}

/**
 * The step a horizontal arrow key means along the reading direction: `ArrowRight` is +1 in left-to-right and -1 in right-to-left,
 * `ArrowLeft` the opposite; any other key is `0`. Use it for tabs, sliders, segmented controls and rows laid out in a line.
 */
export function inlineKeyStep(key: string, dir: Direction): -1 | 0 | 1 {
  if (key !== "ArrowRight" && key !== "ArrowLeft") return 0;
  const right = key === "ArrowRight";
  return (right ? dir === "ltr" : dir === "rtl") ? 1 : -1;
}

/** The arrow key that moves one step towards the inline end (`"ArrowRight"` in left-to-right). */
export function endArrowKey(dir: Direction): "ArrowLeft" | "ArrowRight" {
  return dir === "rtl" ? "ArrowLeft" : "ArrowRight";
}

/** The arrow key that moves one step towards the inline start (`"ArrowLeft"` in left-to-right). */
export function startArrowKey(dir: Direction): "ArrowLeft" | "ArrowRight" {
  return dir === "rtl" ? "ArrowRight" : "ArrowLeft";
}

/**
 * How far a scroller is scrolled from its inline-start edge, as a positive number. `scrollLeft` is 0 at the start in every
 * modern browser but runs negative towards the end in right-to-left, so the distance is its absolute value there.
 */
export function inlineScrollOffset(scrollLeft: number, dir: Direction): number {
  return dir === "rtl" ? Math.abs(scrollLeft) : scrollLeft;
}

/** Pixels scrolled from the physical left edge of a scroller whose horizontal overflow is `max` (`scrollWidth - clientWidth`). */
export function physicalScrollX(scrollLeft: number, max: number, dir: Direction): number {
  return dir === "rtl" ? max + scrollLeft : scrollLeft;
}

/** The `scrollLeft` that puts a scroller `offset` px from its inline-start edge (the inverse of `inlineScrollOffset`). */
export function scrollLeftForInlineOffset(offset: number, dir: Direction): number {
  return dir === "rtl" ? -offset : offset;
}

/** The `Direction` an element reads: the nearest `dir="ltr|rtl"` ancestor (`auto` falls back to computed style), else the document's. */
export function directionOf(el?: Element | null): Direction {
  if (typeof document === "undefined") return "ltr";
  const holder = (el ?? document.documentElement).closest?.("[dir]") ?? document.documentElement;
  const attr = holder.getAttribute("dir");
  if (attr === "rtl" || attr === "ltr") return attr;
  if (el && typeof getComputedStyle === "function") return normalizeDirection(getComputedStyle(el).direction);
  return "ltr";
}

/**
 * The key a left-to-right user would press for the same move: `ArrowLeft` and `ArrowRight` swap in right-to-left, every other key
 * is returned as is. Lets a handler written for LTR (`key === "ArrowRight"` means "next") work in both directions. The direction is
 * read from the event's `currentTarget` (the nearest `dir`), else the document's.
 */
export function logicalArrow(event: { key: string; currentTarget?: EventTarget | null }): string {
  const { key } = event;
  if (key !== "ArrowLeft" && key !== "ArrowRight") return key;
  const at = typeof Element !== "undefined" && event.currentTarget instanceof Element ? event.currentTarget : null;
  if (directionOf(at) !== "rtl") return key;
  return key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
}
