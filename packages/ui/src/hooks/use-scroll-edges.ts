import * as React from "react";
import { directionOf, physicalScrollX } from "../lib/direction";

/** Which edges of a scroll container still have content beyond them (`left` and `right` are physical screen edges). */
export interface ScrollEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

/** Options for `useScrollEdges`: an enabled switch and the distance from an edge that counts as at the edge. */
export interface UseScrollEdgesOptions {
  /** Track only while true (edges read all false otherwise). Default true. */
  enabled?: boolean;
  /** Pixels of slack before an edge counts as scrollable. Default 1. */
  threshold?: number;
}

const NO_EDGES: ScrollEdges = { top: false, bottom: false, left: false, right: false };

/** Scroll-edge detection for fades and prev/next buttons; updates on scroll and on resize of the container or its content. */
export function useScrollEdges<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: UseScrollEdgesOptions = {}
): ScrollEdges & { update: () => void } {
  const { enabled = true, threshold = 1 } = options;
  const [edges, setEdges] = React.useState<ScrollEdges>(NO_EDGES);

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // `scrollLeft` runs negative in right-to-left; the edges stay physical (left is the screen's left).
    const x = physicalScrollX(el.scrollLeft, max, directionOf(el));
    const next: ScrollEdges = {
      top: el.scrollTop > threshold,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - threshold,
      left: x > threshold,
      right: max - x > threshold,
    };
    setEdges((prev) =>
      prev.top === next.top && prev.bottom === next.bottom && prev.left === next.left && prev.right === next.right ? prev : next
    );
  }, [ref, threshold]);

  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setEdges(NO_EDGES);
      return;
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [ref, enabled, update]);

  return { ...edges, update };
}
