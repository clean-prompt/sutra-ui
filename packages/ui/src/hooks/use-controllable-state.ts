import * as React from "react";

/** State that can be controlled (value + onChange) or uncontrolled (defaultValue). */
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

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      if (!isControlled) setInternal(resolved);
      if (!Object.is(resolved, current)) onChangeRef.current?.(resolved);
    },
    [current, isControlled]
  );

  return [current, setValue] as const;
}
