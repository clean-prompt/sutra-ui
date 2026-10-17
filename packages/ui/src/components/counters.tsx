import * as React from "react";
import {
  RiAddLine,
  RiArrowGoBackLine,
  RiFlagLine,
  RiPauseFill,
  RiPlayFill,
  RiRestartLine,
  RiSubtractLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";

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
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Compact duration: "3d 4h", "2h 14m", "5m 3s", "45s". */
export function formatCompactDuration(ms: number) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function spokenDuration({ days, hours, minutes, seconds }: DurationParts) {
  const parts: string[] = [];
  const add = (n: number, unit: string) => n > 0 && parts.push(`${n} ${unit}${n === 1 ? "" : "s"}`);
  add(days, "day");
  add(hours, "hour");
  add(minutes, "minute");
  if (days === 0) add(seconds, "second");
  return parts.length ? parts.join(" ") : "0 seconds";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mql) return;
    setReduced(mql.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", on);
    return () => mql.removeEventListener?.("change", on);
  }, []);
  return reduced;
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
  onComplete?: () => void;
  /** Shown once the target has passed (defaults to zeros). */
  completeContent?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const segSize = {
  sm: { box: "min-w-10 px-1.5 py-1", text: "text-lg", label: "text-2xs" },
  md: { box: "min-w-14 px-2 py-1.5", text: "text-display-xs", label: "text-2xs" },
  lg: { box: "min-w-20 px-3 py-2", text: "text-display-md", label: "text-xs" },
};

/** Countdown to a date with d/h/m/s segments or a compact "2h 14m" form; fires `onComplete` once. */
export const Countdown = React.forwardRef<HTMLDivElement, CountdownProps>(
  (
    { target, format = "segments", hideSeconds, flip, onComplete, completeContent, size = "md", className, ...props },
    ref
  ) => {
    const end = new Date(target).getTime();
    const [now, setNow] = React.useState(() => Date.now());
    const remaining = Math.max(0, end - now);
    const completeRef = React.useRef(onComplete);
    completeRef.current = onComplete;
    const fired = React.useRef(false);
    const reduced = usePrefersReducedMotion();

    React.useEffect(() => {
      fired.current = false;
      setNow(Date.now());
    }, [end]);

    React.useEffect(() => {
      if (remaining <= 0) {
        if (!fired.current) {
          fired.current = true;
          completeRef.current?.();
        }
        return;
      }
      const t = setInterval(() => setNow(Date.now()), hideSeconds && format === "segments" ? 1000 : 250);
      return () => clearInterval(t);
    }, [remaining <= 0, hideSeconds, format]); // eslint-disable-line react-hooks/exhaustive-deps

    const parts = splitDuration(remaining);
    const label = remaining > 0 ? `Time remaining: ${spokenDuration(parts)}` : "Time is up";

    if (remaining <= 0 && completeContent !== undefined) {
      return (
        <div ref={ref} role="timer" aria-label={label} className={className} {...props}>
          {completeContent}
        </div>
      );
    }

    if (format === "compact") {
      return (
        <div
          ref={ref}
          role="timer"
          aria-label={label}
          data-complete={remaining <= 0 || undefined}
          className={cn("inline-flex font-medium tabular-nums", className)}
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
        role="timer"
        aria-label={label}
        data-complete={remaining <= 0 || undefined}
        className={cn("inline-flex items-start gap-2", className)}
        {...props}
      >
        {shown.map(([key, unit], i) => {
          const value = String(parts[key]).padStart(2, "0");
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
                    segSize[size].text
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

/* ------------------------------------------------------------------ */
/* Stopwatch                                                           */
/* ------------------------------------------------------------------ */

export interface StopwatchLap {
  /** 1-based lap number. */
  index: number;
  /** Duration of this lap in ms. */
  lap: number;
  /** Total elapsed at the end of this lap in ms. */
  total: number;
}

/** `mm:ss.cc`, or `h:mm:ss.cc` past an hour. */
export function formatStopwatch(ms: number) {
  const t = Math.max(0, Math.floor(ms));
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h > 0 ? `${h}:` : ""}${pad(m)}:${pad(s)}.${pad(cs)}`;
}

export interface UseStopwatchOptions {
  /** Refresh interval while running, ms. Default 50. */
  interval?: number;
  autoStart?: boolean;
}

/** Stopwatch state: elapsed ms, running flag, laps and start / pause / lap / reset actions. */
export function useStopwatch({ interval = 50, autoStart = false }: UseStopwatchOptions = {}) {
  const [base, setBase] = React.useState(0);
  const [startedAt, setStartedAt] = React.useState<number | null>(() => (autoStart ? Date.now() : null));
  const [now, setNow] = React.useState(() => Date.now());
  const [laps, setLaps] = React.useState<StopwatchLap[]>([]);
  const running = startedAt !== null;

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [running, interval]);

  const read = () => base + (startedAt !== null ? Date.now() - startedAt : 0);
  const elapsed = base + (startedAt !== null ? Math.max(0, now - startedAt) : 0);

  const start = () => {
    if (running) return;
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
  };
  const pause = () => {
    if (!running) return;
    const total = read();
    setBase(total);
    setStartedAt(null);
    setNow(Date.now());
  };
  const lap = () => {
    const total = read();
    setLaps((prev) => {
      const last = prev.length ? prev[prev.length - 1]!.total : 0;
      return [...prev, { index: prev.length + 1, lap: total - last, total }];
    });
    setNow(Date.now());
  };
  const reset = () => {
    setBase(0);
    setStartedAt(null);
    setLaps([]);
    setNow(Date.now());
  };
  const toggle = () => (running ? pause() : start());

  return { elapsed, running, laps, start, pause, toggle, lap, reset };
}

export interface StopwatchProps extends React.HTMLAttributes<HTMLDivElement> {
  autoStart?: boolean;
  /** Show the laps list. Default true. */
  showLaps?: boolean;
  onLap?: (lap: StopwatchLap) => void;
}

/** Stopwatch with start / pause, lap and reset, and a laps list highlighting the fastest and slowest. */
export const Stopwatch = React.forwardRef<HTMLDivElement, StopwatchProps>(
  ({ autoStart, showLaps = true, onLap, className, ...props }, ref) => {
    const sw = useStopwatch({ autoStart });
    const onLapRef = React.useRef(onLap);
    onLapRef.current = onLap;
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
        <div role="timer" aria-label={`Elapsed ${formatStopwatch(sw.elapsed)}`} className="text-display-md font-semibold tabular-nums text-foreground">
          <span aria-hidden>{formatStopwatch(sw.elapsed)}</span>
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
                <span>{formatStopwatch(l.lap)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  }
);
Stopwatch.displayName = "Stopwatch";

/* ------------------------------------------------------------------ */
/* TallyCounter                                                        */
/* ------------------------------------------------------------------ */

export interface TallyEntry {
  id: number;
  delta: number;
  /** Value after this entry. */
  value: number;
  at: Date;
}

export interface TallyCounterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Draws a progress ring towards this target. */
  goal?: number;
  label?: string;
  /** Show the entry log with undo. Default true. */
  showLog?: boolean;
  /** Max log entries kept. Default 20. */
  logLimit?: number;
}

/** Big tally number with −/+ (press and hold to repeat), step, goal ring and an entry log with undo. */
export const TallyCounter = React.forwardRef<HTMLDivElement, TallyCounterProps>(
  (
    {
      value: valueProp,
      defaultValue = 0,
      onValueChange,
      step = 1,
      min = 0,
      max = Number.POSITIVE_INFINITY,
      goal,
      label = "Count",
      showLog = true,
      logLimit = 20,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [log, setLog] = React.useState<TallyEntry[]>([]);
    const valueRef = React.useRef(value);
    valueRef.current = value;
    const seq = React.useRef(0);
    const press = React.useRef<{ timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval>; repeated: boolean; entry: number | null }>({
      repeated: false,
      entry: null,
    });

    const apply = (dir: 1 | -1, merge: boolean) => {
      const current = valueRef.current;
      const next = Math.min(max, Math.max(min, current + dir * step));
      const delta = next - current;
      if (delta === 0) return;
      valueRef.current = next;
      setValue(next);
      setLog((prev) => {
        const last = prev[0];
        if (merge && last && last.id === press.current.entry && Math.sign(last.delta) === dir) {
          return [{ ...last, delta: last.delta + delta, value: next, at: new Date() }, ...prev.slice(1)];
        }
        const entry = { id: ++seq.current, delta, value: next, at: new Date() };
        if (merge) press.current.entry = entry.id;
        return [entry, ...prev].slice(0, logLimit);
      });
    };

    const stop = () => {
      clearTimeout(press.current.timeout);
      clearInterval(press.current.interval);
      press.current.timeout = undefined;
      press.current.interval = undefined;
    };
    React.useEffect(() => stop, []);

    const pressHandlers = (dir: 1 | -1) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button > 0) return;
        stop();
        press.current.repeated = false;
        press.current.entry = null;
        press.current.timeout = setTimeout(() => {
          press.current.repeated = true;
          apply(dir, true);
          press.current.interval = setInterval(() => apply(dir, true), 90);
        }, 450);
      },
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      onClick: () => {
        if (press.current.repeated) {
          press.current.repeated = false;
          return;
        }
        press.current.entry = null;
        apply(dir, false);
      },
    });

    const undo = () => {
      const [last, ...rest] = log;
      if (!last) return;
      const next = Math.min(max, Math.max(min, value - last.delta));
      valueRef.current = next;
      setValue(next);
      setLog(rest);
    };

    const ringSize = 168;
    const stroke = 8;
    const r = (ringSize - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = goal ? Math.min(1, Math.max(0, value / goal)) : 0;

    return (
      <div ref={ref} role="group" aria-label={label} className={cn("flex flex-col items-center gap-4", className)} {...props}>
        <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
          {goal ? (
            <svg aria-hidden width={ringSize} height={ringSize} className="absolute inset-0 -rotate-90">
              <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - pct)}
                className={cn("transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none", pct >= 1 ? "stroke-success" : "stroke-primary")}
              />
            </svg>
          ) : null}
          <div className="flex flex-col items-center">
            <output aria-live="polite" aria-label={label} className="text-display-lg font-semibold tabular-nums text-foreground" data-tally-value>
              {value}
            </output>
            {goal ? <span className="text-xs text-muted-foreground tabular-nums">of {goal}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={`Decrease by ${step}`}
            disabled={value <= min}
            {...pressHandlers(-1)}
            className={cn(
              "flex size-14 select-none items-center justify-center rounded-full border border-border bg-background text-foreground shadow-xs transition-transform active:scale-95 disabled:opacity-50 [&_svg]:size-6",
              focusRing
            )}
          >
            <RiSubtractLine aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Increase by ${step}`}
            disabled={value >= max}
            {...pressHandlers(1)}
            className={cn(
              "flex size-16 select-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:bg-primary-hover active:scale-95 disabled:opacity-50 [&_svg]:size-7",
              focusRing
            )}
          >
            <RiAddLine aria-hidden />
          </button>
        </div>
        {showLog ? (
          <div className="w-full max-w-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">History</span>
              <Button variant="ghost" size="xs" leadingIcon={<RiArrowGoBackLine aria-hidden />} onClick={undo} disabled={log.length === 0}>
                Undo
              </Button>
            </div>
            {log.length > 0 ? (
              <ol aria-label={`${label} history`} className="max-h-40 divide-y divide-border overflow-y-auto rounded-box border border-border text-sm scrollbar-thin">
                {log.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between px-3 py-1.5 tabular-nums">
                    <span className={entry.delta > 0 ? "text-success" : "text-destructive"}>
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </span>
                    <span className="text-muted-foreground">
                      → {entry.value} ·{" "}
                      <time dateTime={entry.at.toISOString()}>
                        {entry.at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </time>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">No entries yet.</p>
            )}
          </div>
        ) : null}
      </div>
    );
  }
);
TallyCounter.displayName = "TallyCounter";
