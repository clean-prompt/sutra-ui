import * as React from "react";
import { RiArrowDownLine, RiArrowUpLine, RiSubtractLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Sparkline, type SparklineColor } from "./sparkline";

export type StatDeltaIntent = "positive-is-good" | "negative-is-good" | "neutral";
export type StatTone = "default" | "primary" | "success" | "warning" | "destructive" | "info";

const toneIcon: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  destructive: "bg-destructive-soft text-destructive-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
};

const toneValue: Record<StatTone, string> = {
  default: "text-foreground",
  primary: "text-foreground",
  success: "text-foreground",
  info: "text-foreground",
  warning: "text-warning",
  destructive: "text-destructive",
};

/** Direction of a delta: numbers by sign, strings by a leading +/−. */
export function statDeltaDirection(delta: number | string): "up" | "down" | "flat" {
  if (typeof delta === "number") return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const s = delta.trim();
  if (/^[-−–]/.test(s)) return "down";
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "flat";
  return "up";
}

const StatGroupContext = React.createContext<"cards" | "divided" | null>(null);

export interface StatCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  /** Change vs. a previous period. Numbers are shown signed with `deltaSuffix`. */
  delta?: number | string;
  /** Appended to numeric deltas. Default "%". */
  deltaSuffix?: string;
  /** Whether up is good (green) or bad (red). Default positive-is-good. */
  deltaIntent?: StatDeltaIntent;
  /** Comparison period, e.g. "vs last week". */
  deltaLabel?: React.ReactNode;
  /** Secondary line under the value. */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Sparkline values. */
  trend?: number[];
  trendType?: "line" | "area" | "bar";
  trendColor?: SparklineColor;
  loading?: boolean;
  tone?: StatTone;
  size?: "sm" | "md" | "lg";
}

/** KPI tile: label, big value, delta, hint and optional sparkline. */
export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      unit,
      delta,
      deltaSuffix = "%",
      deltaIntent = "positive-is-good",
      deltaLabel,
      hint,
      icon,
      trend,
      trendType = "area",
      trendColor,
      loading,
      tone = "default",
      size = "md",
      className,
      ...props
    },
    ref
  ) => {
    const group = React.useContext(StatGroupContext);
    const direction = delta === undefined ? null : statDeltaDirection(delta);
    const quality =
      direction === null || direction === "flat" || deltaIntent === "neutral"
        ? "neutral"
        : (direction === "up") === (deltaIntent === "positive-is-good")
          ? "good"
          : "bad";
    const deltaText =
      delta === undefined
        ? null
        : typeof delta === "number"
          ? `${delta > 0 ? "+" : ""}${delta}${deltaSuffix}`
          : delta;
    const DeltaIcon = direction === "up" ? RiArrowUpLine : direction === "down" ? RiArrowDownLine : RiSubtractLine;
    const valueSize = size === "lg" ? "text-display-sm" : size === "sm" ? "text-xl" : "text-display-xs";

    return (
      <div
        ref={ref}
        aria-busy={loading || undefined}
        data-slot="stat-card"
        className={cn(
          "flex min-w-0 flex-col gap-1",
          group === "divided" ? "bg-card px-4 py-3.5" : "rounded-box border border-border bg-card p-4 text-card-foreground shadow-xs",
          size === "lg" && group !== "divided" && "p-5",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={cn("truncate text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>{label}</span>
          {icon ? (
            <span aria-hidden className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", toneIcon[tone])}>
              {icon}
            </span>
          ) : null}
        </div>
        {loading ? (
          <div className="space-y-2 py-1" aria-hidden>
            <div className={cn("w-24 animate-pulse rounded-md bg-muted", size === "sm" ? "h-6" : "h-8")} />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span data-slot="stat-value" className={cn("font-mono font-semibold tabular-nums tracking-tight", valueSize, toneValue[tone])}>
                {value}
                {unit ? <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span> : null}
              </span>
              {deltaText !== null ? (
                <span
                  data-slot="stat-delta"
                  data-direction={direction}
                  data-quality={quality}
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    quality === "good" ? "text-success" : quality === "bad" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  <DeltaIcon aria-hidden className="size-3.5" />
                  <span className="sr-only">{direction === "up" ? "Increased" : direction === "down" ? "Decreased" : "Unchanged"}</span>
                  {deltaText}
                  {deltaLabel ? <span className="ml-1 font-normal text-muted-foreground">{deltaLabel}</span> : null}
                </span>
              ) : null}
            </div>
            {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
            {trend && trend.length > 0 ? (
              <Sparkline
                data={trend}
                type={trendType}
                responsive
                height={size === "sm" ? 28 : 36}
                color={trendColor ?? (quality === "good" ? "success" : quality === "bad" ? "destructive" : "primary")}
                highlightLast={trendType !== "bar"}
                label={typeof label === "string" ? `${label} trend` : "Trend"}
                wrapperClassName="mt-2"
              />
            ) : null}
          </>
        )}
      </div>
    );
  }
);
StatCard.displayName = "StatCard";

const statCols = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-3 lg:grid-cols-6",
} as const;

export interface StatGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "cards": separate tiles; "divided": one panel with hairline dividers. Default cards. */
  variant?: "cards" | "divided";
  /** Columns on wide screens. Default 4. */
  columns?: 2 | 3 | 4 | 5 | 6;
}

/** Responsive row of StatCards. */
export const StatGroup = React.forwardRef<HTMLDivElement, StatGroupProps>(
  ({ variant = "cards", columns = 4, className, ...props }, ref) => (
    <StatGroupContext.Provider value={variant}>
      <div
        ref={ref}
        data-slot="stat-group"
        data-variant={variant}
        className={cn(
          "grid grid-cols-2",
          statCols[columns],
          variant === "divided" ? "gap-px overflow-hidden rounded-box border border-border bg-border shadow-xs" : "gap-4",
          className
        )}
        {...props}
      />
    </StatGroupContext.Provider>
  )
);
StatGroup.displayName = "StatGroup";
