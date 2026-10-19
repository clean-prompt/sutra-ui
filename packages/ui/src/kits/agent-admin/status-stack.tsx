import * as React from "react";
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine, RiPauseLine, RiPlayLine, RiSkipForwardLine, RiStopLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { Progress } from "../../primitives/progress";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../../lib/tone";
import { formatRelative, toMs, type TimeInput } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { formatCountdownClock, formatInterval, parseInterval, useScheduleNow, type CronInterval } from "../../patterns/cron";

type TimeLike = TimeInput;

/** Row tone. Canonical `Tone` plus deprecated aliases (`brand`, `danger`, …). */
export type StatusStackTone = ToneInput;

const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

const toneBar = toneClasses.dot;

const StatusStackContext = React.createContext<{ dismiss: () => void } | null>(null);

/* ------------------------------------------------------------------ */
/* StatusStackRow                                                      */
/* ------------------------------------------------------------------ */

export interface StatusStackRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Leading glyph (decorative). */
  icon?: React.ReactNode;
  /** Bold kind label, e.g. "Goal". */
  label: React.ReactNode;
  /** Short facts joined with "·". */
  meta?: React.ReactNode[];
  /** Trailing, truncated description. */
  title?: React.ReactNode;
  /** Buttons on the right. */
  actions?: React.ReactNode;
  /** Thin bar under the row. */
  progress?: { value: number; max: number; label: string };
  /**
   * Colour of the row and its progress bar (a `Tone`); the specialised rows pick one from their state when omitted.
   */
  tone?: StatusStackTone;
  /** Shows a dismiss button. Inside a `StatusStack` the row is also removed from the stack. */
  onDismiss?: () => void;
  /** Accessible name of the dismiss button. */
  dismissLabel?: string;
  /** Higher rows sort first inside a `StatusStack`. Default 0. */
  priority?: number;
}

/** Generic status row: glyph, label, "·"-separated facts, title, actions and an optional progress bar. */
export const StatusStackRow = React.forwardRef<HTMLDivElement, StatusStackRowProps>(
  ({ icon, label, meta, title, actions, progress, tone: toneProp, onDismiss, dismissLabel, priority: _priority, className, children, ...props }, ref) => {
    const stack = React.useContext(StatusStackContext);
    const tone = normalizeTone(toneProp);
    const facts = (meta ?? []).filter((m) => m != null && m !== false && m !== "");
    const pct = progress ? clamp((progress.value / Math.max(1, progress.max)) * 100, 0, 100) : 0;
    const labelText = typeof label === "string" ? label : "status";
    return (
      <div ref={ref} data-slot="status-stack-row" className={cn("relative flex min-w-0 flex-col", className)} {...props}>
        <div className="flex min-h-9 min-w-0 items-center gap-2 px-3 py-1.5 text-sm">
          {icon ? (
            <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center leading-none [&_svg]:size-4", toneText[tone])}>
              {icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <span className="shrink-0 font-medium text-foreground">{label}</span>
            {facts.map((f, i) => (
              <React.Fragment key={i}>
                <span aria-hidden className="text-muted-foreground/60">
                  ·
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{f}</span>
              </React.Fragment>
            ))}
            {title ? (
              <>
                <span aria-hidden className="text-muted-foreground/60">
                  ·
                </span>
                <span className="min-w-0 truncate text-foreground/90">{title}</span>
              </>
            ) : null}
            {children}
          </span>
          {actions ? <span className="flex shrink-0 items-center gap-0.5">{actions}</span> : null}
          {onDismiss ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={dismissLabel ?? `Dismiss ${labelText}`}
              onClick={() => {
                onDismiss();
                stack?.dismiss();
              }}
            >
              <RiCloseLine aria-hidden />
            </Button>
          ) : null}
        </div>
        {progress ? (
          <Progress
            size="xs"
            value={pct}
            aria-label={progress.label}
            aria-valuemax={progress.max}
            aria-valuenow={Math.min(progress.value, progress.max)}
            className="mx-3 mb-1.5 w-auto"
            indicatorClassName={cn("motion-reduce:transition-none", toneBar[tone])}
          />
        ) : null}
      </div>
    );
  }
);
StatusStackRow.displayName = "StatusStackRow";

/* ------------------------------------------------------------------ */
/* StatusStack                                                         */
/* ------------------------------------------------------------------ */

export interface StatusStackProps extends React.HTMLAttributes<HTMLElement> {
  /** Controlled collapsed state; collapsed shows only the top row. */
  collapsed?: boolean;
  /** Initial collapsed state when `collapsed` is not controlled. */
  defaultCollapsed?: boolean;
  /** Called with the new state when the user expands or collapses the stack. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Accessible name. Default "Session status". */
  label?: string;
}

function rowPriority(node: React.ReactNode) {
  if (React.isValidElement<{ priority?: number }>(node)) return node.props.priority ?? 0;
  return 0;
}

/** Stack of status rows above a composer; collapsed it shows the top row plus "+N more". */
export const StatusStack = React.forwardRef<HTMLElement, StatusStackProps>(
  ({ collapsed: collapsedProp, defaultCollapsed = true, onCollapsedChange, label = "Session status", className, children, ...props }, ref) => {
    const [collapsed, setCollapsed] = useControllableState({ value: collapsedProp, defaultValue: defaultCollapsed, onChange: onCollapsedChange });
    const [dismissed, setDismissed] = React.useState<string[]>([]);
    const listId = React.useId();
    const all = React.Children.toArray(children).filter(React.isValidElement);
    // Forget dismissals of rows that are gone, so a later row in the same slot (same key) shows again.
    const liveDismissed = dismissed.filter((k) => all.some((c) => String(c.key) === k));
    if (liveDismissed.length !== dismissed.length) setDismissed(liveDismissed);
    const rows = all
      .filter((c) => !liveDismissed.includes(String(c.key)))
      .map((c, i) => ({ node: c, i, p: rowPriority(c) }))
      .sort((a, b) => b.p - a.p || a.i - b.i)
      .map((r) => r.node as React.ReactElement);

    if (!rows.length) return null;
    const hidden = rows.length - 1;
    const visible = collapsed ? rows.slice(0, 1) : rows;

    return (
      <section
        ref={ref}
        aria-label={label}
        data-collapsed={collapsed || undefined}
        className={cn("flex min-w-0 flex-col overflow-hidden rounded-box border border-border bg-card/95 shadow-xs backdrop-blur", className)}
        {...props}
      >
        <div id={listId} className="flex min-w-0 flex-col divide-y divide-border">
          {visible.map((row) => (
            <StatusStackContext.Provider key={row.key} value={{ dismiss: () => setDismissed((d) => [...d, String(row.key)]) }}>
              <div className="motion-safe:animate-in motion-safe:fade-in-0">{row}</div>
            </StatusStackContext.Provider>
          ))}
        </div>
        {hidden > 0 ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={listId}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex h-7 items-center justify-center gap-1 border-t border-border text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing
            )}
          >
            {collapsed ? (
              <>
                +{hidden} more <RiArrowDownSLine aria-hidden className="size-3.5" />
              </>
            ) : (
              <>
                Show less <RiArrowUpSLine aria-hidden className="size-3.5" />
              </>
            )}
          </button>
        ) : null}
      </section>
    );
  }
);
StatusStack.displayName = "StatusStack";

/* ------------------------------------------------------------------ */
/* GoalStatusRow                                                       */
/* ------------------------------------------------------------------ */

export interface GoalStatusRowProps extends Omit<StatusStackRowProps, "label" | "title" | "icon" | "meta" | "progress"> {
  /** Goal text, truncated to one line. */
  title: React.ReactNode;
  /** Turns used so far, shown against `maxTurns`. */
  turns: number;
  /** Turn budget. */
  maxTurns: number;
  /** Shows the goal as paused (neutral tone) and swaps Pause for Resume. */
  paused?: boolean;
  /** Called when the user presses Pause; the button is hidden when unset. */
  onPause?: () => void;
  /** Called when the user presses Resume on a paused goal; the button is hidden when unset. */
  onResume?: () => void;
  /** Called when the user clears the goal; the button is hidden when unset. */
  onClear?: () => void;
}

/** "⊙ Goal · 3/20 turns · title" with a turn-budget bar and pause / clear. */
export const GoalStatusRow = React.forwardRef<HTMLDivElement, GoalStatusRowProps>(
  ({ title, turns, maxTurns, paused, onPause, onResume, onClear, tone, ...props }, ref) => {
    const ratio = turns / Math.max(1, maxTurns);
    const t: StatusStackTone = tone ?? (paused ? "neutral" : ratio >= 1 ? "destructive" : ratio >= 0.8 ? "warning" : "primary");
    return (
      <StatusStackRow
        ref={ref}
        icon={<span className="text-base">⊙</span>}
        label="Goal"
        tone={t}
        meta={[`${turns}/${maxTurns} turns`, paused ? "paused" : null]}
        title={title}
        progress={{ value: turns, max: maxTurns, label: "Turn budget" }}
        actions={
          <>
            {paused && onResume ? (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Resume goal" onClick={onResume}>
                <RiPlayLine aria-hidden />
              </Button>
            ) : null}
            {!paused && onPause ? (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Pause goal" onClick={onPause}>
                <RiPauseLine aria-hidden />
              </Button>
            ) : null}
            {onClear ? (
              <Button type="button" variant="ghost" size="xs" onClick={onClear}>
                Clear
              </Button>
            ) : null}
          </>
        }
        {...props}
      />
    );
  }
);
GoalStatusRow.displayName = "GoalStatusRow";

/* ------------------------------------------------------------------ */
/* LoopStatusRow                                                       */
/* ------------------------------------------------------------------ */

function intervalText(every: string | number | CronInterval) {
  if (typeof every === "number") {
    const m = Math.round(every / 60_000);
    if (m % 1440 === 0) return formatInterval({ every: m / 1440, unit: "d" });
    if (m % 60 === 0) return formatInterval({ every: m / 60, unit: "h" });
    return formatInterval({ every: Math.max(1, m), unit: "m" });
  }
  if (typeof every === "string") {
    const p = parseInterval(every);
    return p ? formatInterval(p) : every;
  }
  return formatInterval(every);
}

export interface LoopStatusRowProps extends Omit<StatusStackRowProps, "label" | "icon" | "meta"> {
  /** "45m", "every 2h", an interval object or milliseconds. */
  every: string | number | CronInterval;
  /** Number of runs completed so far. */
  runs: number;
  /** When the next run is due; drives a live "next in" countdown, hidden when `null` or unset. */
  nextDueAt?: TimeLike | null;
  /** Shows the loop as paused (neutral tone) and stops the countdown. */
  paused?: boolean;
  /** Called when the user presses Run now; the button is hidden when unset. */
  onRunNow?: () => void;
  /** Called when the user stops the loop; the button is hidden when unset. */
  onStop?: () => void;
}

/** "↻ Loop · every 45m · 2 runs · next in 44:12" with a live countdown, run now and stop. */
export const LoopStatusRow = React.forwardRef<HTMLDivElement, LoopStatusRowProps>(
  ({ every, runs, nextDueAt, paused, onRunNow, onStop, tone, ...props }, ref) => {
    const live = nextDueAt != null && !paused;
    const now = useScheduleNow(live, 1000);
    const dueMs = toMs(nextDueAt);
    const remaining = dueMs !== undefined ? dueMs - now : null;
    const next = paused ? "paused" : remaining == null ? null : remaining <= 0 ? "due now" : `next in ${formatCountdownClock(remaining)}`;
    return (
      <StatusStackRow
        ref={ref}
        icon={<span className="text-base">↻</span>}
        label="Loop"
        tone={tone ?? (paused ? "neutral" : "info")}
        meta={[intervalText(every), `${runs} ${runs === 1 ? "run" : "runs"}`, next ? <span data-slot="loop-next">{next}</span> : null]}
        actions={
          <>
            {onRunNow ? (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Run loop now" onClick={onRunNow}>
                <RiSkipForwardLine aria-hidden />
              </Button>
            ) : null}
            {onStop ? (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Stop loop" onClick={onStop}>
                <RiStopLine aria-hidden />
              </Button>
            ) : null}
          </>
        }
        {...props}
      />
    );
  }
);
LoopStatusRow.displayName = "LoopStatusRow";

/* ------------------------------------------------------------------ */
/* HeartbeatStatusRow                                                  */
/* ------------------------------------------------------------------ */

export interface HeartbeatStatusRowProps extends Omit<StatusStackRowProps, "label" | "icon" | "meta"> {
  /** Time of the last heartbeat; `null` or unset counts as stale. */
  lastBeatAt?: TimeLike | null;
  /** Expected beat period; the row turns stale after two missed beats. */
  intervalMs?: number;
  /** Kind label of the row. Default "Heartbeat". */
  label?: React.ReactNode;
}

/** Periodic heartbeat: pulse dot, period and time since the last beat; turns amber when beats are missed. */
export const HeartbeatStatusRow = React.forwardRef<HTMLDivElement, HeartbeatStatusRowProps>(
  ({ lastBeatAt, intervalMs, label = "Heartbeat", tone, ...props }, ref) => {
    const now = useScheduleNow(lastBeatAt != null, 1000);
    const beatMs = toMs(lastBeatAt);
    const since = beatMs !== undefined ? now - beatMs : null;
    const stale = since == null || (intervalMs != null && since > intervalMs * 2);
    const t = normalizeTone(tone ?? (stale ? "warning" : "success"));
    return (
      <StatusStackRow
        ref={ref}
        data-stale={stale || undefined}
        icon={
          <span className="relative flex size-2.5">
            {!stale ? <span className={cn("absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping", toneBar[t])} /> : null}
            <span className={cn("relative size-2.5 rounded-full", toneBar[t])} />
          </span>
        }
        label={label}
        tone={t}
        meta={[
          intervalMs != null ? intervalText(intervalMs) : null,
          since == null ? "no beat yet" : <span data-slot="heartbeat-last">last beat {formatRelative(beatMs, { now, seconds: true, justNowMs: 5000 })}</span>,
          stale && since != null ? "missed" : null,
        ]}
        {...props}
      />
    );
  }
);
HeartbeatStatusRow.displayName = "HeartbeatStatusRow";
