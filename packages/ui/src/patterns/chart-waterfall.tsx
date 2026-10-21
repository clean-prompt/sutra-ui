/** WaterfallChart: a running total built from increases and decreases, with optional totals. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { Skeleton } from "../primitives/progress";
import type { ChartDatum, ChartReferenceLine, ChartXAxisOptions, ChartYAxisOptions } from "./chart-types";
import { ChartLegendSkeleton, r2, tickFormatter, toNumber, valueFormatterFor } from "./chart-internal";
import { surface } from "./chart-cartesian-internal";
import { resolveChartColor } from "./chart-scale";
import { ChartContainer, ChartLegend, ChartTooltip } from "./chart-container";
import {
  ChartEmptyBox,
  LABEL_CHAR_PX,
  anchorFor,
  fitLabel,
  signed,
  stepIndex,
  tooltipPlacement,
  valueDomain,
  chartMotion,
} from "./chart-extra-internal";

/* ------------------------------------------------------------------------------------------------
 * WaterfallChart
 * ----------------------------------------------------------------------------------------------*/

export type WaterfallKind = "increase" | "decrease" | "total";

export interface WaterfallChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /**
   * One row per step. A row is a change (added to the running total; negative values fall) unless its `type` is
   * `"total"` (or `"subtotal"`): that bar rises from zero to its `value`, or to the running total when it has none.
   */
  data: ChartDatum[];
  /** Key of the step name. Default "label". */
  index?: string;
  /** Key of the step value. Default "value". */
  valueKey?: string;
  /** Key of the step type. Default "type". */
  typeKey?: string;
  /** BCP 47 locale for the default number formatting. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. */
  locale?: string;
  /** Formats a magnitude: changes get their sign added ("+18", "−18"), totals are formatted as they are. */
  valueFormatter?: (value: number) => string;
  /** Bar colors (token names or any CSS color). Defaults: success, destructive, primary. */
  colors?: Partial<Record<WaterfallKind, string>>;
  /** Legend and table wording. Defaults "Increase", "Decrease", "Total". */
  kindLabels?: Partial<Record<WaterfallKind, string>>;
  /** Dashed lines linking each bar to the next. Default true. */
  connectors?: boolean;
  /** Value labels above the bars: `"auto"` (default) shows them when they fit. */
  showValues?: boolean | "auto";
  /** Plot height in px (legend excluded). Default 260. */
  height?: number;
  /** Step name axis: `hide`, `formatter`, `label` (table header) and `tickCount` (a maximum). */
  xAxis?: Pick<ChartXAxisOptions, "hide" | "formatter" | "label" | "tickCount">;
  /** Value-axis options: formatter, domain, tick count, hidden. */
  yAxis?: ChartYAxisOptions;
  /** Horizontal gridlines. Default true. */
  grid?: boolean;
  /** Increase / decrease / total key. Default: shown below when more than one kind is present. */
  legend?: boolean | "top" | "bottom";
  /** Horizontal threshold lines (`axis: "y"` only). */
  referenceLines?: ChartReferenceLine[];
  /**
   * Shows a tooltip with the step value and the running total.
   * @default true
   */
  tooltip?: boolean;
  /** CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. */
  animate?: boolean;
  /** Content shown instead of the chart when there is no data. */
  emptyState?: React.ReactNode;
  /** Accessible name. Defaults to a description built from the steps. */
  label?: string;
  /** Called with the hovered step index (or `null` when the pointer leaves); use it to sync other views. */
  onActiveIndexChange?: (index: number | null) => void;
  /** Data is on its way: with no data, a placeholder plot (and legend) of the same size; with data, the root is marked busy. */
  loading?: boolean;
}

const KINDS: WaterfallKind[] = ["increase", "decrease", "total"];
const DEFAULT_COLORS: Record<WaterfallKind, string> = { increase: "success", decrease: "destructive", total: "primary" };
const DEFAULT_LABELS: Record<WaterfallKind, string> = { increase: "Increase", decrease: "Decrease", total: "Total" };

/** Waterfall chart: floating bars that climb and fall from the running total, with totals, connectors and a signed table. */
export const WaterfallChart = React.forwardRef<HTMLDivElement, WaterfallChartProps>(
  (
    {
      data,
      index = "label",
      valueKey = "value",
      typeKey = "type",
      locale,
      valueFormatter = valueFormatterFor(locale),
      colors,
      kindLabels,
      connectors = true,
      showValues = "auto",
      height = 260,
      xAxis = {},
      yAxis = {},
      grid = true,
      legend,
      referenceLines = [],
      tooltip = true,
      animate = true,
      emptyState,
      label,
      onActiveIndexChange,
      loading,
      className,
      ...props
    },
    ref
  ) => {
    const [active, setActive] = React.useState<number | null>(null);
    const [announce, setAnnounce] = React.useState("");
    const n = data.length;
    const onActiveRef = useLatestRef(onActiveIndexChange);
    React.useEffect(() => {
      onActiveRef.current?.(active);
    }, [active, onActiveRef]);

    const words = { ...DEFAULT_LABELS, ...kindLabels };
    const palette = { ...DEFAULT_COLORS, ...colors };
    const colorOf = (k: WaterfallKind) => resolveChartColor(palette[k]);
    const legendWanted = legend !== false;

    if (n === 0 && loading) {
      return (
        <div ref={ref} aria-busy="true" className={cn("flex w-full flex-col gap-3", className)} {...props}>
          <span className="sr-only">{`Loading ${label ?? "waterfall chart"}…`}</span>
          {legend === "top" ? <ChartLegendSkeleton count={3} /> : null}
          <Skeleton data-slot="chart-skeleton" className="w-full rounded-md" height={height} />
          {legendWanted && legend !== "top" ? <ChartLegendSkeleton count={3} /> : null}
        </div>
      );
    }

    if (n === 0) {
      return (
        <div ref={ref} className={cn("w-full", className)} {...props}>
          <ChartEmptyBox height={height}>{emptyState}</ChartEmptyBox>
        </div>
      );
    }

    let level = 0;
    const steps = data.map((d, i) => {
      const type = String(d[typeKey] ?? "");
      const isTotal = type === "total" || type === "subtotal";
      const raw = toNumber(d[valueKey]);
      const from = isTotal ? 0 : level;
      const to = isTotal ? raw ?? level : level + (raw ?? 0);
      const kind: WaterfallKind = isTotal ? "total" : (raw ?? 0) < 0 ? "decrease" : "increase";
      const change = isTotal ? null : raw ?? 0;
      level = to;
      return { i, label: String(d[index] ?? ""), kind, from, to, change, level: to };
    });
    const kindsPresent = KINDS.filter((k) => steps.some((s) => s.kind === k));
    const legendPos = legend === undefined ? (kindsPresent.length > 1 ? "bottom" : false) : legend === true ? "bottom" : legend;
    const legendEl = legendPos ? (
      <ChartLegend items={kindsPresent.map((k) => ({ key: k, label: words[k], color: colorOf(k) }))} />
    ) : null;

    const fmtChange = (s: (typeof steps)[number]) => (s.change === null ? valueFormatter(s.to) : signed(s.change, valueFormatter));
    const describe = (s: (typeof steps)[number]) =>
      s.change === null ? `${s.label}: ${words.total} ${valueFormatter(s.to)}` : `${s.label}: ${fmtChange(s)}, total ${valueFormatter(s.to)}`;
    const ariaLabel = label ?? `Waterfall chart: ${steps.map((s) => `${s.label} ${fmtChange(s)}`).join(", ")}`;

    let lo = 0;
    let hi = 0;
    for (const s of steps) {
      lo = Math.min(lo, s.from, s.to);
      hi = Math.max(hi, s.from, s.to);
    }
    for (const r of referenceLines) {
      if (r.axis === "x") continue;
      lo = Math.min(lo, r.value);
      hi = Math.max(hi, r.value);
    }
    const { ticks, d0, d1 } = valueDomain(lo, hi, yAxis, true);
    const yFmt = yAxis.formatter ?? tickFormatter(ticks, locale);
    const motion = chartMotion(animate);
    const fmtName = (s: (typeof steps)[number]) => (xAxis.formatter ? xAxis.formatter(data[s.i]![index], s.i) : s.label);

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const next = stepIndex(e.key, active, n);
      if (next === undefined) return;
      e.preventDefault();
      setActive(next);
      setAnnounce(next === null ? "" : describe(steps[next]!));
    };

    return (
      <div ref={ref} aria-busy={loading || undefined} className={cn("flex w-full flex-col gap-3", className)} {...props}>
        {legendPos === "top" ? legendEl : null}
        <ChartContainer
          label={ariaLabel}
          height={height}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className={cn("rounded-md", focusRing)}
          table={{
            columns: [xAxis.label ?? index, "Type", "Change", "Total"],
            rows: steps.map((s) => [fmtName(s), words[s.kind], s.change === null ? "–" : signed(s.change, valueFormatter), valueFormatter(s.to)]),
          }}
        >
          {({ width }) => {
            const left = yAxis.hide ? 4 : yAxis.width ?? 40;
            const bottom = xAxis.hide ? 4 : 22;
            const wantLabels = showValues !== false;
            const top = wantLabels ? 20 : 8;
            const plot = { left, top, width: Math.max(1, width - left - 8), height: Math.max(1, height - top - bottom) };
            const band = plot.width / n;
            const span = d1 - d0 || 1;
            const val = (v: number) => plot.top + plot.height - ((clamp(v, d0, d1) - d0) / span) * plot.height;
            const cx = (i: number) => plot.left + (i + 0.5) * band;
            const barW = clamp(band * 0.68, 2, 64);
            const widest = Math.max(...steps.map((s) => Array.from(fmtChange(s)).length)) * LABEL_CHAR_PX;
            const valuesOn = showValues === true || (showValues === "auto" && widest + 4 <= band);

            // Every step keeps its label while about 8 characters fit; longer names are cut with an ellipsis, then labels thin out.
            const longest = Math.max(...steps.map((s) => Array.from(fmtName(s)).length));
            const every = Math.max(
              1,
              Math.ceil((Math.min(longest * LABEL_CHAR_PX, 48) + 6) / band),
              xAxis.tickCount ? Math.ceil(n / xAxis.tickCount) : 1
            );
            const tickPx = band * every - 6;

            const track = (clientX: number, target: Element) => {
              const rect = (target as SVGElement).ownerSVGElement?.getBoundingClientRect() ?? target.getBoundingClientRect();
              const sx = rect.width > 0 ? width / rect.width : 1;
              setActive(clamp(Math.floor(((clientX - rect.left) * sx - plot.left) / band), 0, n - 1));
            };
            const on = active !== null ? steps[active] : undefined;

            return (
              <>
                <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
                  {ticks.map((t) => {
                    const y = val(t);
                    return (
                      <g key={`v${t}`}>
                        {grid ? <line x1={plot.left} x2={plot.left + plot.width} y1={y} y2={y} className="stroke-border" shapeRendering="crispEdges" /> : null}
                        {!yAxis.hide ? (
                          <text x={plot.left - 8} y={y} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-2xs tabular-nums">
                            {yFmt(t)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  {d0 < 0 && d1 > 0 ? (
                    <line x1={plot.left} x2={plot.left + plot.width} y1={val(0)} y2={val(0)} className="stroke-border-strong" shapeRendering="crispEdges" />
                  ) : null}
                  {!xAxis.hide
                    ? steps
                        .filter((s) => s.i % every === 0)
                        .map((s) => {
                          const full = fmtName(s);
                          const text = fitLabel(full, tickPx);
                          return (
                            <text
                              key={`c${s.i}`}
                              x={cx(s.i)}
                              y={plot.top + plot.height + 16}
                              textAnchor={anchorFor(cx(s.i), text, width)}
                              className="fill-muted-foreground text-2xs"
                            >
                              {text !== full ? <title>{full}</title> : null}
                              {text}
                            </text>
                          );
                        })
                    : null}
                  {on ? (
                    <rect data-slot="chart-active-band" x={cx(on.i) - band / 2} y={plot.top} width={band} height={plot.height} className="fill-foreground/5" />
                  ) : null}
                  {connectors
                    ? steps.slice(0, -1).map((s) => (
                        <line
                          key={`k${s.i}`}
                          data-slot="chart-connector"
                          x1={cx(s.i) + barW / 2}
                          x2={cx(s.i + 1) - barW / 2}
                          y1={val(s.to)}
                          y2={val(s.to)}
                          className="stroke-muted-foreground/60"
                          strokeDasharray="2 2"
                          shapeRendering="crispEdges"
                        />
                      ))
                    : null}
                  {steps.map((s) => {
                    const a = val(Math.max(s.from, s.to));
                    const b = val(Math.min(s.from, s.to));
                    const h = Math.max(2, b - a);
                    return (
                      <rect
                        key={s.i}
                        data-slot="chart-bar"
                        data-kind={s.kind}
                        x={r2(cx(s.i) - barW / 2)}
                        y={r2((a + b) / 2 - h / 2)}
                        width={r2(barW)}
                        height={r2(h)}
                        rx={barW > 6 ? 2 : 0}
                        fill={colorOf(s.kind)}
                        className={motion}
                      />
                    );
                  })}
                  {valuesOn
                    ? steps.map((s) => (
                        <text
                          key={`l${s.i}`}
                          data-slot="chart-value"
                          x={cx(s.i)}
                          y={Math.max(11, val(Math.max(s.from, s.to)) - 5)}
                          textAnchor="middle"
                          className="fill-foreground text-2xs font-medium tabular-nums"
                          style={{ paintOrder: "stroke", stroke: surface, strokeWidth: 3, strokeLinejoin: "round" }}
                        >
                          {fmtChange(s)}
                        </text>
                      ))
                    : null}
                  {referenceLines.map((r, i) => {
                    if (r.axis === "x") return null;
                    const y = val(r.value);
                    const color = resolveChartColor(r.color ?? "muted");
                    return (
                      <g key={`r${i}`} data-slot="chart-reference-line">
                        <line x1={plot.left} x2={plot.left + plot.width} y1={y} y2={y} stroke={color} strokeWidth={1} strokeDasharray={r.dashed === false ? undefined : "4 3"} />
                        {r.label ? (
                          <text
                            x={plot.left + plot.width - 4}
                            y={y - 5}
                            textAnchor="end"
                            className="fill-muted-foreground text-2xs font-medium"
                            style={{ paintOrder: "stroke", stroke: surface, strokeWidth: 3, strokeLinejoin: "round" }}
                          >
                            {r.label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  <rect
                    data-slot="chart-hit"
                    x={plot.left}
                    y={plot.top}
                    width={plot.width}
                    height={plot.height}
                    fill="transparent"
                    onMouseMove={(e) => track(e.clientX, e.currentTarget)}
                    onMouseLeave={() => setActive(null)}
                    onTouchStart={(e) => {
                      const t = e.touches[0];
                      if (t) track(t.clientX, e.currentTarget);
                    }}
                    onTouchMove={(e) => {
                      const t = e.touches[0];
                      if (t) track(t.clientX, e.currentTarget);
                    }}
                  />
                </svg>
                {tooltip && on ? (
                  <ChartTooltip
                    label={fmtName(on)}
                    items={
                      on.change === null
                        ? [{ key: "total", label: words.total, color: colorOf("total"), value: valueFormatter(on.to) }]
                        : [
                            { key: "change", label: words[on.kind], color: colorOf(on.kind), value: fmtChange(on) },
                            { key: "total", label: words.total, color: colorOf("total"), value: valueFormatter(on.to) },
                          ]
                    }
                    style={tooltipPlacement(cx(on.i), val(Math.max(on.from, on.to)), width, height)}
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
WaterfallChart.displayName = "WaterfallChart";
