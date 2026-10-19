import * as React from "react";
import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./use-media-query";

export interface ViewTransitionOptions {
  /** Transition types, matched in CSS by `:root:active-view-transition-type(name)` (ignored where unsupported). */
  types?: string[];
  /** Run the update with no transition. Default: the user prefers reduced motion. */
  skip?: boolean;
}

interface TransitionLike {
  finished: Promise<unknown>;
  ready: Promise<unknown>;
}
type StartTransition = (arg: (() => void) | { update: () => void; types: string[] }) => TransitionLike;

/** Whether `document.startViewTransition` exists (Chrome 111, Safari 18, Firefox 144). False on the server. */
export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof (document as { startViewTransition?: unknown }).startViewTransition === "function";
}

/**
 * Runs `update` inside `document.startViewTransition`, with `flushSync` so React has committed when the browser takes
 * the new snapshot. Without support, or under reduced motion (or `skip`), it just runs the update. The promise settles
 * when the transition has finished (or at once when there is none) and rejects only if `update` throws.
 */
export function runViewTransition(update: () => void, { types, skip = prefersReducedMotion() }: ViewTransitionOptions = {}): Promise<void> {
  if (skip || !supportsViewTransitions()) {
    update();
    return Promise.resolve();
  }
  const start = document.startViewTransition.bind(document) as StartTransition;
  const run = () => flushSync(update);
  const typed = types?.length && typeof ViewTransition !== "undefined" && "types" in ViewTransition.prototype;
  const transition = typed ? start({ update: run, types }) : start(run);
  transition.ready.catch(() => {}); // a skipped transition rejects `ready`; the update still ran
  return transition.finished.then(() => undefined);
}

/**
 * Returns `(update, options?) => Promise<void>` that applies a state change as a view transition: the browser
 * snapshots the page, React commits, and elements that share a `viewTransitionName` morph between the two states.
 * Use it for navigations and big swaps (list to detail, tab to tab), not for hovers or short lists (`useFlip`).
 * It snapshots the whole viewport and the page ignores input until it ends (a few hundred ms), so keep updates
 * quick. No support or reduced motion: the update just runs.
 */
export function useViewTransition(): typeof runViewTransition {
  return React.useCallback((update, options) => runViewTransition(update, options), []);
}

/** `[A-Za-z0-9-]` pass through; anything else becomes `_<hex>_`, so two different ids never share a name. */
const encode = (id: string) => id.replace(/[^A-Za-z0-9-]/g, (c) => `_${c.codePointAt(0)!.toString(16)}_`);

/**
 * Style for a shared element: a stable `view-transition-name` made from an entity id (`sutra-` + the id, escaped to a
 * valid identifier), and optionally a `view-transition-class` so one CSS rule can style many groups. Names must be
 * unique among the elements on screen at one time: the browser skips the transition on a duplicate.
 */
export function viewTransitionName(id: string | number, viewTransitionClass?: string): React.CSSProperties & { viewTransitionClass?: string } {
  const style: React.CSSProperties & { viewTransitionClass?: string } = { viewTransitionName: `sutra-${encode(String(id))}` };
  if (viewTransitionClass) style.viewTransitionClass = viewTransitionClass;
  return style;
}
