// Assistant orb art: the mala look (private).
import { beadProportions, catmullRom, malaAngle, malaCount, malaPose, smoothstep } from "../../lib/orb-art-internal";
import { TAU, type ArtFrame, type ArtScratch } from "./assistant-orb-art-core-internal";
import { type Polyline, strokeThread, beadOnThread } from "./assistant-orb-art-thread-internal";

/* ------------------------------------------------------------------ */
/* mala                                                                */
/* ------------------------------------------------------------------ */

export function drawMala(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
  const S = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const n = malaCount(S);
  const small = n < 12;
  const { offset, scale } = malaPose(f.state, f.t, f.level, n, f.rtl ? -1 : 1);
  const R = 0.3 * S;
  const bead = (small ? 0.066 : 0.048) * S;
  const go = (small ? 0.105 : 0.088) * S;
  const { inner: gi, gap: g0 } = beadProportions(go);
  const thread = Math.max(1, 0.0165 * S);
  const gap = Math.max(0.75, g0);
  const err = f.state === "error";
  const muted = f.state === "muted";
  const p = f.palette;
  const line: Polyline = { xs: [], ys: [], closed: !err };
  const M = Math.max(48, Math.min(160, Math.round(S * 0.7)));
  if (!err) {
    for (let m = 0; m <= M; m++) {
      const u = (m / M) * n;
      const i0 = Math.floor(u);
      const r = R + S * catmullRom(offset[(i0 - 1 + n) % n]!, offset[i0 % n]!, offset[(i0 + 1) % n]!, offset[(i0 + 2) % n]!, u - i0);
      const th = malaAngle(u, n);
      line.xs.push(cx + r * Math.cos(th));
      line.ys.push(cy + r * Math.sin(th));
    }
  } else {
    // Broken: the thread is cut at the bottom and both ends hang a little.
    const gh = 0.3;
    for (let m = 0; m <= M; m++) {
      const a = Math.PI / 2 + gh + (m / M) * (TAU - 2 * gh);
      const e = Math.min(m, M - m) / M;
      const r = R + S * 0.045 * (1 - smoothstep(0, 0.12, e));
      line.xs.push(cx + r * Math.cos(a));
      line.ys.push(cy + r * Math.sin(a));
    }
  }
  strokeThread(ctx, line, thread, p.main, p.lineAlpha);
  // The head bead is the Sutra bead, over and under the thread.
  beadOnThread(ctx, scratch, line, cx, cy - (R + offset[0]! * S), go * scale[0]!, gi * scale[0]!, 1, thread, gap, p.main);
  for (let i = 1; i < n; i++) {
    if (err && i === n / 2) continue;
    const th = malaAngle(i, n);
    const r = R + offset[i]! * S;
    const x = cx + r * Math.cos(th);
    const y = cy + r * Math.sin(th);
    const rb = bead * scale[i]!;
    ctx.beginPath();
    if (muted) {
      // Muted: hollow beads.
      const lw = Math.max(1, rb * 0.36);
      ctx.arc(x, y, rb - lw / 2, 0, TAU);
      ctx.lineWidth = lw;
      ctx.strokeStyle = p.main;
      ctx.stroke();
      continue;
    }
    ctx.arc(x, y, rb, 0, TAU);
    const band = Math.min(i, n - i) / (n / 2);
    ctx.fillStyle = band <= 0.34 ? p.main : band <= 0.67 ? p.second : p.third;
    ctx.fill();
  }
  if (err) {
    // The bead that fell off.
    ctx.beginPath();
    ctx.arc(cx + 0.075 * S, cy + 0.44 * S, bead, 0, TAU);
    ctx.fillStyle = p.main;
    ctx.fill();
  }
}

