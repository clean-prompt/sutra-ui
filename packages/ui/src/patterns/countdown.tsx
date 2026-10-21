import * as React from "react";
import { cn } from "../lib/cn";
import { toneClass } from "../lib/tone";
import { formatDuration, splitDuration as splitDurationLib } from "../lib/duration";
import { pad2 } from "../lib/time";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useCountdown } from "../hooks/use-now";

/* ------------------------------------------------------------------ */
/* Duration helpers                                                    */
/* ------------------------------------------------------------------ */

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Splits a millisecond duration into whole days / hours / minutes / seconds (rounded up to the second). */
export function splitDuration(ms: number): DurationParts {
  const { days, hours, minutes, seconds } = splitDurationLib(ms, { round: "ceil" });
  return { days, hours, minutes, seconds };
}

/** Compact duration: "3d 4h", "2h 14m", "5m 3s", "45s". */
export function formatCompactDuration(ms: number) {
  // Round up to whole seconds (like `splitDuration`), then truncate to the two largest units.
  return formatDuration(Math.ceil(ms / 1000) * 1000, { round: "floor", invalid: "0s" });
}

/** Screen-reader text: "2 days 3 hours 5 minutes", "1 hour 5 seconds" (seconds rounded up, then shown only under a day). */
function spokenDuration(ms: number) {
  return formatDuration(Math.ceil(ms / 1000) * 1000, { style: "long", units: 3, keepZeros: false, round: "floor", invalid: "0 seconds" });
}

/* ------------------------------------------------------------------ */
/* Countdown                                                           */
/* ------------------------------------------------------------------ */

export interface CountdownProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Target moment. */
  target: Date | number;
  /** `segments` shows d/h/m/s boxes; `compact` shows "2h 14m". */
  format?: "segments" | "compact";
  /** Hide the seconds segment. */
  hideSeconds?: boolean;
  /** Flip-in animation when a digit changes (skipped with reduced motion). */
  flip?: boolean;
  /** Called once when the target time is reached. */
  onComplete?: () => void;
  /** Shown once the target has passed (defaults to zeros). */
  completeContent?: React.ReactNode;
  /**
   * Digit size.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /** Final stretch: in the last this-many milliseconds (and not yet complete) the countdown takes the warning tone and sets `data-urgent`. */
  urgentBelow?: number;
}

const segSize = {
  // Phone widths get slimmer tiles (and a tighter row) so four segments fit a 280-330 px column instead of running out of it.
  sm: { box: "min-w-10 px-1.5 py-1", text: "text-lg", label: "text-2xs" },
  md: { box: "min-w-11 px-1.5 py-1.5 sm:min-w-14 sm:px-2", text: "text-display-xs", label: "text-2xs" },
  lg: { box: "min-w-12 px-2 py-2 sm:min-w-20 sm:px-3", text: "text-display-sm sm:text-display-md", label: "text-xs" },
};

/** Countdown to a date with d/h/m/s segments or a compact "2h 14m" form; fires `onComplete` once. */
export const Countdown = React.forwardRef<HTMLDivElement, CountdownProps>(
  (
    { target, format = "segments", hideSeconds, flip, onComplete, completeContent, size = "md", urgentBelow, className, ...props },
    ref
  ) => {
    const { remainingMs: remaining } = useCountdown(target, {
      interval: hideSeconds && format === "segments" ? 1000 : 250,
      onExpire: onComplete,
    });
    const reduced = usePrefersReducedMotion();

    const urgent = urgentBelow != null && remaining > 0 && remaining <= urgentBelow;
    const parts = splitDuration(remaining);
    const label = remaining > 0 ? `Time remaining: ${spokenDuration(remaining)}` : "Time is up";

    if (remaining <= 0 && completeContent !== undefined) {
      return (
        <div ref={ref} data-slot="countdown" role="timer" aria-label={label} className={className} {...props}>
          {completeContent}
        </div>
      );
    }

    if (format === "compact") {
      return (
        <div
          ref={ref}
          data-slot="countdown"
          role="timer"
          aria-label={label}
          data-complete={remaining <= 0 || undefined}
          data-urgent={urgent || undefined}
          className={cn("inline-flex font-medium tabular-nums", urgent && toneClass("text", "warning"), className)}
          {...props}
        >
          <span aria-hidden>{formatCompactDuration(remaining)}</span>
        </div>
      );
    }

    const segs: [keyof DurationParts, string][] = [
      ["days", "Days"],
      ["hours", "Hours"],
      ["minutes", "Minutes"],
      ["seconds", "Seconds"],
    ];
    const shown = segs.filter(([k]) => !(k === "seconds" && hideSeconds) && !(k === "days" && parts.days === 0));

    return (
      <div
        ref={ref}
        data-slot="countdown"
        role="timer"
        aria-label={label}
        data-complete={remaining <= 0 || undefined}
        data-urgent={urgent || undefined}
        className={cn("inline-flex max-w-full items-start gap-1 sm:gap-2", className)}
        {...props}
      >
        {shown.map(([key, unit], i) => {
          const value = pad2(parts[key]);
          return (
            <React.Fragment key={key}>
              {i > 0 ? (
                <span aria-hidden className={cn("py-1.5 font-semibold text-muted-foreground", segSize[size].text)}>
                  :
                </span>
              ) : null}
              <div aria-hidden className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "overflow-hidden rounded-box border border-border bg-card text-center font-semibold text-foreground tabular-nums shadow-xs",
                    segSize[size].box,
                    segSize[size].text,
                    urgent && cn(toneClass("soft", "warning"), toneClass("border", "warning"))
                  )}
                >
                  <span
                    key={flip && !reduced ? value : undefined}
                    className={cn("inline-block", flip && !reduced && "animate-in fade-in-0 slide-in-from-top-2 duration-300")}
                  >
                    {value}
                  </span>
                </span>
                <span className={cn("font-medium tracking-wide text-muted-foreground uppercase", segSize[size].label)}>{unit}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);
Countdown.displayName = "Countdown";
