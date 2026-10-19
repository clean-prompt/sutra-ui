import * as React from "react";
import { RiArrowDownLine, RiArrowRightSLine, RiArrowUpLine, RiSubtractLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";
import { accentClasses, accentColorValue, accentStyle, resolveAccent, type Accent } from "../lib/accent";
import { KeyValueList } from "../primitives/key-value";
import { Progress, Skeleton } from "../primitives/progress";
import { Sparkline, type SparklineColor } from "./sparkline";
import { AnimatedNumber } from "./animated-number";

export type StatDeltaIntent = "positive-is-good" | "negative-is-good" | "neutral";
/** Stat tile tone. Canonical `Tone` plus deprecated aliases (`"default"` → `neutral`). */
export type StatTone = ToneInput;

const toneValue: Record<Tone, string> = {
  neutral: "text-foreground",
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
/** Lets a preset (TopItemCard) replace the value placeholder StatCard draws while loading. */
const StatValueSkeletonContext = React.createContext<React.ReactNode>(null);

/* ------------------------------------------------------------------------------------------------
 * StatValue
 * ----------------------------------------------------------------------------------------------*/

const valueSizes = { sm: "text-xl", md: "text-display-xs", lg: "text-display-sm", xl: "text-display-md" } as const;
const unitSizes = { sm: "text-sm", md: "text-sm", lg: "text-base", xl: "text-xl" } as const;
/** The trailing chevron of an interactive card; it nudges right when the card (`group/stat`) is hovered. */
const chevronClass = (extra?: string) =>
  cn("size-4 shrink-0 text-muted-foreground transition-transform group-hover/stat:translate-x-0.5 rtl:group-hover/stat:-translate-x-0.5", extra);

export interface StatValueProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The number or text to show. */
  value: React.ReactNode;
  /** Smaller, muted suffix ("%", "GB"). */
  unit?: React.ReactNode;
  /** Default md. `xl` is the hero size used by `MetricHero`. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Number face: monospaced (default) or the UI sans with tabular figures. */
  font?: "mono" | "sans";
  /**
   * Roll the digits when a numeric `value` changes (see `AnimatedNumber`). Opt-in: live fills and dense tables stay
   * still. Other values (strings, nodes) render as given. A number is formatted with `format` and `locale`.
   */
  animate?: boolean;
  /** `Intl.NumberFormat` options for an animated number. */
  format?: Intl.NumberFormatOptions;
  /** Locale for an animated number. */
  locale?: string | string[];
}

/** The big number of a metric with its unit, shared by StatCard and MetricHero. */
export const StatValue = React.forwardRef<HTMLSpanElement, StatValueProps>(
  ({ value, unit, size = "md", font = "mono", animate = false, format, locale, className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="stat-value"
      className={cn(font === "sans" ? "font-sans" : "font-mono", "font-semibold tabular-nums tracking-tight", valueSizes[size], className)}
      {...props}
    >
      {animate && typeof value === "number" ? <AnimatedNumber value={value} format={format} locale={locale} /> : value}
      {unit ? <span className={cn("ms-1 font-medium text-muted-foreground", unitSizes[size])}>{unit}</span> : null}
    </span>
  )
);
StatValue.displayName = "StatValue";

/* ------------------------------------------------------------------------------------------------
 * StatCard
 * ----------------------------------------------------------------------------------------------*/

export interface StatCardStat {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Colour of a small dot before the label (an accent name or any CSS colour). */
  color?: Accent | string;
  key?: string;
}

export interface StatCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /** Metric name shown above the value. */
  label: React.ReactNode;
  /** The big number. Optional for cards whose body is `children` (e.g. a donut breakdown under the header). */
  value?: React.ReactNode;
  /** Unit shown after the value (e.g. "ms", "GB"). */
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
  /** Icon shown beside the label. */
  icon?: React.ReactNode;
  /** Sparkline values. */
  trend?: number[];
  /**
   * Sparkline style for `trend`.
   * @default "area"
   */
  trendType?: "line" | "area" | "bar";
  /** Colour of the trend line; defaults to follow `tone`. */
  trendColor?: SparklineColor;
  /** `footer` draws the trend full-width at the bottom on an accent-tinted strip. Default inline. */
  trendPlacement?: "inline" | "footer";
  /** Fixed lower bound of the trend scale (e.g. 0). */
  trendMin?: number;
  /** Fixed upper bound of the trend scale (e.g. 100). */
  trendMax?: number;
  /**
   * Shows placeholders instead of the value, hint, delta and stat values (the label, caption and stat labels stay);
   * the progress bar, trend and `children` body get placeholders of the same size.
   */
  loading?: boolean;
  /** Semantic colour of the trend and accents. */
  tone?: StatTone;
  /**
   * Card padding and value size.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /** Categorical colour for the icon chip, label, trend and progress bar. `tone` stays for status. */
  accent?: Accent;
  /** Label colour: the accent (default when `accent` is set) or muted. */
  labelTone?: "accent" | "muted";
  /** Icon chip before the label or in the top-right corner. Default start with `accent`/`href`/`onClick`, else end. */
  iconPlacement?: "start" | "end";
  /** Makes the label a link that covers the whole card. */
  href?: string;
  /** Makes the label a button that covers the whole card (when there is no `href`). */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Trailing chevron in the header. Default true when the card is a link or button. */
  chevron?: boolean;
  /** Small text above the value ("Now", "In use of 64 GB"). */
  caption?: React.ReactNode;
  /** Right-aligned next to the value, e.g. a `StatusBadge`. */
  status?: React.ReactNode;
  /** Row of small label/value pairs under the value (User 18% · System 8% · Average 39%). */
  stats?: StatCardStat[];
  /** A thin bar under the value (`progressMax` default 100). */
  progress?: number;
  /**
   * Value that counts as 100% for `progress`.
   * @default 100
   */
  progressMax?: number;
  /** Number face for the value: monospaced (default) or the UI sans with tabular figures. */
  valueFont?: "mono" | "sans";
  /** Roll the digits when a numeric `value` changes. Opt-in; strings and nodes render as given. */
  animate?: boolean;
  /** `Intl.NumberFormat` options for an animated `value`. */
  valueFormat?: Intl.NumberFormatOptions;
  /** Locale for an animated `value`. */
  valueLocale?: string | string[];
  /** Extra body content under the value and stats (a chart, a list). */
  children?: React.ReactNode;
}

/**
 * KPI tile: label, big value, delta, hint and optional sparkline. With `href`/`onClick` the label becomes a
 * link/button stretched over the card; keep other interactive content out of a linked card (or lift it with
 * `relative z-10`).
 */
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
      trendPlacement = "inline",
      trendMin,
      trendMax,
      loading,
      tone: toneProp = "neutral",
      size = "md",
      accent,
      labelTone,
      iconPlacement,
      href,
      onClick,
      chevron,
      caption,
      status,
      stats,
      progress,
      progressMax = 100,
      valueFont,
      animate,
      valueFormat,
      valueLocale,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const group = React.useContext(StatGroupContext);
    const valueSkeleton = React.useContext(StatValueSkeletonContext);
    const valueId = React.useId();
    const tone = normalizeTone(toneProp);
    const interactive = href !== undefined || onClick !== undefined;
    const iconAtStart = (iconPlacement ?? (accent || interactive ? "start" : "end")) === "start";
    const accentLabel = (labelTone ?? (accent ? "accent" : "muted")) === "accent";
    const showChevron = chevron ?? interactive;
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
    const labelText = typeof label === "string" ? label : undefined;

    const iconChip = icon ? (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md [&_svg]:size-4",
          iconAtStart ? "size-7" : "size-8",
          accent ? accentClasses.soft : toneClasses.soft[tone]
        )}
      >
        {icon}
      </span>
    ) : null;

    const labelClass = cn(
      "truncate",
      size === "sm" ? "text-xs" : "text-sm",
      accentLabel ? cn("font-medium", accentClasses.text) : "text-muted-foreground"
    );
    const chevronEl = showChevron ? (
      <RiArrowRightSLine aria-hidden data-slot="stat-chevron" className={chevronClass("ms-auto rtl:-scale-x-100")} />
    ) : null;
    const stretched = cn(
      "flex min-w-0 flex-1 items-center gap-2 text-start outline-none",
      "after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
      "focus-visible:after:ring-[3px] focus-visible:after:ring-ring/35"
    );
    const hasValueRow = value !== undefined && value !== null && value !== "";
    const describedBy = loading || (!hasValueRow && !caption) ? undefined : valueId;
    const title = href !== undefined ? (
      <a href={href} onClick={onClick} aria-describedby={describedBy} data-slot="stat-link" className={stretched}>
        <span className={labelClass}>{label}</span>
        {chevronEl}
      </a>
    ) : onClick ? (
      <button type="button" onClick={onClick} aria-describedby={describedBy} data-slot="stat-link" className={stretched}>
        <span className={labelClass}>{label}</span>
        {chevronEl}
      </button>
    ) : (
      <span className={cn("flex min-w-0 flex-1 items-center gap-2", !iconAtStart && "items-start")}>
        <span className={labelClass}>{label}</span>
        {chevronEl}
      </span>
    );

    const trendEl =
      trend && trend.length > 0 ? (
        <Sparkline
          data={trend}
          type={trendType}
          responsive
          height={trendPlacement === "footer" ? (size === "sm" ? 28 : 40) : size === "sm" ? 28 : 36}
          min={trendMin}
          max={trendMax}
          color={
            trendColor ??
            (accent ? accentColorValue : quality === "good" ? "success" : quality === "bad" ? "destructive" : "primary")
          }
          highlightLast={trendType !== "bar" && trendPlacement !== "footer"}
          label={labelText ? `${labelText} trend` : "Trend"}
          wrapperClassName={trendPlacement === "footer" ? undefined : "mt-2"}
        />
      ) : null;

    return (
      <div
        ref={ref}
        aria-busy={loading || undefined}
        data-slot="stat-card"
        data-interactive={interactive || undefined}
        style={accentStyle(accent, style)}
        className={cn(
          "flex min-w-0 flex-col gap-1",
          group === "divided" ? "bg-card px-4 py-3.5" : "rounded-box border border-border bg-card p-4 text-card-foreground shadow-xs",
          size === "lg" && group !== "divided" && "p-5",
          interactive && "group/stat relative transition-colors hover:bg-muted/40",
          className
        )}
        {...props}
      >
        <div className={cn("flex justify-between gap-2", iconAtStart ? "items-center" : "items-start", (iconAtStart && icon) || caption ? "mb-1" : undefined)}>
          {iconAtStart ? iconChip : null}
          {title}
          {iconAtStart ? null : iconChip}
        </div>
        {loading ? (
          <>
            <span className="sr-only">{`Loading ${labelText ?? "metric"}…`}</span>
            {caption ? <div data-slot="stat-caption" className="text-xs text-muted-foreground">{caption}</div> : null}
            {hasValueRow || children === undefined || children === null ? (
              valueSkeleton ?? (
                <div data-slot="stat-skeleton" className="space-y-2 py-1" aria-hidden>
                  <Skeleton className={cn("w-24", size === "sm" ? "h-6" : "h-8")} />
                  <Skeleton className="h-3 w-16" />
                </div>
              )
            ) : null}
            {progress !== undefined ? <Skeleton className="mt-2 h-1 rounded-full" /> : null}
            {stats && stats.length > 0 ? (
              <KeyValueList
                layout="grid"
                data-slot="stat-stats"
                className="mt-3 gap-x-3 [&_dt]:min-w-0 [&_dt]:truncate"
                style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
                items={stats.map((s, i) => ({
                  key: s.key ?? (typeof s.label === "string" ? s.label : String(i)),
                  label: s.label,
                  value: <Skeleton shape="text" className="inline-block h-3.5 w-10 align-middle" />,
                }))}
              />
            ) : null}
            {children !== undefined && children !== null ? (
              <Skeleton data-slot="stat-content-skeleton" className="mt-2 h-24 rounded-md" />
            ) : null}
            {trendPlacement === "footer" ? (
              <Skeleton data-slot="stat-trend-skeleton" className="mt-auto rounded-md" height={(size === "sm" ? 28 : 40) + 14} />
            ) : trend !== undefined ? (
              <Skeleton data-slot="stat-trend-skeleton" className="mt-2 rounded-md" height={size === "sm" ? 28 : 36} />
            ) : null}
          </>
        ) : (
          <>
            {hasValueRow || caption || deltaText !== null || status ? (
            <div id={valueId} data-slot="stat-body" className="flex flex-col gap-1">
              {caption ? <div data-slot="stat-caption" className="text-xs text-muted-foreground">{caption}</div> : null}
              {hasValueRow || deltaText !== null || status ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {hasValueRow ? <StatValue value={value} unit={unit} size={size} font={valueFont} animate={animate} format={valueFormat} locale={valueLocale} className={toneValue[tone]} /> : null}
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
                    {deltaLabel ? <span className="ms-1 font-normal text-muted-foreground">{deltaLabel}</span> : null}
                  </span>
                ) : null}
                {status ? <span data-slot="stat-status" className="ms-auto self-center">{status}</span> : null}
              </div>
              ) : null}
            </div>
            ) : null}
            {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
            {progress !== undefined ? (
              <Progress
                value={progress}
                max={progressMax}
                size="xs"
                aria-label={labelText ?? "Progress"}
                className={cn("mt-2", accent && accentClasses.track)}
                indicatorClassName={accent ? accentClasses.solid : undefined}
              />
            ) : null}
            {stats && stats.length > 0 ? (
              <KeyValueList
                layout="grid"
                data-slot="stat-stats"
                className="mt-3 gap-x-3 [&_dd]:min-w-0 [&_dd]:truncate [&_dd]:font-medium [&_dd]:tabular-nums [&_dt]:min-w-0 [&_dt]:truncate"
                style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
                items={stats.map((s, i) => ({
                  key: s.key ?? (typeof s.label === "string" ? s.label : String(i)),
                  label: s.color ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: resolveAccent(s.color) }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                  ) : (
                    s.label
                  ),
                  value: s.value,
                }))}
              />
            ) : null}
            {children !== undefined && children !== null ? (
              <div data-slot="stat-content" className="mt-2 min-w-0">
                {valueSkeleton ? <StatValueSkeletonContext.Provider value={null}>{children}</StatValueSkeletonContext.Provider> : children}
              </div>
            ) : null}
            {trendEl && trendPlacement === "footer" ? (
              <div data-slot="stat-trend" className={cn("mt-auto rounded-md px-2 pb-1.5 pt-2", accentClasses.track)}>
                {trendEl}
              </div>
            ) : (
              trendEl
            )}
          </>
        )}
      </div>
    );
  }
);
StatCard.displayName = "StatCard";

/* ------------------------------------------------------------------------------------------------
 * TopItemCard
 * ----------------------------------------------------------------------------------------------*/

export interface TopItemCardProps
  extends Omit<StatCardProps, "value" | "unit" | "delta" | "deltaSuffix" | "deltaIntent" | "deltaLabel" | "hint" | "trend" | "stats" | "label"> {
  /** Card label. Default "Top App". */
  label?: React.ReactNode;
  /** The leading item's name ("Google Chrome"). */
  item: React.ReactNode;
  /** The item's icon or logo. */
  itemIcon?: React.ReactNode;
  /** The item's value ("37.0%"). */
  value?: React.ReactNode;
}

/** StatCard preset for "the biggest item right now": label, item icon + name and its value, optionally linked. */
export const TopItemCard = React.forwardRef<HTMLDivElement, TopItemCardProps>(
  ({ label = "Top App", item, itemIcon, value, labelTone = "muted", href, onClick, chevron, loading, ...props }, ref) => {
    const showChevron = chevron ?? (href !== undefined || onClick !== undefined);
    const card = (
      <StatCard
        ref={ref}
        data-variant="top-item"
        label={label}
        labelTone={labelTone}
        href={href}
        onClick={onClick}
        chevron={false}
        loading={loading}
        value={
          <span data-slot="top-item" className="inline-flex min-w-0 max-w-full items-center gap-2 align-middle font-sans text-base font-semibold tracking-normal">
            {itemIcon ? (
              <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center [&_img]:size-6 [&_svg]:size-5">
                {itemIcon}
              </span>
            ) : null}
            <span className="truncate">{item}</span>
          </span>
        }
        hint={
          value !== undefined || showChevron ? (
            <span className="flex items-center justify-between gap-2 text-sm font-medium tabular-nums text-foreground">
              <span>{value}</span>
              {showChevron ? <RiArrowRightSLine aria-hidden data-slot="stat-chevron" className={chevronClass()} /> : null}
            </span>
          ) : undefined
        }
        {...props}
      />
    );
    if (!loading) return card;
    return (
      <StatValueSkeletonContext.Provider
        value={
          <div data-slot="top-item-skeleton" aria-hidden className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <Skeleton shape="circle" className="size-6 shrink-0" />
              <Skeleton shape="text" className="h-4 w-28" />
            </span>
            {value !== undefined || showChevron ? <Skeleton shape="text" className="mt-0.5 h-3.5 w-12" /> : null}
          </div>
        }
      >
        {card}
      </StatValueSkeletonContext.Provider>
    );
  }
);
TopItemCard.displayName = "TopItemCard";

/* ------------------------------------------------------------------------------------------------
 * StatGroup
 * ----------------------------------------------------------------------------------------------*/

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
          // Cards need about 9rem each (label, icon tile, delta): a narrow column gets fewer, wider tiles instead of squeezed ones.
          variant === "divided" ? "grid grid-cols-2" : "grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]",
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
