/** Private helpers shared by the chart modules: number coercion, rounding, default formatters, legend skeleton. */
import { cn } from "../lib/cn";
import { clamp } from "../lib/math";
import type { PathPoint } from "../lib/svg-path";
import { formatShortDate } from "../lib/time";
import { Skeleton } from "../primitives/progress";
import type { ChartValue } from "./chart-types";

export type Point = PathPoint;

export const toNumber = (v: ChartValue): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export const r2 = (n: number) => Math.round(n * 100) / 100;

const compactFormat = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/**
 * Default value-axis labels: compact ("4K", "0.5") while that keeps every tick distinct; otherwise plain
 * numbers with as many decimals as the tick step needs, so 0.05 steps or 1000–1010 don't repeat a label.
 */
export function tickFormatter(ticks: number[]): (v: number) => string {
  const distinct = (fmt: (v: number) => string) => new Set(ticks.map(fmt)).size === ticks.length;
  const compact = (v: number) => compactFormat.format(v);
  if (distinct(compact)) return compact;
  const step = ticks.length > 1 ? Math.abs(ticks[1]! - ticks[0]!) : 0;
  let digits = step > 0 && Number.isFinite(step) ? clamp(-Math.floor(Math.log10(step)), 0, 20) : 0;
  for (; digits <= 20; digits++) {
    const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: digits });
    const fmt = (v: number) => nf.format(v);
    if (distinct(fmt) || digits === 20) return fmt;
  }
  return compact;
}
export const plainFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const defaultValueFormatter = (v: number) => plainFormat.format(v);

export function defaultIndexFormatter(v: ChartValue) {
  if (v instanceof Date) return formatShortDate(v, { year: "never" });
  if (v === null || v === undefined) return "";
  return String(v);
}

export const isMidnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;

/** Placeholder legend chips (or rows) shown while a chart has no data yet. */
export function ChartLegendSkeleton({
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
