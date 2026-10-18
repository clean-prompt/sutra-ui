import * as React from "react";

/**
 * For a list prop that is used as the initial value when no change handler is passed: copies a new
 * array into the local state, so live data still shows up (local edits stay until the prop changes).
 * Arrays with the same elements count as unchanged, so an inline literal of stable items is fine.
 */
export function useFollowListProp<T>(prop: readonly T[] | undefined, setLocal: (value: T[]) => void, enabled: boolean) {
  const prev = React.useRef(prop);
  React.useEffect(() => {
    const before = prev.current;
    prev.current = prop;
    if (!enabled || !prop || before === prop) return;
    if (before && before.length === prop.length && before.every((item, i) => Object.is(item, prop[i]))) return;
    setLocal([...prop]);
  }, [prop, enabled, setLocal]);
}
