import * as React from "react";
import { effectiveLevel, orbStillLevel, shouldRipple, smoothLevel, type AssistantOrbState } from "../../lib/orb";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { clamp } from "../../lib/math";

/** A level reading clamped to 0..1; anything that is not a finite number counts as silence. */
export const clampLevel = (level: number | undefined) => (typeof level === "number" && Number.isFinite(level) ? clamp(level, 0, 1) : 0);

/** A requestAnimationFrame loop that starts on `wake()` and ends when `tick` says it is done, so nothing runs at rest. */
export interface FrameLoop {
  /** Start the loop if it is not running and `allowed()` is true. */
  wake(): void;
  /** Cancel the pending frame. */
  stop(): void;
}

/** `tick(dt, now)` gets seconds since the last frame (0 on the first, capped at 0.1) and returns true to keep running. */
export function createFrameLoop(tick: (dt: number, now: number) => boolean, allowed: () => boolean): FrameLoop {
  let raf = 0;
  let last = 0;
  const frame = (now: number) => {
    raf = 0;
    if (!allowed()) {
      last = 0;
      return;
    }
    const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    if (tick(dt, now)) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  return {
    wake() {
      if (!raf && allowed()) raf = requestAnimationFrame(frame);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    },
  };
}

/** Whether the orb is on screen, plus the loops to wake when it comes back. */
export interface OrbVisibility {
  /** True while the element intersects the viewport (true until the observer reports, and where there is no observer). */
  current: boolean;
  /** Wake functions of the frame loops; called when the element scrolls back into view. */
  wake: Set<() => void>;
}

/**
 * Tracks whether the element is on screen. The result is a stable object (no render per change) and `data-offscreen` on the
 * element, which the stylesheet uses to pause the ambient animation; loops register in `wake` to resume on return.
 */
export function useOrbVisible(ref: React.RefObject<HTMLElement | null>): OrbVisibility {
  const state = React.useRef<OrbVisibility>({ current: true, wake: new Set() });
  React.useEffect(() => {
    const el = ref.current;
    const visibility = state.current;
    visibility.current = true;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      visibility.current = entry.isIntersecting;
      if (entry.isIntersecting) {
        el.removeAttribute("data-offscreen");
        visibility.wake.forEach((wake) => wake());
      } else el.setAttribute("data-offscreen", "");
    });
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute("data-offscreen");
      visibility.current = true;
    };
  }, [ref]);
  return state.current;
}

/** How long one ripple element stays busy before it can be fired again (ms; a little over its animation). */
const RIPPLE_MS = 1200;

function fireRipple(root: HTMLElement, firedAt: number[], now: number): void {
  const nodes = root.querySelectorAll<HTMLElement>('[data-part="ripple"]');
  for (let i = 0; i < nodes.length; i++) {
    if (now - (firedAt[i] ?? -1e9) < RIPPLE_MS) continue;
    const node = nodes[i]!;
    node.removeAttribute("data-fire");
    void node.offsetWidth; // restart the animation
    node.setAttribute("data-fire", "");
    firedAt[i] = now;
    return;
  }
}

/**
 * Writes the smoothed level to `--orb-level` on the root (a style property write per frame, no React state) and fires ripples
 * while listening. The frame loop runs only while the level is moving or non-zero, the orb is on screen and not paused, and
 * never under reduced motion: there the variable holds the still pose of the state.
 */
export function useOrbLevel(
  rootRef: React.RefObject<HTMLElement | null>,
  { state, level, paused, reduced, visible }: { state: AssistantOrbState; level: number | undefined; paused: boolean; reduced: boolean; visible: OrbVisibility }
): React.RefObject<FrameLoop | null> {
  const loopRef = React.useRef<FrameLoop | null>(null);
  const target = React.useRef(0);
  const smoothed = React.useRef(0);
  const latest = useLatestRef(state);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (reduced) {
      el.style.setProperty("--orb-level", String(orbStillLevel(state)));
      smoothed.current = 0;
      return;
    }
    const firedAt: number[] = [];
    let lastRipple = -1e9;
    const loop = createFrameLoop(
      (dt, now) => {
        const next = smoothLevel(smoothed.current, target.current, dt);
        smoothed.current = next;
        el.style.setProperty("--orb-level", next.toFixed(3));
        if (latest.current === "listening" && shouldRipple(next, now - lastRipple)) {
          lastRipple = now;
          fireRipple(el, firedAt, now);
        }
        return target.current > 0.002 || Math.abs(target.current - next) > 0.002;
      },
      () => !paused && visible.current
    );
    loopRef.current = loop;
    const wake = () => loop.wake();
    visible.wake.add(wake);
    loop.wake();
    return () => {
      visible.wake.delete(wake);
      loop.stop();
      loopRef.current = null;
    };
    // `state` only matters for the still pose; the loop reads it through `latest`.
  }, [rootRef, reduced, paused, visible, latest, state]);

  React.useEffect(() => {
    target.current = effectiveLevel(state, level);
    loopRef.current?.wake();
  }, [state, level, paused, reduced]);

  return loopRef;
}
