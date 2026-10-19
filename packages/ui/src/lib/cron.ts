/** Cron and interval schedules: parse, describe, compute next runs, and convert to/from builder schedules. Pure; never throws. */

import { formatCountdown } from "./duration";
import { pluralize } from "./format";
import { capitalize } from "./text";
import { dateKey, formatClockTime as formatClockTimeLib, formatRelative, pad2 } from "./time";

/* ------------------------------------------------------------------ */
/* Cron parsing                                                        */
/* ------------------------------------------------------------------ */

export type CronFieldName = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

interface CronFieldSpec {
  key: CronFieldName;
  label: string;
  min: number;
  max: number;
  names?: string[];
}

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CRON_FIELDS: CronFieldSpec[] = [
  { key: "minute", label: "minute", min: 0, max: 59 },
  { key: "hour", label: "hour", min: 0, max: 23 },
  { key: "dayOfMonth", label: "day of month", min: 1, max: 31 },
  { key: "month", label: "month", min: 1, max: 12, names: MONTH_ABBR },
  { key: "dayOfWeek", label: "day of week", min: 0, max: 7, names: DOW_ABBR },
];

const CRON_MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

/** A parsed 5-field cron expression with every field expanded to its sorted values. */
export interface ParsedCron {
  /** Normalised 5-field expression (macros expanded, whitespace collapsed). */
  expression: string;
  /** Raw token per field as written. */
  raw: Record<CronFieldName, string>;
  /** Expanded, sorted, de-duplicated values per field (day of week: 0 = Sunday … 6 = Saturday). */
  fields: Record<CronFieldName, number[]>;
  /**
   * Day-of-month is not star-prefixed (`*`, `*\/N`, `?`). Vixie cron: when both day fields are restricted a day
   * matches either; when either is star-prefixed a day must match both (so `*\/2` still filters).
   */
  domRestricted: boolean;
  dowRestricted: boolean;
}

/** Result of parsing a cron expression: the parsed fields, or an error message. */
export type CronParseResult = { ok: true; value: ParsedCron } | { ok: false; error: string };

function parseCronNumber(token: string, spec: CronFieldSpec): number | string {
  if (/^\d+$/.test(token)) return Number(token);
  if (spec.names) {
    const i = spec.names.indexOf(token.toUpperCase());
    if (i !== -1) return spec.key === "month" ? i + 1 : i;
  }
  return `Invalid ${spec.label} value "${token}"`;
}

function parseCronField(raw: string, spec: CronFieldSpec): number[] | string {
  const out = new Set<number>();
  for (const part of raw.split(",")) {
    if (!part) return `Empty item in ${spec.label} list`;
    const pieces = part.split("/");
    if (pieces.length > 2) return `Invalid ${spec.label} step "${part}"`;
    const [rangePart, stepPart] = pieces as [string, string | undefined];
    let step = 1;
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart) || Number(stepPart) < 1) return `Invalid ${spec.label} step "${stepPart}"`;
      step = Number(stepPart);
    }
    let lo: number;
    let hi: number;
    if (rangePart === "*" || rangePart === "?") {
      lo = spec.min;
      hi = spec.key === "dayOfWeek" ? 6 : spec.max;
    } else if (rangePart.includes("-")) {
      const [a, b, extra] = rangePart.split("-");
      if (extra !== undefined || !a || !b) return `Invalid ${spec.label} range "${rangePart}"`;
      const pa = parseCronNumber(a, spec);
      const pb = parseCronNumber(b, spec);
      if (typeof pa === "string") return pa;
      if (typeof pb === "string") return pb;
      lo = pa;
      hi = pb;
      if (lo > hi) return `Invalid ${spec.label} range "${rangePart}" (start is after end)`;
    } else {
      const pa = parseCronNumber(rangePart, spec);
      if (typeof pa === "string") return pa;
      lo = pa;
      hi = stepPart !== undefined ? spec.max : pa;
    }
    if (lo < spec.min || hi > spec.max) return `${capitalize(spec.label)} must be between ${spec.min} and ${spec.max}`;
    for (let v = lo; v <= hi; v += step) out.add(spec.key === "dayOfWeek" && v === 7 ? 0 : v);
  }
  return [...out].sort((a, b) => a - b);
}

/** Parse a 5-field cron expression (`minute hour day-of-month month day-of-week`): `*`, lists, ranges, steps, JAN–DEC / SUN–SAT names and `@daily`-style macros. */
export function parseCron(expr: string): CronParseResult {
  const trimmed = (expr ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, error: "Enter a cron expression" };
  const expanded = CRON_MACROS[trimmed.toLowerCase()] ?? trimmed;
  if (expanded.startsWith("@")) return { ok: false, error: `Unknown macro "${trimmed}"` };
  const tokens = expanded.split(" ");
  if (tokens.length !== 5) {
    return { ok: false, error: `Expected 5 fields (minute hour day month weekday), got ${tokens.length}` };
  }
  const raw = {} as Record<CronFieldName, string>;
  const fields = {} as Record<CronFieldName, number[]>;
  for (let i = 0; i < 5; i++) {
    const spec = CRON_FIELDS[i]!;
    const parsed = parseCronField(tokens[i]!, spec);
    if (typeof parsed === "string") return { ok: false, error: parsed };
    raw[spec.key] = tokens[i]!;
    fields[spec.key] = parsed;
  }
  const isStar = (t: string) => t.startsWith("*") || t.startsWith("?");
  return {
    ok: true,
    value: {
      expression: tokens.join(" "),
      raw,
      fields,
      domRestricted: !isStar(raw.dayOfMonth),
      dowRestricted: !isStar(raw.dayOfWeek),
    },
  };
}

/* ------------------------------------------------------------------ */
/* describeCron                                                        */
/* ------------------------------------------------------------------ */

export interface DescribeCronOptions {
  /** Locale for formatting times. Default "en-US" (the sentence itself is English). */
  locale?: string;
  /** Force 12- or 24-hour times. `false` gives "08:30". */
  hour12?: boolean;
}

function joinWords(items: string[], conj = "and") {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conj} ${items[items.length - 1]}`;
}

function formatClockTime(h: number, m: number, opts: DescribeCronOptions) {
  return formatClockTimeLib(new Date(2000, 0, 1, h, m), { locale: opts.locale ?? "en-US", hour12: opts.hour12 });
}

function fieldStep(values: number[], min: number, max: number): number | null {
  if (values.length < 2 || values[0] !== min) return null;
  const step = values[1]! - values[0]!;
  for (let i = 1; i < values.length; i++) if (values[i]! - values[i - 1]! !== step) return null;
  return values[values.length - 1]! + step > max ? step : null;
}

function contiguous(values: number[]) {
  return values.length > 2 && values.every((v, i) => i === 0 || v === values[i - 1]! + 1);
}

function ordinal(n: number) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

const sameList = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Plain-English summary of a cron expression, e.g. "Every weekday at 9:00 AM", "Every 15 minutes", "At 8:30 AM on day 1 of the month". */
export function describeCron(expr: string, options: DescribeCronOptions = {}): string {
  const parsed = parseCron(expr);
  if (!parsed.ok) return `Invalid schedule: ${parsed.error}`;
  const { fields, domRestricted, dowRestricted } = parsed.value;
  const { minute, hour, dayOfMonth: dom, month, dayOfWeek: dow } = fields;
  const t = (h: number, m: number) => formatClockTime(h, m, options);

  const allMinutes = minute.length === 60;
  const allHours = hour.length === 24;
  const minuteStep = allMinutes ? 1 : fieldStep(minute, 0, 59);
  const hourStep = allHours ? 1 : fieldStep(hour, 0, 23);
  const monthRestricted = month.length !== 12;

  /* time phrase */
  let time: string;
  let atTime = false;
  if (minute.length === 1 && hour.length === 1) {
    time = `at ${t(hour[0]!, minute[0]!)}`;
    atTime = true;
  } else if (minuteStep && allHours) {
    time = minuteStep === 1 ? "every minute" : `every ${minuteStep} minutes`;
  } else if (minute.length === 1 && allHours) {
    time = minute[0] === 0 ? "every hour" : `every hour at :${pad2(minute[0]!)}`;
  } else if (minute.length === 1 && hourStep) {
    time = `every ${hourStep} hours${minute[0] ? ` at :${pad2(minute[0]!)}` : ""}`;
  } else if (minute.length === 1 && contiguous(hour)) {
    time = `every hour from ${t(hour[0]!, minute[0]!)} to ${t(hour[hour.length - 1]!, minute[0]!)}`;
  } else if (minute.length === 1 && hour.length <= 6) {
    time = `at ${joinWords(hour.map((h) => t(h, minute[0]!)))}`;
    atTime = true;
  } else if (minuteStep && (hour.length === 1 || contiguous(hour))) {
    const every = minuteStep === 1 ? "every minute" : `every ${minuteStep} minutes`;
    time = `${every} from ${t(hour[0]!, 0)} to ${t(hour[hour.length - 1]!, 59)}`;
  } else {
    const minutePart = minuteStep ? (minuteStep === 1 ? "every minute" : `every ${minuteStep} minutes`) : `at minute ${joinWords(minute.map(String))}`;
    const hourPart = allHours ? "" : hourStep ? ` of every ${hourStep} hours` : ` past hour ${joinWords(hour.map(String))}`;
    time = `${minutePart}${hourPart}`;
  }

  /* date phrase */
  const dowNames = joinWords(dow.map((d) => DOW_NAMES[d]!));
  const isWeekdays = sameList(dow, [1, 2, 3, 4, 5]);
  const isWeekend = sameList(dow, [0, 6]);
  const domStep = domRestricted ? null : fieldStep(dom, 1, 31);
  const dayList = domStep ? `every ${ordinal(domStep)} day` : `${pluralize(dom.length, "day")} ${joinWords(dom.map(String))}`;
  const monthList = joinWords(month.map((m) => MONTH_NAMES[m - 1]!));
  const domLimited = dom.length !== 31;
  const dowLimited = dow.length !== 7;
  /* Vixie cron: OR when neither day field is star-prefixed, otherwise AND of the value sets. */
  const dayMode =
    domRestricted && dowRestricted
      ? domLimited && dowLimited
        ? "or"
        : "none"
      : domLimited && dowLimited
        ? "and"
        : domLimited
          ? "dom"
          : dowLimited
            ? "dow"
            : "none";
  let dateEvery = "";
  let dateOn = "";
  let leading = false;
  if (dayMode === "dow") {
    dateEvery = isWeekdays ? "every weekday" : isWeekend ? "every Saturday and Sunday" : `every ${dowNames}`;
    dateOn = isWeekdays ? "on weekdays" : isWeekend ? "on weekends" : `on ${dowNames}`;
    if (monthRestricted) {
      dateEvery += ` in ${monthList}`;
      dateOn += ` in ${monthList}`;
    }
    leading = true;
  } else if (dayMode === "dom") {
    if (monthRestricted && dom.length === 1 && month.length === 1) dateOn = `on ${MONTH_NAMES[month[0]! - 1]} ${dom[0]}`;
    else dateOn = `on ${dayList} of ${monthRestricted ? monthList : "the month"}`;
  } else if (dayMode === "or") {
    dateOn = `on ${dayList} of ${monthRestricted ? monthList : "the month"} or every ${dowNames}`;
  } else if (dayMode === "and") {
    const which = isWeekdays ? "weekday" : isWeekend ? "weekend day" : joinWords(dow.map((d) => DOW_NAMES[d]!), "or");
    dateOn = `on ${dayList} of ${monthRestricted ? monthList : "the month"} if it's a ${which}`;
  } else if (monthRestricted) {
    dateOn = `every day in ${monthList}`;
  }

  if (atTime) {
    if (leading) return `${capitalize(dateEvery)} ${time}`;
    if (!dateOn) return `Every day ${time}`;
    return `${capitalize(time)} ${dateOn}`;
  }
  return `${capitalize(time)}${dateOn ? ` ${dateOn}` : ""}`;
}

/* ------------------------------------------------------------------ */
/* nextCronRuns                                                        */
/* ------------------------------------------------------------------ */

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
}

/** Wall-clock time (in `timeZone`, or the runtime's local zone) encoded as a UTC timestamp. */
function toWall(date: Date, timeZone?: string) {
  if (!timeZone) return date.getTime() - date.getTimezoneOffset() * MINUTE_MS;
  return zoneParts(date, timeZone);
}

/** Instant for a wall-clock time. A time skipped by a spring-forward gap resolves to the later (shifted) instant; a repeated time to the first. */
function fromWall(wall: number, timeZone?: string) {
  const w = new Date(wall);
  if (!timeZone) return new Date(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), w.getUTCHours(), w.getUTCMinutes());
  const first = wall - (zoneParts(new Date(wall), timeZone) - wall);
  const second = wall - (zoneParts(new Date(first), timeZone) - first);
  const candidates = first === second ? [first] : [first, second];
  const valid = candidates.filter((i) => zoneParts(new Date(i), timeZone) === wall);
  return new Date(valid.length ? Math.min(...valid) : Math.max(...candidates));
}

/**
 * Wall-clock time of `date` in `timeZone` (default: the runtime's local zone), encoded as a UTC timestamp:
 * read the fields with `getUTC*`. Inverse of `zonedWallTimeToDate`. An invalid date gives NaN.
 */
export function dateToZonedWallTime(date: Date, timeZone?: string): number {
  if (Number.isNaN(date.getTime())) return NaN;
  try {
    return toWall(date, timeZone);
  } catch {
    return NaN;
  }
}

/**
 * Instant for a wall-clock time in `timeZone` (default: the runtime's local zone, minute precision).
 * `wall` encodes the wall time as a UTC timestamp: `Date.UTC(2026, 2, 8, 9, 30)` means 09:30 on Mar 8 in that zone.
 * A time skipped by a spring-forward gap resolves to the later (shifted) instant; a repeated time to the first.
 * Non-finite input gives an invalid Date.
 */
export function zonedWallTimeToDate(wall: number, timeZone?: string): Date {
  if (!Number.isFinite(wall)) return new Date(NaN);
  try {
    return fromWall(wall, timeZone);
  } catch {
    return new Date(NaN);
  }
}

/** Options for `nextCronRuns`. */
export interface NextCronRunsOptions {
  /** IANA zone the expression is evaluated in. Default: the runtime's local zone. */
  timeZone?: string;
}

/**
 * The next `count` times (strictly after `from`) the expression fires.
 * Steps through wall-clock time in the target zone and converts each match back to an instant;
 * a wall time skipped by a spring-forward shift resolves to the shifted (later) instant (runs that
 * would then repeat or go backwards are dropped), and a repeated fall-back hour fires once. Returns `[]` for invalid expressions and stops after
 * ~8 years without a match (e.g. "0 0 30 2 *").
 */
export function nextCronRuns(expr: string, from: Date | number = new Date(), count = 5, options: NextCronRunsOptions = {}): Date[] {
  const parsed = parseCron(expr);
  if (!parsed.ok || count <= 0) return [];
  const { fields, domRestricted, dowRestricted } = parsed.value;
  const minutes = new Set(fields.minute);
  const hours = new Set(fields.hour);
  const doms = new Set(fields.dayOfMonth);
  const months = new Set(fields.month);
  const dows = new Set(fields.dayOfWeek);
  const dayOk = (dom: number, dow: number) =>
    domRestricted && dowRestricted ? doms.has(dom) || dows.has(dow) : doms.has(dom) && dows.has(dow);

  const { timeZone } = options;
  const start = Math.floor(toWall(new Date(from), timeZone) / MINUTE_MS) * MINUTE_MS + MINUTE_MS;
  const limit = start + 8 * 366 * DAY_MS;
  const out: Date[] = [];
  let last = new Date(from).getTime();
  let t = start;
  while (out.length < count && t < limit) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const day = d.getUTCDate();
    const h = d.getUTCHours();
    if (!months.has(mo + 1)) {
      t = Date.UTC(y, mo + 1, 1);
      continue;
    }
    if (!dayOk(day, d.getUTCDay())) {
      t = Date.UTC(y, mo, day + 1);
      continue;
    }
    if (!hours.has(h)) {
      t = Date.UTC(y, mo, day, h + 1);
      continue;
    }
    if (minutes.has(d.getUTCMinutes())) {
      const run = fromWall(t, timeZone);
      /* wall times shifted by DST can land on (or before) an earlier run; keep the list strictly increasing */
      if (run.getTime() > last) {
        out.push(run);
        last = run.getTime();
      }
    }
    t += MINUTE_MS;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Intervals                                                           */
/* ------------------------------------------------------------------ */

export type CronIntervalUnit = "m" | "h" | "d";

/** A fixed interval (every n minutes, hours or days) that a cron-like schedule can be written as. */
export interface CronInterval {
  every: number;
  unit: CronIntervalUnit;
}

const UNIT_MS: Record<CronIntervalUnit, number> = { m: MINUTE_MS, h: 60 * MINUTE_MS, d: DAY_MS };
const UNIT_WORDS: Record<CronIntervalUnit, [string, string]> = { m: ["minute", "minutes"], h: ["hour", "hours"], d: ["day", "days"] };

/** Parse "every 30m", "30m", "every 2 hours", "every 1d" → `{ every, unit }`, or `null`. */
export function parseInterval(text: string): CronInterval | null {
  const m = /^\s*(?:every\s+)?(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|d|days?)\s*$/i.exec(text ?? "");
  if (!m) return null;
  const every = Number(m[1]);
  if (!Number.isFinite(every) || every < 1) return null;
  const u = m[2]!.toLowerCase();
  const unit: CronIntervalUnit = u.startsWith("m") ? "m" : u.startsWith("h") ? "h" : "d";
  return { every, unit };
}

/** "every 30m" (short, the schedule-string form) or "Every 30 minutes" (`{ style: "long" }`). */
export function formatInterval(interval: CronInterval, options: { style?: "short" | "long" } = {}): string {
  const every = Math.max(1, Math.floor(interval.every));
  if (options.style === "long") {
    const [one, many] = UNIT_WORDS[interval.unit];
    return every === 1 ? `Every ${one}` : `Every ${every} ${many}`;
  }
  return `every ${every}${interval.unit}`;
}

/** Interval length in milliseconds. */
export function intervalToMs(interval: CronInterval) {
  return Math.max(1, interval.every) * UNIT_MS[interval.unit];
}

/* ------------------------------------------------------------------ */
/* Builder schedules                                                   */
/* ------------------------------------------------------------------ */

export type CronScheduleMode = "interval" | "hourly" | "daily" | "weekdays" | "weekly" | "monthly" | "once" | "custom";

/** Structured schedule for one builder mode. Weekdays are cron numbers (0 = Sunday). `time` is "HH:MM" (24h). */
export type CronSchedule =
  | { mode: "interval"; every: number; unit: CronIntervalUnit }
  | { mode: "hourly"; minute: number }
  | { mode: "daily"; time: string }
  | { mode: "weekdays"; time: string }
  | { mode: "weekly"; days: number[]; time: string }
  | { mode: "monthly"; day: number; time: string }
  | { mode: "once"; at: Date }
  | { mode: "custom"; expr: string };

/** The value a schedule field emits. */
export type CronScheduleValue =
  | { kind: "interval"; every: number; unit: CronIntervalUnit }
  | { kind: "cron"; expr: string }
  | { kind: "once"; at: Date };

function parseTime(time: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  if (!m) return [9, 0];
  return [Math.min(23, Number(m[1])), Math.min(59, Number(m[2]))];
}

const formatTimeValue = (h: number, m: number) => `${pad2(h)}:${pad2(m)}`;

/** Local "YYYY-MM-DDTHH:MM" timestamp, the schedule-string form of a one-shot run. */
export function formatLocalDateTime(d: Date) {
  return `${dateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Canonical schedule string for a builder schedule. Cron where cron is exact; intervals that cron
 * can't express exactly (e.g. 45 minutes, any number of days) become "every 45m"; one-shot runs
 * become a local ISO timestamp ("2026-12-01T09:30"). `cronToSchedule` accepts all three forms.
 */
export function scheduleToCron(schedule: CronSchedule): string {
  switch (schedule.mode) {
    case "interval": {
      const every = Math.max(1, Math.floor(schedule.every));
      if (schedule.unit === "m" && every < 60 && 60 % every === 0) return `*/${every} * * * *`;
      if (schedule.unit === "h" && every < 24 && 24 % every === 0) return `0 */${every} * * *`;
      return formatInterval({ every, unit: schedule.unit });
    }
    case "hourly":
      return `${Math.min(59, Math.max(0, Math.floor(schedule.minute)))} * * * *`;
    case "daily":
    case "weekdays":
    case "weekly":
    case "monthly": {
      const [h, m] = parseTime(schedule.time);
      if (schedule.mode === "daily") return `${m} ${h} * * *`;
      if (schedule.mode === "weekdays") return `${m} ${h} * * 1-5`;
      if (schedule.mode === "weekly") {
        const days = [...new Set(schedule.days)].sort((a, b) => a - b);
        return `${m} ${h} * * ${days.length ? days.join(",") : "*"}`;
      }
      return `${m} ${h} ${Math.min(31, Math.max(1, Math.floor(schedule.day)))} * *`;
    }
    case "once":
      return formatLocalDateTime(schedule.at);
    case "custom":
      return schedule.expr.trim();
  }
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

/** Map a schedule string (cron, "every 30m" or an ISO timestamp) back to the builder mode that produced it; anything else is `custom`. */
export function cronToSchedule(expr: string): CronSchedule {
  const text = (expr ?? "").trim();
  const interval = parseInterval(text);
  if (interval) return { mode: "interval", ...interval };
  const iso = ISO_RE.exec(text);
  if (iso) {
    const at = iso[6]
      ? new Date(text.replace(" ", "T"))
      : new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4]), Number(iso[5]));
    if (!Number.isNaN(at.getTime())) return { mode: "once", at };
  }
  const parsed = parseCron(text);
  if (!parsed.ok || text.startsWith("@")) return { mode: "custom", expr: text };
  const { raw, fields } = parsed.value;
  const single = (s: string) => /^\d+$/.test(s);
  const allStar = (...keys: CronFieldName[]) => keys.every((k) => raw[k] === "*");
  const stepMatch = (s: string) => /^\*\/(\d+)$/.exec(s);

  /* `*\/N` is only a true interval when N divides the cycle (`*\/45` fires at :00 and :45, not every 45m). */
  const mStep = stepMatch(raw.minute);
  const mEvery = mStep ? Number(mStep[1]) : 0;
  if (mEvery && mEvery < 60 && 60 % mEvery === 0 && allStar("hour", "dayOfMonth", "month", "dayOfWeek")) return { mode: "interval", every: mEvery, unit: "m" };
  const hStep = stepMatch(raw.hour);
  const hEvery = hStep ? Number(hStep[1]) : 0;
  if (raw.minute === "0" && hEvery && hEvery < 24 && 24 % hEvery === 0 && allStar("dayOfMonth", "month", "dayOfWeek")) return { mode: "interval", every: hEvery, unit: "h" };
  if (single(raw.minute) && allStar("hour", "dayOfMonth", "month", "dayOfWeek")) return { mode: "hourly", minute: fields.minute[0]! };
  if (single(raw.minute) && single(raw.hour) && allStar("month")) {
    const time = formatTimeValue(fields.hour[0]!, fields.minute[0]!);
    if (raw.dayOfMonth === "*" && raw.dayOfWeek === "*") return { mode: "daily", time };
    if (raw.dayOfMonth === "*") {
      if (sameList(fields.dayOfWeek, [1, 2, 3, 4, 5])) return { mode: "weekdays", time };
      return { mode: "weekly", days: fields.dayOfWeek, time };
    }
    if (single(raw.dayOfMonth) && raw.dayOfWeek === "*") return { mode: "monthly", day: fields.dayOfMonth[0]!, time };
  }
  return { mode: "custom", expr: parsed.value.expression };
}

/** Schedule string for a field value: "every 30m", a cron expression, or a local ISO timestamp. */
export function toScheduleString(value: CronScheduleValue): string {
  if (value.kind === "interval") return formatInterval(value);
  if (value.kind === "once") return formatLocalDateTime(value.at);
  return value.expr.trim();
}

/** Builder schedule → emitted value. */
export function scheduleToValue(schedule: CronSchedule): CronScheduleValue {
  if (schedule.mode === "interval") return { kind: "interval", every: schedule.every, unit: schedule.unit };
  if (schedule.mode === "once") return { kind: "once", at: schedule.at };
  return { kind: "cron", expr: scheduleToCron(schedule) };
}

/** Emitted value (or schedule string) → builder schedule. */
export function valueToSchedule(value: CronScheduleValue | string): CronSchedule {
  if (typeof value === "string") return cronToSchedule(value);
  if (value.kind === "interval") return { mode: "interval", every: value.every, unit: value.unit };
  if (value.kind === "once") return { mode: "once", at: value.at };
  return cronToSchedule(value.expr);
}

/** Validation message for a schedule, or `null` when it is valid. */
export function cronScheduleError(schedule: CronSchedule): string | null {
  switch (schedule.mode) {
    case "interval":
      return Number.isInteger(schedule.every) && schedule.every >= 1 ? null : "Interval must be a whole number of at least 1";
    case "hourly":
      return Number.isInteger(schedule.minute) && schedule.minute >= 0 && schedule.minute <= 59 ? null : "Minute must be between 0 and 59";
    case "daily":
    case "weekdays":
      return /^\d{1,2}:\d{2}$/.test(schedule.time) ? null : "Pick a time";
    case "weekly":
      if (!schedule.days.length) return "Pick at least one day";
      return /^\d{1,2}:\d{2}$/.test(schedule.time) ? null : "Pick a time";
    case "monthly":
      if (!Number.isInteger(schedule.day) || schedule.day < 1 || schedule.day > 31) return "Day must be between 1 and 31";
      return /^\d{1,2}:\d{2}$/.test(schedule.time) ? null : "Pick a time";
    case "once":
      return schedule.at instanceof Date && !Number.isNaN(schedule.at.getTime()) ? null : "Pick a date and time";
    case "custom": {
      const r = parseCron(schedule.expr);
      return r.ok ? null : r.error;
    }
  }
}

/** Human summary of any schedule (builder schedule, value or schedule string). */
export function describeSchedule(input: CronSchedule | CronScheduleValue | string, options: DescribeCronOptions = {}): string {
  const schedule = typeof input === "string" || "kind" in input ? valueToSchedule(input) : input;
  if (schedule.mode === "interval") return formatInterval(schedule, { style: "long" });
  if (schedule.mode === "once") {
    if (Number.isNaN(schedule.at.getTime())) return "Once";
    const date = new Intl.DateTimeFormat(options.locale ?? "en-US", { dateStyle: "medium" }).format(schedule.at);
    return `Once on ${date} at ${formatClockTime(schedule.at.getHours(), schedule.at.getMinutes(), options)}`;
  }
  return describeCron(scheduleToCron(schedule), options);
}

/** Upcoming run times for any schedule. Intervals are anchored at `from`. */
export function nextScheduleRuns(input: CronSchedule | CronScheduleValue | string, from: Date | number = new Date(), count = 3, options: NextCronRunsOptions = {}): Date[] {
  const schedule = typeof input === "string" || "kind" in input ? valueToSchedule(input) : input;
  const base = new Date(from).getTime();
  if (cronScheduleError(schedule)) return [];
  if (schedule.mode === "interval") {
    const step = intervalToMs(schedule);
    return Array.from({ length: count }, (_, i) => new Date(base + step * (i + 1)));
  }
  if (schedule.mode === "once") return schedule.at.getTime() > base ? [schedule.at] : [];
  return nextCronRuns(scheduleToCron(schedule), from, count, options);
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

/** "44:12" or "1:02:03" for a remaining duration. */
export function formatCountdownClock(ms: number): string {
  return formatCountdown(ms, { padMinutes: true });
}

/** Compact relative time: "in 5m", "in 3h", "2d ago", "now". */
export function formatScheduleRelative(target: Date | number | string, now: Date | number = Date.now()): string {
  const text = formatRelative(target, { now, future: true, justNowMs: 30_000 });
  return text === "just now" ? "now" : text;
}

/* Helpers shared with the CronScheduleField UI (not re-exported from the package root). */
export { DOW_NAMES as cronWeekdayNames, parseTime as parseCronTime, formatTimeValue as formatCronTime };
