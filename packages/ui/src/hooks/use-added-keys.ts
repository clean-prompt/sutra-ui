import * as React from "react";

const NONE: ReadonlySet<string> = new Set();

/**
 * The keys that the latest change of `keys` added: empty on the first render and again after a change that only
 * removed or reordered. Give those items an entrance class so a list animates what is new, never what was already
 * there when it mounted:
 *
 *   const added = useAddedKeys(values);
 *   <li key={v} className={added.has(v) ? "animate-pop" : undefined}>
 *
 * The set stays the same until `keys` changes again, so an item keeps its class (and does not replay) across
 * unrelated renders. It derives the set while rendering (React's "adjust state when a prop changes" pattern), so a
 * new item and its class land in the same commit, and it is safe under StrictMode.
 */
export function useAddedKeys(keys: readonly string[]): ReadonlySet<string> {
  const [state, setState] = React.useState<{ keys: readonly string[]; added: ReadonlySet<string> }>({ keys, added: NONE });
  if (state.keys !== keys && !sameKeys(state.keys, keys)) {
    const before = new Set(state.keys);
    const added = keys.filter((key) => !before.has(key));
    const next = added.length ? new Set(added) : NONE;
    setState({ keys, added: next });
    return next;
  }
  return state.added;
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}
