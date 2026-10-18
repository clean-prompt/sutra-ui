import * as React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import {
  addDays,
  calendarDayDiff,
  dateKey,
  formatClockTime,
  formatDateTime,
  formatDayLabel,
  formatRelative,
  formatShortDate,
  isValidDate,
  pad2,
  safeISO,
  startOfDay,
  toDate,
  toMs,
  toValidDate,
} from "../src/lib/time";
import * as legacyDate from "../src/lib/date";
import { formatClock, formatCountdown, formatDuration, splitDuration } from "../src/lib/duration";
import {
  formatBadgeCount,
  formatBytes,
  formatCompact,
  formatCost,
  formatList,
  formatTokens,
  pluralize,
} from "../src/lib/format";
import { colorForSeed, hashString, mulberry32, pickForSeed, seededRandom } from "../src/lib/hash";
import { capitalize, escapeRegExp, graphemes, initials, matchRanges, slugify, truncateMiddle } from "../src/lib/text";
import { hostnameOf, isEmail, isHttpUrl, isSafeHref } from "../src/lib/validate";
import { clamp, roundTo, toPercent } from "../src/lib/math";
import { base32Decode, base32Encode, base64UrlDecode, base64UrlDecodeBytes, base64UrlEncode } from "../src/lib/encoding";
import { chartColors } from "../src/lib/tokens";
import { useCountdown, useNow } from "../src/hooks/use-now";
import { prefersReducedMotion, useBreakpoint, useMediaQuery, usePrefersReducedMotion } from "../src/hooks/use-media-query";
import { useElementSize, useElementWidth, useResizeObserver } from "../src/hooks/use-resize-observer";
import { useIsoLayoutEffect } from "../src/hooks/use-iso-layout-effect";
import { errorMessage, useAsyncAction, useMountedRef } from "../src/hooks/use-async-action";
import { useSafeId } from "../src/hooks/use-safe-id";
import { useAsyncAction as useBlockAsyncAction, isEmail as blockIsEmail } from "../src/blocks/block-utils";
import { CopyButton, CopyField } from "../src/components/copy-button";
import { identityHash } from "../src/components/identity-mark";
import { base32Decode as totpBase32Decode } from "../src/components/totp";
import { kunjiBase64Url } from "../src/components/kunji-client";
import * as root from "../src";
import * as tokensEntry from "../src/entries/tokens";
import { axeViolations } from "./a11y";

/** Wednesday, 14 October 2026, 10:00 local time. */
const NOW = new Date(2026, 9, 14, 10, 0).getTime();
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => NOW - ms;

/** Runs `fn` with the process time zone switched (Node reads TZ on each Date operation). */
function withTimeZone(tz: string, fn: () => void) {
  const prev = process.env.TZ;
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
}

/* ------------------------------------------------------------------ */
/* lib/time                                                            */
/* ------------------------------------------------------------------ */

describe("lib/time parsing", () => {
  it("toMs / toDate accept dates, numbers and strings and reject junk", () => {
    const d = new Date(2024, 2, 5, 9, 30);
    expect(toMs(d)).toBe(d.getTime());
    expect(toMs(12345)).toBe(12345);
    expect(toMs("2024-03-05T09:30:00Z")).toBe(Date.UTC(2024, 2, 5, 9, 30));
    for (const bad of ["nope", "", NaN, Infinity, null, undefined, new Date(NaN), {} as unknown as string]) {
      expect(toMs(bad)).toBeUndefined();
      expect(toDate(bad)).toBeUndefined();
    }
  });

  it("reads YYYY-MM-DD as a local calendar date and rejects overflow", () => {
    const d = toDate("2024-03-05")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2024, 2, 5, 0]);
    expect(toDate(" 0099-01-02 ")!.getFullYear()).toBe(99);
    expect(toDate("2024-02-31")).toBeUndefined();
    expect(toValidDate("2024-02-29")).toBeDefined();
  });

  it("keeps the lib/date exports working (re-exported from lib/time)", () => {
    expect(legacyDate.isValidDate).toBe(isValidDate);
    expect(legacyDate.toValidDate).toBe(toValidDate);
    expect(legacyDate.safeISO).toBe(safeISO);
    expect(isValidDate(new Date(NaN))).toBe(false);
    expect(isValidDate("2024-01-01")).toBe(false);
    expect(safeISO(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(safeISO("bad")).toBeUndefined();
    expect(safeISO(8.64e15 + 1)).toBeUndefined();
  });

  it("pad2, dateKey, startOfDay, addDays", () => {
    expect([pad2(5), pad2(12), pad2(-5), pad2(5.7), pad2(NaN), pad2(123)]).toEqual(["05", "12", "-05", "05", "00", "123"]);
    expect(dateKey(new Date(2024, 0, 9, 23, 59))).toBe("2024-01-09");
    expect(dateKey("2024-12-31")).toBe("2024-12-31");
    expect(dateKey("bad")).toBe("");
    const s = startOfDay(new Date(2024, 2, 5, 15, 30));
    expect([s.getDate(), s.getHours(), s.getMinutes()]).toEqual([5, 0, 0]);
    expect(isValidDate(startOfDay("x"))).toBe(false);
    const next = addDays(new Date(2024, 0, 31, 9), 1);
    expect([next.getMonth(), next.getDate(), next.getHours()]).toEqual([1, 1, 9]);
    expect(addDays(new Date(2024, 2, 1), -1).getDate()).toBe(29);
    expect(isValidDate(addDays("bad", 1))).toBe(false);
    expect(isValidDate(addDays(new Date(), NaN))).toBe(false);
    expect(calendarDayDiff(new Date(2024, 2, 5, 0, 1), new Date(2024, 2, 4, 23, 59))).toBe(1);
    expect(calendarDayDiff("bad", new Date())).toBeUndefined();
  });

  it("addDays and day labels are DST-safe", () => {
    withTimeZone("America/New_York", () => {
      // 10 March 2024 is a 23-hour day in New York.
      expect(new Date(2024, 2, 9, 12).getTimezoneOffset()).toBe(300);
      expect(new Date(2024, 2, 10, 12).getTimezoneOffset()).toBe(240);
      const before = new Date(2024, 2, 9, 12);
      const after = addDays(before, 1);
      expect([after.getDate(), after.getHours()]).toEqual([10, 12]);
      expect(after.getTime() - before.getTime()).toBeLessThanOrEqual(DAY);

      const now = new Date(2024, 2, 10, 23, 30);
      expect(formatDayLabel(new Date(2024, 2, 9, 23, 45), { now, locale: "en-US" })).toBe("Yesterday");
      expect(formatDayLabel(new Date(2024, 2, 10, 0, 15), { now, locale: "en-US" })).toBe("Today");
      // 3 November 2024 is a 25-hour day.
      const fallNow = new Date(2024, 10, 4, 0, 30);
      expect(formatDayLabel(new Date(2024, 10, 3, 0, 0), { now: fallNow, locale: "en-US" })).toBe("Yesterday");
      expect(formatDayLabel(new Date(2024, 10, 2, 23, 59), { now: fallNow, locale: "en-US" })).toBe("Sat");
      expect(dateKey(addDays(new Date(2024, 10, 2, 0, 30), 1))).toBe("2024-11-03");
    });
  });
});

describe("formatRelative", () => {
  const rel = (ms: number, o: Parameters<typeof formatRelative>[1] = {}) =>
    formatRelative(ago(ms), { now: NOW, locale: "en-US", ...o });

  it("says just now under justNowMs (default 45s)", () => {
    expect(rel(10 * SEC)).toBe("just now");
    expect(rel(44 * SEC)).toBe("just now");
    expect(rel(10 * SEC, { style: "narrow" })).toBe("now");
    expect(rel(10 * SEC, { style: "long" })).toBe("just now");
    expect(rel(0)).toBe("just now");
    expect(rel(46 * SEC)).toBe("1m ago");
    expect(rel(10 * SEC, { justNowMs: 5 * SEC })).toBe("1m ago");
  });

  it("formats each style", () => {
    expect(rel(30 * MIN)).toBe("30m ago");
    expect(rel(30 * MIN, { style: "narrow" })).toBe("30m");
    expect(rel(30 * MIN, { style: "long" })).toBe("30 min ago");
    expect(rel(5 * HOUR)).toBe("5h ago");
    expect(rel(1 * HOUR, { style: "long" })).toBe("1 hour ago");
    expect(rel(5 * HOUR, { style: "long" })).toBe("5 hours ago");
    expect(rel(3 * DAY)).toBe("3d ago");
    expect(rel(3 * DAY, { style: "long" })).toBe("3 days ago");
    expect(rel(1 * DAY, { style: "long" })).toBe("yesterday");
    expect(rel(1 * DAY)).toBe("1d ago");
    expect(rel(1 * DAY, { yesterday: true })).toBe("yesterday");
    expect(rel(60 * DAY)).toBe("2mo ago");
    expect(rel(60 * DAY, { style: "long" })).toBe("2 months ago");
    expect(rel(800 * DAY)).toBe("2y ago");
    expect(rel(400 * DAY, { style: "long" })).toBe("1 year ago");
  });

  it("rounds once and promotes at unit thresholds (no '60m ago')", () => {
    expect(rel(59.6 * MIN)).toBe("1h ago");
    expect(rel(59.4 * MIN)).toBe("59m ago");
    expect(rel(23.6 * HOUR)).toBe("1d ago");
    expect(rel(23.6 * HOUR, { style: "long" })).toBe("yesterday");
    expect(rel(29.6 * DAY)).toBe("1mo ago");
    expect(rel(359 * DAY)).toBe("1y ago");
    expect(rel(59.6 * SEC, { seconds: true, justNowMs: 5 * SEC })).toBe("1m ago");
    expect(rel(30 * SEC, { seconds: true, justNowMs: 5 * SEC })).toBe("30s ago");
    expect(rel(30 * SEC, { seconds: true, justNowMs: 5 * SEC, style: "long" })).toBe("30 sec ago");
  });

  it("clamps the future unless future: true", () => {
    expect(rel(-5 * MIN)).toBe("just now");
    expect(rel(-5 * MIN, { future: true })).toBe("in 5m");
    expect(rel(-5 * MIN, { future: true, style: "narrow" })).toBe("in 5m");
    expect(rel(-5 * MIN, { future: true, style: "long" })).toBe("in 5 min");
    expect(rel(-1 * DAY, { future: true, style: "long" })).toBe("tomorrow");
    expect(rel(-10 * SEC, { future: true })).toBe("just now");
  });

  it("switches to an absolute date past maxRelativeDays", () => {
    expect(rel(6 * DAY, { maxRelativeDays: 6 })).toBe("6d ago");
    expect(rel(8 * DAY, { maxRelativeDays: 6 })).toBe("Oct 6");
    expect(rel(400 * DAY, { maxRelativeDays: 30 })).toBe("Sep 9, 2025");
    expect(rel(5 * HOUR, { maxRelativeDays: 0 })).toBe("5h ago");
  });

  it("never produces NaN text", () => {
    expect(formatRelative("nope", { now: NOW })).toBe("—");
    expect(formatRelative(NaN, { now: NOW })).toBe("—");
    expect(formatRelative(null)).toBe("—");
    expect(formatRelative(undefined, { invalid: "never" })).toBe("never");
    expect(formatRelative(NOW, { now: "garbage" })).toBe("—");
    expect(formatRelative(Date.now() - 2 * HOUR)).toBe("2h ago");
  });

  it("uses Intl.RelativeTimeFormat for non-English locales", () => {
    expect(rel(5 * MIN, { locale: "de-DE" })).toBe("vor 5 Min.");
    expect(rel(1 * DAY, { locale: "de-DE", style: "long" })).toBe("gestern");
    expect(rel(10 * SEC, { locale: "de-DE" })).toBe("jetzt");
    expect(rel(-2 * HOUR, { locale: "de-DE", future: true, style: "long" })).toBe("in 2 Stunden");
    expect(rel(5 * MIN, { locale: "en-GB" })).toBe("5m ago");
    expect(rel(5 * MIN, { locale: "zz-invalid-%%" })).toBe("5m ago");
  });
});

describe("absolute date/time formats", () => {
  const at941 = new Date(2026, 9, 14, 9, 41, 5);

  it("formatClockTime", () => {
    expect(formatClockTime(at941, { locale: "en-US" })).toMatch(/^9:41\sAM$/);
    expect(formatClockTime(at941, { locale: "en-US", seconds: true })).toMatch(/^9:41:05\sAM$/);
    expect(formatClockTime(at941, { locale: "en-US", hour12: false })).toBe("09:41");
    expect(formatClockTime(at941, { locale: "de-DE" })).toBe("9:41");
    expect(formatClockTime("bad")).toBe("—");
    expect(formatClockTime(undefined, { invalid: "" })).toBe("");
  });

  it("formatShortDate", () => {
    const d = new Date(2026, 2, 5);
    expect(formatShortDate(d, { locale: "en-US", now: NOW })).toBe("Mar 5");
    expect(formatShortDate(d, { locale: "en-US", now: NOW, year: "always" })).toBe("Mar 5, 2026");
    expect(formatShortDate(new Date(2024, 2, 5), { locale: "en-US", now: NOW })).toBe("Mar 5, 2024");
    expect(formatShortDate(new Date(2024, 2, 5), { locale: "en-US", now: NOW, year: "never" })).toBe("Mar 5");
    expect(formatShortDate(d, { locale: "en-US", now: NOW, weekday: true })).toBe("Thu, Mar 5");
    expect(formatShortDate(d, { locale: "de-DE", now: NOW })).toBe("5. März");
    expect(formatShortDate("2026-03-05", { locale: "en-US", now: NOW })).toBe("Mar 5");
    expect(formatShortDate("nope")).toBe("—");
  });

  it("formatDateTime", () => {
    expect(formatDateTime(new Date(2026, 2, 5, 9, 41), { locale: "en-US", now: NOW })).toMatch(/^Mar 5, 9:41\sAM$/);
    expect(formatDateTime(new Date(2024, 2, 5, 9, 41), { locale: "en-US", now: NOW })).toMatch(/2024/);
    expect(formatDateTime(NaN)).toBe("—");
  });

  it("formatDayLabel uses calendar days", () => {
    const o = { now: NOW, locale: "en-US" };
    expect(formatDayLabel(new Date(2026, 9, 14, 0, 5), o)).toBe("Today");
    expect(formatDayLabel(new Date(2026, 9, 13, 23, 59), o)).toBe("Yesterday");
    expect(formatDayLabel(new Date(2026, 9, 15, 8), o)).toBe("Tomorrow");
    expect(formatDayLabel(new Date(2026, 9, 15, 8), { ...o, tomorrow: false })).toBe("Oct 15");
    expect(formatDayLabel(new Date(2026, 9, 12), o)).toBe("Mon");
    expect(formatDayLabel(new Date(2026, 9, 12), { ...o, weekdayWithinWeek: false })).toBe("Oct 12");
    expect(formatDayLabel(new Date(2026, 9, 7), o)).toBe("Oct 7");
    expect(formatDayLabel(new Date(2026, 9, 7), { ...o, weekday: true })).toBe("Wed, Oct 7");
    expect(formatDayLabel(new Date(2025, 2, 5), o)).toBe("Mar 5, 2025");
    expect(formatDayLabel(new Date(2026, 9, 14), { now: NOW, locale: "de-DE" })).toBe("Heute");
    expect(formatDayLabel(new Date(2026, 9, 13), { now: NOW, locale: "de-DE" })).toBe("Gestern");
    expect(formatDayLabel("bad", o)).toBe("—");
  });
});

/* ------------------------------------------------------------------ */
/* lib/duration                                                        */
/* ------------------------------------------------------------------ */

describe("lib/duration", () => {
  it("splitDuration", () => {
    expect(splitDuration(DAY + HOUR + MIN + SEC + 1)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1, ms: 1 });
    expect(splitDuration(-5)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 });
    expect(splitDuration(NaN)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 });
    expect(splitDuration(1001, { round: "ceil" })).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 2, ms: 0 });
    expect(splitDuration(59_600, { round: "round" })).toMatchObject({ minutes: 1, seconds: 0 });
  });

  it("formatClock", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3909)).toBe("1:05:09");
    expect(formatClock(65, { padMinutes: true })).toBe("01:05");
    expect(formatClock(3909, { padHours: true })).toBe("01:05:09");
    expect(formatClock(65, { forceHours: true })).toBe("0:01:05");
    expect(formatClock(-5)).toBe("0:00");
    expect(formatClock(-65, { signed: true })).toBe("-1:05");
    expect(formatClock(-0.2, { signed: true })).toBe("0:00");
    expect(formatClock(NaN)).toBe("0:00");
    expect(formatClock(Infinity, { invalid: "--:--" })).toBe("--:--");
    expect(formatClock(59.9)).toBe("0:59");
    expect(formatClock(59.1, { round: "ceil" })).toBe("1:00");
    expect(formatClock(3599.6, { round: "round" })).toBe("1:00:00");
    expect(formatClock(65.376, { fractionDigits: 2 })).toBe("1:05.37");
    expect(formatClock(59.999, { fractionDigits: 2, round: "round" })).toBe("1:00.00");
  });

  it("formatCountdown rounds up", () => {
    expect(formatCountdown(61_000)).toBe("1:01");
    expect(formatCountdown(60_001)).toBe("1:01");
    expect(formatCountdown(999)).toBe("0:01");
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-100)).toBe("0:00");
    expect(formatCountdown(NaN)).toBe("0:00");
    expect(formatCountdown(3_600_000, { padMinutes: true })).toBe("1:00:00");
  });

  it("formatDuration rounds once to the smallest shown unit", () => {
    expect(formatDuration(119_600)).toBe("2m 0s");
    expect(formatDuration(119_600, { keepZeros: false })).toBe("2m");
    expect(formatDuration(119_600, { round: "floor" })).toBe("1m 59s");
    expect(formatDuration(59_600)).toBe("1m 0s");
    expect(formatDuration(3_599_600)).toBe("1h 0m");
    expect(formatDuration(59.6 * MIN)).toBe("59m 36s");
    expect(formatDuration(59.6 * MIN, { units: 1 })).toBe("1h");
    expect(formatDuration(86_399_600)).toBe("1d 0h");
    expect(formatDuration(3_725_000)).toBe("1h 2m");
    expect(formatDuration(3_725_000, { units: 3 })).toBe("1h 2m 5s");
    expect(formatDuration(3_725_000, { units: 1 })).toBe("1h");
    expect(formatDuration(90_000_000)).toBe("1d 1h");
    expect(formatDuration(5_000)).toBe("5s");
    expect(formatDuration(0)).toBe("0s");
  });

  it("formatDuration options", () => {
    expect(formatDuration(185_000, { pad: true })).toBe("3m 05s");
    expect(formatDuration(3_780_000, { pad: true })).toBe("1h 03m");
    expect(formatDuration(850, { ms: true })).toBe("850ms");
    expect(formatDuration(850, { ms: true, space: true })).toBe("850 ms");
    expect(formatDuration(999.6, { ms: true })).toBe("1s");
    expect(formatDuration(1_500, { decimals: 1 })).toBe("1.5s");
    expect(formatDuration(9_960, { decimals: 1 })).toBe("10s");
    expect(formatDuration(1_000, { decimals: 1, trimZeros: false })).toBe("1.0s");
    expect(formatDuration(1_234, { ms: true, space: true, decimals: 2, decimalsBelow: 60_000 })).toBe("1.23 s");
    expect(formatDuration(1_500, { decimals: 1, locale: "de-DE" })).toBe("1,5s");
    expect(formatDuration(5_400_000, { maxUnit: "m", units: 1 })).toBe("90m");
    expect(formatDuration(330_000, { minUnit: "m" })).toBe("6m");
    expect(formatDuration(300, { zero: "<1s" })).toBe("<1s");
    expect(formatDuration(300, { ms: true, zero: "<1s" })).toBe("300ms");
    expect(formatDuration(-65_000)).toBe("0s");
    expect(formatDuration(-65_000, { signed: true })).toBe("-1m 5s");
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(Infinity, { invalid: "n/a" })).toBe("n/a");
    expect(formatDuration(3_600_000, { keepZeros: false, units: 3 })).toBe("1h");
    expect(formatDuration(3_605_000, { keepZeros: false, units: 3 })).toBe("1h 5s");
  });
});

/* ------------------------------------------------------------------ */
/* lib/format                                                          */
/* ------------------------------------------------------------------ */

describe("lib/format", () => {
  it("formatBytes handles boundaries and junk", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023.99)).toBe("1 KB");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1_048_575)).toBe("1 MB");
    expect(formatBytes(1_048_576)).toBe("1 MB");
    expect(formatBytes(1_234_567, { decimals: 2 })).toBe("1.18 MB");
    expect(formatBytes(16_252_928, { wholeAbove: 10 })).toBe("16 MB");
    expect(formatBytes(2048, { trimZeros: false })).toBe("2.0 KB");
    expect(formatBytes(1500, { base: 1000 })).toBe("1.5 KB");
    expect(formatBytes(1536, { locale: "de-DE" })).toBe("1,5 KB");
    expect(formatBytes(1536, { space: false })).toBe("1.5KB");
    expect(formatBytes(-2048)).toBe("-2 KB");
    expect(formatBytes(0.4)).toBe("0 B");
    expect(formatBytes(1e30)).toMatch(/ EB$/);
    for (const bad of [NaN, Infinity, undefined, null, "abc" as unknown as number]) expect(formatBytes(bad)).toBe("—");
    expect(formatBytes(NaN, { invalid: "?" })).toBe("?");
    expect(formatBytes(1e30)).not.toMatch(/undefined|NaN/);
  });

  it("formatCompact rounds before picking the unit", () => {
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(999.5)).toBe("1k");
    expect(formatCompact(1000)).toBe("1k");
    expect(formatCompact(1234)).toBe("1.2k");
    expect(formatCompact(999_949)).toBe("999.9k");
    expect(formatCompact(999_950)).toBe("1M");
    expect(formatCompact(1_500_000)).toBe("1.5M");
    expect(formatCompact(2.5e9)).toBe("2.5B");
    expect(formatCompact(1234, { suffixCase: "upper" })).toBe("1.2K");
    expect(formatCompact(1_500_000, { suffixCase: "lower" })).toBe("1.5m");
    expect(formatCompact(123_456, { wholeAbove: 100 })).toBe("123k");
    expect(formatCompact(1234, { decimals: 0 })).toBe("1k");
    expect(formatCompact(1234, { locale: "de-DE" })).toBe("1,2k");
    expect(formatCompact(-1234)).toBe("-1.2k");
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(NaN)).toBe("—");
    expect(formatCompact(1e18)).toBe("1000000T");
  });

  it("formatTokens and formatBadgeCount", () => {
    expect(formatTokens(12_400)).toBe("12.4k");
    expect(formatTokens(1234, { label: true })).toBe("1.2k tokens");
    expect(formatTokens(1, { label: true })).toBe("1 token");
    expect(formatTokens(0, { label: true })).toBe("0 tokens");
    expect(formatTokens(1234, { suffixCase: "upper" })).toBe("1.2K");
    expect(formatTokens(NaN, { label: true })).toBe("—");
    expect([5, 99, 100, 120, -3, NaN, 3.7].map((n) => formatBadgeCount(n))).toEqual(["5", "99", "99+", "99+", "0", "0", "3"]);
    expect(formatBadgeCount(12, 9)).toBe("9+");
  });

  it("formatCost", () => {
    expect(formatCost(1.234)).toBe("$1.23");
    expect(formatCost(0.004)).toBe("<$0.01");
    expect(formatCost(-0.004)).toBe("-<$0.01");
    expect(formatCost(0)).toBe("$0.00");
    expect(formatCost(0.0042, { maxFraction: 4, tiny: 0.0001 })).toBe("$0.0042");
    expect(formatCost(0.004, { tiny: 0 })).toBe("$0.00");
    expect(formatCost(12, { minFraction: 0 })).toBe("$12");
    expect(formatCost(1234.5, { currency: "EUR", locale: "de-DE" })).toBe("1.234,50 €");
    expect(formatCost(NaN)).toBe("—");
    expect(() => formatCost(1, { currency: "not-a-code" })).not.toThrow();
  });

  it("pluralize and formatList", () => {
    expect(pluralize(1, "file")).toBe("file");
    expect(pluralize(2, "file")).toBe("files");
    expect(pluralize(0, "child", "children")).toBe("children");
    expect(formatList(["a", "b", "c"], { locale: "en-US" })).toBe("a, b, and c");
    expect(formatList(["a", "b", "c"], { locale: "en-US", type: "disjunction" })).toBe("a, b, or c");
    expect(formatList(["a", "b", "c"], { locale: "de-DE" })).toBe("a, b und c");
    expect(formatList(["a", null, "", "b"], { locale: "en-US" })).toBe("a and b");
    expect(formatList([])).toBe("");
    expect(formatList(null)).toBe("");
  });
});

/* ------------------------------------------------------------------ */
/* lib/hash, lib/text, lib/validate, lib/math, lib/encoding            */
/* ------------------------------------------------------------------ */

describe("lib/hash", () => {
  it("hashString is FNV-1a 32-bit (matches the identity mark)", () => {
    expect(hashString("")).toBe(0x811c9dc5);
    expect(hashString("a")).toBe(0xe40c292c);
    expect(hashString("foobar")).toBe(0xbf9cf968);
    for (const s of ["alice", "user:bob", "😀"]) expect(hashString(s)).toBe(identityHash(s));
  });

  it("seededRandom is deterministic and in [0, 1)", () => {
    const a = seededRandom("seed");
    const b = seededRandom("seed");
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(seededRandom("other")()).not.toBe(xs[0]);
    expect(seededRandom(1)()).toBe(seededRandom("1")());
    expect(mulberry32(NaN)()).toBe(mulberry32(0)());
  });

  it("colorForSeed is stable and uses the chart palette", () => {
    expect(chartColors).toContain(colorForSeed("alice"));
    expect(colorForSeed("alice")).toBe(colorForSeed("alice"));
    expect(colorForSeed("alice", ["red", "blue"])).toMatch(/^(red|blue)$/);
    expect(chartColors).toContain(colorForSeed("alice", []));
    expect(pickForSeed("x", [])).toBeUndefined();
    const colors = new Set(Array.from({ length: 40 }, (_, i) => colorForSeed(`user-${i}`)));
    expect(colors.size).toBeGreaterThan(3);
  });
});

describe("lib/text", () => {
  it("escapeRegExp", () => {
    expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c");
    const re = new RegExp(escapeRegExp("(x)[y]{2}+?^$|\\"));
    expect(re.test("(x)[y]{2}+?^$|\\")).toBe(true);
    expect(() => new RegExp(escapeRegExp("a-b/c"), "u")).not.toThrow();
  });

  it("matchRanges", () => {
    expect(matchRanges("Hello hello", "hello")).toEqual([
      [0, 5],
      [6, 11],
    ]);
    expect(matchRanges("Hello hello", "hello", { all: false })).toEqual([[0, 5]]);
    expect(matchRanges("Hello hello", "hello", { caseSensitive: true })).toEqual([[6, 11]]);
    expect(matchRanges("bar foo baz", "foo bar", { words: true })).toEqual([
      [0, 3],
      [4, 7],
    ]);
    expect(matchRanges("abc", "ab bc", { words: true })).toEqual([[0, 3]]);
    expect(matchRanges("abc a.c", "a.c")).toEqual([[4, 7]]);
    expect(matchRanges("aaa", "aa")).toEqual([[0, 2]]);
    expect(matchRanges("text", "  ")).toEqual([]);
    expect(matchRanges("", "x")).toEqual([]);
    expect(matchRanges("ÉCOLE école", "école")).toEqual([
      [0, 5],
      [6, 11],
    ]);
  });

  it("slugify", () => {
    expect(slugify("Héllo, World!")).toBe("hello-world");
    expect(slugify("  --a__b--  ")).toBe("a-b");
    expect(slugify("日本語 テスト", { unicode: true })).toBe("日本語-テスト");
    expect(slugify("日本語")).toBe("");
    expect(slugify("!!!", { fallback: "item" })).toBe("item");
    expect(slugify("Hello World", { separator: "_" })).toBe("hello_world");
    expect(slugify("one two three", { maxLength: 8 })).toBe("one-two");
    expect(slugify(null as unknown as string)).toBe("");
  });

  it("initials are Unicode and emoji safe", () => {
    expect(initials("Maya Patel")).toBe("MP");
    expect(initials("maya")).toBe("M");
    expect(initials("maya", { singleWord: 2 })).toBe("MA");
    expect(initials("Maya Anne Patel")).toBe("MP");
    expect(initials("Maya Anne Patel", { mode: "first-two" })).toBe("MA");
    expect(initials("Maya Anne Patel", { max: 3 })).toBe("MAP");
    expect(initials("Maya Patel", { max: 1 })).toBe("M");
    expect(initials("Émile zola")).toBe("ÉZ");
    expect(initials("李 小龙")).toBe("李小");
    expect(initials("👩‍💻 dev")).toBe("👩‍💻D");
    expect(initials("  ", { fallback: "?" })).toBe("?");
    expect(initials(null)).toBe("");
    expect(initials("maya patel", { uppercase: false })).toBe("mp");
    expect(graphemes("é👍🏽")).toHaveLength(2);
  });

  it("capitalize and truncateMiddle", () => {
    expect(capitalize("élan")).toBe("Élan");
    expect(capitalize("")).toBe("");
    expect(truncateMiddle("abcdefghij", 5)).toBe("ab…ij");
    expect(truncateMiddle("abcdefghij", 6)).toBe("abc…ij");
    expect(truncateMiddle("short", 10)).toBe("short");
    expect(truncateMiddle("abcdef", 0)).toBe("");
    expect(truncateMiddle("abcdef", 1)).toBe("a");
    expect(truncateMiddle("😀😀😀😀😀😀", 3)).toBe("😀…😀");
    expect(truncateMiddle("abcdefghij", 7, "...")).toBe("ab...ij");
  });
});

describe("lib/validate", () => {
  it("isEmail (shared with the blocks)", () => {
    expect(isEmail(" maya@sutra.app ")).toBe(true);
    expect(isEmail("maya@sutra")).toBe(false);
    expect(isEmail("a b@c.d")).toBe(false);
    expect(isEmail(null)).toBe(false);
    expect(blockIsEmail).toBe(isEmail);
  });

  it("isHttpUrl", () => {
    expect(isHttpUrl("https://x.com/a?b")).toBe(true);
    expect(isHttpUrl(" http://localhost:3000 ")).toBe(true);
    expect(isHttpUrl("http://x.com", { allowHttp: false })).toBe(false);
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "github.com", "ftp://x.com", "", "https://", null]) {
      expect(isHttpUrl(bad)).toBe(false);
    }
  });

  it("hostnameOf", () => {
    expect(hostnameOf("https://www.github.com/x")).toBe("github.com");
    expect(hostnameOf("github.com/org/repo")).toBe("github.com");
    expect(hostnameOf("WWW.Example.COM")).toBe("example.com");
    expect(hostnameOf("localhost:3000")).toBe("localhost");
    expect(hostnameOf("localhost:3000/path", { port: true })).toBe("localhost:3000");
    expect(hostnameOf("//cdn.x.com/a")).toBe("cdn.x.com");
    expect(hostnameOf("https://www.x.com", { stripWww: false })).toBe("www.x.com");
    expect(hostnameOf("mailto:a@b.co")).toBe("");
    expect(hostnameOf("javascript:alert(1)")).toBe("");
    expect(hostnameOf("not a url")).toBe("");
    expect(hostnameOf("")).toBe("");
    expect(hostnameOf(undefined)).toBe("");
  });

  it("isSafeHref", () => {
    for (const ok of ["https://x.com", "http://x", "/path", "#a", "?q=1", "./a:b", "docs/page", "mailto:a@b.co", "tel:+1", "//x.com"]) {
      expect(isSafeHref(ok)).toBe(true);
    }
    for (const bad of ["javascript:alert(1)", " JavaScript:alert(1)", "java\tscript:x", "java\nscript:x", "data:text/html,x", "vbscript:x", "file:///etc", "", null]) {
      expect(isSafeHref(bad)).toBe(false);
    }
  });
});

describe("lib/math", () => {
  it("clamp", () => {
    expect([clamp(5, 0, 10), clamp(-1, 0, 10), clamp(11, 0, 10), clamp(NaN, 0, 10), clamp(5, 10, 0)]).toEqual([5, 0, 10, 0, 5]);
    expect(clamp(Infinity, 0, 1)).toBe(1);
  });

  it("toPercent", () => {
    expect(toPercent(50, 200)).toBe(25);
    expect(toPercent(250, 200)).toBe(100);
    expect(toPercent(-5, 100)).toBe(0);
    expect(toPercent(5, 0)).toBe(0);
    expect(toPercent(NaN, 100)).toBe(0);
    expect(toPercent(15, 20, 10)).toBe(50);
  });

  it("roundTo", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(-1.005, 2)).toBe(-1.01);
    expect(roundTo(2.5)).toBe(3);
    expect(roundTo(-2.5)).toBe(-3);
    expect(roundTo(1.23456, 3)).toBe(1.235);
    expect(roundTo(1.29, 1, "floor")).toBe(1.2);
    expect(roundTo(-1.21, 1, "floor")).toBe(-1.3);
    expect(roundTo(1.21, 1, "ceil")).toBe(1.3);
    expect(roundTo(1e-7, 2)).toBe(0);
    expect(roundTo(1e21, 2)).toBe(1e21);
    expect(Object.is(roundTo(-0.001, 2), 0)).toBe(true);
    expect(roundTo(NaN, 2)).toBeNaN();
  });
});

describe("lib/encoding", () => {
  it("base64url is UTF-8 safe and matches kunji", () => {
    expect(base64UrlEncode("hello")).toBe("aGVsbG8");
    expect(base64UrlEncode(new Uint8Array([251, 255]))).toBe("-_8");
    for (const s of ["", "hello", "ä€😀 kunji", "a".repeat(100_000)]) {
      expect(base64UrlDecode(base64UrlEncode(s))).toBe(s);
      expect(base64UrlEncode(s)).toBe(kunjiBase64Url(s));
    }
    expect(base64UrlDecode("aGVsbG8=")).toBe("hello");
    expect(base64UrlDecode("+/8")).toBeNull(); // bytes 251 255 are not valid UTF-8
    expect(base64UrlDecodeBytes("+/8")).toEqual(new Uint8Array([251, 255]));
    expect(base64UrlDecode("***")).toBeNull();
    expect(base64UrlDecode("a")).toBeNull();
    expect(base64UrlDecode(undefined as unknown as string)).toBeNull();
  });

  it("base32 is lenient and agrees with the TOTP decoder", () => {
    const foobar = Array.from("foobar", (c) => c.charCodeAt(0));
    expect(base32Encode("foobar")).toBe("MZXW6YTBOI");
    expect(Array.from(base32Decode("mzxw 6ytb-oi======")!)).toEqual(foobar);
    expect(base32Decode("JBSWY3DPEHPK3PXP")).toEqual(totpBase32Decode("JBSWY3DPEHPK3PXP"));
    expect(base32Decode("")).toEqual(new Uint8Array());
    expect(base32Decode("ABC1")).toBeNull();
    expect(() => totpBase32Decode("ABC1")).toThrow();
    const bytes = new Uint8Array(Array.from({ length: 64 }, (_, i) => (i * 37) & 255));
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });
});

describe("barrels", () => {
  it("exports the shared helpers from the root and @sutra/ui/tokens", () => {
    for (const name of ["formatRelative", "formatDuration", "formatCompact", "hashString", "initials", "isSafeHref", "clamp", "base64UrlEncode", "useNow", "useMediaQuery", "useAsyncAction", "useSafeId", "CopyButton", "CopyField", "toValidDate"]) {
      expect(root).toHaveProperty(name);
    }
    expect(tokensEntry.formatBytes).toBe(formatBytes);
    expect(tokensEntry.splitDuration).toBe(splitDuration);
    expect(tokensEntry.base32Decode).toBe(base32Decode);
    // Root keeps the older component bindings for these three names.
    expect(root.base32Decode).toBe(totpBase32Decode);
  });
});

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

describe("useNow / useCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("useNow ticks while active and freezes when fixed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const { result, rerender } = renderHook((p: { active?: boolean }) => useNow({ interval: 1000, ...p }), {
      initialProps: {},
    });
    expect(result.current).toBe(NOW);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(NOW + 1000);
    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(NOW + 1000);
    rerender({ active: true });
    expect(result.current).toBe(NOW + 6000);

    const fixed = renderHook(() => useNow({ fixed: "2024-03-05" }));
    expect(fixed.result.current).toBe(new Date(2024, 2, 5).getTime());
  });

  it("useCountdown counts from the wall clock and expires once", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdown(NOW + 3000, { onExpire }));
    expect(result.current).toEqual({ remainingMs: 3000, expired: false });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remainingMs).toBe(2000);
    expect(formatCountdown(result.current.remainingMs)).toBe("0:02");
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toEqual({ remainingMs: 0, expired: true });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("useCountdown handles past and missing deadlines", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const onExpire = vi.fn();
    const past = renderHook(() => useCountdown(NOW - 10, { onExpire }));
    expect(past.result.current.expired).toBe(true);
    expect(onExpire).toHaveBeenCalledTimes(1);
    const none = renderHook(() => useCountdown(undefined));
    expect(none.result.current).toEqual({ remainingMs: 0, expired: false });
    const bad = renderHook(() => useCountdown("garbage"));
    expect(bad.result.current).toEqual({ remainingMs: 0, expired: false });
  });
});

/** A controllable `matchMedia` mock. */
function mockMatchMedia(initial: boolean, { legacy = false } = {}) {
  const listeners = new Set<() => void>();
  const queries: string[] = [];
  let matches = initial;
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => {
    queries.push(query);
    const mql = {
      media: query,
      get matches() {
        return matches;
      },
      onchange: null,
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
    } as Record<string, unknown>;
    if (!legacy) {
      mql.addEventListener = (_: string, cb: () => void) => listeners.add(cb);
      mql.removeEventListener = (_: string, cb: () => void) => listeners.delete(cb);
    }
    return mql as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
  return {
    queries,
    listeners,
    set(next: boolean) {
      matches = next;
      act(() => listeners.forEach((cb) => cb()));
    },
    restore() {
      window.matchMedia = original;
    },
  };
}

describe("useMediaQuery", () => {
  it("follows change events and unsubscribes on unmount", () => {
    const mm = mockMatchMedia(false);
    try {
      const { result, unmount } = renderHook(() => useMediaQuery("(min-width: 600px)"));
      expect(result.current).toBe(false);
      mm.set(true);
      expect(result.current).toBe(true);
      mm.set(false);
      expect(result.current).toBe(false);
      unmount();
      expect(mm.listeners.size).toBe(0);
    } finally {
      mm.restore();
    }
  });

  it("falls back to addListener and to defaultValue without matchMedia", () => {
    const mm = mockMatchMedia(true, { legacy: true });
    try {
      const { result } = renderHook(() => useMediaQuery("(x)"));
      expect(result.current).toBe(true);
      mm.set(false);
      expect(result.current).toBe(false);
    } finally {
      mm.restore();
    }
    const original = window.matchMedia;
    // @ts-expect-error simulate an environment without matchMedia
    delete window.matchMedia;
    try {
      expect(renderHook(() => useMediaQuery("(x)", { defaultValue: true })).result.current).toBe(true);
      expect(prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it("usePrefersReducedMotion, prefersReducedMotion and useBreakpoint", () => {
    const mm = mockMatchMedia(true);
    try {
      expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true);
      expect(prefersReducedMotion()).toBe(true);
      expect(renderHook(() => useBreakpoint("md")).result.current).toBe(true);
      expect(mm.queries).toContain("(prefers-reduced-motion: reduce)");
      expect(mm.queries).toContain("(min-width: 768px)");
    } finally {
      mm.restore();
    }
  });
});

describe("useResizeObserver / useElementSize", () => {
  let instances: { cb: ResizeObserverCallback; targets: Element[]; disconnected: boolean }[] = [];
  class StubRO {
    record: { cb: ResizeObserverCallback; targets: Element[]; disconnected: boolean };
    constructor(cb: ResizeObserverCallback) {
      this.record = { cb, targets: [], disconnected: false };
      instances.push(this.record);
    }
    observe(el: Element) {
      this.record.targets.push(el);
    }
    unobserve() {}
    disconnect() {
      this.record.disconnected = true;
    }
  }
  const fire = (el: Element) =>
    act(() => {
      for (const r of instances.filter((i) => !i.disconnected && i.targets.includes(el))) {
        r.cb([{ target: el, contentRect: el.getBoundingClientRect() } as unknown as ResizeObserverEntry], {} as ResizeObserver);
      }
    });

  beforeEach(() => {
    instances = [];
    vi.stubGlobal("ResizeObserver", StubRO);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function Probe({ onResize }: { onResize: (e: ResizeObserverEntry) => void }) {
    const ref = React.useRef<HTMLDivElement>(null);
    useResizeObserver(ref, onResize);
    const size = useElementSize(ref);
    const width = useElementWidth(ref);
    return (
      <div ref={ref} data-testid="box">
        {size.width}x{size.height}/{width}
      </div>
    );
  }

  it("reports resizes and disconnects on unmount", () => {
    const onResize = vi.fn();
    const { unmount } = render(<Probe onResize={onResize} />);
    const box = screen.getByTestId("box");
    expect(box).toHaveTextContent("0x0/0");
    box.getBoundingClientRect = () => ({ width: 120, height: 40, top: 0, left: 0, right: 120, bottom: 40, x: 0, y: 0, toJSON() {} }) as DOMRect;
    fire(box);
    expect(onResize).toHaveBeenCalled();
    expect(box).toHaveTextContent("120x40/120");
    unmount();
    expect(instances.every((i) => i.disconnected)).toBe(true);
  });

  it("is a no-op without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    expect(() => render(<Probe onResize={() => {}} />)).not.toThrow();
  });
});

describe("useMountedRef / useAsyncAction / useSafeId", () => {
  it("useMountedRef is true after (re)mount under StrictMode and false after unmount", () => {
    const { result, unmount } = renderHook(() => useMountedRef());
    expect(result.current.current).toBe(true);
    const ref = result.current;
    unmount();
    expect(ref.current).toBe(false);
  });

  it("useAsyncAction tracks busy, result and error without rejecting", async () => {
    const onError = vi.fn();
    let fail = false;
    const { result } = renderHook(() =>
      useAsyncAction(
        async (n: number) => {
          await Promise.resolve();
          if (fail) throw new Error("Nope");
          return n * 2;
        },
        { onError }
      )
    );
    let p!: Promise<number | undefined>;
    act(() => {
      p = result.current.run(21);
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      expect(await p).toBe(42);
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();

    fail = true;
    await act(async () => {
      expect(await result.current.run(1)).toBeUndefined();
    });
    expect(result.current.error).toBe("Nope");
    expect(result.current.cause).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(1);
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
    act(() => result.current.setError("Fill in the form"));
    expect(result.current.error).toBe("Fill in the form");
  });

  it("useAsyncAction catches synchronous throws and non-Error values", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(
        (): number => {
          throw "plain string";
        },
        { fallbackMessage: "fallback" }
      )
    );
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error).toBe("plain string");
    expect(errorMessage({})).toBe("Something went wrong. Please try again.");
    expect(errorMessage(new Error(""), "fb")).toBe("fb");
  });

  it("useAsyncAction ignores superseded runs", async () => {
    const resolvers: ((v: string) => void)[] = [];
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useAsyncAction((_label: string) => new Promise<string>((r) => resolvers.push(r)), { onSuccess })
    );
    let first!: Promise<string | undefined>;
    let second!: Promise<string | undefined>;
    act(() => {
      first = result.current.run("a");
      second = result.current.run("b");
    });
    await act(async () => {
      resolvers[1]!("B");
      expect(await second).toBe("B");
    });
    expect(result.current.busy).toBe(false);
    await act(async () => {
      resolvers[0]!("A");
      expect(await first).toBeUndefined();
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith("B");
  });

  it("useAsyncAction drops results after unmount", async () => {
    let reject!: (e: unknown) => void;
    const onError = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAsyncAction(() => new Promise<void>((_, rj) => (reject = rj)), { onError })
    );
    let p!: Promise<void | undefined>;
    act(() => {
      p = result.current.run();
    });
    unmount();
    reject(new Error("late"));
    await expect(p).resolves.toBeUndefined();
    expect(onError).not.toHaveBeenCalled();
  });

  it("the blocks wrapper keeps its run(fn) → boolean contract", async () => {
    const { result } = renderHook(() => useBlockAsyncAction());
    await act(async () => {
      expect(await result.current.run()).toBe(true);
      expect(await result.current.run(async () => {})).toBe(true);
    });
    await act(async () => {
      expect(
        await result.current.run(() => {
          throw new Error("Bad code");
        })
      ).toBe(false);
    });
    expect(result.current.error).toBe("Bad code");
    expect(renderHook(() => useBlockAsyncAction(true)).result.current.busy).toBe(true);
  });

  it("useSafeId and useIsoLayoutEffect", () => {
    const { result } = renderHook(() => [useSafeId("grad"), useSafeId(), useSafeId("9 bad id!")]);
    const [a, b, c] = result.current;
    for (const id of [a, b, c]) expect(id).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
    expect(a).toMatch(/^grad-/);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(useIsoLayoutEffect).toBe(React.useLayoutEffect);
  });
});

/* ------------------------------------------------------------------ */
/* CopyButton / CopyField                                              */
/* ------------------------------------------------------------------ */

describe("CopyButton / CopyField", () => {
  let writeText: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  const flush = () => act(async () => {});

  it("copies, swaps its label and announces", async () => {
    const onCopied = vi.fn();
    const { container } = render(<CopyButton value="abc" onCopied={onCopied} />);
    const button = screen.getByRole("button", { name: "Copy" });
    expect(button.querySelectorAll("svg[aria-hidden]")).toHaveLength(2);
    fireEvent.click(button);
    await flush();
    expect(writeText).toHaveBeenCalledWith("abc");
    expect(onCopied).toHaveBeenCalledWith("abc");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveAttribute("data-copied");
    expect(container).toHaveTextContent("Copied to clipboard");
    expect(container.querySelector("[aria-live=polite]")).toHaveTextContent("Copied to clipboard");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("reads a function value at click time and supports text variants", async () => {
    let n = 0;
    render(<CopyButton value={() => `v${++n}`} variant="button" label="Copy link" copiedLabel="Link copied" />);
    const button = screen.getByRole("button", { name: "Copy link" });
    expect(button).toHaveTextContent("Copy link");
    expect(n).toBe(0);
    fireEvent.click(button);
    await flush();
    expect(writeText).toHaveBeenCalledWith("v1");
    expect(button).toHaveTextContent("Link copied");
  });

  it("does not show Copied when the write fails or the click is prevented", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const { container } = render(<CopyButton value="x" />);
    fireEvent.click(screen.getByRole("button"));
    await flush();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Copied to clipboard");

    writeText.mockResolvedValue(undefined);
    writeText.mockClear();
    render(<CopyButton value="y" label="Prevented" onClick={(e) => e.preventDefault()} />);
    fireEvent.click(screen.getByRole("button", { name: "Prevented" }));
    await flush();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("CopyField copies the value, not the prefix", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <div>
        <CopyField ref={ref} value="npm i @sutra/ui" prefix="$" label="install command" />
        <CopyField value="sk-123" variant="chip" mono={false} truncate={false} />
      </div>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(screen.getByRole("group", { name: "install command" })).toHaveTextContent("$npm i @sutra/ui");
    expect(screen.getByText("npm i @sutra/ui").tagName).toBe("CODE");
    expect(screen.getByText("sk-123").tagName).toBe("SPAN");
    fireEvent.click(screen.getByRole("button", { name: "Copy install command" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith("npm i @sutra/ui");
    expect(await axeViolations(container)).toEqual([]);
  });
});
