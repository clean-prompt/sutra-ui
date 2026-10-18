/* Shared duration helpers. Pure; never throw on bad input. */
import { roundTo, type RoundingMode } from "./math";

/** A duration split into calendar-free parts. */
export interface DurationSplit {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
}

export interface SplitDurationOptions {
  /** Round to whole seconds first (`ms` is then 0). Default: no rounding, the remainder stays in `ms`. */
  round?: RoundingMode;
}

/** Splits milliseconds into days/hours/minutes/seconds/ms (negative and non-finite → all zero). */
export function splitDuration(ms: number, options: SplitDurationOptions = {}): DurationSplit {
  let total = Number.isFinite(ms) && ms > 0 ? ms : 0;
  if (options.round) total = roundTo(total / 1000, 0, options.round) * 1000;
  total = Math.floor(total);
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
    ms: total % 1000,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export interface FormatClockOptions {
  /** Zero-pad the leading minutes (`"01:05"`). Default false. */
  padMinutes?: boolean;
  /** Zero-pad the hours when shown (`"01:05:09"`). Default false. */
  padHours?: boolean;
  /** Always show hours (`"0:01:05"`). Default false. */
  forceHours?: boolean;
  /** How to reach the smallest shown unit. Default `"floor"` (elapsed time). */
  round?: RoundingMode;
  /** Fractional second digits (`2` → `"1:05.37"`, stopwatch style). Default 0. */
  fractionDigits?: 0 | 1 | 2 | 3;
  /** Keep the sign of negative values (`"-1:05"`); otherwise they clamp to 0. */
  signed?: boolean;
  /** Text for non-finite input. Default `"0:00"` (formatted zero). */
  invalid?: string;
}

/** Clock-style duration from SECONDS: `"1:05"`, `"1:01:05"`, `"01:05:09"`. */
export function formatClock(seconds: number, options: FormatClockOptions = {}): string {
  const digits = options.fractionDigits ?? 0;
  if (!Number.isFinite(seconds)) {
    if (options.invalid !== undefined) return options.invalid;
    seconds = 0;
  }
  const negative = seconds < 0 && options.signed === true;
  const abs = negative ? -seconds : Math.max(0, seconds);
  const scale = 10 ** digits;
  const units = roundTo(abs * scale, 0, options.round ?? "floor");
  const whole = Math.floor(units / scale);
  const frac = units % scale;
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const showHours = h > 0 || options.forceHours === true;
  const tail = digits > 0 ? `.${String(frac).padStart(digits, "0")}` : "";
  const body = showHours
    ? `${options.padHours ? pad(h) : h}:${pad(m)}:${pad(s)}${tail}`
    : `${options.padMinutes ? pad(m) : m}:${pad(s)}${tail}`;
  return negative && units > 0 ? `-${body}` : body;
}

/** Countdown clock from remaining MILLISECONDS, rounded up so it reads `"0:00"` only at the deadline. */
export function formatCountdown(msRemaining: number, options: Omit<FormatClockOptions, "round"> = {}): string {
  return formatClock(Number.isFinite(msRemaining) ? msRemaining / 1000 : msRemaining, { ...options, round: "ceil" });
}

export type DurationUnit = "d" | "h" | "m" | "s";

const UNIT_ORDER: DurationUnit[] = ["d", "h", "m", "s"];
const UNIT_MS: Record<DurationUnit, number> = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 };

export interface FormatDurationOptions {
  /** Maximum number of units shown (`2` → `"1h 5m"`). Default 2. */
  units?: number;
  /** Zero-pad every unit after the first (`"3m 05s"`). Default false. */
  pad?: boolean;
  /** Show milliseconds under one second (`"850ms"`). Default false. */
  ms?: boolean;
  /** Space between number and unit (`"850 ms"`, `"3 m 5 s"`). Default false. */
  space?: boolean;
  /** Decimal seconds below `decimalsBelow` (`1` → `"1.5s"`). Default 0. */
  decimals?: number;
  /** Threshold in ms for `decimals`. Default 10 000. */
  decimalsBelow?: number;
  /** Drop trailing zeros from decimals (`"1s"` instead of `"1.0s"`). Default true. */
  trimZeros?: boolean;
  /** Keep zero parts (`"2m 0s"`); `false` → `"2m"`. Default true. */
  keepZeros?: boolean;
  /** Largest unit used (`"m"` → `"90m"`). Default `"d"`. */
  maxUnit?: DurationUnit;
  /** Smallest unit used (`"m"` → `"5m"`). Default `"s"`. */
  minUnit?: DurationUnit;
  /** How to reach the smallest shown unit. Default `"round"`. */
  round?: RoundingMode;
  /** Keep the sign of negative values; otherwise they clamp to 0. */
  signed?: boolean;
  /** Text when the rounded result is zero (e.g. `"<1s"`, `"a moment"`). Default: formatted zero. */
  zero?: string;
  /** Text for non-finite input. Default `"—"`. */
  invalid?: string;
  /** Locale for decimal separators. */
  locale?: string;
}

function decimal(n: number, digits: number, trim: boolean, locale: string | undefined): string {
  if (locale) {
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: trim ? 0 : digits,
        maximumFractionDigits: digits,
        useGrouping: false,
      }).format(n);
    } catch {
      /* fall through */
    }
  }
  return trim ? String(n) : n.toFixed(digits);
}

/**
 * Compact duration from MILLISECONDS: `"1h 5m"`, `"3m 05s"`, `"850ms"`, `"1.5s"`.
 * Rounds once to the smallest displayed unit before splitting, so 119.6 s is `"2m 0s"`, never `"1m 60s"`.
 */
export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
  if (!Number.isFinite(ms)) return options.invalid ?? "—";
  const sp = options.space ? " " : "";
  const mode = options.round ?? "round";
  const negative = ms < 0 && options.signed === true;
  const abs = negative ? -ms : Math.max(0, ms);
  const sign = negative ? "-" : "";
  const trim = options.trimZeros !== false;

  const maxIdx = UNIT_ORDER.indexOf(options.maxUnit ?? "d");
  const minIdx = Math.max(maxIdx, UNIT_ORDER.indexOf(options.minUnit ?? "s"));
  const secondsShown = minIdx === UNIT_ORDER.length - 1;

  if (options.ms && secondsShown && abs < 1000) {
    const r = roundTo(abs, 0, mode);
    if (r < 1000) {
      if (r === 0 && options.zero !== undefined) return options.zero;
      return `${r > 0 ? sign : ""}${r}${sp}ms`;
    }
  }

  const decimals = Math.max(0, Math.min(3, Math.trunc(options.decimals ?? 0)));
  const decimalsBelow = options.decimalsBelow ?? 10_000;
  if (decimals > 0 && secondsShown && abs < decimalsBelow && abs < 60_000) {
    const v = roundTo(abs / 1000, decimals, mode);
    if (v * 1000 < decimalsBelow && v < 60) {
      if (v === 0 && options.zero !== undefined) return options.zero;
      return `${v > 0 ? sign : ""}${decimal(v, decimals, trim, options.locale)}${sp}s`;
    }
  }

  const maxUnits = Math.max(1, Math.trunc(options.units ?? 2));
  const largestIdx = (value: number) => {
    for (let i = maxIdx; i < minIdx; i++) if (value >= UNIT_MS[UNIT_ORDER[i]!]) return i;
    return minIdx;
  };
  const smallestIdx = (lead: number) => Math.min(minIdx, lead + maxUnits - 1);

  let lead = largestIdx(abs);
  let small = smallestIdx(lead);
  let value = roundTo(abs / UNIT_MS[UNIT_ORDER[small]!], 0, mode) * UNIT_MS[UNIT_ORDER[small]!];
  // Rounding can carry into a larger unit (59.6 min → 60 min); re-anchor on it. The value is then exact.
  const newLead = largestIdx(value);
  if (newLead !== lead) {
    lead = newLead;
    small = smallestIdx(lead);
    value = roundTo(value / UNIT_MS[UNIT_ORDER[small]!], 0, mode) * UNIT_MS[UNIT_ORDER[small]!];
  }

  if (value === 0 && options.zero !== undefined) return options.zero;

  const parts: string[] = [];
  let rest = value;
  for (let i = lead; i <= small; i++) {
    const unit = UNIT_ORDER[i]!;
    const size = UNIT_MS[unit];
    const n = Math.floor(rest / size);
    rest -= n * size;
    if (n === 0 && options.keepZeros === false && i !== lead) continue;
    const text = options.pad && i !== lead ? pad(n) : String(n);
    parts.push(`${text}${sp}${unit}`);
  }
  return `${value > 0 ? sign : ""}${parts.join(" ")}`;
}
