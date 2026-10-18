import * as React from "react";
import { cn } from "../lib/cn";
import { normalizeTone, type Tone, type ToneInput } from "../lib/tone";
import { useSafeId } from "../hooks/use-safe-id";
import { resolveAccent, type Accent } from "../lib/accent";
import { clamp } from "../lib/math";

export type SparklineColor =
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "muted"
  | "foreground"
  | (string & {});

const tokenColor: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
  muted: "var(--muted-foreground)",
  foreground: "var(--foreground)",
};

const resolveColor = (color: string) => tokenColor[color] ?? color;

const toneColor: Record<Tone, string> = {
  neutral: "var(--muted-foreground)",
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
};

/** `tone` wins over `color`, which wins over `accent`; `color` stays for arbitrary CSS colours. */
const colorFor = (tone: ToneInput | undefined, color: string | undefined, accent?: Accent) =>
  tone ? toneColor[normalizeTone(tone)] : (color ?? resolveAccent(accent));

type Point = readonly [number, number];

/** Monotone cubic interpolation (Fritsch–Carlson), same shape as d3.curveMonotoneX. */
function monotonePath(points: Point[]) {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0]![0]},${points[0]![1]}`;
  if (n === 2) return `M${points[0]![0]},${points[0]![1]}L${points[1]![0]},${points[1]![1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1]![0] - points[i]![0];
    dx.push(h);
    m.push(h === 0 ? 0 : (points[i + 1]![1] - points[i]![1]) / h);
  }
  const t: number[] = new Array(n);
  t[0] = m[0]!;
  t[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i]!;
      t[i + 1] = tau * b * m[i]!;
    }
  }
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const h = dx[i]! / 3;
    d += `C${x0 + h},${y0 + t[i]! * h},${x1 - h},${y1 - t[i + 1]! * h},${x1},${y1}`;
  }
  return d;
}

const linearPath = (points: Point[]) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join("");

function strokeFor(data: number[], color: string | undefined, trend: boolean | undefined) {
  if (color) return resolveColor(color);
  if (trend && data.length > 1) {
    return data[data.length - 1]! >= data[0]! ? tokenColor.success! : tokenColor.destructive!;
  }
  return tokenColor.primary!;
}

export interface SparklineProps extends Omit<React.SVGAttributes<SVGSVGElement>, "type" | "color" | "radius"> {
  data: number[];
  type?: "line" | "area" | "bar";
  /** Intrinsic width (or viewBox width when `responsive`). */
  width?: number;
  height?: number;
  /** Stretch to 100% of the container width. */
  responsive?: boolean;
  /** Semantic colour. Takes precedence over `color`. */
  tone?: ToneInput;
  /** Any CSS colour (token names such as "primary" still work; prefer `tone` for those). */
  color?: SparklineColor;
  /**
   * Categorical colour (`blue`, `amber`, …, a semantic token or any CSS colour). `tone` and `color` take
   * precedence. Pass `color="var(--sutra-accent, var(--primary))"` to follow an accent set by a parent instead.
   */
  accent?: Accent;
  /** Color green when the series ends higher than it started, red otherwise. */
  trend?: boolean;
  smooth?: boolean;
  strokeWidth?: number;
  /** Gradient under the line (`type="area"`). Default true. */
  gradient?: boolean;
  /** Dot on the last data point. */
  highlightLast?: boolean;
  /** Fixed y-domain; defaults to the data range. */
  min?: number;
  max?: number;
  label?: string;
  wrapperClassName?: string;
}

/** Tiny inline trend chart. */
export const Sparkline = React.forwardRef<SVGSVGElement, SparklineProps>(
  (
    {
      data,
      type = "line",
      width = 120,
      height = 32,
      responsive,
      tone,
      color: colorProp,
      accent,
      trend,
      smooth = true,
      strokeWidth = 1.5,
      gradient = true,
      highlightLast,
      min: minProp,
      max: maxProp,
      label,
      className,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const color = colorFor(tone, colorProp, accent);
    const stroke = strokeFor(data, color, trend);
    const gradientId = useSafeId("sutra-spark");

    if (type === "bar") {
      return (
        <SparkBar
          ref={ref}
          data={data}
          width={width}
          height={height}
          responsive={responsive}
          color={color ?? (trend ? stroke : undefined)}
          highlightLast={highlightLast}
          min={minProp}
          max={maxProp}
          label={label}
          className={className}
          wrapperClassName={wrapperClassName}
          {...props}
        />
      );
    }

    const values = data.length === 1 ? [data[0]!, data[0]!] : data;
    const pad = strokeWidth / 2 + (highlightLast ? 3 : 1);
    const lo = minProp ?? Math.min(...values);
    const hi = maxProp ?? Math.max(...values);
    const span = hi - lo || 1;
    const innerW = Math.max(1, width - (responsive ? 0 : pad * 2));
    const innerH = Math.max(1, height - pad * 2);
    const points: Point[] = values.map((v, i) => [
      (responsive ? 0 : pad) + (values.length === 1 ? 0 : (i / (values.length - 1)) * innerW),
      pad + innerH - ((v - lo) / span) * innerH,
    ]);
    const line = smooth ? monotonePath(points) : linearPath(points);
    const last = points[points.length - 1];
    const first = points[0];
    const area =
      type === "area" && first && last
        ? `${line}L${last[0]},${height}L${first[0]},${height}Z`
        : null;

    const ariaLabel =
      label ??
      (data.length > 0 ? `Trend from ${data[0]} to ${data[data.length - 1]}` : "No data");

    return (
      <span
        className={cn("relative inline-block shrink-0 align-middle", responsive && "block w-full", wrapperClassName)}
        style={responsive ? { height } : { width, height }}
      >
        <svg
          ref={ref}
          role="img"
          aria-label={ariaLabel}
          width={responsive ? "100%" : width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio={responsive ? "none" : undefined}
          fill="none"
          className={cn("block overflow-visible", className)}
          {...props}
        >
          {data.length > 0 ? (
            <>
              {area ? (
                <>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={stroke} stopOpacity={gradient ? 0.28 : 0.14} />
                      <stop offset="100%" stopColor={stroke} stopOpacity={gradient ? 0 : 0.14} />
                    </linearGradient>
                  </defs>
                  <path d={area} fill={`url(#${gradientId})`} stroke="none" />
                </>
              ) : null}
              <path
                d={line}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
        </svg>
        {highlightLast && last && data.length > 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
            style={{
              left: `${(last[0] / width) * 100}%`,
              top: `${(last[1] / height) * 100}%`,
              backgroundColor: stroke,
            }}
          />
        ) : null}
      </span>
    );
  }
);
Sparkline.displayName = "Sparkline";

export interface SparkBarProps extends Omit<React.SVGAttributes<SVGSVGElement>, "color" | "radius"> {
  data: number[];
  width?: number;
  height?: number;
  responsive?: boolean;
  /** Semantic colour. Takes precedence over `color`. */
  tone?: ToneInput;
  /** Any CSS colour (token names still work; prefer `tone` for those). Default primary. */
  color?: SparklineColor;
  /** Categorical colour (`blue`, `amber`, …, a semantic token or any CSS colour). `tone` and `color` take precedence. */
  accent?: Accent;
  /** Fixed scale bottom (e.g. 0). Defaults to the smaller of 0 and the data minimum. */
  min?: number;
  /** Fixed scale top (e.g. 100 for percentages). Defaults to the larger of 0 and the data maximum. */
  max?: number;
  /** Color for non-highlighted bars when `highlightLast` is on. Defaults to a faded `color`. */
  mutedColor?: string;
  highlightLast?: boolean;
  /** Gap between bars in px (viewBox units). */
  gap?: number;
  radius?: number;
  label?: string;
  wrapperClassName?: string;
}

/** Tiny inline column chart. */
export const SparkBar = React.forwardRef<SVGSVGElement, SparkBarProps>(
  (
    {
      data,
      width = 120,
      height = 32,
      responsive,
      tone,
      color,
      accent,
      min: minProp,
      max: maxProp,
      mutedColor,
      highlightLast,
      gap = 2,
      radius = 1.5,
      label,
      className,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const fill = resolveColor(colorFor(tone, color, accent) ?? "primary");
    const n = data.length;
    const finite = data.filter(Number.isFinite);
    let hi = Number.isFinite(maxProp) ? maxProp! : Math.max(0, ...finite);
    let lo = Number.isFinite(minProp) ? minProp! : Math.min(0, ...finite);
    if (lo > hi) [lo, hi] = [hi, lo];
    const span = hi - lo || 1;
    /* Bars grow from 0, or from the nearest edge of the scale when 0 is outside it. */
    const base = clamp(0, lo, hi);
    const barW = n > 0 ? Math.max(1, (width - gap * (n - 1)) / n) : 0;
    const zeroY = ((hi - base) / span) * height;
    const faded = mutedColor ?? `color-mix(in oklab, ${fill} 35%, transparent)`;

    return (
      <span
        className={cn("inline-block shrink-0 align-middle", responsive && "block w-full", wrapperClassName)}
        style={responsive ? { height } : { width, height }}
      >
        <svg
          ref={ref}
          role="img"
          aria-label={label ?? (n > 0 ? `${n} values, latest ${data[n - 1]}` : "No data")}
          width={responsive ? "100%" : width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio={responsive ? "none" : undefined}
          className={cn("block", className)}
          {...props}
        >
          {data.map((raw, i) => {
            const v = Number.isFinite(raw) ? clamp(raw, lo, hi) : base;
            const h = Math.max(1, (Math.abs(v - base) / span) * height);
            const y = v >= base ? zeroY - h : zeroY;
            const isLast = i === n - 1;
            return (
              <rect
                key={i}
                x={i * (barW + gap)}
                y={y}
                width={barW}
                height={h}
                rx={Math.min(radius, barW / 2)}
                style={{ fill: highlightLast && !isLast ? faded : fill }}
                className="transition-[height,y] duration-300"
              />
            );
          })}
        </svg>
      </span>
    );
  }
);
SparkBar.displayName = "SparkBar";
