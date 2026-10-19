import * as React from "react";

/** Style that sets the `--i` position of an item for the `stagger` and `stagger-transition` utilities. */
export type StaggerStyle = React.CSSProperties & { "--i": number; "--sutra-stagger"?: string };

/**
 * The inline style that puts an item at position `index` of a staggered group. Pair it with the `stagger` utility (a
 * delay of `--i` times `--sutra-stagger`, 30 ms, capped at `--sutra-stagger-max` items so long lists do not wait seconds):
 *
 *   <li className="animate-fade-up stagger" style={stagger(i)} />
 *
 * `step` overrides the delay between items (ms) for this item only; pass it to every item of the group. Reduced motion
 * zeroes the token, so the delays vanish with the animations.
 */
export function stagger(index: number, step?: number): StaggerStyle {
  const style: StaggerStyle = { "--i": Math.max(0, Math.floor(index) || 0) };
  if (step !== undefined) style["--sutra-stagger"] = `${step}ms`;
  return style;
}

/** `stagger` with a fixed `step` (ms), as a stable function for a list: `const at = useStagger(20); style={at(i)}`. */
export function useStagger(step?: number): (index: number) => StaggerStyle {
  return React.useCallback((index: number) => stagger(index, step), [step]);
}
