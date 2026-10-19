import * as React from "react";
import { RiAddLine, RiArrowGoBackLine, RiSubtractLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatClockTime } from "../lib/time";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "../primitives/button";

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
      min: minProp = 0,
      max: maxProp = Number.POSITIVE_INFINITY,
      goal,
      label = "Count",
      showLog = true,
      logLimit = 20,
      className,
      ...props
    },
    ref
  ) => {
    // Tolerate swapped bounds (`max < min`) like `clamp` does.
    const min = Math.min(minProp, maxProp);
    const max = Math.max(minProp, maxProp);
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [log, setLog] = React.useState<TallyEntry[]>([]);
    const valueRef = React.useRef(value);
    valueRef.current = value;
    const seq = React.useRef(0);
    const press = React.useRef<{ timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval>; repeated: boolean; entry: number | null }>({
      repeated: false,
      entry: null,
    });

    const stop = () => {
      clearTimeout(press.current.timeout);
      clearInterval(press.current.interval);
      press.current.timeout = undefined;
      press.current.interval = undefined;
    };

    const apply = (dir: 1 | -1, merge: boolean) => {
      const current = valueRef.current;
      const next = clamp(current + dir * step, min, max);
      const delta = next - current;
      // Hold-to-repeat ends at the bound: the button disables there and never gets pointerup/leave.
      if (merge && (dir > 0 ? next >= max : next <= min)) {
        stop();
        press.current.repeated = false;
      }
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
      const next = clamp(value - last.delta, min, max);
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
                        {formatClockTime(entry.at)}
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
