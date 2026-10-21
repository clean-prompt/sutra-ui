import type * as React from "react";

/**
 * Writes `value` into a callback or object ref (no-op for `null`/`undefined` refs). Returns what a callback ref returned,
 * so a React 19 cleanup function is not lost; existing callers may ignore it.
 */
export function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null): void | (() => void) {
  if (typeof ref === "function") return ref(value) as void | (() => void);
  if (ref) (ref as React.RefObject<T | null>).current = value;
}

/**
 * One callback ref that writes the node into every given ref (callback or object).
 *
 * React 19 lets a callback ref return a cleanup and then calls the cleanup on detach instead of calling the ref with
 * `null`. When any inner ref returns one, the merged ref returns a cleanup too: it runs those cleanups and clears the
 * other refs (object refs and callbacks without a cleanup) with `null`. When none does, it returns nothing, so React
 * calls the merged ref with `null` as before.
 */
export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (value) => {
    let hasCleanup = false;
    const steps: (() => void)[] = [];
    for (const ref of refs) {
      if (!ref) continue;
      const cleanup = assignRef(ref, value);
      if (typeof cleanup === "function") {
        hasCleanup = true;
        steps.push(cleanup);
      } else steps.push(() => void assignRef(ref, null));
    }
    if (!hasCleanup) return;
    return (() => {
      for (const step of steps) step();
    }) as ReturnType<React.RefCallback<T>>;
  };
}
