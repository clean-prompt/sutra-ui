import * as React from "react";
import { cn } from "../lib/cn";
import { accentColorValue, accentStyle, type Accent } from "../lib/accent";
import { KeyValueList } from "../primitives/key-value";
import { Skeleton } from "../primitives/progress";
import { AreaChart } from "./chart-cartesian";
import { StatValue } from "./stat-card";

export interface MetricHeroDetail {
  label: React.ReactNode;
  value: React.ReactNode;
  key?: string;
}

export interface MetricHeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Small text above the value ("Now", "Apple M2 Max"). */
  caption?: React.ReactNode;
  /** The big number or text to show. */
  value: React.ReactNode;
  /** Unit shown after the value (e.g. "ms"). */
  unit?: React.ReactNode;
  /** Under the value, e.g. a `StatusBadge`. */
  status?: React.ReactNode;
  /** Label/value rows at the bottom of the left column ("Average today 37%"). */
  details?: MetricHeroDetail[];
  /** Any chart for the right side. Takes precedence over `series`. */
  chart?: React.ReactNode;
  /** Values drawn as an area chart in the accent colour. */
  series?: number[];
  /** Fixed lower bound of the series scale. Default fits the data (from 0). */
  min?: number;
  /** Fixed upper bound of the series scale (e.g. 100). */
  max?: number;
  /** Chart height in px. Default 200. */
  chartHeight?: number;
  /** Accessible name of the series chart. Default "<caption> history" or "History". */
  chartLabel?: string;
  /** Formats values in the chart tooltip and its screen-reader table. */
  valueFormatter?: (value: number) => string;
  /** Categorical colour of the chart. */
  accent?: Accent;
  /** Number face for the value: monospaced (default) or the UI sans with tabular figures. */
  valueFont?: "mono" | "sans";
  /**
   * Data is on its way. With no value yet, placeholders stand in for the value, the detail values and the chart
   * (the caption and detail labels stay); with a value, the root is just marked busy.
   */
  loading?: boolean;
}

/** Header of a metric detail view: caption, big value, status and facts on the left; a history chart on the right. */
export const MetricHero = React.forwardRef<HTMLDivElement, MetricHeroProps>(
  (
    {
      caption,
      value,
      unit,
      status,
      details,
      chart,
      series,
      min,
      max,
      chartHeight = 200,
      chartLabel,
      valueFormatter,
      accent,
      valueFont,
      loading,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const data = React.useMemo(() => (series ?? []).map((v, i) => ({ i, v })), [series]);
    const skeleton = !!loading && (value === undefined || value === null || value === "");
    const chartEl =
      chart ??
      (skeleton && !series?.length ? (
        <Skeleton data-slot="metric-hero-chart-skeleton" className="w-full rounded-md" height={chartHeight} />
      ) : series ? (
        <AreaChart
          data={data}
          index="i"
          series={[{ key: "v", label: typeof caption === "string" ? caption : "Value", color: accentColorValue }]}
          height={chartHeight}
          grid="horizontal"
          legend={false}
          xAxis={{ hide: true, label: "Sample" }}
          yAxis={{ hide: true, min: min ?? 0, max }}
          valueFormatter={valueFormatter ? (v) => valueFormatter(v) : undefined}
          label={chartLabel ?? (typeof caption === "string" ? `${caption} history` : "History")}
        />
      ) : null);

    return (
      <div
        ref={ref}
        data-slot="metric-hero"
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn(
          "grid gap-6 rounded-box border border-border bg-card p-5 [--chart-surface:var(--card)] text-card-foreground shadow-xs",
          chartEl ? "md:grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)]" : undefined,
          className
        )}
        {...props}
      >
        <div data-slot="metric-hero-summary" className="flex min-w-0 flex-col gap-1">
          {caption ? <div className="text-sm text-muted-foreground">{caption}</div> : null}
          {skeleton ? (
            <>
              <span className="sr-only">{`Loading ${typeof caption === "string" ? caption : "metric"}…`}</span>
              <Skeleton data-slot="metric-hero-value-skeleton" className="my-1 h-9 w-32" />
            </>
          ) : (
            <StatValue value={value} unit={unit} size="xl" font={valueFont} className="text-foreground" />
          )}
          {status ? <div className="mt-1">{status}</div> : null}
          {skeleton ? (
            <KeyValueList
              dividers={false}
              data-slot="metric-hero-details-skeleton"
              className="mt-auto pt-4 [&_[data-slot=key-value]]:py-1"
              items={(details && details.length > 0
                ? details.map((d, i) => ({ key: d.key ?? (typeof d.label === "string" ? d.label : String(i)), label: d.label }))
                : [{ key: "0", label: null }, { key: "1", label: null }]
              ).map((d, i) => ({
                key: d.key,
                label: d.label ?? <Skeleton shape="text" className="inline-block h-3.5 align-middle" width={i % 2 ? 64 : 88} />,
                value: <Skeleton shape="text" className="inline-block h-3.5 align-middle" width={i % 2 ? 40 : 52} />,
              }))}
            />
          ) : details && details.length > 0 ? (
            <KeyValueList
              dividers={false}
              className="mt-auto pt-4 [&_[data-slot=key-value]]:py-1 [&_dd]:font-medium [&_dd]:tabular-nums"
              items={details.map((d, i) => ({
                key: d.key ?? (typeof d.label === "string" ? d.label : String(i)),
                label: d.label,
                value: d.value,
              }))}
            />
          ) : null}
        </div>
        {chartEl ? (
          <div data-slot="metric-hero-chart" className="min-w-0 self-center">
            {chartEl}
          </div>
        ) : null}
      </div>
    );
  }
);
MetricHero.displayName = "MetricHero";
