/* Usage pace for rolling quotas (AI plan limits, billing cycles): a linear burn model over a reset window. Pure. */
import { formatDuration } from "./duration";
import { MINUTE_MS, toMs, type TimeInput } from "./time";
import type { Tone } from "./tone";

export type UsagePaceStatus = "under" | "on-pace" | "over";

export interface UsagePaceInput {
  /** Usage so far, in the same units as `limit` (a percentage by default). */
  used: number;
  /** When the current window started. Without it there is no pace (the result is `undefined`). */
  startsAt?: TimeInput | null;
  /** When the window resets. */
  resetsAt?: TimeInput | null;
  /** Reference time in ms. Default `Date.now()`. */
  now?: number;
  /** Size of the quota. Default 100 (so `used` is a percentage). */
  limit?: number;
  /** Half-width of the "on pace" band, in percentage points of the limit. Default 5. */
  tolerance?: number;
}

export interface UsagePace {
  /** `over`: using faster than the window allows; `under`: slower; `on-pace`: within `tolerance` points. */
  status: UsagePaceStatus;
  /** Usage expected by now if the window were used evenly, in the units of `used`. */
  expectedNow: number;
  /** Share of the window that has elapsed, 0–1. */
  elapsed: number;
  /** Projected usage at reset at the current rate, as a fraction of the limit (0.9 = 90%; above 1 runs out). */
  projectedAtReset: number;
  /** Fraction of the limit left over at reset (`1 - projectedAtReset`); negative when it runs out first. */
  spare: number;
  /** When the limit is hit at the current rate (ms), if that is before the reset. Unset once the limit is reached. */
  runsOutAt?: number;
  /** `used` has reached the limit. */
  limitReached: boolean;
  /** The reset time in ms, as resolved from `resetsAt`. */
  resetsAt: number;
}

/**
 * Pace of a quota window: how usage so far compares with an even burn from `startsAt` to `resetsAt`, and where the
 * current rate lands at reset. Returns `undefined` when there is no meaningful pace: no or invalid `startsAt`/`resetsAt`,
 * an empty window, `now` before the start or after the reset (the window has already rolled over), or invalid numbers.
 */
export function usagePace({ used, startsAt, resetsAt, now = Date.now(), limit = 100, tolerance = 5 }: UsagePaceInput): UsagePace | undefined {
  const start = toMs(startsAt);
  const end = toMs(resetsAt);
  if (start === undefined || end === undefined || !Number.isFinite(now)) return undefined;
  if (!Number.isFinite(used) || used < 0 || !Number.isFinite(limit) || limit <= 0) return undefined;
  const windowMs = end - start;
  if (windowMs <= 0 || now <= start || now >= end) return undefined;

  const elapsedMs = now - start;
  const elapsed = elapsedMs / windowMs;
  const expectedNow = limit * elapsed;
  const projectedAtReset = used / limit / elapsed;
  const spare = 1 - projectedAtReset;
  const limitReached = used >= limit;
  const tol = Number.isFinite(tolerance) ? Math.abs(tolerance) : 5;
  const diffPoints = ((used - expectedNow) / limit) * 100;
  const status: UsagePaceStatus = limitReached || diffPoints > tol ? "over" : diffPoints < -tol ? "under" : "on-pace";

  let runsOutAt: number | undefined;
  if (!limitReached && projectedAtReset > 1) {
    const rate = used / elapsedMs;
    runsOutAt = now + (limit - used) / rate;
  }
  return { status, expectedNow, elapsed, projectedAtReset, spare, runsOutAt, limitReached, resetsAt: end };
}

// Rounded up to the minute, then down to the shown units, so "4d" never overstates the time left.
const compactUntil = (ms: number, units: number) =>
  formatDuration(Math.ceil(ms / MINUTE_MS) * MINUTE_MS, { units, minUnit: "m", keepZeros: false, round: "floor" });

/**
 * Time until a reset as a compact duration ("3h 12m", "12d 5h", "4d"), rounded up to the minute and down to the shown units.
 * `undefined` for missing or invalid input; `"0m"` once the time has passed.
 */
export function formatResetsIn(resetsAt: TimeInput | null | undefined, options: { now?: number; units?: number } = {}): string | undefined {
  const t = toMs(resetsAt);
  const now = options.now ?? Date.now();
  if (t === undefined || !Number.isFinite(now)) return undefined;
  return compactUntil(Math.max(0, t - now), options.units ?? 2);
}

export interface UsagePaceDescription {
  /** "On pace · 10% to spare", "Ahead of pace · 25% to spare", "Runs out in 4d at this rate", "Limit reached". */
  text: string;
  /** Suggested status colour: `neutral` with room to spare, `warning` on pace but tight, `destructive` when it runs out. */
  tone: Extract<Tone, "neutral" | "warning" | "destructive">;
}

export interface DescribeUsagePaceOptions {
  /** Reference time in ms for "Runs out in …". Default `Date.now()`. */
  now?: number;
  /** Units in the run-out duration. Default 1 ("4d"). */
  units?: number;
}

/** Short text and tone for a `usagePace()` result. */
export function describeUsagePace(pace: UsagePace, options: DescribeUsagePaceOptions = {}): UsagePaceDescription {
  const now = options.now ?? Date.now();
  const units = options.units ?? 1;
  if (pace.limitReached) return { text: "Limit reached", tone: "destructive" };
  const runsOut = pace.runsOutAt !== undefined ? compactUntil(Math.max(0, pace.runsOutAt - now), units) : undefined;
  const spareText = `${Math.max(0, Math.round(pace.spare * 100))}% to spare`;
  if (pace.status === "over") {
    return { text: runsOut ? `Runs out in ${runsOut} at this rate` : "Over pace", tone: "destructive" };
  }
  if (pace.status === "under") return { text: `Ahead of pace · ${spareText}`, tone: "neutral" };
  if (runsOut && Math.round(pace.spare * 100) < 0) return { text: `On pace · runs out in ${runsOut}`, tone: "warning" };
  return { text: `On pace · ${spareText}`, tone: "neutral" };
}
