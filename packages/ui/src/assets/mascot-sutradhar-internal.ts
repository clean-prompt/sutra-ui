/**
 * Sutradhar, the full-figure character of SutraMascot (internal), and the figure the Sutradhar sting reuses: a bead head and a
 * bead body strung on one thread (a visible neck), thread arms and legs placed by two-bone reach, small bead hands and feet.
 * Limbs run behind the beads with the mark's paper gap; an arm across the body is drawn over it with the same gap. Every state
 * is body language: a cupped ear, a hand on the chin, a thread worked between the hands, an open hand that gestures, a wave,
 * sitting with hands on the knees, a shrug. The tile form is a head-and-shoulders crop.
 */
import {
  CUT, TAU, bang, blink, dots, ein, eout, f, faceKids, hear, keys, lerp, maskArea, merge, pt, ring, rot, sine, smooth, sparkles, spring,
  stroke, sweat, talk, zees, type Face, type FNode, type FrameCtx, type Pt,
} from "./mascot-kit-internal";

/** Two-bone reach: shoulder S to target T with bone lengths a, b; `sign` picks the side the elbow (or knee) bends to. */
export function reach2(S: Pt, T: Pt, a: number, b: number, sign: number): [Pt, Pt] {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  const dd = Math.min(a + b - 0.05, Math.max(Math.abs(a - b) + 0.05, d));
  const base = Math.atan2(dy, dx);
  const A = Math.acos(Math.min(1, Math.max(-1, (a * a + dd * dd - b * b) / (2 * a * dd))));
  const an = base + sign * A;
  return [[S[0] + a * Math.cos(an), S[1] + a * Math.sin(an)], [S[0] + dd * Math.cos(base), S[1] + dd * Math.sin(base)]];
}

export interface FigurePose {
  /** Body centre. */
  bx: number;
  by: number;
  /** Lean in degrees about the hips. */
  lean?: number;
  /** Body squash (1 = rest). */
  sy?: number;
  /** Head tilt in degrees, and how far the head sinks into the shoulders. */
  hr?: number;
  hdy?: number;
  /** Hand targets [left, right on screen] and the side each elbow bends to. */
  hands: [Pt, Pt];
  bend: [number, number];
  /** Foot targets and knee bends. */
  feet: [Pt, Pt];
  kbend: [number, number];
  /** Arms drawn in front of the body. */
  front?: [boolean, boolean];
  F: Face;
  /** Extra ink drawn over the hands (a thread between them). */
  prop?: (arms: Array<[Pt, Pt]>) => FNode[];
}

/** The figure's proportions: head radius, body radii, arm and leg segments. */
export const FIG = { hr: 10.5, brx: 8.2, bry: 9.6, ua: 7.4, la: 7.2, ul: 7.2, ll: 7.4 };

/** The figure in a pose; returns its nodes and where its head, body, arms and shoulders ended up. */
export function figure(c: Pick<FrameCtx, "size" | "k" | "ink" | "bead">, P: FigurePose) {
  const INK = c.ink;
  const tw = c.size >= 160 ? 2.8 : c.size >= 96 ? 3.1 : c.size >= 64 ? 3.4 : c.size >= 48 ? 3.8 : 4.4;
  const gap = 1.6;
  const lean = P.lean ?? 0;
  const L = (p: Pt): Pt => {
    const q = rot(p[0], p[1], lean);
    return [P.bx + q[0], P.by + 7 + q[1]];
  };
  const bc = L([0, -7]);
  const bry = FIG.bry * (P.sy ?? 1), brx = FIG.brx / Math.sqrt(P.sy ?? 1);
  const H = L([0, -7 - bry - FIG.hr - 2.6 + (P.hdy ?? 0)]);
  const sh: [Pt, Pt] = [L([-6.1, -7 - bry * 0.55]), L([6.1, -7 - bry * 0.55])];
  const hp: [Pt, Pt] = [L([-3.4, -7 + bry * 0.72]), L([3.4, -7 + bry * 0.72])];
  const arms = [0, 1].map((i) => reach2(sh[i], P.hands[i], FIG.ua, FIG.la, P.bend[i]));
  const legs = [0, 1].map((i) => reach2(hp[i], P.feet[i], FIG.ul, FIG.ll, P.kbend[i]));
  let nodes: FNode[] = [];
  const { box, white } = maskArea(-60, -60, 260, 220);
  const rotB = "rotate(" + f(lean) + " " + pt(bc) + ")";
  nodes.push(["mask", "lm", box, [
    ["rect", "lmr", white],
    ["ellipse", "lmb", { cx: bc[0], cy: bc[1], rx: brx + gap, ry: bry + gap, transform: rotB, fill: CUT }],
    ["circle", "lmh", { cx: H[0], cy: H[1], r: FIG.hr + gap, fill: CUT }],
  ]]);
  const F: Face = { ...P.F, k: c.k, R: FIG.hr };
  nodes.push(["mask", "fmask", box, [["rect", "fmr", white], ["g", "fg", { transform: "translate(" + pt(H) + ") rotate(" + f((P.hr ?? 0) + lean) + ") scale(0.8) translate(0 -0.6)" }, faceKids("f", F)]]]);
  const limbs: FNode[] = [];
  const front: Array<[number, string, Pt]> = [];
  /* the neck: the thread the two beads are strung on */
  limbs.push(["path", "neck", merge(stroke(tw, INK), { d: "M" + pt(H) + "L" + pt(bc) })]);
  arms.forEach((a, i) => {
    const d = smooth([sh[i], a[0], a[1]]);
    if (P.front && P.front[i]) front.push([i, d, a[1]]);
    else limbs.push(["path", "arm" + i, merge(stroke(tw, INK), { d })]);
  });
  legs.forEach((l, i) => limbs.push(["path", "leg" + i, merge(stroke(tw, INK), { d: smooth([hp[i], l[0], l[1]]) })]));
  nodes.push(["g", "limbs", { mask: "url(#@lm)" }, limbs]);
  if (front.length) {
    const bcut: FNode[] = [["rect", "bmr", white]];
    front.forEach((fa) => {
      bcut.push(["path", "bma" + fa[0], merge(stroke(tw + 2 * gap), { d: fa[1] })]);
      bcut.push(["circle", "bmh" + fa[0], { cx: fa[2][0], cy: fa[2][1], r: 2.7 + gap, fill: CUT }]);
    });
    nodes.push(["mask", "bm", box, bcut]);
  }
  nodes.push(["g", "bodyg", front.length ? { mask: "url(#@bm)" } : {}, [["ellipse", "body", { cx: bc[0], cy: bc[1], rx: brx, ry: bry, transform: rotB, fill: c.bead }]]]);
  front.forEach((fa) => nodes.push(["path", "farm" + fa[0], merge(stroke(tw, INK), { d: fa[1] })]));
  nodes.push(["g", "headg", { mask: "url(#@fmask)" }, [["circle", "head", { cx: H[0], cy: H[1], r: FIG.hr, fill: c.bead }]]]);
  legs.forEach((l, i) => nodes.push(["ellipse", "foot" + i, { cx: l[1][0] + (i ? 1.2 : -1.2), cy: l[1][1] + 0.4, rx: 3.5, ry: 2.3, fill: INK }]));
  if (P.prop) nodes = nodes.concat(P.prop(arms));
  arms.forEach((a, i) => nodes.push(["circle", "hand" + i, { cx: a[1][0], cy: a[1][1], r: 2.7, fill: INK }]));
  return { nodes, H, bc, arms, sh };
}

export function sutradharFrame(c: FrameCtx): FNode[] {
  const s = c.state, t = c.t, tt = c.tt, still = c.still;
  const tile = c.form === "tile";
  const INK = c.ink;
  const by = 37;
  const P: FigurePose = { bx: 32, by, lean: 0, sy: 1, hr: 0, hdy: 0, hands: [[20.5, 45.5], [43.5, 45.5]], bend: [1, -1], feet: [[27.5, 59.5], [36.5, 59.5]], kbend: [-1, 1], F: { eyes: "open", mouth: "smile", lx: 0.4, ly: 0.2, blink: 1, open: 0, turn: 0.3, ex: 4.6, my: 6.4 } };
  let hl: Pt = [20.5, 45.5], hrr: Pt = [43.5, 45.5], fl: Pt = [27.5, 59.5], fr: Pt = [36.5, 59.5];
  let X = "";
  switch (s) {
    case "listening": {
      /* a hand cupped to the ear on the user's side, the other on the hip, head tipped toward it */
      const up = still ? 1 : spring(tt - 0.05, 1.2, 0.5);
      P.hr = 9 * up;
      P.lean = 3 * up;
      hrr = [lerp(42, 45.2, up), lerp(47, 14.5, up) + (still ? 0 : 0.5 * sine(t, 1.6))];
      P.bend = [1, 1];
      hl = [lerp(22, 21.5, up), lerp(47, 40, up)];
      Object.assign(P.F, { eyes: "wide", mouth: "small", turn: 0.45, lx: 0.8, blink: still ? 1 : blink(t, 1.2) });
      X = "hear";
      break;
    }
    case "thinking": {
      /* a hand on the chin, the other arm across holding the elbow; eyes up */
      P.hr = still ? -5 : -5 + 2 * sine(t, 4.2);
      hrr = [35.5, 27.6 + (still ? 0 : 0.4 * sine(t, 1.3))];
      P.bend = [-1, -1];
      hl = [40.5, 37.5];
      P.front = [true, false];
      Object.assign(P.F, { eyes: "squint", brows: "raised", mouth: "smirk", turn: 0.12, ly: -1.2, lx: -0.4, blink: still ? 1 : blink(t, 2.4) });
      X = "dots";
      break;
    }
    case "working": {
      /* busy hands: a thread stretched between them, worked up and down like a cat's cradle */
      const ph = still ? 0.25 : t / 0.7;
      const a1 = Math.sin(TAU * ph), a2 = Math.sin(TAU * ph + Math.PI);
      hl = [20.5, 24.5 + 2.2 * a1];
      hrr = [43.5, 24.5 + 2.2 * a2];
      P.bend = [-1, 1];
      P.lean = still ? 0 : 0.8 * a1;
      Object.assign(P.F, { eyes: "open", blink: 0.72, mouth: "flat", turn: 0.2, ly: 1.4 });
      P.prop = (arms) => {
        const A = arms[0][1], Bh = arms[1][1];
        const mid: Pt = [(A[0] + Bh[0]) / 2, (A[1] + Bh[1]) / 2 + (still ? 1.2 : 1.2 + 0.8 * Math.sin(TAU * ph * 2))];
        return [["path", "cradle", merge(stroke(1.5, INK), { d: "M" + pt(A) + "Q" + pt(mid) + " " + pt(Bh) })]];
      };
      X = "sweat";
      break;
    }
    case "speaking": {
      /* an open hand that gestures with the phrases; the body bobs */
      const lv = still ? 0.6 : talk(t, 17), lv2 = still ? 0.6 : talk(t - 0.15, 17);
      P.by = by - lv;
      hrr = [44 + 2 * lv2, 38 - 7 * lv2];
      P.bend = [1, 1];
      P.hr = still ? 3 : 3 * sine(t, 3.6);
      Object.assign(P.F, { mouth: "say", open: lv, blink: still ? 1 : blink(t, 3) });
      break;
    }
    case "happy": {
      /* a hop, then a wave: the hand up high, swinging from the elbow */
      const hop = still ? 0 : keys(tt, [[0, 0], [0.12, 1.4, eout], [0.36, -6, eout], [0.58, 0.8, ein], [0.72, 0, eout]]);
      P.by = by + hop;
      P.sy = still ? 1 : 1 + keys(tt, [[0, 0], [0.12, -0.1], [0.3, 0.07], [0.58, -0.08], [0.75, 0]]);
      const wv = still ? 0.5 : sine(t, 0.62);
      hrr = [46.5 + 3.6 * wv, 13.5 - 1.2 * Math.abs(wv)];
      P.bend = [1, 1];
      hl = [21, 45];
      P.hr = 6;
      Object.assign(P.F, { eyes: "happy", mouth: "grin", turn: 0.25 });
      if (!still) {
        fl = [27.5, 59.5 + Math.min(0, hop)];
        fr = [36.5, 59.5 + Math.min(0, hop)];
      }
      X = "sparkles";
      break;
    }
    case "sleeping": {
      /* sat down, knees up and out, hands on the knees, head on one side */
      P.by = 46;
      P.sy = 0.96 + (still ? 0 : 0.02 * sine(t, 5));
      P.hr = -14;
      P.hdy = 1.2;
      hl = [22.5, 51];
      hrr = [41.5, 51];
      P.bend = [1, -1];
      fl = [24, 60.5];
      fr = [40, 60.5];
      P.kbend = [1, -1];
      Object.assign(P.F, { eyes: "closed", mouth: "sleep", turn: 0.05, ly: 0.8 });
      X = "zees";
      break;
    }
    case "error": {
      /* a shrug: hands out and palms up, shoulders up, head to one side */
      const e = still ? 1 : spring(tt, 1.6, 0.42);
      const j = still ? 0 : 1.2 * ring(tt, 3, 0.3);
      P.sy = 1 - 0.05 * e;
      P.hdy = 1.6 * e;
      P.hr = -8 * e + j * 3;
      hl = [lerp(22, 15.5, e), lerp(47, 31.5, e)];
      hrr = [lerp(42, 48.5, e), lerp(47, 31.5, e)];
      P.bend = [-1, 1];
      Object.assign(P.F, { eyes: "wide", eyeBig: [0.9, 0.9], brows: "worried", mouth: "wavy", turn: 0.1 });
      X = "bang";
      break;
    }
    default: {
      /* idle: a slow breath, arms swinging a little, a glance, a blink */
      const sw = still ? 0 : sine(t, 4.4);
      P.sy = 1 + (still ? 0 : 0.015 * sine(t, 2.6));
      hl = [20.5 - 0.6 * sw, 45.5 + 0.4 * sw];
      hrr = [43.5 - 0.6 * sw, 45.5 - 0.4 * sw];
      P.hr = still ? 0 : 2 * sine(t, 6.2);
      P.F.blink = still ? 1 : blink(t, 0.6);
    }
  }
  P.hands = [hl, hrr];
  P.feet = [fl, fr];
  const out = figure(c, P);
  let nodes = out.nodes;
  const H = out.H;
  if (X === "hear") nodes = nodes.concat(hear("x", INK, H[0] + 13, H[1] + 1, 4, t, still));
  if (X === "dots") nodes = nodes.concat(dots("x", INK, H[0] + 9.5, H[1] - 8.5, t, still));
  if (X === "sweat") nodes = nodes.concat(sweat("x", INK, H[0] + 11, H[1] - 5, t, still, 0.8));
  if (X === "sparkles") nodes = nodes.concat(sparkles("x", INK, [[12, 14, 0.7], [57, 26, 0.55], [9, 36, 0.5]], t, still));
  if (X === "zees") nodes = nodes.concat(zees("x", INK, H[0] + 9, H[1] - 6, t, still, 0.8));
  if (X === "bang") nodes = nodes.concat(bang("x", INK, 52, 12, tt, still, 0.85));
  if (tile) return [["g", "tile", { transform: "translate(32 35) scale(1.42) translate(-32 -22.5)" }, nodes]];
  return nodes;
}
