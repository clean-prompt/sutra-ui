import * as React from "react";
import { cn } from "../lib/cn";
import { SCROLL_REVEAL_RANGE, useScrollProgress } from "../hooks/use-scroll-progress";
import { useMergedRefs } from "../hooks/use-merged-refs";

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLElement> {
  /** Where it comes from as it enters: slides up (default), down, from the inline start or end, or only fades or scales in. */
  from?: "up" | "down" | "start" | "end" | "fade" | "scale";
  /** Travel in px for the sliding directions. Default 24. */
  distance?: number;
  /** Element to render. Default `div`. */
  as?: "div" | "section" | "article" | "aside" | "header" | "footer" | "figure" | "li" | "p" | "span";
  /** The scrolling element for the script fallback. Default: the nearest scrolling ancestor, else the page. */
  scroller?: React.RefObject<HTMLElement | null>;
  /** Run the script fallback even where the browser has native scroll timelines (to try the Firefox path). Default false. */
  forceFallback?: boolean;
}

/**
 * Fades and moves its content in as it scrolls into view, scrubbed by the scroll position (it reverses when you scroll
 * back). It is the `scroll-reveal` utility plus the script fallback: browsers with `animation-timeline` run it as a CSS
 * animation with no JavaScript; others get `--sutra-progress` from `useScrollProgress`, and with neither the content is
 * simply there. Reduced motion shows the end state at once. Not for dense tables, live data or anything above the fold
 * that must be readable on load. It replaces the element's own `translate` and `scale`, so wrap, do not stack. Keep it out of `overflow-hidden` wrappers (a native timeline binds to the nearest clipping ancestor, which never scrolls): use `overflow-clip` there.
 */
export const ScrollReveal = React.forwardRef<HTMLElement, ScrollRevealProps>(
  ({ from = "up", distance = 24, as, scroller, forceFallback = false, className, style, ...props }, ref) => {
    const Comp = (as ?? "div") as React.ElementType;
    const own = React.useRef<HTMLElement | null>(null);
    const merged = useMergedRefs(ref, own);
    useScrollProgress(own, { range: SCROLL_REVEAL_RANGE, scroller, always: forceFallback });
    return (
      <Comp
        data-slot="scroll-reveal"
        data-from={from === "up" ? undefined : from}
        {...props}
        ref={merged}
        className={cn("scroll-reveal", className)}
        style={{ "--sutra-reveal-distance": `${distance}px`, ...style }}
      />
    );
  }
);
ScrollReveal.displayName = "ScrollReveal";

export interface ScrollProgressBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The scrolling element to follow. Default: the nearest scrolling ancestor, else the page. */
  scroller?: React.RefObject<HTMLElement | null>;
  /** Run the script fallback even where the browser has native scroll timelines. Default false. */
  forceFallback?: boolean;
}

/**
 * A thin bar that fills as the scroller scrolls (the `scroll-progress-bar` utility plus the script fallback). Decorative
 * (`aria-hidden`); place it `sticky top-0` inside a scroll area or `fixed inset-x-0 top-0` for the page. Empty where no
 * timeline or script can drive it, and under reduced motion.
 */
export const ScrollProgressBar = React.forwardRef<HTMLDivElement, ScrollProgressBarProps>(
  ({ scroller, forceFallback = false, className, ...props }, ref) => {
    const own = React.useRef<HTMLDivElement | null>(null);
    const merged = useMergedRefs(ref, own);
    useScrollProgress(own, { range: "scroll", scroller, always: forceFallback });
    return <div aria-hidden="true" data-slot="scroll-progress-bar" {...props} ref={merged} className={cn("scroll-progress-bar h-0.5 w-full bg-primary", className)} />;
  }
);
ScrollProgressBar.displayName = "ScrollProgressBar";
