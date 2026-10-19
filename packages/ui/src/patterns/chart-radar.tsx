/** RadarChart: several measures on spokes from a common center, one polygon per series. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { chartColorVars } from "../lib/tokens";
import { useControllableState } from "../hooks/use-controllable-state";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { Skeleton } from "../primitives/progress";
import type { ChartDatum, ChartSeries } from "./chart-types";
import { ChartLegendSkeleton, defaultValueFormatter, r2, tickFormatter, toNumber } from "./chart-internal";
import { surface } from "./chart-cartesian-internal";
import { resolveChartColor } from "./chart-scale";
import { ChartContainer, ChartLegend, ChartTooltip, type ChartTableData } from "./chart-container";
import { ChartEmptyBox, LABEL_CHAR_PX, fitLabel, stepIndex, tooltipPlacement, valueDomain, chartMotion } from "./chart-extra-internal";

/* ------------------------------------------------------------------------------------------------
 * RadarChart
 * ----------------------------------------------------------------------------------------------*/

export type RadarSeries = Omit<ChartSeries, "connectNulls">;

export interface RadarChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** One row per spoke (a measure), with a value for each series. */
  data: ChartDatum[];
  /** Key of the spoke name in each datum. */
  index: string;
  /** One polygon per series. */
  series: RadarSeries[];
  valueFormatter?: (value: number, seriesKey: string) => string;
  /**
   * Value range from the center to the rim: `[min, max]`, either end may be `"auto"` (fit the data). Default: from
   * 0 (or the lowest value, when negative) up to a round number above the highest.
   */
  domain?: [number | "auto", number | "auto"];
  /** Approximate number of grid rings. Default 4. */
  levels?: number;
  /** Grid rings as polygons (default) or circles. Fewer than three spokes always use circles. */
  shape?: "polygon" | "circle";
  /** Tint the inside of each polygon. Default true. */
  fill?: boolean;
  /** Mark each value on its spoke. Default true. */
  dots?: boolean;
  /** Print the ring values between the first two spokes. Default true. */
  levelLabels?: boolean;
  /** Plot height in px (legend excluded). Default 320. */
  height?: number;
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
  hiddenSeries?: string[];
  defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (hidden: string[]) => void;
  /** The spoke under the pointer or keyboard focus (index in `data`), or null. */
  onActiveIndexChange?: (index: number | null) => void;
  /** Data is on its way: with no data, a placeholder radar (and legend) of the same size; with data, the root is marked busy. */
  loading?: boolean;
}

/** Radar (spider) chart: polygon rings, labelled spokes, toggleable series, spoke-by-spoke keyboard and a tooltip per spoke. */
export const RadarChart = React.forwardRef<HTMLDivElement, RadarChartProps>(
  (
    {
      data,
      index,
      series,
      valueFormatter = defaultValueFormatter,
      domain,
      levels = 4,
      shape = "polygon",
      fill = true,
      dots = true,
      levelLabels = true,
      height = 320,
      legend,
      legendInteractive = true,
      tooltip = true,
      animate = true,
      emptyState,
      label,
      hiddenSeries,
      defaultHiddenSeries,
      onHiddenSeriesChange,
      onActiveIndexChange,
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
    const n = data.length;
    const onActiveRef = useLatestRef(onActiveIndexChange);
    React.useEffect(() => {
      onActiveRef.current?.(active);
    }, [active, onActiveRef]);

    const resolved = series.map((s, i) => ({
      ...s,
      label: s.label ?? s.key,
      color: resolveChartColor(s.color ?? chartColorVars[i % chartColorVars.length]!),
    }));
    const visible = resolved.filter((s) => !hidden.includes(s.key));
    const legendPos = legend === undefined ? (series.length > 1 ? "bottom" : false) : legend === true ? "bottom" : legend;
    const legendEl = legendPos ? (
      <ChartLegend
        items={resolved.map((s) => ({ key: s.key, label: s.label, color: s.color }))}
        hidden={hidden}
        onHiddenChange={legendInteractive ? setHidden : undefined}
      />
    ) : null;

    if (n === 0 && loading) {
      const skeleton = legendPos ? <ChartLegendSkeleton count={Math.max(1, series.length)} align="center" /> : null;
      const hex = Array.from({ length: 6 }, (_, i) => `${50 + 46 * Math.sin((i * Math.PI) / 3)},${50 - 46 * Math.cos((i * Math.PI) / 3)}`).join(" ");
      return (
        <div ref={ref} aria-busy="true" className={cn("flex w-full flex-col gap-3", className)} {...props}>
          <span className="sr-only">{`Loading ${label ?? "radar chart"}…`}</span>
          {legendPos === "top" ? skeleton : null}
          <div aria-hidden data-slot="chart-skeleton" className="flex w-full justify-center" style={{ height }}>
            <svg viewBox="0 0 100 100" className="h-full max-w-full">
              <polygon points={hex} className="animate-pulse fill-muted motion-reduce:animate-none" />
            </svg>
          </div>
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

    const names = data.map((d, i) => String(d[index] ?? i));
    const valueOf = (i: number, key: string) => toNumber(data[i]?.[key]);
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of visible)
      for (let i = 0; i < n; i++) {
        const v = valueOf(i, s.key);
        if (v !== null) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    const { ticks, d0, d1 } = valueDomain(lo, hi, { domain, tickCount: Math.max(2, levels + 1) }, true);
    const fmtTick = tickFormatter(ticks);
    const describe = (i: number) =>
      `${names[i]}: ${visible.map((s) => `${s.label} ${valueOf(i, s.key) === null ? "–" : valueFormatter(valueOf(i, s.key)!, s.key)}`).join(", ")}`;
    const ariaLabel = label ?? `Radar chart of ${resolved.map((s) => s.label).join(", ")} across ${names.join(", ")}`;
    const table: ChartTableData = {
      columns: [index, ...visible.map((s) => s.label)],
      rows: names.map((name, i) => [
        name,
        ...visible.map((s) => {
          const v = valueOf(i, s.key);
          return v === null ? "–" : valueFormatter(v, s.key);
        }),
      ]),
    };
    const motion = chartMotion(animate);

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const next = stepIndex(e.key, active, n);
      if (next === undefined) return;
      e.preventDefault();
      setActive(next);
      setAnnounce(next === null ? "" : describe(next));
    };

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
            // Side margin from the labels that sit beside the chart; labels at the top and bottom only need height.
            const sideLongest = Math.max(0, ...names.map((s, i) => (Math.abs(Math.sin(i * ((Math.PI * 2) / n))) > 0.3 ? Array.from(s).length : 0)));
            const mx = clamp(Math.min(sideLongest * LABEL_CHAR_PX, 112) + 12, 28, width * 0.3);
            const cx = width / 2;
            const cy = height / 2;
            const R = Math.max(24, Math.min(width / 2 - mx, height / 2 - 24));
            const step = (Math.PI * 2) / n;
            const at = (i: number, r: number) => ({ x: cx + r * Math.sin(i * step), y: cy - r * Math.cos(i * step) });
            const span = d1 - d0 || 1;
            const rOf = (v: number) => clamp((v - d0) / span, 0, 1) * R;
            const ring = (t: number) => {
              const r = rOf(t);
              return n < 3 || shape === "circle" ? null : names.map((_, i) => at(i, r)).map((p) => `${r2(p.x)},${r2(p.y)}`).join(" ");
            };

            const track = (clientX: number, clientY: number, target: Element) => {
              const svg = (target as SVGElement).ownerSVGElement ?? target;
              const rect = svg.getBoundingClientRect();
              const mxp = (clientX - rect.left) * (rect.width > 0 ? width / rect.width : 1) - cx;
              const myp = (clientY - rect.top) * (rect.height > 0 ? height / rect.height : 1) - cy;
              const a = (Math.atan2(mxp, -myp) + Math.PI * 2) % (Math.PI * 2);
              setActive(Math.round(a / step) % n);
            };
            const tip = active !== null ? at(active, R) : null;

            return (
              <>
                <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
                  {ticks
                    .filter((t) => t > d0)
                    .map((t) => {
                      const pts = ring(t);
                      return pts ? (
                        <polygon key={`g${t}`} data-slot="chart-ring" points={pts} fill="none" className="stroke-border" strokeWidth={1} />
                      ) : (
                        <circle key={`g${t}`} data-slot="chart-ring" cx={cx} cy={cy} r={rOf(t)} fill="none" className="stroke-border" strokeWidth={1} />
                      );
                    })}
                  {names.map((_, i) => {
                    const p = at(i, R);
                    return (
                      <line
                        key={`s${i}`}
                        data-slot="chart-spoke"
                        x1={cx}
                        y1={cy}
                        x2={p.x}
                        y2={p.y}
                        className={active === i ? "stroke-muted-foreground" : "stroke-border"}
                        strokeWidth={1}
                      />
                    );
                  })}
                  {levelLabels
                    ? ticks
                        .filter((t) => t > d0 || (t === d0 && d0 !== 0))
                        .map((t) => {
                          // Between the first two spokes, so the values never sit under a spoke name.
                          const p = at(0.5, rOf(t));
                          return (
                            <text
                              key={`l${t}`}
                              data-slot="chart-level"
                              x={r2(p.x + 3)}
                              y={r2(p.y)}
                              dy="0.32em"
                              className="fill-muted-foreground text-2xs tabular-nums"
                              style={{ paintOrder: "stroke", stroke: surface, strokeWidth: 3, strokeLinejoin: "round" }}
                            >
                              {fmtTick(t)}
                            </text>
                          );
                        })
                    : null}
                  {names.map((name, i) => {
                    const sin = Math.sin(i * step);
                    const cos = Math.cos(i * step);
                    const p = at(i, R + 10);
                    const anchor = sin > 0.3 ? "start" : sin < -0.3 ? "end" : "middle";
                    const room = anchor === "start" ? width - p.x - 2 : anchor === "end" ? p.x - 2 : 2 * Math.min(p.x, width - p.x);
                    const text = fitLabel(name, room);
                    return (
                      <text
                        key={`n${i}`}
                        data-slot="chart-axis-label"
                        x={r2(p.x)}
                        y={r2(p.y)}
                        dy={cos > 0.5 ? "-0.1em" : cos < -0.5 ? "0.9em" : "0.32em"}
                        textAnchor={anchor}
                        className={cn("text-2xs", active === i ? "fill-foreground font-medium" : "fill-muted-foreground")}
                      >
                        {text !== name ? <title>{name}</title> : null}
                        {text}
                      </text>
                    );
                  })}
                  {visible.map((s) => {
                    const pts = names.map((_, i) => {
                      const v = valueOf(i, s.key);
                      return at(i, v === null ? 0 : rOf(v));
                    });
                    const d = `M${pts.map((p) => `${r2(p.x)},${r2(p.y)}`).join("L")}Z`;
                    return (
                      <g key={s.key} data-slot="chart-series" data-series={s.key}>
                        <path
                          data-slot="chart-area"
                          d={d}
                          fill={fill ? s.color : "none"}
                          fillOpacity={0.16}
                          stroke={s.color}
                          strokeWidth={2}
                          strokeLinejoin="round"
                          className={motion}
                        />
                        {dots
                          ? pts.map((p, i) =>
                              valueOf(i, s.key) === null ? null : (
                                <circle
                                  key={i}
                                  data-slot="chart-dot"
                                  cx={r2(p.x)}
                                  cy={r2(p.y)}
                                  r={active === i ? 5 : 3}
                                  fill={s.color}
                                  stroke={surface}
                                  strokeWidth={1.5}
                                  className={motion}
                                />
                              )
                            )
                          : null}
                      </g>
                    );
                  })}
                  <rect
                    data-slot="chart-hit"
                    x={0}
                    y={0}
                    width={width}
                    height={height}
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
                {tooltip && active !== null && tip && visible.length > 0 ? (
                  <ChartTooltip
                    label={names[active]}
                    items={visible.map((s) => {
                      const v = valueOf(active, s.key);
                      return { key: s.key, label: s.label, color: s.color, value: v === null ? "–" : valueFormatter(v, s.key) };
                    })}
                    style={tooltipPlacement(tip.x, tip.y, width, height)}
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
RadarChart.displayName = "RadarChart";
