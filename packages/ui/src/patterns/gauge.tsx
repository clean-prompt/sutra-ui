import * as React from "react";
import { cn } from "../lib/cn";
import { clamp, toPercent } from "../lib/math";
import { normalizeTone, type ToneInput } from "../lib/tone";
import { accentColorValue, accentStyle, type Accent } from "../lib/accent";
import { defaultMeterThresholds, meterLevel, type MeterColor, type MeterLevel, type MeterThresholds } from "../primitives/meter";
import { ProgressRingSvg, Skeleton } from "../primitives/progress";

export interface GaugeColorStop {
  /** Absolute value from which this color applies. */
  value: number;
  /** Token name or CSS color. */
  color: string;
}

const tokenColor: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
  neutral: "var(--foreground)",
  muted: "var(--muted-foreground)",
};
const resolve = (c: string) => tokenColor[c] ?? c;
const levelColor: Record<Exclude<MeterLevel, "ok">, string> = { warn: "var(--warning)", danger: "var(--destructive)" };
const levelText: Record<MeterLevel, string> = { ok: "text-foreground", warn: "text-warning", danger: "text-destructive" };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** SVG arc path on a circle; angles in degrees, 0 = 12 o'clock, clockwise. */
function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const pt = (a: number) => `${r2(cx + r * Math.sin(rad(a)))},${r2(cy - r * Math.cos(rad(a)))}`;
  const sweep = end - start;
  if (Math.abs(sweep) >= 360) {
    return `M${pt(start)}A${r},${r} 0 1 1 ${pt(start + 180)}A${r},${r} 0 1 1 ${pt(start + 359.99)}`;
  }
  return `M${pt(start)}A${r},${r} 0 ${Math.abs(sweep) > 180 ? 1 : 0} 1 ${pt(end)}`;
}

function pickColor(
  value: number,
  pct: number,
  thresholds: MeterThresholds | false,
  colorStops: GaugeColorStop[] | undefined,
  color: string
): { color: string; level: MeterLevel } {
  if (colorStops?.length) {
    const sorted = [...colorStops].sort((a, b) => a.value - b.value);
    let c = sorted[0]!.color;
    for (const s of sorted) if (value >= s.value) c = s.color;
    return { color: resolve(c), level: "ok" };
  }
  const level = meterLevel(pct, thresholds);
  return { color: level === "ok" ? resolve(color) : levelColor[level], level };
}

const gaugeSizes = {
  sm: { box: 72, stroke: 6, value: "text-sm", label: "text-2xs" },
  md: { box: 112, stroke: 9, value: "text-xl", label: "text-xs" },
  lg: { box: 160, stroke: 12, value: "text-display-xs", label: "text-sm" },
} as const;

export interface GaugeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color"> {
  value: number | null;
  min?: number;
  /** Default 100. */
  max?: number;
  label?: React.ReactNode;
  unit?: string;
  valueFormatter?: (value: number) => string;
  /** Arc start in degrees (0 = top, clockwise). Default -135. */
  startAngle?: number;
  /** Arc end in degrees. Default 135 (270° sweep). */
  endAngle?: number;
  /** Percent thresholds, same semantics as Meter. */
  thresholds?: MeterThresholds | false;
  /** Custom colors by absolute value (overrides thresholds). */
  colorStops?: GaugeColorStop[];
  /** Base tone below thresholds. Default `primary`. */
  tone?: ToneInput;
  /** @deprecated Use `tone`. */
  color?: MeterColor | ToneInput;
  /**
   * Categorical arc colour (a sensor or metric colour). Colour order: `colorStops`, then the warning/danger threshold
   * colours, then `tone`/`color`, then `accent`, then primary. Sets `--sutra-accent` on the root.
   */
  accent?: Accent;
  size?: "sm" | "md" | "lg";
  /** Stroke width override in px. */
  thickness?: number;
  /** Soft colored glow around the value arc. */
  glow?: boolean;
  /** Extra content under the value (replaces the label slot). */
  children?: React.ReactNode;
  ariaValueText?: string;
  /** Waiting for the first reading: with `value` null, the track stays empty and a placeholder stands in for the number. */
  loading?: boolean;
}

/** Radial arc gauge with threshold coloring (role="meter"). */
export const Gauge = React.forwardRef<HTMLDivElement, GaugeProps>(
  (
    {
      value,
      min = 0,
      max = 100,
      label,
      unit,
      valueFormatter = (v) => String(Math.round(v * 10) / 10),
      startAngle = -135,
      endAngle = 135,
      thresholds = defaultMeterThresholds,
      colorStops,
      tone,
      color,
      accent,
      size = "md",
      thickness,
      glow,
      children,
      ariaValueText,
      loading,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const labelId = React.useId();
    const s = gaugeSizes[size];
    const stroke = thickness ?? s.stroke;
    const empty = value === null || !Number.isFinite(value);
    const v = empty ? min : clamp(value as number, min, max);
    const pct = empty ? 0 : toPercent(v, max, min);
    const base = tone == null && color == null && accent ? accentColorValue : normalizeTone(tone ?? color, "primary");
    const { color: fill, level } = pickColor(empty ? min : (value as number), pct, thresholds, colorStops, base);
    const c = s.box / 2;
    const r = c - stroke / 2 - (glow ? 3 : 1);
    const d = arc(c, c, r, startAngle, endAngle);
    const text = empty ? "—" : valueFormatter(value as number);
    const skeleton = !!loading && empty;
    const valueText = ariaValueText ?? (skeleton ? "Loading" : empty ? "No data" : `${text}${unit ? ` ${unit}` : ""}`);

    return (
      <div
        ref={ref}
        role="meter"
        aria-valuenow={v}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : "Gauge"}
        aria-busy={loading || undefined}
        data-level={level}
        className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
        style={accentStyle(accent, { width: s.box, height: s.box, ...style })}
        {...props}
      >
        <svg width={s.box} height={s.box} viewBox={`0 0 ${s.box} ${s.box}`} aria-hidden="true" className="absolute inset-0 overflow-visible">
          <path d={d} fill="none" className="stroke-muted" strokeWidth={stroke} strokeLinecap="round" />
          {!empty && pct > 0 ? (
            <path
              data-slot="gauge-fill"
              d={d}
              fill="none"
              stroke={fill}
              strokeWidth={stroke}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${r2(pct)} 100`}
              className="transition-[stroke-dasharray,stroke] duration-500 ease-out-quart motion-reduce:transition-none"
              style={glow ? { filter: `drop-shadow(0 0 4px color-mix(in oklab, ${fill} 55%, transparent))` } : undefined}
            />
          ) : null}
        </svg>
        <div className="relative flex flex-col items-center leading-none">
          {skeleton ? (
            <span data-slot="gauge-value" className={cn("inline-flex items-center", s.value)}>
              <span className="sr-only">{`Loading ${typeof label === "string" ? label : "gauge"}…`}</span>
              <Skeleton shape="text" className="h-[0.9em] w-[2.2em]" />
            </span>
          ) : (
            <span data-slot="gauge-value" className={cn("font-mono font-semibold tabular-nums tracking-tight", s.value, empty ? "text-muted-foreground" : levelText[level])}>
              {text}
              {unit && !empty ? <span className="ml-0.5 text-[0.6em] font-medium text-muted-foreground">{unit}</span> : null}
            </span>
          )}
          {children ??
            (label ? (
              <span id={labelId} className={cn("mt-1 max-w-[80%] truncate text-center text-muted-foreground", s.label)}>
                {label}
              </span>
            ) : null)}
          {children && label ? (
            <span id={labelId} className="sr-only">
              {label}
            </span>
          ) : null}
        </div>
      </div>
    );
  }
);
Gauge.displayName = "Gauge";

export interface RingMeterProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Value in `max` units (percent by default). `null` means no reading yet: an empty track. */
  value: number | null;
  max?: number;
  /** Diameter in px. Default 20. */
  size?: number;
  thickness?: number;
  /** Show the percentage beside the ring once it reaches this percent. Default 50. Use 0 to always show. */
  showValueAbove?: number;
  thresholds?: MeterThresholds | false;
  /** Base tone below thresholds. Default `primary`. */
  tone?: ToneInput;
  /** @deprecated Use `tone`. */
  color?: MeterColor | ToneInput;
  /**
   * Categorical ring colour (a provider or metric colour). Colour order: the warning/danger threshold colours, then
   * `tone`/`color`, then `accent`, then primary. Sets `--sutra-accent` on the root.
   */
  accent?: Accent;
  /** Accessible name, e.g. "Context window". */
  label?: string;
  /** Extra content after the ring, e.g. a token count. */
  children?: React.ReactNode;
  /** Waiting for the first reading: with `value` null, the track stays empty and a placeholder stands in for the percentage. */
  loading?: boolean;
}

/**
 * Compact ring showing a fill level against thresholds (role="meter"), e.g. an AI context window.
 * It draws the same ring as `ProgressCircle` (`ProgressRingSvg`); use `ProgressCircle` for task completion (role="progressbar").
 */
export const RingMeter = React.forwardRef<HTMLSpanElement, RingMeterProps>(
  (
    {
      value,
      max = 100,
      size = 20,
      thickness,
      showValueAbove = 50,
      thresholds = defaultMeterThresholds,
      tone,
      color,
      accent,
      label = "Usage",
      children,
      loading,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const empty = value === null;
    const skeleton = !!loading && empty;
    const pct = empty ? 0 : toPercent(value, max);
    const level = meterLevel(pct, thresholds);
    const fill =
      level !== "ok"
        ? levelColor[level]
        : tone == null && color == null && accent
          ? accentColorValue
          : resolve(normalizeTone(tone ?? color, "primary"));
    const sw = thickness ?? Math.max(2, size / 8);
    const shown = !empty && pct >= showValueAbove;
    return (
      <span
        ref={ref}
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={skeleton ? "Loading" : empty ? "No data" : `${Math.round(pct)}%`}
        aria-busy={loading || undefined}
        data-level={level}
        className={cn("inline-flex items-center gap-1.5 align-middle", className)}
        style={accentStyle(accent, style)}
        {...props}
      >
        <ProgressRingSvg percent={pct} size={size} strokeWidth={sw} fillStroke={fill} fillSlot="ring-fill" />
        {skeleton ? (
          <span data-slot="ring-value" className="inline-flex items-center">
            <span className="sr-only">{`Loading ${label}…`}</span>
            <Skeleton shape="text" className="h-3 w-7" />
          </span>
        ) : shown ? (
          <span data-slot="ring-value" className={cn("text-xs font-medium tabular-nums", levelText[level] === "text-foreground" ? "text-muted-foreground" : levelText[level])}>
            {Math.round(pct)}%
          </span>
        ) : null}
        {children}
      </span>
    );
  }
);
RingMeter.displayName = "RingMeter";
