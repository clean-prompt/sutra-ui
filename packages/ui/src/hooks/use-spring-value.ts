import * as React from "react";
import { createSpring, springs, type SpringConfig, type SpringHandle, type SpringName } from "../lib/spring";
import { useLatestRef } from "./use-iso-layout-effect";
import { prefersReducedMotion, usePrefersReducedMotion } from "./use-media-query";

/** Options for `useSpringValue`: spring config (a preset name or physics), the starting value and an update callback. */
export interface UseSpringValueOptions {
  /** A named spring (`"gentle"`, `"snappy"`, `"bouncy"`) or a physical config. Default `"gentle"`. */
  config?: SpringConfig | SpringName;
  /** Where the value starts. Default: the first target, so nothing animates on mount. */
  initial?: number;
  /** Called with every frame. With it the hook never re-renders: write the value to a ref, a style or a CSS variable. */
  onUpdate?: (value: number) => void;
}

/**
 * A number that springs toward `target` for values CSS cannot animate (a count-up, a gauge angle, a value fed to a canvas).
 * Prefer CSS (`transition-spring`) for anything a transition can do. It returns the current value (one render per frame
 * while it moves, none at rest); with `onUpdate` it returns nothing and does not re-render. Retargeting mid-flight keeps the
 * velocity. Under `prefers-reduced-motion` it jumps straight to the target. The frame loop stops at rest and on unmount.
 */
export function useSpringValue(target: number, options: UseSpringValueOptions & { onUpdate: (value: number) => void }): void;
export function useSpringValue(target: number, options?: Omit<UseSpringValueOptions, "onUpdate">): number;
export function useSpringValue(target: number, { config = "gentle", initial, onUpdate }: UseSpringValueOptions = {}): number | void {
  const physics: SpringConfig = typeof config === "string" ? springs[config] : config;
  const { stiffness, damping, mass = 1 } = physics;
  const [value, setValue] = React.useState(initial ?? target);
  const last = React.useRef(initial ?? target);
  const handle = React.useRef<SpringHandle | null>(null);
  const report = useLatestRef(onUpdate);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const spring = createSpring(
      { stiffness, damping, mass },
      (v) => {
        last.current = v;
        if (report.current) report.current(v);
        else setValue(v);
      },
      last.current
    );
    handle.current = spring;
    return () => {
      spring.stop();
      handle.current = null;
    };
  }, [stiffness, damping, mass, report]);

  React.useEffect(() => {
    const spring = handle.current;
    if (!spring || spring.value === target) return;
    if (prefersReducedMotion()) spring.set(target);
    else spring.to(target);
  }, [target, stiffness, damping, mass]);

  if (!onUpdate) return reduced ? target : value;
}
