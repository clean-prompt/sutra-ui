import * as React from "react";
import { cn } from "../lib/cn";
import { chartColors } from "../lib/tokens";
import { toPercent } from "../lib/math";

/** Percent thresholds at which a meter turns warning / danger. */
export interface MeterThresholds {
  warn?: number;
  danger?: number;
}

export type MeterLevel = "ok" | "warn" | "danger";

export const defaultMeterThresholds: Required<MeterThresholds> = { warn: 75, danger: 90 };

/** Level for a percentage given thresholds (higher is worse). */
export function meterLevel(percent: number, thresholds: MeterThresholds | false = defaultMeterThresholds): MeterLevel {
  if (thresholds === false) return "ok";
  const danger = thresholds.danger ?? defaultMeterThresholds.danger;
  const warn = thresholds.warn ?? defaultMeterThresholds.warn;
  if (percent >= danger) return "danger";
  if (percent >= warn) return "warn";
  return "ok";
}

export type MeterColor = "primary" | "success" | "warning" | "destructive" | "info" | "neutral";

const fillClass: Record<MeterColor, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-foreground",
};

const levelFill: Record<MeterLevel, string> = { ok: "", warn: "bg-warning", danger: "bg-destructive" };
const levelText: Record<MeterLevel, string> = { ok: "text-foreground", warn: "text-warning", danger: "text-destructive" };


const trim = (n: number) => Number(n.toFixed(n !== 0 && Math.abs(n) < 10 ? 1 : n % 1 === 0 ? 0 : 1)).toString();

const trackHeight = { sm: "h-1.5", md: "h-2", lg: "h-3" } as const;

export interface MeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color"> {
  label?: React.ReactNode;
  /** Current value; `null` renders an empty "no data" meter. */
  value: number | null;
  min?: number;
  /** Default 100. */
  max?: number;
  /** Unit appended to the default value text: "62.1 / 80 GB". Without it the text is a percentage. */
  unit?: string;
  /** Custom value text, or a formatter. Strings are also used as aria-valuetext. */
  valueText?: React.ReactNode | ((value: number, max: number, percent: number) => React.ReactNode);
  /** Percent thresholds for automatic warning/danger color, or false to disable. */
  thresholds?: MeterThresholds | false;
  /** Base fill color when below thresholds (or always, if thresholds are off). Default primary. */
  color?: MeterColor;
  /** Secondary line under the bar, e.g. "resets in 2h". */
  caption?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Render as n discrete blocks instead of a continuous bar. */
  segments?: number;
  /** Show the value text next to the label. Default true. */
  showValue?: boolean;
  /** Screen-reader value text override. */
  ariaValueText?: string;
  barClassName?: string;
}

/** Labeled usage meter with threshold coloring (role="meter"). */
export const Meter = React.forwardRef<HTMLDivElement, MeterProps>(
  (
    {
      label,
      value,
      min = 0,
      max = 100,
      unit,
      valueText,
      thresholds = defaultMeterThresholds,
      color = "primary",
      caption,
      size = "md",
      segments,
      showValue = true,
      ariaValueText,
      className,
      barClassName,
      ...props
    },
    ref
  ) => {
    const labelId = React.useId();
    const empty = value === null || !Number.isFinite(value);
    const v = empty ? min : (value as number);
    const pct = empty ? 0 : toPercent(v, max, min);
    const level = empty ? "ok" : meterLevel(pct, thresholds);
    const fill = level === "ok" ? fillClass[color] : levelFill[level];

    const text: React.ReactNode = empty
      ? "—"
      : typeof valueText === "function"
        ? valueText(v, max, pct)
        : valueText !== undefined
          ? valueText
          : unit !== undefined
            ? `${trim(v)} / ${trim(max)} ${unit}`.trim()
            : `${Math.round(pct)}%`;
    const ariaText =
      ariaValueText ??
      (empty ? "No data" : typeof text === "string" || typeof text === "number" ? String(text) : `${Math.round(pct)}%`);

    const lgText = size === "lg" ? "text-sm" : size === "sm" ? "text-xs" : "text-sm";

    return (
      <div ref={ref} data-level={level} className={cn("w-full", className)} {...props}>
        {label || showValue ? (
          <div className={cn("mb-1.5 flex items-baseline justify-between gap-3", lgText)}>
            {label ? (
              <span id={labelId} className={cn("truncate font-medium text-foreground", size === "sm" && "text-muted-foreground")}>
                {label}
              </span>
            ) : (
              <span />
            )}
            {showValue ? (
              <span data-slot="meter-value" className={cn("shrink-0 font-mono font-semibold tabular-nums", empty ? "text-muted-foreground" : levelText[level])}>
                {text}
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          role="meter"
          aria-valuenow={v}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={ariaText}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : "Usage"}
          className={cn(segments ? "flex gap-0.5" : "relative overflow-hidden rounded-full bg-muted", trackHeight[size], barClassName)}
        >
          {segments ? (
            Array.from({ length: segments }, (_, i) => {
              const on = i < Math.round((pct / 100) * segments);
              return (
                <span
                  key={i}
                  data-slot="meter-segment"
                  data-state={on ? "on" : "off"}
                  className={cn("h-full flex-1 rounded-[2px] transition-colors duration-300 motion-reduce:transition-none", on ? fill : "bg-muted")}
                />
              );
            })
          ) : (
            <span
              data-slot="meter-fill"
              className={cn("block h-full rounded-full transition-[width] duration-500 ease-out-quart motion-reduce:transition-none", fill)}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
        {caption ? <div className="mt-1 text-xs text-muted-foreground">{caption}</div> : null}
      </div>
    );
  }
);
Meter.displayName = "Meter";

export interface MeterGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Grid columns on wide screens. Default 1 (stacked). */
  columns?: 1 | 2 | 3 | 4;
}

const groupCols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

/** Stack (or grid) of Meters, e.g. CPU / RAM / GPU / VRAM. */
export const MeterGroup = React.forwardRef<HTMLDivElement, MeterGroupProps>(
  ({ columns = 1, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      data-slot="meter-group"
      className={cn("grid grid-cols-1 gap-x-6 gap-y-3.5", groupCols[columns], className)}
      {...props}
    />
  )
);
MeterGroup.displayName = "MeterGroup";

export interface StackedMeterPart {
  key?: string;
  label: string;
  value: number;
  /** Token name or CSS color. Defaults to chartColors in order. */
  color?: string;
}

const tokenColor: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
  muted: "var(--muted-foreground)",
};

export interface StackedMeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label?: React.ReactNode;
  parts: StackedMeterPart[];
  /** Capacity. Defaults to the sum of parts (bar is full). */
  max?: number;
  valueFormatter?: (value: number) => string;
  /** Text beside the label. Defaults to "used / max" when `max` is set. */
  valueText?: React.ReactNode;
  /** Legend under the bar. Default true. */
  legend?: boolean;
  /** Show each part's percentage in the legend. */
  showPercent?: boolean;
  size?: "sm" | "md" | "lg";
  caption?: React.ReactNode;
}

/** One bar split into colored parts with a legend (storage breakdown, wait vs. generate…). */
export const StackedMeter = React.forwardRef<HTMLDivElement, StackedMeterProps>(
  (
    {
      label,
      parts,
      max,
      valueFormatter = (v) => trim(v),
      valueText,
      legend = true,
      showPercent,
      size = "md",
      caption,
      className,
      ...props
    },
    ref
  ) => {
    const labelId = React.useId();
    const used = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
    const capacity = max ?? used;
    const resolved = parts.map((p, i) => ({
      ...p,
      key: p.key ?? p.label,
      color: tokenColor[p.color ?? ""] ?? p.color ?? chartColors[i % chartColors.length]!,
      pct: capacity > 0 ? (Math.max(0, p.value) / capacity) * 100 : 0,
    }));
    const text = valueText ?? (max !== undefined ? `${valueFormatter(used)} / ${valueFormatter(max)}` : valueFormatter(used));
    const summary = `${resolved.map((p) => `${p.label} ${valueFormatter(p.value)}`).join(", ")}${max !== undefined ? ` of ${valueFormatter(max)}` : ""}`;

    return (
      <div ref={ref} role="group" aria-labelledby={label ? labelId : undefined} className={cn("w-full", className)} {...props}>
        {label || text ? (
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            {label ? (
              <span id={labelId} className="font-medium text-foreground">
                {label}
              </span>
            ) : (
              <span />
            )}
            <span className="font-mono font-semibold tabular-nums text-foreground">{text}</span>
          </div>
        ) : null}
        <div role="img" aria-label={summary} className={cn("flex w-full gap-0.5 overflow-hidden rounded-full bg-muted", trackHeight[size])}>
          {resolved.map((p) =>
            p.pct > 0 ? (
              <span
                key={p.key}
                data-slot="stacked-meter-part"
                title={`${p.label}: ${valueFormatter(p.value)}`}
                className="block h-full transition-[width] duration-500 ease-out-quart first:rounded-l-full last:rounded-r-full motion-reduce:transition-none"
                style={{ width: `${p.pct}%`, backgroundColor: p.color }}
              />
            ) : null
          )}
        </div>
        {legend ? (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {resolved.map((p) => (
              <li key={p.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden className="size-2 rounded-[2px]" style={{ backgroundColor: p.color }} />
                {p.label}
                <span className="font-mono tabular-nums text-foreground">{valueFormatter(p.value)}</span>
                {showPercent ? <span className="tabular-nums">({Math.round(p.pct)}%)</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {caption ? <div className="mt-1 text-xs text-muted-foreground">{caption}</div> : null}
      </div>
    );
  }
);
StackedMeter.displayName = "StackedMeter";
