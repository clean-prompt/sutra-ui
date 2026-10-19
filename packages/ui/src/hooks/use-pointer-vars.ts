import * as React from "react";
import { clamp } from "../lib/math";
import { useMediaQuery, usePrefersReducedMotion } from "./use-media-query";

export interface UsePointerVarsOptions {
  /** Magnetic reach in px beyond the box. 0 (default): only while the pointer is over the element. */
  radius?: number;
  /** How much of the pointer's offset from the centre the magnetic pull follows (0..1). Default 0.35. */
  strength?: number;
  /** Turn the hook off. Default true. */
  enabled?: boolean;
}

export interface PointerVars {
  /** Pointer position inside the box, in px (outside the 0..width range when the pull reaches past the box). */
  px: number;
  py: number;
  /** Pointer offset from the centre, -1..1 per axis. */
  tx: number;
  ty: number;
  /** Magnetic offset in px: toward the pointer, strongest about halfway out, fading to nothing at the edge of the reach. */
  pullX: number;
  pullY: number;
  /** Over the element, or inside its magnetic reach. */
  near: boolean;
}

/** The CSS variables for one pointer position over a box (pure; `usePointerVars` writes them). */
export function pointerVarsFor(
  rect: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
  { radius = 0, strength = 0.35 }: Pick<UsePointerVarsOptions, "radius" | "strength"> = {}
): PointerVars {
  const { width: w, height: h } = rect;
  const px = x - rect.left;
  const py = y - rect.top;
  const dx = px - w / 2;
  const dy = py - h / 2;
  const reach = Math.max(w, h) / 2 + radius;
  const dist = Math.hypot(dx, dy);
  const near = radius > 0 ? dist <= reach : px >= 0 && py >= 0 && px <= w && py <= h;
  const k = radius > 0 && near && reach > 0 ? strength * (1 - dist / reach) : 0;
  return { px, py, tx: w ? clamp(dx / (w / 2), -1, 1) : 0, ty: h ? clamp(dy / (h / 2), -1, 1) : 0, pullX: dx * k, pullY: dy * k, near };
}

const VARS = ["--px", "--py", "--tx", "--ty", "--pull-x", "--pull-y"];

/**
 * Publishes the pointer over an element as CSS variables, for the `spotlight`, `tilt` and `magnetic` utilities. Pass the
 * returned ref to a box that does not itself move (tilt and magnetic go on a child, or the box would shift under the
 * pointer). While a mouse or pen is over it, or inside its magnetic `radius`, it sets `data-pointer="active"` and
 * `--px --py` (px), `--tx --ty` (-1..1) and `--pull-x --pull-y` (px), once per frame; on leave it removes them all, and
 * the CSS transition settles back. Touch, a primary pointer that cannot hover, and reduced motion get the resting state:
 * no listeners, nothing written. The effect is decoration and must not carry information.
 */
export function usePointerVars<T extends HTMLElement = HTMLElement>({ radius = 0, strength = 0.35, enabled = true }: UsePointerVarsOptions = {}): React.RefObject<T | null> {
  const ref = React.useRef<T | null>(null);
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = usePrefersReducedMotion();
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !fine || reduced) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    let active = false;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = null;
      if (!active) return;
      active = false;
      delete el.dataset.pointer;
      for (const name of VARS) el.style.removeProperty(name);
    };
    const apply = () => {
      frame = 0;
      if (!last) return;
      const v = pointerVarsFor(el.getBoundingClientRect(), last.clientX, last.clientY, { radius, strength });
      if (!v.near) return reset();
      active = true;
      el.dataset.pointer = "active";
      const set = (name: string, n: number, unit = "") => el.style.setProperty(name, `${Math.round(n * 100) / 100}${unit}`);
      set("--px", v.px, "px");
      set("--py", v.py, "px");
      set("--tx", v.tx);
      set("--ty", v.ty);
      set("--pull-x", v.pullX);
      set("--pull-y", v.pullY);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      last = e;
      frame ||= requestAnimationFrame(apply);
    };
    const target: EventTarget = radius > 0 ? document : el;
    const leave: EventTarget = radius > 0 ? document.documentElement : el;
    target.addEventListener("pointermove", move as EventListener, { passive: true });
    leave.addEventListener("pointerleave", reset);
    return () => {
      target.removeEventListener("pointermove", move as EventListener);
      leave.removeEventListener("pointerleave", reset);
      reset();
    };
  }, [enabled, fine, reduced, radius, strength]);
  return ref;
}
