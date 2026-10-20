/**
 * The two Sutradhar stings as frame functions (internal), with the Sutra mark L10: a crescent bead on an upright thread.
 * `mark`: Sutradhar walks in with a bare thread, the crescent bead drops onto it and becomes the mark, he plants it and smiles.
 * `astra`: he summons a hand astra (the crescent bead on a short thread), charges it, swings it into the aim and fires an ink
 * wave out of its head; one hand only, no knot. Both end on a still lockup (`still`).
 */
import {
  CUT, DEG, TAU, clamp, eio, ein, eout, f, keys, lerp, merge, poly, pt, sparkles, sstep, stroke, towards,
  type FNode, type Pt,
} from "./mascot-kit-internal";
import { figure, type FigurePose } from "./mascot-sutradhar-internal";

export interface StingCtx {
  /** Seconds since the sting started (ignored when still). */
  tt: number;
  /** The final lockup. */
  still: boolean;
  /** Rendered height in px, for line weights. */
  size: number;
  ink: string;
  /** The astra's aim in protractor degrees (90 up, 180 level to the left), 135 to 180. */
  aim: number;
}

/* ------------------------------------------------------------------ */
/* The crescent bead (design/brand/crescent.mjs, the FINE drawing)     */
/* ------------------------------------------------------------------ */

/** The crescent bead centred at the origin, horns up: a disc with an oval bite that breaks through its top. */
function crescentPath(R: number, rx: number, ry: number, d: number) {
  const ecy = -d;
  const fn = (y: number) => R * R - y * y - rx * rx * (1 - ((y - ecy) / ry) ** 2);
  let lo = ecy - ry, hi = ecy;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (fn(lo) * fn(m) <= 0) hi = m;
    else lo = m;
  }
  const yt = (lo + hi) / 2;
  const h = Math.sqrt(Math.max(0, R * R - yt * yt));
  return "M" + f(-h) + " " + f(yt) + "A" + R + " " + R + " 0 1 0 " + f(h) + " " + f(yt) + "A" + rx + " " + ry + " 0 1 1 " + f(-h) + " " + f(yt) + "Z";
}
const CRESCENT = crescentPath(17, 8.5, 13, 8);
/** The mark's proportions in the 64 box: bead radius, thread width, paper gap, and how far the thread rises above the centre. */
const MARK = { R: 17, t: 4.4, g: 1.8, top: 25.6 };

/**
 * The crescent bead at `c`, scaled `s`, its opening facing protractor angle `phi`, on a thread from `a` to `b`: the thread
 * comes through the opening and stops a paper gap above the bowl's floor, runs behind the base and leaves it a gap below
 * (a mask of the bead grown by the gap). `on` = 0 hides the bead (before it drops onto the thread).
 */
function strungCrescent(p: string, cc: Pt, phi: number, s: number, a: Pt, b: Pt, ink: string, tw: number, on = 1): FNode[] {
  const T = "translate(" + pt(cc) + ") rotate(" + f(90 - phi) + ") scale(" + f(s) + ")";
  const box = { maskUnits: "userSpaceOnUse", x: -80, y: -80, width: 300, height: 260 };
  return [
    ["mask", p + "m", box, [
      ["rect", p + "mr", { x: -80, y: -80, width: 300, height: 260, fill: "white" }],
      ["path", p + "mc", { d: CRESCENT, transform: T, fill: CUT, stroke: CUT, "stroke-width": f((2 * MARK.g * on) || 0.01) }],
    ]],
    ["g", p + "tg", { mask: "url(#@" + p + "m)" }, [["path", p + "t", merge(stroke(tw, ink), { d: "M" + pt(a) + "L" + pt(b) })]]],
    ["path", p + "b", { d: CRESCENT, transform: T, fill: ink, opacity: f(on) }],
  ];
}

/* ------------------------------------------------------------------ */
/* mark: the logo forms in his hand                                    */
/* ------------------------------------------------------------------ */

export const MARK_STING = { box: [96, 80] as const, len: 4.6 };

export function markFrame(c: StingCtx): FNode[] {
  const T = c.still ? 99 : c.tt;
  const INK = c.ink;
  const dy = 16;
  /* walk in: body x, the walk fading out, the step phase */
  const bx = keys(T, [[0, -18], [1.45, 41, (x) => 1 - Math.pow(1 - clamp(x), 2.2)], [1.62, 40, eio]]);
  const walking = 1 - sstep((T - 1.05) / 0.45);
  const ph = TAU * (T / 0.62);
  const bob = walking * 0.9 * Math.abs(Math.sin(ph));
  /* the staff: grip in the right hand, tilted forward while carried, lifted and planted with a thump */
  const lift = keys(T, [[2.8, 0], [3.02, -3.4, eout], [3.16, 0.6, ein], [3.3, 0, eout]]);
  const thump = clamp(1 - Math.abs(T - 3.18) / 0.14);
  const tilt = 13 * walking + keys(T, [[1.3, 0], [1.5, -3, eout], [1.75, 0, eio]]);
  const G: Pt = T >= 1.75 ? [57.5, 50 + lift] : T < 1.45 ? [bx + 16.5, 51.5 + bob] : [lerp(bx + 16.5, 57.5, sstep((T - 1.45) / 0.35)), 50 + lift];
  const upL = 48.9, dnL = 26;
  const tu: Pt = [Math.sin(tilt * DEG), -Math.cos(tilt * DEG)];
  const sTop: Pt = [G[0] + tu[0] * upL, G[1] + tu[1] * upL], sBot: Pt = [G[0] - tu[0] * dnL, G[1] - tu[1] * dnL];
  /* the crescent drops onto the thread from above and settles */
  const s = 0.62, tw = MARK.t * s + 0.4;
  const restY = 17;
  const yC = keys(T, [[1.85, -30], [2.38, restY + lift, ein], [2.52, restY - 2.2, eout], [2.66, restY, ein], [2.8, restY]]) + (T > 2.8 ? lift : 0);
  const CC: Pt = [G[0] + (G[1] - yC) * Math.tan(tilt * DEG), yC];
  const P: FigurePose = {
    bx,
    by: 37 + dy - bob,
    lean: 2 * walking,
    sy: 1 - 0.06 * thump,
    hr: 0,
    hdy: 0,
    hands: [[bx - 11.5, 45.5 + dy], G],
    bend: [1, 1],
    feet: [[0, 0], [0, 0]],
    kbend: [-1, 1],
    F: { eyes: "open", mouth: "smile", lx: 1, ly: 0.2, blink: 1, open: 0, turn: 0.4, ex: 4.6, my: 6.4 },
  };
  const swingL = walking * Math.sin(ph);
  let hl: Pt = [bx - 11.5 - 3 * swingL, 45.5 + dy - Math.abs(swingL)];
  P.feet = [
    [bx - 4.5 + 5.5 * walking * Math.sin(ph), 75.5 - 2.6 * walking * Math.max(0, Math.cos(ph))],
    [bx + 4.5 + 5.5 * walking * Math.sin(ph + Math.PI), 75.5 - 2.6 * walking * Math.max(0, Math.cos(ph + Math.PI))],
  ];
  if (T > 1.8 && T < 2.85) {
    const look = sstep((T - 1.8) / 0.25) * (1 - sstep((T - 2.65) / 0.2));
    P.hr = -7 * look;
    Object.assign(P.F, { ly: 0.2 - 1.8 * look, lx: 1 + 0.6 * look, mouth: look > 0.5 ? "small" : "smile", eyes: look > 0.5 ? "wide" : "open" });
  }
  if (T >= 2.85 && T < 3.35) Object.assign(P.F, { blink: 0.72, mouth: "flat" });
  if (T >= 3.35) {
    const sm = sstep((T - 3.35) / 0.3);
    Object.assign(P.F, { eyes: "happy", mouth: "grin", turn: lerp(0.4, 0.2, sm), lx: 0.3 });
    P.hr = 5 * sm;
    hl = [lerp(hl[0], bx - 11, sm), lerp(hl[1], 45 + dy, sm)];
  }
  P.hands = [hl, G];
  /* the crescent turns with the staff: its opening points along the staff's top */
  let nodes: FNode[] = strungCrescent("mk", CC, 90 - tilt, s, sTop, sBot, INK, tw, T >= 1.85 || c.still ? 1 : 0);
  nodes = nodes.concat(figure({ form: "bare", size: c.size * 0.8, k: 1, ink: INK, bead: INK }, P).nodes);
  /* the thump: two short marks at the foot of the staff, then a sparkle */
  nodes.push(["path", "d1", merge(stroke(1.6, INK), { d: "M" + pt([sBot[0] - 3, sBot[1] - 0.6]) + "L" + pt([sBot[0] - 6.4, sBot[1] - 2.2]), opacity: f(thump) })]);
  nodes.push(["path", "d2", merge(stroke(1.6, INK), { d: "M" + pt([sBot[0] + 3, sBot[1] - 0.6]) + "L" + pt([sBot[0] + 6.4, sBot[1] - 2.2]), opacity: f(thump) })]);
  const spk = sstep((T - 3.45) / 0.3);
  nodes = nodes.concat(sparkles("x", INK, [[73, 6, 0.9 * spk], [80, 20, 0.55 * spk]], T, c.still));
  return nodes;
}

/* ------------------------------------------------------------------ */
/* astra: a hand astra fired into empty space                          */
/* ------------------------------------------------------------------ */

export const ASTRA_STING = { box: [128, 104] as const, len: 5.4 };
const WAVES = [0, 1, 2, 3, 4].map((i) => ({ fr: 1.35 + i * 0.62 + (i % 2) * 0.17, sp: 1 + i * 0.27, ph: i * 1.83, amp: 1 - i * 0.13, w: 1.5 - i * 0.2, op: 0.95 - i * 0.13 }));

export function astraFrame(c: StingCtx): FNode[] {
  const still = c.still;
  const T = still ? 99 : c.tt;
  const INK = c.ink;
  const aim = clamp(c.aim, 135, 180);
  const Y = 24;
  const bx0 = 104;
  /* the astra: the crescent bead on a short thread; from the fist: the grip ends just below it, the bead's base 7.2 above it */
  const s = 0.57, R = MARK.R * s, tw = MARK.t * s + 0.4;
  const BEAD_AT = 7.2 + R, TIP_AT = BEAD_AT + MARK.top * s, GRIP_END = -4.2;
  const dAim = towards(aim);
  const fire = T >= 3.1 ? T - 3.1 : -1;
  const recoil = fire < 0 ? 0 : 2.8 * Math.exp(-fire / 0.22) * Math.min(1, fire / 0.04) + 0.9 * sstep(fire / 0.3);
  const charge = sstep((T - 2.05) / 0.5) * (1 - sstep((T - 2.7) / 0.3));
  const brace = sstep((T - 2.5) / 0.5);
  const swing = keys(T, [[2.62, 0], [2.78, -0.12, eout], [3.08, 1.08, ein], [3.22, 1, eout]]);
  const sw = clamp(swing);
  const bxP = bx0 + recoil, byP = 53 + Y + 1.2 * brace - 0.5 * charge;
  const shL: Pt = [bxP - 6.1, byP - 5.3];
  /* the front arm: rises in front for the summon, lifts for the charge, swings out along the aim */
  const armAng = lerp(keys(T, [[0, 235], [0.5, 142, eout], [1.95, 142], [2.45, 128], [2.62, 126]]), aim, swing);
  const reach = lerp(12, 13.6, sw) - recoil * 0.25;
  const ad = towards(armAng);
  const Fg: Pt = [shL[0] + ad[0] * reach, shL[1] + ad[1] * reach];
  /* held tilted forward (110) through the summon and charge, so the bead stays clear of his face; then into the aim */
  const phi = 110 + (aim - 110) * swing;
  const d = towards(phi);
  const grow = eout((T - 0.55) / 0.6);
  const on = (q: number): Pt => [Fg[0] + d[0] * q, Fg[1] + d[1] * q];
  const head = on(BEAD_AT), tip = on(TIP_AT), end = on(GRIP_END);
  const sTop: Pt = [lerp(Fg[0], tip[0], grow), lerp(Fg[1], tip[1], grow)], sBot: Pt = [lerp(Fg[0], end[0], grow), lerp(Fg[1], end[1], grow)];
  const drop = keys(T, [[1.25, -60], [1.62, 0, ein], [1.72, -2, eout], [1.82, 0, ein]]);
  const beadOn = still || T >= 1.25 ? 1 : 0;
  const CC: Pt = [head[0] - d[0] * drop, head[1] - d[1] * drop];
  const P: FigurePose = {
    bx: bxP,
    by: byP,
    lean: -3 * brace + (4.5 * recoil) / 2.8 - 2 * charge,
    sy: 1 + 0.03 * charge - 0.04 * brace,
    hr: -4 * charge + 3 * brace,
    hdy: 0,
    hands: [Fg, Fg],
    bend: [-1, -1],
    feet: [[lerp(bx0 - 5, bx0 - 14, brace) + recoil * 0.3, 75.5 + Y], [lerp(bx0 + 5, bx0 + 9, brace) + recoil, 75.5 + Y]],
    kbend: [1, -1],
    F: { eyes: "open", mouth: "flat", brows: "focus", lx: -0.9, ly: -0.3, blink: 0.86, open: 0, turn: -0.34, ex: 4.6, my: 6.4 },
  };
  if (T < 0.6) Object.assign(P.F, { mouth: "small", brows: null });
  if (T > 1.25 && T < 1.95) Object.assign(P.F, { ly: -1.5, eyes: "wide", brows: null });
  if (fire >= 0) P.F.mouth = fire < 0.9 ? "o" : "small";
  /* one hand only: the free hand is a fist at the hip, then swings back for balance, opposite the astra */
  const restR: Pt = [bx0 + 11, 51 + Y - 4 * charge];
  const backD = towards(aim + 180 - 16);
  const shR: Pt = [bxP + 6.1, byP - 5.3];
  const balance: Pt = [shR[0] + backD[0] * 13.2, shR[1] + backD[1] * 13.2];
  P.hands = [Fg, [lerp(restR[0], balance[0], sw), lerp(restR[1], balance[1], sw)]];

  let nodes: FNode[] = [];
  /* the wave: five layered sines streaming out of the head along the aim, each a ribbon that thins to a point */
  const O: Pt = [CC[0] + dAim[0] * (MARK.top * s + 3), CC[1] + dAim[1] * (MARK.top * s + 3)];
  const nrm: Pt = [-dAim[1], dAim[0]];
  const swingY = 8 + Math.abs(nrm[1]) * 10, swingX = 8 + Math.abs(nrm[0]) * 10;
  const room = Math.min(dAim[0] < -0.01 ? (O[0] - swingX) / -dAim[0] : 999, dAim[1] < -0.01 ? (O[1] - swingY) / -dAim[1] : 999);
  const Lw = Math.max(20, Math.min(70, room));
  const front = fire < 0 ? 0 : still ? 1 : clamp(fire / 0.85);
  const span = fire < 0 ? 0 : still ? 0.6 : lerp(front, 0.6, sstep((fire - 1.05) / 0.7));
  const power = fire < 0 ? 0 : still ? 0.8 : lerp(1.3 * Math.min(1, fire / 0.15), 0.8, sstep((fire - 0.9) / 0.6));
  const tw2 = still ? 1.4 : T;
  WAVES.forEach((L, i) => {
    const n = 40, c0: Pt[] = [];
    for (let q = 0; q <= n; q++) {
      const u = (q / n) * Math.max(0.001, span);
      const grow2 = 0.36 + 0.64 * Math.min(1, Math.pow(u / 0.55, 0.85));
      const a = TAU * (L.fr * u - L.sp * tw2) + L.ph;
      const y = 11 * power * L.amp * grow2 * (0.82 * Math.sin(a) + 0.18 * Math.sin(a * 0.5 + L.ph * 1.3));
      c0.push([O[0] + dAim[0] * u * Lw + nrm[0] * y, O[1] + dAim[1] * u * Lw + nrm[1] * y]);
    }
    const left: Pt[] = [], right: Pt[] = [];
    for (let q = 0; q <= n; q++) {
      const p0 = c0[Math.max(0, q - 1)], p1 = c0[Math.min(n, q + 1)];
      const tl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const nx = -(p1[1] - p0[1]) / tl, ny = (p1[0] - p0[0]) / tl;
      const v = q / n;
      const hw = (L.w / 2) * (0.55 + 0.45 * sstep(v / 0.1)) * (1 - sstep((v - 0.42) / 0.58));
      left.push([c0[q][0] + nx * hw, c0[q][1] + ny * hw]);
      right.push([c0[q][0] - nx * hw, c0[q][1] - ny * hw]);
    }
    const vis = span > 0.01;
    nodes.push(["path", "wv" + i, { d: vis ? poly(left.concat(right.reverse())) + "Z" : "M0 0", fill: INK, opacity: f(vis ? L.op : 0) }]);
  });
  /* flecks thrown off the wave front as it fires */
  for (let m = 0; m < 6; m++) {
    const tm = fire < 0 || still ? -1 : fire;
    const along2 = Lw * clamp(tm / 0.85) * (0.55 + 0.08 * m);
    const side = [5, -6, 9, -9, 3, -4][m] * (0.4 + tm);
    const fx = O[0] + dAim[0] * along2 + nrm[0] * side, fy = O[1] + dAim[1] * along2 + nrm[1] * side;
    const vis2 = tm > 0.05 && tm < 0.9 ? 1 - sstep((tm - 0.5) / 0.4) : 0;
    nodes.push(["path", "fl" + m, { d: "M0 -1.5L1.3 1L-1.2 1Z", fill: INK, transform: "translate(" + f(fx) + " " + f(fy) + ") rotate(" + f(m * 53 + tm * 500) + ")", opacity: f(vis2) }]);
  }
  /* the charge: rays round the bead, and a burst as it fires */
  const rayL = still ? 0 : keys(T, [[2.05, 0], [2.55, 4.6], [2.75, 3.4], [3.12, 7.5, eout], [3.5, 0, eio]]);
  for (let r = 0; r < 10; r++) {
    const ar = (r * 36 + 18 + (T - 2) * 26) * DEG;
    const l = rayL * (r % 2 ? 0.7 : 1), r0 = R + 2.6;
    nodes.push(["path", "ray" + r, merge(stroke(1.7, INK), { d: "M" + pt([CC[0] + Math.cos(ar) * r0, CC[1] + Math.sin(ar) * r0]) + "L" + pt([CC[0] + Math.cos(ar) * (r0 + l), CC[1] + Math.sin(ar) * (r0 + l)]), opacity: f(rayL > 0.2 ? 1 : 0) })]);
  }
  /* the summon: sparks drawn in toward the open hand */
  const sp = clamp(T / 0.6), so = still ? 0 : Math.sin(Math.PI * sp) * (T < 0.62 ? 1 : 0);
  for (let j = 0; j < 6; j++) {
    const aj = (j * 60 + 20) * DEG, rr = lerp(17, 4, eio(sp));
    nodes.push(["path", "sum" + j, merge(stroke(1.5, INK), { d: "M" + pt([Fg[0] + Math.cos(aj) * rr, Fg[1] + Math.sin(aj) * rr]) + "L" + pt([Fg[0] + Math.cos(aj) * (rr + 3.4), Fg[1] + Math.sin(aj) * (rr + 3.4)]), opacity: f(so) })]);
  }
  /* speed lines behind the head as it swings down */
  const spd = still ? 0 : clamp(1 - Math.abs(T - 2.95) / 0.13);
  const back = towards(phi - 90);
  for (let k = 0; k < 3; k++) {
    const b0: Pt = [CC[0] - back[0] * (6 + k * 5) + d[0] * (k - 1) * 4, CC[1] - back[1] * (6 + k * 5) + d[1] * (k - 1) * 4];
    nodes.push(["path", "spd" + k, merge(stroke(1.4, INK), { d: "M" + pt(b0) + "L" + pt([b0[0] - back[0] * 7, b0[1] - back[1] * 7]), opacity: f(spd * (1 - k * 0.25)) })]);
  }
  nodes = nodes.concat(strungCrescent("ax", CC, phi, s, grow > 0.01 ? sTop : Fg, grow > 0.01 ? sBot : Fg, INK, tw, beadOn));
  return nodes.concat(figure({ form: "bare", size: c.size * 0.8, k: 1, ink: INK, bead: INK }, P).nodes);
}
