/**
 * Pure geometry for the ink looks of the assistant orb (`kits/voice/assistant-orb`, variants mala, string, ink, rings,
 * graph and halftone): seeded layouts, the pose of each state and the iso-line tracer of the ink drop. No DOM and no
 * canvas: the renderers in `assistant-orb-art-internal` read these numbers, and the tests check them directly.
 */
import { clamp } from "./math";
import type { AssistantOrbState } from "./orb";

const TAU = Math.PI * 2;

/** A stable number in [0, 1) for an integer pair: a 32-bit integer mix, so every engine gives the same layout. */
export function hash01(i: number, seed: number): number {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((seed | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Hermite step from 0 at `e0` to 1 at `e1`. */
export function smoothstep(e0: number, e1: number, x: number): number {
  const k = clamp((x - e0) / (e1 - e0), 0, 1);
  return k * k * (3 - 2 * k);
}

/** Cubic ease in and out on 0..1. */
export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Cubic ease out on 0..1. */
export function easeOutCubic(x: number): number {
  return 1 - (1 - x) ** 3;
}

/** Catmull-Rom interpolation between `p1` and `p2` (t 0..1), with `p0` and `p3` as the neighbours. */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** The level a state shows `back` seconds ago, already scaled by the state's gain. */
export type OrbLevelAt = (back?: number) => number;

/* ------------------------------------------------------------------ */
/* The Sutra bead (the brand mark's proportions)                       */
/* ------------------------------------------------------------------ */

/** Inner radius, thread width and paper gap of a ring bead of outer radius `outer` (the mark: 19, 8, 4.4 and 2.4). */
export function beadProportions(outer: number): { inner: number; thread: number; gap: number } {
  return { inner: (outer * 8) / 19, thread: (outer * 4.4) / 19, gap: (outer * 2.4) / 19 };
}

/* ------------------------------------------------------------------ */
/* Mala: beads on a closed thread                                      */
/* ------------------------------------------------------------------ */

/** How many beads the mala has at a size: 12 from 64 px, 8 larger ones below (so a 32 px mala is beads, not dots). */
export function malaCount(size: number): number {
  return size < 64 ? 8 : 12;
}

/**
 * The angle of bead `u` (0 is the head bead at the top; fractions interpolate) on a mala of `n` beads. The head bead's
 * neighbours sit a little further away than the others are from each other, so it has room.
 */
export function malaAngle(u: number, n: number): number {
  const gap = (TAU / n) * 1.167;
  const step = (TAU - 2 * gap) / (n - 2);
  if (u <= 1) return -Math.PI / 2 + u * gap;
  if (u >= n - 1) return -Math.PI / 2 + TAU - (n - u) * gap;
  return -Math.PI / 2 + gap + (u - 1) * step;
}

/** Per bead: how far it moves out (a share of the size) and its scale. */
export interface MalaPose {
  offset: number[];
  scale: number[];
}

/** Band weights of the listening equaliser, by distance from the head bead. */
const MALA_BANDS = [0.3, 0.55, 1, 0.92, 0.8, 0.66, 0.52];

/**
 * The pose of every bead of an `n`-bead mala in a state at time `t`. Idle: a slow swell travels around. Listening: an
 * equaliser (each left and right pair of beads is a band). Thinking: one bead at a time is counted (it steps out and
 * grows; the others shrink). Speaking: pulses run down both sides from the head bead. `dir` -1 runs the travel the other
 * way round (right-to-left).
 */
export function malaPose(state: AssistantOrbState, t: number, level: OrbLevelAt, n: number, dir: 1 | -1 = 1): MalaPose {
  const offset: number[] = [];
  const scale: number[] = [];
  for (let i = 0; i < n; i++) {
    offset.push(0);
    scale.push(1);
  }
  // In right-to-left the bead at index i plays the part of bead n - i.
  const slot = (i: number) => (dir === 1 ? i : (n - i) % n);
  switch (state) {
    case "idle":
      for (let i = 1; i < n; i++) {
        let w = 0.5 + 0.5 * Math.sin(TAU * (t / 6 - slot(i) / n));
        w = w * w * w;
        scale[i] = 1 + 0.17 * w;
        offset[i] = 0.012 * w;
      }
      scale[0] = 1 + 0.035 * Math.sin((TAU * t) / 6);
      break;
    case "listening":
      for (let i = 0; i < n; i++) {
        const k = Math.min(i, n - i);
        const side = slot(i) > n / 2 ? 1 : 0;
        const n1 = 0.5 + 0.5 * Math.sin(TAU * (1.1 + 0.37 * k) * t + k * 1.9 + side * 0.9);
        const n2 = 0.5 + 0.5 * Math.sin(TAU * (0.55 + 0.23 * k) * t + k * 0.7 + side * 1.6);
        const b = level(0.018 * k) * MALA_BANDS[Math.min(k, MALA_BANDS.length - 1)]! * (0.12 + 0.88 * n1 * (0.45 + 0.55 * n2));
        offset[i] = 0.13 * b;
        scale[i] = 1 + 0.42 * b;
      }
      break;
    case "thinking": {
      const c = t / 0.36;
      const whole = Math.floor(c);
      const pos = (whole + easeInOutCubic(smoothstep(0.32, 1, c - whole))) % n;
      for (let i = 0; i < n; i++) {
        let d = Math.abs(slot(i) - pos);
        d = Math.min(d, n - d);
        const w = smoothstep(0, 1, 1 - d);
        scale[i] = 0.56 + 1.04 * w;
        offset[i] = 0.035 * w;
      }
      const w0 = smoothstep(0, 1, 1 - Math.min(pos, n - pos));
      scale[0] = 1 + 0.1 * w0;
      offset[0] = 0.02 * w0;
      break;
    }
    case "speaking":
      for (let i = 0; i < n; i++) {
        const k = Math.min(i, n - i);
        const a = level(k * 0.075);
        const wave = 0.5 + 0.5 * Math.cos(TAU * (t * 1.7 - k * 0.17));
        offset[i] = 0.1 * a * wave;
        scale[i] = 1 + 0.38 * a * wave;
      }
      scale[0] = 1 + 0.2 * level(0);
      offset[0] = 0.012 * level(0);
      break;
    case "muted":
      for (let i = 1; i < n; i++) scale[i] = 0.92;
      break;
    default:
      break;
  }
  return { offset, scale };
}

/* ------------------------------------------------------------------ */
/* Thread rings                                                        */
/* ------------------------------------------------------------------ */

/** The loops of the rings look at a size: their radii (shares of the size) and the line width in px (2 at 32, 7 at 240). */
export function ringsLayout(size: number): { radii: number[]; line: number } {
  const radii = size >= 120 ? [0.17, 0.28, 0.39] : [0.2, 0.37];
  return { radii, line: clamp((size * 7) / 240, 2, 7) };
}

/* ------------------------------------------------------------------ */
/* Dot graph: a Fibonacci sphere with a sparse seeded graph            */
/* ------------------------------------------------------------------ */

/** Points on the unit sphere, the edges between near neighbours and who neighbours whom. */
export interface OrbGraph {
  points: readonly (readonly [number, number, number])[];
  edges: readonly (readonly [number, number])[];
  adjacency: readonly (readonly number[])[];
  /** Surface nodes joined to the hub at the centre. */
  spokes: readonly number[];
}

const graphs = new Map<number, OrbGraph>();

/** How many nodes the graph has at a size (72, 46 or 26). */
export function graphCount(size: number): number {
  return size >= 120 ? 72 : size >= 64 ? 46 : 26;
}

/**
 * `n` points evenly spread on a sphere (a Fibonacci lattice) and a sparse, seeded graph between them: every point joins
 * its nearest neighbour, about half also the second nearest and a quarter a third or fourth one, so nothing is left
 * alone. Five spokes join the hub at the centre. The same `n` always gives the same graph (it is computed once).
 */
export function orbGraph(n: number): OrbGraph {
  const count = Math.max(4, Math.round(n));
  const cached = graphs.get(count);
  if (cached) return cached;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: [number, number, number][] = [];
  const adjacency: number[][] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    points.push([Math.cos(i * golden) * r, y, Math.sin(i * golden) * r]);
    adjacency.push([]);
  }
  const edges: [number, number][] = [];
  const seen = new Set<number>();
  const link = (a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = lo * 4096 + hi;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([lo, hi]);
    adjacency[lo]!.push(hi);
    adjacency[hi]!.push(lo);
  };
  for (let i = 0; i < count; i++) {
    const near: [number, number][] = [];
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const dx = points[i]![0] - points[j]![0];
      const dy = points[i]![1] - points[j]![1];
      const dz = points[i]![2] - points[j]![2];
      near.push([dx * dx + dy * dy + dz * dz, j]);
    }
    near.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    link(i, near[0]![1]);
    if (hash01(i * 7 + 1, 21) < 0.55) link(i, near[1]![1]);
    if (hash01(i * 7 + 2, 21) < 0.25) link(i, near[2 + Math.floor(hash01(i, 22) * 2)]![1]);
  }
  const spokes = Array.from({ length: 5 }, (_, k) => Math.round(((k + 0.5) * count) / 5) % count);
  const graph: OrbGraph = { points, edges, adjacency, spokes };
  graphs.set(count, graph);
  return graph;
}

/**
 * Where thinking signal `walker` is after `hop` hops: a seeded random walk that starts again every 9 hops (so it never
 * needs a long history). With `hub`, every walk starts at the hub (index `points.length`) and leaves along a spoke.
 */
export function graphWalker(graph: OrbGraph, walker: number, hop: number, hub: boolean): number {
  const n = graph.points.length;
  const cycle = Math.floor(hop / 9);
  const k = hop - cycle * 9;
  if (hub && k === 0) return n;
  let cur = hub
    ? graph.spokes[Math.floor(hash01(cycle * 13 + walker * 101, 31) * graph.spokes.length)]!
    : Math.floor(hash01(cycle * 13 + walker * 101, 31) * n);
  let prev = hub ? n : -1;
  for (let m = hub ? 1 : 0; m < k; m++) {
    const nb = graph.adjacency[cur]!;
    let next = nb[Math.floor(hash01(cycle * 131 + walker * 17 + m, 32) * nb.length)]!;
    if (next === prev && nb.length > 1) next = nb[(nb.indexOf(next) + 1) % nb.length]!;
    prev = cur;
    cur = next;
  }
  return cur;
}

/** Whether two nodes of the graph are joined (index `points.length` is the hub, joined to the spokes). */
export function graphLinked(graph: OrbGraph, a: number, b: number): boolean {
  const n = graph.points.length;
  if (a === n) return graph.spokes.includes(b);
  if (b === n) return graph.spokes.includes(a);
  return graph.adjacency[a]?.includes(b) ?? false;
}

/* ------------------------------------------------------------------ */
/* Halftone: large whole dots in rings around a centre dot             */
/* ------------------------------------------------------------------ */

/** The distance between dots at a size: about twelve dots across, coarser when small. */
export function halftonePitch(size: number): number {
  return size >= 120 ? size / 11.5 : size >= 64 ? size / 8.5 : Math.max(4.6, size / 6.2);
}

/** The largest dot, as a share of the pitch (dots never touch their neighbours). */
export const HALFTONE_DOT = 0.47;
/** The centre dot, as a share of the pitch: a little bigger than any other dot. */
export const HALFTONE_HUB = 0.6;

/** One ring of dots: its radius, how many dots and the angle of the first. */
export interface HalftoneRing {
  radius: number;
  count: number;
  offset: number;
}

/**
 * The rings of dots in a sphere of radius `radius`: the outer ring sits half a pitch inside the edge, so no dot (at most
 * `HALFTONE_DOT` of a pitch) is ever cut, and the rings spread evenly in to 1.22 pitches from the centre, which leaves
 * room for the centre dot.
 */
export function halftoneRings(radius: number, pitch: number): HalftoneRing[] {
  const outer = radius - 0.5 * pitch;
  const inner = 1.22 * pitch;
  if (outer < inner) return [];
  const count = Math.max(1, Math.round((outer - inner) / pitch) + 1);
  const step = count > 1 ? (outer - inner) / (count - 1) : 0;
  const rings: HalftoneRing[] = [];
  for (let j = 0; j < count; j++) {
    const r = outer - j * step;
    const dots = Math.max(4, Math.round((TAU * r) / pitch));
    rings.push({ radius: r, count: dots, offset: j % 2 ? Math.PI / dots : 0 });
  }
  return rings;
}

/* ------------------------------------------------------------------ */
/* Ink drop: metaballs                                                 */
/* ------------------------------------------------------------------ */

/** Kernel reach of a ball, in radii; the shape is where the summed field is above `INK_THRESHOLD`. */
export const INK_REACH = 1.7;
/** Field value on the edge of a lone ball of radius r (the kernel at distance r). */
export const INK_THRESHOLD = (1 - 1 / (INK_REACH * INK_REACH)) ** 2;

/** The drop in a frame: the body (a radius and harmonics [h, amplitude, phase]) and free droplets [x, y, r] from the centre. */
export interface InkScene {
  radius: number;
  harmonics: [number, number, number][];
  drops: [number, number, number][];
}

/** A loud moment of the level: its age in seconds and a seed for where its droplets fly. */
export interface InkPeak {
  age: number;
  id: number;
}

/**
 * The drop of ink in a state at time `t`, in px for a box of `size`. Idle: a slow morph. Listening: the edge ripples with
 * the level. Thinking: it splits into three droplets that orbit and merge back. Speaking: it swells with the level and
 * spatters droplets on loud moments (`peaks`). Error: a splat with droplets around. Muted has no fill (drawn as an outline).
 */
export function inkScene(state: AssistantOrbState, t: number, level: OrbLevelAt, peaks: readonly InkPeak[], size: number): InkScene {
  const r0 = 0.29 * size;
  const harmonics: [number, number, number][] = [];
  const drops: [number, number, number][] = [];
  const idle = (k: number) => {
    harmonics.push([2, 0.042 * k, 0.55 * t], [3, 0.03 * k, -0.37 * t + 1.2], [4, 0.014 * k, 0.23 * t + 2.6]);
  };
  let radius = r0;
  switch (state) {
    case "listening": {
      const l0 = level(0);
      radius = r0 * (1 + 0.07 * l0);
      idle(0.8);
      harmonics.push([6, 0.05 * l0, 1.5 * t], [7, 0.038 * level(0.06), -1.9 * t + 2], [9, 0.026 * level(0.12), 2.7 * t + 4]);
      break;
    }
    case "thinking": {
      const phase = ((t / 3.6) % 1 + 1) % 1;
      const split = smoothstep(0.06, 0.34, phase) * (1 - smoothstep(0.66, 0.94, phase));
      radius = r0 * Math.max(0, 1 - 1.15 * split);
      idle(0.6 * (1 - split));
      const turn = (TAU * t) / 2.8 - Math.PI / 2;
      for (let j = 0; j < 3; j++) {
        const a = turn + (TAU * j) / 3;
        const d = 0.265 * size * split;
        drops.push([Math.cos(a) * d, Math.sin(a) * d, r0 * (0.2 + 0.38 * split)]);
      }
      break;
    }
    case "speaking": {
      const l = level(0);
      radius = r0 * (1 + 0.11 * l);
      idle(0.7);
      harmonics.push([3, 0.03 * l, 1.1 * t + 0.5]);
      for (const peak of peaks) {
        const age = clamp(peak.age / 0.75, 0, 1);
        for (let m = 0; m < 3; m++) {
          const angle = TAU * hash01(peak.id * 3 + m, 11);
          const dist = radius * (0.9 + 0.66 * easeOutCubic(age));
          const r = 0.05 * size * (0.6 + 0.7 * hash01(peak.id * 3 + m, 12)) * (1 - age) ** 0.85;
          if (r > 0.35) drops.push([Math.cos(angle) * dist, Math.sin(angle) * dist, r]);
        }
      }
      break;
    }
    case "error":
      radius = r0 * 0.9;
      harmonics.push([5, 0.1, 0.4], [7, 0.06, 1.7], [3, 0.05, 2.2], [11, 0.03, 0.9]);
      for (const [angle, dist, r] of [
        [0.35, 1.5, 0.036],
        [1.45, 1.46, 0.026],
        [2.55, 1.52, 0.04],
        [3.85, 1.5, 0.026],
        [5.05, 1.54, 0.032],
      ] as const) {
        drops.push([Math.cos(angle) * radius * dist, Math.sin(angle) * radius * dist, r * size]);
      }
      break;
    default:
      radius = r0 * (1 + 0.024 * Math.sin((TAU * t) / 5.6));
      idle(1);
      break;
  }
  return { radius, harmonics, drops };
}

/** The field of the body and of every droplet but `skip`, at (x, y) from the centre. */
export function inkFieldAt(scene: InkScene, x: number, y: number, skip = -1): number {
  let f = 0;
  if (scene.radius > 0.5) {
    const th = Math.atan2(y, x);
    let k = 1;
    for (const [h, a, p] of scene.harmonics) k += a * Math.sin(h * th + p);
    const q = (x * x + y * y) / (INK_REACH * INK_REACH * scene.radius * scene.radius * k * k);
    if (q < 1) f += (1 - q) * (1 - q);
  }
  scene.drops.forEach(([dx, dy, r], m) => {
    if (m === skip) return;
    const q = ((x - dx) ** 2 + (y - dy) ** 2) / (INK_REACH * INK_REACH * r * r);
    if (q < 1) f += (1 - q) * (1 - q);
  });
  return f;
}

const RADIUS_STEPS = 512;
const radiusTable = new Float32Array(RADIUS_STEPS + 1);

/**
 * Samples the field on a (g + 1) by (g + 1) grid of `cell` px from (ox, oy) relative to the centre into `out`. The body's
 * radius is tabulated once per call (a lookup per point, not a sum of sines).
 */
export function inkField(out: Float32Array, g: number, cell: number, ox: number, oy: number, scene: InkScene): void {
  const n = g + 1;
  let amp = 0;
  for (const [, a] of scene.harmonics) amp += Math.abs(a);
  for (let i = 0; i <= RADIUS_STEPS; i++) {
    const th = (i / RADIUS_STEPS) * TAU - Math.PI;
    let k = 1;
    for (const [h, a, p] of scene.harmonics) k += a * Math.sin(h * th + p);
    radiusTable[i] = 1 / (k * k);
  }
  const body = scene.radius > 0.5;
  const reach = INK_REACH * scene.radius * (1 + amp);
  const reach2 = reach * reach;
  const k2 = INK_REACH * INK_REACH * scene.radius * scene.radius;
  const scale = RADIUS_STEPS / TAU;
  for (let j = 0; j <= g; j++) {
    const y = oy + j * cell;
    for (let i = 0; i <= g; i++) {
      const x = ox + i * cell;
      let f = 0;
      if (body) {
        const rho2 = x * x + y * y;
        if (rho2 < reach2) {
          const a = (Math.atan2(y, x) + Math.PI) * scale;
          const ia = a | 0;
          const inv = radiusTable[ia]! + (radiusTable[Math.min(RADIUS_STEPS, ia + 1)]! - radiusTable[ia]!) * (a - ia);
          const q = (rho2 * inv) / k2;
          if (q < 1) f += (1 - q) * (1 - q);
        }
      }
      for (const [dx, dy, r] of scene.drops) {
        const rr = INK_REACH * r;
        const q = ((x - dx) ** 2 + (y - dy) ** 2) / (rr * rr);
        if (q < 1) f += (1 - q) * (1 - q);
      }
      out[j * n + i] = f;
    }
  }
}

/** Where `traceIso` writes: a canvas context fits, so does a recorder in tests. */
export interface IsoSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  rect(x: number, y: number, w: number, h: number): void;
}

/**
 * Traces the region where the field `f` (a grid of g by g cells of `cell` px from (ox, oy)) is above `threshold` as
 * clockwise cell polygons (marching squares with linear edges) and runs of full cells as rectangles. Filled once with the
 * non-zero rule, the pieces join without seams.
 */
export function traceIso(f: Float32Array, g: number, cell: number, ox: number, oy: number, threshold: number, sink: IsoSink): void {
  const n = g + 1;
  let first = true;
  const pt = (x: number, y: number) => {
    if (first) sink.moveTo(x, y);
    else sink.lineTo(x, y);
    first = false;
  };
  for (let j = 0; j < g; j++) {
    let run = -1;
    const y0 = oy + j * cell;
    const y1 = y0 + cell;
    for (let i = 0; i < g; i++) {
      const a = f[j * n + i]!;
      const b = f[j * n + i + 1]!;
      const c = f[(j + 1) * n + i + 1]!;
      const d = f[(j + 1) * n + i]!;
      const A = a > threshold;
      const B = b > threshold;
      const C = c > threshold;
      const D = d > threshold;
      if (A && B && C && D) {
        if (run < 0) run = i;
        continue;
      }
      if (run >= 0) {
        sink.rect(ox + run * cell, y0, (i - run) * cell, cell);
        run = -1;
      }
      if (!A && !B && !C && !D) continue;
      const x0 = ox + i * cell;
      const x1 = x0 + cell;
      first = true;
      if (A) pt(x0, y0);
      if (A !== B) pt(x0 + (cell * (threshold - a)) / (b - a), y0);
      if (B) pt(x1, y0);
      if (B !== C) pt(x1, y0 + (cell * (threshold - b)) / (c - b));
      if (C) pt(x1, y1);
      if (C !== D) pt(x1 - (cell * (threshold - c)) / (d - c), y1);
      if (D) pt(x0, y1);
      if (D !== A) pt(x0, y1 - (cell * (threshold - d)) / (a - d));
      sink.closePath();
    }
    if (run >= 0) sink.rect(ox + run * cell, y0, (g - run) * cell, cell);
  }
}
