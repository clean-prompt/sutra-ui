import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "../lib/cn";
import { clamp, toPercent } from "../lib/math";
import { useSafeId } from "../hooks/use-safe-id";

export type ProgressColor = "primary" | "success" | "warning" | "destructive" | "info" | "neutral";

const barColor: Record<ProgressColor, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-foreground",
};

const strokeColor: Record<ProgressColor, string> = {
  primary: "stroke-primary",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  info: "stroke-info",
  neutral: "stroke-foreground",
};

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, "value" | "color"> {
  value?: number | null;
  size?: "xs" | "sm" | "md" | "lg";
  color?: ProgressColor;
  indeterminate?: boolean;
  label?: React.ReactNode;
  /** Show the percentage on the right of the bar or above it, next to the label. */
  showValue?: boolean | "right" | "top";
  formatValue?: (value: number, max: number) => React.ReactNode;
  indicatorClassName?: string;
}

/** Linear progress bar, determinate or indeterminate. */
export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      indicatorClassName,
      value,
      max = 100,
      size = "md",
      color = "primary",
      indeterminate,
      label,
      showValue,
      formatValue,
      ...props
    },
    ref
  ) => {
    const isIndeterminate = indeterminate || value === null || value === undefined;
    const pct = isIndeterminate ? 0 : toPercent(value as number, max);
    const valueText = isIndeterminate
      ? null
      : formatValue
        ? formatValue(value as number, max)
        : `${Math.round(pct)}%`;
    const position = showValue === true ? (label ? "top" : "right") : showValue || null;
    const labelId = React.useId();

    const bar = (
      <ProgressPrimitive.Root
        ref={ref}
        value={isIndeterminate ? null : clamp(value as number, 0, max)}
        max={max}
        aria-labelledby={label ? labelId : undefined}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          size === "xs" ? "h-1" : size === "sm" ? "h-1.5" : size === "md" ? "h-2" : "h-3",
          !label && !position && className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full rounded-full",
            barColor[color],
            isIndeterminate
              ? "origin-left animate-indeterminate"
              : "transition-transform duration-500 ease-out-quart",
            indicatorClassName
          )}
          style={isIndeterminate ? undefined : { transform: `translateX(-${100 - pct}%)` }}
        />
      </ProgressPrimitive.Root>
    );

    if (!label && !position) return bar;

    return (
      <div className={cn("w-full", className)}>
        {label || position === "top" ? (
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            {label ? (
              <span id={labelId} className="font-medium text-foreground">
                {label}
              </span>
            ) : (
              <span />
            )}
            {position === "top" && valueText !== null ? (
              <span className="tabular-nums text-muted-foreground">{valueText}</span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          {bar}
          {position === "right" && valueText !== null ? (
            <span className="min-w-9 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
              {valueText}
            </span>
          ) : null}
        </div>
      </div>
    );
  }
);
Progress.displayName = "Progress";

export interface ProgressCircleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color" | "children"> {
  value?: number;
  max?: number;
  /** Diameter in px. */
  size?: number;
  strokeWidth?: number;
  color?: ProgressColor;
  /** Brand gradient stroke instead of a flat color. */
  gradient?: boolean;
  /** Show the percentage in the center. Default true. */
  showValue?: boolean;
  /** Custom center content (overrides the value). */
  children?: React.ReactNode;
  label?: string;
}

/** Circular progress ring with centered value. */
export const ProgressCircle = React.forwardRef<HTMLDivElement, ProgressCircleProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      size = 64,
      strokeWidth = 6,
      color = "primary",
      gradient,
      showValue = true,
      label,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const pct = toPercent(value, max);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - pct / 100);
    const gradientId = useSafeId("sutra-pc");

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamp(value, 0, max)}
        aria-label={label}
        className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          {gradient ? (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--color-brand-400)" }} />
                <stop offset="100%" style={{ stopColor: "var(--color-brand-700)" }} />
              </linearGradient>
            </defs>
          ) : null}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke={gradient ? `url(#${gradientId})` : undefined}
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out-quart",
              !gradient && strokeColor[color]
            )}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-foreground",
            size < 48 ? "text-2xs" : size < 80 ? "text-sm" : size < 128 ? "text-lg" : "text-display-xs"
          )}
        >
          {children ?? (showValue ? `${Math.round(pct)}%` : null)}
        </span>
      </div>
    );
  }
);
ProgressCircle.displayName = "ProgressCircle";

export interface ProgressSegmentsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of segments. */
  segments?: number;
  /** Filled amount, relative to `max` (defaults to `segments`). */
  value: number;
  max?: number;
  color?: ProgressColor;
  size?: "sm" | "md" | "lg";
  label?: string;
}

/** Segmented bar, e.g. for password strength or multi-step progress. */
export const ProgressSegments = React.forwardRef<HTMLDivElement, ProgressSegmentsProps>(
  ({ className, segments = 4, value, max, color = "primary", size = "md", label, ...props }, ref) => {
    const total = Math.max(1, Math.round(segments));
    const limit = max ?? total;
    const filled = Math.round((toPercent(value, limit) / 100) * total);
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={clamp(value, 0, limit)}
        aria-label={label}
        className={cn("flex w-full items-center gap-1", className)}
        {...props}
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              size === "sm" ? "h-1" : size === "md" ? "h-1.5" : "h-2",
              i < filled ? barColor[color] : "bg-muted"
            )}
            style={{ transitionDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    );
  }
);
ProgressSegments.displayName = "ProgressSegments";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: "text" | "circle" | "rect";
  /** Number of text lines (shape "text" only). The last line is shorter. */
  lines?: number;
  width?: number | string;
  height?: number | string;
  /** Shimmer sweep instead of a pulse. Default true. */
  shimmer?: boolean;
}

const skeletonBase =
  "block bg-muted motion-reduce:animate-none";
const skeletonShimmer =
  "animate-shimmer bg-[linear-gradient(90deg,var(--muted)_25%,color-mix(in_oklab,var(--muted),var(--foreground)_7%)_50%,var(--muted)_75%)] bg-[length:200%_100%]";

/** Loading placeholder with a shimmer. */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, shape = "rect", lines = 1, width, height, shimmer = true, style, ...props }, ref) => {
    const anim = shimmer ? skeletonShimmer : "animate-pulse";
    if (shape === "text" && lines > 1) {
      return (
        <div
          ref={ref}
          aria-hidden
          className={cn("flex w-full flex-col gap-2", className)}
          style={{ width, ...style }}
          {...props}
        >
          {Array.from({ length: lines }, (_, i) => (
            <span
              key={i}
              className={cn(skeletonBase, anim, "h-[0.8em] rounded-xs")}
              style={{ width: i === lines - 1 ? "60%" : "100%", height }}
            />
          ))}
        </div>
      );
    }
    return (
      <div
        ref={ref}
        aria-hidden
        className={cn(
          skeletonBase,
          anim,
          shape === "circle" && "size-10 rounded-full",
          shape === "rect" && "h-24 w-full rounded-md",
          shape === "text" && "h-[0.8em] w-full rounded-xs",
          className
        )}
        style={{ width, height: height ?? (shape === "circle" ? width : undefined), ...style }}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";
