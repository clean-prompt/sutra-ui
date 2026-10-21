import * as React from "react";
import { useIsoLayoutEffect } from "./use-iso-layout-effect";

/** A ref that is true while mounted: set on (re)mount, false after unmount (StrictMode-safe). */
export function useMountedRef(): React.RefObject<boolean> {
  const mounted = React.useRef(false);
  useIsoLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
