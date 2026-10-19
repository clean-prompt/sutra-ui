import * as React from "react";
import { cn } from "../lib/cn";
import { useScrollProgress } from "../hooks/use-scroll-progress";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { usePrefersReducedMotion } from "../hooks/use-media-query";

export interface ScrollStageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Length of the scroll runway: a CSS length, or a number of viewport heights. Default 3 (`300vh`). */
  runway?: number | string;
  /** Height of the sticky stage: a CSS length. Default `100dvh`; use a fixed length inside a scroll area. */
  stageHeight?: string;
  /** The scrolling element. Default: the nearest scrolling ancestor, else the page. */
  scroller?: React.RefObject<HTMLElement | null>;
  /** Called with the progress (0..1) in a frame while it changes. */
  onScrollProgress?: (progress: number) => void;
}

/**
 * A sticky stage over a scroll runway: the stage stays in view while you scroll through the runway, and
 * `--sutra-progress` (0 at the start, 1 at the end) is set on the stage root so its children can follow it in CSS
 * (`opacity-(--p)` with `--p: clamp(0, (var(--sutra-progress, 1) - .3) / .4, 1)`). Scrolling stays native: no
 * hijacking, no snapping, keyboard and touch work as usual, and the content can be focused and read at any progress.
 * Without script, or under reduced motion, the variable is unset (children read it with a default of 1, their end
 * state) and the stage is an ordinary block with no runway.
 */
export const ScrollStage = React.forwardRef<HTMLDivElement, ScrollStageProps>(
  ({ runway = 3, stageHeight = "100dvh", scroller, onScrollProgress, className, style, children, ...props }, ref) => {
    const own = React.useRef<HTMLDivElement | null>(null);
    const merged = useMergedRefs(ref, own);
    const reduced = usePrefersReducedMotion();
    useScrollProgress(own, { range: "contain", always: true, scroller, onProgress: onScrollProgress });
    return (
      <div
        data-slot="scroll-stage"
        {...props}
        ref={merged}
        className={cn("relative", className)}
        style={{ ...(reduced ? null : { height: typeof runway === "number" ? `${runway * 100}vh` : runway }), ...style }}
      >
        <div data-slot="scroll-stage-viewport" className={cn(!reduced && "sticky top-0 overflow-hidden")} style={reduced ? undefined : { height: stageHeight }}>
          {children}
        </div>
      </div>
    );
  }
);
ScrollStage.displayName = "ScrollStage";
