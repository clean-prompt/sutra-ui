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

/** Options for `useMediaQuery`: the value to use before the query can be read (server render). */
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

/**
 * The in-app motion setting: `<html data-motion="reduce" | "full">`. Any other value (or none) follows the system.
 * The CSS net in `sutra.css` reads the same attribute, and every JS path reads reduced motion through the two helpers
 * below, so the setting reaches both. "full" overrides an operating-system request for less motion: it is meant for an
 * app that offers its own switch, never as a default (the people who asked for reduced motion often have a reason).
 */
function motionOverride(): "reduce" | "full" | null {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.getAttribute("data-motion");
  return value === "reduce" || value === "full" ? value : null;
}

/** One observer on `<html>` shared by every `usePrefersReducedMotion` subscriber; it disconnects with the last one. */
const motionListeners = new Set<() => void>();
let motionObserver: MutationObserver | undefined;

function subscribeMotionAttribute(cb: () => void): () => void {
  if (typeof MutationObserver === "undefined" || typeof document === "undefined") return () => {};
  motionListeners.add(cb);
  if (!motionObserver) {
    motionObserver = new MutationObserver(() => motionListeners.forEach((fn) => fn()));
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  }
  return () => {
    motionListeners.delete(cb);
    if (motionListeners.size === 0) {
      motionObserver?.disconnect();
      motionObserver = undefined;
    }
  };
}

/** One-shot check of reduced motion: `<html data-motion>` if set, else `prefers-reduced-motion: reduce` (false on the server). */
export function prefersReducedMotion(): boolean {
  const override = motionOverride();
  if (override) return override === "reduce";
  return Boolean(getMediaQueryList(REDUCED_MOTION)?.matches);
}

/** Live reduced-motion preference: `<html data-motion="reduce" | "full">` wins over `prefers-reduced-motion: reduce`. */
export function usePrefersReducedMotion(): boolean {
  const mql = React.useMemo(() => getMediaQueryList(REDUCED_MOTION), []);
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const offQuery = listen(mql, cb);
      const offAttribute = subscribeMotionAttribute(cb);
      return () => {
        offQuery();
        offAttribute();
      };
    },
    [mql],
  );
  const getSnapshot = () => {
    const override = motionOverride();
    return override ? override === "reduce" : Boolean(mql?.matches);
  };
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Name of a breakpoint (`xs` to `2xl`). */
export type BreakpointName = keyof typeof breakpoints;

/** True when the viewport is at least the named breakpoint's width (`min-width`, from the tokens). */
export function useBreakpoint(name: BreakpointName, options: UseMediaQueryOptions = {}): boolean {
  const px = breakpoints[name] ?? 0;
  return useMediaQuery(`(min-width: ${px}px)`, options);
}
