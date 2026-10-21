import * as React from "react";
import { useLatestRef } from "./use-iso-layout-effect";

/** Direction of a swipe on the screen: left, right, up or down. */
export type SwipeDirection = "left" | "right" | "up" | "down";

/** Describes a recognised swipe: its direction, distance, duration and velocity. */
export interface SwipeInfo {
  direction: SwipeDirection;
  dx: number;
  dy: number;
  /** Gesture duration in ms. */
  duration: number;
  /** Average speed along the winning axis, px/ms. */
  velocity: number;
}

/** Options for `useSwipe`: the direction callbacks, axis, travel and speed thresholds, mouse support and an enabled switch. */
export interface UseSwipeOptions {
  /** Called after any recognised swipe, with its direction, `dx`, `dy`, duration and velocity. */
  onSwipe?: (info: SwipeInfo) => void;
  /** Called after a swipe towards the left of the screen (not logical start). */
  onSwipeLeft?: (info: SwipeInfo) => void;
  /** Called after a swipe towards the right of the screen (not logical end). */
  onSwipeRight?: (info: SwipeInfo) => void;
  /** Called after an upward swipe. */
  onSwipeUp?: (info: SwipeInfo) => void;
  /** Called after a downward swipe. */
  onSwipeDown?: (info: SwipeInfo) => void;
  /** Which axis counts. Default "both". */
  axis?: "x" | "y" | "both";
  /** Minimum travel in px. Default 56. */
  threshold?: number;
  /** Slower gestures are reading/scrolling, not flicks. Default 750ms. */
  maxDuration?: number;
  /** The winning axis must beat the other by this factor. Default 1.5. */
  ratio?: number;
  /** Also react to mouse drags (touch and pen always count). Default false. */
  mouse?: boolean;
  /** Asked on pointer down; return false to ignore the whole gesture (e.g. from inside a slider). */
  allow?: (event: React.PointerEvent<HTMLElement>) => boolean;
  /** Turns the gesture off without unmounting; on unless set to `false`. */
  enabled?: boolean;
}

/** Pointer handlers that `useSwipe` returns; spread them on the swipeable element. */
export interface SwipeHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
}

/**
 * Detects a flick (decided when the pointer lifts, so it never fights native scrolling).
 * Spread the returned handlers on an element; give it a matching `touch-action` (e.g. `touch-pan-y` for horizontal swipes).
 */
export function useSwipe(options: UseSwipeOptions = {}): SwipeHandlers {
  const optsRef = useLatestRef(options);
  const start = React.useRef<{ x: number; y: number; at: number; id: number } | null>(null);
  const pointers = React.useRef(new Set<number>());

  return React.useMemo<SwipeHandlers>(() => {
    const reset = (event: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(event.pointerId);
      if (start.current?.id === event.pointerId) start.current = null;
    };
    return {
      onPointerDown(event) {
        const o = optsRef.current;
        pointers.current.add(event.pointerId);
        if (o.enabled === false || (event.pointerType === "mouse" && !o.mouse) || (event.pointerType === "mouse" && event.button !== 0)) return;
        if (pointers.current.size > 1 || (o.allow && !o.allow(event))) {
          start.current = null;
          return;
        }
        start.current = { x: event.clientX, y: event.clientY, at: Date.now(), id: event.pointerId };
      },
      onPointerMove() {
        if (pointers.current.size > 1) start.current = null;
      },
      onPointerUp(event) {
        const s = start.current;
        reset(event);
        if (!s || s.id !== event.pointerId) return;
        const o = optsRef.current;
        const { threshold = 56, maxDuration = 750, ratio = 1.5, axis = "both" } = o;
        const dx = event.clientX - s.x;
        const dy = event.clientY - s.y;
        const duration = Math.max(1, Date.now() - s.at);
        if (duration > maxDuration) return;
        const horizontal = Math.abs(dx) >= Math.abs(dy) * ratio && Math.abs(dx) >= threshold;
        const vertical = Math.abs(dy) >= Math.abs(dx) * ratio && Math.abs(dy) >= threshold;
        let direction: SwipeDirection | null = null;
        if (horizontal && axis !== "y") direction = dx < 0 ? "left" : "right";
        else if (vertical && axis !== "x") direction = dy < 0 ? "up" : "down";
        if (!direction) return;
        const info: SwipeInfo = {
          direction,
          dx,
          dy,
          duration,
          velocity: Math.abs(direction === "left" || direction === "right" ? dx : dy) / duration,
        };
        o.onSwipe?.(info);
        ({ left: o.onSwipeLeft, right: o.onSwipeRight, up: o.onSwipeUp, down: o.onSwipeDown })[direction]?.(info);
      },
      onPointerCancel: reset,
    };
  }, [optsRef]);
}
