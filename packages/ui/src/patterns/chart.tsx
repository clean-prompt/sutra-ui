import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { chartColors } from "../lib/tokens";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useSafeId } from "../hooks/use-safe-id";
import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  SECOND_MS,
  formatClockTime,
  formatDateTime,
  formatShortDate,
  toMs,
  type TimeInput,
} from "../lib/time";
import { BreakdownList } from "../primitives/meter";
import { Skeleton } from "../primitives/progress";

/* ------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------*/

export type ChartValue = number | string | Date | null | undefined;
export type ChartDatum = Record<string, ChartValue>;

export interface ChartSeries {
  key: string;
  label?: string;
  /** Token name (primary, success, warning, destructive, info, muted) or any CSS color. */
  color?: string;
  /** Area and line charts: bridge null values for this series. Overrides the chart's `connectNulls`. */
  connectNulls?: boolean;
}

/**
 * How the index axis places points. `"category"` (default) spaces them evenly by position in `data`;
 * `"time"` places them by time (the `index` field holds a Date, epoch ms or ISO string) and `"linear"` by
 * number, so unevenly spaced samples keep their real spacing. Bar charts always use categories.
 */
export type ChartXAxisType = "category" | "time" | "linear";

/** Options for the index (category / time) axis. */
export interface ChartXAxisOptions {
  hide?: boolean;
  /** Scale type. Default `"category"`. Ignored by `BarChart`, whose bars are categorical. */
  type?: ChartXAxisType;
  /**
   * Fixed axis range for `"time"` / `"linear"` (e.g. the last 24 h even when data starts later). Either end may be
   * `"auto"` to fit the data. Points outside are clipped and can't be hovered.
   */
  domain?: [TimeInput | "auto", TimeInput | "auto"];
  /**
   * Break the line between consecutive samples further apart than this (ms for `"time"`, axis units for
   * `"linear"`), so a period with no data shows as a gap instead of a straight line.
   */
  maxGap?: number;
  /** Approximate maximum number of tick labels. */
  tickCount?: number;
  /**
   * Label for a data point (tooltip, table, category ticks). On a `"time"` axis the value is passed as a `Date`;
   * generated time/linear tick labels are passed with `index` -1.
   */
  formatter?: (value: ChartValue, index: number) => string;
  /** Column header in the screen-reader table. Defaults to the `index` key. */
  label?: string;
  /** Gutter width in px when the axis is vertical (horizontal bar layout). */
  width?: number;
}

/** Options for the value axis. */
export interface ChartYAxisOptions {
  hide?: boolean;
  tickCount?: number;
  formatter?: (value: number) => string;
  /** Fixed lower bound, or "auto" to fit the data (default includes 0). */
  min?: number | "auto";
  /** Fixed upper bound (default fits the data, rounded to a nice tick). */
  max?: number | "auto";
  /** `[min, max]` in one prop, matching `xAxis.domain`. `min`/`max` win when both are given. */
  domain?: [number | "auto", number | "auto"];
  /** Gutter width in px when the axis is vertical. */
  width?: number;
}

/**
 * A threshold or target line. By default it is horizontal at a value (`axis: "y"`); with `axis: "x"` it is
 * vertical at an index value (a time or number), which needs a `"time"` or `"linear"` x axis.
 */
export type ChartReferenceLine = {
  label?: string;
  color?: string;
  /** Default true. */
  dashed?: boolean;
} & ({ axis?: "y"; value: number } | { axis: "x"; value: TimeInput });

export type ChartCurve = "linear" | "monotone" | "step";

type Point = readonly [number, number];

/* ------------------------------------------------------------------------------------------------
 * Pure helpers
 * ----------------------------------------------------------------------------------------------*/

function niceStep(raw: number) {
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const f = raw / base;
  const nf = f >= Math.sqrt(50) ? 10 : f >= Math.sqrt(10) ? 5 : f >= Math.sqrt(2) ? 2 : 1;
  return nf * base;
}

/** Round, human-friendly tick values covering [min, max] (≈ `count` ticks, steps of 1/2/5 × 10ⁿ). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep((hi - lo) / Math.max(1, count - 1));
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  // toFixed accepts at most 100 digits.
  const decimals = Math.min(100, Math.max(0, -Math.floor(Math.log10(step)) + 1));
  const n = Math.round((end - start) / step);
  const ticks: number[] = [];
  for (let i = 0; i <= n; i++) ticks.push(Number((start + i * step).toFixed(decimals)) || 0);
  return ticks;
}

const toNumber = (v: ChartValue): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export interface StackedSeries {
  key: string;
  /** `[lower, upper]` per datum. Negative values stack downward from 0. */
  values: [number, number][];
}

/** Stack series values per datum (like d3.stack with a diverging offset). */
export function stackSeries(data: ChartDatum[], keys: string[]): StackedSeries[] {
  const pos = data.map(() => 0);
  const neg = data.map(() => 0);
  return keys.map((key) => ({
    key,
    values: data.map((d, i) => {
      const v = toNumber(d[key]) ?? 0;
      if (v >= 0) {
        const y0 = pos[i]!;
        pos[i] = y0 + v;
        return [y0, y0 + v] as [number, number];
      }
      const y0 = neg[i]!;
      neg[i] = y0 + v;
      return [y0, y0 + v] as [number, number];
    }),
  }));
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** SVG path through points with monotone cubic interpolation (Fritsch–Carlson, like d3.curveMonotoneX). */
export function monotonePath(points: readonly Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${r2(points[0]![0])},${r2(points[0]![1])}`;
  if (n === 2) return linearPath(points);
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1]![0] - points[i]![0];
    dx.push(h);
    m.push(h === 0 ? 0 : (points[i + 1]![1] - points[i]![1]) / h);
  }
  const t: number[] = new Array(n);
  t[0] = m[0]!;
  t[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i]!;
      t[i + 1] = tau * b * m[i]!;
    }
  }
  let d = `M${r2(points[0]![0])},${r2(points[0]![1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const h = dx[i]! / 3;
    d += `C${r2(x0 + h)},${r2(y0 + t[i]! * h)},${r2(x1 - h)},${r2(y1 - t[i + 1]! * h)},${r2(x1)},${r2(y1)}`;
  }
  return d;
}

function linearPath(points: readonly Point[]) {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${r2(x)},${r2(y)}`).join("");
}

function stepPath(points: readonly Point[]) {
  if (points.length === 0) return "";
  let d = `M${r2(points[0]![0])},${r2(points[0]![1])}`;
  for (let i = 1; i < points.length; i++) d += `H${r2(points[i]![0])}V${r2(points[i]![1])}`;
  return d;
}

function curvePath(points: readonly Point[], curve: ChartCurve) {
  return curve === "monotone" ? monotonePath(points) : curve === "step" ? stepPath(points) : linearPath(points);
}

type Run = { i: number; v: number }[];

type BarEnd = "top" | "bottom" | "left" | "right" | "none";

function barPath(x: number, y: number, w: number, h: number, radius: number, end: BarEnd) {
  const r = end === "top" || end === "bottom" ? Math.min(radius, w / 2, h) : Math.min(radius, h / 2, w);
  const X = r2(x), Y = r2(y), W = r2(w), H = r2(h), R = r2(r);
  if (end === "none" || R <= 0) return `M${X},${Y}h${W}v${H}h${-W}Z`;
  switch (end) {
    case "top":
      return `M${X},${r2(Y + H)}V${r2(Y + R)}Q${X},${Y} ${r2(X + R)},${Y}H${r2(X + W - R)}Q${r2(X + W)},${Y} ${r2(X + W)},${r2(Y + R)}V${r2(Y + H)}Z`;
    case "bottom":
      return `M${X},${Y}V${r2(Y + H - R)}Q${X},${r2(Y + H)} ${r2(X + R)},${r2(Y + H)}H${r2(X + W - R)}Q${r2(X + W)},${r2(Y + H)} ${r2(X + W)},${r2(Y + H - R)}V${Y}Z`;
    case "right":
      return `M${X},${Y}H${r2(X + W - R)}Q${r2(X + W)},${Y} ${r2(X + W)},${r2(Y + R)}V${r2(Y + H - R)}Q${r2(X + W)},${r2(Y + H)} ${r2(X + W - R)},${r2(Y + H)}H${X}Z`;
    case "left":
      return `M${r2(X + W)},${Y}H${r2(X + R)}Q${X},${Y} ${X},${r2(Y + R)}V${r2(Y + H - R)}Q${X},${r2(Y + H)} ${r2(X + R)},${r2(Y + H)}H${r2(X + W)}Z`;
  }
}

const tokenColor: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
  muted: "var(--muted-foreground)",
  foreground: "var(--foreground)",
};

/** Resolve a token name (primary, success, …) to its CSS variable; pass other colors through. */
export const resolveChartColor = (color: string) => tokenColor[color] ?? color;

const compactFormat = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/**
 * Default value-axis labels: compact ("4K", "0.5") while that keeps every tick distinct; otherwise plain
 * numbers with as many decimals as the tick step needs, so 0.05 steps or 1000–1010 don't repeat a label.
 */
function tickFormatter(ticks: number[]): (v: number) => string {
  const distinct = (fmt: (v: number) => string) => new Set(ticks.map(fmt)).size === ticks.length;
  const compact = (v: number) => compactFormat.format(v);
  if (distinct(compact)) return compact;
  const step = ticks.length > 1 ? Math.abs(ticks[1]! - ticks[0]!) : 0;
  let digits = step > 0 && Number.isFinite(step) ? Math.min(20, Math.max(0, -Math.floor(Math.log10(step)))) : 0;
  for (; digits <= 20; digits++) {
    const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: digits });
    const fmt = (v: number) => nf.format(v);
    if (distinct(fmt) || digits === 20) return fmt;
  }
  return compact;
}
const plainFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

const defaultValueFormatter = (v: number) => plainFormat.format(v);

function defaultIndexFormatter(v: ChartValue) {
  if (v instanceof Date) return formatShortDate(v, { year: "never" });
  if (v === null || v === undefined) return "";
  return String(v);
}

/* Time axis ---------------------------------------------------------------------------------------- */

export type TimeTickUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

export interface TimeTicks {
  /** Tick positions in epoch ms, aligned to local boundaries (whole minutes, hours, midnights, Mondays, months). */
  ticks: number[];
  unit: TimeTickUnit;
  /** Number of `unit`s between ticks. */
  step: number;
}

const TIME_INTERVALS: [TimeTickUnit, number, number][] = [
  ["second", 1, SECOND_MS],
  ["second", 5, 5 * SECOND_MS],
  ["second", 15, 15 * SECOND_MS],
  ["second", 30, 30 * SECOND_MS],
  ["minute", 1, MINUTE_MS],
  ["minute", 5, 5 * MINUTE_MS],
  ["minute", 15, 15 * MINUTE_MS],
  ["minute", 30, 30 * MINUTE_MS],
  ["hour", 1, HOUR_MS],
  ["hour", 3, 3 * HOUR_MS],
  ["hour", 6, 6 * HOUR_MS],
  ["hour", 12, 12 * HOUR_MS],
  ["day", 1, DAY_MS],
  ["day", 2, 2 * DAY_MS],
  ["week", 1, 7 * DAY_MS],
  ["month", 1, 30 * DAY_MS],
  ["month", 3, 91 * DAY_MS],
];
const YEAR_MS = 365.25 * DAY_MS;

function timeFloor(ms: number, unit: TimeTickUnit, step: number) {
  const d = new Date(ms);
  const [y, mo, day, h, mi, s] = [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
  switch (unit) {
    case "second":
      return new Date(y, mo, day, h, mi, Math.floor(s / step) * step).getTime();
    case "minute":
      return new Date(y, mo, day, h, Math.floor(mi / step) * step).getTime();
    case "hour":
      return new Date(y, mo, day, Math.floor(h / step) * step).getTime();
    case "day":
      return new Date(y, mo, day).getTime();
    case "week":
      return new Date(y, mo, day - ((d.getDay() + 6) % 7)).getTime();
    case "month":
      return new Date(y, Math.floor(mo / step) * step, 1).getTime();
    case "year":
      return new Date(Math.floor(y / step) * step, 0, 1).getTime();
  }
}

function timeOffset(start: number, unit: TimeTickUnit, step: number, k: number) {
  if (unit === "second" || unit === "minute") return start + k * step * (unit === "second" ? SECOND_MS : MINUTE_MS);
  const d = new Date(start);
  const [y, mo, day, h] = [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()];
  switch (unit) {
    case "hour":
      return new Date(y, mo, day, h + k * step).getTime();
    case "day":
      return new Date(y, mo, day + k * step).getTime();
    case "week":
      return new Date(y, mo, day + 7 * k * step).getTime();
    case "month":
      return new Date(y, mo + k * step, 1).getTime();
    default:
      return new Date(y + k * step, 0, 1).getTime();
  }
}

/**
 * "Nice" time ticks within [min, max] (epoch ms): at most about `count` ticks at 1/5/15/30 s, 1/5/15/30 min,
 * 1/3/6/12 h, 1/2 days, weeks (Mondays), 1/3 months or years, aligned to local-time boundaries.
 */
export function timeTicks(min: number, max: number, count = 6): TimeTicks {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [], unit: "day", step: 1 };
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const target = (hi - lo) / Math.max(1, count);
  const hit = TIME_INTERVALS.find(([, , ms]) => ms >= target);
  const [unit, step] = hit ?? ["year", Math.max(1, Math.ceil(niceStep(Math.max(1, target / YEAR_MS))))];
  const start = timeFloor(lo, unit, step);
  const ticks: number[] = [];
  for (let k = 0; k < 10000; k++) {
    const t = timeOffset(start, unit, step, k);
    if (t > hi) break;
    if (t >= lo && t !== ticks[ticks.length - 1]) ticks.push(t);
  }
  return { ticks, unit, step };
}

const intlCache = new Map<string, Intl.DateTimeFormat>();
function intl(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = intlCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    intlCache.set(key, f);
  }
  return f;
}

const isMidnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;

/**
 * Default label for a time tick of the given unit: clock time for seconds/minutes/hours (`10:30`, a midnight tick shows
 * the day), weekday and day for days (`Mon 14`, the 1st shows the month), month and day for weeks (`Oct 3`), the month
 * for months (January adds the year) and the year for years.
 */
export function formatTimeTick(value: TimeInput, unit: TimeTickUnit, locale?: string): string {
  const ms = toMs(value);
  if (ms === undefined) return "";
  const d = new Date(ms);
  switch (unit) {
    case "second":
      return formatClockTime(d, { locale, seconds: true });
    case "minute":
    case "hour":
      return isMidnight(d) ? intl(locale, { weekday: "short", day: "numeric" }).format(d) : formatClockTime(d, { locale });
    case "day":
      return d.getDate() === 1
        ? formatShortDate(d, { locale, year: "never" })
        : intl(locale, { weekday: "short", day: "numeric" }).format(d);
    case "week":
      return formatShortDate(d, { locale, year: "never" });
    case "month":
      return intl(locale, d.getMonth() === 0 ? { month: "short", year: "numeric" } : { month: "short" }).format(d);
    case "year":
      return intl(locale, { year: "numeric" }).format(d);
  }
}

function useMergedRef<T>(...refs: (React.Ref<T> | undefined)[]) {
  return React.useCallback((node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);
}

function useChartWidth(ref: React.RefObject<HTMLElement | null>, fallback: number) {
  const measured = Math.round(useElementWidth(ref));
  return measured > 0 ? measured : fallback;
}

/* ------------------------------------------------------------------------------------------------
 * ChartContainer
 * ----------------------------------------------------------------------------------------------*/

export interface ChartSize {
  width: number;
  height: number;
}

export interface ChartTableData {
  columns: string[];
  rows: React.ReactNode[][];
}

export interface ChartContainerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Accessible name announced for the chart image. */
  label: string;
  height?: number;
  /** Width used before the container is measured (and in jsdom). */
  defaultWidth?: number;
  /** Rendered as a visually hidden `<table>` after the chart for screen readers. */
  table?: ChartTableData;
  children: React.ReactNode | ((size: ChartSize) => React.ReactNode);
}

/** Responsive chart frame: measures its width, exposes `role="img"` and a screen-reader data table. */
export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ label, height = 240, defaultWidth = 600, table, children, className, style, ...props }, ref) => {
    const innerRef = React.useRef<HTMLDivElement>(null);
    const width = useChartWidth(innerRef, defaultWidth);
    const mergedRef = useMergedRef(ref, innerRef);
    return (
      <>
        <div
          ref={mergedRef}
          role="img"
          aria-label={label}
          data-slot="chart"
          className={cn("relative w-full select-none", className)}
          style={{ height, ...style }}
          {...props}
        >
          {typeof children === "function" ? children({ width, height }) : children}
        </div>
        {table ? (
          <table className="sr-only">
            <caption>{label}</caption>
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th key={i} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) =>
                    j === 0 ? (
                      <th key={j} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={j}>{cell}</td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </>
    );
  }
);
ChartContainer.displayName = "ChartContainer";

/* ------------------------------------------------------------------------------------------------
 * ChartTooltip
 * ----------------------------------------------------------------------------------------------*/

export interface ChartTooltipItem {
  key: string;
  label: React.ReactNode;
  color: string;
  value: React.ReactNode;
}

export interface ChartTooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  items: ChartTooltipItem[];
  footer?: React.ReactNode;
}

/** Floating readout card listing series values at one position. Absolutely positioned, no portal. */
export const ChartTooltip = React.forwardRef<HTMLDivElement, ChartTooltipProps>(
  ({ label, items, footer, className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="chart-tooltip"
      className={cn(
        "pointer-events-none absolute z-10 min-w-36 rounded-box border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg",
        className
      )}
      {...props}
    >
      {label !== undefined && label !== "" ? (
        <div className="mb-1.5 font-medium text-muted-foreground">{label}</div>
      ) : null}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-mono font-semibold tabular-nums text-foreground">{item.value}</span>
            <span className="ml-auto pl-3 text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer}</div> : null}
    </div>
  )
);
ChartTooltip.displayName = "ChartTooltip";

/* ------------------------------------------------------------------------------------------------
 * ChartLegend
 * ----------------------------------------------------------------------------------------------*/

export interface ChartLegendItem {
  key: string;
  label: React.ReactNode;
  color: string;
}

export interface ChartLegendProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "hidden"> {
  items: ChartLegendItem[];
  /** Keys currently hidden. */
  hidden?: string[];
  /** Makes entries toggle buttons. Alt/⌥-click, Alt+Enter or double-click isolates a series. */
  onHiddenChange?: (hidden: string[]) => void;
  align?: "start" | "center" | "end";
  /** Swatch shape: "square" for bars/areas, "line" for line charts. */
  marker?: "square" | "line" | "dot";
}

/** Series legend; interactive entries toggle and isolate series. */
export const ChartLegend = React.forwardRef<HTMLDivElement, ChartLegendProps>(
  ({ items, hidden = [], onHiddenChange, align = "start", marker = "square", className, ...props }, ref) => {
    const prevHidden = React.useRef<string[]>(hidden);
    const interactive = !!onHiddenChange;

    const isolate = (key: string, from: string[]) => {
      const others = items.map((i) => i.key).filter((k) => k !== key);
      const alreadyIsolated = !from.includes(key) && others.every((k) => from.includes(k));
      onHiddenChange?.(alreadyIsolated ? [] : others);
    };
    const toggle = (key: string) =>
      onHiddenChange?.(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);

    const swatch = (color: string, off: boolean) => (
      <span
        aria-hidden
        className={cn(
          "shrink-0 border-2",
          marker === "line" ? "h-0.5 w-3 rounded-full border-0" : marker === "dot" ? "size-2.5 rounded-full" : "size-2.5 rounded-[3px]"
        )}
        style={{
          borderColor: color,
          backgroundColor: off ? "transparent" : color,
          ...(marker === "line" && off ? { opacity: 0.4 } : null),
        }}
      />
    );

    return (
      <div
        ref={ref}
        role={interactive ? "group" : "list"}
        aria-label={interactive ? "Toggle series" : "Legend"}
        data-slot="chart-legend"
        className={cn(
          "flex flex-wrap items-center gap-x-1 gap-y-1 text-xs",
          align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start",
          className
        )}
        {...props}
      >
        {items.map((item) =>
          interactive ? (
            <button
              key={item.key}
              type="button"
              aria-pressed={!hidden.includes(item.key)}
              title="Click to toggle · Alt-click or double-click to isolate"
              onClick={(e) => {
                if (e.altKey) return isolate(item.key, hidden);
                if (e.detail === 2) return isolate(item.key, prevHidden.current);
                prevHidden.current = hidden;
                toggle(item.key);
              }}
              onKeyDown={(e) => {
                if (e.altKey && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  isolate(item.key, hidden);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                focusRing,
                hidden.includes(item.key) && "text-muted-foreground/60 line-through decoration-muted-foreground/40"
              )}
            >
              {swatch(item.color, hidden.includes(item.key))}
              {item.label}
            </button>
          ) : (
            <span key={item.key} role="listitem" className="inline-flex items-center gap-1.5 px-2 py-1 text-muted-foreground">
              {swatch(item.color, false)}
              {item.label}
            </span>
          )
        )}
      </div>
    );
  }
);
ChartLegend.displayName = "ChartLegend";

/** Placeholder legend chips (or rows) shown while a chart has no data yet. */
function ChartLegendSkeleton({
  count,
  layout = "chips",
  align = "start",
  className,
}: {
  count: number;
  layout?: "chips" | "rows";
  align?: "start" | "center";
  className?: string;
}) {
  const widths = [56, 44, 64, 48, 36];
  if (layout === "rows") {
    return (
      <div aria-hidden data-slot="chart-legend-skeleton" className={cn("flex min-w-0 flex-col gap-0.5 text-sm", className)}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5">
            <Skeleton className="size-2.5 shrink-0 rounded-[3px]" />
            <span className="min-w-0 flex-1">
              <Skeleton shape="text" className="h-3.5" width={`${widths[i % widths.length]}%`} />
            </span>
            <Skeleton shape="text" className="h-3.5 w-10 shrink-0" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      data-slot="chart-legend-skeleton"
      className={cn("flex flex-wrap items-center gap-x-1 gap-y-1 text-xs", align === "center" ? "justify-center" : "justify-start", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1">
          <Skeleton className="size-2.5 shrink-0 rounded-[3px]" />
          <Skeleton shape="text" className="h-3" width={widths[i % widths.length]} />
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Cartesian base
 * ----------------------------------------------------------------------------------------------*/

export interface CartesianChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  data: ChartDatum[];
  /** Key of the x (category / time) value in each datum. */
  index: string;
  series: ChartSeries[];
  valueFormatter?: (value: number, seriesKey: string) => string;
  /** Plot height in px (legend excluded). Default 240. */
  height?: number;
  /** Index axis options (drawn vertically in horizontal bar layout). */
  xAxis?: ChartXAxisOptions;
  /** Value axis options. */
  yAxis?: ChartYAxisOptions;
  /** Gridlines along value ticks ("horizontal"), category ticks ("vertical"), both, or none. Default horizontal. */
  grid?: boolean | "horizontal" | "vertical" | "both";
  /** Default: shown below for 2+ series. */
  legend?: boolean | "top" | "bottom";
  /** Allow toggling/isolating series from the legend. Default true. */
  legendInteractive?: boolean;
  tooltip?: boolean;
  /** CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. */
  animate?: boolean;
  emptyState?: React.ReactNode;
  /** Accessible name. Defaults to a description built from the series. */
  label?: string;
  /** Horizontal threshold / target lines. */
  referenceLines?: ChartReferenceLine[];
  hiddenSeries?: string[];
  defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (hidden: string[]) => void;
  onActiveIndexChange?: (index: number | null) => void;
  /** Data is on its way: with no data, a placeholder plot (and legend) of the same size; with data, the root is marked busy. */
  loading?: boolean;
}

interface ResolvedSeries extends ChartSeries {
  label: string;
  color: string;
  order: number;
}

interface PlotContext {
  data: ChartDatum[];
  series: ResolvedSeries[];
  plot: { left: number; top: number; width: number; height: number };
  horizontal: boolean;
  cat: (i: number) => number;
  /**
   * Runs of drawable points in x order, broken at nulls (unless the series bridges them with `connectNulls`) and at
   * `xAxis.maxGap` on a time/linear axis.
   */
  runs: (values: (number | null)[], series?: ChartSeries) => Run[];
  bandwidth: number;
  val: (v: number) => number;
  baseline: number;
  stacks: Map<string, [number, number][]> | null;
  active: number | null;
  uid: string;
  motion: string;
}

interface CartesianInternalProps extends CartesianChartProps {
  connectNulls?: boolean;
  chartType: string;
  band: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  legendMarker?: ChartLegendProps["marker"];
  renderMarks: (ctx: PlotContext) => React.ReactNode;
  renderActive?: (ctx: PlotContext & { active: number }) => React.ReactNode;
}

const surface = "var(--chart-surface, var(--background))";

const CartesianChart = React.forwardRef<HTMLDivElement, CartesianInternalProps>(
  (
    {
      data,
      index,
      series,
      valueFormatter = defaultValueFormatter,
      height = 240,
      xAxis = {},
      yAxis = {},
      grid = "horizontal",
      legend,
      legendInteractive = true,
      tooltip = true,
      animate = true,
      emptyState,
      label,
      referenceLines = [],
      hiddenSeries,
      defaultHiddenSeries,
      onHiddenSeriesChange,
      onActiveIndexChange,
      loading,
      connectNulls,
      chartType,
      band,
      horizontal = false,
      stacked = false,
      legendMarker,
      renderMarks,
      renderActive,
      className,
      ...props
    },
    ref
  ) => {
    const uid = useSafeId("sutra-chart");
    const [hidden, setHidden] = useControllableState<string[]>({
      value: hiddenSeries,
      defaultValue: defaultHiddenSeries ?? [],
      onChange: onHiddenSeriesChange,
    });
    const [activeRaw, setActive] = React.useState<number | null>(null);
    const [announce, setAnnounce] = React.useState("");
    const n = data.length;

    // Index scale: categories (evenly spaced by position) or continuous time / linear values.
    const xType: ChartXAxisType = band ? "category" : xAxis.type ?? "category";
    const continuous = xType !== "category";
    const xs: (number | null)[] = continuous
      ? data.map((d) => {
          const raw = d[index];
          return xType === "time" ? toMs(raw) ?? null : toNumber(raw);
        })
      : [];
    const readX = (v: TimeInput | "auto" | undefined) =>
      v === undefined || v === "auto" ? undefined : xType === "time" ? toMs(v) : toNumber(v as ChartValue) ?? undefined;
    let x0 = 0;
    let x1 = 1;
    if (continuous) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const x of xs)
        if (x !== null) {
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
        }
      x0 = readX(xAxis.domain?.[0]) ?? lo;
      x1 = readX(xAxis.domain?.[1]) ?? hi;
      if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
        x0 = Number.isFinite(x0) ? x0 : Number.isFinite(x1) ? x1 : 0;
        x1 = x0;
      }
      if (x1 < x0) [x0, x1] = [x1, x0];
      if (x1 === x0) {
        const pad = xType === "time" ? HOUR_MS / 2 : Math.abs(x0) * 0.1 || 1;
        x0 -= pad;
        x1 += pad;
      }
    }
    const inDomain = (i: number) => !continuous || (xs[i] !== null && xs[i]! >= x0 && xs[i]! <= x1);
    /** Indices in drawing order: every point with a readable x, sorted by x. */
    const drawOrder: number[] = continuous
      ? data
          .map((_, i) => i)
          .filter((i) => xs[i] !== null)
          .sort((a, b) => xs[a]! - xs[b]! || a - b)
      : data.map((_, i) => i);
    /** Points inside the x domain, in x order. */
    const inView = continuous ? drawOrder.filter(inDomain) : drawOrder;
    const clipped = continuous && drawOrder.length !== inView.length;
    const maxGap = continuous && typeof xAxis.maxGap === "number" && xAxis.maxGap > 0 ? xAxis.maxGap : Infinity;
    const runs = (values: (number | null)[], bridge = false): Run[] => {
      const out: Run[] = [];
      let run: Run = [];
      let prev = 0;
      for (const i of drawOrder) {
        const v = values[i];
        if (v === null || v === undefined) {
          if (bridge) continue;
          if (run.length) out.push(run);
          run = [];
          continue;
        }
        const x = continuous ? xs[i]! : i;
        if (run.length && x - prev > maxGap) {
          out.push(run);
          run = [];
        }
        run.push({ i, v });
        prev = x;
      }
      if (run.length) out.push(run);
      return out;
    };

    const resolved: ResolvedSeries[] = series.map((s, i) => ({
      ...s,
      label: s.label ?? s.key,
      color: resolveChartColor(s.color ?? chartColors[i % chartColors.length]!),
      order: i,
    }));
    const visible = resolved.filter((s) => !hidden.includes(s.key));
    const bridges = (s: ChartSeries) => !band && !stacked && (s.connectNulls ?? connectNulls ?? false);
    /** With bridged series, rows where every visible series is null are not points: no hover or keyboard stop. */
    const skipEmpty = visible.some(bridges);
    /** Points that can be hovered and stepped through with the keyboard, in x order. */
    const nav = skipEmpty ? inView.filter((i) => visible.some((s) => toNumber(data[i]?.[s.key]) !== null)) : inView;
    const sparse = nav.length !== inView.length;

    const active =
      activeRaw !== null && activeRaw < n && (continuous || sparse ? nav.includes(activeRaw) : true) ? activeRaw : null;

    const onActiveRef = React.useRef(onActiveIndexChange);
    onActiveRef.current = onActiveIndexChange;
    React.useEffect(() => onActiveRef.current?.(active), [active]);
    let timeDetail: "date" | "minutes" | "seconds" = "date";
    if (xType === "time")
      for (const x of xs) {
        if (x === null) continue;
        const d = new Date(x);
        if (d.getSeconds() !== 0 || d.getMilliseconds() !== 0) {
          timeDetail = "seconds";
          break;
        }
        if (!isMidnight(d)) timeDetail = "minutes";
      }
    const fmtIndex = (i: number) => {
      const raw = data[i]?.[index];
      const x = continuous ? xs[i] : null;
      if (x === null || x === undefined) return (xAxis.formatter ?? defaultIndexFormatter)(raw, i);
      if (xType === "time") {
        if (xAxis.formatter) return xAxis.formatter(new Date(x), i);
        return timeDetail === "date" ? formatShortDate(x) : formatDateTime(x, { seconds: timeDetail === "seconds" });
      }
      return xAxis.formatter ? xAxis.formatter(raw, i) : plainFormat.format(x);
    };

    const stacks = React.useMemo(() => {
      if (!stacked) return null;
      const st = stackSeries(data, visible.map((s) => s.key));
      return new Map(st.map((s) => [s.key, s.values]));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stacked, data, visible.map((s) => s.key).join("\u0000")]);

    const ariaLabel =
      label ?? `${chartType} of ${resolved.map((s) => s.label).join(", ")} by ${xAxis.label ?? index}`;

    const legendPos = legend === undefined ? (series.length > 1 ? "bottom" : false) : legend === true ? "bottom" : legend;
    const legendEl = legendPos ? (
      <ChartLegend
        items={resolved.map((s) => ({ key: s.key, label: s.label, color: s.color }))}
        hidden={hidden}
        onHiddenChange={legendInteractive ? setHidden : undefined}
        marker={legendMarker}
      />
    ) : null;

    if (n === 0 && loading) {
      const legendSkeleton = legendPos ? <ChartLegendSkeleton count={Math.max(1, series.length)} /> : null;
      return (
        <div ref={ref} aria-busy="true" className={cn("flex w-full flex-col gap-3", className)} {...props}>
          <span className="sr-only">{`Loading ${label ?? chartType.toLowerCase()}…`}</span>
          {legendPos === "top" ? legendSkeleton : null}
          <Skeleton data-slot="chart-skeleton" className="w-full rounded-md" height={height} />
          {legendPos === "bottom" ? legendSkeleton : null}
        </div>
      );
    }

    if (n === 0) {
      return (
        <div ref={ref} className={cn("w-full", className)} {...props}>
          <div
            data-slot="chart-empty"
            className="flex items-center justify-center rounded-box border border-dashed border-border text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyState ?? "No data"}
          </div>
        </div>
      );
    }

    const describe = (i: number) =>
      `${fmtIndex(i)}: ${visible
        .map((s) => {
          const v = toNumber(data[i]?.[s.key]);
          return `${s.label} ${v === null ? "no data" : valueFormatter(v, s.key)}`;
        })
        .join(", ")}`;

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      let next: number | null = active;
      const pos = active === null ? -1 : nav.indexOf(active);
      const last = nav.length - 1;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = nav[pos < 0 ? 0 : Math.min(last, pos + 1)] ?? null;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = nav[pos < 0 ? last : Math.max(0, pos - 1)] ?? null;
          break;
        case "Home":
          next = nav[0] ?? null;
          break;
        case "End":
          next = nav[last] ?? null;
          break;
        case "Escape":
          next = null;
          break;
        default:
          return;
      }
      e.preventDefault();
      setActive(next);
      setAnnounce(next === null ? "" : describe(next));
    };

    const table: ChartTableData = {
      columns: [xAxis.label ?? index, ...visible.map((s) => s.label)],
      rows: data.map((d, i) => [
        fmtIndex(i),
        ...visible.map((s) => {
          const v = toNumber(d[s.key]);
          return v === null ? "–" : valueFormatter(v, s.key);
        }),
      ]),
    };

    // Value domain: with a clipped x domain, the visible points plus the neighbours the line enters from.
    let fits: ((i: number) => boolean) | null = null;
    if (clipped) {
      const keep = new Set(inView);
      const first = drawOrder.indexOf(inView[0] ?? -1);
      const lastIn = drawOrder.indexOf(inView[inView.length - 1] ?? -1);
      const before = first > 0 ? drawOrder[first - 1] : drawOrder.filter((i) => xs[i]! < x0).pop();
      const after = lastIn >= 0 ? drawOrder[lastIn + 1] : drawOrder.find((i) => xs[i]! > x1);
      if (before !== undefined) keep.add(before);
      if (after !== undefined) keep.add(after);
      fits = (i) => keep.has(i);
    }
    let lo = Infinity;
    let hi = -Infinity;
    if (stacks) {
      for (const vals of stacks.values())
        vals.forEach(([a, b], i) => {
          if (fits && !fits(i)) return;
          lo = Math.min(lo, a, b);
          hi = Math.max(hi, a, b);
        });
    } else {
      for (const s of visible)
        data.forEach((d, i) => {
          const v = toNumber(d[s.key]);
          if (v !== null && (!fits || fits(i))) {
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
          }
        });
    }
    for (const r of referenceLines) {
      if (r.axis === "x") continue;
      lo = Math.min(lo, r.value);
      hi = Math.max(hi, r.value);
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    const yMin = yAxis.min ?? yAxis.domain?.[0];
    const yMax = yAxis.max ?? yAxis.domain?.[1];
    const dMin = typeof yMin === "number" ? yMin : yMin === "auto" ? lo : Math.min(0, lo);
    let dMax = typeof yMax === "number" ? yMax : hi;
    if (dMax <= dMin) dMax = dMin + 1;
    let ticks = niceTicks(dMin, dMax, yAxis.tickCount ?? 5);
    const d0 = typeof yMin === "number" ? yMin : ticks[0]!;
    const d1 = typeof yMax === "number" ? yMax : ticks[ticks.length - 1]!;
    const eps = (d1 - d0) * 1e-6;
    ticks = ticks.filter((t) => t >= d0 - eps && t <= d1 + eps);
    const yFmt = yAxis.formatter ?? tickFormatter(ticks);

    const motion = animate ? "motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out" : "";

    return (
      <div ref={ref} aria-busy={loading || undefined} className={cn("flex w-full flex-col gap-3", className)} {...props}>
        {legendPos === "top" ? legendEl : null}
        <ChartContainer
          label={ariaLabel}
          height={height}
          table={table}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className={cn("rounded-md", focusRing)}
        >
          {({ width }) => {
            const valueAxisHidden = !!yAxis.hide;
            const catAxisHidden = !!xAxis.hide;
            const left = horizontal ? (catAxisHidden ? 4 : xAxis.width ?? 72) : valueAxisHidden ? 4 : yAxis.width ?? 40;
            const bottom = horizontal ? (valueAxisHidden ? 4 : 22) : catAxisHidden ? 4 : 22;
            const top = 8;
            const right = horizontal ? 16 : 8;
            const plot = {
              left,
              top,
              width: Math.max(1, width - left - right),
              height: Math.max(1, height - top - bottom),
            };
            const catStart = horizontal ? plot.top : plot.left;
            const catLen = horizontal ? plot.height : plot.width;
            const bandwidth = band ? catLen / n : 0;
            const xPos = (x: number) => catStart + ((x - x0) / (x1 - x0)) * catLen;
            const cat = (i: number) =>
              continuous
                ? xPos(xs[i] ?? NaN)
                : band
                  ? catStart + (i + 0.5) * bandwidth
                  : n === 1
                    ? catStart + catLen / 2
                    : catStart + (i / (n - 1)) * catLen;
            const span = d1 - d0 || 1;
            const val = (v: number) =>
              horizontal
                ? plot.left + ((v - d0) / span) * plot.width
                : plot.top + plot.height - ((v - d0) / span) * plot.height;
            const baseline = val(Math.min(d1, Math.max(d0, 0)));
            const ctx: PlotContext = {
              data,
              series: visible,
              plot,
              horizontal,
              cat,
              runs: (values, s) => runs(values, s ? bridges(s) : false),
              bandwidth,
              val,
              baseline,
              stacks,
              active,
              uid,
              motion,
            };

            const maxCatTicks =
              xAxis.tickCount ?? Math.max(2, Math.floor(catLen / (horizontal ? 18 : xType === "time" ? 80 : 64)));
            const every = Math.max(1, Math.ceil(n / maxCatTicks));
            type CatTick = { key: string; p: number; label: string; anchor: "start" | "middle" | "end" };
            let catTicks: CatTick[];
            if (continuous) {
              let values: number[];
              let fmt: (v: number) => string;
              if (xType === "time") {
                const tt = timeTicks(x0, x1, maxCatTicks);
                values = tt.ticks;
                fmt = xAxis.formatter ? (v) => xAxis.formatter!(new Date(v), -1) : (v) => formatTimeTick(v, tt.unit);
              } else {
                const e = (x1 - x0) * 1e-9;
                values = niceTicks(x0, x1, maxCatTicks).filter((t) => t >= x0 - e && t <= x1 + e);
                const base = tickFormatter(values);
                fmt = xAxis.formatter ? (v) => xAxis.formatter!(v, -1) : base;
              }
              catTicks = values.map((v) => {
                const p = xPos(v);
                const anchor = p - catStart < 16 ? "start" : catStart + catLen - p < 16 ? "end" : "middle";
                return { key: `t${v}`, p, label: fmt(v), anchor };
              });
            } else {
              catTicks = data
                .map((_, i) => i)
                .filter((i) => i % every === 0)
                .map((i) => ({
                  key: `c${i}`,
                  p: cat(i),
                  label: fmtIndex(i),
                  anchor: horizontal || band ? "middle" : n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle",
                }));
            }
            const showValueGrid = grid === true || grid === "horizontal" || grid === "both";
            const showCatGrid = grid === "vertical" || grid === "both";

            const nearest = (p: number): number | null => {
              if (!band && (continuous || sparse)) {
                if (nav.length === 0) return null;
                const frac = (p - catStart) / catLen;
                const x = continuous ? x0 + frac * (x1 - x0) : frac * (n - 1);
                const xOf = (i: number) => (continuous ? xs[i]! : i);
                let a = 0;
                let b = nav.length - 1;
                while (a < b) {
                  const m = (a + b) >> 1;
                  if (xOf(nav[m]!) < x) a = m + 1;
                  else b = m;
                }
                const i = nav[a]!;
                const prev = nav[a - 1];
                return prev !== undefined && x - xOf(prev) <= xOf(i) - x ? prev : i;
              }
              if (band) return Math.max(0, Math.min(n - 1, Math.floor((p - catStart) / bandwidth)));
              if (n === 1) return 0;
              return Math.max(0, Math.min(n - 1, Math.round(((p - catStart) / catLen) * (n - 1))));
            };
            const track = (clientX: number, clientY: number, target: Element) => {
              const svg = (target as SVGElement).ownerSVGElement ?? target;
              const rect = svg.getBoundingClientRect();
              const sx = rect.width > 0 ? width / rect.width : 1;
              const sy = rect.height > 0 ? height / rect.height : 1;
              const p = horizontal ? (clientY - rect.top) * sy : (clientX - rect.left) * sx;
              setActive(nearest(p));
            };

            const ax = active !== null ? cat(active) : 0;
            const tooltipStyle: React.CSSProperties | undefined =
              active === null
                ? undefined
                : horizontal
                  ? {
                      top: ax,
                      left: plot.left + plot.width,
                      transform: `translate(-100%, ${ax > height / 2 ? "calc(-100% - 8px)" : "8px"})`,
                    }
                  : {
                      left: ax,
                      top: plot.top,
                      transform: ax > width / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                    };

            return (
              <>
                <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
                  {/* value grid + labels */}
                  {ticks.map((t) => {
                    const p = val(t);
                    return (
                      <g key={`v${t}`}>
                        {showValueGrid ? (
                          horizontal ? (
                            <line x1={p} x2={p} y1={plot.top} y2={plot.top + plot.height} className="stroke-border" shapeRendering="crispEdges" />
                          ) : (
                            <line x1={plot.left} x2={plot.left + plot.width} y1={p} y2={p} className="stroke-border" shapeRendering="crispEdges" />
                          )
                        ) : null}
                        {!valueAxisHidden ? (
                          horizontal ? (
                            <text x={p} y={plot.top + plot.height + 15} textAnchor="middle" className="fill-muted-foreground text-2xs tabular-nums">
                              {yFmt(t)}
                            </text>
                          ) : (
                            <text x={plot.left - 8} y={p} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-2xs tabular-nums">
                              {yFmt(t)}
                            </text>
                          )
                        ) : null}
                      </g>
                    );
                  })}
                  {/* category grid + labels */}
                  {catTicks.map(({ key, p, label: tickLabel, anchor }) => {
                    return (
                      <g key={key}>
                        {showCatGrid ? (
                          horizontal ? (
                            <line x1={plot.left} x2={plot.left + plot.width} y1={p} y2={p} className="stroke-border" shapeRendering="crispEdges" />
                          ) : (
                            <line x1={p} x2={p} y1={plot.top} y2={plot.top + plot.height} className="stroke-border" shapeRendering="crispEdges" />
                          )
                        ) : null}
                        {!catAxisHidden ? (
                          horizontal ? (
                            <text x={plot.left - 8} y={p} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-2xs">
                              {tickLabel}
                            </text>
                          ) : (
                            <text x={p} y={plot.top + plot.height + 16} textAnchor={anchor} className="fill-muted-foreground text-2xs">
                              {tickLabel}
                            </text>
                          )
                        ) : null}
                      </g>
                    );
                  })}
                  {band && active !== null ? (
                    horizontal ? (
                      <rect x={plot.left} y={ax - bandwidth / 2} width={plot.width} height={bandwidth} className="fill-foreground/5" />
                    ) : (
                      <rect x={ax - bandwidth / 2} y={plot.top} width={bandwidth} height={plot.height} className="fill-foreground/5" />
                    )
                  ) : null}
                  {clipped ? (
                    <>
                      <defs>
                        <clipPath id={`${uid}-clip`}>
                          <rect x={plot.left - 4} y={0} width={plot.width + 8} height={height} />
                        </clipPath>
                      </defs>
                      <g data-slot="chart-marks" clipPath={`url(#${uid}-clip)`}>
                        {renderMarks(ctx)}
                      </g>
                    </>
                  ) : (
                    renderMarks(ctx)
                  )}
                  {referenceLines.map((r, i) => {
                    const color = resolveChartColor(r.color ?? "muted");
                    if (r.axis === "x") {
                      const x = continuous ? readX(r.value) : undefined;
                      if (x === undefined || x < x0 || x > x1) return null;
                      const p = xPos(x);
                      const end = catStart + catLen - p < 48;
                      return (
                        <g key={`r${i}`} data-slot="chart-reference-line">
                          <line x1={p} x2={p} y1={plot.top} y2={plot.top + plot.height} stroke={color} strokeWidth={1} strokeDasharray={r.dashed === false ? undefined : "4 3"} />
                          {r.label ? (
                            <text x={end ? p - 4 : p + 4} y={plot.top + 10} textAnchor={end ? "end" : "start"} className="fill-muted-foreground text-2xs font-medium">
                              {r.label}
                            </text>
                          ) : null}
                        </g>
                      );
                    }
                    const p = val(r.value);
                    return (
                      <g key={`r${i}`} data-slot="chart-reference-line">
                        {horizontal ? (
                          <line x1={p} x2={p} y1={plot.top} y2={plot.top + plot.height} stroke={color} strokeWidth={1} strokeDasharray={r.dashed === false ? undefined : "4 3"} />
                        ) : (
                          <line x1={plot.left} x2={plot.left + plot.width} y1={p} y2={p} stroke={color} strokeWidth={1} strokeDasharray={r.dashed === false ? undefined : "4 3"} />
                        )}
                        {r.label ? (
                          horizontal ? (
                            <text x={p + 4} y={plot.top + 10} className="fill-muted-foreground text-2xs font-medium">
                              {r.label}
                            </text>
                          ) : (
                            <text x={plot.left + plot.width - 4} y={p - 5} textAnchor="end" className="fill-muted-foreground text-2xs font-medium">
                              {r.label}
                            </text>
                          )
                        ) : null}
                      </g>
                    );
                  })}
                  {!band && active !== null ? (
                    <line
                      data-slot="chart-crosshair"
                      x1={ax}
                      x2={ax}
                      y1={plot.top}
                      y2={plot.top + plot.height}
                      className="stroke-muted-foreground/50"
                      strokeWidth={1}
                      shapeRendering="crispEdges"
                    />
                  ) : null}
                  {active !== null && renderActive ? renderActive({ ...ctx, active }) : null}
                  <rect
                    data-slot="chart-hit"
                    x={plot.left}
                    y={plot.top}
                    width={plot.width}
                    height={plot.height}
                    fill="transparent"
                    onMouseMove={(e) => track(e.clientX, e.clientY, e.currentTarget)}
                    onMouseLeave={() => setActive(null)}
                    onTouchStart={(e) => {
                      const t = e.touches[0];
                      if (t) track(t.clientX, t.clientY, e.currentTarget);
                    }}
                    onTouchMove={(e) => {
                      const t = e.touches[0];
                      if (t) track(t.clientX, t.clientY, e.currentTarget);
                    }}
                  />
                </svg>
                {visible.length === 0 ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    All series hidden
                  </div>
                ) : null}
                {tooltip && active !== null && visible.length > 0 ? (
                  <ChartTooltip
                    label={fmtIndex(active)}
                    style={tooltipStyle}
                    items={visible.map((s) => {
                      const v = toNumber(data[active]?.[s.key]);
                      return { key: s.key, label: s.label, color: s.color, value: v === null ? "–" : valueFormatter(v, s.key) };
                    })}
                  />
                ) : null}
              </>
            );
          }}
        </ChartContainer>
        {legendPos === "bottom" ? legendEl : null}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announce}
        </div>
      </div>
    );
  }
);
CartesianChart.displayName = "CartesianChart";

function activeDots(ctx: PlotContext & { active: number }, stacked: boolean) {
  return ctx.series.map((s) => {
    const v = stacked ? ctx.stacks?.get(s.key)?.[ctx.active]?.[1] ?? null : toNumber(ctx.data[ctx.active]?.[s.key]);
    if (v === null) return null;
    return (
      <circle
        key={s.key}
        data-slot="chart-active-dot"
        cx={ctx.cat(ctx.active)}
        cy={ctx.val(v)}
        r={4}
        fill={s.color}
        stroke={surface}
        strokeWidth={2}
      />
    );
  });
}

/* ------------------------------------------------------------------------------------------------
 * AreaChart
 * ----------------------------------------------------------------------------------------------*/

export interface AreaChartProps extends CartesianChartProps {
  stacked?: boolean;
  /**
   * Draw straight through null values instead of breaking the line (the null points themselves stay absent).
   * `xAxis.maxGap` still breaks it. Per-series `connectNulls` wins. Default false. Ignored when `stacked`
   * (stacked nulls count as 0).
   */
  connectNulls?: boolean;

  curve?: ChartCurve;
  /** Gradient fill fading to the baseline. Default true. */
  gradient?: boolean;
  strokeWidth?: number;
}

/** Area chart: single or multi-series, optionally stacked, with gradient fills. */
export const AreaChart = React.forwardRef<HTMLDivElement, AreaChartProps>(
  ({ stacked = false, curve = "monotone", gradient = true, strokeWidth = 2, ...props }, ref) => (
    <CartesianChart
      ref={ref}
      {...props}
      chartType={stacked ? "Stacked area chart" : "Area chart"}
      band={false}
      stacked={stacked}
      renderActive={(ctx) => activeDots(ctx, stacked)}
      renderMarks={(ctx) => {
        const areas: React.ReactNode[] = [];
        const lines: React.ReactNode[] = [];
        const defs: React.ReactNode[] = [];
        for (const s of ctx.series) {
          const gid = `${ctx.uid}-a${s.order}`;
          let area = "";
          let line = "";
          if (stacked && ctx.stacks) {
            const st = ctx.stacks.get(s.key) ?? [];
            for (const run of ctx.runs(st.map(([, b]) => b))) {
              const upper = run.map(({ i, v }): Point => [ctx.cat(i), ctx.val(v)]);
              const lower = run.map(({ i }): Point => [ctx.cat(i), ctx.val(st[i]![0])]).reverse();
              const top = curvePath(upper, curve);
              line += top;
              area += `${top}L${curvePath(lower, curve).slice(1)}Z`;
            }
          } else {
            for (const run of ctx.runs(ctx.data.map((d) => toNumber(d[s.key])), s)) {
              const pts: Point[] = run.map(({ i, v }) => [ctx.cat(i), ctx.val(v)]);
              const top = curvePath(pts, curve);
              line += top;
              area += `${top}L${r2(pts[pts.length - 1]![0])},${r2(ctx.baseline)}L${r2(pts[0]![0])},${r2(ctx.baseline)}Z`;
            }
          }
          defs.push(
            <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={gradient ? (stacked ? 0.5 : 0.3) : stacked ? 0.35 : 0.12} />
              <stop offset="100%" stopColor={s.color} stopOpacity={gradient ? (stacked ? 0.18 : 0.02) : stacked ? 0.35 : 0.12} />
            </linearGradient>
          );
          areas.push(<path key={s.key} data-slot="chart-area" d={area} fill={`url(#${gid})`} stroke="none" className={ctx.motion} />);
          lines.push(
            <path
              key={s.key}
              data-slot="chart-line"
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={ctx.motion}
            />
          );
        }
        return (
          <>
            <defs>{defs}</defs>
            {areas}
            {lines}
          </>
        );
      }}
    />
  )
);
AreaChart.displayName = "AreaChart";

/* ------------------------------------------------------------------------------------------------
 * LineChart
 * ----------------------------------------------------------------------------------------------*/

export interface LineChartProps extends CartesianChartProps {
  curve?: ChartCurve;
  /**
   * Draw straight through null values instead of breaking the line (the null points themselves stay absent).
   * `xAxis.maxGap` still breaks it. Per-series `connectNulls` wins. Default false.
   */
  connectNulls?: boolean;

  /** Draw a dot on every data point. */
  dots?: boolean;
  strokeWidth?: number;
}

/** Multi-series line chart with optional dots and reference (threshold) lines. */
export const LineChart = React.forwardRef<HTMLDivElement, LineChartProps>(
  ({ curve = "monotone", dots = false, strokeWidth = 2, ...props }, ref) => (
    <CartesianChart
      ref={ref}
      legendMarker="line"
      {...props}
      chartType="Line chart"
      band={false}
      renderActive={(ctx) => activeDots(ctx, false)}
      renderMarks={(ctx) =>
        ctx.series.map((s) => {
          const runs = ctx.runs(ctx.data.map((d) => toNumber(d[s.key])), s);
          const d = runs.map((run) => curvePath(run.map(({ i, v }) => [ctx.cat(i), ctx.val(v)] as Point), curve)).join("");
          return (
            <g key={s.key}>
              <path
                data-slot="chart-line"
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={ctx.motion}
              />
              {dots
                ? runs.flat().map(({ i, v }) => (
                    <circle
                      key={i}
                      data-slot="chart-dot"
                      cx={ctx.cat(i)}
                      cy={ctx.val(v)}
                      r={3}
                      fill={s.color}
                      stroke={surface}
                      strokeWidth={1.5}
                      className={ctx.motion}
                    />
                  ))
                : null}
            </g>
          );
        })
      }
    />
  )
);
LineChart.displayName = "LineChart";

/* ------------------------------------------------------------------------------------------------
 * BarChart
 * ----------------------------------------------------------------------------------------------*/

export interface BarChartProps extends CartesianChartProps {
  stacked?: boolean;
  /** "vertical" = columns (default); "horizontal" = bars growing to the right, categories down the side. */
  layout?: "vertical" | "horizontal";
  /** Per-bar color override, e.g. highlight busy hours. Return undefined to keep the series color. */
  colorFor?: (datum: ChartDatum, index: number, seriesKey: string) => string | undefined;
  /** Max bar thickness in px. Default 40. */
  maxBarSize?: number;
  /** Corner radius of the data end. Default 4. */
  radius?: number;
}

/** Bar / column chart: grouped or stacked, vertical or horizontal, with conditional colors. */
export const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  ({ stacked = false, layout = "vertical", colorFor, maxBarSize = 40, radius = 4, grid, ...props }, ref) => {
    const horizontal = layout === "horizontal";
    return (
      <CartesianChart
        ref={ref}
        grid={grid ?? (horizontal ? "vertical" : "horizontal")}
        {...props}
        chartType={horizontal ? "Horizontal bar chart" : "Bar chart"}
        band
        horizontal={horizontal}
        stacked={stacked}
        renderMarks={(ctx) => {
          const gap = 2;
          const groups = stacked ? 1 : Math.max(1, ctx.series.length);
          const inner = ctx.bandwidth * (ctx.bandwidth > 12 ? 0.72 : 0.9);
          const barW = Math.max(1, Math.min(maxBarSize, (inner - gap * (groups - 1)) / groups));
          const groupW = barW * groups + gap * (groups - 1);
          const out: React.ReactNode[] = [];
          ctx.data.forEach((d, i) => {
            const topKey = stacked
              ? [...ctx.series].reverse().find((s) => (toNumber(d[s.key]) ?? 0) > 0)?.key
              : undefined;
            const bottomKey = stacked
              ? [...ctx.series].reverse().find((s) => (toNumber(d[s.key]) ?? 0) < 0)?.key
              : undefined;
            ctx.series.forEach((s, j) => {
              const raw = toNumber(d[s.key]);
              if (raw === null) return;
              const [v0, v1] = stacked ? ctx.stacks?.get(s.key)?.[i] ?? [0, raw] : [0, raw];
              const offset = stacked ? -barW / 2 : -groupW / 2 + j * (barW + gap);
              const c = ctx.cat(i) + offset;
              let p0 = ctx.val(v0);
              const p1 = ctx.val(v1);
              const positive = v1 >= v0;
              const isEnd = !stacked || s.key === (positive ? topKey : bottomKey);
              if (stacked && v0 !== 0) {
                // surface gap between stacked segments
                const dir = horizontal ? (positive ? 1 : -1) : positive ? -1 : 1;
                p0 += dir * gap;
              }
              const signed = horizontal ? (positive ? p1 - p0 : p0 - p1) : positive ? p0 - p1 : p1 - p0;
              let len = Math.max(0, signed);
              if (raw !== 0 && len < 1 && !(stacked && v0 !== 0)) len = 1;
              if (len === 0) return;
              const end: BarEnd = !isEnd ? "none" : horizontal ? (positive ? "right" : "left") : positive ? "top" : "bottom";
              const dpath = horizontal
                ? barPath(positive ? p1 - len : p1, c, len, barW, radius, end)
                : barPath(c, positive ? p1 : p1 - len, barW, len, radius, end);
              const fill = resolveChartColor(colorFor?.(d, i, s.key) ?? s.color);
              out.push(
                <path
                  key={`${s.key}-${i}`}
                  data-slot="chart-bar"
                  d={dpath}
                  fill={fill}
                  opacity={ctx.active !== null && ctx.active !== i ? 0.55 : 1}
                  className={cn(ctx.motion, "transition-opacity")}
                />
              );
            });
          });
          return out;
        }}
      />
    );
  }
);
BarChart.displayName = "BarChart";

/* ------------------------------------------------------------------------------------------------
 * DonutChart
 * ----------------------------------------------------------------------------------------------*/

export interface DonutChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  data: ChartDatum[];
  /** Key of the segment name. */
  index: string;
  /** Key of the segment value. Default "value". */
  valueKey?: string;
  /** Colors in segment order (defaults to chartColors). */
  colors?: string[];
  colorFor?: (datum: ChartDatum, index: number) => string | undefined;
  valueFormatter?: (value: number) => string;
  /** Diameter in px. Default 200. */
  size?: number;
  /** Ring thickness in px. Default size × 0.14. */
  thickness?: number;
  /** Gap between segments in degrees. Default 1.5. */
  padAngle?: number;
  /** Small caption under the center value. */
  centerLabel?: React.ReactNode;
  /** Center value. Defaults to the formatted total. Pass null to hide. */
  centerValue?: React.ReactNode;
  legend?: boolean | "bottom" | "right";
  /**
   * Show values in the legend: it becomes a `BreakdownList` (one row per segment, value right-aligned).
   * `true` / `"value"`: the formatted value; `"percent"`: the share of the visible total; `"both"`: value and percent.
   * Default false (the compact chip legend).
   */
  legendValues?: boolean | "value" | "percent" | "both";
  /** Let legend entries toggle segments. Default true. */
  legendInteractive?: boolean;
  /** Icon per segment (an app icon) shown in the legend rows. Setting it switches the legend to a `BreakdownList`. */
  iconFor?: (datum: ChartDatum, index: number) => React.ReactNode;
  tooltip?: boolean;
  animate?: boolean;
  emptyState?: React.ReactNode;
  label?: string;
  hiddenSeries?: string[];
  defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (hidden: string[]) => void;
  /** Data is on its way: with no data, a placeholder ring (and legend) of the same size; with data, the root is marked busy. */
  loading?: boolean;
}

function arcPath(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number) {
  const pt = (r: number, a: number) => `${r2(cx + r * Math.sin(a))},${r2(cy - r * Math.cos(a))}`;
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    return (
      `M${pt(ro, 0)}A${ro},${ro} 0 1 1 ${pt(ro, Math.PI)}A${ro},${ro} 0 1 1 ${pt(ro, 0)}Z` +
      `M${pt(ri, 0)}A${ri},${ri} 0 1 0 ${pt(ri, Math.PI)}A${ri},${ri} 0 1 0 ${pt(ri, 0)}Z`
    );
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${pt(ro, a0)}A${ro},${ro} 0 ${large} 1 ${pt(ro, a1)}L${pt(ri, a1)}A${ri},${ri} 0 ${large} 0 ${pt(ri, a0)}Z`;
}

/** Donut (ring) chart with segments, center label, toggleable legend and tooltip. */
export const DonutChart = React.forwardRef<HTMLDivElement, DonutChartProps>(
  (
    {
      data,
      index,
      valueKey = "value",
      colors,
      colorFor,
      valueFormatter = defaultValueFormatter,
      size = 200,
      thickness,
      padAngle = 1.5,
      centerLabel,
      centerValue,
      legend = "bottom",
      legendValues = false,
      legendInteractive = true,
      iconFor,
      tooltip = true,
      animate = true,
      emptyState,
      label,
      hiddenSeries,
      defaultHiddenSeries,
      onHiddenSeriesChange,
      loading,
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
    const [active, setActive] = React.useState<number | null>(null);
    const [announce, setAnnounce] = React.useState("");
    const palette = colors ?? chartColors;
    const usedKeys = new Set<string>();
    const items = data.map((d, i) => {
      // Duplicate labels still need distinct keys (React keys, legend toggles); the first keeps the plain label.
      const base = String(d[index] ?? i);
      let key = base;
      for (let n = 1; usedKeys.has(key); n++) key = `${base}#${n}`;
      usedKeys.add(key);
      return {
        key,
        label: String(d[index] ?? ""),
        value: Math.max(0, toNumber(d[valueKey]) ?? 0),
        color: resolveChartColor(colorFor?.(d, i) ?? palette[i % palette.length]!),
        i,
      };
    });
    const shown = items.filter((it) => !hidden.includes(it.key));
    const total = shown.reduce((a, b) => a + b.value, 0);
    const ariaLabel =
      label ?? `Donut chart: ${items.map((it) => `${it.label} ${valueFormatter(it.value)}`).join(", ")}`;
    const pct = (v: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : "0%");
    const activeItem = active !== null ? shown.find((s) => s.i === active) ?? null : null;

    const listLegend = !!legend && (!!legendValues || iconFor !== undefined);
    const valueMode = legendValues === true ? "value" : legendValues;
    const legendEl = listLegend ? (
      <BreakdownList
        aria-label="Legend"
        className={legend === "right" ? "min-w-48 flex-1" : "w-full"}
        items={items.map((it) => ({
          key: it.key,
          label: it.label,
          color: it.color,
          icon: iconFor?.(data[it.i]!, it.i),
          value: it.value,
        }))}
        valueFormatter={valueFormatter}
        showValue={valueMode !== "percent" && valueMode !== false}
        showPercent={valueMode === "percent" || valueMode === "both"}
        hiddenSeries={hidden}
        onHiddenSeriesChange={legendInteractive ? setHidden : undefined}
      />
    ) : legend ? (
      <ChartLegend
        items={items.map((it) => ({ key: it.key, label: it.label, color: it.color }))}
        hidden={hidden}
        onHiddenChange={legendInteractive ? setHidden : undefined}
        className={legend === "right" ? "flex-col items-start" : undefined}
        align={legend === "right" ? "start" : "center"}
      />
    ) : null;

    const ro = size / 2 - 4;
    const ri = Math.max(0, ro - (thickness ?? size * 0.14));
    const c = size / 2;

    if (data.length === 0 && loading) {
      return (
        <div
          ref={ref}
          aria-busy="true"
          className={cn(
            "flex w-full gap-4",
            legend === "right" ? cn("flex-row flex-wrap items-center", listLegend ? "justify-start gap-x-6" : "justify-center") : "flex-col items-center",
            className
          )}
          {...props}
        >
          <span className="sr-only">{`Loading ${label ?? "donut chart"}…`}</span>
          <div aria-hidden data-slot="chart-skeleton" className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="block">
              <path d={arcPath(c, c, ro, ri, 0, Math.PI * 2)} className="animate-pulse fill-muted motion-reduce:animate-none" fillRule="evenodd" />
            </svg>
            {centerValue !== null || centerLabel ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                {centerValue !== null ? <Skeleton shape="text" className={size >= 180 ? "h-6" : "h-4"} width={size * 0.3} /> : null}
                {centerLabel ? (
                  <span className="text-xs leading-tight text-muted-foreground">{centerLabel}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          {legend ? (
            <ChartLegendSkeleton
              count={3}
              layout={listLegend ? "rows" : "chips"}
              align={legend === "right" ? "start" : "center"}
              className={listLegend ? (legend === "right" ? "min-w-48 flex-1" : "w-full") : legend === "right" ? "flex-col items-start" : undefined}
            />
          ) : null}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div ref={ref} className={cn("w-full", className)} {...props}>
          <div
            data-slot="chart-empty"
            className="flex items-center justify-center rounded-box border border-dashed border-border text-sm text-muted-foreground"
            style={{ height: size }}
          >
            {emptyState ?? "No data"}
          </div>
        </div>
      );
    }

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (shown.length === 0) return;
      const pos = activeItem ? shown.indexOf(activeItem) : -1;
      let next: number;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = pos < 0 ? 0 : (pos + 1) % shown.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = pos < 0 ? shown.length - 1 : (pos - 1 + shown.length) % shown.length;
      else if (e.key === "Escape") {
        setActive(null);
        setAnnounce("");
        return;
      } else return;
      e.preventDefault();
      const it = shown[next]!;
      setActive(it.i);
      setAnnounce(`${it.label}: ${valueFormatter(it.value)} (${pct(it.value)})`);
    };

    const pad = (padAngle * Math.PI) / 180;
    let angle = 0;
    const arcs = shown.map((it) => {
      const sweep = total > 0 ? (it.value / total) * Math.PI * 2 : 0;
      const a0 = angle;
      angle += sweep;
      const p = shown.length > 1 && sweep > pad * 2 ? pad / 2 : 0;
      return { ...it, a0: a0 + p, a1: a0 + sweep - p, mid: a0 + sweep / 2 };
    });
    const motion = animate ? "motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out" : "";
    const activeArc = arcs.find((a) => a.i === active);

    return (
      <div
        ref={ref}
        aria-busy={loading || undefined}
        className={cn(
          "flex w-full gap-4",
          legend === "right" ? cn("flex-row flex-wrap items-center", listLegend ? "justify-start gap-x-6" : "justify-center") : "flex-col items-center",
          className
        )}
        {...props}
      >
        <ChartContainer
          label={ariaLabel}
          height={size}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className={cn("w-auto shrink-0 rounded-full", focusRing)}
          style={{ width: size }}
          table={{
            columns: [index, valueKey, "Share"],
            rows: items.map((it) => [it.label, valueFormatter(it.value), hidden.includes(it.key) ? "hidden" : pct(it.value)]),
          }}
        >
          <svg width={size} height={size} aria-hidden="true" className="block overflow-visible" onMouseLeave={() => setActive(null)}>
            {total === 0 ? (
              <path d={arcPath(c, c, ro, ri, 0, Math.PI * 2)} className="fill-muted" fillRule="evenodd" />
            ) : null}
            {arcs.map((a) =>
              a.a1 > a.a0 ? (
                <path
                  key={a.key}
                  data-slot="chart-segment"
                  d={arcPath(c, c, a.i === active ? ro + 3 : ro, ri, a.a0, a.a1)}
                  fill={a.color}
                  fillRule="evenodd"
                  opacity={active !== null && a.i !== active ? 0.45 : 1}
                  className={motion}
                  onMouseEnter={() => setActive(a.i)}
                />
              ) : null
            )}
          </svg>
          {centerValue !== null || centerLabel ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {centerValue !== null ? (
                <span
                  data-slot="chart-center-value"
                  className={cn(
                    "font-semibold leading-tight tracking-tight tabular-nums text-foreground",
                    size >= 180 ? "text-display-xs" : size >= 112 ? "text-lg" : "text-base"
                  )}
                >
                  {centerValue ?? valueFormatter(total)}
                </span>
              ) : null}
              {centerLabel ? (
                <span data-slot="chart-center-label" className="text-xs leading-tight text-muted-foreground">
                  {centerLabel}
                </span>
              ) : null}
            </div>
          ) : null}
          {tooltip && activeArc ? (
            <ChartTooltip
              label={activeArc.label}
              items={[{ key: activeArc.key, label: pct(activeArc.value), color: activeArc.color, value: valueFormatter(activeArc.value) }]}
              style={{
                left: c + (ro + 8) * Math.sin(activeArc.mid),
                top: c - (ro + 8) * Math.cos(activeArc.mid),
                transform: `translate(${Math.sin(activeArc.mid) >= 0 ? "0" : "-100%"}, ${Math.cos(activeArc.mid) >= 0 ? "-100%" : "0"})`,
              }}
            />
          ) : null}
        </ChartContainer>
        {legendEl}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announce}
        </div>
      </div>
    );
  }
);
DonutChart.displayName = "DonutChart";
