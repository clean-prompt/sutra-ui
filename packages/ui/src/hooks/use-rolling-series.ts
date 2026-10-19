import * as React from "react";
import { useLatestRef } from "./use-iso-layout-effect";

/** Keep the last `capacity` items (all of them for `Infinity`, none for 0 or less). */
function keepLast<T>(items: T[], capacity: number): T[] {
  if (!(capacity > 0)) return items.length === 0 ? items : [];
  return items.length > capacity ? items.slice(items.length - Math.floor(capacity)) : items;
}

/** Options for `useRollingSeries`: how many points to keep and the starting data. */
export interface UseRollingSeriesOptions<T> {
  /** How many values to keep; pushing past it drops the oldest. */
  capacity: number;
  /** Starting values (read on the first render; also what `reset()` restores). */
  initial?: T[];
}

/** What `useRollingSeries` returns: the current data and the `push` and `reset` actions. */
export interface RollingSeries<T> {
  /** The kept values, oldest first. */
  data: T[];
  /** Append one value, or several when given an array (oldest first). Stable across renders. */
  push: (value: T | T[]) => void;
  /** Replace the series with `next` (trimmed to capacity), or restore `initial`. Stable across renders. */
  reset: (next?: T[]) => void;
}

/**
 * A fixed-size buffer of the most recent values, for live charts.
 * When `T` is itself an array, wrap single values: `push([value])`.
 */
export function useRollingSeries<T = number>({ capacity, initial }: UseRollingSeriesOptions<T>): RollingSeries<T> {
  const capacityRef = useLatestRef(capacity);
  const [initialValues] = React.useState<T[]>(() => initial ?? []);
  const [values, setValues] = React.useState<T[]>(() => keepLast(initialValues, capacity));

  const push = React.useCallback(
    (value: T | T[]) => {
      const added = Array.isArray(value) ? (value as T[]) : [value];
      if (added.length === 0) return;
      setValues((prev) => keepLast([...prev, ...added], capacityRef.current));
    },
    [capacityRef]
  );

  const reset = React.useCallback(
    (next?: T[]) => setValues(keepLast(next ?? initialValues, capacityRef.current)),
    [capacityRef, initialValues]
  );

  /* A smaller capacity takes effect at once, without waiting for the next push. */
  const data = React.useMemo(() => keepLast(values, capacity), [values, capacity]);
  return React.useMemo(() => ({ data, push, reset }), [data, push, reset]);
}

/** Options for `useSampler`: interval, capacity, enabled switch, starting data and whether to sample immediately. */
export interface UseSamplerOptions<T> {
  /** Milliseconds between samples. */
  interval: number;
  /** How many samples to keep. */
  capacity: number;
  /** Sample only while true. Default true. */
  enabled?: boolean;
  /** Starting values (also what `reset()` restores). */
  initial?: T[];
  /** Take a sample as soon as sampling starts instead of after the first interval. Default false. */
  immediate?: boolean;
}

/**
 * Calls `read` every `interval` ms and keeps the last `capacity` results, for live charts.
 * Pauses while `enabled` is false and stops on unmount. `read` may change between renders without restarting the timer.
 */
export function useSampler<T = number>(
  read: () => T,
  { interval, capacity, enabled = true, initial, immediate = false }: UseSamplerOptions<T>
): RollingSeries<T> {
  const series = useRollingSeries<T>({ capacity, initial });
  const { push } = series;
  const readRef = useLatestRef(read);
  /* Survives StrictMode's simulated remount, so `immediate` doesn't sample twice in a row. */
  const lastSampleAt = React.useRef(Number.NEGATIVE_INFINITY);

  React.useEffect(() => {
    if (!enabled || !(interval > 0) || !Number.isFinite(interval)) return;
    const sample = () => {
      lastSampleAt.current = Date.now();
      push(readRef.current());
    };
    if (immediate && Date.now() - lastSampleAt.current >= interval) sample();
    const id = setInterval(sample, interval);
    return () => clearInterval(id);
  }, [enabled, interval, immediate, push, readRef]);

  return series;
}
