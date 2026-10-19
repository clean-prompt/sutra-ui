import * as React from "react";
import { clamp } from "../lib/math";
import { useIsoLayoutEffect, useLatestRef } from "./use-iso-layout-effect";
import { usePrefersReducedMotion } from "./use-media-query";

/** The named ranges of a CSS view timeline (`animation-range: entry`, `cover`, ...). */
export type ScrollRangeName = "entry" | "cover" | "exit" | "contain";
/**
 * Where progress runs from 0 to 1: a named range of the element passing through its scroller, a slice of one
 * (`["entry", 0, 0.6]` is `animation-range: entry 0% entry 60%`), a slice of `cover` (`[0.2, 0.8]`), or `"scroll"`,
 * the scroller's own progress from top to bottom (what `scroll()` measures).
 */
export type ScrollRange = ScrollRangeName | "scroll" | readonly [ScrollRangeName, number, number] | readonly [number, number];

/** The range of the `scroll-reveal` utility (`animation-range: entry 0% entry 60%`), so the script path matches the CSS one. */
export const SCROLL_REVEAL_RANGE: ScrollRange = ["entry", 0, 0.6];

/** Avoids a division by zero for an empty element or range: the result clamps to a step. */
const nz = (n: number) => Math.max(n, 1e-6);

const rawFor = (name: ScrollRangeName, top: number, h: number, vh: number): number => {
  if (name === "cover") return (vh - top) / (vh + h);
  if (name === "entry") return (vh - top) / nz(h);
  if (name === "exit") return -top / nz(h);
  // contain: while the element is fully inside the scrollport, or (when taller) fully covering it
  return (h < vh ? vh - h - top : -top) / nz(Math.abs(vh - h));
};

/**
 * Progress 0..1 of an element through a scroller, from its box (`top` relative to the scrollport's top edge and
 * `height`) and the scrollport height `vh`. `"entry"` runs while the element slides in (0 when its top edge reaches the
 * bottom of the scrollport, 1 when its bottom edge does), `"exit"` while it slides out, `"cover"` from first touch to
 * last, `"contain"` while it is fully inside (or, if taller than the scrollport, fully covering it: the runway of a
 * `ScrollStage`). Always clamped; `"scroll"` is not an element range (see `scrollProgressOf`) and gives 0.
 */
export function progressFor(rect: { top: number; height: number }, vh: number, range: ScrollRange = "entry"): number {
  if (range === "scroll") return 0;
  const [name, from, to] = typeof range === "string" ? [range, 0, 1] : range.length === 2 ? (["cover", ...range] as const) : range;
  const raw = rawFor(name, rect.top, rect.height, vh);
  return clamp((raw - from) / nz(to - from), 0, 1);
}

/** A scroller's own progress 0..1 (`scrollTop` over the distance it can scroll); 0 when it cannot scroll. */
export function scrollProgressOf(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const max = scrollHeight - clientHeight;
  return max > 0 ? clamp(scrollTop / max, 0, 1) : 0;
}

/** Whether the browser can drive CSS animations from scroll (`animation-timeline: view()` or `scroll()`). */
export function supportsScrollTimeline(kind: "view" | "scroll" = "view"): boolean {
  return typeof CSS !== "undefined" && !!CSS.supports?.(`animation-timeline: ${kind}()`);
}

/** The nearest ancestor that scrolls (overflow auto, scroll or overlay), or null for the viewport. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    if (/auto|scroll|overlay/.test(getComputedStyle(p).overflowY)) return p;
  }
  return null;
}

/** Options for `useScrollProgress`: the range, the scroller, whether it always updates, an enabled switch and a progress callback. */
export interface UseScrollProgressOptions {
  /** Where progress runs. Default `"entry"`. */
  range?: ScrollRange;
  /** The scrolling element. Default: the nearest scrolling ancestor, else the viewport. */
  scroller?: React.RefObject<HTMLElement | null>;
  /** Run the script path even where the browser has native timelines (the numeric value, or to try the fallback). Default false. */
  always?: boolean;
  /** Turn the hook off (no listeners, no writes). Default true. */
  enabled?: boolean;
  /** Called with each new progress value (in a frame, not per scroll event). */
  onProgress?: (progress: number) => void;
}

/**
 * The script fallback of the scroll-driven utilities. In browsers with `animation-timeline` the CSS does everything and
 * this hook does nothing (unless `always`). Elsewhere it marks the element `data-scroll="script"` and writes
 * `--sutra-progress` (0..1, three decimals) from the element's position, one passive scroll listener and one frame per
 * scroll burst; the same CSS reads the variable, whose default is 1, so an element with no script and no timeline shows
 * its end state. Under reduced motion it does nothing at all. Write the variable on the element you pass.
 */
export function useScrollProgress(ref: React.RefObject<HTMLElement | null>, options: UseScrollProgressOptions = {}): void {
  const { range = "entry", scroller, always = false, enabled = true } = options;
  const reduced = usePrefersReducedMotion();
  const onProgress = useLatestRef(options.onProgress);
  const rangeKey = String(range);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled || reduced || (!always && supportsScrollTimeline(range === "scroll" ? "scroll" : "view"))) return;
    const root = scroller?.current ?? scrollParent(el);
    const doc = document.documentElement;
    let frame = 0;
    let last = NaN;
    const scrollbox = root ?? doc; // the viewport scrolls the document element
    const update = () => {
      frame = 0;
      let p: number;
      if (range === "scroll") p = scrollProgressOf(scrollbox.scrollTop, scrollbox.scrollHeight, scrollbox.clientHeight);
      else {
        const r = el.getBoundingClientRect();
        p = progressFor({ top: r.top - (root ? root.getBoundingClientRect().top : 0), height: r.height }, scrollbox.clientHeight, range);
      }
      p = Math.round(p * 1000) / 1000;
      if (p === last) return;
      last = p;
      el.style.setProperty("--sutra-progress", String(p));
      onProgress.current?.(p);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    const target: EventTarget = root ?? window;
    el.dataset.scroll = "script";
    update(); // before the first paint: no flash of the end state
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete el.dataset.scroll;
      el.style.removeProperty("--sutra-progress");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, scroller, enabled, reduced, always, rangeKey]);
}
