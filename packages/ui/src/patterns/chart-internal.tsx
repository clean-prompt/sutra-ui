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

const numberFormats = new Map<string, Intl.NumberFormat>();

/** One `Intl.NumberFormat` per locale and options, built on first use (never at import time). */
export function numberFormat(locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale ?? ""}|${options.notation ?? ""}|${options.maximumFractionDigits}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, f);
  }
  return f;
}

/**
 * Default value-axis labels: compact ("4K", "0.5") while that keeps every tick distinct; otherwise plain
 * numbers with as many decimals as the tick step needs, so 0.05 steps or 1000–1010 don't repeat a label.
 * `locale` is a BCP 47 tag (runtime default when omitted).
 */
export function tickFormatter(ticks: number[], locale?: string): (v: number) => string {
  const distinct = (fmt: (v: number) => string) => new Set(ticks.map(fmt)).size === ticks.length;
  const compactNf = numberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const compact = (v: number) => compactNf.format(v);
  if (distinct(compact)) return compact;
  const step = ticks.length > 1 ? Math.abs(ticks[1]! - ticks[0]!) : 0;
  let digits = step > 0 && Number.isFinite(step) ? clamp(-Math.floor(Math.log10(step)), 0, 20) : 0;
  for (; digits <= 20; digits++) {
    const nf = numberFormat(locale, { maximumFractionDigits: digits });
    const fmt = (v: number) => nf.format(v);
    if (distinct(fmt) || digits === 20) return fmt;
  }
  return compact;
}

/** Plain number with up to two decimals in `locale` (runtime default when omitted). */
export const formatPlain = (v: number, locale?: string) => numberFormat(locale, { maximumFractionDigits: 2 }).format(v);

const valueFormatters = new Map<string, (v: number) => string>();

/** Default tooltip / legend value formatter for `locale`; the same function for the same locale. */
export function valueFormatterFor(locale?: string): (v: number) => string {
  const key = locale ?? "";
  let f = valueFormatters.get(key);
  if (!f) {
    f = (v: number) => formatPlain(v, locale);
    valueFormatters.set(key, f);
  }
  return f;
}
export function defaultIndexFormatter(v: ChartValue, locale?: string) {
  if (v instanceof Date) return formatShortDate(v, { locale, year: "never" });
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
