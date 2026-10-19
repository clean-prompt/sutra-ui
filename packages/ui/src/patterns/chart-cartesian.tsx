/** Cartesian charts: AreaChart, LineChart and BarChart. */
import * as React from "react";
import { cn } from "../lib/cn";
import { linearPath as linearPathOf } from "../lib/svg-path";
import type { CartesianChartProps, ChartCurve, ChartDatum } from "./chart-types";
import { r2, toNumber, type Point } from "./chart-internal";
import { monotonePath, resolveChartColor } from "./chart-scale";
import { CartesianChart, activeDots, surface } from "./chart-cartesian-internal";

const linearPath = (points: readonly Point[]) => linearPathOf(points, r2);

function stepPath(points: readonly Point[]) {
  if (points.length === 0) return "";
  let d = `M${r2(points[0]![0])},${r2(points[0]![1])}`;
  for (let i = 1; i < points.length; i++) d += `H${r2(points[i]![0])}V${r2(points[i]![1])}`;
  return d;
}

function curvePath(points: readonly Point[], curve: ChartCurve) {
  return curve === "monotone" ? monotonePath(points) : curve === "step" ? stepPath(points) : linearPath(points);
}

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
