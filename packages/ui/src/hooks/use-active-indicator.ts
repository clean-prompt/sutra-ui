import * as React from "react";
import { useIsoLayoutEffect, useLatestRef } from "./use-iso-layout-effect";

/** Offset box of the active item, relative to its offset parent (the indicator's container). */
export interface ActiveIndicatorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Options for `useActiveIndicator`. */
export interface UseActiveIndicatorOptions {
  /** Measure only while true; the rect is `null` otherwise. Default true. */
  enabled?: boolean;
  /** Children matching this selector are also watched for size changes (the container and its first child always are). */
  itemSelector?: string;
  /** Re-measure when these attributes change anywhere inside the container (e.g. `["data-state"]` for Radix). */
  watchAttributes?: string[];
}

/** What `useActiveIndicator` returns: the measured rect, whether to animate, and a `measure` function. */
export interface ActiveIndicatorState {
  /** Where to draw the indicator, or `null` when there is no active item. */
  rect: ActiveIndicatorRect | null;
  /** False on the first frame so the indicator appears in place, then true so it slides. */
  animate: boolean;
  /** Re-measure by hand. */
  measure: () => void;
}

/**
 * Measures the active item of a tab strip / segmented control for a sliding indicator.
 * `getActive` is a selector (queried inside the container) or a function returning the element.
 * Re-measures when `deps` change, when the container or its items resize, and on `watchAttributes` mutations.
 * Items are re-collected for the resize observer whenever `deps` change, so items added later are watched too.
 */
export function useActiveIndicator<T extends HTMLElement>(
  containerRef: React.RefObject<T | null>,
  getActive: string | ((container: T) => HTMLElement | null | undefined),
  deps: React.DependencyList = [],
  options: UseActiveIndicatorOptions = {}
): ActiveIndicatorState {
  const { enabled = true, itemSelector, watchAttributes } = options;
  const [rect, setRect] = React.useState<ActiveIndicatorRect | null>(null);
  const [animate, setAnimate] = React.useState(false);
  const getActiveRef = useLatestRef(getActive);
  const enabledRef = useLatestRef(enabled);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const get = getActiveRef.current;
    const active =
      enabledRef.current && container
        ? typeof get === "string"
          ? container.querySelector<HTMLElement>(get)
          : get(container)
        : null;
    if (!active) {
      setRect(null);
      return;
    }
    const next = { left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight };
    setRect((prev) =>
      prev && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height
        ? prev
        : next
    );
  }, [containerRef, getActiveRef, enabledRef]);

  useIsoLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, enabled, ...deps]);

  const watchKey = watchAttributes?.join(",") ?? "";
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimate(true));
    const container = containerRef.current;
    if (!enabled || !container) return () => cancelAnimationFrame(raf);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(container);
      if (container.firstElementChild) ro.observe(container.firstElementChild);
      if (itemSelector) container.querySelectorAll(itemSelector).forEach((el) => ro!.observe(el));
    }
    let mo: MutationObserver | undefined;
    if (watchKey && typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => measure());
      mo.observe(container, { attributes: true, subtree: true, attributeFilter: watchKey.split(","), childList: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, enabled, itemSelector, watchKey, measure, ...deps]);

  return { rect, animate, measure };
}
