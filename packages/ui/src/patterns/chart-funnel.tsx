/** FunnelChart: stages that narrow from top to bottom, with the conversion between stages. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { chartColorVars } from "../lib/tokens";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { Skeleton } from "../primitives/progress";
import type { ChartDatum } from "./chart-types";
import { r2, toNumber, valueFormatterFor } from "./chart-internal";
import { surface } from "./chart-cartesian-internal";
import { resolveChartColor } from "./chart-scale";
import { ChartContainer, ChartTooltip } from "./chart-container";
import { ChartEmptyBox, formatRatio, stepIndex, tooltipPlacement, chartMotion } from "./chart-extra-internal";

/* ------------------------------------------------------------------------------------------------
 * FunnelChart
 * ----------------------------------------------------------------------------------------------*/

export interface FunnelChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** One row per stage, in funnel order (the chart does not sort). */
  data: ChartDatum[];
  /** Key of the stage name. Default "label". */
  index?: string;
  /** Key of the stage value. Default "value". */
  valueKey?: string;
  /** BCP 47 locale for the default number formatting. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. */
  locale?: string;
  /** Formats the step values in the tooltip and labels. Default is the localized number. */
  valueFormatter?: (value: number) => string;
  /**
   * The conversion rate shown beside each stage (after the first): `"previous"` is the share of the stage before
   * (default), `"first"` the share of the top stage, `false` hides rates. The tooltip and the table always list both.
   */
  conversion?: "previous" | "first" | false;
  /** One color for every stage; stages shade from full strength at the top to lighter at the bottom. Default the first chart color. */
  color?: string;
  /** A color per stage instead (no shading). */
  colors?: string[];
  /** Returns a colour for a step (a token name or CSS colour), or `undefined` to use the palette colour. */
  colorFor?: (datum: ChartDatum, index: number) => string | undefined;
  /** Stages join with sloping sides (default) or are separate centered bars (`false`). */
  connected?: boolean;
  /** Plot height in px. Default 44px per stage (at least 120). */
  height?: number;
  /**
   * Shows a tooltip with the step value and the drop-off from the previous step.
   * @default true
   */
  tooltip?: boolean;
  /** CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. */
  animate?: boolean;
  /** Content shown instead of the funnel when there is no data. */
  emptyState?: React.ReactNode;
  /** Accessible name. Defaults to a description built from the stages. */
  label?: string;
  /** Called with the hovered step index (or `null` when the pointer leaves); use it to sync other views. */
  onActiveIndexChange?: (index: number | null) => void;
  /** Data is on its way: with no data, a placeholder funnel of the same size; with data, the root is marked busy. */
  loading?: boolean;
}

const ROW_PX = 44;

/** Funnel chart: stage names and values at the left, the narrowing shape at the right, keyboard and tooltip readouts. */
export const FunnelChart = React.forwardRef<HTMLDivElement, FunnelChartProps>(
  (
    {
      data,
      index = "label",
      valueKey = "value",
      locale,
      valueFormatter = valueFormatterFor(locale),
      conversion = "previous",
      color,
      colors,
      colorFor,
      connected = true,
      height,
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
    const plotHeight = height ?? Math.max(120, (n || 4) * ROW_PX);

    const onActiveRef = useLatestRef(onActiveIndexChange);
    React.useEffect(() => {
      onActiveRef.current?.(active);
    }, [active, onActiveRef]);

    if (n === 0 && loading) {
      const rows = 4;
      return (
        <div ref={ref} aria-busy="true" className={cn("w-full", className)} {...props}>
          <span className="sr-only">{`Loading ${label ?? "funnel chart"}…`}</span>
          <div aria-hidden data-slot="chart-skeleton" className="flex flex-col" style={{ height: plotHeight }}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex min-h-0 flex-1 items-center gap-2">
                <div className="flex w-1/4 min-w-20 shrink-0 flex-col gap-1.5">
                  <Skeleton shape="text" className="h-3" width="70%" />
                  <Skeleton shape="text" className="h-2.5" width="45%" />
                </div>
                <div className="flex min-w-0 flex-1 justify-center">
                  <Skeleton className="h-3/4 rounded-sm" style={{ width: `${100 - i * 22}%`, minHeight: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (n === 0) {
      return (
        <div ref={ref} className={cn("w-full", className)} {...props}>
          <ChartEmptyBox height={plotHeight}>{emptyState}</ChartEmptyBox>
        </div>
      );
    }

    const stages = data.map((d, i) => ({
      i,
      label: String(d[index] ?? ""),
      value: Math.max(0, toNumber(d[valueKey]) ?? 0),
      color: colorFor?.(d, i) ?? colors?.[i],
    }));
    const top = stages[0]!.value;
    const max = Math.max(0, ...stages.map((s) => s.value));
    const rows = stages.map((s, i) => {
      const prev = i > 0 ? stages[i - 1]!.value : null;
      return {
        ...s,
        ofPrevious: prev !== null && prev > 0 ? s.value / prev : null,
        ofFirst: i > 0 && top > 0 ? s.value / top : null,
        dropped: prev !== null ? Math.max(0, prev - s.value) : null,
      };
    });
    const shades = !colors && !colorFor;
    const base = resolveChartColor(color ?? chartColorVars[0]!);
    const rateOf = (r: (typeof rows)[number]) => (conversion === "first" ? r.ofFirst : conversion === "previous" ? r.ofPrevious : null);
    const rate = (v: number | null) => (v === null ? "–" : formatRatio(v));
    const describe = (r: (typeof rows)[number]) =>
      `${r.label}: ${valueFormatter(r.value)}${r.i > 0 ? `, ${rate(r.ofPrevious)} of previous, ${rate(r.ofFirst)} of first` : ""}`;
    const ariaLabel = label ?? `Funnel chart: ${rows.map((r) => `${r.label} ${valueFormatter(r.value)}`).join(", ")}`;
    const motion = chartMotion(animate);

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const next = stepIndex(e.key, active, n);
      if (next === undefined) return;
      e.preventDefault();
      setActive(next);
      setAnnounce(next === null ? "" : describe(rows[next]!));
    };

    return (
      <div ref={ref} aria-busy={loading || undefined} className={cn("w-full", className)} {...props}>
        <ChartContainer
          label={ariaLabel}
          height={plotHeight}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className={cn("rounded-md", focusRing)}
          table={{
            columns: [index, valueKey, "Of previous", "Of first"],
            rows: rows.map((r) => [r.label, valueFormatter(r.value), r.i > 0 ? rate(r.ofPrevious) : "–", r.i > 0 ? rate(r.ofFirst) : "–"]),
          }}
        >
          {({ width }) => {
            const gutter = clamp(Math.round(width * 0.34), 96, 176);
            const fx = gutter + 8;
            const fw = Math.max(40, width - fx - 4);
            const cx = fx + fw / 2;
            const rh = plotHeight / n;
            const widthOf = (v: number) => (max > 0 ? Math.max(2, (v / max) * fw) : 2);
            const gap = connected ? 0 : Math.min(6, rh * 0.15);
            const on = active !== null ? rows[active] : undefined;
            return (
              <>
                <svg width={width} height={plotHeight} aria-hidden="true" className="block overflow-visible" onMouseLeave={() => setActive(null)}>
                  {rows.map((r) => {
                    const w = widthOf(r.value);
                    const y0 = r.i * rh;
                    const y1 = (r.i + 1) * rh;
                    const wb = connected ? (r.i < n - 1 ? widthOf(rows[r.i + 1]!.value) : w) : w;
                    const fill = r.color ? resolveChartColor(r.color) : base;
                    const shade = shades ? 1 - (n > 1 ? (r.i / (n - 1)) * 0.45 : 0) : 1;
                    const d = connected
                      ? `M${r2(cx - w / 2)},${r2(y0)}L${r2(cx + w / 2)},${r2(y0)}L${r2(cx + wb / 2)},${r2(y1)}L${r2(cx - wb / 2)},${r2(y1)}Z`
                      : `M${r2(cx - w / 2)},${r2(y0 + gap / 2)}L${r2(cx + w / 2)},${r2(y0 + gap / 2)}L${r2(cx + w / 2)},${r2(y1 - gap / 2)}L${r2(cx - w / 2)},${r2(y1 - gap / 2)}Z`;
                    return (
                      <path
                        key={r.i}
                        data-slot="chart-stage"
                        d={d}
                        fill={fill}
                        fillOpacity={shade}
                        stroke={surface}
                        strokeWidth={connected ? 1.5 : 0}
                        strokeLinejoin="round"
                        opacity={active !== null && r.i !== active ? 0.45 : 1}
                        className={motion}
                        onMouseEnter={() => setActive(r.i)}
                      />
                    );
                  })}
                </svg>
                {rows.map((r) => {
                  const rt = r.i > 0 ? rateOf(r) : null;
                  return (
                    <div
                      key={r.i}
                      data-slot="chart-stage-label"
                      className="absolute flex min-w-0 flex-col justify-center overflow-hidden pe-2"
                      style={{ left: 0, top: r.i * rh, width: gutter, height: rh }}
                      onMouseEnter={() => setActive(r.i)}
                    >
                      <span title={r.label} className={cn("truncate text-xs font-medium", active === r.i ? "text-foreground" : "text-foreground/90")}>
                        {r.label}
                      </span>
                      <span className="truncate text-2xs tabular-nums text-muted-foreground">
                        {valueFormatter(r.value)}
                        {conversion !== false && rt !== null ? ` · ${formatRatio(rt)}` : ""}
                      </span>
                    </div>
                  );
                })}
                {tooltip && on ? (
                  <ChartTooltip
                    label={on.label}
                    items={[{ key: "value", label: "", color: on.color ? resolveChartColor(on.color) : base, value: valueFormatter(on.value) }]}
                    footer={
                      on.i > 0
                        ? `${rate(on.ofPrevious)} of previous · ${rate(on.ofFirst)} of first${on.dropped ? ` · ${valueFormatter(on.dropped)} lost` : ""}`
                        : undefined
                    }
                    style={tooltipPlacement(cx, (on.i + 0.5) * rh, width, plotHeight)}
                  />
                ) : null}
              </>
            );
          }}
        </ChartContainer>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announce}
        </div>
      </div>
    );
  }
);
FunnelChart.displayName = "FunnelChart";
