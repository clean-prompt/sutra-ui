import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "../lib/cn";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";
import { clamp, roundTo, toPercent } from "../lib/math";
import { useSafeId } from "../hooks/use-safe-id";
import { useRootDirection } from "../hooks/use-direction";
import { inlineSign } from "../lib/direction";

/** @deprecated Use `Tone` (the `tone` prop). */
export type ProgressColor = Tone;

/** Fill per tone: `toneClasses.dot`, but a neutral bar uses the foreground colour (not muted). */
const barColor: Record<Tone, string> = { ...toneClasses.dot, neutral: "bg-foreground" };

/** SVG stroke per tone (toneClasses has no stroke style). */
const strokeColor: Record<Tone, string> = {
  primary: "stroke-primary",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  info: "stroke-info",
  neutral: "stroke-foreground",
};

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, "value" | "color"> {
  /** Completed amount from 0 to `max`; `null` or `undefined` renders the indeterminate animation. */
  value?: number | null;
  /** Track height: 2xs 2px (hairline loading strips), xs 4px, sm 6px, md 8px, lg 12px. Default "md". */
  size?: "2xs" | "xs" | "sm" | "md" | "lg";
  /** Semantic colour of the filled part. Default "primary". */
  tone?: ToneInput;
  /** Legacy name of `tone`. @deprecated Use `tone`. */
  color?: ProgressColor;
  /** Forces the looping animation regardless of `value` (also used when `value` is null). */
  indeterminate?: boolean;
  /** Text shown above the bar; it also becomes the accessible name. */
  label?: React.ReactNode;
  /** Show the percentage on the right of the bar or above it, next to the label. */
  showValue?: boolean | "right" | "top";
  /** Formats the displayed value; receives the value and `max`. Default is the rounded percentage, e.g. "40%". */
  formatValue?: (value: number, max: number) => React.ReactNode;
  /** Classes for the filled indicator bar (`className` styles the track). */
  indicatorClassName?: string;
}

const barHeight = { "2xs": "h-0.5", xs: "h-1", sm: "h-1.5", md: "h-2", lg: "h-3" } as const;

/**
 * Linear progress bar, determinate or indeterminate (role="progressbar"): how far a task has got.
 * For a level read against thresholds (disk usage, context window) use `Meter` instead.
 * Restyle the track with `className` (e.g. `rounded-none bg-transparent` for an edge strip) and the fill with `indicatorClassName`.
 */
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
      tone: toneProp,
      color,
      indeterminate,
      label,
      showValue,
      formatValue,
      ...props
    },
    ref
  ) => {
    const tone = normalizeTone(toneProp ?? color, "primary");
    const { ref: rootRef, dir } = useRootDirection(ref);
    const sign = inlineSign(dir);
    const isIndeterminate = indeterminate || value === null || value === undefined;
    const pct = isIndeterminate ? 0 : toPercent(value as number, max);
    // Radix rejects max <= 0 with a console error; an empty range simply reads as 0%.
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const valueText = isIndeterminate
      ? null
      : formatValue
        ? formatValue(value as number, max)
        : `${Math.round(pct)}%`;
    const position = showValue === true ? (label ? "top" : "right") : showValue || null;
    const labelId = React.useId();

    const bar = (
      <ProgressPrimitive.Root
        ref={rootRef}
        value={isIndeterminate ? null : safeMax === max ? clamp(value as number, 0, max) : 0}
        max={safeMax}
        aria-labelledby={label ? labelId : undefined}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          barHeight[size],
          !label && !position && className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full rounded-full",
            barColor[tone],
            isIndeterminate
              ? "origin-left rtl:origin-right animate-indeterminate rtl:[animation-name:sutra-indeterminate-rtl]"
              : "transition-transform duration-500 ease-out-quart motion-reduce:transition-none",
            indicatorClassName
          )}
          style={isIndeterminate ? undefined : { transform: `translateX(${sign > 0 ? "-" : ""}${100 - pct}%)` }}
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
            <span className="min-w-9 shrink-0 text-end text-sm font-medium tabular-nums text-foreground">
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
  /** Completed amount from 0 to `max`; the centre shows it as a percentage unless `children` replaces it. */
  value?: number;
  /**
   * Value that counts as 100%.
   * @default 100
   */
  max?: number;
  /** Diameter in px. */
  size?: number;
  /**
   * Ring thickness in px.
   * @default 6
   */
  strokeWidth?: number;
  /** Semantic colour of the filled part. Default "primary". */
  tone?: ToneInput;
  /** Legacy name of `tone`. @deprecated Use `tone`. */
  color?: ProgressColor;
  /** Brand gradient stroke instead of a flat color. */
  gradient?: boolean;
  /** Show the percentage in the center. Default true. */
  showValue?: boolean;
  /** Custom center content (overrides the value). */
  children?: React.ReactNode;
  /** Accessible name of the progressbar (`aria-label`). */
  label?: string;
}

export interface ProgressRingSvgProps extends Omit<React.SVGProps<SVGSVGElement>, "children"> {
  /** Filled share, 0–100. */
  percent: number;
  /** Diameter in px. */
  size: number;
  /** Ring thickness in px. */
  strokeWidth: number;
  /** Classes for the fill arc, e.g. a `stroke-*` tone class. */
  fillClassName?: string;
  /** Explicit fill stroke (CSS colour or `url(#id)`); wins over `fillClassName` colours. */
  fillStroke?: string;
  /** Classes for the track circle. Default `stroke-muted`. */
  trackClassName?: string;
  /** Explicit track stroke (e.g. `currentColor`). */
  trackStroke?: string;
  /** Opacity of the track ring, 0 to 1. */
  trackOpacity?: number;
  /** `data-slot` on the fill arc. */
  fillSlot?: string;
  /** Extra SVG definitions (gradients). */
  defs?: React.ReactNode;
}

/**
 * The SVG ring drawn by `ProgressCircle`, `RingMeter` and `ChatAttachment`: a track circle plus a fill arc
 * that starts at 12 o'clock. Decorative (`aria-hidden`); the wrapper carries the role and values.
 */
export function ProgressRingSvg({
  percent,
  size,
  strokeWidth,
  fillClassName,
  fillStroke,
  trackClassName = "stroke-muted",
  trackStroke,
  trackOpacity,
  fillSlot,
  defs,
  className,
  ...props
}: ProgressRingSvgProps) {
  const pct = clamp(percent, 0, 100);
  const c = size / 2;
  const r = Math.max(0, c - strokeWidth / 2);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className={cn("shrink-0 -rotate-90", className)}
      {...props}
    >
      {defs ? <defs>{defs}</defs> : null}
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={strokeWidth} stroke={trackStroke} strokeOpacity={trackOpacity} className={trackClassName} />
      <circle
        data-slot={fillSlot}
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={fillStroke}
        strokeWidth={strokeWidth}
        strokeLinecap={pct > 0 ? "round" : "butt"}
        pathLength={100}
        strokeDasharray={`${roundTo(pct, 2)} 100`}
        className={cn("transition-[stroke-dasharray,stroke] duration-500 ease-out-quart motion-reduce:transition-none", fillClassName)}
      />
    </svg>
  );
}

/**
 * Circular progress ring with centered value (role="progressbar"): task completion, like `Progress`.
 * `RingMeter` draws the same ring as a threshold-coloured level (role="meter"), e.g. a context window.
 */
export const ProgressCircle = React.forwardRef<HTMLDivElement, ProgressCircleProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      size = 64,
      strokeWidth = 6,
      tone: toneProp,
      color,
      gradient,
      showValue = true,
      label,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const tone = normalizeTone(toneProp ?? color, "primary");
    const pct = toPercent(value, max);
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
        <ProgressRingSvg
          percent={pct}
          size={size}
          strokeWidth={strokeWidth}
          fillStroke={gradient ? `url(#${gradientId})` : undefined}
          fillClassName={cn(!gradient && strokeColor[tone])}
          defs={
            gradient ? (
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--color-brand-400)" }} />
                <stop offset="100%" style={{ stopColor: "var(--color-brand-700)" }} />
              </linearGradient>
            ) : undefined
          }
        />
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
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color" | "role"> {
  /** Number of segments. */
  segments?: number;
  /** Filled amount, relative to `max` (defaults to `segments`). */
  value: number;
  /** Total number of units the bar represents; defaults to the segment count. */
  max?: number;
  /** Semantic colour of the filled part. Default "primary". */
  tone?: ToneInput;
  /** Legacy name of `tone`. @deprecated Use `tone`. */
  color?: ProgressColor;
  /** Segment height: sm, md or lg. */
  size?: "sm" | "md" | "lg";
  /** Accessible name of the progressbar (`aria-label`). */
  label?: string;
  /** `progressbar` (default) for steps done; `meter` for a level such as password strength. Pair with `aria-valuetext`. */
  role?: "progressbar" | "meter";
  /** Classes for the filled segments; replaces the tone colour (e.g. `bg-success/70`). */
  indicatorClassName?: string;
}

/** Segmented bar for multi-step progress, or (with `role="meter"`) a level such as password strength. */
export const ProgressSegments = React.forwardRef<HTMLDivElement, ProgressSegmentsProps>(
  (
    { className, segments = 4, value, max, tone: toneProp, color, size = "md", label, role = "progressbar", indicatorClassName, ...props },
    ref
  ) => {
    const tone = normalizeTone(toneProp ?? color, "primary");
    const total = Math.max(1, Math.round(segments));
    const limit = max ?? total;
    const filled = Math.round((toPercent(value, limit) / 100) * total);
    return (
      <div
        ref={ref}
        role={role}
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
              i < filled ? (indicatorClassName ?? barColor[tone]) : "bg-muted"
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
  /**
   * What the placeholder looks like: text lines, a circle (avatar) or a rectangle.
   * @default "rect"
   */
  shape?: "text" | "circle" | "rect";
  /** Number of text lines (shape "text" only). The last line is shorter. */
  lines?: number;
  /** Width of the placeholder (px number or CSS length); defaults to the full width. */
  width?: number | string;
  /** Height of the placeholder (px number or CSS length); a circle without a height is as tall as it is wide. */
  height?: number | string;
  /** Shimmer sweep instead of a pulse. Default true. */
  shimmer?: boolean;
}

const skeletonBase =
  "block bg-muted motion-reduce:animate-none";
const skeletonShimmer =
  "animate-shimmer motion-reduce:animate-none bg-[linear-gradient(90deg,var(--muted)_25%,color-mix(in_oklab,var(--muted),var(--foreground)_7%)_50%,var(--muted)_75%)] bg-[length:200%_100%]";

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
