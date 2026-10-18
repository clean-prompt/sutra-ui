import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { toPercent } from "../lib/math";
import { addDays, dateKey, formatShortDate, toValidDate } from "../lib/time";
import { meterLevel, type MeterThresholds } from "../primitives/meter";

/* ------------------------------------------------------------------ */
/* Color scale                                                         */
/* ------------------------------------------------------------------ */

/** Sequential token scales; `thresholds` colors by ok / warn / danger like a Meter. */
export type HeatmapScale = "primary" | "success" | "warning" | "destructive" | "info" | "thresholds";

export interface HeatmapColorStop {
  /** Lower bound (inclusive) at which this color starts. */
  value: number;
  color: string;
  label?: string;
}

export interface HeatmapColorOptions {
  min?: number;
  max?: number;
  scale?: HeatmapScale;
  /** Number of discrete intensity steps above "empty". Default 4. */
  steps?: number;
  /** Custom step stops (overrides `scale`). */
  colorStops?: HeatmapColorStop[];
  thresholds?: MeterThresholds;
}

const scaleVar: Record<Exclude<HeatmapScale, "thresholds">, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
};

const EMPTY_COLOR = "var(--muted)";

/** Discrete level for a value: -1 no data, 0 empty (≤ min), 1…steps. */
export function heatmapLevel(value: number | null | undefined, min = 0, max = 100, steps = 4): number {
  if (value == null || Number.isNaN(value)) return -1;
  if (value <= min) return 0;
  if (max <= min) return steps;
  const t = (value - min) / (max - min);
  return Math.min(steps, Math.max(1, Math.ceil(t * steps)));
}

const mix = (color: string, pct: number) =>
  pct >= 100 ? color : `color-mix(in oklab, ${color} ${pct}%, ${EMPTY_COLOR})`;

const levelPct = (level: number, steps: number) =>
  steps <= 1 ? 100 : Math.round(30 + (70 * (level - 1)) / (steps - 1));

/** Resolve a value to a CSS color using a token scale, thresholds or custom stops. */
export function heatmapColor(value: number | null | undefined, options: HeatmapColorOptions = {}): string {
  const { min = 0, max = 100, scale = "primary", steps = 4, colorStops, thresholds } = options;
  if (value == null || Number.isNaN(value)) return "transparent";
  if (colorStops?.length) {
    const sorted = [...colorStops].sort((a, b) => a.value - b.value);
    let color = EMPTY_COLOR;
    for (const stop of sorted) if (value >= stop.value) color = stop.color;
    return color;
  }
  const level = heatmapLevel(value, min, max, steps);
  if (level <= 0) return EMPTY_COLOR;
  if (scale === "thresholds") {
    const pct = max <= min ? 100 : ((value - min) / (max - min)) * 100;
    const lv = meterLevel(pct, thresholds);
    const base = lv === "danger" ? "var(--destructive)" : lv === "warn" ? "var(--warning)" : "var(--primary)";
    return lv === "ok" ? mix(base, levelPct(level, steps)) : base;
  }
  return mix(scaleVar[scale], levelPct(level, steps));
}

/* ------------------------------------------------------------------ */
/* Shared matrix (grid role + roving focus + floating tooltip)         */
/* ------------------------------------------------------------------ */

interface MatrixCell {
  key: string;
  index: number;
  value: number | null;
  level: number;
  color: string;
  label: string;
  tooltip: React.ReactNode;
  content?: React.ReactNode;
  date?: string;
  /** Bar fill percent (bar shape). */
  fill?: number;
}

type Matrix = (MatrixCell | null)[][];

interface HeatmapMatrixProps {
  matrix: Matrix;
  label: string;
  rowHeaders?: React.ReactNode[];
  rowHeaderWidth?: number;
  columnTemplate: string;
  cellHeight?: number | string;
  gap: number;
  shape: "square" | "bar";
  rounded?: string;
  tooltip: boolean;
  onCellClick?: (cell: MatrixCell) => void;
  header?: React.ReactNode;
  footerLabels?: (MatrixCell | null)[];
  showIndices?: number;
}

function findNext(matrix: Matrix, r: number, c: number, dr: number, dc: number): [number, number] | null {
  let nr = r + dr;
  let nc = c + dc;
  while (nr >= 0 && nr < matrix.length && nc >= 0 && nc < (matrix[nr]?.length ?? 0)) {
    if (matrix[nr][nc]) return [nr, nc];
    nr += dr;
    nc += dc;
  }
  return null;
}

function firstIn(matrix: Matrix, fromEnd = false): [number, number] | null {
  const rows = matrix.map((row, r) => [r, row] as const);
  if (fromEnd) rows.reverse();
  for (const [r, row] of rows) {
    const cols = row.map((_, c) => c);
    if (fromEnd) cols.reverse();
    for (const c of cols) if (row[c]) return [r, c];
  }
  return null;
}

function HeatmapMatrix({
  matrix,
  label,
  rowHeaders,
  rowHeaderWidth = 28,
  columnTemplate,
  cellHeight,
  gap,
  shape,
  rounded = "rounded-xs",
  tooltip,
  onCellClick,
  header,
  showIndices,
}: HeatmapMatrixProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cellRefs = React.useRef(new Map<string, HTMLDivElement>());
  const [focus, setFocus] = React.useState<[number, number] | null>(null);
  const [hover, setHover] = React.useState<{ cell: MatrixCell; x: number; y: number } | null>(null);

  const current = focus && matrix[focus[0]]?.[focus[1]] ? focus : firstIn(matrix);

  const showTip = (cell: MatrixCell, el: HTMLElement | null) => {
    if (!tooltip || !el || !containerRef.current) return;
    const box = containerRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setHover({ cell, x: r.left - box.left + r.width / 2, y: r.top - box.top });
  };

  const moveTo = (pos: [number, number] | null) => {
    if (!pos) return;
    setFocus(pos);
    const cell = matrix[pos[0]][pos[1]];
    if (!cell) return;
    const el = cellRefs.current.get(cell.key) ?? null;
    el?.focus();
    showTip(cell, el);
  };

  const onKeyDown = (e: React.KeyboardEvent, r: number, c: number, cell: MatrixCell) => {
    const row = matrix[r];
    switch (e.key) {
      case "ArrowRight":
        moveTo(findNext(matrix, r, c, 0, 1));
        break;
      case "ArrowLeft":
        moveTo(findNext(matrix, r, c, 0, -1));
        break;
      case "ArrowDown":
        moveTo(findNext(matrix, r, c, 1, 0));
        break;
      case "ArrowUp":
        moveTo(findNext(matrix, r, c, -1, 0));
        break;
      case "Home":
        if (e.ctrlKey || e.metaKey) moveTo(firstIn(matrix));
        else moveTo(row.findIndex(Boolean) >= 0 ? [r, row.findIndex(Boolean)] : null);
        break;
      case "End": {
        if (e.ctrlKey || e.metaKey) moveTo(firstIn(matrix, true));
        else {
          let last = -1;
          row.forEach((x, i) => x && (last = i));
          moveTo(last >= 0 ? [r, last] : null);
        }
        break;
      }
      case "Enter":
        if (!onCellClick) return;
        onCellClick(cell);
        break;
      case " ":
        // Space never scrolls the page from a grid cell.
        onCellClick?.(cell);
        break;
      case "Escape":
        setHover(null);
        return;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div ref={containerRef} className="relative" onMouseLeave={() => setHover(null)}>
      {header}
      <div role="grid" aria-label={label} className="flex flex-col" style={{ gap }}>
        {matrix.map((row, r) => (
          <div key={r} role="row" className="flex items-center" style={{ gap }}>
            {rowHeaders ? (
              <div
                role="rowheader"
                className="shrink-0 truncate pr-1 text-2xs leading-none text-muted-foreground"
                style={{ width: rowHeaderWidth }}
              >
                {rowHeaders[r]}
              </div>
            ) : null}
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: columnTemplate, gap }}>
              {row.map((cell, c) => {
                if (!cell) return <div key={`e${c}`} aria-hidden style={{ height: cellHeight }} />;
                const isCurrent = current?.[0] === r && current?.[1] === c;
                const fillPct = cell.fill ?? 0;
                return (
                  <div
                    key={cell.key}
                    role="gridcell"
                    ref={(el) => {
                      if (el) cellRefs.current.set(cell.key, el);
                      else cellRefs.current.delete(cell.key);
                    }}
                    tabIndex={isCurrent ? 0 : -1}
                    aria-label={cell.label}
                    data-level={cell.level}
                    data-value={cell.value ?? undefined}
                    data-date={cell.date}
                    onKeyDown={(e) => onKeyDown(e, r, c, cell)}
                    onFocus={(e) => {
                      setFocus([r, c]);
                      showTip(cell, e.currentTarget);
                    }}
                    onBlur={() => setHover(null)}
                    onMouseEnter={(e) => showTip(cell, e.currentTarget)}
                    onClick={onCellClick ? () => onCellClick(cell) : undefined}
                    className={cn(
                      "relative flex min-w-0 items-center justify-center overflow-hidden text-2xs tabular-nums transition-[background-color,box-shadow] duration-300",
                      rounded,
                      shape === "square" && "aspect-square",
                      shape === "bar" && "flex-col-reverse justify-start bg-muted",
                      cell.level === -1 && shape === "square" && "border border-dashed border-border-strong",
                      onCellClick && "cursor-pointer",
                      "hover:ring-2 hover:ring-ring/40",
                      focusRing,
                      "focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    style={{
                      height: cellHeight,
                      backgroundColor: shape === "square" ? cell.color : undefined,
                    }}
                  >
                    {shape === "bar" ? (
                      <span
                        aria-hidden
                        className="w-full transition-[height] duration-500"
                        style={{ height: `${fillPct}%`, backgroundColor: cell.color }}
                      />
                    ) : (
                      cell.content
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {showIndices ? (
        <div
          aria-hidden
          className="mt-0.5 grid font-mono text-[9px] leading-none text-muted-foreground"
          style={{ gridTemplateColumns: columnTemplate, gap, marginLeft: rowHeaders ? rowHeaderWidth + gap : 0 }}
        >
          {(matrix[matrix.length - 1] ?? []).map((_, c) => (
            <span key={c} className="text-center">
              {c % showIndices === 0 ? c : ""}
            </span>
          ))}
        </div>
      ) : null}
      {tooltip && hover ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-inverse px-2 py-1 text-xs font-medium text-inverse-foreground shadow-md"
          style={{ left: hover.x, top: hover.y - 6 }}
          data-heatmap-tooltip=""
        >
          {hover.cell.tooltip}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

export interface HeatmapLegendProps extends React.HTMLAttributes<HTMLDivElement> {
  colors: string[];
  lowLabel?: React.ReactNode;
  highLabel?: React.ReactNode;
  stops?: HeatmapColorStop[];
  swatchSize?: number;
}

/** "Less ▢▢▢▢ More" scale legend, or labeled swatches for custom stops. */
export const HeatmapLegend = React.forwardRef<HTMLDivElement, HeatmapLegendProps>(
  ({ className, colors, lowLabel = "Less", highLabel = "More", stops, swatchSize = 10, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-1.5 text-2xs text-muted-foreground", className)} {...props}>
      {stops?.length ? (
        stops.map((s) => (
          <span key={`${s.value}-${s.color}`} className="inline-flex items-center gap-1">
            <span aria-hidden className="rounded-xs" style={{ width: swatchSize, height: swatchSize, backgroundColor: s.color }} />
            {s.label ?? `≥ ${s.value}`}
          </span>
        ))
      ) : (
        <>
          <span>{lowLabel}</span>
          <span className="inline-flex gap-0.5" aria-hidden>
            {colors.map((c, i) => (
              <span key={i} className="rounded-xs" style={{ width: swatchSize, height: swatchSize, backgroundColor: c }} />
            ))}
          </span>
          <span>{highLabel}</span>
        </>
      )}
    </div>
  )
);
HeatmapLegend.displayName = "HeatmapLegend";

function legendColors(options: HeatmapColorOptions): string[] {
  const { min = 0, max = 100, steps = 4 } = options;
  const out = [heatmapColor(min, options)];
  for (let l = 1; l <= steps; l++) out.push(heatmapColor(min + ((max - min) * l) / steps, options));
  return out;
}

/* ------------------------------------------------------------------ */
/* HeatmapGrid                                                         */
/* ------------------------------------------------------------------ */

export interface HeatmapGridCell {
  value: number | null;
  /** Accessible / tooltip label, e.g. "Core 3". */
  label?: string;
  key?: string;
}

export interface HeatmapGridProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">, HeatmapColorOptions {
  data: (number | null | HeatmapGridCell)[];
  /** Cells per row. Default 10. */
  columns?: number;
  /** Fixed cell size in px; default stretches to fill the width. */
  cellSize?: number;
  /** Cell height in px (bars default 40). */
  cellHeight?: number;
  /** Gap between cells in px. Default 3. */
  gap?: number;
  /** square: color-filled tiles · bar: vertical fill bars (per-core CPU). */
  shape?: "square" | "bar";
  /** Accessible name of the grid. */
  label?: string;
  /** Default cell label: `Cell ${i}`. */
  cellLabel?: (index: number) => string;
  formatValue?: (value: number) => string;
  /** Tooltip content; `false` disables. */
  tooltip?: boolean | ((cell: HeatmapGridCell, index: number) => React.ReactNode);
  legend?: boolean;
  legendLabels?: [React.ReactNode, React.ReactNode];
  /** Show column indices below the grid, labelling every Nth (true = every 1). */
  showIndices?: boolean | number;
  onCellClick?: (cell: HeatmapGridCell, index: number) => void;
}

/** Generic value → color cell grid (per-core CPU, per-GPU load, matrices) with keyboard navigation. */
export const HeatmapGrid = React.forwardRef<HTMLDivElement, HeatmapGridProps>(
  (
    {
      className,
      data,
      columns = 10,
      cellSize,
      cellHeight,
      gap = 3,
      shape = "square",
      label = "Heatmap",
      cellLabel = (i) => `Cell ${i}`,
      formatValue = (v) => `${Number(v.toFixed(1))}%`,
      tooltip = true,
      legend = false,
      legendLabels,
      showIndices,
      onCellClick,
      min = 0,
      max = 100,
      scale = shape === "bar" ? "thresholds" : "primary",
      steps = 4,
      colorStops,
      thresholds,
      ...props
    },
    ref
  ) => {
    const colorOpts: HeatmapColorOptions = { min, max, scale, steps, colorStops, thresholds };
    const cells: HeatmapGridCell[] = data.map((d) => (typeof d === "object" && d !== null ? d : { value: d }));
    const cols = Math.max(1, columns);
    const matrix: Matrix = [];
    cells.forEach((cell, i) => {
      const name = cell.label ?? cellLabel(i);
      const text = cell.value == null ? "no data" : formatValue(cell.value);
      const m: MatrixCell = {
        key: cell.key ?? String(i),
        index: i,
        value: cell.value,
        level: heatmapLevel(cell.value, min, max, steps),
        color:
          shape === "bar" && cell.value != null
            ? heatmapColor(Math.max(cell.value, min + (max - min) / 1000), colorOpts)
            : heatmapColor(cell.value, colorOpts),
        fill: cell.value == null ? 0 : toPercent(cell.value, max, min),
        label: `${name}: ${text}`,
        tooltip: typeof tooltip === "function" ? tooltip(cell, i) : `${name}: ${text}`,
      };
      const r = Math.floor(i / cols);
      (matrix[r] ??= []).push(m);
    });
    const template = cellSize ? `repeat(${cols}, ${cellSize}px)` : `repeat(${cols}, minmax(0, 1fr))`;
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <HeatmapMatrix
          matrix={matrix}
          label={label}
          columnTemplate={template}
          cellHeight={cellHeight ?? (shape === "bar" ? 40 : cellSize)}
          gap={gap}
          shape={shape}
          tooltip={tooltip !== false}
          showIndices={showIndices === true ? 1 : showIndices || undefined}
          onCellClick={onCellClick ? (c) => onCellClick(cells[c.index], c.index) : undefined}
        />
        {legend ? (
          <HeatmapLegend
            className="mt-2 justify-end"
            colors={legendColors(colorOpts)}
            stops={colorStops}
            lowLabel={legendLabels?.[0]}
            highLabel={legendLabels?.[1]}
          />
        ) : null}
      </div>
    );
  }
);
HeatmapGrid.displayName = "HeatmapGrid";

/* ------------------------------------------------------------------ */
/* CalendarHeatmap                                                     */
/* ------------------------------------------------------------------ */

export interface CalendarHeatmapDatum {
  /** `YYYY-MM-DD` (local) or a Date. */
  date: string | Date;
  value: number;
}

/** Local `YYYY-MM-DD` key for a date. */
export function calendarDateKey(d: Date): string {
  return dateKey(d);
}

/** Local calendar day: `YYYY-MM-DD` is a local date; a datetime string is an instant, bucketed by its local date like a Date. */
function parseDay(d: string | Date): Date {
  const p = toValidDate(d);
  if (!p) return new Date(NaN);
  return new Date(p.getFullYear(), p.getMonth(), p.getDate());
}

const startOfWeek = (d: Date, weekStartsOn: number) => addDays(d, -((d.getDay() - weekStartsOn + 7) % 7));

export interface CalendarLayout {
  /** weeks[w][weekday] → date or null (outside range). */
  weeks: (Date | null)[][];
  start: Date;
  end: Date;
  monthLabels: { week: number; label: string }[];
}

/** Week-column layout for a year (last 53 weeks ending at `end`) or a single month. */
export function calendarHeatmapLayout(
  mode: "year" | "month",
  anchor: Date,
  weekStartsOn: 0 | 1 = 0,
  locale?: string
): CalendarLayout {
  const a = parseDay(anchor);
  const start = mode === "year" ? addDays(startOfWeek(a, weekStartsOn), -52 * 7) : new Date(a.getFullYear(), a.getMonth(), 1);
  const end = mode === "year" ? a : new Date(a.getFullYear(), a.getMonth() + 1, 0);
  const gridStart = startOfWeek(start, weekStartsOn);
  const weeks: (Date | null)[][] = [];
  for (let d = gridStart, i = 0; d <= end; d = addDays(d, 1), i++) {
    const w = Math.floor(i / 7);
    (weeks[w] ??= Array(7).fill(null))[i % 7] = d < start ? null : d;
  }
  const last = weeks[weeks.length - 1];
  if (last) for (let i = 0; i < 7; i++) if (last[i] && last[i]! > end) last[i] = null;
  const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const monthLabels: { week: number; label: string }[] = [];
  if (mode === "year") {
    weeks.forEach((week, w) => {
      const first = week.find((d) => d && d.getDate() === 1);
      if (first) monthLabels.push({ week: w, label: fmt.format(first) });
    });
    const firstDay = weeks[0]?.find(Boolean);
    if (firstDay && (!monthLabels.length || monthLabels[0].week > 2)) monthLabels.unshift({ week: 0, label: fmt.format(firstDay) });
  }
  return { weeks, start, end, monthLabels };
}

export interface CalendarHeatmapProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">,
    Omit<HeatmapColorOptions, "thresholds"> {
  data: CalendarHeatmapDatum[];
  /** year: last 53 weeks · month: a single month with navigation. */
  mode?: "year" | "month";
  /** Year mode: last day shown. Default today. */
  endDate?: Date | string;
  /** Month mode: controlled month (any date in it). */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  weekStartsOn?: 0 | 1;
  locale?: string;
  /** Cell size in px. Default 11 (year) / 32 (month). */
  cellSize?: number;
  gap?: number;
  label?: string;
  /** Unit noun used in totals, e.g. "contributions". */
  unit?: string;
  formatValue?: (value: number) => string;
  /** Tooltip / accessible text. Default "12 on Oct 3". */
  formatTooltip?: (value: number, date: Date) => string;
  showTotal?: boolean;
  showWeekdayLabels?: boolean;
  showMonthLabels?: boolean;
  legend?: boolean;
  /** Show day numbers inside cells (month mode default). */
  showDayNumbers?: boolean;
  onCellClick?: (date: Date, value: number) => void;
}

/** GitHub-style contribution calendar: week columns, month/weekday labels, totals, month mode. */
export const CalendarHeatmap = React.forwardRef<HTMLDivElement, CalendarHeatmapProps>(
  (
    {
      className,
      data,
      mode = "year",
      endDate,
      month: monthProp,
      defaultMonth,
      onMonthChange,
      weekStartsOn = 0,
      locale,
      cellSize,
      gap = 3,
      label,
      unit,
      formatValue = (v) => v.toLocaleString(locale),
      formatTooltip,
      showTotal = true,
      showWeekdayLabels = true,
      showMonthLabels = true,
      legend = true,
      showDayNumbers,
      onCellClick,
      min = 0,
      max: maxProp,
      scale = "primary",
      steps = 4,
      colorStops,
      ...props
    },
    ref
  ) => {
    const [monthState, setMonthState] = React.useState(() => parseDay(defaultMonth ?? new Date()));
    const month = monthProp ? parseDay(monthProp) : monthState;
    const setMonth = (m: Date) => {
      if (!monthProp) setMonthState(m);
      onMonthChange?.(m);
    };
    const anchor = mode === "year" ? parseDay(endDate ?? new Date()) : month;
    const layout = React.useMemo(
      () => calendarHeatmapLayout(mode, anchor, weekStartsOn, locale),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [mode, calendarDateKey(anchor), weekStartsOn, locale]
    );
    const values = React.useMemo(() => {
      const map = new Map<string, number>();
      for (const d of data) {
        const k = calendarDateKey(parseDay(d.date));
        map.set(k, (map.get(k) ?? 0) + d.value);
      }
      return map;
    }, [data]);

    let total = 0;
    let observedMax = 0;
    for (const week of layout.weeks)
      for (const d of week) {
        if (!d) continue;
        const v = values.get(calendarDateKey(d)) ?? 0;
        total += v;
        observedMax = Math.max(observedMax, v);
      }
    const max = maxProp ?? Math.max(observedMax, 1);
    const colorOpts: HeatmapColorOptions = { min, max, scale, steps, colorStops };
    const fullFmt = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const tip = formatTooltip ?? ((v: number, d: Date) => `${formatValue(v)}${unit ? ` ${unit}` : ""} on ${formatShortDate(d, { locale, year: "never" })}`);
    const dayNumbers = showDayNumbers ?? mode === "month";
    const size = cellSize ?? (mode === "month" ? 32 : 11);

    const matrix: Matrix = Array.from({ length: 7 }, (_, wd) =>
      layout.weeks.map((week, w) => {
        const d = week[wd];
        if (!d) return null;
        const key = calendarDateKey(d);
        const v = values.get(key) ?? 0;
        return {
          key,
          index: w * 7 + wd,
          value: v,
          date: key,
          level: heatmapLevel(v, min, max, steps),
          color: heatmapColor(v, colorOpts),
          label: `${tip(v, d)} (${fullFmt.format(d)})`,
          tooltip: tip(v, d),
          content: dayNumbers ? (
            <span aria-hidden className={cn(heatmapLevel(v, min, max, steps) >= Math.ceil(steps / 2) + 1 ? "text-primary-foreground" : "text-foreground/70")}>
              {d.getDate()}
            </span>
          ) : undefined,
        } satisfies MatrixCell;
      })
    );

    const wdFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const wdLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
    const rowHeaders = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(new Date(2023, 0, 1), (i + weekStartsOn) % 7);
      return (
        <>
          <span aria-hidden>{mode === "year" && i % 2 === 0 ? "" : wdFmt.format(day)}</span>
          <span className="sr-only">{wdLong.format(day)}</span>
        </>
      );
    });
    const headerWidth = showWeekdayLabels ? (mode === "month" ? 34 : 28) : 0;
    const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
    const totalText = `${formatValue(total)}${unit ? ` ${unit}` : ""} ${mode === "year" ? "in the last year" : `in ${monthTitle}`}`;

    const monthHeader =
      showMonthLabels && mode === "year" ? (
        <div aria-hidden className="relative mb-1 h-3.5 text-2xs leading-none text-muted-foreground" style={{ marginLeft: headerWidth ? headerWidth + gap : 0 }}>
          {layout.monthLabels.map((m) => (
            <span key={`${m.week}-${m.label}`} className="absolute top-0" style={{ left: m.week * (size + gap) }}>
              {m.label}
            </span>
          ))}
        </div>
      ) : null;

    return (
      <div ref={ref} className={cn("inline-flex max-w-full flex-col gap-2", className)} {...props}>
        {mode === "month" ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className={cn("inline-flex size-7 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
            >
              <RiArrowLeftSLine aria-hidden className="size-4" />
            </button>
            <span className="text-sm font-medium" aria-live="polite">
              {monthTitle}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className={cn("inline-flex size-7 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
            >
              <RiArrowRightSLine aria-hidden className="size-4" />
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto scrollbar-thin pb-1">
          <div style={{ width: headerWidth + (headerWidth ? gap : 0) + layout.weeks.length * (size + gap) - gap }}>
            <HeatmapMatrix
              matrix={matrix}
              label={label ?? (mode === "year" ? "Activity in the last year" : `Activity in ${monthTitle}`)}
              rowHeaders={showWeekdayLabels ? rowHeaders : undefined}
              rowHeaderWidth={headerWidth}
              columnTemplate={`repeat(${layout.weeks.length}, ${size}px)`}
              cellHeight={size}
              gap={gap}
              shape="square"
              rounded={mode === "month" ? "rounded-sm" : "rounded-xs"}
              tooltip
              header={monthHeader}
              onCellClick={onCellClick ? (c) => onCellClick(parseDay(c.date!), c.value ?? 0) : undefined}
            />
          </div>
        </div>
        {showTotal || legend ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {showTotal ? <span className="text-xs text-muted-foreground" data-calendar-total="">{totalText}</span> : <span />}
            {legend ? <HeatmapLegend colors={legendColors(colorOpts)} stops={colorStops} /> : null}
          </div>
        ) : null}
      </div>
    );
  }
);
CalendarHeatmap.displayName = "CalendarHeatmap";
