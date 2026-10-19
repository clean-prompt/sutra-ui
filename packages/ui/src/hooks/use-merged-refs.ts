import * as React from "react";
import { mergeRefs } from "../lib/refs";

/** `mergeRefs` with a stable identity while the refs themselves don't change (avoids ref churn on every render). */
export function useMergedRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => mergeRefs(...refs), refs);
}
