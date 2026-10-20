/**
 * The drawing kit shared by the frame-drawn Sutra mascot characters and the Sutradhar sting (internal).
 *
 * A character is a pure function of time: `frame(ctx)` returns a small tree of SVG nodes (`FNode`). The component renders the
 * still pose of the current state as markup (so it renders on the server and under reduced motion), and a frame driver
 * (`mascot-driver-internal.ts`) re-evaluates the function while it moves and writes only the attributes that changed. These are
 * the review designs of October 2026 (design/review/mascot.js) ported as they were approved.
 */

export type Pt = [number, number];
export type Attrs = Record<string, string | number>;
/** [tag, key, attributes, children]. Keys are unique within one drawing; mask and clipPath ids are `<uid>-<key>`. */
export type FNode = [string, string, Attrs, FNode[]?];

/** What a frame function gets. `t` is the page clock in seconds, `tt` the seconds since the state (or the sting) started. */
export interface FrameCtx {
  state: string;
  t: number;
  tt: number;
  /** The still pose (reduced motion, server render, paused before the first frame). */
  still: boolean;
  /** bare: the character alone; tile: composed for a round or squircle tile; sil: pure ink, no face (silhouette). */
  form: "bare" | "tile" | "sil";
  /** Rendered size in px (64 when the size is a CSS length): small sizes get heavier lines. */
  size: number;
  /** Optical weight for faces at small sizes. */
  k: number;
  /** Paint for threads, faces' drawn lines and the small marks. */
  ink: string;
  /** Paint for the beads (the app dye when dyed). */
  bead: string;
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
/** Paint inside a mask: black is see-through. */
export const CUT = "black";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mod = (x: number, m: number) => ((x % m) + m) % m;
export function sstep(x: number) {
  x = clamp(x);
  return x * x * (3 - 2 * x);
}
export const sine = (t: number, period: number, phase = 0) => Math.sin(TAU * (t / period + phase));
export const eio = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
export const eout = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const ein = (x: number) => Math.pow(clamp(x), 3);
export const lin = (x: number) => clamp(x);

export type Ease = (x: number) => number;
/** Keyframes [[time, value, ease?], ...]: the ease shapes the segment that ends at that key (sine in-out by default). */
export function keys(t: number, ks: Array<[number, number, Ease?]>): number {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const a = ks[i - 1], b = ks[i];
      return lerp(a[1], b[1], (b[2] ?? eio)((t - a[0]) / (b[0] - a[0])));
    }
  }
  return ks[ks.length - 1][1];
}
/** A damped spring's step response, 0 to 1 with overshoot. */
export function spring(t: number, fr: number, z: number) {
  if (t <= 0) return 0;
  const w = TAU * fr, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}
/** A plucked, dying oscillation. */
export const ring = (t: number, fr: number, tau: number) => (t <= 0 ? 0 : Math.exp(-t / tau) * Math.sin(TAU * fr * t));
/** Eye openness: two blinks every 6.4 s, the second one double. */
export function blink(t: number, off = 0) {
  const p = mod(t + off, 6.4);
  const b = (x: number) => {
    const d = 0.18;
    if (x < 0 || x > d) return 1;
    return 0.08 + 0.92 * Math.pow(Math.abs((2 * x) / d - 1), 1.7);
  };
  return Math.min(b(p - 1.9), b(p - 5.0), b(p - 5.32));
}

function hash(i: number, seed: number) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
/** A speech-like level 0 to 1 as a pure function of time: phrases with pauses, about five syllables a second. */
export function voice(t: number, seed = 1) {
  const cycle = 40;
  const tt = mod(t, cycle);
  let start = 0, i = 0, inPhrase = false, p0 = 0, p1 = 0;
  while (start < cycle && i < 64) {
    const len = 1.4 + 1.6 * hash(i, seed + 1);
    const pause = 0.3 + 0.6 * hash(i, seed + 2);
    if (tt < start + len) {
      inPhrase = true;
      p0 = start;
      p1 = start + len;
      break;
    }
    if (tt < start + len + pause) break;
    start += len + pause;
    i++;
  }
  if (!inPhrase) return 0.03;
  const env = sstep((tt - p0) / 0.12) * (1 - sstep((tt - (p1 - 0.25)) / 0.25));
  const rate = 4.6 + 0.8 * hash(i, seed + 3);
  const k = Math.floor((tt - p0) * rate);
  const ph = (tt - p0) * rate - k;
  const amp = 0.35 + 0.65 * hash(k + i * 31, seed + 4);
  return clamp(env * amp * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * ph), 0.7)));
}
/** The voice level averaged over about 0.1 s, so a mouth never flickers. */
export function talk(t: number, seed: number) {
  let s = 0;
  for (let i = 0; i < 6; i++) s += voice(t - i * 0.02, seed);
  return s / 6;
}
/** Rotate [x, y] by deg degrees (screen coordinates: positive turns clockwise). */
export function rot(x: number, y: number, deg: number): Pt {
  const a = deg * DEG, c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}
/** A unit vector pointing down, swung by deg degrees (positive swings to the right). */
export const down = (deg: number): Pt => [Math.sin(deg * DEG), Math.cos(deg * DEG)];
/** A unit vector at a protractor angle: 90 points up, 180 to the left. */
export const towards = (deg: number): Pt => [Math.cos(deg * DEG), -Math.sin(deg * DEG)];
export const f = (n: number) => String(Math.round(n * 100) / 100);
export const pt = (p: Pt) => f(p[0]) + " " + f(p[1]);
export function merge(a: Attrs, b: Attrs): Attrs {
  return { ...a, ...b };
}
export function stroke(w: number, paint: string = CUT): Attrs {
  return { fill: "none", stroke: paint, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" };
}

/** A smooth path through points (Catmull-Rom as cubic Beziers). */
export function smooth(pts: Pt[], closed = false) {
  const n = pts.length;
  if (n < 2) return "";
  const P = (i: number) => (closed ? pts[mod(i, n)] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = "M" + pt(pts[0]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d +=
      "C" + f(p1[0] + (p2[0] - p0[0]) / 6) + " " + f(p1[1] + (p2[1] - p0[1]) / 6) +
      " " + f(p2[0] - (p3[0] - p1[0]) / 6) + " " + f(p2[1] - (p3[1] - p1[1]) / 6) + " " + pt(p2);
  }
  return d + (closed ? "Z" : "");
}
export function poly(pts: Pt[]) {
  let d = "M" + pt(pts[0]);
  for (let i = 1; i < pts.length; i++) d += "L" + pt(pts[i]);
  return d;
}
/** A point on a uniform Catmull-Rom segment (matches `smooth`). */
export function crAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const u2 = u * u, u3 = u2 * u;
  const c = (q: 0 | 1) => 0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * u + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * u2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * u3);
  return [c(0), c(1)];
}
export function crSample(pts: Pt[], per: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < per; j++) out.push(crAt(p0, p1, p2, p3, j / per));
  }
  out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out;
}
export function lengths(pts: Pt[]) {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return c;
}
export function along(pts: Pt[], c: number[], s: number): Pt {
  const L = c[c.length - 1];
  if (s <= 0) return [pts[0][0], pts[0][1]];
  if (s >= L) return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (c[m] < s) lo = m;
    else hi = m;
  }
  const u = (s - c[lo]) / (c[hi] - c[lo] || 1);
  return [lerp(pts[lo][0], pts[hi][0], u), lerp(pts[lo][1], pts[hi][1], u)];
}
/** A disc, or a ring when `hole` (a fraction of the radius) is above 0, as one even-odd path. */
export function ringPath(x: number, y: number, r: number, hole: number) {
  const h = r * hole;
  const disc = (rr: number) => "M" + f(x - rr) + " " + f(y) + "a" + f(rr) + " " + f(rr) + " 0 1 0 " + f(2 * rr) + " 0a" + f(rr) + " " + f(rr) + " 0 1 0 " + f(-2 * rr) + " 0Z";
  return disc(r) + (h > 0 ? disc(h) : "");
}
/** Optical sizing: small specimens get heavier features so the face survives at 20 to 32 px. */
export const weight = (size: number) => (size >= 64 ? 1 : size >= 48 ? 1.08 : size >= 32 ? 1.2 : 1.34);

/* ------------------------------------------------------------------ */
/* Faces                                                               */
/* ------------------------------------------------------------------ */

export type EyeKind = "open" | "wide" | "focus" | "happy" | "closed" | "squint" | "lid";
export type MouthKind = "smile" | "small" | "o" | "talk" | "say" | "grin" | "flat" | "bite" | "smirk" | "wavy" | "sleep" | "ring" | "big";
export type BrowKind = "worried" | "focus" | "raised" | null;

/** A face in face space: origin between the eyes, units of the 64 box. */
export interface Face {
  eyes: EyeKind;
  mouth: MouthKind;
  brows?: BrowKind;
  /** Where the eyes look. */
  lx?: number;
  ly?: number;
  blink?: number;
  /** Speech, 0 to 1. */
  open?: number;
  /** How far (radians) the head has turned on its axis: the features slide round a sphere of radius R. */
  turn?: number;
  R?: number;
  ex?: number;
  my?: number;
  k?: number;
  /** Mouth scale (Bindu keeps a smaller mouth). */
  mk?: number;
  paint?: string;
  eyeBig?: [number, number];
  eyeDy?: [number, number];
  mx?: number;
  lashes?: boolean;
  small?: boolean;
}

function eyeNode(key: string, kind: EyeKind, i: number, bl: number, k: number, paint: string, F: Face): FNode {
  const big = F.eyeBig ? F.eyeBig[i] : 1;
  switch (kind) {
    case "wide":
      return ["ellipse", key, { cx: 0, cy: 0, rx: 2.75 * k * big, ry: 3.7 * k * big * bl, fill: paint }];
    case "focus":
      return ["path", key, { d: "M" + f(-3 * k) + " " + f(-0.9 * k) + "H" + f(3 * k) + "A" + f(3 * k) + " " + f(3 * k) + " 0 0 1 " + f(-3 * k) + " " + f(-0.9 * k) + "Z", fill: paint }];
    case "happy":
      return ["path", key, merge(stroke(2.4 * k, paint), { d: "M" + f(-2.9 * k) + " " + f(1.4 * k) + "Q0 " + f(-2.9 * k) + " " + f(2.9 * k) + " " + f(1.4 * k) })];
    case "closed":
      return ["path", key, merge(stroke(2.3 * k, paint), { d: "M" + f(-2.9 * k) + " " + f(-0.5 * k) + "Q0 " + f(2.6 * k) + " " + f(2.9 * k) + " " + f(-0.5 * k) })];
    case "lid": {
      const erx = 2.5 * k, ery = 3.25 * k, s = i ? -1 : 1;
      const yo = -1.55 * k, yi = -1.25 * k;
      const xo = -s * erx * Math.sqrt(1 - (yo * yo) / (ery * ery)), xi = s * erx * Math.sqrt(1 - (yi * yi) / (ery * ery));
      return ["path", key, { d: "M" + f(xo) + " " + f(yo) + "L" + f(xi) + " " + f(yi) + "A" + f(erx) + " " + f(ery) + " 0 1 " + (s > 0 ? 1 : 0) + " " + f(xo) + " " + f(yo) + "Z", fill: paint }];
    }
    case "squint":
      return ["ellipse", key, { cx: 0, cy: 0, rx: 2.4 * k * big, ry: (i ? 3.1 : 2.1) * k * bl, fill: paint }];
    default:
      return ["ellipse", key, { cx: 0, cy: 0, rx: 2.35 * k * big, ry: 3.1 * k * big * bl, fill: paint }];
  }
}
function browNode(key: string, kind: BrowKind, side: number, k: number, paint: string): FNode {
  const s = side;
  let d = "M0 0";
  if (kind === "worried") d = "M" + f(2.7 * s * k) + " " + f(-4.9 * k) + "L" + f(-2.1 * s * k) + " " + f(-6.5 * k);
  else if (kind === "focus") d = "M" + f(2.8 * s * k) + " " + f(-6.4 * k) + "L" + f(-2.2 * s * k) + " " + f(-4.7 * k);
  else if (kind === "raised")
    d = s > 0 ? "M" + f(-2.6 * k) + " " + f(-6.2 * k) + "Q" + f(0.2 * k) + " " + f(-8.6 * k) + " " + f(2.9 * k) + " " + f(-6.6 * k) : "M" + f(-2.4 * k) + " " + f(-4.7 * k) + "L" + f(2.4 * k) + " " + f(-4.5 * k);
  return ["path", key, merge(stroke(2 * k, paint), { d })];
}
/** Two short lashes at the outer top of each eye (one at small sizes, where two would merge into a slant). */
function lashNodes(key: string, kind: EyeKind, side: number, bl: number, k: number, paint: string, big: number, small?: boolean): FNode[] {
  const w = stroke(1.3 * k, paint), s = side;
  let a: string, b: string;
  if (kind === "closed") {
    a = "M" + f(s * 1.6 * k) + " " + f(1.5 * k) + "L" + f(s * 2.5 * k) + " " + f(3.2 * k);
    b = "M" + f(s * 2.8 * k) + " " + f(0.2 * k) + "L" + f(s * 4.2 * k) + " " + f(1.5 * k);
  } else if (kind === "happy") {
    a = "M" + f(s * 2.6 * k) + " " + f(0.4 * k) + "L" + f(s * 4.2 * k) + " " + f(-0.6 * k);
    b = "M" + f(s * 1.6 * k) + " " + f(-1.0 * k) + "L" + f(s * 2.8 * k) + " " + f(-2.4 * k);
  } else {
    const rx = (kind === "wide" ? 2.75 : 2.35) * k * big, ry = (kind === "wide" ? 3.7 : 3.1) * k * big * (kind === "squint" ? 0.85 : 1) * Math.max(bl, 0.35);
    a = "M" + f(s * rx * 0.72) + " " + f(-ry * 0.7) + "L" + f(s * (rx * 0.72 + 1.5 * k)) + " " + f(-ry * 0.7 - 1.05 * k);
    b = "M" + f(s * rx * 0.97) + " " + f(-ry * 0.3) + "L" + f(s * (rx * 0.97 + 1.8 * k)) + " " + f(-ry * 0.3 - 0.45 * k);
  }
  if (small) return [["path", key + "b", merge(w, { d: b })]];
  return [["path", key + "a", merge(w, { d: a })], ["path", key + "b", merge(w, { d: b })]];
}
function mouthNode(key: string, kind: MouthKind, open: number, k: number, paint: string): FNode {
  const w = 2.25 * k;
  switch (kind) {
    case "o":
      return ["ellipse", key, { cx: 0, cy: 0.3, rx: 1.9 * k, ry: 2.3 * k, fill: paint }];
    case "talk":
      return ["ellipse", key, { cx: 0, cy: 0.4, rx: (2.3 + 1.1 * open) * k, ry: (0.75 + 2.7 * open) * k, fill: paint }];
    case "say": {
      const mw = (2.6 + 0.9 * open) * k, mh = (0.9 + 3.1 * open) * k;
      return ["path", key, { d: "M" + f(-mw) + " " + f(-0.6 * k) + "Q0 " + f(-1.3 * k) + " " + f(mw) + " " + f(-0.6 * k) + "C" + f(mw) + " " + f(-0.6 * k + mh * 1.25) + " " + f(-mw) + " " + f(-0.6 * k + mh * 1.25) + " " + f(-mw) + " " + f(-0.6 * k) + "Z", fill: paint }];
    }
    case "ring":
      return ["ellipse", key, merge(stroke(w, paint), { cx: 0, cy: 0.6, rx: (1.9 + 0.9 * open) * k, ry: (0.7 + 2.2 * open) * k })];
    case "big":
      return ["path", key, merge(stroke(w, paint), { d: "M" + f(-4.4 * k) + " " + f(-0.6 * k) + "Q0 " + f(0.2 * k) + " " + f(4.4 * k) + " " + f(-0.6 * k) + "Q" + f(3.6 * k) + " " + f(4.6 * k) + " 0 " + f(4.6 * k) + "Q" + f(-3.6 * k) + " " + f(4.6 * k) + " " + f(-4.4 * k) + " " + f(-0.6 * k) + "Z" })];
    case "grin":
      return ["path", key, { d: "M" + f(-4.9 * k) + " " + f(-1.2 * k) + "H" + f(4.9 * k) + "A" + f(4.9 * k) + " " + f(4.9 * k) + " 0 0 1 " + f(-4.9 * k) + " " + f(-1.2 * k) + "Z", fill: paint }];
    case "flat":
      return ["path", key, merge(stroke(w, paint), { d: "M" + f(-2.8 * k) + " 0.6H" + f(2.8 * k) })];
    case "bite":
      return ["path", key, merge(stroke(w, paint), { d: "M" + f(-3 * k) + " " + f(0.9 * k) + "L" + f(1.8 * k) + " " + f(0.9 * k) + "Q" + f(3 * k) + " " + f(0.9 * k) + " " + f(3.3 * k) + " " + f(-0.3 * k) })];
    case "smirk":
      return ["path", key, merge(stroke(w, paint), { d: "M" + f(-2.6 * k) + " " + f(1.1 * k) + "Q" + f(1.2 * k) + " " + f(1 * k) + " " + f(3.4 * k) + " " + f(-1.1 * k) })];
    case "wavy":
      return ["path", key, merge(stroke(w, paint), { d: "M" + f(-4.5 * k) + " " + f(0.9 * k) + "Q" + f(-2.25 * k) + " " + f(-1.5 * k) + " 0 " + f(0.9 * k) + "T" + f(4.5 * k) + " " + f(0.9 * k) })];
    case "sleep":
      return ["ellipse", key, { cx: 0, cy: 0.4, rx: 1.5 * k, ry: 1.25 * k, fill: paint }];
    case "small":
      return ["path", key, merge(stroke(w, paint), { d: "M" + f(-2.3 * k) + " 0Q0 " + f(2.1 * k) + " " + f(2.3 * k) + " 0" })];
    default:
      return ["path", key, merge(stroke(w, paint), { d: "M" + f(-3.9 * k) + " " + f(0.1 * k) + "Q" + f(0.2 * k) + " " + f(4.1 * k) + " " + f(4.1 * k) + " " + f(-0.5 * k) })];
  }
}
/** The eyes, brows and mouth of a face (cut-outs when `paint` is the mask's black, drawn lines otherwise). */
export function faceKids(p: string, F: Face): FNode[] {
  const k = F.k ?? 1, ex = F.ex ?? 5.8, my = F.my ?? 7.6, Rh = F.R ?? 16, paint = F.paint ?? CUT;
  const turn = F.turn ?? 0, lx = F.lx ?? 0, ly = F.ly ?? 0, bl = F.blink ?? 1;
  const kids: FNode[] = [];
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    const th = Math.asin(clamp((side * ex) / Rh, -0.95, 0.95)) + turn;
    const x = Rh * Math.sin(th) + lx, sq = Math.max(0.2, Math.cos(th));
    let g: FNode[] = [eyeNode(p + "e" + i, F.eyes, i, bl, k, paint, F)];
    if (F.lashes) g = g.concat(lashNodes(p + "l" + i, F.eyes, side, bl, k, paint, F.eyeBig ? F.eyeBig[i] : 1, F.small));
    if (F.brows) g.push(browNode(p + "b" + i, F.brows, side, k, paint));
    kids.push(["g", p + "eg" + i, { transform: "translate(" + f(x) + " " + f(ly + (F.eyeDy ? F.eyeDy[i] : 0)) + ") scale(" + f(sq) + " 1)" }, g]);
  }
  const thm = turn + (F.mx ?? 0) / Rh;
  const mx = Rh * Math.sin(thm) + lx * 0.5, msq = Math.max(0.25, Math.cos(thm));
  kids.push(["g", p + "mg", { transform: "translate(" + f(mx) + " " + f(my + ly * 0.35) + ") scale(" + f(msq) + " 1)" }, [mouthNode(p + "m", F.mouth, F.open ?? 0, k * (F.mk ?? 1), paint)]]);
  return kids;
}

/* ------------------------------------------------------------------ */
/* The small marks that tell a state without motion                    */
/* ------------------------------------------------------------------ */

export function zees(p: string, ink: string, x: number, y: number, t: number, still: boolean, sc = 1): FNode[] {
  const out: FNode[] = [];
  for (let i = 0; i < 3; i++) {
    const ph = still ? [0.12, 0.5, 0.88][i] : mod(t / 4.2 + i / 3, 1);
    const s = (0.62 + 0.5 * ph) * sc;
    const op = still ? 1 : Math.pow(Math.sin(Math.PI * ph), 0.55);
    const cx = x + 11 * ph * sc + 1.5 * Math.sin(ph * 5), cy = y - 13 * ph * sc;
    out.push(["path", p + "z" + i, merge(stroke(2 / s, ink), { d: "M-2.5 -3H2.5L-2.5 3H2.5", transform: "translate(" + f(cx) + " " + f(cy) + ") scale(" + f(s) + ")", opacity: f(op) })]);
  }
  return out;
}
const SPARK = "M0 -4.3C.55 -.8 .8 -.55 4.3 0C.8 .55 .55 .8 0 4.3C-.55 .8 -.8 .55 -4.3 0C-.8 -.55 -.55 -.8 0 -4.3Z";
export function sparkles(p: string, ink: string, spots: Array<[number, number, number]>, t: number, still: boolean): FNode[] {
  return spots.map((s, i): FNode => {
    const tw = still ? 1 : 0.78 + 0.28 * sine(t + i * 0.7, 1.6);
    const r = still ? 0 : 12 * sine(t + i * 0.7, 3.2);
    return ["path", p + "sp" + i, { d: SPARK, fill: ink, transform: "translate(" + f(s[0]) + " " + f(s[1]) + ") rotate(" + f(r) + ") scale(" + f(s[2] * tw) + ")" }];
  });
}
export function dots(p: string, ink: string, x: number, y: number, t: number, still: boolean): FNode[] {
  const at: Array<[number, number, number]> = [[0, 0, 1.35], [4.1, -4.6, 1.85], [9, -9.8, 2.45]];
  return at.map((d, i): FNode => {
    const s = still ? 1 : 0.6 + 0.4 * sstep(1 - Math.abs(mod(t / 2.1 - i * 0.18, 1) - 0.35) / 0.35);
    return ["circle", p + "dt" + i, { cx: x + d[0], cy: y + d[1], r: d[2] * s, fill: ink }];
  });
}
export function bang(p: string, ink: string, x: number, y: number, tt: number, still: boolean, sc = 1): FNode[] {
  const s = still ? 1 : keys(tt, [[0, 0], [0.1, 0, lin], [0.32, 1.25, eout], [0.55, 0.95], [0.7, 1]]);
  return [["g", p + "bang", { transform: "translate(" + f(x) + " " + f(y) + ") scale(" + f(s * sc) + ")" }, [
    ["path", p + "bang1", merge(stroke(3, ink), { d: "M0 -8.6V-2.6" })],
    ["circle", p + "bang2", { cx: 0, cy: 2.2, r: 1.75, fill: ink }],
  ]]];
}
/** Sound arriving from the user's side: two short arcs, convex toward the head, to the right of (x, y). */
export function hear(p: string, ink: string, x: number, y: number, r: number, t: number, still: boolean): FNode[] {
  const out: FNode[] = [];
  for (let i = 0; i < 2; i++) {
    const ph = still ? 0.5 : mod(t / 1.7 - i * 0.5, 1);
    const off = r + 3.6 + 4.2 * i + (still ? 0 : 2.6 * (1 - ph) - 1.3);
    const op = still ? (i ? 0.55 : 1) : Math.pow(Math.sin(Math.PI * ph), 0.8);
    const big = 9 + 2 * i;
    const span = Math.asin((5.4 + 1.8 * i) / big);
    const cx = x + off + big;
    const a0: Pt = [cx - big * Math.cos(span), y - big * Math.sin(span)], a1: Pt = [cx - big * Math.cos(span), y + big * Math.sin(span)];
    out.push(["path", p + "h" + i, merge(stroke(2.1, ink), { d: "M" + pt(a0) + "A" + big + " " + big + " 0 0 0 " + pt(a1), opacity: f(op) })]);
  }
  return out;
}
/** A small drop of effort beside the head; it slides a little and swells again. */
export function sweat(p: string, ink: string, x: number, y: number, t: number, still: boolean, sc = 1): FNode[] {
  const ph = still ? 0.3 : mod(t / 1.9, 1);
  const dy = 2.2 * eio(ph), s = sc * (0.85 + 0.15 * Math.sin(Math.PI * ph));
  return [["path", p + "sw", { d: "M0 -3.4C1.7 -1 2.3 .3 2.3 1.2A2.3 2.3 0 0 1 -2.3 1.2C-2.3 .3 -1.7 -1 0 -3.4Z", fill: ink, transform: "translate(" + f(x) + " " + f(y + dy) + ") rotate(-14) scale(" + f(s) + ")" }]];
}

/* ------------------------------------------------------------------ */
/* Markup                                                              */
/* ------------------------------------------------------------------ */

/** Mask and clipPath ids are `<uid>-<key>`; attribute values say `#@` for "this drawing's id prefix". */
export const resolveRef = (v: string, uid: string) => v.replace(/#@/g, "#" + uid + "-");
const value = (v: string | number, uid: string) => (typeof v === "number" ? f(v) : resolveRef(v, uid));

/** The node tree as SVG markup (elements carry `data-k` so the driver can find them again). */
export function nodesToMarkup(nodes: FNode[], uid: string): string {
  let s = "";
  for (const [tag, key, attrs, kids] of nodes) {
    s += "<" + tag + ' data-k="' + key + '"';
    if (tag === "mask" || tag === "clipPath") s += ' id="' + uid + "-" + key + '"';
    for (const name in attrs) s += " " + name + '="' + value(attrs[name], uid) + '"';
    s += ">" + (kids ? nodesToMarkup(kids, uid) : "") + "</" + tag + ">";
  }
  return s;
}
/** The shape of a drawing (tags and keys): when it changes, the markup is rebuilt instead of patched. */
export function signature(nodes: FNode[]): string {
  let s = "";
  for (const n of nodes) {
    s += n[0] + ":" + n[1] + ",";
    if (n[3]) s += "(" + signature(n[3]) + ")";
  }
  return s;
}
/** Write a frame into markup made from the same signature: only the attributes whose value changed. */
export function patchNodes(index: Map<string, Element>, last: Map<string, string>, nodes: FNode[], uid: string) {
  for (const [, key, attrs, kids] of nodes) {
    const el = index.get(key);
    if (el) {
      for (const name in attrs) {
        const v = value(attrs[name], uid);
        const id = key + "|" + name;
        if (last.get(id) !== v) {
          el.setAttribute(name, v);
          last.set(id, v);
        }
      }
    }
    if (kids) patchNodes(index, last, kids, uid);
  }
}

/** What a driven drawing remembers between frames: which element is which, and the last value written to each attribute. */
export interface DrawState {
  g: Element | null;
  markup: string;
  sig: string;
  index: Map<string, Element>;
  last: Map<string, string>;
}
export const newDrawState = (): DrawState => ({ g: null, markup: "", sig: "", index: new Map(), last: new Map() });

/**
 * Write one frame into `g`, whose markup React rendered from `base` (the still pose). The element index is rebuilt when
 * React replaced that markup or the element; a frame whose node structure differs (a face that changes its eyes mid-sting)
 * is written as new markup; otherwise only the attributes that changed are set.
 */
export function drawFrame(g: Element, st: DrawState, base: { markup: string; sig: string }, nodes: FNode[], uid: string) {
  const reindex = () => {
    st.index = new Map();
    st.last = new Map();
    g.querySelectorAll("[data-k]").forEach((el) => st.index.set(el.getAttribute("data-k") as string, el));
  };
  if (st.g !== g || st.markup !== base.markup) {
    st.g = g;
    st.markup = base.markup;
    st.sig = base.sig;
    reindex();
  }
  const sig = signature(nodes);
  if (sig !== st.sig) {
    g.innerHTML = nodesToMarkup(nodes, uid);
    st.sig = sig;
    reindex();
    return;
  }
  patchNodes(st.index, st.last, nodes, uid);
}
