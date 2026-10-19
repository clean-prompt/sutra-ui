/* Pure logic for `PanSurface`: how far centred content may travel, what the keys and the wheel mean. No DOM, no React. */
import { clamp } from "./math";

/** Width and height of a pan surface or its viewport, in px. */
export interface PanSize {
  width: number;
  height: number;
}

/** How far a pan surface may move in each direction, in px. */
export interface PanLimits {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** How far (px) content of `content` px, scaled by `scale` and centred in `viewport` px, may move either way before its edge shows inside the viewport. 0 when it fits. */
export function panLimit(content: number, viewport: number, scale = 1): number {
  return Math.max(0, (content * scale - viewport) / 2);
}

/**
 * The bounds of the offset for content centred in a viewport: symmetric, so right-to-left text needs no mirroring. `null` while
 * either size is unmeasured (0), so an unmeasured surface is free to move instead of locked.
 */
export function panBounds(content: PanSize, viewport: PanSize, scale = 1): PanLimits | null {
  if (content.width <= 0 || content.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return null;
  const x = panLimit(content.width, viewport.width, scale);
  const y = panLimit(content.height, viewport.height, scale);
  return { left: -x, right: x, top: -y, bottom: y };
}

/**
 * The resting offset ("home") of content in its viewport: `"center"` is 0, 0; `"start"` lines the content's inline-start and top
 * edges up with the viewport's (the left edge in left-to-right text, the right edge in right-to-left), which is where a board
 * or a document begins. Content that fits stays centred, and so does unmeasured content (no limits).
 */
export function panHome(limits: PanLimits | null, home: "center" | "start", dir: "ltr" | "rtl" = "ltr"): { x: number; y: number } {
  if (!limits || home === "center") return { x: 0, y: 0 };
  return { x: dir === "rtl" ? limits.left : limits.right, y: limits.bottom };
}

/** Clamps an offset into the bounds (no bounds: unchanged). */
export function clampPan(x: number, y: number, bounds: PanLimits | null): { x: number; y: number } {
  if (!bounds) return { x, y };
  return { x: clamp(x, bounds.left, bounds.right), y: clamp(y, bounds.top, bounds.bottom) };
}

/** Px per line of a `deltaMode` 1 wheel. */
export const WHEEL_LINE_PX = 16;

/** A wheel event as px of travel (lines and pages converted; Shift turns a vertical wheel into a horizontal one when there is no sideways delta). */
export function wheelDelta(e: { deltaX: number; deltaY: number; deltaMode: number; shiftKey?: boolean }, viewport: PanSize): { dx: number; dy: number } {
  const unit = e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? viewport.height || 400 : 1;
  let dx = e.deltaX * unit;
  let dy = e.deltaY * unit;
  if (e.shiftKey && dx === 0) [dx, dy] = [dy, 0];
  return { dx, dy };
}

/** What a key does on a pan surface: pan by an offset, recentre, or zoom in or out. */
export type PanKeyAction =
  | { type: "pan"; dx: number; dy: number }
  | { type: "recenter" }
  | { type: "zoom"; direction: 1 | -1 }
  | { type: "zoom-reset" };

/**
 * What a key does. `dx` and `dy` are how far the content moves in px (the view goes the way the arrow points, so the content
 * moves the other way): arrows by `step` (four times that with Shift), Page Up and Down by 80% of the viewport height, Home
 * recenters; with `zoom`, `+`, `-` and `0` zoom in, out and reset. Anything else is `null`.
 */
export function panKeyAction(key: string, { step = 48, viewportHeight = 0, shift = false, zoom = false }: { step?: number; viewportHeight?: number; shift?: boolean; zoom?: boolean } = {}): PanKeyAction | null {
  const s = shift ? step * 4 : step;
  switch (key) {
    case "ArrowRight":
      return { type: "pan", dx: -s, dy: 0 };
    case "ArrowLeft":
      return { type: "pan", dx: s, dy: 0 };
    case "ArrowDown":
      return { type: "pan", dx: 0, dy: -s };
    case "ArrowUp":
      return { type: "pan", dx: 0, dy: s };
    case "PageDown":
      return { type: "pan", dx: 0, dy: -Math.round((viewportHeight || 400) * 0.8) };
    case "PageUp":
      return { type: "pan", dx: 0, dy: Math.round((viewportHeight || 400) * 0.8) };
    case "Home":
      return { type: "recenter" };
    case "+":
    case "=":
      return zoom ? { type: "zoom", direction: 1 } : null;
    case "-":
    case "_":
      return zoom ? { type: "zoom", direction: -1 } : null;
    case "0":
      return zoom ? { type: "zoom-reset" } : null;
    default:
      return null;
  }
}

/** Whether moving by (dx, dy) from (x, y) would change anything inside the bounds (a wheel that cannot move the surface is left to the page). */
export function canPan(x: number, y: number, dx: number, dy: number, bounds: PanLimits | null): boolean {
  const next = clampPan(x + dx, y + dy, bounds);
  return next.x !== x || next.y !== y;
}
