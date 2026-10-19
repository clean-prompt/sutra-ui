import * as React from "react";

/**
 * A copy of `value` that follows it after it has stopped changing for `delay` ms (default 300). Feed it a search box
 * value and fetch on the debounced one. The first render returns `value` untouched, a pending update is dropped when
 * the component unmounts, and a `delay` of 0 or less updates on the next tick.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), Math.max(0, delay));
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
