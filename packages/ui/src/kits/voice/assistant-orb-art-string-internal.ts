// Assistant orb art: the string look, bar and square (private).
import { clamp } from "../../lib/math";
import { beadProportions, easeOutCubic, smoothstep } from "../../lib/orb-art-internal";
import { TAU, type ArtFrame, type ArtScratch } from "./assistant-orb-art-core-internal";
import { type Polyline, strokeThread, beadOnThread } from "./assistant-orb-art-thread-internal";

/* ------------------------------------------------------------------ */
/* string                                                              */
/* ------------------------------------------------------------------ */

function sampleAt(ys: number[], u: number): number {
  const M = ys.length - 1;
  const x = clamp(u, 0, 1) * M;
  const i0 = Math.floor(x);
  return i0 >= M ? ys[M]! : ys[i0]! + (ys[i0 + 1]! - ys[i0]!) * (x - i0);
}

function threadLine(xa: number, len: number, mid: number, ys: number[], from = 0, to = 1): Polyline {
  const M = ys.length - 1;
  const line: Polyline = { xs: [], ys: [] };
  for (let i = 0; i <= M; i++) {
    const u = i / M;
    if (u < from - 1e-6 || u > to + 1e-6) continue;
    line.xs.push(xa + u * len);
    line.ys.push(mid + ys[i]!);
  }
  return line;
}

/** The bar: the bead on a thread with fixed ends. Listening plucks it, thinking slides and turns the bead, speaking sends waves out. */
export function drawStringBar(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
  const { state, t } = f;
  const dir = f.rtl ? -1 : 1;
  const outer = 0.25 * h;
  const prop = beadProportions(outer);
  const thread = Math.max(1.25, prop.thread);
  const gap = Math.max(0.9, prop.gap);
  const xa = 0.1 * h + thread / 2;
  const len = w - 0.2 * h - thread;
  const mid = h / 2;
  const M = Math.max(48, Math.min(220, Math.round(len / 2.2)));
  const ys: number[] = new Array(M + 1).fill(0);
  let ub = 0.5;
  let sc = 1;
  let turn = 1;
  const p = f.palette;
  if (state === "idle") sc = 1 + 0.035 * Math.sin((TAU * t) / 5);
  else if (state === "listening") {
    // Standing waves with fixed ends; a soft limit keeps the bead and the thread inside the box.
    const amp = (0.34 * h * f.level(0)) / 1.35;
    const c1 = Math.sin(TAU * 2.1 * t);
    const c2 = Math.sin(TAU * 3.3 * t + 1.1);
    const c3 = Math.sin(TAU * 4.6 * t + 2.3);
    const c4 = Math.sin(TAU * 5.9 * t + 0.7);
    const lim = 0.4 * h;
    const blim = 0.22 * h;
    for (let i = 0; i <= M; i++) {
      const u = dir === 1 ? i / M : 1 - i / M;
      const y = amp * (Math.sin(Math.PI * u) * c1 + 0.55 * Math.sin(2 * Math.PI * u) * c2 + 0.35 * Math.sin(3 * Math.PI * u) * c3 + 0.22 * Math.sin(4 * Math.PI * u) * c4);
      ys[i] = lim * Math.tanh(y / lim);
    }
    const yc = sampleAt(ys, 0.5);
    const fix = blim * Math.tanh(yc / blim) - yc;
    for (let i = 0; i <= M; i++) ys[i]! += fix * Math.sin((Math.PI * i) / M);
  } else if (state === "thinking") {
    // The bead slides along the thread, turning as it goes; the thread dips under it.
    const sw = Math.sin((TAU * t) / 3.4);
    ub = 0.5 + dir * 0.22 * sw;
    for (let i = 0; i <= M; i++) {
      const u = i / M;
      ys[i] = 0.07 * h * (u < ub ? u / ub : (1 - u) / (1 - ub));
    }
    turn = Math.cos(3.4 * sw);
  } else if (state === "speaking") {
    // Waves leave the bead for both ends; the bead pulses with the level.
    for (let i = 0; i <= M; i++) {
      const u = i / M;
      const d = Math.abs(u - 0.5) * 2;
      const env = Math.sin(Math.PI * u) ** 0.6 * smoothstep(0.16, 0.36, d);
      ys[i] = 0.2 * h * f.level(d * 0.4) * env * Math.sin(TAU * (2.4 * t - 1.7 * d));
    }
    sc = 1 + 0.16 * f.level(0);
  } else if (state === "muted") {
    // Slack: no tension, no sound.
    for (let i = 0; i <= M; i++) ys[i] = 0.16 * h * Math.sin((Math.PI * i) / M);
  } else if (state === "error") {
    // Snapped beside the bead: both free ends hang.
    for (let i = 0; i <= M; i++) {
      const u = i / M;
      if (u <= 0.5) ys[i] = 0.08 * h * (u / 0.5);
      else if (u <= 0.69) ys[i] = 0.08 * h + 0.24 * h * ((u - 0.5) / 0.19) ** 2;
      else if (u >= 0.8) ys[i] = 0.27 * h * ((1 - u) / 0.2) ** 2;
    }
    const left = threadLine(xa, len, mid, ys, 0, 0.69);
    strokeThread(ctx, left, thread, p.main, p.lineAlpha);
    strokeThread(ctx, threadLine(xa, len, mid, ys, 0.8, 1), thread, p.main, p.lineAlpha);
    beadOnThread(ctx, scratch, left, xa + 0.5 * len, mid + sampleAt(ys, 0.5), outer, prop.inner, 1, thread, gap, p.main);
    return;
  }
  const line = threadLine(xa, len, mid, ys);
  strokeThread(ctx, line, thread, p.main, p.lineAlpha);
  beadOnThread(ctx, scratch, line, xa + ub * len, mid + sampleAt(ys, ub), outer * sc, prop.inner * sc, turn, thread, gap, p.main);
}

/** The square form for small sizes: the logo itself, alive. */
export function drawStringSquare(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
  const S = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const { state, t } = f;
  const outer = 0.335 * S;
  const prop = beadProportions(outer);
  const thread = Math.max(1.2, prop.thread);
  const gap = Math.max(0.8, prop.gap);
  const xa = cx - 0.47 * S + thread / 2;
  const xb = cx + 0.47 * S - thread / 2;
  const len = xb - xa;
  const M = 40;
  const ys: number[] = new Array(M + 1).fill(0);
  let sc = 1;
  let turn = 1;
  const p = f.palette;
  if (state === "idle") sc = 1 + 0.03 * Math.sin((TAU * t) / 5);
  else if (state === "listening") {
    const by = 0.17 * S * f.level(0) * Math.sin(TAU * 2.2 * t + 0.4);
    for (let i = 0; i <= M; i++) ys[i] = by * Math.sin((Math.PI * i) / M);
    sc = 1 + 0.06 * f.level(0);
  } else if (state === "thinking") {
    turn = Math.cos(((f.rtl ? -1 : 1) * TAU * t) / 2.4);
  } else if (state === "speaking") {
    // The bead pulses and rings: a thin ring leaves it every 0.6 s, thinning as it grows.
    sc = 1 + 0.09 * f.level(0);
    const ph = ((t / 0.6) % 1 + 1) % 1;
    const rr = outer * (1.08 + ((0.49 * S) / outer - 1.08) * easeOutCubic(ph));
    const lw = Math.max(0.6, thread * 0.55) * (1 - ph) * (0.4 + 0.6 * f.level(ph * 0.6));
    if (lw > 0.15) {
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, TAU);
      ctx.lineWidth = lw;
      ctx.strokeStyle = p.main;
      ctx.stroke();
    }
  } else if (state === "muted") {
    for (let i = 0; i <= M; i++) ys[i] = 0.11 * S * Math.sin((Math.PI * i) / M);
  } else if (state === "error") {
    // Snapped: only the far anchor stays at its height; the bead and its thread have dropped and tipped.
    const anchor: Polyline = { xs: [cx + 0.405 * S, xb], ys: [cy - 0.05 * S, cy - 0.05 * S] };
    strokeThread(ctx, anchor, thread, p.main, p.lineAlpha);
    const ang = 0.3;
    const bx = cx - 0.03 * S;
    const by = cy + 0.06 * S;
    const piece: Polyline = {
      xs: [bx - 0.43 * S * Math.cos(ang), bx + outer * 0.86 * Math.cos(ang)],
      ys: [by - 0.43 * S * Math.sin(ang), by + outer * 0.86 * Math.sin(ang)],
    };
    strokeThread(ctx, piece, thread, p.main, p.lineAlpha);
    beadOnThread(ctx, scratch, piece, bx, by, outer, prop.inner, 1, thread, gap, p.main);
    return;
  }
  const line = threadLine(xa, len, cy, ys);
  strokeThread(ctx, line, thread, p.main, p.lineAlpha);
  beadOnThread(ctx, scratch, line, cx, cy + sampleAt(ys, 0.5), outer * sc, prop.inner * sc, turn, thread, gap, p.main);
}

