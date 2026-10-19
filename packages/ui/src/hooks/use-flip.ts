import * as React from "react";
import { FLIP_MAX, flipInverseKeyframes, flipKeyframes, flipMoves, parseCssTime, sameKeys, type FlipRect } from "../lib/flip";
import { useIsoLayoutEffect } from "./use-iso-layout-effect";
import { prefersReducedMotion } from "./use-media-query";

/** How a FLIP move eases: a quick `snap`, a `spring` or a plain `ease`. */
export type FlipEasing = "snap" | "spring" | "ease";

/** Options for `useFlip`: duration, easing, move cap, scaling and an enabled switch. */
export interface UseFlipOptions {
  /** Milliseconds. Default: the duration that goes with the easing token (a spring token's own, 300 for `"ease"`). */
  duration?: number;
  /** `"snap"` is the snappy spring token, `"spring"` the gentle one, `"ease"` the shared ease. Default `"snap"`. */
  easing?: FlipEasing;
  /** Most elements animated per update. Default 40. */
  max?: number;
  /** Animate size as well as position; children opt into a counter-scale with `data-flip-inverse`. Default false. */
  scale?: boolean;
  /** Turn it off without changing the hook order. Default true. */
  enabled?: boolean;
}

/** The part of a `DOMRect` that `register.from` reads. */
export type FlipViewportRect = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

/** Function that registers an element's previous position so its next layout can animate from it. */
export interface FlipRegister {
  /** The ref callback of the element that stands for `key`. */
  (key: string): React.RefCallback<HTMLElement>;
  /** Animate `key` from this viewport rect instead of from where it was (a dropped item that was being dragged). */
  from: (key: string, rect: FlipViewportRect) => void;
}

const EASING_TOKEN: Record<FlipEasing, string> = { snap: "--sutra-spring-snappy", spring: "--sutra-spring-gentle", ease: "--sutra-ease" };

/**
 * FLIP for a list: pass the ordered keys and put `register(key)` on each element. When the keys change (a reorder, an
 * insert, a removal), the elements that moved glide from their old place to the new one with WAAPI (`translate`, plus
 * `scale` when asked), on the motion tokens, so a style that retunes them retunes this. Positions are measured relative
 * to the parent, an animation still in flight is cancelled and continued from where the element is, and nothing is
 * measured or animated under `prefers-reduced-motion` (the list just changes) or where `animate` is missing (jsdom).
 * Cancels on unmount; StrictMode's second run measures the same boxes, which is no move.
 */
export function useFlip(keys: readonly string[], options: UseFlipOptions = {}): FlipRegister {
  const { duration, easing = "snap", max = FLIP_MAX, scale = false, enabled = true } = options;
  const els = React.useRef(new Map<string, HTMLElement>());
  const callbacks = React.useRef(new Map<string, React.RefCallback<HTMLElement>>());
  const before = React.useRef(new Map<string, FlipRect>());
  const lastKeys = React.useRef<readonly string[] | null>(null);
  const hints = React.useRef(new Map<string, FlipViewportRect>());
  const running = React.useRef(new Map<string, Animation[]>());

  const register = React.useMemo<FlipRegister>(() => {
    const ref = (key: string) => {
      let cb = callbacks.current.get(key);
      if (!cb) {
        cb = (el: HTMLElement | null) => {
          if (el) els.current.set(key, el);
          else els.current.delete(key);
        };
        callbacks.current.set(key, cb);
      }
      return cb;
    };
    return Object.assign(ref, { from: (key: string, rect: FlipViewportRect) => void hints.current.set(key, rect) });
  }, []);

  useIsoLayoutEffect(() => {
    const parents = new Map<Element, DOMRect>();
    const measure = () => {
      const out = new Map<string, FlipRect>();
      for (const [key, el] of els.current) {
        const parent = el.parentElement;
        if (!parent) continue;
        const p = parents.get(parent) ?? parent.getBoundingClientRect();
        parents.set(parent, p);
        const r = el.getBoundingClientRect();
        out.set(key, { x: r.left - p.left, y: r.top - p.top, width: r.width, height: r.height });
      }
      return out;
    };
    for (const key of callbacks.current.keys()) if (!keys.includes(key)) callbacks.current.delete(key);

    // Where each element is drawn now (an unfinished animation included), then where its layout puts it.
    const drawn = measure();
    const flying = new Set(running.current.keys());
    for (const list of running.current.values()) for (const a of list) a.cancel();
    running.current.clear();
    let last = drawn;
    if (flying.size) {
      parents.clear();
      last = measure();
    }

    const changed = !sameKeys(lastKeys.current, keys) || hints.current.size > 0;
    if (enabled && changed && lastKeys.current && !prefersReducedMotion()) {
      const first = new Map<string, FlipRect>();
      for (const [key, rect] of before.current) first.set(key, flying.has(key) ? (drawn.get(key) ?? rect) : rect);
      for (const [key, hint] of hints.current) {
        const p = els.current.get(key)?.parentElement && parents.get(els.current.get(key)!.parentElement!);
        if (p) first.set(key, { x: hint.left - p.left, y: hint.top - p.top, width: hint.width, height: hint.height });
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const onScreen = (r: FlipRect, key: string) => {
        const p = parents.get(els.current.get(key)!.parentElement!)!;
        return p.left + r.x < w && p.left + r.x + r.width > 0 && p.top + r.y < h && p.top + r.y + r.height > 0;
      };
      const moves = flipMoves(first, last, keys, { max, scale, visible: (a, b, key) => onScreen(a, key) || onScreen(b, key) });
      if (moves.length) {
        const style = getComputedStyle(els.current.get(moves[0]!.key)!);
        const token = EASING_TOKEN[easing];
        const curve = style.getPropertyValue(token).trim() || "ease";
        const ms = duration ?? parseCssTime(style.getPropertyValue(easing === "ease" ? "--sutra-duration-slow" : `${token}-duration`)) ?? 300;
        const timing: KeyframeAnimationOptions = { duration: ms, easing: curve, composite: "replace" };
        for (const move of moves) {
          const el = els.current.get(move.key)!;
          if (typeof el.animate !== "function") continue;
          const list = [el.animate(flipKeyframes(move, scale), timing)];
          if (scale) for (const inner of el.querySelectorAll<HTMLElement>("[data-flip-inverse]")) list.push(inner.animate(flipInverseKeyframes(move), timing));
          running.current.set(move.key, list);
          const release = () => running.current.get(move.key) === list && running.current.delete(move.key);
          list[0]!.onfinish = list[0]!.oncancel = release;
        }
      }
    }
    before.current = last;
    lastKeys.current = keys;
    hints.current.clear();
  });

  React.useEffect(
    () => () => {
      for (const list of running.current.values()) for (const a of list) a.cancel();
      running.current.clear();
    },
    []
  );

  return register;
}
