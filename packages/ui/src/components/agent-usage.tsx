import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { chartColors } from "../lib/tokens";
import { Button } from "./button";
import { Meter, meterLevel, type MeterThresholds } from "./meter";
import { formatAgentTokens } from "./agent-tasks";

type TimeInput = Date | number | string;

function toMs(value: TimeInput | undefined): number | undefined {
  if (value == null) return undefined;
  const t = value instanceof Date ? value.getTime() : typeof value === "number" ? value : new Date(value).getTime();
  return Number.isNaN(t) ? undefined : t;
}

function pctText(n: number) {
  if (n > 0 && n < 0.1) return "<0.1%";
  return `${Number(n.toFixed(n < 10 ? 1 : 0))}%`;
}

/* ------------------------------------------------------------------ */
/* ContextUsageBreakdown                                               */
/* ------------------------------------------------------------------ */

export interface ContextUsageCategory {
  key: string;
  label: string;
  tokens: number;
  /** CSS color or token name (primary, info, warning…). Defaults to the chart palette. */
  color?: string;
}

const tokenColor: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
  muted: "var(--muted-foreground)",
};

const resolveColor = (c: string | undefined, i: number) => (c ? (tokenColor[c] ?? c) : chartColors[i % chartColors.length]!);

export interface ContextUsageBreakdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  categories: ContextUsageCategory[];
  /** Context window size in tokens. */
  max: number;
  /** Default "Context window". */
  title?: React.ReactNode;
  /** Show the free-space row and track remainder. Default true. */
  showFree?: boolean;
  freeLabel?: string;
  onCompact?: () => void;
  compactLabel?: string;
  /** Percent thresholds for the summary color. */
  thresholds?: MeterThresholds;
}

/** Segmented context-window track with per-category rows and an optional "Compact now" action. */
export const ContextUsageBreakdown = React.forwardRef<HTMLDivElement, ContextUsageBreakdownProps>(
  (
    {
      categories,
      max,
      title = "Context window",
      showFree = true,
      freeLabel = "Free space",
      onCompact,
      compactLabel = "Compact now",
      thresholds,
      className,
      ...props
    },
    ref
  ) => {
    const titleId = React.useId();
    const used = categories.reduce((s, c) => s + Math.max(0, c.tokens), 0);
    const free = Math.max(0, max - used);
    const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
    const level = meterLevel(pct, thresholds);
    const summary = `${formatAgentTokens(used)} / ${formatAgentTokens(max)} tokens (${Math.round(pct)}%)`;
    const denom = Math.max(max, used) || 1;
    return (
      <div ref={ref} data-level={level} className={cn("w-full space-y-3", className)} {...props}>
        <div className="flex items-baseline justify-between gap-3">
          <span id={titleId} className="text-sm font-medium text-foreground">
            {title}
          </span>
          <span
            data-slot="context-usage-summary"
            className={cn(
              "font-mono text-xs tabular-nums",
              level === "danger" ? "text-destructive" : level === "warn" ? "text-warning-soft-foreground" : "text-muted-foreground"
            )}
          >
            {summary}
          </span>
        </div>
        <div
          role="meter"
          aria-labelledby={titleId}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuetext={summary}
          className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-muted"
        >
          {categories.map((c, i) =>
            c.tokens > 0 ? (
              <span
                key={c.key}
                data-slot="context-usage-segment"
                className="h-full first:rounded-l-full"
                style={{ width: `${(c.tokens / denom) * 100}%`, background: resolveColor(c.color, i) }}
              />
            ) : null
          )}
        </div>
        <ul className="space-y-1">
          {categories.map((c, i) => (
            <li key={c.key} data-key={c.key} className="flex items-center gap-2 text-xs">
              <span aria-hidden className="size-2.5 shrink-0 rounded-xs" style={{ background: resolveColor(c.color, i) }} />
              <span className="min-w-0 flex-1 truncate text-foreground">{c.label}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{formatAgentTokens(c.tokens)}</span>
              <span data-slot="context-usage-percent" className="w-12 text-right font-mono tabular-nums text-muted-foreground">
                {pctText(max > 0 ? (c.tokens / max) * 100 : 0)}
              </span>
            </li>
          ))}
          {showFree && (
            <li data-key="free" className="flex items-center gap-2 text-xs">
              <span aria-hidden className="size-2.5 shrink-0 rounded-xs border border-border-strong bg-muted" />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{freeLabel}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{formatAgentTokens(free)}</span>
              <span className="w-12 text-right font-mono tabular-nums text-muted-foreground">{pctText(max > 0 ? (free / max) * 100 : 0)}</span>
            </li>
          )}
        </ul>
        {onCompact && (
          <div className="flex justify-end">
            <Button variant="outline" size="xs" onClick={onCompact}>
              {compactLabel}
            </Button>
          </div>
        )}
      </div>
    );
  }
);
ContextUsageBreakdown.displayName = "ContextUsageBreakdown";

/* ------------------------------------------------------------------ */
/* UsageLimitBars                                                      */
/* ------------------------------------------------------------------ */

/** "Resets in 2h 14m" within a day, otherwise "Resets Mon". */
export function formatResetCaption(resetsAt: TimeInput, now: number = Date.now()) {
  const t = toMs(resetsAt);
  if (t == null) return "";
  const diff = t - now;
  if (diff <= 0) return "Resets now";
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `Resets in ${mins}m`;
  if (mins < 24 * 60) return `Resets in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `Resets ${new Date(t).toLocaleDateString(undefined, { weekday: "short" })}`;
}

export interface UsageLimitWindow {
  id: string;
  /** "Current session", "Weekly", "Weekly (Opus)". */
  label: string;
  /** Percent of the limit used, 0–100. */
  percent: number;
  resetsAt?: TimeInput;
  /** Overrides the computed reset caption. */
  resetLabel?: React.ReactNode;
  /** Only shown when this view is selected in the window toggle. */
  view?: string;
}

export interface UsageModelShare {
  name: string;
  /** Percent of total usage, 0–100. */
  percent: number;
  color?: string;
  view?: string;
}

export interface UsageLimitBarsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  windows: UsageLimitWindow[];
  title?: React.ReactNode;
  /** Toggle options for the window views, e.g. Session / Weekly. */
  views?: { value: string; label: string }[];
  view?: string;
  defaultView?: string;
  onViewChange?: (view: string) => void;
  /** Per-model attribution ("Opus 62% of usage"). */
  models?: UsageModelShare[];
  thresholds?: MeterThresholds;
  now?: number;
}

/** Rolling usage-limit bars with threshold coloring, reset captions, a window toggle and per-model attribution. */
export const UsageLimitBars = React.forwardRef<HTMLDivElement, UsageLimitBarsProps>(
  (
    {
      windows,
      title,
      views,
      view: viewProp,
      defaultView,
      onViewChange,
      models,
      thresholds = { warn: 75, danger: 90 },
      now: nowProp,
      className,
      ...props
    },
    ref
  ) => {
    const [internalView, setInternalView] = React.useState(defaultView ?? views?.[0]?.value);
    const view = viewProp ?? internalView;
    const setView = (v: string) => {
      if (viewProp === undefined) setInternalView(v);
      onViewChange?.(v);
    };
    const now = nowProp ?? Date.now();
    const shown = windows.filter((w) => !views || !w.view || w.view === view);
    const shownModels = models?.filter((m) => !views || !m.view || m.view === view);
    return (
      <div ref={ref} className={cn("w-full space-y-4", className)} {...props}>
        {(title || views) && (
          <div className="flex items-center justify-between gap-3">
            {title ? <span className="text-sm font-medium text-foreground">{title}</span> : <span />}
            {views && (
              <div role="group" aria-label="Usage window" className="flex rounded-control bg-muted p-0.5">
                {views.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    aria-pressed={view === v.value}
                    onClick={() => setView(v.value)}
                    className={cn(
                      "h-6 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-xs font-medium text-muted-foreground transition-colors",
                      "aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs",
                      focusRing
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="space-y-3.5">
          {shown.map((w) => {
            const caption = w.resetLabel ?? (w.resetsAt != null ? formatResetCaption(w.resetsAt, now) : undefined);
            return (
              <Meter
                key={w.id}
                data-window={w.id}
                label={w.label}
                value={Math.max(0, Math.min(100, w.percent))}
                thresholds={thresholds}
                valueText={`${Math.round(w.percent)}% used`}
                caption={caption}
                size="sm"
              />
            );
          })}
        </div>
        {shownModels && shownModels.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">By model</p>
            <ul className="space-y-1">
              {shownModels.map((m, i) => (
                <li key={m.name} className="flex items-center gap-2 text-xs">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: resolveColor(m.color, i) }} />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {m.name}{" "}
                    <span className="text-muted-foreground">
                      <span className="font-mono tabular-nums">{Math.round(m.percent)}%</span> of usage
                    </span>
                  </span>
                  <span aria-hidden className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, m.percent)}%`, background: resolveColor(m.color, i) }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);
UsageLimitBars.displayName = "UsageLimitBars";

/* ------------------------------------------------------------------ */
/* SessionStats                                                        */
/* ------------------------------------------------------------------ */

/** "850ms", "42s", "4m 12s", "1h 03m". */
export function formatAgentDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export interface SessionStatsItem {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface SessionStatsProps extends Omit<React.HTMLAttributes<HTMLDListElement>, "title"> {
  /** Total cost in `currency`. */
  cost?: number;
  currency?: string;
  apiDurationMs?: number;
  wallDurationMs?: number;
  linesAdded?: number;
  linesRemoved?: number;
  /** Extra rows appended at the end. */
  extra?: SessionStatsItem[];
}

/** Cost, API vs wall duration and code changes, as a key/value summary. */
export const SessionStats = React.forwardRef<HTMLDListElement, SessionStatsProps>(
  ({ cost, currency = "USD", apiDurationMs, wallDurationMs, linesAdded, linesRemoved, extra = [], className, ...props }, ref) => {
    const rows: SessionStatsItem[] = [];
    if (cost != null) {
      rows.push({
        label: "Total cost",
        value: new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: cost < 1 ? 4 : 2 }).format(cost),
      });
    }
    if (apiDurationMs != null) rows.push({ label: "API duration", value: formatAgentDuration(apiDurationMs) });
    if (wallDurationMs != null) rows.push({ label: "Wall duration", value: formatAgentDuration(wallDurationMs) });
    if (linesAdded != null || linesRemoved != null) {
      rows.push({
        label: "Code changes",
        value: (
          <span>
            <span className="text-success">+{linesAdded ?? 0}</span>
            <span className="sr-only"> lines added, </span>
            <span aria-hidden> </span>
            <span className="text-destructive">−{linesRemoved ?? 0}</span>
            <span className="sr-only"> lines removed</span>
          </span>
        ),
      });
    }
    rows.push(...extra);
    return (
      <dl ref={ref} className={cn("w-full divide-y divide-border text-sm", className)} {...props}>
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="font-mono tabular-nums text-foreground">{r.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
);
SessionStats.displayName = "SessionStats";
