/**
 * The frame-drawn characters of SutraMascot (internal): every character except the bead. Their motion (pendulums with a
 * lagging knot, beads riding a spline, two-bone arms and legs, waves along a curve) is geometry recomputed every frame, which
 * CSS keyframes cannot express; so each character is a pure frame function (`mascot-<character>-internal.ts`). The still pose
 * of the current state is rendered as markup (server render, reduced motion, paused), and while the mascot moves the shared
 * frame driver re-evaluates the function and writes only the attributes that changed: no React render per frame.
 */
import * as React from "react";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useFrameTicker } from "./mascot-driver-internal";
import { drawFrame, newDrawState, nodesToMarkup, signature, weight, type FNode, type FrameCtx } from "./mascot-kit-internal";
import { binduFrame } from "./mascot-bindu-internal";
import { bowFrame } from "./mascot-bow-internal";
import { malaFrame } from "./mascot-mala-internal";
import { pendantFrame } from "./mascot-pendant-internal";
import { sutradharFrame } from "./mascot-sutradhar-internal";

export type FrameFn = (c: FrameCtx) => FNode[];

/** The frame function of every frame-drawn character. */
export const characterFrames: Record<string, FrameFn> = {
  pendant: pendantFrame({ knot: "below" }),
  "knot-pendant": pendantFrame({ knot: "above" }),
  bun: pendantFrame({ knot: "above", bun: true, lashes: true }),
  mala: malaFrame,
  bindu: binduFrame,
  bow: bowFrame,
  sutradhar: sutradharFrame,
};

export interface FrameArtProps {
  frame: FrameFn;
  state: string;
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

/** The drawing of one frame character: its still pose as markup, moved by the shared frame driver while motion is allowed. */
export function MascotFrameArt({ frame, state, form, size, ink, bead, uid, paused, replayKey }: FrameArtProps) {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<SVGGElement>(null);
  const still = React.useMemo(() => {
    const nodes = frame({ state, form, size, k: weight(size), ink, bead, t: 1.2, tt: 99, still: true });
    return { markup: nodesToMarkup(nodes, uid), sig: signature(nodes) };
  }, [frame, state, form, size, ink, bead, uid]);
  const since = React.useRef(-1);
  const drawn = React.useRef(newDrawState());
  React.useEffect(() => {
    since.current = -1; /* a state change or a new replayKey starts the state again (one-shots replay) */
  }, [state, replayKey]);
  useFrameTicker(ref, !reduced && !paused, (now) => {
    const g = ref.current;
    if (!g) return;
    if (since.current < 0) since.current = now;
    const nodes = frame({ state, form, size, k: weight(size), ink, bead, t: now, tt: now - since.current, still: false });
    drawFrame(g, drawn.current, still, nodes, uid);
  });
  return <g ref={ref} data-part="art" dangerouslySetInnerHTML={{ __html: still.markup }} />;
}
