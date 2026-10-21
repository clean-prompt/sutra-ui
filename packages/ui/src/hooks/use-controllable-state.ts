import * as React from "react";
import { useIsoLayoutEffect } from "./use-iso-layout-effect";

/**
 * State that can be controlled (value + onChange) or uncontrolled (defaultValue).
 * Functional updates compose within a tick (`set(v => v + 1)` twice adds 2) and the setter is stable.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  /** Controlled value; when it is not `undefined` the hook mirrors it and never changes it on its own. */
  value?: T;
  /** Initial value used while the state is uncontrolled. */
  defaultValue: T;
  /** Called with the next value whenever it changes (controlled or not). */
  onChange?: (value: T) => void;
}) {
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : internal;

  // Refs are written in a layout effect, not during render, so a render React discards cannot leave them stale.
  const onChangeRef = React.useRef(onChange);
  const isControlledRef = React.useRef(isControlled);
  /** The value as of the last render. */
  const renderedRef = React.useRef(current);
  /** The latest value, including updates requested since the last render. */
  const latestRef = React.useRef(current);
  useIsoLayoutEffect(() => {
    onChangeRef.current = onChange;
    isControlledRef.current = isControlled;
    renderedRef.current = current;
    latestRef.current = current;
  });

  const setValue = React.useCallback((next: T | ((prev: T) => T)) => {
    const prev = latestRef.current;
    const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
    // Uncontrolled: skip no-op updates. Controlled: only skip when the request matches what the
    // parent last rendered, so repeated requests (e.g. two "close" gestures while the parent keeps
    // `open` true) are each reported, as Radix-style onOpenChange callers expect.
    if (Object.is(resolved, isControlledRef.current ? renderedRef.current : prev)) return;
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
