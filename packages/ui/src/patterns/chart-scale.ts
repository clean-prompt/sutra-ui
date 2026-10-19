/** Chart scales: nice value ticks, series stacking, monotone paths, colors and time-axis ticks. */
import { clamp } from "../lib/math";
import { monotonePath as monotonePathOf, resolveColorToken } from "../lib/svg-path";
import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  SECOND_MS,
  formatClockTime,
  formatShortDate,
  toMs,
  type TimeInput,
} from "../lib/time";
import type { ChartDatum } from "./chart-types";
import { isMidnight, r2, toNumber, type Point } from "./chart-internal";

/* ------------------------------------------------------------------------------------------------
 * Pure helpers
 * ----------------------------------------------------------------------------------------------*/

function niceStep(raw: number) {
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const f = raw / base;
  const nf = f >= Math.sqrt(50) ? 10 : f >= Math.sqrt(10) ? 5 : f >= Math.sqrt(2) ? 2 : 1;
  return nf * base;
}

/** Round, human-friendly tick values covering [min, max] (≈ `count` ticks, steps of 1/2/5 × 10ⁿ). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep((hi - lo) / Math.max(1, count - 1));
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  // toFixed accepts at most 100 digits.
  const decimals = clamp(-Math.floor(Math.log10(step)) + 1, 0, 100);
  const n = Math.round((end - start) / step);
  const ticks: number[] = [];
  for (let i = 0; i <= n; i++) ticks.push(Number((start + i * step).toFixed(decimals)) || 0);
  return ticks;
}

export interface StackedSeries {
  key: string;
  /** `[lower, upper]` per datum. Negative values stack downward from 0. */
  values: [number, number][];
}

/** Stack series values per datum (like d3.stack with a diverging offset). */
export function stackSeries(data: ChartDatum[], keys: string[]): StackedSeries[] {
  const pos = data.map(() => 0);
  const neg = data.map(() => 0);
  return keys.map((key) => ({
    key,
    values: data.map((d, i) => {
      const v = toNumber(d[key]) ?? 0;
      if (v >= 0) {
        const y0 = pos[i]!;
        pos[i] = y0 + v;
        return [y0, y0 + v] as [number, number];
      }
      const y0 = neg[i]!;
      neg[i] = y0 + v;
      return [y0, y0 + v] as [number, number];
    }),
  }));
}

/** SVG path through points with monotone cubic interpolation (Fritsch–Carlson, like d3.curveMonotoneX). */
export function monotonePath(points: readonly Point[]): string {
  return monotonePathOf(points, r2);
}

/** Resolve a token name (primary, success, …) to its CSS variable; pass other colors through. */
export const resolveChartColor = (color: string) => resolveColorToken(color);

/* Time axis ---------------------------------------------------------------------------------------- */

export type TimeTickUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

export interface TimeTicks {
  /** Tick positions in epoch ms, aligned to local boundaries (whole minutes, hours, midnights, Mondays, months). */
  ticks: number[];
  unit: TimeTickUnit;
  /** Number of `unit`s between ticks. */
  step: number;
}

const TIME_INTERVALS: [TimeTickUnit, number, number][] = [
  ["second", 1, SECOND_MS],
  ["second", 5, 5 * SECOND_MS],
  ["second", 15, 15 * SECOND_MS],
  ["second", 30, 30 * SECOND_MS],
  ["minute", 1, MINUTE_MS],
  ["minute", 5, 5 * MINUTE_MS],
  ["minute", 15, 15 * MINUTE_MS],
  ["minute", 30, 30 * MINUTE_MS],
  ["hour", 1, HOUR_MS],
  ["hour", 3, 3 * HOUR_MS],
  ["hour", 6, 6 * HOUR_MS],
  ["hour", 12, 12 * HOUR_MS],
  ["day", 1, DAY_MS],
  ["day", 2, 2 * DAY_MS],
  ["week", 1, 7 * DAY_MS],
  ["month", 1, 30 * DAY_MS],
  ["month", 3, 91 * DAY_MS],
];
const YEAR_MS = 365.25 * DAY_MS;

function timeFloor(ms: number, unit: TimeTickUnit, step: number) {
  const d = new Date(ms);
  const [y, mo, day, h, mi, s] = [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
  switch (unit) {
    case "second":
      return new Date(y, mo, day, h, mi, Math.floor(s / step) * step).getTime();
    case "minute":
      return new Date(y, mo, day, h, Math.floor(mi / step) * step).getTime();
    case "hour":
      return new Date(y, mo, day, Math.floor(h / step) * step).getTime();
    case "day":
      return new Date(y, mo, day).getTime();
    case "week":
      return new Date(y, mo, day - ((d.getDay() + 6) % 7)).getTime();
    case "month":
      return new Date(y, Math.floor(mo / step) * step, 1).getTime();
    case "year":
      return new Date(Math.floor(y / step) * step, 0, 1).getTime();
  }
}

function timeOffset(start: number, unit: TimeTickUnit, step: number, k: number) {
  if (unit === "second" || unit === "minute") return start + k * step * (unit === "second" ? SECOND_MS : MINUTE_MS);
  const d = new Date(start);
  const [y, mo, day, h] = [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()];
  switch (unit) {
    case "hour":
      return new Date(y, mo, day, h + k * step).getTime();
    case "day":
      return new Date(y, mo, day + k * step).getTime();
    case "week":
      return new Date(y, mo, day + 7 * k * step).getTime();
    case "month":
      return new Date(y, mo + k * step, 1).getTime();
    default:
      return new Date(y + k * step, 0, 1).getTime();
  }
}

/**
 * "Nice" time ticks within [min, max] (epoch ms): at most about `count` ticks at 1/5/15/30 s, 1/5/15/30 min,
 * 1/3/6/12 h, 1/2 days, weeks (Mondays), 1/3 months or years, aligned to local-time boundaries.
 */
export function timeTicks(min: number, max: number, count = 6): TimeTicks {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [], unit: "day", step: 1 };
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const target = (hi - lo) / Math.max(1, count);
  const hit = TIME_INTERVALS.find(([, , ms]) => ms >= target);
  const [unit, step] = hit ?? ["year", Math.max(1, Math.ceil(niceStep(Math.max(1, target / YEAR_MS))))];
  const start = timeFloor(lo, unit, step);
  const ticks: number[] = [];
  for (let k = 0; k < 10000; k++) {
    const t = timeOffset(start, unit, step, k);
    if (t > hi) break;
    if (t >= lo && t !== ticks[ticks.length - 1]) ticks.push(t);
  }
  return { ticks, unit, step };
}

const intlCache = new Map<string, Intl.DateTimeFormat>();
function intl(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = intlCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    intlCache.set(key, f);
  }
  return f;
}


/**
 * Default label for a time tick of the given unit: clock time for seconds/minutes/hours (`10:30`, a midnight tick shows
 * the day), weekday and day for days (`Mon 14`, the 1st shows the month), month and day for weeks (`Oct 3`), the month
 * for months (January adds the year) and the year for years.
 */
export function formatTimeTick(value: TimeInput, unit: TimeTickUnit, locale?: string): string {
  const ms = toMs(value);
  if (ms === undefined) return "";
  const d = new Date(ms);
  switch (unit) {
    case "second":
      return formatClockTime(d, { locale, seconds: true });
    case "minute":
    case "hour":
      return isMidnight(d) ? intl(locale, { weekday: "short", day: "numeric" }).format(d) : formatClockTime(d, { locale });
    case "day":
      return d.getDate() === 1
        ? formatShortDate(d, { locale, year: "never" })
        : intl(locale, { weekday: "short", day: "numeric" }).format(d);
    case "week":
      return formatShortDate(d, { locale, year: "never" });
    case "month":
      return intl(locale, d.getMonth() === 0 ? { month: "short", year: "numeric" } : { month: "short" }).format(d);
    case "year":
      return intl(locale, { year: "numeric" }).format(d);
  }
}
