import { liftKeyframes, morphFadeKeyframes, morphFrames, morphKeyframes, morphScrimKeyframes, parseRadius, sameRect, type MorphOrigin, type MorphRect } from "../lib/morph";
import { parseCssTime } from "../lib/flip";
import { directionOf } from "../lib/direction";
import { prefersReducedMotion } from "./use-media-query";

/** What `playRectMorph` moves. */
export interface RectMorphTargets {
  /** The box that moves (the panel with its shadow). */
  frame: HTMLElement;
  /** The element clipped to the origin's rectangle. */
  panel: HTMLElement;
  /** Shadow layer and scrim: they fade over the whole flight. */
  scrim?: (HTMLElement | null | undefined)[];
  /** Parts that appear late and go early (the detail below the repeated face). */
  fade?: Element[];
}

type Origin = React.RefObject<Element | null> | Element | MorphRect | DOMRectReadOnly | null | undefined;

const toRect = (r: DOMRectReadOnly | MorphRect): MorphRect => ({ left: r.left, top: r.top, width: r.width, height: r.height });

/** Where an origin is right now: an element (or a ref to one) gives its box and corner radius, a rect its box. `null` when there is nothing to fly from. */
export function measureOrigin(origin: Origin): MorphOrigin | null {
  if (!origin) return null;
  const el = typeof Element !== "undefined" && origin instanceof Element ? origin : "current" in origin ? origin.current : null;
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) return null;
    return { rect: toRect(rect), radius: parseRadius(getComputedStyle(el).borderTopLeftRadius), dir: directionOf(el) };
  }
  if ("width" in origin && "height" in origin && !("current" in origin)) return { rect: toRect(origin), radius: 0, dir: directionOf(null) };
  return null;
}

/** Whether a morph can play at all: `animate` exists and the user has not asked for less motion. */
export function canMorph(el: Element | null | undefined): boolean {
  return !!el && typeof (el as HTMLElement).animate === "function" && !prefersReducedMotion();
}

/**
 * Plays a panel growing out of (`in`) or back into (`out`) an origin rectangle with the Web Animations API, on the snappy spring
 * token (so a style that retunes it retunes this): the frame translates so the panel's inline-start corner sits on the origin's,
 * and the panel is clipped to the origin's size and radius, so nothing stretches. Without an origin it lifts in and out.
 * Returns the animations (empty under reduced motion or without `animate`): the caller waits on `finished` and cancels them on cleanup.
 */
export function playRectMorph(targets: RectMorphTargets, from: MorphOrigin | null, direction: "in" | "out"): Animation[] {
  const { frame, panel } = targets;
  if (!canMorph(frame)) return [];
  const style = getComputedStyle(frame);
  const duration = parseCssTime(style.getPropertyValue("--sutra-spring-snappy-duration")) ?? 300;
  const easing = style.getPropertyValue("--sutra-spring-snappy").trim() || "ease";
  const timing: KeyframeAnimationOptions = { duration, easing, fill: direction === "out" ? "both" : "backwards" };
  const linear: KeyframeAnimationOptions = { duration, easing: "linear", fill: timing.fill };
  const to = toRect(frame.getBoundingClientRect());
  const out: Animation[] = [];
  const morph = from && !sameRect(from.rect, to) ? morphKeyframes(morphFrames(from.rect, to, { rtl: directionOf(frame) === "rtl", radiusFrom: from.radius, radiusTo: parseRadius(getComputedStyle(panel).borderTopLeftRadius) }), direction) : liftKeyframes(direction);
  out.push(frame.animate(morph.frame, timing));
  if (morph.panel.length) out.push(panel.animate(morph.panel, timing));
  for (const el of targets.scrim ?? []) if (el) out.push(el.animate(morphScrimKeyframes(direction), { ...linear, easing: "ease" }));
  for (const el of targets.fade ?? []) out.push(el.animate(morphFadeKeyframes(direction), linear));
  return out;
}
