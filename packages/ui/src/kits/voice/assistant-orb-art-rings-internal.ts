// Assistant orb art: the rings look (private).
import { hash01, ringsLayout } from "../../lib/orb-art-internal";
import { TAU, type ArtFrame } from "./assistant-orb-art-core-internal";

/* ------------------------------------------------------------------ */
/* rings                                                               */
/* ------------------------------------------------------------------ */

export function drawRings(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame): void {
  const S = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const { state, t } = f;
  const p = f.palette;
  const { radii, line } = ringsLayout(S);
  const K = radii.length;
  const colors = K === 3 ? [p.main, p.second, p.third] : [p.main, p.third];
  const M = Math.max(64, Math.min(180, Math.round(S * 0.75)));
  if (!p.paper && p.dark) ctx.globalCompositeOperation = "lighter";
  const loop = (radius: number, shape: (a: number) => number) => {
    ctx.beginPath();
    for (let m = 0; m <= M; m++) {
      const th = (m / M) * TAU;
      const r = radius * shape(th);
      if (m) ctx.lineTo(cx + r * Math.cos(th), cy + r * Math.sin(th));
      else ctx.moveTo(cx + r * Math.cos(th), cy + r * Math.sin(th));
    }
    ctx.closePath();
  };
  if (state === "idle" || state === "listening") {
    // Near circles that breathe; while listening they swell in layers, each loop a moment after the one inside it.
    const listen = state === "listening";
    for (let k = 0; k < K; k++) {
      const lk = listen ? f.level(0.07 * k) : 0;
      const rel = 0.75 + 0.25 * (k / (K - 1));
      const br = 1 + 0.02 * Math.sin((TAU * t) / 5.2 - k * 0.55) + 0.06 * lk;
      const a2 = (0.012 + 0.06 * lk) * rel;
      const a3 = (0.008 + 0.042 * lk) * rel;
      const a5 = 0.026 * lk * rel;
      const p2 = 0.42 * t + k * 0.16 + (listen ? 0.9 * t : 0);
      const p3 = -0.3 * t + 1.7 + k * 0.12 - (listen ? 1.2 * t : 0);
      const p5 = 2.3 * t + k * 0.3;
      loop(S * radii[k]!, (a) => br + a2 * Math.sin(2 * a + p2) + a3 * Math.sin(3 * a + p3) + a5 * Math.sin(5 * a + p5));
      ctx.lineWidth = line;
      ctx.strokeStyle = colors[k]!;
      ctx.stroke();
    }
  } else if (state === "thinking") {
    // A calm spinner: each loop breaks into arcs, alternate loops turning the other way.
    const counts = [1, 2, 3];
    for (let k = 0; k < K; k++) {
      const dir = k % 2 ? -1 : 1;
      const rot = dir * TAU * (0.11 + 0.05 * k) * t + k * 0.9;
      const n = counts[k]!;
      const seg = TAU / n;
      const frac = 0.64 + 0.14 * Math.sin((TAU * t) / 3 + k * 1.3);
      const rr = S * radii[k]! * (1 + 0.012 * Math.sin((TAU * t) / 2.4 + k));
      ctx.lineWidth = line * 1.15;
      ctx.strokeStyle = colors[k]!;
      for (let j = 0; j < n; j++) {
        ctx.beginPath();
        ctx.arc(cx, cy, rr, rot + j * seg, rot + j * seg + seg * frac);
        ctx.stroke();
      }
    }
  } else if (state === "speaking") {
    // Rings leave a source in the middle and travel out; each carries the level it was born with.
    const P = 1.5;
    for (let k = 0; k < K; k++) {
      const ph = ((t / P + k / K) % 1 + 1) % 1;
      const birth = Math.floor(t / P + k / K);
      const lb = f.level(ph * P);
      const wv = Math.sin(Math.PI * ph) ** 0.8;
      const lw = line * (0.5 + 0.65 * lb) * wv;
      if (lw < 0.2) continue;
      const phase = hash01(birth, 3) * TAU;
      loop(S * (0.11 + 0.31 * ph), (a) => 1 + 0.06 * lb * Math.sin(3 * a + phase) + 0.035 * lb * Math.sin(2 * a + phase * 1.7));
      ctx.lineWidth = lw;
      ctx.strokeStyle = colors[(k + birth) % K]!;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, S * (0.055 + 0.03 * f.level(0)), 0, TAU);
    ctx.fillStyle = p.main;
    ctx.fill();
  } else if (state === "error") {
    // Broken: every loop has a gap and the loops have slipped off centre.
    for (let k = 0; k < K; k++) {
      const g = -Math.PI / 4 + k * 0.22;
      ctx.beginPath();
      ctx.arc(cx - 0.012 * S * k, cy + 0.02 * S * k, S * radii[k]!, g + 0.42, g + TAU - 0.42);
      ctx.lineWidth = line * 1.1;
      ctx.strokeStyle = colors[k]!;
      ctx.stroke();
    }
  } else {
    // Muted: dotted loops.
    for (let k = 0; k < K; k++) {
      const rad = S * radii[k]!;
      const dots = Math.max(6, Math.round((TAU * rad) / Math.max(line * 2.6, S * 0.035)));
      if (typeof ctx.setLineDash === "function") ctx.setLineDash([0, (TAU * rad) / dots]);
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, TAU);
      ctx.lineWidth = line;
      ctx.strokeStyle = colors[k]!;
      ctx.stroke();
    }
    if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
  }
}

