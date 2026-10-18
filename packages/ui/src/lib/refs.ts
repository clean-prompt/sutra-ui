import type * as React from "react";

/** Writes `value` into a callback or object ref (no-op for `null`/`undefined` refs). */
export function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}
