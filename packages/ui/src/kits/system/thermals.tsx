import { toTemperatureUnit, temperatureUnitSymbol, type TemperatureUnit } from "../../lib/temperature";
import * as React from "react";
import {
  RiBatteryLine,
  RiCpuLine,
  RiHardDrive2Line,
  RiInformationLine,
  RiStackLine,
  RiTempHotLine,
  RiWindyLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { accentClasses, accentColorValue, accentStyle, type Accent } from "../../lib/accent";
import { toneClasses } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Meter } from "../../primitives/meter";
import { Slider } from "../../primitives/slider";
import { SegmentedControl } from "../../primitives/segmented-control";
import { InlineAlert } from "../../primitives/inline-alert";
import { Skeleton } from "../../primitives/progress";
import {
  joinReadoutUnit,
  readoutLevel,
  readoutLevelTone,
  type ReadoutLevel,
  type ReadoutStatusLabels,
  type ReadoutThresholds,
} from "../../primitives/metric-readout";
import { Gauge } from "../../patterns/gauge";
import { Sparkline } from "../../patterns/sparkline";
import { BarList, type BarListProps } from "../../patterns/bar-list";

/* ------------------------------------------------------------------ */
/* Temperature helpers                                                 */
/* ------------------------------------------------------------------ */


export { celsiusToFahrenheit, fahrenheitToCelsius, toTemperatureUnit, fromTemperatureUnit, temperatureUnitSymbol, type TemperatureUnit } from "../../lib/temperature";

/** Default temperature thresholds in °C: warning at 80, danger at 95. */
export const defaultThermalThresholds: ReadoutThresholds = { warning: 80, danger: 95 };


export interface FormatTemperatureOptions {
  unit?: TemperatureUnit;
  /** Fraction digits. Default 0. */
  decimals?: number;
  locale?: string;
}

/** Format a °C reading for display: "72 °C", "162 °F"; "—" for a missing reading. */
export function formatTemperature(celsius: number | null | undefined, { unit = "celsius", decimals = 0, locale }: FormatTemperatureOptions = {}): string {
  if (typeof celsius !== "number" || !Number.isFinite(celsius)) return "—";
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(toTemperatureUnit(celsius, unit));
  return joinReadoutUnit(n, temperatureUnitSymbol(unit));
}

/** Format fan speed: "2,400 rpm"; "—" for a missing reading. */
export function formatRpm(rpm: number | null | undefined, locale?: string): string {
  if (typeof rpm !== "number" || !Number.isFinite(rpm)) return "—";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(rpm)} rpm`;
}

/** A °C threshold as a percent of the min–max scale (what Gauge and Meter thresholds expect). */
const toScalePercent = (celsius: number, min: number, max: number) => (max > min ? clamp(((celsius - min) / (max - min)) * 100, 0, 100) : 100);

const thermalStatus = (level: ReadoutLevel, labels?: ReadoutStatusLabels) =>
  level === "danger" ? (labels?.danger ?? "critical") : level === "warning" ? (labels?.warning ?? "hot") : null;

const levelTextClass: Record<ReadoutLevel, string> = {
  normal: "text-foreground",
  warning: toneClasses.text.warning,
  danger: toneClasses.text.destructive,
};

export type ThermalSensorKind = "cpu" | "gpu" | "ssd" | "battery" | "other";

const KIND_ICONS: Record<ThermalSensorKind, RemixiconComponentType> = {
  cpu: RiCpuLine,
  gpu: RiStackLine,
  ssd: RiHardDrive2Line,
  battery: RiBatteryLine,
  other: RiTempHotLine,
};

const kindIcon = (kind: string | undefined) => {
  const Icon = kind && Object.hasOwn(KIND_ICONS, kind) ? KIND_ICONS[kind as ThermalSensorKind] : RiTempHotLine;
  return <Icon />;
};

/* ------------------------------------------------------------------ */
/* TemperatureReading                                                  */
/* ------------------------------------------------------------------ */

export interface TemperatureReadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** "CPU", "GPU", "SSD", "Battery". */
  label: string;
  /** Reading in °C; `null` shows "—". */
  value: number | null | undefined;
  /** Display unit (inputs stay °C). Default `celsius`. */
  unit?: TemperatureUnit;
  /** In °C. Default warning 80, danger 95. */
  thresholds?: ReadoutThresholds;
  /** Scale bottom in °C. Default 20. */
  min?: number;
  /** Scale top in °C. Default 110. */
  max?: number;
  /** `meter`: a labelled bar row (default). `gauge`: a radial gauge. */
  variant?: "meter" | "gauge";
  /** Recent readings in °C, drawn as a sparkline. */
  history?: number[];
  /** Sensor kind, for the default icon. */
  kind?: ThermalSensorKind | (string & {});
  /** Replaces the kind icon (decorative). Pass `null` for none. */
  icon?: React.ReactNode;
  /** Secondary line ("Apple M2 Max", "Throttling below 100 °C"). */
  caption?: React.ReactNode;
  /** Status words when strained. Default "hot" / "critical". */
  statusLabels?: ReadoutStatusLabels;
  /** Colour of a normal reading. Default "orange". */
  accent?: Accent;
  locale?: string;
}

/** One temperature sensor: a bar or gauge coloured by thresholds, the value in °C or °F and an optional history sparkline. */
export const TemperatureReading = React.forwardRef<HTMLDivElement, TemperatureReadingProps>(
  (
    {
      label,
      value,
      unit = "celsius",
      thresholds = defaultThermalThresholds,
      min = 20,
      max = 110,
      variant = "meter",
      history,
      kind,
      icon,
      caption,
      statusLabels,
      accent = "orange",
      locale,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const has = typeof value === "number" && Number.isFinite(value);
    const level = has ? readoutLevel(value, thresholds) : "normal";
    const tone = readoutLevelTone(level);
    const status = thermalStatus(level, statusLabels);
    const text = formatTemperature(value, { unit, locale });
    const ariaText = has ? [text, status].filter(Boolean).join(", ") : "No data";
    const display = has ? toTemperatureUnit(value, unit) : null;
    const lo = toTemperatureUnit(min, unit);
    const hi = toTemperatureUnit(max, unit);
    const iconNode = icon === undefined ? kindIcon(kind) : icon;
    const historyData = history?.filter(Number.isFinite).map((c) => toTemperatureUnit(c, unit));
    const spark =
      historyData && historyData.length > 1 ? (
        <Sparkline
          data={historyData}
          type="area"
          responsive={variant === "meter"}
          width={variant === "meter" ? 240 : 96}
          height={variant === "meter" ? 28 : 24}
          tone={level === "normal" ? undefined : tone}
          color={level === "normal" ? accentColorValue : undefined}
          label={`${label} temperature history, ${formatTemperature(history![history!.length - 1], { unit, locale })} now`}
          wrapperClassName={variant === "meter" ? "mt-2" : undefined}
        />
      ) : null;

    if (variant === "gauge") {
      return (
        <div
          ref={ref}
          data-slot="temperature-reading"
          data-level={level}
          style={accentStyle(accent, style)}
          className={cn("flex flex-col items-center gap-1.5 text-center", className)}
          {...props}
        >
          <Gauge
            value={display}
            min={lo}
            max={hi}
            unit={temperatureUnitSymbol(unit)}
            valueFormatter={(v) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v)}
            thresholds={{ warn: toScalePercent(thresholds.warning, min, max), danger: toScalePercent(thresholds.danger, min, max) }}
            accent={accent}
            label={label}
            ariaValueText={ariaText}
          />
          {status ? (
            <span data-slot="temperature-reading-status" aria-hidden className={cn("text-xs font-medium capitalize transition-colors duration-300", levelTextClass[level])}>
              {status}
            </span>
          ) : caption ? (
            <span className="text-xs text-muted-foreground">{caption}</span>
          ) : null}
          {spark}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-slot="temperature-reading"
        data-level={level}
        style={accentStyle(accent, style)}
        className={cn("w-full", className)}
        {...props}
      >
        <Meter
          label={
            <span className="inline-flex min-w-0 items-center gap-2">
              {iconNode ? (
                <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5", accentClasses.soft)}>
                  {iconNode}
                </span>
              ) : null}
              <span className="truncate">{label}</span>
            </span>
          }
          value={display}
          min={lo}
          max={hi}
          thresholds={false}
          tone={level === "normal" ? undefined : tone}
          accent={accent}
          valueText={
            <span className={cn("transition-colors duration-300", levelTextClass[level])}>
              {text}
              {status ? <span className="ml-1.5 font-sans text-xs font-medium capitalize">{status}</span> : null}
            </span>
          }
          ariaValueText={ariaText}
          caption={caption}
        />
        {spark}
      </div>
    );
  }
);
TemperatureReading.displayName = "TemperatureReading";

/* ------------------------------------------------------------------ */
/* ThermalSensors                                                      */
/* ------------------------------------------------------------------ */

export interface ThermalSensor {
  id: string;
  label: string;
  kind?: ThermalSensorKind | (string & {});
  /** Reading in °C. */
  value: number | null;
  /** Recent readings in °C. */
  history?: number[];
  /** Per-sensor thresholds in °C (an SSD runs cooler than a CPU). */
  thresholds?: ReadoutThresholds;
  icon?: React.ReactNode;
  caption?: React.ReactNode;
}

export interface ThermalSensorsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  sensors: ThermalSensor[];
  /** Display unit (readings stay °C). */
  unit?: TemperatureUnit;
  defaultUnit?: TemperatureUnit;
  onUnitChange?: (unit: TemperatureUnit) => void;
  /** Show the °C / °F switch in the header. Default true when `onUnitChange` is set. */
  showUnitToggle?: boolean;
  /** Default thresholds in °C for sensors without their own. */
  thresholds?: ReadoutThresholds;
  /** Scale bottom and top in °C. Default 20–110. */
  min?: number;
  max?: number;
  /** `meter` rows (default) or a grid of `gauge`s. */
  variant?: "meter" | "gauge";
  /** Header title. Default "Temperatures"; `null` hides the header (unless the unit switch is shown). */
  title?: React.ReactNode;
  statusLabels?: ReadoutStatusLabels;
  /** Default "orange". */
  accent?: Accent;
  /** Shown when `sensors` is empty. Default "No temperature sensors". */
  emptyState?: React.ReactNode;
  /** Accessible name of the list. Default "Temperature sensors". */
  label?: string;
  locale?: string;
  /** Data is on its way. With no sensors yet the card shows placeholder rows; with sensors the root is only marked busy. */
  loading?: boolean;
  /** Placeholder sensors while loading. Default 4. */
  loadingRows?: number;
}

/** CPU / GPU / SSD / battery temperatures in a card, coloured by thresholds, with an optional °C / °F switch. */
export const ThermalSensors = React.forwardRef<HTMLDivElement, ThermalSensorsProps>(
  (
    {
      sensors,
      unit: unitProp,
      defaultUnit = "celsius",
      onUnitChange,
      showUnitToggle = onUnitChange !== undefined,
      thresholds = defaultThermalThresholds,
      min,
      max,
      variant = "meter",
      title = "Temperatures",
      statusLabels,
      accent = "orange",
      emptyState = "No temperature sensors",
      label = "Temperature sensors",
      locale,
      loading = false,
      loadingRows = 4,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const skeleton = loading && sensors.length === 0;
    const [unit, setUnit] = useControllableState<TemperatureUnit>({ value: unitProp, defaultValue: defaultUnit, onChange: onUnitChange });
    const titleId = React.useId();
    const showHeader = title != null || showUnitToggle;

    return (
      <section
        ref={ref}
        data-slot="thermal-sensors"
        aria-busy={loading || undefined}
        aria-labelledby={title != null ? titleId : undefined}
        aria-label={title != null ? undefined : label}
        style={accentStyle(accent, style)}
        className={cn("flex flex-col gap-4 rounded-box border border-border bg-card p-4 text-sm shadow-xs", className)}
        {...props}
      >
        {showHeader ? (
          <div className="flex items-center justify-between gap-3">
            {title != null ? (
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", accentClasses.soft)}>
                  <RiTempHotLine />
                </span>
                <h3 id={titleId} className={cn("truncate text-base font-semibold", accentClasses.text)}>
                  {title}
                </h3>
              </div>
            ) : (
              <span />
            )}
            {showUnitToggle ? (
              <SegmentedControl
                size="sm"
                aria-label="Temperature unit"
                value={unit}
                onValueChange={(v) => setUnit(v as TemperatureUnit)}
                options={[
                  { value: "celsius", label: "°C", "aria-label": "Celsius" },
                  { value: "fahrenheit", label: "°F", "aria-label": "Fahrenheit" },
                ]}
              />
            ) : null}
          </div>
        ) : null}
        {skeleton ? (
          <>
            <span className="sr-only">Loading temperatures…</span>
            <ul
              aria-hidden
              className={cn(
                "m-0 list-none p-0",
                variant === "gauge" ? "grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4" : "flex flex-col gap-4"
              )}
            >
              {Array.from({ length: Math.max(0, loadingRows) }, (_, i) => (
                <li key={i} data-slot="thermal-sensors-skeleton" className="min-w-0">
                  {variant === "gauge" ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Skeleton shape="circle" width={112} />
                      <Skeleton shape="text" className="w-12" />
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Skeleton className="size-6 shrink-0 rounded-md" />
                          <Skeleton shape="text" className="w-20" />
                        </div>
                        <Skeleton shape="text" className="w-12 shrink-0" />
                      </div>
                      <Skeleton className="h-2 rounded-full" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : sensors.length === 0 ? (
          <div data-slot="thermal-sensors-empty" className="py-6 text-center text-muted-foreground">
            {emptyState}
          </div>
        ) : (
          <ul
            role="list"
            aria-label={label}
            className={cn(
              "m-0 list-none p-0",
              variant === "gauge" ? "grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4" : "flex flex-col gap-4"
            )}
          >
            {sensors.map((s) => (
              <li key={s.id} data-slot="thermal-sensors-item" className="min-w-0">
                <TemperatureReading
                  label={s.label}
                  value={s.value}
                  unit={unit}
                  thresholds={s.thresholds ?? thresholds}
                  min={min}
                  max={max}
                  variant={variant}
                  history={s.history}
                  kind={s.kind}
                  icon={s.icon}
                  caption={s.caption}
                  statusLabels={statusLabels}
                  accent={accent}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
);
ThermalSensors.displayName = "ThermalSensors";

/* ------------------------------------------------------------------ */
/* FanControl                                                          */
/* ------------------------------------------------------------------ */

export type FanMode = "auto" | "fixed";

export interface FanControlFan {
  id: string;
  /** "Left fan", "Right fan". */
  name: string;
  /** Current speed; `null` when unknown. */
  rpm: number | null;
  minRpm: number;
  maxRpm: number;
  mode: FanMode;
  /** Held speed in Fixed mode. Defaults to the current speed rounded to the step. */
  targetRpm?: number;
  /** Speed the system wants right now; a lower fixed target shows the default safety message. */
  needRpm?: number;
  /** Safety message for this fan (replaces the default one); `false` hides it. */
  warning?: React.ReactNode | false;
}

export interface FanControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  fans: FanControlFan[];
  onModeChange?: (id: string, mode: FanMode) => void;
  /** Fires while the target slider moves. */
  onTargetChange?: (id: string, rpm: number) => void;
  /** Fires once when the slider is released or a key press ends; write the fan speed here. */
  onTargetCommit?: (id: string, rpm: number) => void;
  /** Slider step in rpm. Default 100. */
  step?: number;
  /** Turns every control off (e.g. the privileged helper is not installed). */
  disabled?: boolean;
  /** Why the controls are off, with any action ("Install Helper…"); shown above the fans when `disabled`. */
  disabledReason?: React.ReactNode;
  /** Note under a fixed fan's slider. Default "Returns to automatic when the app quits"; `false` hides it. */
  note?: React.ReactNode | false;
  /** Default "orange". */
  accent?: Accent;
  /** Shown when `fans` is empty. Default "No controllable fans". */
  emptyState?: React.ReactNode;
  /** Accessible name of the list. Default "Fans". */
  label?: string;
  locale?: string;
  /** Data is on its way. With no fans yet placeholder fan cards are shown (no mode switch or slider); with fans the root is only marked busy. */
  loading?: boolean;
  /** Placeholder fans while loading. Default 2. */
  loadingRows?: number;
}

const MODE_OPTIONS = [
  { value: "auto", label: "Automatic" },
  { value: "fixed", label: "Fixed" },
];

/**
 * Fan speeds with a per-fan Automatic / Fixed switch and, when Fixed, a target slider (step 100, "2,400 rpm").
 * Shows a note that fans return to automatic when the app quits, and a safety message when the target is below
 * what the system needs. Data in, events out.
 */
export const FanControl = React.forwardRef<HTMLDivElement, FanControlProps>(
  (
    {
      fans,
      onModeChange,
      onTargetChange,
      onTargetCommit,
      step = 100,
      disabled,
      disabledReason,
      note = "Returns to automatic when the app quits",
      accent = "orange",
      emptyState = "No controllable fans",
      label = "Fans",
      locale,
      loading = false,
      loadingRows = 2,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const skeleton = loading && fans.length === 0;
    const baseId = React.useId();
    return (
      <div
        ref={ref}
        data-slot="fan-control"
        data-disabled={disabled ? "" : undefined}
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn("flex flex-col gap-3 text-sm", className)}
        {...props}
      >
        {disabled && disabledReason ? (
          <InlineAlert tone="info" data-slot="fan-control-disabled-reason">
            {disabledReason}
          </InlineAlert>
        ) : null}
        {skeleton ? (
          <>
            <span className="sr-only">Loading fans…</span>
            <ul aria-hidden className="m-0 flex list-none flex-col gap-3 p-0">
              {Array.from({ length: Math.max(0, loadingRows) }, (_, i) => (
                <li key={i} data-slot="fan-control-skeleton" className="flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Skeleton className="size-9 shrink-0 rounded-lg" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Skeleton shape="text" className="w-24 max-w-full" />
                        <Skeleton shape="text" className="h-[0.7em] w-28 max-w-full" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton data-slot="fan-control-skeleton-rpm" shape="text" className="h-[1.1em] w-20" />
                      <span className="text-xs text-muted-foreground">Current</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : fans.length === 0 ? (
          <div data-slot="fan-control-empty" className="rounded-box border border-border bg-card px-4 py-6 text-center text-muted-foreground shadow-xs">
            {emptyState}
          </div>
        ) : (
          <ul role="list" aria-label={label} className="m-0 flex list-none flex-col gap-3 p-0">
            {fans.map((fan, i) => {
              const nameId = `${baseId}-${i}`;
              const fixed = fan.mode === "fixed";
              const lo = Math.min(fan.minRpm, fan.maxRpm);
              const hi = Math.max(fan.minRpm, fan.maxRpm);
              const snap = (v: number) => clamp(Math.round(v / step) * step, lo, hi);
              const target = snap(fan.targetRpm ?? fan.rpm ?? lo);
              const warning =
                fan.warning === false
                  ? null
                  : (fan.warning ??
                    (fixed && typeof fan.needRpm === "number" && target < fan.needRpm
                      ? `${formatRpm(target, locale)} is below the ${formatRpm(fan.needRpm, locale)} the system needs right now, so temperatures may rise.`
                      : null));
              return (
                <li
                  key={fan.id}
                  aria-labelledby={nameId}
                  data-slot="fan-control-item"
                  data-mode={fan.mode}
                  className="flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", accentClasses.soft)}>
                        <RiWindyLine />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span id={nameId} className="truncate font-semibold text-foreground">
                          {fan.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(lo)}–{formatRpm(hi, locale)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span data-slot="fan-control-rpm" className="font-mono text-base font-semibold tabular-nums text-foreground">
                        {formatRpm(fan.rpm, locale)}
                      </span>
                      <span className="text-xs text-muted-foreground">Current</span>
                    </div>
                    <SegmentedControl
                      size="sm"
                      aria-label={`${fan.name} mode`}
                      value={fan.mode}
                      onValueChange={(v) => onModeChange?.(fan.id, v as FanMode)}
                      options={MODE_OPTIONS}
                      disabled={disabled}
                    />
                  </div>
                  {fixed ? (
                    <div data-slot="fan-control-target" className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="font-medium text-muted-foreground">Target</span>
                        <span className={cn("font-mono text-sm font-semibold tabular-nums", accentClasses.text)}>{formatRpm(target, locale)}</span>
                      </div>
                      <Slider
                        size="sm"
                        min={lo}
                        max={hi}
                        step={step}
                        value={[target]}
                        onValueChange={(v) => v[0] !== undefined && onTargetChange?.(fan.id, v[0])}
                        onValueCommit={(v) => v[0] !== undefined && onTargetCommit?.(fan.id, v[0])}
                        thumbLabels={[`${fan.name} target speed`]}
                        getValueText={(v) => formatRpm(v, locale)}
                        accent={accent}
                        disabled={disabled}
                      />
                      {note !== false && note != null ? (
                        <p data-slot="fan-control-note" className="m-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <RiInformationLine aria-hidden className="size-3.5 shrink-0" />
                          {note}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {warning ? (
                    <InlineAlert tone="warning" data-slot="fan-control-warning">
                      {warning}
                    </InlineAlert>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
FanControl.displayName = "FanControl";

/* ------------------------------------------------------------------ */
/* HeatByApp                                                           */
/* ------------------------------------------------------------------ */

export interface HeatByAppItem {
  id: string | number;
  name: React.ReactNode;
  /** Energy impact (or any heat score); the list ranks by it. */
  impact: number;
  /** Second line ("96 processes"). */
  description?: React.ReactNode;
  /** App icon (decorative). */
  icon?: React.ReactNode;
  href?: string;
  onClick?: (item: HeatByAppItem, event: React.MouseEvent<HTMLElement>) => void;
}

export interface HeatByAppProps extends Omit<BarListProps, "items"> {
  apps: HeatByAppItem[];
  /** Short note under the list. Pass `false` to hide it. */
  explanation?: React.ReactNode | false;
}

/** `BarList` preset ranking apps by energy impact (the heat they add), with a short explanation underneath. */
export const HeatByApp = React.forwardRef<HTMLDivElement, HeatByAppProps>(
  (
    {
      apps,
      explanation = "Energy impact estimates how hard each app makes the Mac work. Higher numbers mean more heat and faster fans.",
      header = { label: "App", value: "Energy impact" },
      label = "Heat by app",
      accent = "orange",
      highlightFirst = true,
      emptyState = "No apps adding heat",
      valueFormatter = (v) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v),
      loading,
      loadingRows,
      className,
      style,
      ...props
    },
    ref
  ) => (
    <div ref={ref} data-slot="heat-by-app" aria-busy={loading || undefined} style={accentStyle(accent, style)} className={cn("flex flex-col gap-2", className)}>
      <BarList
        items={apps.map((app) => ({
          id: app.id,
          name: app.name,
          description: app.description,
          icon: app.icon,
          value: app.impact,
          href: app.href,
          onClick: app.onClick ? (_item, e) => app.onClick!(app, e) : undefined,
        }))}
        header={header}
        label={label}
        accent={accent}
        highlightFirst={highlightFirst}
        emptyState={emptyState}
        valueFormatter={valueFormatter}
        loading={loading}
        loadingRows={loadingRows}
        {...props}
      />
      {explanation !== false && explanation != null ? (
        <p data-slot="heat-by-app-explanation" className="m-0 px-3 text-xs text-muted-foreground">
          {explanation}
        </p>
      ) : null}
    </div>
  )
);
HeatByApp.displayName = "HeatByApp";
