/** ScatterChart: points on two numeric (or time) axes, with an optional bubble size per series. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { chartColorVars } from "../lib/tokens";
import { DAY_MS, formatDateTime, formatShortDate, toMs } from "../lib/time";
import { useControllableState } from "../hooks/use-controllable-state";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useSafeId } from "../hooks/use-safe-id";
import { Skeleton } from "../primitives/progress";
import type { ChartDatum, ChartReferenceLine, ChartSeries, ChartValue, ChartXAxisOptions, ChartYAxisOptions } from "./chart-types";
import { ChartLegendSkeleton, formatPlain, r2, tickFormatter, toNumber, valueFormatterFor } from "./chart-internal";
import { surface } from "./chart-cartesian-internal";
import { formatTimeTick, niceTicks, resolveChartColor, timeTicks } from "./chart-scale";
import { ChartContainer, ChartLegend, ChartTooltip, type ChartTableData } from "./chart-container";
import { ChartEmptyBox, anchorFor, tooltipPlacement, valueDomain, chartMotion } from "./chart-extra-internal";

/* ------------------------------------------------------------------------------------------------
 * ScatterChart
 * ----------------------------------------------------------------------------------------------*/

export interface ScatterSeries extends Omit<ChartSeries, "connectNulls"> {
  /** Datum key that sets the bubble size: the bubble's area (not its radius) is proportional to it. */
  sizeKey?: string;
  /** Name of the size in the tooltip and table. Defaults to `sizeKey`. */
  sizeLabel?: string;
}

/** The x axis of a scatter chart: numbers (`"linear"`, default) or times (`"time"`). */
export type ScatterXAxisOptions = Pick<ChartXAxisOptions, "hide" | "domain" | "tickCount" | "formatter" | "label"> & {
  type?: "linear" | "time";
};

export interface ScatterChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** One row per observation: an x value plus a y value for each series (and a size when `sizeKey` is set). */
  data: ChartDatum[];
  /** Key of the x value in each datum. */
  index: string;
  /** Series to draw; each has a `key`, a `label` and an optional colour and size field. */
  series: ScatterSeries[];
  /** BCP 47 locale for the default number and date formatting. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. */
  locale?: string;
  /** Formats y values. */
  valueFormatter?: (value: number, seriesKey: string) => string;
  /** Formats bubble sizes (tooltip and table). */
  sizeFormatter?: (value: number, seriesKey: string) => string;
  /** Plot height in px (legend excluded). Default 280. */
  height?: number;
  /** X-axis options (hide, domain, tick count, formatter). */
  xAxis?: ScatterXAxisOptions;
  /** Value axis. Unlike bar and area charts it fits the data: it only includes 0 when `min` says so. */
  yAxis?: ChartYAxisOptions;
  /** Gridlines. Default both. */
  grid?: boolean | "horizontal" | "vertical" | "both";
  /** Radius in px of the smallest and the largest bubble. Default: 4 up to 22 on a wide chart, a smaller maximum as it narrows. */
  bubbleSize?: [number, number];
  /** Radius in px of points that have no `sizeKey`. Default 4.5. */
  pointSize?: number;
  /** Default: shown below for 2+ series. */
  legend?: boolean | "top" | "bottom";
  /** Allow toggling/isolating series from the legend. Default true. */
  legendInteractive?: boolean;
  /** Threshold lines: horizontal at a value, or vertical (`axis: "x"`) at an x value. */
  referenceLines?: ChartReferenceLine[];
  /**
   * Shows a tooltip with the hovered point.
   * @default true
   */
  tooltip?: boolean;
  /** CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. */
  animate?: boolean;
  /** Content shown instead of the plot when there is no data. */
  emptyState?: React.ReactNode;
  /** Accessible name. Defaults to a description built from the series. */
  label?: string;
  /** Controlled list of hidden series keys (toggled from the legend). Use with `onHiddenSeriesChange`. */
  hiddenSeries?: string[];
  /** Initially hidden series keys when uncontrolled. */
  defaultHiddenSeries?: string[];
  /** Called with the hidden series keys when a legend entry is toggled. */
  onHiddenSeriesChange?: (hidden: string[]) => void;
  /** The point under the pointer or keyboard focus: its series key and index in `data`, or null. */
  onActivePointChange?: (point: { seriesKey: string; index: number } | null) => void;
  /** Data is on its way: with no data, a placeholder plot (and legend) of the same size; with data, the root is marked busy. */
  loading?: boolean;
}

interface Pt {
  sKey: string;
  s: number;
  i: number;
  x: number;
  y: number;
  size: number | null;
}

const sameKey = (a: { sKey: string; i: number } | null, b: { sKey: string; i: number }) => !!a && a.sKey === b.sKey && a.i === b.i;

/** Scatter (and bubble) chart: nearest-point hover, keyboard stepping in x order, toggleable series and reference lines. */
export const ScatterChart = React.forwardRef<HTMLDivElement, ScatterChartProps>(
  (
    {
      data,
      index,
      series,
      locale,
      valueFormatter = valueFormatterFor(locale),
      sizeFormatter = valueFormatterFor(locale),
      height = 280,
      xAxis = {},
      yAxis = {},
      grid = "both",
      bubbleSize,
      pointSize = 4.5,
      legend,
      legendInteractive = true,
      referenceLines = [],
      tooltip = true,
      animate = true,
      emptyState,
      label,
      hiddenSeries,
      defaultHiddenSeries,
      onHiddenSeriesChange,
      onActivePointChange,
      loading,
      className,
      ...props
    },
    ref
  ) => {
    const uid = useSafeId("sutra-scatter");
    const [hidden, setHidden] = useControllableState<string[]>({
      value: hiddenSeries,
      defaultValue: defaultHiddenSeries ?? [],
      onChange: onHiddenSeriesChange,
    });
    const [activeRaw, setActive] = React.useState<{ sKey: string; i: number } | null>(null);
    const [announce, setAnnounce] = React.useState("");
    const n = data.length;
    const onActiveRef = useLatestRef(onActivePointChange);
    React.useEffect(() => {
      onActiveRef.current?.(activeRaw ? { seriesKey: activeRaw.sKey, index: activeRaw.i } : null);
    }, [activeRaw?.sKey, activeRaw?.i, onActiveRef]);
    const timeAxis = xAxis.type === "time";

    const resolved = series.map((s, i) => ({
      ...s,
      label: s.label ?? s.key,
      color: resolveChartColor(s.color ?? chartColorVars[i % chartColorVars.length]!),
      order: i,
    }));
    const visible = resolved.filter((s) => !hidden.includes(s.key));
    const legendPos = legend === undefined ? (series.length > 1 ? "bottom" : false) : legend === true ? "bottom" : legend;
    const legendEl = legendPos ? (
      <ChartLegend
        items={resolved.map((s) => ({ key: s.key, label: s.label, color: s.color }))}
        hidden={hidden}
        onHiddenChange={legendInteractive ? setHidden : undefined}
        marker="dot"
      />
    ) : null;

    if (n === 0 && loading) {
      const skeleton = legendPos ? <ChartLegendSkeleton count={Math.max(1, series.length)} /> : null;
      return (
        <div ref={ref} aria-busy="true" className={cn("flex w-full flex-col gap-3", className)} {...props}>
          <span className="sr-only">{`Loading ${label ?? "scatter chart"}…`}</span>
          {legendPos === "top" ? skeleton : null}
          <Skeleton data-slot="chart-skeleton" className="w-full rounded-md" height={height} />
          {legendPos === "bottom" ? skeleton : null}
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

    // X scale: numbers or times, fitted to the data unless `domain` fixes it. Points outside a fixed domain are not drawn.
    const readX = (v: ChartValue | "auto" | undefined): number | undefined =>
      v === undefined || v === "auto" ? undefined : timeAxis ? toMs(v) : toNumber(v as ChartValue) ?? undefined;
    const xOf = (d: ChartDatum) => (timeAxis ? toMs(d[index]) ?? null : toNumber(d[index]));
    const xs = data.map(xOf);
    let dataLo = Infinity;
    let dataHi = -Infinity;
    for (const x of xs)
      if (x !== null) {
        dataLo = Math.min(dataLo, x);
        dataHi = Math.max(dataHi, x);
      }
    if (!Number.isFinite(dataLo)) {
      dataLo = 0;
      dataHi = 1;
    }
    const fixedLo = readX(xAxis.domain?.[0]);
    const fixedHi = readX(xAxis.domain?.[1]);
    let x0 = fixedLo ?? dataLo;
    let x1 = fixedHi ?? dataHi;
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (x0 === x1) {
      const pad = timeAxis ? DAY_MS / 2 : Math.abs(x0) * 0.1 || 1;
      x0 -= pad;
      x1 += pad;
    } else if (!timeAxis && (fixedLo === undefined || fixedHi === undefined)) {
      const t = niceTicks(x0, x1, 6);
      if (fixedLo === undefined) x0 = Math.min(x0, t[0]!);
      if (fixedHi === undefined) x1 = Math.max(x1, t[t.length - 1]!);
    }

    // Points in x order (ties by y, then series), limited to the visible series and the x domain.
    const maxSize = Math.max(0, ...resolved.flatMap((s) => (s.sizeKey ? data.map((d) => toNumber(d[s.sizeKey!]) ?? 0) : [])));
    const bubbles = resolved.some((s) => s.sizeKey);
    const pts: Pt[] = [];
    for (const s of visible)
      data.forEach((d, i) => {
        const x = xs[i];
        const y = toNumber(d[s.key]);
        if (x === null || x === undefined || y === null || x < x0 || x > x1) return;
        const size = s.sizeKey ? Math.max(0, toNumber(d[s.sizeKey]) ?? 0) : null;
        pts.push({ sKey: s.key, s: s.order, i, x, y, size });
      });
    pts.sort((a, b) => a.x - b.x || a.y - b.y || a.s - b.s);

    let lo = Infinity;
    let hi = -Infinity;
    for (const p of pts) {
      lo = Math.min(lo, p.y);
      hi = Math.max(hi, p.y);
    }
    for (const r of referenceLines) {
      if (r.axis === "x") continue;
      lo = Math.min(lo, r.value);
      hi = Math.max(hi, r.value);
    }
    const { ticks: yTicks, d0, d1 } = valueDomain(lo, hi, yAxis, false);
    const yFmt = yAxis.formatter ?? tickFormatter(yTicks, locale);
    const clippedY = (y: number) => y < d0 || y > d1;
    const shown = pts.filter((p) => !clippedY(p.y));

    const active = activeRaw ? shown.find((p) => sameKey(activeRaw, p)) ?? null : null;

    let detail: "date" | "minutes" = "date";
    if (timeAxis)
      for (const x of xs) {
        const d = x === null ? null : new Date(x);
        if (d && (d.getHours() || d.getMinutes() || d.getSeconds())) detail = "minutes";
      }
    const fmtX = (x: number, i: number) => {
      if (xAxis.formatter) return xAxis.formatter(timeAxis ? new Date(x) : x, i);
      if (timeAxis) return detail === "date" ? formatShortDate(x, { locale }) : formatDateTime(x, { locale });
      return formatPlain(x, locale);
    };
    const seriesOf = (p: Pt) => resolved[p.s]!;
    const describe = (p: Pt) => {
      const s = seriesOf(p);
      const size = p.size !== null && s.sizeKey ? `, ${s.sizeLabel ?? s.sizeKey} ${sizeFormatter(p.size, s.key)}` : "";
      return `${xAxis.label ?? index} ${fmtX(p.x, p.i)}: ${s.label} ${valueFormatter(p.y, s.key)}${size}`;
    };
    const ariaLabel = label ?? `Scatter chart of ${resolved.map((s) => s.label).join(", ")} by ${xAxis.label ?? index}`;

    const table: ChartTableData = {
      columns: [
        xAxis.label ?? index,
        ...visible.flatMap((s) => (s.sizeKey ? [s.label, s.sizeLabel ?? s.sizeKey] : [s.label])),
      ],
      rows: data.map((d, i) => [
        xs[i] === null || xs[i] === undefined ? String(d[index] ?? "") : fmtX(xs[i]!, i),
        ...visible.flatMap((s) => {
          const y = toNumber(d[s.key]);
          const cells = [y === null ? "–" : valueFormatter(y, s.key)];
          if (s.sizeKey) {
            const z = toNumber(d[s.sizeKey]);
            cells.push(z === null ? "–" : sizeFormatter(z, s.key));
          }
          return cells;
        }),
      ]),
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (shown.length === 0) return;
      const at = active ? shown.indexOf(active) : -1;
      let next: number | null;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = at < 0 ? 0 : (at + 1) % shown.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = at < 0 ? shown.length - 1 : (at - 1 + shown.length) % shown.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = shown.length - 1;
          break;
        case "Escape":
          next = null;
          break;
        default:
          return;
      }
      e.preventDefault();
      const p = next === null ? null : shown[next]!;
      setActive(p ? { sKey: p.sKey, i: p.i } : null);
      setAnnounce(p ? describe(p) : "");
    };

    const motion = chartMotion(animate);

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
            const left = yAxis.hide ? 4 : yAxis.width ?? 40;
            const [rMin, rMax] = bubbleSize
              ? [Math.max(1, Math.min(...bubbleSize)), Math.max(1, Math.max(...bubbleSize))]
              : [4, clamp(Math.round((width - left) / 22), 10, 22)];
            const bottom = xAxis.hide ? 4 : 22;
            const top = 10;
            const right = 12 + (bubbles ? Math.round(rMax / 2) : 0);
            const plot = { left, top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - bottom) };
            const px = (x: number) => plot.left + ((x - x0) / (x1 - x0)) * plot.width;
            const py = (y: number) => plot.top + plot.height - ((y - d0) / (d1 - d0 || 1)) * plot.height;
            const radius = (p: Pt) =>
              p.size === null ? pointSize : maxSize > 0 ? Math.max(rMin, Math.min(rMax, rMax * Math.sqrt(p.size / maxSize))) : rMin;

            // X ticks: at most one per ~70px, thinned further when the labels are long.
            let xTicks: number[] = [];
            let xFmt: (v: number) => string = String;
            let count = clamp(Math.floor(plot.width / 70), 2, xAxis.tickCount ?? 8);
            for (let attempt = 0; attempt < 4; attempt++) {
              if (timeAxis) {
                const tt = timeTicks(x0, x1, count);
                xTicks = tt.ticks;
                xFmt = xAxis.formatter ? (v) => xAxis.formatter!(new Date(v), -1) : (v) => formatTimeTick(v, tt.unit, locale);
              } else {
                const e = (x1 - x0) * 1e-9;
                xTicks = niceTicks(x0, x1, count).filter((t) => t >= x0 - e && t <= x1 + e);
                xFmt = xAxis.formatter ? (v) => xAxis.formatter!(v, -1) : tickFormatter(xTicks, locale);
              }
              const widest = xTicks.reduce((m, v) => Math.max(m, xFmt(v).length), 0) * 6.4 + 14;
              if (xTicks.length <= 2 || count <= 2 || plot.width / xTicks.length >= widest) break;
              count = Math.max(2, Math.min(count - 1, Math.floor(plot.width / widest)));
            }

            const pad = Math.ceil(rMax) + 2;
            const clip = {
              x: Math.max(0, plot.left - pad),
              y: Math.max(0, plot.top - pad),
              width: Math.min(width, plot.left + plot.width + pad) - Math.max(0, plot.left - pad),
              height: Math.min(height, plot.top + plot.height + pad) - Math.max(0, plot.top - pad),
            };
            const showH = grid === true || grid === "horizontal" || grid === "both";
            const showV = grid === true || grid === "vertical" || grid === "both";

            const track = (clientX: number, clientY: number, target: Element) => {
              const svg = (target as SVGElement).ownerSVGElement ?? target;
              const rect = svg.getBoundingClientRect();
              const mx = (clientX - rect.left) * (rect.width > 0 ? width / rect.width : 1);
              const my = (clientY - rect.top) * (rect.height > 0 ? height / rect.height : 1);
              let best: Pt | null = null;
              let bestD = 20;
              for (const p of shown) {
                const d = Math.hypot(px(p.x) - mx, py(p.y) - my) - radius(p);
                if (d <= bestD) {
                  best = p;
                  bestD = d;
                }
              }
              setActive(best ? { sKey: best.sKey, i: best.i } : null);
            };

            // Big bubbles first, so small ones stay on top and clickable.
            const drawn = [...shown].sort((a, b) => radius(b) - radius(a));

            return (
              <>
                <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
                  {yTicks.map((t) => (
                    <g key={`y${t}`}>
                      {showH ? <line x1={plot.left} x2={plot.left + plot.width} y1={py(t)} y2={py(t)} className="stroke-border" shapeRendering="crispEdges" /> : null}
                      {!yAxis.hide ? (
                        <text x={plot.left - 8} y={py(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-2xs tabular-nums">
                          {yFmt(t)}
                        </text>
                      ) : null}
                    </g>
                  ))}
                  {xTicks.map((t) => {
                    const text = xFmt(t);
                    return (
                      <g key={`x${t}`}>
                        {showV ? <line x1={px(t)} x2={px(t)} y1={plot.top} y2={plot.top + plot.height} className="stroke-border" shapeRendering="crispEdges" /> : null}
                        {!xAxis.hide ? (
                          <text x={px(t)} y={plot.top + plot.height + 16} textAnchor={anchorFor(px(t), text, width)} className="fill-muted-foreground text-2xs">
                            {text}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  <defs>
                    <clipPath id={`${uid}-clip`}>
                      <rect x={clip.x} y={clip.y} width={Math.max(0, clip.width)} height={Math.max(0, clip.height)} />
                    </clipPath>
                  </defs>
                  <g data-slot="chart-marks" clipPath={`url(#${uid}-clip)`}>
                    {drawn.map((p) => {
                      const s = seriesOf(p);
                      const isBubble = p.size !== null;
                      return (
                        <circle
                          key={`${p.sKey}:${p.i}`}
                          data-slot="chart-point"
                          data-series={p.sKey}
                          cx={r2(px(p.x))}
                          cy={r2(py(p.y))}
                          r={r2(radius(p))}
                          fill={s.color}
                          fillOpacity={isBubble ? 0.5 : 0.85}
                          stroke={isBubble ? s.color : surface}
                          strokeWidth={isBubble ? 1.5 : 1}
                          className={motion}
                        />
                      );
                    })}
                  </g>
                  {referenceLines.map((r, i) => {
                    const color = resolveChartColor(r.color ?? "muted");
                    const dash = r.dashed === false ? undefined : "4 3";
                    if (r.axis === "x") {
                      const x = readX(r.value as ChartValue);
                      if (x === undefined || x < x0 || x > x1) return null;
                      const p = px(x);
                      const end = plot.left + plot.width - p < 48;
                      return (
                        <g key={`r${i}`} data-slot="chart-reference-line">
                          <line x1={p} x2={p} y1={plot.top} y2={plot.top + plot.height} stroke={color} strokeWidth={1} strokeDasharray={dash} />
                          {r.label ? (
                            <text x={end ? p - 4 : p + 4} y={plot.top + 10} textAnchor={end ? "end" : "start"} className="fill-muted-foreground text-2xs font-medium">
                              {r.label}
                            </text>
                          ) : null}
                        </g>
                      );
                    }
                    if (r.value < d0 || r.value > d1) return null;
                    const y = py(r.value);
                    return (
                      <g key={`r${i}`} data-slot="chart-reference-line">
                        <line x1={plot.left} x2={plot.left + plot.width} y1={y} y2={y} stroke={color} strokeWidth={1} strokeDasharray={dash} />
                        {r.label ? (
                          <text x={plot.left + plot.width - 4} y={y - 5} textAnchor="end" className="fill-muted-foreground text-2xs font-medium">
                            {r.label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  {active ? (
                    <circle
                      data-slot="chart-active-point"
                      cx={r2(px(active.x))}
                      cy={r2(py(active.y))}
                      r={r2(radius(active) + 3)}
                      fill="none"
                      className="stroke-foreground"
                      strokeWidth={2}
                    />
                  ) : null}
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
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">All series hidden</div>
                ) : null}
                {tooltip && active ? (
                  <ChartTooltip
                    label={`${xAxis.label ?? index}: ${fmtX(active.x, active.i)}`}
                    items={[
                      { key: "y", label: seriesOf(active).label, color: seriesOf(active).color, value: valueFormatter(active.y, active.sKey) },
                      ...(active.size !== null && seriesOf(active).sizeKey
                        ? [
                            {
                              key: "size",
                              label: seriesOf(active).sizeLabel ?? seriesOf(active).sizeKey!,
                              color: seriesOf(active).color,
                              value: sizeFormatter(active.size, active.sKey),
                            },
                          ]
                        : []),
                    ]}
                    style={tooltipPlacement(px(active.x), py(active.y), width, height)}
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
ScatterChart.displayName = "ScatterChart";
