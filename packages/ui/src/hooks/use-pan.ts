import * as React from "react";
import type { SpringConfig, SpringName } from "../lib/spring";
import { applyBounds, inertiaStep, INERTIA_FRICTION, INERTIA_REST_SPEED, type DragAxis, type Elastic } from "../lib/gesture";
import { useDrag, type DragBinding, type DragBounds } from "./use-drag";
import { useLatestRef } from "./use-iso-layout-effect";
import { prefersReducedMotion } from "./use-media-query";

export interface UsePanOptions {
  axis?: DragAxis;
  /** Friction per second: the speed decays as `v * exp(-friction * dt)`, so it feels the same at any frame rate. Default 6. */
  friction?: number;
  bounds?: DragBounds;
  /** Pull beyond the bounds while dragging (0..1 factor or a curve). Default 0.4. */
  elastic?: Elastic;
  /** Spring used to settle back inside the bounds and by `to()`. Default "gentle". */
  spring?: SpringConfig | SpringName;
  /** Runs whenever the offset changes. */
  onChange?: (x: number, y: number) => void;
  mouse?: boolean;
  enabled?: boolean;
  allow?: (event: React.PointerEvent<HTMLElement>) => boolean;
}

export type PanBinding = DragBinding & {
  /** Glide to a position with the spring (instant under reduced motion). */
  to: (x: number, y: number) => void;
};

/**
 * Drag with inertia: a release keeps its velocity and slows down with time-based friction; past the bounds it springs back.
 * Built on `useDrag` (offset in `--sutra-drag-x` / `--sutra-drag-y`, no React state per move). A press stops the glide.
 * Under reduced motion following the finger still works but a release stops at once.
 */
export function usePan({
  axis = "both",
  friction = INERTIA_FRICTION,
  bounds,
  elastic = 0.4,
  spring = "gentle",
  onChange,
  mouse,
  enabled,
  allow,
}: UsePanOptions = {}): PanBinding {
  const latest = useLatestRef({ friction, bounds, spring });
  const frame = React.useRef(0);
  const stopGlide = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  };

  const binding = useDrag({
    axis,
    bounds,
    elastic,
    mouse,
    enabled,
    allow,
    onPosition: onChange,
    onDown: stopGlide,
    onEnd(info, cancelled) {
      const o = latest.current;
      const b = o.bounds ?? {};
      const clampNow = (x: number, y: number) => ({ x: applyBounds(x, b.left, b.right), y: applyBounds(y, b.top, b.bottom) });
      const inside = clampNow(info.x, info.y);
      const outside = inside.x !== info.x || inside.y !== info.y;
      const v = { x: cancelled || axis === "y" ? 0 : info.vx, y: cancelled || axis === "x" ? 0 : info.vy };
      if (prefersReducedMotion()) {
        if (outside) binding.set(inside.x, inside.y);
        return;
      }
      if (outside) {
        binding.settle(inside, o.spring, v);
        return;
      }
      if (Math.hypot(v.x, v.y) < INERTIA_REST_SPEED) return;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1e3, 1 / 30);
        last = now;
        const at = binding.get();
        const sx = inertiaStep(v.x, o.friction, dt);
        const sy = inertiaStep(v.y, o.friction, dt);
        v.x = sx.velocity;
        v.y = sy.velocity;
        const nx = at.x + sx.delta;
        const ny = at.y + sy.delta;
        const c = clampNow(nx, ny);
        if (c.x !== nx || c.y !== ny) {
          // Hit an edge: hand the remaining speed to the bounce spring.
          frame.current = 0;
          binding.set(nx, ny);
          binding.settle(c, latest.current.spring, v);
          return;
        }
        binding.set(nx, ny);
        if (Math.hypot(v.x, v.y) < INERTIA_REST_SPEED) frame.current = 0;
        else frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
  });

  React.useEffect(() => stopGlide, []);

  const { settle, stop } = binding;
  return React.useMemo(
    () => ({
      ...binding,
      stop: () => {
        stopGlide();
        stop();
      },
      to: (x: number, y: number) => {
        stopGlide();
        settle({ x, y }, latest.current.spring);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [binding, settle, stop]
  );
}
