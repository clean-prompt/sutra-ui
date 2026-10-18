import * as React from "react";
import { useControllableState } from "./use-controllable-state";
import { useLatestRef } from "./use-iso-layout-effect";

/* ------------------------------------------------------------------ */
/* Geometry (pure)                                                     */
/* ------------------------------------------------------------------ */

export interface MarqueePoint {
  x: number;
  y: number;
}

/** An axis-aligned rectangle with both size and edges, like a `DOMRect`. */
export interface MarqueeRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** The rectangle spanned by two corner points, in either drag direction. */
export function rectFromPoints(a: MarqueePoint, b: MarqueePoint): MarqueeRect {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

type Edges = Pick<MarqueeRect, "left" | "top" | "right" | "bottom">;

/** True when two rectangles overlap or touch. Rectangles with a NaN edge never intersect. */
export function rectsIntersect(a: Edges, b: Edges): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

/** True when `inner` lies entirely inside `outer` (edges may touch). */
export function rectContains(outer: Edges, inner: Edges): boolean {
  return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
}

/** Shifts a rectangle by `dx`, `dy`. */
export function offsetRect(r: Edges, dx: number, dy: number): MarqueeRect {
  const left = r.left + dx;
  const top = r.top + dy;
  const right = r.right + dx;
  const bottom = r.bottom + dy;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/** How a drag combines with the selection it started from. */
export type MarqueeOperation = "replace" | "add" | "toggle";

/** The selection after a drag that hits `hits`, starting from `base`. Keeps `base` order, then hit order. */
export function combineSelection(base: readonly string[], hits: readonly string[], operation: MarqueeOperation): string[] {
  if (operation === "replace") return [...new Set(hits)];
  const hitSet = new Set(hits);
  if (operation === "add") return [...new Set([...base, ...hits])];
  const baseSet = new Set(base);
  return [...base.filter((id) => !hitSet.has(id)), ...[...hitSet].filter((id) => !baseSet.has(id))];
}

/**
 * Auto-scroll speed (px per frame) for a pointer at `pos` inside a viewport spanning `min`..`max`: negative near
 * `min`, positive near `max`, growing to `speed` at (and beyond) the edge, 0 in the middle.
 */
export function autoScrollDelta(pos: number, min: number, max: number, edge = 32, speed = 16): number {
  const size = max - min;
  if (!(size > 0) || !(edge > 0) || !Number.isFinite(pos)) return 0;
  const zone = Math.min(edge, size / 4);
  if (pos < min + zone) return -Math.round(speed * Math.min(1, (min + zone - pos) / zone));
  if (pos > max - zone) return Math.round(speed * Math.min(1, (pos - (max - zone)) / zone));
  return 0;
}

function sameIds(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export interface MarqueeItem {
  id: string;
  element: Element | null | undefined;
}

/** Elements a marquee never starts on (on top of the items themselves). */
export const MARQUEE_IGNORE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='menuitem']",
  "[role='slider']",
  "[role='switch']",
  "[role='tab']",
  "[draggable='true']",
  "[data-marquee-ignore]",
].join(", ");

export interface UseMarqueeSelectionOptions {
  /** The scrollable (or static) element the marquee is drawn in. Give it `position: relative` to render `box`. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** CSS selector for selectable items inside the container. Default `[data-selection-id]`. */
  itemSelector?: string;
  /** Reads an item's id. Default: its `data-selection-id`, else its `id`. */
  getItemId?: (element: Element) => string | null | undefined;
  /** Supplies the items directly (wins over `itemSelector`), e.g. `files.map(f => ({ id, element: byId(id) }))`. */
  getItems?: () => Iterable<MarqueeItem>;
  /** Selected ids (controlled). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Whether an item must touch (`intersect`, default) or lie fully inside (`contain`) the marquee. */
  mode?: "intersect" | "contain";
  /** Pointer travel in px before a press becomes a marquee (so clicks stay clicks). Default 4. */
  threshold?: number;
  /** Scroll the container while dragging near its edges. `edge` is the zone in px, `speed` the max px per frame. */
  autoScroll?: boolean | { edge?: number; speed?: number };
  /** A plain click on empty space clears the selection. Default true. */
  clearOnClick?: boolean;
  /** Extra selector for elements a drag must not start on (added to `MARQUEE_IGNORE_SELECTOR`). */
  ignoreSelector?: string;
  /** Start marquees from touch too. Off by default so touch drags keep scrolling; set `touch-action: none` when on. */
  touch?: boolean;
  disabled?: boolean;
}

export interface UseMarqueeSelectionResult {
  /** Selected ids. */
  value: string[];
  setValue: (next: string[] | ((prev: string[]) => string[])) => void;
  /** The marquee in the container's content coordinates (for an absolutely positioned overlay), or null. */
  box: MarqueeRect | null;
  /** True while a marquee is being dragged. */
  selecting: boolean;
  /** Ends the current drag and restores the selection it started from. */
  cancel: () => void;
}

interface Session {
  pointerId: number;
  start: MarqueePoint;
  client: MarqueePoint;
  base: string[];
  operation: MarqueeOperation;
  started: boolean;
  frame: number | null;
  teardown: () => void;
}

const defaultGetItemId = (el: Element) => el.getAttribute("data-selection-id") ?? (el.id || null);

const raf = (cb: () => void): number =>
  typeof requestAnimationFrame === "function" ? requestAnimationFrame(cb) : (setTimeout(cb, 16) as unknown as number);
const caf = (id: number) => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id));

/** Converts a client point to the container's content coordinates (what an absolute child inside it uses). */
function toContent(el: HTMLElement, x: number, y: number): MarqueePoint {
  const r = el.getBoundingClientRect();
  return { x: x - r.left - el.clientLeft + el.scrollLeft, y: y - r.top - el.clientTop + el.scrollTop };
}

/**
 * Rubber-band selection: drag on empty space inside `containerRef` to draw a rectangle and select the items it
 * touches. Shift-drag adds to the selection, Mod-drag (⌘ / Ctrl) toggles, a plain click on empty space clears, and
 * dragging near the edges scrolls the container. Presses on items or interactive elements are left alone, so item
 * clicks and drag-and-drop keep working.
 */
export function useMarqueeSelection(options: UseMarqueeSelectionOptions): UseMarqueeSelectionResult {
  const { containerRef, value: valueProp, defaultValue, onValueChange, disabled = false } = options;
  const [value, setValue] = useControllableState<string[]>({
    value: valueProp,
    defaultValue: defaultValue ?? [],
    onChange: onValueChange,
  });
  const [box, setBox] = React.useState<MarqueeRect | null>(null);
  const optionsRef = useLatestRef(options);
  const valueRef = useLatestRef(value);
  const sessionRef = React.useRef<Session | null>(null);

  const collectItems = React.useCallback((): MarqueeItem[] => {
    const o = optionsRef.current;
    const el = o.containerRef.current;
    if (o.getItems) return Array.from(o.getItems());
    if (!el) return [];
    const getId = o.getItemId ?? defaultGetItemId;
    const out: MarqueeItem[] = [];
    el.querySelectorAll(o.itemSelector ?? "[data-selection-id]").forEach((node) => {
      const id = getId(node);
      if (id != null && id !== "") out.push({ id: String(id), element: node });
    });
    return out;
  }, [optionsRef]);

  const endSession = React.useCallback((restore: boolean) => {
    const s = sessionRef.current;
    if (!s) return;
    sessionRef.current = null;
    s.teardown();
    if (s.frame != null) caf(s.frame);
    setBox(null);
    if (restore && s.started) setValue(s.base);
  }, [setValue]);

  /** Recomputes the marquee and the selection from the session's last pointer position. */
  const update = React.useCallback(() => {
    const s = sessionRef.current;
    const el = optionsRef.current.containerRef.current;
    if (!s || !s.started || !el) return;
    const o = optionsRef.current;
    const current = toContent(el, s.client.x, s.client.y);
    const maxX = Math.max(el.scrollWidth, el.clientWidth);
    const maxY = Math.max(el.scrollHeight, el.clientHeight);
    const clampX = (n: number) => (maxX > 0 ? Math.min(Math.max(n, 0), maxX) : n);
    const clampY = (n: number) => (maxY > 0 ? Math.min(Math.max(n, 0), maxY) : n);
    const rect = rectFromPoints(
      { x: clampX(s.start.x), y: clampY(s.start.y) },
      { x: clampX(current.x), y: clampY(current.y) }
    );
    setBox((prev) =>
      prev && prev.left === rect.left && prev.top === rect.top && prev.width === rect.width && prev.height === rect.height
        ? prev
        : rect
    );
    // Back to client coordinates for hit-testing against item rects.
    const r = el.getBoundingClientRect();
    const clientRect = offsetRect(rect, r.left + el.clientLeft - el.scrollLeft, r.top + el.clientTop - el.scrollTop);
    const test = o.mode === "contain" ? rectContains : rectsIntersect;
    const hits: string[] = [];
    for (const item of collectItems()) {
      if (!item.element) continue;
      if (test(clientRect, item.element.getBoundingClientRect())) hits.push(item.id);
    }
    const next = combineSelection(s.base, hits, s.operation);
    if (!sameIds(next, valueRef.current)) setValue(next);
  }, [collectItems, optionsRef, setValue, valueRef]);

  const tick = React.useCallback(() => {
    const s = sessionRef.current;
    const el = optionsRef.current.containerRef.current;
    if (!s || !el) return;
    s.frame = null;
    const auto = optionsRef.current.autoScroll ?? true;
    if (auto === false) return;
    const { edge = 32, speed = 16 } = typeof auto === "object" ? auto : {};
    const r = el.getBoundingClientRect();
    const left = r.left + el.clientLeft;
    const top = r.top + el.clientTop;
    const dx = el.scrollWidth > el.clientWidth ? autoScrollDelta(s.client.x, left, left + el.clientWidth, edge, speed) : 0;
    const dy = el.scrollHeight > el.clientHeight ? autoScrollDelta(s.client.y, top, top + el.clientHeight, edge, speed) : 0;
    if (dx || dy) {
      el.scrollLeft += dx;
      el.scrollTop += dy;
      update();
    }
    s.frame = raf(tick);
  }, [optionsRef, update]);

  const onPointerDown = React.useCallback(
    (event: PointerEvent) => {
      const o = optionsRef.current;
      const el = o.containerRef.current;
      if (!el || o.disabled || sessionRef.current) return;
      if (event.button !== 0) return;
      if (event.pointerType === "touch" && !o.touch) return;
      const target = event.target as Element | null;
      if (!target || !el.contains(target)) return;
      const ignore = o.ignoreSelector ? `${MARQUEE_IGNORE_SELECTOR}, ${o.ignoreSelector}` : MARQUEE_IGNORE_SELECTOR;
      const blocked = target.closest(ignore);
      if (blocked && blocked !== el && el.contains(blocked)) return;
      if (o.getItems) {
        for (const item of o.getItems()) if (item.element?.contains(target)) return;
      } else {
        const item = target.closest(o.itemSelector ?? "[data-selection-id]");
        if (item && item !== el && el.contains(item)) return;
      }
      // Presses on the container's own scrollbar scroll, they don't select.
      const r = el.getBoundingClientRect();
      const barX = el.offsetWidth - el.clientWidth - el.clientLeft * 2;
      const barY = el.offsetHeight - el.clientHeight - el.clientTop * 2;
      if (barX > 0 && event.clientX >= r.left + el.clientLeft + el.clientWidth) return;
      if (barY > 0 && event.clientY >= r.top + el.clientTop + el.clientHeight) return;

      const operation: MarqueeOperation = event.metaKey || event.ctrlKey ? "toggle" : event.shiftKey ? "add" : "replace";
      const threshold = Math.max(0, o.threshold ?? 4);
      const origin = { x: event.clientX, y: event.clientY };

      const move = (e: PointerEvent) => {
        const s = sessionRef.current;
        if (!s || e.pointerId !== s.pointerId) return;
        s.client = { x: e.clientX, y: e.clientY };
        if (!s.started) {
          if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < threshold) return;
          s.started = true;
          window.getSelection?.()?.removeAllRanges();
          s.frame = raf(tick);
        }
        e.preventDefault();
        update();
      };
      const up = (e: PointerEvent) => {
        const s = sessionRef.current;
        if (!s || e.pointerId !== s.pointerId) return;
        const wasClick = !s.started;
        endSession(false);
        const latest = optionsRef.current;
        if (wasClick && s.operation === "replace" && (latest.clearOnClick ?? true) && valueRef.current.length > 0) {
          setValue([]);
        }
      };
      const cancel = (e: PointerEvent) => {
        if (sessionRef.current && e.pointerId === sessionRef.current.pointerId) endSession(true);
      };
      const key = (e: KeyboardEvent) => {
        if (e.key === "Escape" && sessionRef.current?.started) {
          e.preventDefault();
          e.stopPropagation();
          endSession(true);
        }
      };
      const scroll = () => update();
      const noSelect = (e: Event) => {
        if (sessionRef.current?.started) e.preventDefault();
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", key, true);
      window.addEventListener("scroll", scroll, true);
      document.addEventListener("selectstart", noSelect);
      sessionRef.current = {
        pointerId: event.pointerId,
        start: toContent(el, event.clientX, event.clientY),
        client: origin,
        base: [...valueRef.current],
        operation,
        started: threshold === 0,
        frame: null,
        teardown: () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", cancel);
          window.removeEventListener("keydown", key, true);
          window.removeEventListener("scroll", scroll, true);
          document.removeEventListener("selectstart", noSelect);
        },
      };
      if (threshold === 0) {
        sessionRef.current.frame = raf(tick);
        update();
      }
    },
    [endSession, optionsRef, setValue, tick, update, valueRef]
  );

  // Follow the container element (it may mount later or be swapped) without tearing down a drag in progress.
  const attachedRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    const el = disabled ? null : containerRef.current;
    if (el === attachedRef.current) return;
    attachedRef.current?.removeEventListener("pointerdown", onPointerDown);
    el?.addEventListener("pointerdown", onPointerDown);
    attachedRef.current = el;
  });
  React.useEffect(
    () => () => {
      attachedRef.current?.removeEventListener("pointerdown", onPointerDown);
      attachedRef.current = null;
      endSession(false);
    },
    [endSession, onPointerDown]
  );
  React.useEffect(() => {
    if (disabled) endSession(true);
  }, [disabled, endSession]);

  const cancel = React.useCallback(() => endSession(true), [endSession]);

  return { value, setValue, box, selecting: box !== null, cancel };
}
