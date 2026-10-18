import * as React from "react";

/** `useLayoutEffect` in the browser, `useEffect` on the server (no SSR warning). */
export const useIsoLayoutEffect: typeof React.useLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/** A ref that always holds the latest value (updated before effects run), for stable callbacks. */
export function useLatestRef<T>(value: T): React.RefObject<T> {
  const ref = React.useRef(value);
  useIsoLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
