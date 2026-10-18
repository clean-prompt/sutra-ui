import * as React from "react";
import { useNow } from "./use-now";

export interface StopwatchLap {
  /** 1-based lap number. */
  index: number;
  /** Duration of this lap in ms. */
  lap: number;
  /** Total elapsed at the end of this lap in ms. */
  total: number;
}

export interface UseStopwatchOptions {
  /** Refresh interval while running, ms. Default 50. */
  interval?: number;
  autoStart?: boolean;
}

/** Stopwatch state: elapsed ms, running flag, laps and start / pause / lap / reset actions. */
export function useStopwatch({ interval = 50, autoStart = false }: UseStopwatchOptions = {}) {
  const [base, setBase] = React.useState(0);
  const [startedAt, setStartedAt] = React.useState<number | null>(() => (autoStart ? Date.now() : null));
  const [laps, setLaps] = React.useState<StopwatchLap[]>([]);
  const running = startedAt !== null;
  const now = useNow({ active: running, interval });

  const read = () => base + (startedAt !== null ? Date.now() - startedAt : 0);
  const elapsed = base + (startedAt !== null ? Math.max(0, now - startedAt) : 0);

  const start = () => {
    if (running) return;
    setStartedAt(Date.now());
  };
  const pause = () => {
    if (!running) return;
    const total = read();
    setBase(total);
    setStartedAt(null);
  };
  const lap = () => {
    const total = read();
    setLaps((prev) => {
      const last = prev.length ? prev[prev.length - 1]!.total : 0;
      return [...prev, { index: prev.length + 1, lap: total - last, total }];
    });
  };
  const reset = () => {
    setBase(0);
    setStartedAt(null);
    setLaps([]);
  };
  const toggle = () => (running ? pause() : start());

  return { elapsed, running, laps, start, pause, toggle, lap, reset };
}
