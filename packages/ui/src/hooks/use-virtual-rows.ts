import * as React from "react";

export interface UseVirtualRowsOptions {
  count: number;
  /** Fixed row height in px. */
  rowHeight: number;
  /** The scrolling element. */
  scrollElement: HTMLElement | null;
  /** Extra rows rendered above and below the viewport. Default 12. */
  overscan?: number;
  /** When false, every row is rendered. Default true. */
  enabled?: boolean;
  /** Viewport height assumed before the element has been measured. Default 480. */
  fallbackHeight?: number;
}

export interface VirtualRows {
  start: number;
  end: number;
  /** Height of the full list in px. */
  totalHeight: number;
  /** Offset in px of the first rendered row. */
  offset: number;
}

/** Fixed-height windowing: which rows of a long list are inside (or near) the viewport. */
export function useVirtualRows({
  count,
  rowHeight,
  scrollElement,
  overscan = 12,
  enabled = true,
  fallbackHeight = 480,
}: UseVirtualRowsOptions): VirtualRows {
  const [view, setView] = React.useState({ top: 0, height: 0 });
  React.useEffect(() => {
    if (!scrollElement || !enabled) return;
    let frame = 0;
    const update = () => {
      setView((v) =>
        v.top === scrollElement.scrollTop && v.height === scrollElement.clientHeight
          ? v
          : { top: scrollElement.scrollTop, height: scrollElement.clientHeight }
      );
    };
    const onScroll = () => {
      if (typeof requestAnimationFrame === "undefined") return update();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    scrollElement.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(scrollElement);
    return () => {
      if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(frame);
      scrollElement.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [scrollElement, enabled]);

  const totalHeight = count * rowHeight;
  if (!enabled) return { start: 0, end: count, totalHeight, offset: 0 };
  const viewport = view.height || fallbackHeight;
  const maxTop = Math.max(0, totalHeight - viewport);
  const top = Math.min(view.top, maxTop);
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((top + viewport) / rowHeight) + overscan);
  return { start, end, totalHeight, offset: start * rowHeight };
}
