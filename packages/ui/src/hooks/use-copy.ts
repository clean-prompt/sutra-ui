import * as React from "react";
import { useMountedRef } from "./use-mounted-ref";

/** Copy text to the clipboard; `copied` flips true for `timeout` ms. */
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useMountedRef();
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const copy = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        // The write can resolve after unmount: don't start a timer nobody will clear.
        if (!mounted.current) return true;
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), timeout);
        return true;
      } catch {
        return false;
      }
    },
    [timeout, mounted]
  );
  return { copied, copy };
}
