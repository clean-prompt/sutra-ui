import * as React from "react";
import { breakpoints } from "../lib/tokens";

function getMediaQueryList(query: string): MediaQueryList | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
  try {
    return window.matchMedia(query);
  } catch {
    return undefined;
  }
}

/** Subscribe to a MediaQueryList, falling back to the legacy `addListener` API. */
function listen(mql: MediaQueryList | undefined, cb: () => void): () => void {
  if (!mql) return () => {};
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener?.("change", cb);
  }
  if (typeof mql.addListener === "function") {
    mql.addListener(cb);
    return () => mql.removeListener?.(cb);
  }
  return () => {};
}

export interface UseMediaQueryOptions {
  /** Value on the server and where `matchMedia` is missing. Default false. */
  defaultValue?: boolean;
}

/** Whether a CSS media query matches, kept in sync (SSR-safe via `useSyncExternalStore`). */
export function useMediaQuery(query: string, options: UseMediaQueryOptions = {}): boolean {
  const defaultValue = options.defaultValue ?? false;
  const mql = React.useMemo(() => getMediaQueryList(query), [query]);
  const subscribe = React.useCallback((cb: () => void) => listen(mql, cb), [mql]);
  const getSnapshot = () => (mql ? Boolean(mql.matches) : defaultValue);
  return React.useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** One-shot check of `prefers-reduced-motion: reduce` (false on the server). */
export function prefersReducedMotion(): boolean {
  return Boolean(getMediaQueryList(REDUCED_MOTION)?.matches);
}

/** Live `prefers-reduced-motion: reduce` preference. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION);
}

export type BreakpointName = keyof typeof breakpoints;

/** True when the viewport is at least the named breakpoint's width (`min-width`, from the tokens). */
export function useBreakpoint(name: BreakpointName, options: UseMediaQueryOptions = {}): boolean {
  const px = breakpoints[name] ?? 0;
  return useMediaQuery(`(min-width: ${px}px)`, options);
}
