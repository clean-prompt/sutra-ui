import * as React from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "../../primitives/spinner";

/* ------------------------------------------------------------------ */
/* NowPlayingBars                                                      */
/* ------------------------------------------------------------------ */

export interface NowPlayingBarsProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Animate (sounding) or hold still (current but paused). Default true. */
  playing?: boolean;
  /** Size of the animated bars. Default "sm". */
  size?: "sm" | "md" | "lg";
  /** Accessible label; defaults to "Now playing" / "Paused". Pass `null` to hide from assistive tech. */
  label?: string | null;
}

/** Three-bar equalizer marking the playing row; static when paused and under reduced motion. */
export const NowPlayingBars = React.forwardRef<HTMLSpanElement, NowPlayingBarsProps>(
  ({ playing = true, size = "sm", label, className, ...props }, ref) => {
    const text = label === undefined ? (playing ? "Now playing" : "Paused") : label;
    return (
      <span
        ref={ref}
        role={text ? "img" : undefined}
        aria-label={text ?? undefined}
        aria-hidden={text ? undefined : true}
        data-state={playing ? "playing" : "paused"}
        className={cn(
          "inline-flex shrink-0 items-end gap-[2px] text-primary",
          size === "sm" ? "size-3" : size === "md" ? "size-4" : "size-5",
          className
        )}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-full flex-1 origin-bottom rounded-[1px] bg-current",
              playing
                ? "animate-bar-scale [animation-duration:900ms] motion-reduce:animate-none motion-reduce:scale-y-[0.7]"
                : "scale-y-[0.55]"
            )}
            style={playing ? { animationDelay: `${i * 300}ms` } : undefined}
          />
        ))}
      </span>
    );
  }
);
NowPlayingBars.displayName = "NowPlayingBars";

/* ------------------------------------------------------------------ */
/* Buffering indicator                                                 */
/* ------------------------------------------------------------------ */

export interface MediaBufferingIndicatorProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Accessible label for the spinner. Default "Buffering". */
  label?: string;
}

/** Centered buffering spinner used by players. */
export const MediaBufferingIndicator = React.forwardRef<HTMLSpanElement, MediaBufferingIndicatorProps>(
  ({ className, label = "Buffering", ...props }, ref) => (
    <span ref={ref} className={cn("inline-flex rounded-full bg-black/45 p-3 text-white backdrop-blur-sm", className)} {...props}>
      <Spinner size="xl" className="text-white" label={label} />
    </span>
  )
);
MediaBufferingIndicator.displayName = "MediaBufferingIndicator";
