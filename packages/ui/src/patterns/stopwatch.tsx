import * as React from "react";
import { RiFlagLine, RiPauseFill, RiPlayFill, RiRestartLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { formatClock, type FormatClockOptions } from "../lib/duration";
import { Button } from "../primitives/button";
import { useStopwatch, type StopwatchLap } from "../hooks/use-stopwatch";
import { useLatestRef } from "../hooks/use-iso-layout-effect";

export * from "../hooks/use-stopwatch";

/* ------------------------------------------------------------------ */
/* Stopwatch                                                           */
/* ------------------------------------------------------------------ */

/** Stopwatch reading: `mm:ss.cc`, or `h:mm:ss.cc` past an hour. */
const STOPWATCH: FormatClockOptions = { padMinutes: true, fractionDigits: 2 };

/**
 * `mm:ss.cc`, or `h:mm:ss.cc` past an hour.
 * @deprecated Use `formatClock(ms / 1000, { padMinutes: true, fractionDigits: 2 })`.
 */
export function formatStopwatch(ms: number) {
  return formatClock(ms / 1000, STOPWATCH);
}

export interface StopwatchProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Starts counting on mount.
   * @default false
   */
  autoStart?: boolean;
  /** Show the laps list. Default true. */
  showLaps?: boolean;
  /** Called with the lap when the user records one. */
  onLap?: (lap: StopwatchLap) => void;
}

/** Stopwatch with start / pause, lap and reset, and a laps list highlighting the fastest and slowest. */
export const Stopwatch = React.forwardRef<HTMLDivElement, StopwatchProps>(
  ({ autoStart, showLaps = true, onLap, className, ...props }, ref) => {
    const sw = useStopwatch({ autoStart });
    const onLapRef = useLatestRef(onLap);
    const lapCount = React.useRef(0);
    React.useEffect(() => {
      if (sw.laps.length > lapCount.current) onLapRef.current?.(sw.laps[sw.laps.length - 1]!);
      lapCount.current = sw.laps.length;
    }, [sw.laps]);

    const lapTimes = sw.laps.map((l) => l.lap);
    const fastest = sw.laps.length > 1 ? Math.min(...lapTimes) : null;
    const slowest = sw.laps.length > 1 ? Math.max(...lapTimes) : null;

    return (
      <div ref={ref} className={cn("flex flex-col items-center gap-4", className)} {...props}>
        <div role="timer" aria-label={`Elapsed ${formatClock(sw.elapsed / 1000, STOPWATCH)}`} className="text-display-md font-semibold tabular-nums text-foreground">
          <span aria-hidden>{formatClock(sw.elapsed / 1000, STOPWATCH)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leadingIcon={sw.running ? <RiFlagLine aria-hidden /> : <RiRestartLine aria-hidden />}
            onClick={sw.running ? sw.lap : sw.reset}
            disabled={!sw.running && sw.elapsed === 0}
          >
            {sw.running ? "Lap" : "Reset"}
          </Button>
          <Button
            variant={sw.running ? "destructive-soft" : "primary"}
            leadingIcon={sw.running ? <RiPauseFill aria-hidden /> : <RiPlayFill aria-hidden />}
            onClick={sw.toggle}
            className="min-w-28"
          >
            {sw.running ? "Pause" : sw.elapsed > 0 ? "Resume" : "Start"}
          </Button>
        </div>
        {showLaps && sw.laps.length > 0 ? (
          <ol aria-label="Laps" className="w-full max-w-xs divide-y divide-border border-y border-border text-sm">
            {[...sw.laps].reverse().map((l) => (
              <li
                key={l.index}
                className={cn(
                  "flex items-center justify-between py-1.5 tabular-nums",
                  l.lap === fastest && "text-success",
                  l.lap === slowest && "text-destructive"
                )}
              >
                <span>Lap {l.index}</span>
                <span>{formatClock(l.lap / 1000, STOPWATCH)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  }
);
Stopwatch.displayName = "Stopwatch";
