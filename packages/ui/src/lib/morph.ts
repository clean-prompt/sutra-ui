/* Pure maths for `MorphDialog` / `ExpandCard`: how a panel grows out of a card's rectangle and shrinks back. No DOM, no React. */

import type { Direction } from "./direction";

/** A box in viewport coordinates. */
export interface MorphRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where a panel flies from or to: the origin's rectangle and its corner radius. */
export interface MorphOrigin {
  rect: MorphRect;
  radius: number;
  /** The reading direction at the origin (the panel is portaled to <body>, so it carries this over). */
  dir?: Direction;
}

export interface MorphFrame {
  /** `transform` of the frame (the box that moves). */
  transform: string;
  /** `clip-path` of the panel (the window that reveals it). */
  clipPath: string;
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/** The first length of a CSS radius ("16px", "16px 8px", "50%" counts as 0 here); 0 for anything else. */
export function parseRadius(value: string | null | undefined): number {
  const n = parseFloat(String(value ?? ""));
  return Number.isFinite(n) && n > 0 && !String(value).includes("%") ? n : 0;
}

/** Whether two boxes are the same to the pixel (a morph from the panel's own box is no morph). */
export function sameRect(a: MorphRect, b: MorphRect): boolean {
  return Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

/**
 * The two ends of the morph for a panel whose final box is `to`: `collapsed` puts the panel's inline-start, top corner on the
 * origin's and clips it to the origin's size and radius (so what shows is the part of the panel that sits where the card was,
 * and nothing is stretched), `expanded` is the panel as laid out. In right-to-left text the right corner is the anchor, so
 * a start-aligned face lines up with the card in both directions. The clip never goes below zero (a card bigger than the
 * panel shows the whole panel, shifted onto it).
 */
export function morphFrames(from: MorphRect, to: MorphRect, { rtl = false, radiusFrom = 0, radiusTo = 0 }: { rtl?: boolean; radiusFrom?: number; radiusTo?: number } = {}): { collapsed: MorphFrame; expanded: MorphFrame } {
  const tx = rtl ? from.left + from.width - (to.left + to.width) : from.left - to.left;
  const ty = from.top - to.top;
  const slackX = Math.max(0, to.width - from.width);
  const slackY = Math.max(0, to.height - from.height);
  const clip = (left: number, right: number, bottom: number, radius: number) => `inset(0px ${px(right)} ${px(bottom)} ${px(left)} round ${px(radius)})`;
  return {
    collapsed: { transform: `translate(${px(tx)}, ${px(ty)})`, clipPath: clip(rtl ? slackX : 0, rtl ? 0 : slackX, slackY, radiusFrom) },
    expanded: { transform: "translate(0px, 0px)", clipPath: clip(0, 0, 0, radiusTo) },
  };
}

/** Keyframes of the panel's frame and clip for opening (`in`) or closing (`out`). */
export function morphKeyframes(frames: { collapsed: MorphFrame; expanded: MorphFrame }, direction: "in" | "out"): { frame: Keyframe[]; panel: Keyframe[] } {
  const [a, b] = direction === "in" ? [frames.collapsed, frames.expanded] : [frames.expanded, frames.collapsed];
  return { frame: [{ transform: a.transform }, { transform: b.transform }], panel: [{ clipPath: a.clipPath }, { clipPath: b.clipPath }] };
}

/** Keyframes of what fades with the morph (the detail below the face, the scrim, the shadow): in late, out early. */
export function morphFadeKeyframes(direction: "in" | "out"): Keyframe[] {
  return direction === "in" ? [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0, offset: 0.35 }, { opacity: 0 }];
}

/** Keyframes of the scrim and the shadow, which follow the whole flight. */
export function morphScrimKeyframes(direction: "in" | "out"): Keyframe[] {
  return direction === "in" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
}

/** With no origin the panel lifts in (and back out): used when it opens from a hotkey or outside the page. */
export function liftKeyframes(direction: "in" | "out"): { frame: Keyframe[]; panel: Keyframe[] } {
  const hidden = { opacity: 0, transform: "translateY(12px) scale(0.98)" };
  const shown = { opacity: 1, transform: "translateY(0px) scale(1)" };
  return { frame: direction === "in" ? [hidden, shown] : [shown, hidden], panel: [] };
}
