import * as React from "react";
import type { SpringConfig, SpringName } from "../lib/spring";
import { COMMIT_DISTANCE, COMMIT_VELOCITY, releaseDecision } from "../lib/gesture";
import { useDrag, type DragBinding, type DragInfo } from "./use-drag";
import { useLatestRef } from "./use-iso-layout-effect";

export interface UseSwipeDismissOptions {
  axis: "x" | "y";
  /** Release distance (px) that dismisses. Default 90. */
  distance?: number;
  /** Release speed (px/s) that dismisses. Default 450. */
  velocity?: number;
  /** Called on a committing release with the direction (-1 left or up, 1 right or down). */
  onDismiss: (direction: -1 | 1) => void;
  /** Fly the element off along the axis after a dismissal (it is the caller's job to remove it). Default true. */
  flyOut?: boolean;
  /** The spring for the fly-out and the snap-back. Default "snappy". */
  spring?: SpringConfig | SpringName;
  enabled?: boolean;
  mouse?: boolean;
  allow?: (event: React.PointerEvent<HTMLElement>) => boolean;
  onStart?: (info: DragInfo) => void;
  onMove?: (info: DragInfo) => void;
}

/**
 * Drag along one axis and let go: past the distance (or fast enough) it dismisses, otherwise it springs back. Built on `useDrag`,
 * so the offset is in `--sutra-drag-x` / `--sutra-drag-y` and nothing re-renders per move. `reset()` brings a dismissed element back.
 */
export function useSwipeDismiss({
  axis,
  distance = COMMIT_DISTANCE,
  velocity = COMMIT_VELOCITY,
  onDismiss,
  flyOut = true,
  spring = "snappy",
  enabled,
  mouse,
  allow,
  onStart,
  onMove,
}: UseSwipeDismissOptions): DragBinding & { reset: () => void } {
  const latest = useLatestRef({ distance, velocity, onDismiss, flyOut, spring });
  const elRef = React.useRef<HTMLElement | null>(null);
  const binding = useDrag({
    axis,
    enabled,
    mouse,
    allow,
    onStart,
    onMove,
    onEnd(info, cancelled) {
      const o = latest.current;
      const offset = axis === "x" ? info.x : info.y;
      const speed = axis === "x" ? info.vx : info.vy;
      const dir = cancelled ? 0 : releaseDecision({ offset, velocity: speed, distance: o.distance, speed: o.velocity });
      const v = axis === "x" ? { x: speed } : { y: speed };
      if (!dir) {
        binding.settle(axis === "x" ? { x: 0 } : { y: 0 }, o.spring, v);
        return;
      }
      o.onDismiss(dir);
      if (o.flyOut) {
        const size = (axis === "x" ? elRef.current?.offsetWidth : elRef.current?.offsetHeight) || 400;
        binding.settle(axis === "x" ? { x: dir * size * 1.2 } : { y: dir * size * 1.2 }, o.spring, v);
      }
    },
  });
  const { ref: dragRef } = binding;
  const ref = React.useCallback(
    (el: HTMLElement | null) => {
      elRef.current = el;
      dragRef(el);
    },
    [dragRef]
  );
  return React.useMemo(() => ({ ...binding, ref, reset: () => binding.set(0, 0) }), [binding, ref]);
}
