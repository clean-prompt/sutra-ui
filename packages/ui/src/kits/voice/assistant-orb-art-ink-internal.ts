// Assistant orb art: the ink look (private).
import { clamp } from "../../lib/math";
import { INK_THRESHOLD, inkField, inkFieldAt, inkScene, INK_REACH, traceIso } from "../../lib/orb-art-internal";
import { TAU, type ArtFrame, type ArtScratch } from "./assistant-orb-art-core-internal";

/* ------------------------------------------------------------------ */
/* ink                                                                 */
/* ------------------------------------------------------------------ */

export function drawInk(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
  const S = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const p = f.palette;
  if (f.state === "muted") {
    // Muted: an empty drop, an outline only.
    const R = 0.255 * S;
    ctx.beginPath();
    for (let m = 0; m <= 96; m++) {
      const th = (m / 96) * TAU;
      const r = R * (1 + 0.035 * Math.sin(2 * th + 0.6) + 0.02 * Math.sin(3 * th + 2));
      if (m) ctx.lineTo(cx + r * Math.cos(th), cy + r * Math.sin(th));
      else ctx.moveTo(cx + r * Math.cos(th), cy + r * Math.sin(th));
    }
    ctx.closePath();
    ctx.lineWidth = Math.max(1.25, S * 0.024);
    ctx.strokeStyle = p.main;
    ctx.stroke();
    return;
  }
  const scene = inkScene(f.state, f.t, f.level, f.peaks, S);
  const g = Math.round(clamp(S / 2.8, 20, 84));
  const cell = S / g;
  if (!scratch.field || scratch.fieldSize !== g) {
    scratch.field = new Float32Array((g + 1) * (g + 1));
    scratch.fieldSize = g;
  }
  // Small droplets that float free are true circles (the grid would make polygons of them); the rest go through the field.
  const free: [number, number, number][] = [];
  const joined: [number, number, number][] = [];
  scene.drops.forEach((d, m) => {
    const fv = inkFieldAt(scene, d[0], d[1], m);
    if (fv < 0.15 && d[2] < 3 * cell) free.push([d[0], d[1], INK_REACH * d[2] * Math.sqrt(Math.max(0, 1 - Math.sqrt(INK_THRESHOLD - fv)))]);
    else joined.push(d);
  });
  inkField(scratch.field, g, cell, -S / 2, -S / 2, { ...scene, drops: joined });
  if (!p.paper && f.state !== "error" && typeof ctx.createLinearGradient === "function") {
    const gr = ctx.createLinearGradient(cx - 0.32 * S, cy - 0.34 * S, cx + 0.32 * S, cy + 0.34 * S);
    gr.addColorStop(0, p.main);
    gr.addColorStop(1, p.second);
    ctx.fillStyle = gr;
  } else ctx.fillStyle = p.main;
  ctx.beginPath();
  traceIso(scratch.field, g, cell, cx - S / 2, cy - S / 2, INK_THRESHOLD, ctx);
  for (const [x, y, r] of free) {
    ctx.moveTo(cx + x + r, cy + y);
    ctx.arc(cx + x, cy + y, r, 0, TAU);
  }
  ctx.fill();
}

