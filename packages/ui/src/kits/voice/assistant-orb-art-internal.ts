import * as React from "react";
import { resolveCssColor } from "../../lib/css-color";
import { clamp } from "../../lib/math";
import { effectiveLevel, orbStillLevel, orbStringForm, smoothLevel, type AssistantOrbState, type OrbArtVariant } from "../../lib/orb";
import {
  INK_THRESHOLD,
  beadProportions,
  catmullRom,
  easeInOutCubic,
  easeOutCubic,
  graphCount,
  graphLinked,
  graphWalker,
  halftonePitch,
  halftoneRings,
  HALFTONE_DOT,
  HALFTONE_HUB,
  hash01,
  inkField,
  inkFieldAt,
  inkScene,
  INK_REACH,
  malaAngle,
  malaCount,
  malaPose,
  orbGraph,
  ringsLayout,
  smoothstep,
  traceIso,
  type InkPeak,
  type OrbLevelAt,
} from "../../lib/orb-art-internal";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { createFrameLoop, type FrameLoop, type OrbVisibility } from "./assistant-orb-internal";

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/** Colours of the ink looks, resolved from the theme tokens (canvas cannot read `var()`). */
export interface OrbArtPalette {
  /** The paper style: one ink everywhere, told apart by shape. */
  paper: boolean;
  /** A dark surface: dot sizes follow light, overlapping colour adds up. */
  dark: boolean;
  /** The main ink: the foreground in paper, `--primary` in colour, `--destructive` for an error, `--muted-foreground` muted. */
  main: string;
  /** A second hue (`--chart-6` in colour). */
  second: string;
  /** A third hue (`--chart-2` in colour). */
  third: string;
  /** Opacity of the thread lines: 1 in paper (flat ink), lighter in colour so the beads stand out. */
  lineAlpha: number;
}

const FALLBACK = "gray";

/**
 * Reads the palette for a state from the element's theme: paper (a `data-style="paper"` ancestor) is the foreground ink
 * alone; the stock look uses the primary and chart hues; an error is `--destructive` and muted is `--muted-foreground` in
 * every style. A token that still holds `var()` after resolving (a `color-mix`) is resolved by the browser on a probe.
 */
export function readOrbArtPalette(el: Element, state: AssistantOrbState): OrbArtPalette {
  const style = getComputedStyle(el);
  let probe: HTMLElement | null = null;
  const token = (name: string) => {
    const value = resolveCssColor(`var(${name})`, style);
    if (!value || value.startsWith("var(")) return FALLBACK;
    if (!value.includes("var(")) return value;
    if (!probe && typeof document !== "undefined") {
      probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.display = "none";
      el.appendChild(probe);
    }
    if (!probe) return FALLBACK;
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color || FALLBACK;
  };
  const paper = el.closest("[data-style]")?.getAttribute("data-style") === "paper";
  const dark = Boolean(el.closest('.dark, [data-theme="dark"]'));
  let main: string, second: string, third: string;
  if (state === "error") main = second = third = token("--destructive");
  else if (state === "muted") main = second = third = token("--muted-foreground");
  else if (paper) main = second = third = token("--foreground");
  else {
    main = token("--primary");
    second = token("--chart-6");
    third = token("--chart-2");
  }
  (probe as HTMLElement | null)?.remove();
  return { paper, dark, main, second, third, lineAlpha: paper ? 1 : dark ? 0.6 : 0.45 };
}

/* ------------------------------------------------------------------ */
/* Level history (for delays: per bead, per ring, per wave)            */
/* ------------------------------------------------------------------ */

const HISTORY = 128;

/** The smoothed level of the last second or so, so a renderer can read the level of a moment ago. */
export class LevelHistory {
  private times = new Float64Array(HISTORY);
  private values = new Float32Array(HISTORY);
  private head = 0;
  private size = 0;
  push(t: number, value: number): void {
    this.times[this.head] = t;
    this.values[this.head] = value;
    this.head = (this.head + 1) % HISTORY;
    this.size = Math.min(HISTORY, this.size + 1);
  }
  /** The level at time `t`, linearly between samples; before the oldest sample it is the oldest, after the newest the newest. */
  at(t: number): number {
    if (!this.size) return 0;
    let newer = (this.head - 1 + HISTORY) % HISTORY;
    if (t >= this.times[newer]!) return this.values[newer]!;
    for (let k = 1; k < this.size; k++) {
      const older = (this.head - 1 - k + HISTORY * 2) % HISTORY;
      if (this.times[older]! <= t) {
        const t0 = this.times[older]!;
        const t1 = this.times[newer]!;
        const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
        return this.values[older]! + (this.values[newer]! - this.values[older]!) * f;
      }
      newer = older;
    }
    return this.values[newer]!;
  }
  clear(): void {
    this.size = 0;
    this.head = 0;
  }
}

/* ------------------------------------------------------------------ */
/* One frame                                                           */
/* ------------------------------------------------------------------ */

/** What a renderer draws from. */
export interface ArtFrame {
  state: AssistantOrbState;
  /** Seconds on the look's clock (a fixed time per state for a still pose). */
  t: number;
  still: boolean;
  /** The level the state shows `back` seconds ago (0 to 1, the state's gain applied). */
  level: OrbLevelAt;
  /** Recent loud moments (for the ink drop's spatter). */
  peaks: readonly InkPeak[];
  palette: OrbArtPalette;
  /** Right-to-left: travelling motion runs the other way (the bead art itself is not mirrored). */
  rtl: boolean;
}

/** Per-instance scratch: the layer the ring bead is cut on and the ink field buffer. */
export interface ArtScratch {
  dpr: number;
  layer?: HTMLCanvasElement;
  layerCtx?: CanvasRenderingContext2D | null;
  field?: Float32Array;
  fieldSize?: number;
}

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

/* ------------------------------------------------------------------ */
/* The Sutra bead on a thread                                          */
/* ------------------------------------------------------------------ */

/** A polyline: x and y of each point. */
interface Polyline {
  xs: number[];
  ys: number[];
  closed?: boolean;
}

function trace(ctx: CanvasRenderingContext2D, line: Polyline): void {
  ctx.beginPath();
  for (let i = 0; i < line.xs.length; i++) {
    if (i) ctx.lineTo(line.xs[i]!, line.ys[i]!);
    else ctx.moveTo(line.xs[i]!, line.ys[i]!);
  }
  if (line.closed) ctx.closePath();
}

function strokeThread(ctx: CanvasRenderingContext2D, line: Polyline, width: number, color: string, alpha: number): void {
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
function beadOnThread(
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

/* ------------------------------------------------------------------ */
/* mala                                                                */
/* ------------------------------------------------------------------ */

function drawMala(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
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
function drawStringBar(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
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
function drawStringSquare(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
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

/* ------------------------------------------------------------------ */
/* ink                                                                 */
/* ------------------------------------------------------------------ */

function drawInk(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame, scratch: ArtScratch): void {
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

/* ------------------------------------------------------------------ */
/* rings                                                               */
/* ------------------------------------------------------------------ */

function drawRings(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame): void {
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

/* ------------------------------------------------------------------ */
/* graph                                                               */
/* ------------------------------------------------------------------ */

function drawGraph(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame): void {
  const S = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const { state: s, t } = f;
  const p = f.palette;
  const graph = orbGraph(graphCount(S));
  const N = graph.points.length;
  const l0 = f.level(0);
  const spin = s === "error" || s === "muted" ? 0.9 : (f.rtl ? -1 : 1) * TAU * (s === "thinking" ? 0.06 : 0.045) * t;
  const ct = Math.cos(0.42);
  const st = Math.sin(0.42);
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  const Rs = 0.4 * S * (1 + (s === "listening" ? 0.05 * l0 : s === "speaking" ? 0.035 * l0 : 0) + (s === "idle" ? 0.012 * Math.sin((TAU * t) / 5.5) : 0));
  const X = new Float32Array(N + 1);
  const Y = new Float32Array(N + 1);
  const Z = new Float32Array(N + 1);
  const E = new Float32Array(N + 1);
  for (let i = 0; i < N; i++) {
    const q = graph.points[i]!;
    const x1 = q[0] * cs + q[2] * sn;
    const z1 = -q[0] * sn + q[2] * cs;
    const y2 = q[1] * ct - z1 * st;
    const z2 = q[1] * st + z1 * ct;
    const k = 4 / (4 - z2); // mild perspective: the near side a little larger
    X[i] = cx + x1 * Rs * k;
    Y[i] = cy - y2 * Rs * k;
    Z[i] = (z2 + 1) / 2; // 0 at the back, 1 at the front
    if (s === "error" && hash01(i, 51) < 0.22) Y[i]! += S * (0.05 + 0.06 * hash01(i, 52)); // knocked loose
  }
  // The hub: the centre of the sphere, half way back, pulsing with the level while listening and speaking.
  X[N] = cx;
  Y[N] = cy;
  Z[N] = 0.5;
  if (s === "listening" || s === "speaking") E[N] = l0;
  if (s === "listening") {
    for (let i = 0; i < N; i++) E[i] = f.level(0.015 * (i % 6)) * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * (0.9 + 1.6 * hash01(i, 41)) * t + TAU * hash01(i, 42))));
  } else if (s === "speaking") {
    for (let i = 0; i < N; i++) {
      const rho = Math.hypot(X[i]! - cx, Y[i]! - cy) / Rs;
      E[i] = f.level(rho * 0.3) * (0.5 + 0.5 * Math.cos(TAU * (rho * 1.3 - 1.5 * t))) ** 3;
    }
  }
  const r0 = Math.max(1.1, S * 0.017);
  const ew = Math.max(0.75, S * 0.005);
  const hot = new Set<number>();
  if (!p.paper && p.dark) ctx.globalCompositeOperation = "lighter";
  if (s !== "muted") {
    ctx.strokeStyle = p.main;
    const link = (a: number, b: number) => {
      const fz = (Z[a]! + Z[b]!) / 2;
      ctx.globalAlpha = (0.12 + 0.6 * fz * fz) * (s === "thinking" ? 0.7 : 1);
      ctx.lineWidth = ew * (1 + 1.3 * ((E[a]! + E[b]!) / 2));
      ctx.beginPath();
      if (s === "error") {
        // Broken links: only stubs are left at both ends.
        ctx.moveTo(X[a]!, Y[a]!);
        ctx.lineTo(X[a]! + (X[b]! - X[a]!) * 0.3, Y[a]! + (Y[b]! - Y[a]!) * 0.3);
        ctx.moveTo(X[b]!, Y[b]!);
        ctx.lineTo(X[b]! + (X[a]! - X[b]!) * 0.3, Y[b]! + (Y[a]! - Y[b]!) * 0.3);
      } else {
        ctx.moveTo(X[a]!, Y[a]!);
        ctx.lineTo(X[b]!, Y[b]!);
      }
      ctx.stroke();
    };
    for (const [a, b] of graph.edges) link(a, b);
    for (const sp of graph.spokes) link(N, sp);
  }
  if (s === "thinking") {
    // Signals leave the hub along a spoke and hop through the graph, lighting the link they take.
    const hop = 0.34;
    ctx.strokeStyle = p.third;
    ctx.fillStyle = p.third;
    for (let k = 0; k < 3; k++) {
      const tt = t + k * 0.41;
      const hh = Math.floor(tt / hop);
      const fr = easeInOutCubic(smoothstep(0.12, 1, tt / hop - hh));
      const n0 = graphWalker(graph, k, hh - 1, true);
      const n1 = graphWalker(graph, k, hh, true);
      const n2 = graphWalker(graph, k, hh + 1, true);
      if (graphLinked(graph, n0, n1)) {
        ctx.globalAlpha = (0.25 + 0.5 * Z[n1]!) * (1 - fr);
        ctx.lineWidth = ew * 1.8;
        ctx.beginPath();
        ctx.moveTo(X[n0]!, Y[n0]!);
        ctx.lineTo(X[n1]!, Y[n1]!);
        ctx.stroke();
      }
      let sx = X[n1]!;
      let sy = Y[n1]!;
      let sz = Z[n1]!;
      if (graphLinked(graph, n1, n2)) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.max(Z[n1]!, Z[n2]!);
        ctx.lineWidth = ew * 2.2;
        ctx.beginPath();
        ctx.moveTo(X[n1]!, Y[n1]!);
        ctx.lineTo(X[n2]!, Y[n2]!);
        ctx.stroke();
        sx += (X[n2]! - X[n1]!) * fr;
        sy += (Y[n2]! - Y[n1]!) * fr;
        sz += (Z[n2]! - Z[n1]!) * fr;
        hot.add(n2);
      }
      hot.add(n1);
      ctx.globalAlpha = 0.45 + 0.55 * sz;
      ctx.beginPath();
      ctx.arc(sx, sy, r0 * (1.15 + 0.75 * sz), 0, TAU);
      ctx.fill();
    }
  }
  // Nodes back to front: nearer is larger and darker. The hub is a little bigger than the nearest dots.
  const order = Array.from({ length: N + 1 }, (_, i) => i).sort((a, b) => Z[a]! - Z[b]!);
  for (const i of order) {
    const z = Z[i]!;
    const e = E[i]!;
    let r: number;
    if (i === N) {
      r = r0 * (s === "muted" ? 0.95 : 1.32) * (1 + 0.6 * e) * (s === "idle" ? 1 + 0.05 * Math.sin((TAU * t) / 5.5) : 1);
      ctx.globalAlpha = s === "muted" ? 0.75 : 1;
      ctx.fillStyle = hot.has(i) ? p.third : p.main;
    } else {
      r = r0 * (0.5 + 0.55 * z) * (1 + 0.9 * e) * (s === "muted" ? 0.72 : s === "thinking" && !hot.has(i) ? 0.85 : 1);
      ctx.globalAlpha = s === "muted" ? 0.3 + 0.55 * z : 0.28 + 0.72 * z;
      ctx.fillStyle = e > 0.35 || hot.has(i) ? p.third : z < 0.42 ? p.second : p.main;
    }
    ctx.beginPath();
    ctx.arc(X[i]!, Y[i]!, r, 0, TAU);
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ */
/* halftone                                                            */
/* ------------------------------------------------------------------ */

function drawHalftone(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame): void {
  const S = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const { state: s, t } = f;
  const p = f.palette;
  const P = halftonePitch(S);
  const l0 = f.level(0);
  const R = 0.43 * S * (s === "speaking" ? 1 + 0.04 * l0 : 1) * (s === "idle" ? 1 + 0.012 * Math.sin((TAU * t) / 5.5) : 1);
  const rings = halftoneRings(R, P);
  // Colour: two screens overprinted (the main hue and the third, lit from different sides). Paper, error, muted: one ink.
  const screens = !p.paper && s !== "error" && s !== "muted" ? [{ color: p.main, lo: 0, gain: 1, turn: 0 }, { color: p.third, lo: 2.2, gain: 0.8, turn: Math.PI / 6 }] : [{ color: p.main, lo: 0, gain: 1, turn: 0 }];
  if (screens.length > 1) ctx.globalCompositeOperation = p.dark ? "screen" : "multiply";
  const cuts = [-R / 3, R / 3];
  const shift = [-0.1, 0.08, -0.04];
  screens.forEach((sc, si) => {
    let a: number;
    let e: number;
    if (s === "thinking") {
      a = (TAU * t) / 2.8 - 2.3 + sc.lo;
      e = 0.86;
    } else if (s === "idle") {
      a = -2.3 + 0.45 * Math.sin((TAU * t) / 7.2) + sc.lo;
      e = 0.62;
    } else {
      a = -2.3 + sc.lo;
      e = 0.62;
    }
    const lx = Math.cos(a) * e;
    const ly = Math.sin(a) * e;
    const lz = Math.sqrt(1 - e * e);
    const cover = (x: number, y: number) => {
      const rho = Math.min(0.999, Math.hypot(x, y) / R);
      const nz = Math.sqrt(1 - rho * rho);
      const lam = Math.max(0, (x / R) * lx + (y / R) * ly + nz * lz);
      let v = s === "muted" ? 0.16 : p.dark ? 0.08 + 0.9 * lam : 0.08 + 0.9 * (1 - lam);
      if (s === "listening") v += f.level((1 - rho) * 0.3) * 0.45 * Math.sin(TAU * (rho * 1.6 + 1.1 * t)) * (0.45 + 0.55 * rho);
      else if (s === "speaking") v += f.level(rho * 0.35) * 0.85 * (0.5 + 0.5 * Math.cos(TAU * (rho * 1.2 - 1.4 * t))) ** 3;
      return clamp(v * sc.gain, 0, 1);
    };
    const dot = (x: number, y: number, r: number) => {
      let dx = 0;
      if (s === "error") {
        // Torn into three bands that slipped sideways (whole dots move; none is cut).
        if (Math.abs(y - cuts[0]!) < P * 0.3 || Math.abs(y - cuts[1]!) < P * 0.3) return;
        dx = shift[y < cuts[0]! ? 0 : y < cuts[1]! ? 1 : 2]! * R;
      }
      ctx.moveTo(cx + x + dx + r, cy + y);
      ctx.arc(cx + x + dx, cy + y, r, 0, TAU);
    };
    ctx.fillStyle = sc.color;
    ctx.beginPath();
    for (const ring of rings) {
      for (let q = 0; q < ring.count; q++) {
        const an = ring.offset + sc.turn + (q / ring.count) * TAU;
        const x = Math.cos(an) * ring.radius;
        const y = Math.sin(an) * ring.radius;
        const r = HALFTONE_DOT * P * Math.sqrt(cover(x, y));
        if (r >= 0.35) dot(x, y, r);
      }
    }
    // The centre dot: a little bigger than any other, pulsing with the level while listening and speaking.
    if (si === 0) {
      const lv = s === "listening" || s === "speaking" ? l0 : 0;
      dot(0, 0, P * (s === "muted" ? 0.3 : HALFTONE_HUB) * (1 + 0.22 * lv) * (s === "idle" ? 1 + 0.03 * Math.sin((TAU * t) / 5.5) : 1));
    }
    ctx.fill();
  });
}

/* ------------------------------------------------------------------ */
/* The hook                                                            */
/* ------------------------------------------------------------------ */

const clampLevel = (level: number | undefined) => (typeof level === "number" && Number.isFinite(level) ? clamp(level, 0, 1) : 0);

/** Pixel ratio cap of the ink looks (they redraw every frame; 2 is crisp and keeps the fill cost down). */
export const ART_MAX_DPR = 2;

/**
 * Runs an ink look on a canvas: sizes it with a ResizeObserver (pixel ratio capped), re-reads the palette when the theme
 * or the state changes, keeps a short history of the smoothed level (for per-bead, per-ring and per-wave delays) and the
 * loud moments, and draws from one frame loop that runs only while the element is on screen, not paused and motion is
 * allowed. The first frame is the still pose of the state; under reduced motion that pose is all there is (no frame is
 * ever requested) and it is redrawn when the state or the theme changes.
 */
export function useOrbArtCanvas(
  rootRef: React.RefObject<HTMLElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  {
    variant,
    state,
    level,
    paused,
    reduced,
    rtl,
    visible,
  }: { variant: OrbArtVariant; state: AssistantOrbState; level: number | undefined; paused: boolean; reduced: boolean; rtl: boolean; visible: OrbVisibility }
): void {
  const target = React.useRef(0);
  const latest = useLatestRef({ state, variant });
  const loopRef = React.useRef<FrameLoop | null>(null);
  const redrawRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = { width: 0, height: 0 };
    const scratch: ArtScratch = { dpr: 1 };
    const history = new LevelHistory();
    const peaks: { t: number; id: number }[] = [];
    let peakId = 0;
    let lastPeak = -1e9;
    let palette = readOrbArtPalette(root, latest.current.state);
    let paletteState = latest.current.state;
    // The clock starts at the still time of the state, so the first frame is that pose and the motion carries on from it.
    const clock = { t: artStillTime(latest.current.variant, latest.current.state), level: 0 };
    // Until the loop has run a frame there is no live level: draw the still pose (also when paused or off screen).
    let live = false;

    const draw = (still: boolean) => {
      const { state: s, variant: v } = latest.current;
      if (s !== paletteState) {
        palette = readOrbArtPalette(root, s);
        paletteState = s;
      }
      const t = still ? artStillTime(v, s, size.width, size.height) : clock.t;
      const stillLevel = orbStillLevel(s);
      const frame: ArtFrame = {
        state: s,
        t,
        still,
        level: still ? () => stillLevel : (back = 0) => effectiveLevel(s, history.at(clock.t - back)),
        peaks: still ? (s === "speaking" ? [{ age: 0.24, id: 5 }] : []) : peaks.map((pk) => ({ age: clock.t - pk.t, id: pk.id })),
        palette,
        rtl,
      };
      ctx.setTransform(scratch.dpr, 0, 0, scratch.dpr, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      if (size.width < 2 || size.height < 2) return;
      drawOrbArt(ctx, v, size.width, size.height, frame, scratch);
    };
    const still = () => reduced || !live;
    redrawRef.current = () => draw(still());

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(ART_MAX_DPR, window.devicePixelRatio || 1);
      size.width = rect.width;
      size.height = rect.height;
      scratch.dpr = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      draw(still());
    };
    resize();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(root);
    }
    let mo: MutationObserver | undefined;
    if (typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => {
        palette = readOrbArtPalette(root, latest.current.state);
        draw(still());
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-style", "data-theme", "data-brand", "data-neutral"] });
    }

    let loop: FrameLoop | undefined;
    if (!reduced) {
      loop = createFrameLoop(
        (dt) => {
          clock.t += dt;
          live = true;
          const before = clock.level;
          clock.level = smoothLevel(clock.level, target.current, dt);
          history.push(clock.t, clock.level);
          if (before < 0.5 && clock.level >= 0.5 && clock.t - lastPeak >= 0.42) {
            lastPeak = clock.t;
            peaks.push({ t: clock.t, id: ++peakId });
          }
          while (peaks.length && clock.t - peaks[0]!.t > 0.8) peaks.shift();
          draw(false);
          return true;
        },
        () => !paused && visible.current
      );
      loopRef.current = loop;
      const wake = () => loop!.wake();
      visible.wake.add(wake);
      loop.wake();
      return () => {
        visible.wake.delete(wake);
        loop!.stop();
        loopRef.current = null;
        ro?.disconnect();
        mo?.disconnect();
      };
    }
    return () => {
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [rootRef, canvasRef, latest, reduced, paused, rtl, visible]);

  React.useEffect(() => {
    target.current = clampLevel(level);
    loopRef.current?.wake();
    // A frozen or still look has no loop: redraw so a new state or variant shows at once.
    if (reduced || paused) redrawRef.current();
  }, [state, variant, level, paused, reduced]);
}
