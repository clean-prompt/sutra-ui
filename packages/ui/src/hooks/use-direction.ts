import * as React from "react";
import { directionOf, type Direction } from "../lib/direction";
import { useIsoLayoutEffect } from "./use-iso-layout-effect";
import { useMergedRefs } from "./use-merged-refs";

/**
 * The direction forced by the nearest `DirectionProvider` that had a `dir` prop (undefined when there is none). Portaled layers
 * read it to carry `dir` into `<body>`, where the subtree's own `dir` attribute does not reach.
 */
export const DirectionContext = React.createContext<Direction | undefined>(undefined);

/** `<html dir>` as a tiny external store: one MutationObserver shared by every `useDirection` caller. */
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribeDocumentDirection(listener: () => void) {
  listeners.add(listener);
  if (!observer && typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    observer = new MutationObserver(() => listeners.forEach((l) => l()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

const getDocumentDirection = (): Direction => directionOf(null);
const getServerDirection = (): Direction => "ltr";

/**
 * The reading direction components should assume: the nearest `DirectionProvider` with a `dir`, else the `dir` of the document
 * (`<html dir>`, followed live), else `"ltr"`. Pass a ref to read the nearest `dir` ancestor of that element instead (a chart
 * pinned to `dir="ltr"` inside an RTL page). The server renders `"ltr"` and the value settles after hydration.
 */
export function useDirection(ref?: React.RefObject<Element | null>): Direction {
  const forced = React.useContext(DirectionContext);
  const documentDir = React.useSyncExternalStore(subscribeDocumentDirection, getDocumentDirection, getServerDirection);
  const [local, setLocal] = React.useState<Direction | null>(null);
  useIsoLayoutEffect(() => {
    if (!ref) return;
    const next = ref.current ? directionOf(ref.current) : null;
    setLocal((prev) => (prev === next ? prev : next));
  }, [ref, documentDir, forced]);
  return (ref ? local : null) ?? forced ?? documentDir;
}

/**
 * For wrappers of Radix roots, which always write a `dir` attribute (ltr when told nothing): the direction in effect where the
 * root sits, read from its parent so that a provider, a `dir` container, an LTR island or `<html dir>` all win in that order.
 * Pass the forwarded ref in and put the returned ref on the root; pass `dir` before the consumer's props.
 */
export function useRootDirection<T extends Element>(forwarded?: React.Ref<T>): { ref: React.RefCallback<T>; dir: Direction } {
  const forced = React.useContext(DirectionContext);
  const documentDir = React.useSyncExternalStore(subscribeDocumentDirection, getDocumentDirection, getServerDirection);
  const node = React.useRef<T | null>(null);
  const [inherited, setInherited] = React.useState<Direction | null>(null);
  const ref = useMergedRefs<T>(node, forwarded);
  useIsoLayoutEffect(() => {
    const parent = node.current?.parentElement;
    const next = parent ? directionOf(parent) : null;
    setInherited((prev) => (prev === next ? prev : next));
  }, [documentDir, forced]);
  return { ref, dir: inherited ?? forced ?? documentDir };
}
