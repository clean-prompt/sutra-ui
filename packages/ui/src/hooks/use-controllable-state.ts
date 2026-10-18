import * as React from "react";

/**
 * State that can be controlled (value + onChange) or uncontrolled (defaultValue).
 * Functional updates compose within a tick (`set(v => v + 1)` twice adds 2) and the setter is stable.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}) {
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : internal;

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const isControlledRef = React.useRef(isControlled);
  isControlledRef.current = isControlled;
  /** The value as of the last render. */
  const renderedRef = React.useRef(current);
  renderedRef.current = current;
  /** The latest value, including updates requested since the last render. */
  const latestRef = React.useRef(current);
  latestRef.current = current;

  const setValue = React.useCallback((next: T | ((prev: T) => T)) => {
    const prev = latestRef.current;
    const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
    if (Object.is(resolved, prev)) return;
    latestRef.current = resolved;
    if (isControlledRef.current) {
      // A parent may ignore the change and never re-render; fall back to the rendered value after this tick.
      queueMicrotask(() => {
        latestRef.current = renderedRef.current;
      });
    } else {
      setInternal(resolved);
    }
    onChangeRef.current?.(resolved);
  }, []);

  return [current, setValue] as const;
}
