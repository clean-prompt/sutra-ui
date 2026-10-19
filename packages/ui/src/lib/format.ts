/* Shared number, size and text formatters. Pure; never throw on bad input. */
import { roundTo } from "./math";

function toNumber(v: unknown): number {
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
}

function numberText(n: number, decimals: number, trimZeros: boolean | "whole", locale: string | undefined): string {
  if (trimZeros === "whole") {
    // toFixed(0), not String(), so big whole values keep every digit like the untrimmed form does.
    if (!locale) return n.toFixed(Number.isInteger(n) ? 0 : decimals);
    trimZeros = Number.isInteger(n);
  }
  if (locale) {
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: trimZeros ? 0 : decimals,
        maximumFractionDigits: decimals,
      }).format(n);
    } catch {
      /* fall through */
    }
  }
  return trimZeros ? String(n) : n.toFixed(decimals);
}

/* ------------------------------------------------------------------ */
/* Bytes                                                               */
/* ------------------------------------------------------------------ */

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;

/** Options for `formatBytes`: decimals, unit base, units and number locale. */
export interface FormatBytesOptions {
  /** Decimal places above bytes. Default 1. */
  decimals?: number;
  /**
   * Drop trailing zeros (`"2 KB"` instead of `"2.0 KB"`, `"1.5 MB"` instead of `"1.50 MB"`). Default true.
   * `"whole"` drops the fraction only when it is all zeros (`"2 KB"` but `"1.50 MB"`).
   */
  trimZeros?: boolean | "whole";
  /** Values at or above this (in the chosen unit) show no decimals (`10` → `"12 MB"`, `"1.5 MB"`). Default: never. */
  wholeAbove?: number;
  /** `1024` (default) or `1000`. Labels are KB/MB/GB either way. */
  base?: 1024 | 1000;
  /** Space between number and unit. Default true. */
  space?: boolean;
  /**
   * Unit labels from bytes upward; the last one is the largest unit used (larger values count in it).
   * Default `["B", "KB", "MB", "GB", "TB", "PB", "EB"]`. E.g. `["B", "kB", "MB", "GB"]` for SI rates, or stop at `"TB"`.
   */
  units?: readonly string[];
  /** Negative input: `"sign"` (default, `"-1.5 KB"`), `"zero"` (`"0 B"`) or `"invalid"` (returns `invalid`). */
  negative?: "sign" | "zero" | "invalid";
  /** Text for non-numeric input. Default `"—"`. */
  invalid?: string;
  locale?: string;
}

/** Human file size such as `"1.5 MB"`. Re-checks the unit after rounding, so 1023.99 B is `"1 KB"`, never `"1024 B"`. */
export function formatBytes(bytes: number | null | undefined, options: FormatBytesOptions = {}): string {
  let n = toNumber(bytes);
  if (!Number.isFinite(n) || (n < 0 && options.negative === "invalid")) return options.invalid ?? "—";
  if (n < 0 && options.negative === "zero") n = 0;
  const units = options.units && options.units.length > 0 ? options.units : BYTE_UNITS;
  const last = units.length - 1;
  const base = options.base === 1000 ? 1000 : 1024;
  const decimals = Math.max(0, Math.min(10, Math.trunc(options.decimals ?? 1)));
  const trim = options.trimZeros ?? true;
  const sp = options.space === false ? "" : " ";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  let i = abs < 1 ? 0 : Math.min(last, Math.floor(Math.log(abs) / Math.log(base)));
  // log() can land one off at exact powers; correct it.
  while (i > 0 && abs < base ** i) i--;
  while (i < last && abs >= base ** (i + 1)) i++;

  const round = (unit: number) => {
    const scaled = abs / base ** unit;
    if (unit === 0) return { v: Math.round(scaled), d: 0 };
    const d = options.wholeAbove !== undefined && scaled >= options.wholeAbove ? 0 : decimals;
    return { v: roundTo(scaled, d), d };
  };
  let r = round(i);
  if (r.v >= base && i < last) {
    i++;
    r = round(i);
  }
  if (r.v === 0) return `0${sp}${units[0]}`;
  return `${sign}${numberText(r.v, r.d, i === 0 || trim, options.locale)}${sp}${units[i]}`;
}

/* ------------------------------------------------------------------ */
/* Compact numbers & tokens                                            */
/* ------------------------------------------------------------------ */

const COMPACT_SUFFIXES = ["", "k", "M", "B", "T"] as const;

/** Options for `formatCompact`: decimals, suffix letter case and number locale. */
export interface FormatCompactOptions {
  /** Decimal places once abbreviated. Default 1. */
  decimals?: number;
  /** `"mixed"` (default) → k/M/B/T, `"upper"` → K/M/B/T, `"lower"` → k/m/b/t. */
  suffixCase?: "mixed" | "upper" | "lower";
  /** Scaled values at or above this show no decimals (`100` → `"123k"`). Default: never. */
  wholeAbove?: number;
  /** Drop trailing zeros. Default true. */
  trimZeros?: boolean;
  /** Text for non-numeric input. Default `"—"`. */
  invalid?: string;
  locale?: string;
}

/** Abbreviated number such as `"1.2k"` or `"3M"`. Rounds before choosing the unit, so 999 950 is `"1M"`, never `"1000k"`. */
export function formatCompact(n: number | null | undefined, options: FormatCompactOptions = {}): string {
  const v = toNumber(n);
  if (!Number.isFinite(v)) return options.invalid ?? "—";
  const decimals = Math.max(0, Math.min(10, Math.trunc(options.decimals ?? 1)));
  const trim = options.trimZeros !== false;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const last = COMPACT_SUFFIXES.length - 1;

  let i = abs < 1000 ? 0 : Math.min(last, Math.floor(Math.log10(abs) / 3));
  while (i > 0 && abs < 1000 ** i) i--;
  const round = (unit: number) => {
    const scaled = abs / 1000 ** unit;
    if (unit === 0) return { r: Math.round(scaled), d: 0 };
    const d = options.wholeAbove !== undefined && scaled >= options.wholeAbove ? 0 : decimals;
    return { r: roundTo(scaled, d), d };
  };
  let { r, d } = round(i);
  while (r >= 1000 && i < last) {
    i++;
    ({ r, d } = round(i));
  }
  if (r === 0) return "0";
  let suffix: string = COMPACT_SUFFIXES[i]!;
  if (options.suffixCase === "upper") suffix = suffix.toUpperCase();
  else if (options.suffixCase === "lower") suffix = suffix.toLowerCase();
  return `${sign}${numberText(r, d, trim || i === 0, options.locale)}${suffix}`;
}

/** Options for `formatTokens`: the compact options plus an optional "tokens" label. */
export interface FormatTokensOptions extends FormatCompactOptions {
  /** Append `"token"`/`"tokens"` (`"1.2k tokens"`). Default false. */
  label?: boolean;
}

/** Token count such as `"1.2k"` or `"1.2k tokens"`. */
export function formatTokens(n: number | null | undefined, options: FormatTokensOptions = {}): string {
  const { label, ...rest } = options;
  const text = formatCompact(n, rest);
  const v = toNumber(n);
  if (!label || !Number.isFinite(v)) return text;
  return `${text} ${text === "1" || text === "-1" ? "token" : "tokens"}`;
}

/** Badge count capped at `max` (`120` → `"99+"`; negative or non-numeric → `"0"`). */
export function formatBadgeCount(n: number | null | undefined, max = 99): string {
  const v = toNumber(n);
  if (!Number.isFinite(v) || v <= 0) return "0";
  const whole = Math.floor(v);
  const cap = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 99;
  return whole > cap ? `${cap}+` : String(whole);
}

/* ------------------------------------------------------------------ */
/* Currency                                                            */
/* ------------------------------------------------------------------ */

export interface FormatCostOptions {
  /** ISO 4217 code. Default `"USD"`. */
  currency?: string;
  locale?: string;
  /** Non-zero amounts below this read `"<$0.01"`. Default 0.01; 0 disables. */
  tiny?: number;
  /** Maximum fraction digits. Default 2. */
  maxFraction?: number;
  /** Minimum fraction digits. Default: `min(2, maxFraction)`. */
  minFraction?: number;
  /** Text for non-numeric input. Default `"—"`. */
  invalid?: string;
}

function currencyFormat(locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    try {
      return new Intl.NumberFormat(locale, { ...options, currency: "USD" });
    } catch {
      return new Intl.NumberFormat("en-US", { ...options, currency: "USD" });
    }
  }
}

/** Money amount (major units) such as `"$1.23"`, with `"<$0.01"` for tiny non-zero values. */
export function formatCost(amount: number | null | undefined, options: FormatCostOptions = {}): string {
  const v = toNumber(amount);
  if (!Number.isFinite(v)) return options.invalid ?? "—";
  const maxFraction = Math.max(0, Math.min(20, Math.trunc(options.maxFraction ?? 2)));
  const minFraction = Math.max(0, Math.min(maxFraction, Math.trunc(options.minFraction ?? Math.min(2, maxFraction))));
  const fmt = currencyFormat(options.locale, {
    style: "currency",
    currency: options.currency ?? "USD",
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
  });
  const tiny = options.tiny ?? 0.01;
  if (tiny > 0 && v !== 0 && Math.abs(v) < tiny) return `${v < 0 ? "-" : ""}<${fmt.format(tiny)}`;
  return fmt.format(v === 0 ? 0 : v);
}

/* ------------------------------------------------------------------ */
/* Words                                                               */
/* ------------------------------------------------------------------ */

/** The singular or plural word for `n` (`pluralize(2, "file")` → `"files"`). The count is not included. */
export function pluralize(n: number, singular: string, plural?: string): string {
  return Math.abs(n) === 1 ? singular : (plural ?? `${singular}s`);
}

/** Options for `formatList`: locale, list type and style. */
export interface FormatListOptions {
  locale?: string;
  /** `"conjunction"` (default, "a, b, and c"), `"disjunction"` ("a, b, or c") or `"unit"`. */
  type?: "conjunction" | "disjunction" | "unit";
  style?: "long" | "short" | "narrow";
}

/** Locale-aware list such as `"Ana, Ben, and Cy"` (falls back to commas without `Intl.ListFormat`). */
export function formatList(items: readonly unknown[] | null | undefined, options: FormatListOptions = {}): string {
  const list = (items ?? []).filter((x) => x !== null && x !== undefined && x !== "").map(String);
  if (list.length === 0) return "";
  const ListFormat = (Intl as unknown as { ListFormat?: new (l?: string, o?: object) => { format(x: string[]): string } })
    .ListFormat;
  if (ListFormat) {
    try {
      return new ListFormat(options.locale, { type: options.type ?? "conjunction", style: options.style ?? "long" }).format(list);
    } catch {
      /* fall through */
    }
  }
  if (list.length === 1) return list[0]!;
  const word = options.type === "disjunction" ? "or" : options.type === "unit" ? "" : "and";
  if (!word) return list.join(", ");
  if (list.length === 2) return `${list[0]} ${word} ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, ${word} ${list[list.length - 1]}`;
}
