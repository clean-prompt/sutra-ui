/** Private cartesian chart base shared by AreaChart, LineChart and BarChart. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { chartColorVars } from "../lib/tokens";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useSafeId } from "../hooks/use-safe-id";
import {
  HOUR_MS,
  formatDateTime,
  formatShortDate,
  toMs,
  type TimeInput,
} from "../lib/time";
import { Skeleton } from "../primitives/progress";
import type { CartesianChartProps, ChartDatum, ChartSeries, ChartValue, ChartXAxisType } from "./chart-types";
import { ChartLegendSkeleton, defaultIndexFormatter, defaultValueFormatter, isMidnight, plainFormat, tickFormatter, toNumber } from "./chart-internal";
import { formatTimeTick, niceTicks, resolveChartColor, stackSeries, timeTicks } from "./chart-scale";
import { ChartContainer, ChartLegend, ChartTooltip, type ChartLegendProps, type ChartTableData } from "./chart-container";

/* ------------------------------------------------------------------------------------------------
 * Cartesian base
 * ----------------------------------------------------------------------------------------------*/

type Run = { i: number; v: number }[];

interface ResolvedSeries extends ChartSeries {
  label: string;
  color: string;
  order: number;
}

export interface PlotContext {
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

export const surface = "var(--chart-surface, var(--background))";

export const CartesianChart = React.forwardRef<HTMLDivElement, CartesianInternalProps>(
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
      color: resolveChartColor(s.color ?? chartColorVars[i % chartColorVars.length]!),
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

    const onActiveRef = useLatestRef(onActiveIndexChange);
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
              if (band) return clamp(Math.floor((p - catStart) / bandwidth), 0, n - 1);
              if (n === 1) return 0;
              return clamp(Math.round(((p - catStart) / catLen) * (n - 1)), 0, n - 1);
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

export function activeDots(ctx: PlotContext & { active: number }, stacked: boolean) {
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
