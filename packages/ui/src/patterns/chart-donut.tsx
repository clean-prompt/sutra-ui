/** DonutChart: ring segments with a center label, toggleable legend and tooltip. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { chartColorVars } from "../lib/tokens";
import { useControllableState } from "../hooks/use-controllable-state";
import { BreakdownList } from "../primitives/meter";
import { Skeleton } from "../primitives/progress";
import type { ChartDatum } from "./chart-types";
import { ChartLegendSkeleton, r2, toNumber, valueFormatterFor } from "./chart-internal";
import { resolveChartColor } from "./chart-scale";
import { ChartContainer, ChartLegend, ChartTooltip } from "./chart-container";

/* ------------------------------------------------------------------------------------------------
 * DonutChart
 * ----------------------------------------------------------------------------------------------*/

export interface DonutChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** Rows to plot; each has the `index` key (name) and the `valueKey` field (number). */
  data: ChartDatum[];
  /** Key of the segment name. */
  index: string;
  /** Key of the segment value. Default "value". */
  valueKey?: string;
  /** Colors in segment order (defaults to the chart palette). */
  colors?: string[];
  /** Returns a colour for a segment (a token name or CSS colour), or `undefined` to use the palette colour. */
  colorFor?: (datum: ChartDatum, index: number) => string | undefined;
  /** BCP 47 locale for the default number formatting. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. */
  locale?: string;
  /** Formats values in the tooltip, legend and centre. Default is the localized number. */
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
  /**
   * Legend placement: below the ring, to its right, or `false` to hide it.
   * @default "bottom"
   */
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
  /**
   * Shows a tooltip with the name, value and share on hover or focus.
   * @default true
   */
  tooltip?: boolean;
  /**
   * Eases the hover dimming and the colour of the segments over 500 ms; off under reduced motion. There is no
   * entrance animation, and a segment changes its shape (data or the hidden set) at once.
   * @default true
   */
  animate?: boolean;
  /** Content shown instead of the ring when there is no data. */
  emptyState?: React.ReactNode;
  /** Accessible name of the chart. */
  label?: string;
  /** Controlled list of hidden segment names (toggled from the legend). Use with `onHiddenSeriesChange`. */
  hiddenSeries?: string[];
  /** Initially hidden segment names when uncontrolled. */
  defaultHiddenSeries?: string[];
  /** Called with the hidden segment names when a legend entry is toggled. */
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
      locale,
      valueFormatter = valueFormatterFor(locale),
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
    const palette = colors ?? chartColorVars;
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
