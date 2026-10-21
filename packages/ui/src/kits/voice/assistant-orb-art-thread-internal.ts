// Assistant orb art: the polyline, the thread stroke and the bead laid on it (private; the mala and string looks).
import { TAU, type ArtScratch } from "./assistant-orb-art-core-internal";

/* ------------------------------------------------------------------ */
/* The Sutra bead on a thread                                          */
/* ------------------------------------------------------------------ */

/** A polyline: x and y of each point. */
export interface Polyline {
  xs: number[];
  ys: number[];
  closed?: boolean;
}

export function trace(ctx: CanvasRenderingContext2D, line: Polyline): void {
  ctx.beginPath();
  for (let i = 0; i < line.xs.length; i++) {
    if (i) ctx.lineTo(line.xs[i]!, line.ys[i]!);
    else ctx.moveTo(line.xs[i]!, line.ys[i]!);
  }
  if (line.closed) ctx.closePath();
}

export function strokeThread(ctx: CanvasRenderingContext2D, line: Polyline, width: number, color: string, alpha: number): void {
  trace(ctx, line);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Lays the ring bead at (bx, by) on a thread that is already drawn: the thread passes over the near rim and under the far
 * rim, with a paper gap at each crossing, cut out (transparent on any surface). The ring is drawn on a layer of its own and
 * cut there, so no seam shows where a cut ends. `sx` squashes the ring as it turns; below 0 it has flipped and the over
 * and under swap sides.
 */
export function beadOnThread(
  ctx: CanvasRenderingContext2D,
  scratch: ArtScratch,
  line: Polyline,
  bx: number,
  by: number,
  outer: number,
  inner: number,
  sx: number,
  thread: number,
  gap: number,
  color: string
): void {
  const flip = sx < 0;
  const ax = Math.abs(sx);
  const rxo = Math.max(outer * ax, outer * 0.16);
  const rxi = inner * ax;
  const ext = outer + gap + thread + 2;
  // Under: clear the thread around the ring band on the far half (the split runs through the hole, away from the band).
  ctx.save();
  ctx.beginPath();
  if (flip) ctx.rect(bx - ext, by - ext, ext, 2 * ext);
  else ctx.rect(bx, by - ext, ext, 2 * ext);
  ctx.clip();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.ellipse(bx, by, rxo + gap, outer + gap, 0, 0, TAU);
  if (rxi - gap > 0.25 && inner - gap > 0.25) {
    ctx.moveTo(bx + rxi - gap, by);
    ctx.ellipse(bx, by, rxi - gap, inner - gap, 0, 0, TAU);
  }
  ctx.fill("evenodd");
  ctx.restore();
  // Over: the ring on its own layer, cut around the thread on the near half, then laid on top.
  const canvas = ctx.canvas;
  if (!canvas) return;
  const cw = canvas.width;
  const ch = canvas.height;
  const dpr = scratch.dpr;
  if (typeof document === "undefined") return;
  if (!scratch.layer) {
    scratch.layer = document.createElement("canvas");
    scratch.layerCtx = scratch.layer.getContext("2d");
  }
  const layer = scratch.layer;
  const lc = scratch.layerCtx;
  if (!lc) return;
  if (layer.width !== cw || layer.height !== ch) {
    layer.width = cw;
    layer.height = ch;
  }
  const x0 = Math.max(0, Math.floor((bx - ext) * dpr));
  const y0 = Math.max(0, Math.floor((by - ext) * dpr));
  const x1 = Math.min(cw, Math.ceil((bx + ext) * dpr));
  const y1 = Math.min(ch, Math.ceil((by + ext) * dpr));
  if (x1 <= x0 || y1 <= y0) return;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalCompositeOperation = "source-over";
  lc.clearRect(x0, y0, x1 - x0, y1 - y0);
  lc.setTransform(dpr, 0, 0, dpr, 0, 0);
  lc.fillStyle = color;
  lc.beginPath();
  lc.ellipse(bx, by, rxo, outer, 0, 0, TAU);
  if (rxi > 0.25) {
    lc.moveTo(bx + rxi, by);
    lc.ellipse(bx, by, rxi, inner, 0, 0, TAU);
  }
  lc.fill("evenodd");
  lc.save();
  lc.beginPath();
  if (flip) lc.rect(bx, by - ext, ext, 2 * ext);
  else lc.rect(bx - ext, by - ext, ext, 2 * ext);
  lc.clip();
  lc.globalCompositeOperation = "destination-out";
  lc.lineCap = "round";
  lc.lineJoin = "round";
  lc.lineWidth = thread + 2 * gap;
  trace(lc, line);
  lc.stroke();
  lc.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(layer, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

