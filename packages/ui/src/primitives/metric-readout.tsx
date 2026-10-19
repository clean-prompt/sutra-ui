import * as React from "react";
import { cn } from "../lib/cn";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";
import { accentClasses, accentStyle, type Accent } from "../lib/accent";
import { Skeleton } from "./progress";

/**
 * Absolute strain thresholds for a reading (same units as the value). Higher is worse when `danger` ≥ `warning`
 * (CPU 70 / 90 %); lower is worse when `danger` < `warning` (battery 20 / 10 %).
 */
export interface ReadoutThresholds {
  warning: number;
  danger: number;
}

/** Strain level of a reading: `normal`, `warning` or `danger`. */
export type ReadoutLevel = "normal" | "warning" | "danger";

/** Classify a value against strain thresholds. Non-finite values and `false`/missing thresholds read as `normal`. */
export function readoutLevel(value: number | null | undefined, thresholds: ReadoutThresholds | false | null | undefined): ReadoutLevel {
  if (!thresholds || typeof value !== "number" || !Number.isFinite(value)) return "normal";
  const { warning, danger } = thresholds;
  if (danger >= warning) return value >= danger ? "danger" : value >= warning ? "warning" : "normal";
  return value <= danger ? "danger" : value <= warning ? "warning" : "normal";
}

/** Canonical tone for a strain level (`normal` → `neutral`). */
export function readoutLevelTone(level: ReadoutLevel): Extract<Tone, "neutral" | "warning" | "destructive"> {
  return level === "danger" ? "destructive" : level === "warning" ? "warning" : "neutral";
}

/** Status words appended to the accessible text. */
export interface ReadoutStatusLabels {
  /** Default "high". */
  warning?: string;
  /** Default "critical". */
  danger?: string;
}

const defaultNumber = (locale?: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

/** Join a value and its unit: "92%", "72°", "72 °C", "4.9 MB/s". */
export function joinReadoutUnit(value: string, unit: string | undefined): string {
  if (!unit) return value;
  return unit === "%" || unit === "°" ? `${value}${unit}` : `${value} ${unit}`;
}

const sizes = {
  xs: { root: "h-5 gap-1 text-2xs", pill: "px-1.5", icon: "[&_svg]:size-3", unit: "text-[0.85em]" },
  sm: { root: "h-6 gap-1.5 text-xs", pill: "px-2", icon: "[&_svg]:size-3.5", unit: "text-[0.85em]" },
} as const;

/** `toneClasses.text`, but a neutral reading stays full-strength foreground. */
const textTone: Record<Tone, string> = { ...toneClasses.text, neutral: "text-foreground" };

export interface MetricReadoutProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Short name before the value ("CPU", "GPU", "Fan"). */
  label?: React.ReactNode;
  /** Plain-text label for the accessible text when `label` is not a string. */
  labelText?: string;
  /** Numeric readings are formatted and classified by `thresholds`; strings are shown as given; `null` shows "—". */
  value: number | string | null | undefined;
  /** "%", "°C", "rpm", "MB/s" … */
  unit?: string;
  /** Formats a numeric value. Default: whole numbers in the locale ("2,400"). */
  formatValue?: (value: number) => string;
  /** Leading icon (decorative). */
  icon?: React.ReactNode;
  /** Tiny trailing chart, e.g. `<SparkBar data={…} width={24} height={12} />` (decorative here; the text names the reading). */
  trend?: React.ReactNode;
  /** Absolute thresholds for the strain colour. */
  thresholds?: ReadoutThresholds | false;
  /** Explicit semantic colour; wins over `thresholds`. */
  tone?: ToneInput;
  /** Words added to the accessible text when strained. */
  statusLabels?: ReadoutStatusLabels;
  /** Replaces the status word ("throttling"), or `false` for none. */
  statusText?: string | false;
  /** `plain` (menu-bar text) or `pill` (a filled chip that turns soft warning / destructive under strain). Default `plain`. */
  variant?: "plain" | "pill";
  /** Default `sm`. */
  size?: "xs" | "sm";
  /** Icon colour while the reading is normal. Default: muted. */
  accent?: Accent;
  /** BCP 47 locale used by the default number formatter. */
  locale?: string;
  /** Waiting for the first reading: with no `value` the label stays and the value is a short placeholder. */
  loading?: boolean;
}

/**
 * Compact menu-bar style reading ("CPU 92%"): optional icon, label, tabular value with unit and a tiny trend slot.
 * It turns warning or destructive under strain (from `thresholds` or `tone`), and its accessible text reads
 * "CPU 92%, high".
 */
export const MetricReadout = React.forwardRef<HTMLSpanElement, MetricReadoutProps>(
  (
    {
      label,
      labelText,
      value,
      unit,
      formatValue,
      icon,
      trend,
      thresholds,
      tone: toneProp,
      statusLabels,
      statusText,
      variant = "plain",
      size = "sm",
      accent,
      locale,
      loading,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const numeric = typeof value === "number" && Number.isFinite(value);
    const empty = value === null || value === undefined || (typeof value === "number" && !numeric) || value === "";
    const skeleton = Boolean(loading) && empty;
    const level: ReadoutLevel = skeleton
      ? "normal"
      : toneProp
      ? (() => {
          const t = normalizeTone(toneProp);
          return t === "destructive" ? "danger" : t === "warning" ? "warning" : "normal";
        })()
      : numeric
        ? readoutLevel(value as number, thresholds)
        : "normal";
    const tone: Tone = toneProp && !skeleton ? normalizeTone(toneProp) : readoutLevelTone(level);
    const shown = empty ? "—" : numeric ? (formatValue ?? defaultNumber(locale).format)(value as number) : String(value);
    const status =
      statusText === false
        ? null
        : (statusText ?? (level === "danger" ? (statusLabels?.danger ?? "critical") : level === "warning" ? (statusLabels?.warning ?? "high") : null));
    const name = labelText ?? (typeof label === "string" || typeof label === "number" ? String(label) : "");
    const reading = empty ? "no data" : joinReadoutUnit(shown, unit);
    const accessible = skeleton
      ? `Loading ${name || "reading"}…`
      : [name ? `${name} ${reading}` : reading, status].filter(Boolean).join(", ");
    const s = sizes[size];
    const pill = variant === "pill";

    return (
      <span
        ref={ref}
        aria-busy={loading || undefined}
        data-slot="metric-readout"
        data-level={level}
        data-tone={tone}
        style={accentStyle(accent, style)}
        className={cn(
          "inline-flex shrink-0 items-center whitespace-nowrap align-middle font-medium leading-none",
          s.root,
          pill && cn("rounded-control", s.pill, tone === "neutral" ? "bg-muted text-foreground" : toneClasses.soft[tone]),
          !pill && textTone[tone],
          className
        )}
        {...props}
      >
        <span aria-hidden className="contents">
          {icon ? (
            <span
              data-slot="metric-readout-icon"
              className={cn("inline-flex shrink-0", s.icon, tone === "neutral" ? (accent ? accentClasses.text : "text-muted-foreground") : "text-current")}
            >
              {icon}
            </span>
          ) : null}
          {label !== undefined && label !== null && label !== false ? (
            <span data-slot="metric-readout-label" className={cn(tone === "neutral" ? "text-muted-foreground" : "text-current opacity-80")}>
              {label}
            </span>
          ) : null}
          {skeleton ? (
            <Skeleton shape="text" data-slot="metric-readout-value-skeleton" className="inline-block w-[2.5em] shrink-0" />
          ) : (
          <span data-slot="metric-readout-value" className={cn("font-semibold tabular-nums", empty && "text-muted-foreground")}>
            {shown}
            {unit && !empty ? (
              <span className={cn(s.unit, unit === "%" || unit === "°" ? "" : "ms-0.5", tone === "neutral" && "text-muted-foreground")}>{unit}</span>
            ) : null}
          </span>
          )}
          {trend ? (
            <span data-slot="metric-readout-trend" className="inline-flex shrink-0 items-center">
              {trend}
            </span>
          ) : null}
        </span>
        <span className="sr-only">{accessible}</span>
      </span>
    );
  }
);
MetricReadout.displayName = "MetricReadout";

export interface MetricReadoutGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible name of the strip, e.g. "System readings". */
  label?: string;
  /** Divider between readouts: a thin `line` (default), a `dot`, or `none` (just spacing). */
  separator?: "line" | "dot" | "none";
  /** Default `sm`; sets the gap and separator height. */
  size?: "xs" | "sm";
}

/** A menu-bar strip of `MetricReadout`s with separators between them (role="group"). */
export const MetricReadoutGroup = React.forwardRef<HTMLDivElement, MetricReadoutGroupProps>(
  ({ label, separator = "line", size = "sm", className, children, ...props }, ref) => {
    const items = React.Children.toArray(children).filter(Boolean);
    return (
      <div
        ref={ref}
        role="group"
        aria-label={label}
        data-slot="metric-readout-group"
        className={cn("inline-flex flex-wrap items-center", size === "xs" ? "gap-x-2 gap-y-1" : "gap-x-2.5 gap-y-1", className)}
        {...props}
      >
        {items.map((child, i) => (
          <React.Fragment key={React.isValidElement(child) && child.key != null ? child.key : i}>
            {i > 0 && separator !== "none" ? (
              <span
                aria-hidden
                data-slot="metric-readout-separator"
                className={cn(
                  "shrink-0",
                  separator === "dot" ? "size-0.5 rounded-full bg-muted-foreground/60" : cn("w-px bg-border", size === "xs" ? "h-3" : "h-3.5")
                )}
              />
            ) : null}
            {child}
          </React.Fragment>
        ))}
      </div>
    );
  }
);
MetricReadoutGroup.displayName = "MetricReadoutGroup";
