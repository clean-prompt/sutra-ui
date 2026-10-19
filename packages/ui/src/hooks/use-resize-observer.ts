import * as React from "react";
import { useIsoLayoutEffect, useLatestRef } from "./use-iso-layout-effect";

type Target<T extends Element> = React.RefObject<T | null> | T | null | undefined;

function resolve<T extends Element>(target: Target<T>): T | null {
  if (!target) return null;
  return "current" in (target as object) ? ((target as React.RefObject<T | null>).current ?? null) : (target as T);
}

/** Calls `callback` whenever the element resizes (no-op where `ResizeObserver` is missing). */
export function useResizeObserver<T extends Element>(target: Target<T>, callback: (entry: ResizeObserverEntry) => void): void {
  const cb = useLatestRef(callback);
  const el = resolve(target);
  useIsoLayoutEffect(() => {
    const node = resolve(target);
    if (!node || typeof ResizeObserver === "undefined") return;
    let ro: ResizeObserver;
    try {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) cb.current(entry);
      });
      ro.observe(node);
    } catch {
      return;
    }
    return () => ro.disconnect();
  }, [target, el, cb]);
}

/** Measured size of an element, in px. */
export interface ElementSize {
  width: number;
  height: number;
}

/** Border-box size of an element, updated on resize (`{0, 0}` until measured). */
export function useElementSize<T extends Element>(target: Target<T>): ElementSize {
  const [size, setSize] = React.useState<ElementSize>({ width: 0, height: 0 });
  const measure = React.useCallback((node: Element) => {
    const rect = node.getBoundingClientRect();
    setSize((prev) => (prev.width === rect.width && prev.height === rect.height ? prev : { width: rect.width, height: rect.height }));
  }, []);
  const el = resolve(target);
  useIsoLayoutEffect(() => {
    const node = resolve(target);
    if (node) measure(node);
  }, [target, el, measure]);
  useResizeObserver(target, (entry) => measure(entry.target));
  return size;
}

/** Border-box width of an element, updated on resize (0 until measured). */
export function useElementWidth<T extends Element>(target: Target<T>): number {
  return useElementSize(target).width;
}
