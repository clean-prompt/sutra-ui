import * as React from "react";

/**
 * The last value that `value` had before its current one (`undefined`, or `initial`, until it first changes). It
 * keeps its answer across re-renders where nothing changed, so it is safe for "which way did this move" checks, and it
 * is derived while rendering, so it needs no effect and survives StrictMode remounts.
 */
export function usePrevious<T>(value: T, initial?: T): T | undefined {
  const [state, setState] = React.useState<{ current: T; previous: T | undefined }>({ current: value, previous: initial });
  if (!Object.is(state.current, value)) {
    setState({ current: value, previous: state.current });
    return state.current;
  }
  return state.previous;
}
