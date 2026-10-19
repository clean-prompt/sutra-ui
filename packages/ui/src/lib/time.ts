/* Shared, defensive time helpers. Pure; never throw on bad input. */
import { roundTo, type RoundingMode } from "./math";

/** Anything that can be read as a point in time. */
export type TimeInput = Date | number | string;

/** A `TimeInput` that may also be missing. */
export type DateInput = TimeInput | null | undefined;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Milliseconds in a second. */
export const SECOND_MS = 1000;
/** Milliseconds in a minute. */
export const MINUTE_MS = 60 * SECOND_MS;
/** Milliseconds in an hour. */
export const HOUR_MS = 60 * MINUTE_MS;
/** Milliseconds in a day. */
export const DAY_MS = 24 * HOUR_MS;

/** True for a `Date` instance holding a real (finite) time. */
export function isValidDate(d: unknown): d is Date {
  return d instanceof Date && Number.isFinite(d.getTime());
}

/**
 * Coerces a value into a valid `Date`, or `undefined` when it can't be parsed.
 * Plain `YYYY-MM-DD` strings are read as LOCAL calendar dates (the platform parses them as UTC midnight,
 * which lands on the previous day west of UTC).
 */
export function toValidDate(v: DateInput): Date | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date) return isValidDate(v) ? v : undefined;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return undefined;
  } else if (typeof v === "string") {
    const m = DATE_ONLY.exec(v.trim());
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const day = Number(m[3]);
      const d = new Date(2000, mo, day);
      d.setFullYear(y);
      // Reject overflow such as 2024-02-31.
      if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return undefined;
      return d;
    }
  } else {
    return undefined;
  }
  const d = new Date(v);
  return isValidDate(d) ? d : undefined;
}

/** Coerces a value into a valid `Date` (`YYYY-MM-DD` → local date), or `undefined`. Same as `toValidDate`. */
export function toDate(v: DateInput): Date | undefined {
  return toValidDate(v);
}

/** Epoch milliseconds for a value, or `undefined` when it can't be parsed. */
export function toMs(v: DateInput): number | undefined {
  return toValidDate(v)?.getTime();
}

/** `toISOString()` that returns `undefined` instead of throwing a RangeError. */
export function safeISO(v: DateInput): string | undefined {
  const d = toValidDate(v);
  if (!d) return undefined;
  try {
    return d.toISOString();
  } catch {
    return undefined;
  }
}

/** Two-digit, zero-padded integer (`5` → `"05"`, `-5` → `"-05"`; non-finite → `"00"`). */
export function pad2(n: number): string {
  if (!Number.isFinite(n)) return "00";
  const s = String(Math.trunc(Math.abs(n))).padStart(2, "0");
  return n < 0 && Math.trunc(n) !== 0 ? `-${s}` : s;
}

/** Local midnight of the given day (an Invalid Date when the input can't be parsed). */
export function startOfDay(v: DateInput): Date {
  const d = toValidDate(v);
  if (!d) return new Date(NaN);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Same wall-clock time `n` calendar days later (DST-safe; an Invalid Date for bad input). */
export function addDays(v: DateInput, n: number): Date {
  const d = toValidDate(v);
  if (!d || !Number.isFinite(n)) return new Date(NaN);
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + Math.trunc(n));
  return out;
}

/** Local `YYYY-MM-DD` key for a day (`""` when the input can't be parsed). */
export function dateKey(v: DateInput): string {
  const d = toValidDate(v);
  if (!d) return "";
  const y = d.getFullYear();
  const year = y < 0 ? `-${String(-y).padStart(6, "0")}` : y > 9999 ? `+${String(y).padStart(6, "0")}` : String(y).padStart(4, "0");
  return `${year}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Whole calendar days from `b` to `a` (positive when `a` is later). DST-safe. */
export function calendarDayDiff(a: DateInput, b: DateInput): number | undefined {
  const da = toValidDate(a);
  const db = toValidDate(b);
  if (!da || !db) return undefined;
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ua - ub) / DAY_MS);
}

/* ------------------------------------------------------------------ */
/* Intl helpers                                                        */
/* ------------------------------------------------------------------ */

/** True when `locale` is unset or English (we then use our own short English strings). */
function isEnglish(locale: string | undefined): boolean {
  return !locale || /^en(?:-|_|$)/i.test(locale);
}

function dateTimeFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat(undefined, options);
  }
}

function relativeTimeFormat(
  locale: string | undefined,
  options: Intl.RelativeTimeFormatOptions
): Intl.RelativeTimeFormat | undefined {
  if (typeof Intl === "undefined" || typeof Intl.RelativeTimeFormat !== "function") return undefined;
  try {
    return new Intl.RelativeTimeFormat(locale, options);
  } catch {
    return undefined;
  }
}

function upperFirst(s: string): string {
  const [first = "", ...rest] = Array.from(s);
  return first.toLocaleUpperCase() + rest.join("");
}

function resolveNow(now: DateInput): number {
  if (now === undefined || now === null) return Date.now();
  return toMs(now) ?? Date.now();
}

/* ------------------------------------------------------------------ */
/* Absolute formats                                                    */
/* ------------------------------------------------------------------ */

export interface FormatClockTimeOptions {
  locale?: string;
  /** Force 12- or 24-hour time. Default: the locale's preference. */
  hour12?: boolean;
  /** Include seconds. */
  seconds?: boolean;
  /** Text for unparseable input. Default `"—"`. */
  invalid?: string;
}

/** Time of day such as `"9:41 AM"` (or `"09:41"` in 24-hour locales). */
export function formatClockTime(v: DateInput, options: FormatClockTimeOptions = {}): string {
  const d = toValidDate(v);
  if (!d) return options.invalid ?? "—";
  return dateTimeFormat(options.locale, {
    hour: options.hour12 === false ? "2-digit" : "numeric",
    minute: "2-digit",
    second: options.seconds ? "2-digit" : undefined,
    hour12: options.hour12,
  }).format(d);
}

/** Options for `formatShortDate`: locale, when the year and weekday show, and the reference time. */
export interface FormatShortDateOptions {
  locale?: string;
  /** `"auto"` (default) shows the year only when it differs from `now`'s. */
  year?: "auto" | "always" | "never";
  /** Prefix a short weekday (`"Mon, Mar 5"`). */
  weekday?: boolean;
  /** Reference time for `year: "auto"`. Default `Date.now()`. */
  now?: DateInput;
  /** Text for unparseable input. Default `"—"`. */
  invalid?: string;
}

/** Short calendar date such as `"Mar 5"` or `"Mar 5, 2024"`. */
export function formatShortDate(v: DateInput, options: FormatShortDateOptions = {}): string {
  const d = toValidDate(v);
  if (!d) return options.invalid ?? "—";
  const mode = options.year ?? "auto";
  const showYear =
    mode === "always" || (mode === "auto" && new Date(resolveNow(options.now)).getFullYear() !== d.getFullYear());
  return dateTimeFormat(options.locale, {
    weekday: options.weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: showYear ? "numeric" : undefined,
  }).format(d);
}

/** Options for `formatDateTime`: short-date options plus 12-hour and seconds. */
export interface FormatDateTimeOptions extends FormatShortDateOptions {
  hour12?: boolean;
  seconds?: boolean;
}

/** Short date and time such as `"Mar 5, 9:41 AM"` (year shown per `year`). */
export function formatDateTime(v: DateInput, options: FormatDateTimeOptions = {}): string {
  const d = toValidDate(v);
  if (!d) return options.invalid ?? "—";
  const mode = options.year ?? "auto";
  const showYear =
    mode === "always" || (mode === "auto" && new Date(resolveNow(options.now)).getFullYear() !== d.getFullYear());
  return dateTimeFormat(options.locale, {
    weekday: options.weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: showYear ? "numeric" : undefined,
    hour: options.hour12 === false ? "2-digit" : "numeric",
    minute: "2-digit",
    second: options.seconds ? "2-digit" : undefined,
    hour12: options.hour12,
  }).format(d);
}

/** Options for `formatDayLabel`: the reference time, locale and how the Today, Tomorrow and weekday labels read. */
export interface FormatDayLabelOptions {
  /** Reference time. Default `Date.now()`. */
  now?: DateInput;
  /** Use the weekday for the previous six days: `true`/`"short"` → `"Mon"`, `"long"` → `"Monday"`. Default true. */
  weekdayWithinWeek?: boolean | "short" | "long";
  /** Return `"Tomorrow"` for the next calendar day. Default true. */
  tomorrow?: boolean;
  /** Prefix a weekday on absolute dates (`"Mon, Mar 5"`). */
  weekday?: boolean;
  /** Year display for absolute dates. Default `"auto"`. */
  year?: "auto" | "always" | "never";
  locale?: string;
  /** Text for unparseable input. Default `"—"`. */
  invalid?: string;
}

/** Calendar day label: `"Today"`, `"Yesterday"`, `"Mon"`, `"Mar 5"` or `"Mar 5, 2024"` (DST-safe). */
export function formatDayLabel(v: DateInput, options: FormatDayLabelOptions = {}): string {
  const d = toValidDate(v);
  if (!d) return options.invalid ?? "—";
  const now = resolveNow(options.now);
  const diff = calendarDayDiff(now, d) ?? 0;
  const { locale } = options;
  const word = (days: number, english: string) => {
    if (isEnglish(locale)) return english;
    const rtf = relativeTimeFormat(locale, { numeric: "auto" });
    return rtf ? upperFirst(rtf.format(days, "day")) : english;
  };
  if (diff === 0) return word(0, "Today");
  if (diff === 1) return word(-1, "Yesterday");
  if (diff === -1 && options.tomorrow !== false) return word(1, "Tomorrow");
  const withinWeek = options.weekdayWithinWeek ?? true;
  if (withinWeek && diff > 1 && diff < 7) {
    return dateTimeFormat(locale, { weekday: withinWeek === "long" ? "long" : "short" }).format(d);
  }
  return formatShortDate(d, { locale, now, year: options.year, weekday: options.weekday });
}

/* ------------------------------------------------------------------ */
/* Relative time                                                       */
/* ------------------------------------------------------------------ */

export type RelativeTimeStyle = "narrow" | "short" | "long";

/** The units `formatRelative` counts in. */
export type RelativeTimeUnit = "second" | "minute" | "hour" | "day" | "month" | "year";

/** Options for `formatRelative`: reference time, style, cut-offs for "just now" and for switching to dates, and labels. */
export interface FormatRelativeOptions {
  /** Reference time. Default `Date.now()`. */
  now?: DateInput;
  /** `"narrow"` → `"5m"`/`"now"`, `"short"` (default) → `"5m ago"`/`"just now"`, `"long"` → `"5 min ago"`/`"yesterday"`. */
  style?: RelativeTimeStyle;
  /** Below this distance the result is "just now"/"now". Default 45 000 ms. */
  justNowMs?: number;
  /**
   * Text inside the `justNowMs` window: one string for past and future (`"Active now"`), or `{ past, future }`
   * (`{ past: "just now", future: "in under a minute" }`). Default `"just now"` (`"now"` for narrow). English only.
   */
  justNow?: string | { past: string; future: string };
  /** Show seconds (`"30s ago"`) between `justNowMs` and one minute. Default false (rounds up to minutes). */
  seconds?: boolean;
  /** Past this many days, show an absolute short date instead. Default: never. */
  maxRelativeDays?: number;
  /** Year display for that absolute date. Default `"auto"` (only when it differs from `now`'s). */
  dateYear?: "auto" | "always" | "never";
  /** `true` → future times read `"in 5m"`; `false` (default) clamps them to now. */
  future?: boolean;
  /**
   * Use `"yesterday"`/`"tomorrow"` for one day. A string turns it on and replaces the past word (`"Yesterday"`).
   * Default: true for `"long"`, false otherwise.
   */
  yesterday?: boolean | string;
  /** Append `" ago"` to past times. Default true, false for `"narrow"`. */
  suffix?: boolean;
  /**
   * Unit labels written right after the number, as one string or `[singular, plural]`. English only.
   * Defaults: `s m h d mo y` for narrow/short; `" sec"`, `" min"`, `[" hour", " hours"]`, `[" day", " days"]`,
   * `[" month", " months"]`, `[" year", " years"]` for long. Example: `{ hour: "h" }` → `"3h ago"`, `{ month: " mo" }` → `"2 mo ago"`.
   */
  unitLabels?: Partial<Record<RelativeTimeUnit, string | readonly [string, string]>>;
  /**
   * How a count is rounded in its unit: one mode for all units, or per unit (`{ day: "floor" }`; unlisted units round).
   * Also counts the days for `maxRelativeDays`. Default `"round"`.
   */
  round?: RoundingMode | Partial<Record<RelativeTimeUnit, RoundingMode>>;
  /** Text for unparseable input. Default `"—"`. */
  invalid?: string;
  /** Non-English locales are formatted with `Intl.RelativeTimeFormat`. */
  locale?: string;
}

const REL_UNITS: { unit: RelativeTimeUnit; ms: number; next: number }[] = [
  { unit: "second", ms: SECOND_MS, next: 60 },
  { unit: "minute", ms: MINUTE_MS, next: 60 },
  { unit: "hour", ms: HOUR_MS, next: 24 },
  { unit: "day", ms: DAY_MS, next: 30 },
  { unit: "month", ms: 30 * DAY_MS, next: 12 },
  { unit: "year", ms: 365 * DAY_MS, next: Infinity },
];

const NARROW_LABELS: Record<RelativeTimeUnit, string> = { second: "s", minute: "m", hour: "h", day: "d", month: "mo", year: "y" };
const LONG_LABELS: Record<RelativeTimeUnit, readonly [string, string]> = {
  second: [" sec", " sec"],
  minute: [" min", " min"],
  hour: [" hour", " hours"],
  day: [" day", " days"],
  month: [" month", " months"],
  year: [" year", " years"],
};

/**
 * Relative time such as `"5m ago"`, `"in 2h"` or `"yesterday"`.
 * Rounds once in the chosen unit and promotes to the next unit when rounding reaches its threshold (never `"60m ago"`).
 */
export function formatRelative(v: DateInput, options: FormatRelativeOptions = {}): string {
  const invalid = options.invalid ?? "—";
  const t = toMs(v);
  const now = options.now === undefined || options.now === null ? Date.now() : toMs(options.now);
  if (t === undefined || now === undefined) return invalid;
  const style = options.style ?? "short";
  const { locale } = options;
  let diff = t - now;
  if (diff > 0 && !options.future) diff = 0;
  const isFuture = diff > 0;
  const abs = Math.abs(diff);
  const english = isEnglish(locale);
  const rtf = english
    ? undefined
    : relativeTimeFormat(locale, { numeric: style === "long" ? "auto" : "always", style: style === "long" ? "long" : style });

  const justNowMs = Number.isFinite(options.justNowMs) ? Math.max(0, options.justNowMs!) : 45 * SECOND_MS;
  if (abs < justNowMs || abs === 0) {
    if (rtf) {
      const auto = relativeTimeFormat(locale, { numeric: "auto", style: style === "long" ? "long" : style });
      if (auto) return auto.format(0, "second");
    }
    const { justNow } = options;
    if (typeof justNow === "string") return justNow;
    if (justNow) return isFuture ? justNow.future : justNow.past;
    return style === "narrow" ? "now" : "just now";
  }

  const { round } = options;
  const count = (x: number, unit: RelativeTimeUnit) =>
    Math.max(1, roundTo(x, 0, (typeof round === "string" ? round : round?.[unit]) ?? "round"));
  let i = options.seconds ? 0 : 1;
  let value = 0;
  for (; i < REL_UNITS.length; i++) {
    const u = REL_UNITS[i]!;
    value = count(abs / u.ms, u.unit);
    if (value < u.next) break;
  }
  const unit = REL_UNITS[Math.min(i, REL_UNITS.length - 1)]!.unit;

  if (options.maxRelativeDays !== undefined && (unit === "day" || unit === "month" || unit === "year")) {
    if (count(abs / DAY_MS, "day") > options.maxRelativeDays) {
      return formatShortDate(t, { locale, now, year: options.dateYear ?? "auto" });
    }
  }

  const useYesterday = options.yesterday === undefined ? style === "long" : options.yesterday !== false;
  if (rtf) {
    if (useYesterday && unit === "day" && value === 1) {
      const auto = relativeTimeFormat(locale, { numeric: "auto", style: style === "long" ? "long" : style });
      if (auto) return auto.format(isFuture ? 1 : -1, "day");
    }
    return rtf.format(isFuture ? value : -value, unit);
  }

  if (useYesterday && unit === "day" && value === 1) {
    if (isFuture) return "tomorrow";
    return typeof options.yesterday === "string" ? options.yesterday : "yesterday";
  }
  const custom = options.unitLabels?.[unit];
  const label = custom ?? (style === "long" ? LONG_LABELS[unit] : NARROW_LABELS[unit]);
  const body = `${value}${typeof label === "string" ? label : label[value === 1 ? 0 : 1]}`;
  if (isFuture) return `in ${body}`;
  return (options.suffix ?? style !== "narrow") ? `${body} ago` : body;
}
