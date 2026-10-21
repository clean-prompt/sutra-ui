/**
 * The frame-drawn characters of SutraMascot (internal): every character except the bead. Their motion (pendulums with a
 * lagging knot, beads riding a spline, two-bone arms and legs, waves along a curve) is geometry recomputed every frame, which
 * CSS keyframes cannot express; so each character is a pure frame function (`mascot-<character>-internal.ts`). The still pose
 * of the current state is rendered as markup (server render, reduced motion, paused), and while the mascot moves the shared
 * frame driver re-evaluates the function and writes only the attributes that changed: no React render per frame. A change of
 * state blends the pose on screen into the new state's start and blinks on the way, so the expression swaps behind shut eyes.
 */
import * as React from "react";
import { prefersReducedMotion, usePrefersReducedMotion } from "../hooks/use-media-query";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { useFrameTicker } from "./mascot-driver-internal";
import {
  blendFrames, clamp, drawFrame, newDrawState, nodesToMarkup, signature, sstep, weight, withEyesShut, type FNode, type FrameCtx,
  type MascotCharacter, type MascotState,
} from "./mascot-kit-internal";
import { binduFrame } from "./mascot-bindu-internal";
import { bowFrame } from "./mascot-bow-internal";
import { malaFrame } from "./mascot-mala-internal";
import { pendantFrame } from "./mascot-pendant-internal";
import { sutradharFrame } from "./mascot-sutradhar-internal";

export type FrameFn = (c: FrameCtx) => FNode[];

/** The characters this module draws: all but the bead, whose motion is CSS. */
export type FrameCharacter = Exclude<MascotCharacter, "bead">;

/** The frame function of every frame-drawn character. */
export const characterFrames: Record<FrameCharacter, FrameFn> = {
  pendant: pendantFrame({ knot: "below" }),
  "knot-pendant": pendantFrame({ knot: "above" }),
  bun: pendantFrame({ knot: "above", bun: true, lashes: true }),
  mala: malaFrame,
  bindu: binduFrame,
  bow: bowFrame,
  sutradhar: sutradharFrame,
};

/** The frame function of `character`, or undefined for the bead (and for any name that is not a character: a plain lookup would find `Object.prototype` members). */
export const frameOf = (character: string): FrameFn | undefined =>
  Object.prototype.hasOwnProperty.call(characterFrames, character) ? characterFrames[character as FrameCharacter] : undefined;

export interface FrameArtProps {
  frame: FrameFn;
  state: MascotState;
  form: "bare" | "tile";
  /** Rendered size in px for optical sizing (64 for CSS lengths). */
  size: number;
  ink: string;
  bead: string;
  /** Prefix for mask and clip ids (unique per instance). */
  uid: string;
  paused: boolean;
  replayKey?: string | number;
}

/** A change of state blends the old pose into the new one over this long (seconds), with a blink. */
const BLEND = 0.32;
/** The eyelids through a blend (`p` 0 to 1): they shut fast and open slower; the expression swaps while they are shut. */
const lidsAt = (p: number) => (p < 0.35 ? sstep(p / 0.35) : 1 - sstep((p - 0.35) / 0.55));
const SWAP = 0.38;

/** A state on screen: when it began, and (while it blends in from the pose before it, since `at`) the state it replaces. */
interface Layer {
  state: MascotState;
  since: number;
  at: number;
  prev: Layer | null;
}

/** The drawing of one frame character: its still pose as markup, moved by the shared frame driver while motion is allowed. */
export function MascotFrameArt({ frame, state, form, size, ink, bead, uid, paused, replayKey }: FrameArtProps) {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<SVGGElement>(null);
  const still = React.useMemo(() => {
    const nodes = frame({ state, form, size, k: weight(size), ink, bead, t: 1.2, tt: 99, still: true });
    return { markup: nodesToMarkup(nodes, uid), sig: signature(nodes) };
  }, [frame, state, form, size, ink, bead, uid]);
  /* the state on screen and when it began (-1: at the next frame); while it blends in, the layer it is blending from, which may
     itself still be blending in from an earlier one, so a state that changes again mid-blend leaves from the pose on screen */
  const cur = React.useRef<Layer>({ state, since: -1, at: 0, prev: null });
  const drawn = React.useRef(newDrawState());
  const moving = !reduced && !paused;
  const draw = useLatestRef((now: number) => {
    const g = ref.current;
    if (!g) return;
    const c = cur.current;
    if (c.since < 0) c.since = now;
    const ctx = { form, size, k: weight(size), ink, bead, t: now, still: false };
    const pose = (l: Layer): FNode[] => {
      const mine = () => frame({ ...ctx, state: l.state, tt: now - l.since });
      if (l.prev && now - l.at < BLEND) {
        const p = clamp((now - l.at) / BLEND);
        return withEyesShut(lidsAt(p), () => blendFrames(pose(l.prev as Layer), mine(), sstep(p), p >= SWAP));
      }
      l.prev = null;
      return mine();
    };
    drawFrame(g, drawn.current, still, pose(c), uid);
  });
  /* a new state (or replayKey) starts its clock before the browser paints, and the first frame goes in at once, so the still
     markup React just wrote never shows; while moving, the pose on screen blends into the new state */
  const seen = React.useRef<{ state: string; replayKey?: string | number } | null>(null);
  useIsoLayoutEffect(() => {
    const prev = seen.current;
    seen.current = { state, replayKey };
    const live = moving && !prefersReducedMotion();
    const now = performance.now() / 1000;
    if (!prev) {
      if (live) {
        cur.current = { state, since: now, at: now, prev: null };
        draw.current(now);
      }
      return;
    }
    if (prev.state === state && prev.replayKey === replayKey) return;
    const c = cur.current;
    cur.current = { state, since: live ? now : -1, at: now, prev: live && c.since >= 0 ? c : null };
    if (live) draw.current(now);
  }, [state, replayKey, moving, draw]);
  /* reduced motion shows the still pose of the state (a pause keeps the frame where it is) */
  useIsoLayoutEffect(() => {
    if (!reduced) return;
    cur.current = { state, since: -1, at: 0, prev: null };
    const g = ref.current;
    if (g) {
      g.innerHTML = still.markup;
      drawn.current = newDrawState();
    }
  }, [reduced, still.markup]);
  useFrameTicker(ref, moving, (now) => draw.current(now));
  return <g ref={ref} data-part="art" dangerouslySetInnerHTML={{ __html: still.markup }} />;
}
