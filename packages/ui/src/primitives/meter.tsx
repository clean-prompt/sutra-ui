import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { chartColors } from "../lib/tokens";
import { toPercent } from "../lib/math";
import { breakdownValue, formatShare } from "../lib/breakdown";
import { useControllableState } from "../hooks/use-controllable-state";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";
import { accentClasses, accentStyle, type Accent } from "../lib/accent";
import { Skeleton } from "./progress";

/** Percent thresholds at which a meter turns warning / danger. */
export interface MeterThresholds {
  warn?: number;
  danger?: number;
}

/**
 * Threshold level emitted by `meterLevel()` and `data-level`. These spellings predate the tone
 * vocabulary and are kept so consumers don't break; the canonical tones are
 * `warn` → `warning` and `danger` → `destructive` (see `meterLevelTone`).
 */
export type MeterLevel = "ok" | "warn" | "danger";

/** Canonical tone for a meter level (`ok` → `null`, meaning "use the base tone"). */
export function meterLevelTone(level: MeterLevel): Exclude<Tone, "neutral" | "primary" | "success" | "info"> | null {
  return level === "danger" ? "destructive" : level === "warn" ? "warning" : null;
}

export const defaultMeterThresholds: Required<MeterThresholds> = { warn: 75, danger: 90 };

/** Level for a percentage given thresholds (higher is worse). */
export function meterLevel(percent: number, thresholds: MeterThresholds | false = defaultMeterThresholds): MeterLevel {
  if (thresholds === false) return "ok";
  const danger = thresholds.danger ?? defaultMeterThresholds.danger;
  const warn = thresholds.warn ?? defaultMeterThresholds.warn;
  if (percent >= danger) return "danger";
  if (percent >= warn) return "warn";
  return "ok";
}

/** @deprecated Use `Tone` (the `tone` prop). */
export type MeterColor = "primary" | "success" | "warning" | "destructive" | "info" | "neutral";

/** Fill per tone: `toneClasses.dot`, but a neutral fill uses the foreground colour (not muted). */
const fillClass: Record<Tone, string> = { ...toneClasses.dot, neutral: "bg-foreground" };

const levelFill: Record<MeterLevel, string> = { ok: "", warn: toneClasses.dot.warning, danger: toneClasses.dot.destructive };
/** Threshold text colours: the saturated tone (toneClasses.text.warning is the softer foreground). */
const levelText: Record<MeterLevel, string> = { ok: "text-foreground", warn: "text-warning", danger: "text-destructive" };


const trim = (n: number) => Number(n.toFixed(n !== 0 && Math.abs(n) < 10 ? 1 : n % 1 === 0 ? 0 : 1)).toString();

const trackHeight = { sm: "h-1.5", md: "h-2", lg: "h-3" } as const;

export interface MeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color"> {
  label?: React.ReactNode;
  /** Current value; `null` renders an empty "no data" meter. */
  value: number | null;
  min?: number;
  /** Default 100. */
  max?: number;
  /** Unit appended to the default value text: "62.1 / 80 GB". Without it the text is a percentage. */
  unit?: string;
  /** Custom value text, or a formatter. Strings are also used as aria-valuetext. */
  valueText?: React.ReactNode | ((value: number, max: number, percent: number) => React.ReactNode);
  /** Percent thresholds for automatic warning/danger color, or false to disable. */
  thresholds?: MeterThresholds | false;
  /** Base fill tone when below thresholds (or always, if thresholds are off). Default `primary`. */
  tone?: ToneInput;
  /** @deprecated Use `tone`. */
  color?: MeterColor | ToneInput;
  /**
   * Categorical fill colour (a provider or metric colour). Colour order: the warning/danger threshold colours, then
   * `tone`/`color`, then `accent`, then primary. Sets `--sutra-accent` on the root.
   */
  accent?: Accent;
  /** Secondary line under the bar, e.g. "resets in 2h". */
  caption?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Render as n discrete blocks instead of a continuous bar. */
  segments?: number;
  /** Show the value text next to the label. Default true. */
  showValue?: boolean;
  /** Screen-reader value text override. */
  ariaValueText?: string;
  barClassName?: string;
  /** Waiting for the first reading: with no `value` the bar is a muted track with no fill and a placeholder value. */
  loading?: boolean;
}

/** "Loading CPU…" for a string label, else "Loading usage…". */
const meterLoadingText = (label: React.ReactNode, fallback: string) =>
  `Loading ${typeof label === "string" && label ? label : fallback}…`;

/** Labeled usage meter with threshold coloring (role="meter"): a level read against thresholds. For task completion use `Progress`. */
export const Meter = React.forwardRef<HTMLDivElement, MeterProps>(
  (
    {
      label,
      value,
      min = 0,
      max = 100,
      unit,
      valueText,
      thresholds = defaultMeterThresholds,
      tone,
      color,
      accent,
      caption,
      size = "md",
      segments,
      showValue = true,
      ariaValueText,
      className,
      barClassName,
      loading,
      style,
      ...props
    },
    ref
  ) => {
    const labelId = React.useId();
    const empty = value === null || !Number.isFinite(value);
    const skeleton = Boolean(loading) && empty;
    const v = empty ? min : (value as number);
    const pct = empty ? 0 : toPercent(v, max, min);
    const level = empty ? "ok" : meterLevel(pct, thresholds);
    const fill =
      level !== "ok"
        ? levelFill[level]
        : tone == null && color == null && accent
          ? accentClasses.solid
          : fillClass[normalizeTone(tone ?? color, "primary")];

    const text: React.ReactNode = empty
      ? "—"
      : typeof valueText === "function"
        ? valueText(v, max, pct)
        : valueText !== undefined
          ? valueText
          : unit !== undefined
            ? `${trim(v)} / ${trim(max)} ${unit}`.trim()
            : `${Math.round(pct)}%`;
    const ariaText =
      ariaValueText ??
      (empty ? "No data" : typeof text === "string" || typeof text === "number" ? String(text) : `${Math.round(pct)}%`);

    const lgText = size === "lg" ? "text-sm" : size === "sm" ? "text-xs" : "text-sm";

    return (
      <div
        ref={ref}
        aria-busy={loading || undefined}
        data-level={level}
        className={cn("w-full", className)}
        style={accentStyle(accent, style)}
        {...props}
      >
        {label || showValue ? (
          <div className={cn("mb-1.5 flex items-baseline justify-between gap-3", lgText)}>
            {label ? (
              <span id={labelId} className={cn("truncate font-medium text-foreground", size === "sm" && "text-muted-foreground")}>
                {label}
              </span>
            ) : (
              <span />
            )}
            {showValue && skeleton ? (
              <Skeleton shape="text" data-slot="meter-value-skeleton" className="w-10 shrink-0 self-center" />
            ) : showValue ? (
              <span data-slot="meter-value" className={cn("shrink-0 font-mono font-semibold tabular-nums", empty ? "text-muted-foreground" : levelText[level])}>
                {text}
              </span>
            ) : null}
          </div>
        ) : null}
        {skeleton ? (
          <>
            <div
              aria-hidden
              data-slot="meter-track"
              className={cn(
                segments ? "flex gap-0.5" : "relative overflow-hidden rounded-full bg-muted",
                "animate-pulse motion-reduce:animate-none",
                trackHeight[size],
                barClassName
              )}
            >
              {segments
                ? Array.from({ length: segments }, (_, i) => <span key={i} className="h-full flex-1 rounded-[2px] bg-muted" />)
                : null}
            </div>
            <span className="sr-only">{meterLoadingText(label, "usage")}</span>
          </>
        ) : (
        <div
          role="meter"
          aria-valuenow={v}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={ariaText}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : "Usage"}
          className={cn(segments ? "flex gap-0.5" : "relative overflow-hidden rounded-full bg-muted", trackHeight[size], barClassName)}
        >
          {segments ? (
            Array.from({ length: segments }, (_, i) => {
              const on = i < Math.round((pct / 100) * segments);
              return (
                <span
                  key={i}
                  data-slot="meter-segment"
                  data-state={on ? "on" : "off"}
                  className={cn("h-full flex-1 rounded-[2px] transition-colors duration-300 motion-reduce:transition-none", on ? fill : "bg-muted")}
                />
              );
            })
          ) : (
            <span
              data-slot="meter-fill"
              className={cn("block h-full rounded-full transition-[width] duration-500 ease-out-quart motion-reduce:transition-none", fill)}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
        )}
        {caption ? <div className="mt-1 text-xs text-muted-foreground">{caption}</div> : null}
      </div>
    );
  }
);
Meter.displayName = "Meter";

export interface MeterGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Grid columns on wide screens. Default 1 (stacked). */
  columns?: 1 | 2 | 3 | 4;
}

const groupCols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

/** Stack (or grid) of Meters, e.g. CPU / RAM / GPU / VRAM. */
export const MeterGroup = React.forwardRef<HTMLDivElement, MeterGroupProps>(
  ({ columns = 1, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      data-slot="meter-group"
      className={cn("grid grid-cols-1 gap-x-6 gap-y-3.5", groupCols[columns], className)}
      {...props}
    />
  )
);
MeterGroup.displayName = "MeterGroup";

export interface StackedMeterPart {
  key?: string;
  label: string;
  value: number;
  /** Token name or CSS color. Defaults to chartColors in order. */
  color?: string;
  /** Leading icon in the `legend="list"` rows (decorative). */
  icon?: React.ReactNode;
}

const tokenColor: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
  muted: "var(--muted-foreground)",
};

export interface BreakdownListItem {
  /** Stable id, used for hidden-series toggling. Defaults to the label when it is a string, else the index. */
  key?: string;
  label: React.ReactNode;
  /** Dot colour: a token name (primary, success, warning, destructive, info, muted) or any CSS colour. */
  color: string;
  /** Leading icon (an app icon, a monogram). Decorative: the label names the row. */
  icon?: React.ReactNode;
  value?: number;
  /** Replaces the formatted value. */
  valueText?: React.ReactNode;
  /** Share of the whole (0–1) for the percent column. Defaults to `value / total`. */
  share?: number;
}

export interface BreakdownListProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "children"> {
  items: BreakdownListItem[];
  valueFormatter?: (value: number) => string;
  /** Show the value column. Default true. */
  showValue?: boolean;
  /** Show the percent column. Default false. */
  showPercent?: boolean;
  /** Formats a share (0–1). Default whole percent ("46%", "<1%"). */
  percentFormatter?: (share: number) => string;
  /** Denominator for the default shares. Defaults to the sum of the visible values. */
  total?: number;
  /** Keys currently hidden (dimmed, struck through, left out of the default total). */
  hiddenSeries?: string[];
  defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (hidden: string[]) => void;
  /** Rows are toggle buttons. Defaults to true when `onHiddenSeriesChange` is set. Alt-click, Alt+Enter or double-click isolates a row. */
  interactive?: boolean;
  /** Swatch shape. Default "dot". */
  marker?: "dot" | "square";
  /** Row text size: "sm" (text-xs) or "md" (text-sm). Default "md". */
  size?: "sm" | "md";
}

const breakdownColor = (color: string) => tokenColor[color] ?? color;

/**
 * Legend rows for a breakdown: colour dot, optional icon, label, right-aligned value and optional percent
 * ("● Google Chrome 21.23 GB", "● postgres 312 MB 46%"). The last numeric column is muted. Rows can toggle series.
 */
export const BreakdownList = React.forwardRef<HTMLUListElement, BreakdownListProps>(
  (
    {
      items,
      valueFormatter = (v) => trim(v),
      showValue = true,
      showPercent = false,
      percentFormatter = formatShare,
      total,
      hiddenSeries,
      defaultHiddenSeries,
      onHiddenSeriesChange,
      interactive = onHiddenSeriesChange !== undefined,
      marker = "dot",
      size = "md",
      className,
      ...props
    },
    ref
  ) => {
    const [hidden, setHidden] = useControllableState<string[]>({
      value: hiddenSeries,
      defaultValue: defaultHiddenSeries ?? [],
      onChange: onHiddenSeriesChange,
    });
    const prevHidden = React.useRef<string[]>(hidden);
    const rows = items.map((item, i) => ({
      ...item,
      key: item.key ?? (typeof item.label === "string" ? item.label : String(i)),
      color: breakdownColor(item.color),
    }));
    const keys = rows.map((r) => r.key);
    const denominator =
      total ?? rows.reduce((sum, r) => (hidden.includes(r.key) ? sum : sum + breakdownValue(r.value)), 0);

    const isolate = (key: string, from: string[]) => {
      const others = keys.filter((k) => k !== key);
      const alreadyIsolated = !from.includes(key) && others.every((k) => from.includes(k));
      setHidden(alreadyIsolated ? [] : others);
    };
    const toggle = (key: string) => setHidden(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);

    const text = size === "sm" ? "text-xs" : "text-sm";
    return (
      <ul ref={ref} data-slot="breakdown-list" className={cn("flex min-w-0 flex-col", size === "sm" ? "gap-1" : "gap-0.5", text, className)} {...props}>
        {rows.map((row) => {
          const off = hidden.includes(row.key);
          const share = row.share ?? (denominator > 0 ? breakdownValue(row.value) / denominator : 0);
          const valueText = row.valueText ?? (row.value !== undefined ? valueFormatter(row.value) : null);
          const content = (
            <>
              <span
                aria-hidden
                data-slot="breakdown-list-marker"
                className={cn("shrink-0 border-2", marker === "dot" ? "size-2 rounded-full" : "size-2.5 rounded-[3px]")}
                style={{ borderColor: row.color, backgroundColor: off ? "transparent" : row.color }}
              />
              {row.icon ? (
                <span
                  aria-hidden
                  data-slot="breakdown-list-icon"
                  className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] [&>img]:size-full [&>svg]:size-4"
                >
                  {row.icon}
                </span>
              ) : null}
              <span
                data-slot="breakdown-list-label"
                className={cn("min-w-0 flex-1 truncate text-left", off ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground")}
              >
                {row.label}
              </span>
              {showValue && valueText !== null ? (
                <span
                  data-slot="breakdown-list-value"
                  className={cn(
                    "shrink-0 text-right tabular-nums",
                    showPercent && !off ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {valueText}
                </span>
              ) : null}
              {showPercent ? (
                <span data-slot="breakdown-list-percent" className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                  {off && row.share === undefined ? "—" : percentFormatter(share)}
                </span>
              ) : null}
            </>
          );
          const rowClass = cn("flex w-full min-w-0 items-center gap-2", size === "sm" ? "py-0" : "py-0.5", off && "opacity-70");
          return (
            <li key={row.key} data-slot="breakdown-list-item" data-state={off ? "hidden" : "visible"} className="min-w-0">
              {interactive ? (
                <button
                  type="button"
                  aria-pressed={!off}
                  title="Click to toggle · Alt-click or double-click to isolate"
                  onClick={(e) => {
                    if (e.altKey) return isolate(row.key, hidden);
                    if (e.detail === 2) return isolate(row.key, prevHidden.current);
                    prevHidden.current = hidden;
                    toggle(row.key);
                  }}
                  onKeyDown={(e) => {
                    if (e.altKey && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      isolate(row.key, hidden);
                    }
                  }}
                  className={cn(rowClass, "-mx-1.5 w-[calc(100%+0.75rem)] rounded-control px-1.5 transition-colors hover:bg-accent", focusRing)}
                >
                  {content}
                </button>
              ) : (
                <div className={rowClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
);
BreakdownList.displayName = "BreakdownList";

export interface StackedMeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label?: React.ReactNode;
  parts: StackedMeterPart[];
  /** Capacity. Defaults to the sum of parts (bar is full). */
  max?: number;
  valueFormatter?: (value: number) => string;
  /** Text beside the label. Defaults to "used / max" when `max` is set. */
  valueText?: React.ReactNode;
  /**
   * Legend under the bar. `true` / `"inline"` (default): wrapping chips. `"list"`: one `BreakdownList` row per
   * part with the value right-aligned and a percent column. `false` hides it.
   */
  legend?: boolean | "inline" | "list";
  /** Show each part's percentage (of `max`, else of the total) in the legend. Default false inline, true for `"list"`. */
  showPercent?: boolean;
  size?: "sm" | "md" | "lg";
  caption?: React.ReactNode;
  /** Show the label / value header. Default true. */
  showValue?: boolean;
  /**
   * Props for the bar itself. By default it is `role="img"` named by a parts summary; pass
   * `{ role: "meter", "aria-valuenow": … }` when the bar is a level against `max` (see `ContextUsageBreakdown`).
   */
  trackProps?: React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined>;
  /** `data-slot` of each part. Default "stacked-meter-part". */
  partSlot?: string;
  /** Waiting for the first breakdown: with no `parts` the bar is a muted track and the legend shows placeholders. */
  loading?: boolean;
}

const LEGEND_SKELETON_WIDTHS = ["45%", "35%", "28%"];

/** One bar split into colored parts with a legend (storage breakdown, wait vs. generate…). */
export const StackedMeter = React.forwardRef<HTMLDivElement, StackedMeterProps>(
  (
    {
      label,
      parts,
      max,
      valueFormatter = (v) => trim(v),
      valueText,
      legend = true,
      showPercent,
      size = "md",
      caption,
      showValue = true,
      trackProps,
      partSlot = "stacked-meter-part",
      loading,
      className,
      ...props
    },
    ref
  ) => {
    const labelId = React.useId();
    const skeleton = Boolean(loading) && parts.length === 0;
    const used = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
    const capacity = max ?? used;
    const resolved = parts.map((p, i) => ({
      ...p,
      key: p.key ?? p.label,
      color: tokenColor[p.color ?? ""] ?? p.color ?? chartColors[i % chartColors.length]!,
      pct: capacity > 0 ? (Math.max(0, p.value) / capacity) * 100 : 0,
    }));
    const text = valueText ?? (max !== undefined ? `${valueFormatter(used)} / ${valueFormatter(max)}` : valueFormatter(used));
    const summary = `${resolved.map((p) => `${p.label} ${valueFormatter(p.value)}`).join(", ")}${max !== undefined ? ` of ${valueFormatter(max)}` : ""}`;

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-busy={loading || undefined}
        className={cn("w-full", className)}
        {...props}
      >
        {skeleton ? (
          <>
            {showValue ? (
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                {label ? (
                  <span id={labelId} className="font-medium text-foreground">
                    {label}
                  </span>
                ) : (
                  <span />
                )}
                <Skeleton shape="text" className="w-20 shrink-0 self-center" />
              </div>
            ) : null}
            <div
              aria-hidden
              data-slot="stacked-meter-track"
              className={cn("flex w-full animate-pulse overflow-hidden rounded-full bg-muted motion-reduce:animate-none", trackHeight[size], trackProps?.className)}
            />
            {legend === "list" ? (
              <ul aria-hidden data-slot="stacked-meter-legend-skeleton" className={cn("mt-3 flex min-w-0 flex-col", size === "sm" ? "gap-1 text-xs" : "gap-0.5 text-sm")}>
                {LEGEND_SKELETON_WIDTHS.map((w, i) => (
                  <li key={i} className={cn("flex items-center gap-2", size === "sm" ? "h-4" : "h-6 py-0.5")}>
                    <Skeleton shape="circle" className="size-2" />
                    <span className="min-w-0 flex-1">
                      <Skeleton shape="text" width={w} />
                    </span>
                    <Skeleton shape="text" className="w-12 shrink-0" />
                  </li>
                ))}
              </ul>
            ) : legend ? (
              <ul aria-hidden data-slot="stacked-meter-legend-skeleton" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {LEGEND_SKELETON_WIDTHS.map((_, i) => (
                  <li key={i} className="inline-flex h-4 items-center gap-1.5">
                    <Skeleton className="size-2 rounded-[2px]" />
                    <Skeleton shape="text" className={i === 0 ? "w-16" : i === 1 ? "w-12" : "w-14"} />
                  </li>
                ))}
              </ul>
            ) : null}
            <span className="sr-only">{meterLoadingText(label, "breakdown")}</span>
          </>
        ) : (
        <>
        {showValue && (label || text) ? (
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            {label ? (
              <span id={labelId} className="font-medium text-foreground">
                {label}
              </span>
            ) : (
              <span />
            )}
            <span className="font-mono font-semibold tabular-nums text-foreground">{text}</span>
          </div>
        ) : null}
        <div
          role="img"
          aria-label={summary}
          {...trackProps}
          className={cn("flex w-full gap-0.5 overflow-hidden rounded-full bg-muted", trackHeight[size], trackProps?.className)}
        >
          {resolved.map((p) =>
            p.pct > 0 ? (
              <span
                key={p.key}
                data-slot={partSlot}
                title={`${p.label}: ${valueFormatter(p.value)}`}
                className="block h-full transition-[width] duration-500 ease-out-quart first:rounded-l-full last:rounded-r-full motion-reduce:transition-none"
                style={{ width: `${p.pct}%`, backgroundColor: p.color }}
              />
            ) : null
          )}
        </div>
        {legend === "list" ? (
          <BreakdownList
            className="mt-3"
            size={size === "sm" ? "sm" : "md"}
            showPercent={showPercent ?? true}
            valueFormatter={valueFormatter}
            items={resolved.map((p) => ({ key: p.key, label: p.label, color: p.color, icon: p.icon, value: p.value, share: p.pct / 100 }))}
          />
        ) : legend ? (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {resolved.map((p) => (
              <li key={p.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden className="size-2 rounded-[2px]" style={{ backgroundColor: p.color }} />
                {p.label}
                <span className="font-mono tabular-nums text-foreground">{valueFormatter(p.value)}</span>
                {showPercent ? <span className="tabular-nums">({Math.round(p.pct)}%)</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        </>
        )}
        {caption ? <div className="mt-1 text-xs text-muted-foreground">{caption}</div> : null}
      </div>
    );
  }
);
StackedMeter.displayName = "StackedMeter";
