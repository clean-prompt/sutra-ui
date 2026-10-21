// Assistant orb art: the still times per look and the dispatch that draws one frame (private).
import { orbStringForm, type AssistantOrbState, type OrbArtVariant } from "../../lib/orb";
import type { ArtFrame, ArtScratch } from "./assistant-orb-art-core-internal";
import { drawMala } from "./assistant-orb-art-mala-internal";
import { drawStringBar, drawStringSquare } from "./assistant-orb-art-string-internal";
import { drawInk } from "./assistant-orb-art-ink-internal";
import { drawRings } from "./assistant-orb-art-rings-internal";
import { drawGraph } from "./assistant-orb-art-graph-internal";
import { drawHalftone } from "./assistant-orb-art-halftone-internal";

/** A fixed time per state for the still pose of each look (picked so the states differ most). */
export const ART_STILL_TIME: Record<OrbArtVariant | "string-square", Partial<Record<AssistantOrbState, number>>> = {
  mala: { idle: 2.2, listening: 1.27, thinking: 1.08, speaking: 0.66 },
  string: { idle: 1.25, listening: 1.33, thinking: 0.36, speaking: 0.93 },
  "string-square": { idle: 1.25, listening: 0.312, thinking: 0.42, speaking: 0.9 },
  ink: { idle: 1.2, listening: 1.3, thinking: 1.8, speaking: 0.9 },
  rings: { idle: 1.2, listening: 1.31, thinking: 1.05, speaking: 1 },
  graph: { idle: 1.2, listening: 1.3, thinking: 0.3, speaking: 0.5 },
  halftone: { idle: 1.2, listening: 1.2, thinking: 0.9, speaking: 0.95 },
};

/** The still time of a look in a state (the string has its own table for the square form). */
export function artStillTime(variant: OrbArtVariant, state: AssistantOrbState, width = 3, height = 1): number {
  const key = variant === "string" && orbStringForm(width, height) === "square" ? "string-square" : variant;
  return ART_STILL_TIME[key][state] ?? 1.2;
}

/** Draws one frame of a look into a box of `w` by `h` css px (the context is already scaled for the pixel ratio). */
export function drawOrbArt(ctx: CanvasRenderingContext2D, variant: OrbArtVariant, w: number, h: number, frame: ArtFrame, scratch: ArtScratch): void {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (variant) {
    case "mala":
      drawMala(ctx, w, h, frame, scratch);
      break;
    case "string":
      if (orbStringForm(w, h) === "bar") drawStringBar(ctx, w, h, frame, scratch);
      else drawStringSquare(ctx, w, h, frame, scratch);
      break;
    case "ink":
      drawInk(ctx, w, h, frame, scratch);
      break;
    case "rings":
      drawRings(ctx, w, h, frame);
      break;
    case "graph":
      drawGraph(ctx, w, h, frame);
      break;
    case "halftone":
      drawHalftone(ctx, w, h, frame);
      break;
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
