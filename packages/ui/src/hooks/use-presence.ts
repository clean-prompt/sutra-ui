import * as React from "react";
import { prefersReducedMotion } from "./use-media-query";

export type PresenceState = "enter" | "idle" | "exit";

export interface PresenceItem<T, K = string> {
  item: T;
  key: K;
  state: PresenceState;
}

export interface UsePresenceOptions {
  /** Milliseconds a removed item stays in the list as `"exit"` (match the exit animation). Default 200, the `--sutra-duration` token. */
  exitDuration?: number;
  /** Treat the items of the first render as new too (they get `"enter"`). Default false: nothing animates on mount. */
  initial?: boolean;
  /**
   * Keep a new item in `"enter"` until it leaves, instead of until the next render. An entrance class that is removed
   * by an unrelated render (a second item arriving 100 ms later) would cut its animation short.
   */
  holdEnter?: boolean;
}

/**
 * Keeps removed items for a moment (state `"exit"`) so they can animate out, and marks new ones `"enter"`. The hook only
 * decides who is rendered and in which state; CSS does the motion (`data-[presence=enter]:animate-pop-in`,
 * `data-[presence=exit]:animate-fade-out`). Rules:
 * - the first render is idle for everyone (unless `initial`), so a list never animates on mount;
 * - a removed item stays where it was for `exitDuration`: it is kept in the same render that removes it (no one-frame
 *   gap), several removals keep their order, and each has its own timer, so a fast update stream cannot strand a row in
 *   `"exit"`; a key that comes back while exiting is a new entrance;
 * - under `prefers-reduced-motion` nothing enters or exits: removal is immediate and there is no `"exit"` state.
 */
export function usePresence<T, K extends string | number = string>(
  items: readonly T[],
  getKey: (item: T) => K,
  { exitDuration = 200, initial = false, holdEnter = false }: UsePresenceOptions = {}
): PresenceItem<T, K>[] {
  const currentKeys = new Set(items.map(getKey));
  const [state, setState] = React.useState(() => ({ items, exiting: new Map<K, T>() }));
  const seen = React.useRef<Set<K> | null>(null);
  const entered = React.useRef(new Set<K>());
  const shown = React.useRef<readonly PresenceItem<T, K>[]>([]);
  const timers = React.useRef(new Map<K, ReturnType<typeof setTimeout>>());
  if (seen.current === null) seen.current = new Set(initial ? [] : currentKeys);

  // Adjust state while rendering (no commit with the row missing): what left since the last items stays as an exiting row.
  let exiting = state.exiting;
  if (state.items !== items) {
    exiting = new Map(exiting);
    for (const key of currentKeys) exiting.delete(key);
    if (!prefersReducedMotion()) {
      for (const item of state.items) if (!currentKeys.has(getKey(item))) exiting.set(getKey(item), item);
    }
    setState({ items, exiting });
  }

  // One timer per exiting key; it outlives later updates and is dropped only when the key comes back.
  React.useEffect(() => {
    const pending = timers.current;
    for (const key of exiting.keys()) {
      if (pending.has(key)) continue;
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key);
          setState((s) => {
            if (!s.exiting.has(key)) return s;
            const next = new Map(s.exiting);
            next.delete(key);
            return { ...s, exiting: next };
          });
        }, exitDuration)
      );
    }
    for (const [key, id] of pending) {
      if (exiting.has(key)) continue;
      clearTimeout(id);
      pending.delete(key);
    }
  }, [exiting, exitDuration]);
  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Keys that are no longer in the list are forgotten, so coming back later is a new entrance.
  React.useEffect(() => {
    const known = seen.current!;
    for (const key of currentKeys) {
      if (holdEnter && !known.has(key)) entered.current.add(key);
      known.add(key);
    }
    for (const key of [...known]) {
      if (currentKeys.has(key)) continue;
      known.delete(key);
      entered.current.delete(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const reduced = prefersReducedMotion();
  const live = items.map((item): PresenceItem<T, K> => {
    const key = getKey(item);
    const isNew = !seen.current!.has(key) || (holdEnter && entered.current.has(key));
    return { item, key, state: isNew && !reduced ? "enter" : "idle" };
  });
  let rows = live;
  if (exiting.size) {
    // An exiting row goes before the row that followed it when it was last shown (or at the end), in its old order.
    const before = new Map<K, PresenceItem<T, K>[]>();
    const placed = new Set<K>();
    let waiting: PresenceItem<T, K>[] = [];
    for (const { key } of shown.current) {
      if (currentKeys.has(key)) {
        if (waiting.length) before.set(key, waiting);
        waiting = [];
      } else if (exiting.has(key)) {
        placed.add(key);
        waiting.push({ item: exiting.get(key)!, key, state: "exit" });
      }
    }
    for (const [key, item] of exiting) if (!placed.has(key)) waiting.push({ item, key, state: "exit" });
    rows = [...live.flatMap((row) => [...(before.get(row.key) ?? []), row]), ...waiting];
  }
  React.useEffect(() => {
    shown.current = rows;
  });
  return rows;
}
