import * as React from "react";
import { toMs, type DateInput } from "../lib/time";
import { useLatestRef } from "./use-iso-layout-effect";

/** Options for `useNow`: whether it ticks, the interval, and a fixed time for tests and demos. */
export interface UseNowOptions {
  /** Tick only while true. Default true. */
  active?: boolean;
  /** Tick interval in ms. Default 1000. */
  interval?: number;
  /** Freeze the clock at this time (tests, stories, server snapshots). */
  fixed?: DateInput;
}

/** Current time in epoch ms, re-rendering every `interval` ms while `active` (or the `fixed` time). */
export function useNow(options: UseNowOptions = {}): number {
  const { active = true, interval = 1000, fixed } = options;
  const fixedMs = fixed === undefined || fixed === null ? undefined : toMs(fixed);
  const [now, setNow] = React.useState(() => Date.now());
  const step = Number.isFinite(interval) ? Math.max(16, interval) : 1000;
  React.useEffect(() => {
    if (!active || fixedMs !== undefined) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), step);
    return () => clearInterval(id);
  }, [active, step, fixedMs]);
  return fixedMs ?? now;
}

/** Options for `useCountdown`: the tick interval and an expiry callback. */
export interface UseCountdownOptions {
  /** Tick interval in ms. Default 250 (keeps a ceil-rounded seconds display on time). */
  interval?: number;
  /** Called once per deadline when it is reached (also when it is already past on mount). */
  onExpire?: () => void;
}

/** State of a countdown: the milliseconds left and whether it has expired. */
export interface CountdownState {
  /** Milliseconds left (0 once expired or without a deadline). */
  remainingMs: number;
  /** True once a deadline is set and reached. */
  expired: boolean;
}

/** Time left until `deadline`, recomputed from the wall clock on every tick (no drift). */
export function useCountdown(deadline: DateInput, options: UseCountdownOptions = {}): CountdownState {
  const deadlineMs = deadline === undefined || deadline === null ? undefined : toMs(deadline);
  const step = Number.isFinite(options.interval) ? Math.max(16, options.interval!) : 250;
  // `now` is tagged with the deadline it was sampled for, so the first render after a new
  // deadline reads the live clock instead of a stale sample (which overstated the time left).
  const [sample, setSample] = React.useState<{ now: number; for: number | undefined }>(() => ({ now: Date.now(), for: deadlineMs }));
  const onExpire = useLatestRef(options.onExpire);
  const firedFor = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (deadlineMs === undefined) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const t = Date.now();
      setSample({ now: t, for: deadlineMs });
      if (t < deadlineMs) return false;
      if (id !== undefined) clearInterval(id);
      id = undefined;
      if (firedFor.current !== deadlineMs) {
        firedFor.current = deadlineMs;
        onExpire.current?.();
      }
      return true;
    };
    if (!tick()) id = setInterval(tick, step);
    return () => {
      if (id !== undefined) clearInterval(id);
    };
  }, [deadlineMs, step, onExpire]);

  if (deadlineMs === undefined) return { remainingMs: 0, expired: false };
  const now = sample.for === deadlineMs ? sample.now : Date.now();
  const remainingMs = Math.max(0, deadlineMs - now);
  return { remainingMs, expired: remainingMs <= 0 };
}
