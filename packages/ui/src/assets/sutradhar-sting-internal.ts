/**
 * The three Sutradhar stings as frame functions (internal), with the Sutra mark L10: a crescent bead on an upright thread.
 * `mark`: Sutradhar walks in with a bare thread, the crescent bead drops onto it and becomes the mark, he plants it and smiles.
 * `astra`: he summons a hand astra (the crescent bead on a short thread), charges it until ink lightning crackles round the bead,
 * swings it into the aim and fires an ink wave out of its head; one hand only, no knot. Both end on a still lockup (`still`).
 * `astra-endless`: the same astra on a wide stage that never stops once fired (`astraEndlessFrame`); it holds a still pose under
 * reduced motion.
 */
import { CRESCENT_BEAD, MARK } from "./brand-internal";
import {
  CUT, DEG, TAU, clamp, eio, ein, eout, f, keys, lerp, maskArea, merge, poly, pt, sparkles, sstep, stroke, towards,
  type FNode, type Pt,
} from "./mascot-kit-internal";
import { FIG, figure, type FigurePose } from "./mascot-sutradhar-internal";

export interface StingCtx {
  /** Seconds since the sting started (ignored when still). */
  tt: number;
  /** The final lockup. */
  still: boolean;
  /** Rendered height in px, for line weights. */
  size: number;
  ink: string;
  /** The astra's aim in protractor degrees (90 up, 180 level to the left, 270 down), 30 to 330. */
  aim: number;
}

/* ------------------------------------------------------------------ */
/* The crescent bead (geometry shared with the brand mark: brand-internal.ts) */
/* ------------------------------------------------------------------ */

const CRESCENT = CRESCENT_BEAD;

/**
 * The crescent bead at `c`, scaled `s`, its opening facing protractor angle `phi`, on a thread from `a` to `b`: the thread
 * comes through the opening and stops a paper gap above the bowl's floor, runs behind the base and leaves it a gap below
 * (a mask of the bead grown by the gap). `on` = 0 hides the bead (before it drops onto the thread).
 */
function strungCrescent(p: string, cc: Pt, phi: number, s: number, a: Pt, b: Pt, ink: string, tw: number, on = 1): FNode[] {
  const T = "translate(" + pt(cc) + ") rotate(" + f(90 - phi) + ") scale(" + f(s) + ")";
  const { box, white } = maskArea(-80, -80, 300, 260);
  return [
    ["mask", p + "m", box, [
      ["rect", p + "mr", white],
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
  /* the lockup is the last frame, so a play ends without a jump */
  const T = c.still ? MARK_STING.len : c.tt;
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
  nodes = nodes.concat(figure({ size: c.size * 0.8, k: 1, ink: INK, bead: INK }, P).nodes);
  /* the thump: two short marks at the foot of the staff, then a sparkle */
  nodes.push(["path", "d1", merge(stroke(1.6, INK), { d: "M" + pt([sBot[0] - 3, sBot[1] - 0.6]) + "L" + pt([sBot[0] - 6.4, sBot[1] - 2.2]), opacity: f(thump) })]);
  nodes.push(["path", "d2", merge(stroke(1.6, INK), { d: "M" + pt([sBot[0] + 3, sBot[1] - 0.6]) + "L" + pt([sBot[0] + 6.4, sBot[1] - 2.2]), opacity: f(thump) })]);
  const spk = sstep((T - 3.45) / 0.3);
  nodes = nodes.concat(sparkles("x", INK, [[73, 6, 0.9 * spk], [80, 20, 0.55 * spk]], T, false));
  return nodes;
}

/* ------------------------------------------------------------------ */
/* astra: a hand astra fired into empty space                          */
/* ------------------------------------------------------------------ */

export const ASTRA_STING = { box: [128, 104] as const, len: 5.4 };
/** The endless astra: a wide stage for its long wave; `len` is when the stream is running at full length. */
export const ASTRA_ENDLESS_STING = { box: [256, 104] as const, len: 4.6 };
const WAVES = [0, 1, 2, 3, 4].map((i) => ({ fr: 1.35 + i * 0.62 + (i % 2) * 0.17, sp: 1 + i * 0.27, ph: i * 1.83, amp: 1 - i * 0.13, w: 1.5 - i * 0.2, op: 0.95 - i * 0.13 }));

/** Seeded random numbers (mulberry32): a flicker tick always draws the same crackle, so frames and the lockup repeat. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A jagged line from `a`, heading `ang` (radians) for `len`, kinked `n` times up to `jit` to either side. */
function zigzag(rnd: () => number, a: Pt, ang: number, len: number, n: number, jit: number): Pt[] {
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const pts: Pt[] = [a];
  for (let i = 1; i <= n; i++) {
    const u = (i / n) * len, side = (rnd() - 0.5) * 2 * jit * (i === n ? 0.5 : 1);
    pts.push([a[0] + ux * u - uy * side, a[1] + uy * u + ux * side]);
  }
  return pts;
}

/** A polyline as a filled ribbon `w` wide at its start that thins to a point at its end (like the wave's lines). */
function taper(pts: Pt[], w: number): string {
  const n = pts.length - 1;
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    const hw = (w / 2) * Math.pow(1 - i / n, 0.85);
    left.push([pts[i][0] - (dy / l) * hw, pts[i][1] + (dx / l) * hw]);
    right.push([pts[i][0] + (dy / l) * hw, pts[i][1] - (dx / l) * hw]);
  }
  return poly(left.concat(right.reverse())) + "Z";
}

/** The bolts' order of appearance (by place in the fan), so even a few spread round the bead. */
const BOLT_RANK = [1, 4, 2, 0, 5, 3];
const SPARKS = 9;

/**
 * The astra's energy round the bead at `cc` (radius `r`), ink lightning in the manner of a charged orb: a faint halo, a
 * crackling ring hugging the rim and a second, broken one outside it, small sparks on the ring, and forked bolts that thin to
 * a point. The bolts fan out on the side away from the head at `head`, and the rings leave a gap where the head is close, so
 * nothing crosses the face; `clear` (radians from the bead) is a direction the bolts keep out of, such as a wave's. `e` runs from 0 to about 1.5; the crackle changes with `tick` and holds for a fixed one. The same
 * nodes every frame (unused ones are empty), so the driver only patches attributes.
 */
function energy(cc: Pt, r: number, e: number, tick: number, t: number, head: Pt, ink: string, wk: number, clear?: number): FNode[] {
  const rnd = seeded(tick * 7919 + 101);
  /* the spacing was drawn round a bead of radius 9.7: keep it in proportion to the bead */
  const u = r / 9.7;
  const nodes: FNode[] = [];
  const on = e > 0.04;
  const toHead = Math.atan2(head[1] - cc[1], head[0] - cc[0]);
  const away = toHead + Math.PI;
  const dHead = Math.hypot(head[0] - cc[0], head[1] - cc[1]);
  /* the angle the head covers as seen from the bead, kept clear when it is close */
  const cone = dHead < r + FIG.hr + 8 ? Math.asin(Math.min(1, (FIG.hr + 2.5) / Math.max(dHead, 1))) + 0.12 : 0;
  const from = toHead + cone, sweep = TAU - 2 * cone;
  /* the halo: two flat washes of ink behind the bead, breathing with the charge */
  const breathe = 0.5 * u * Math.sin(t * 9);
  for (let i = 0; i < 2; i++) {
    const rr = r + (i ? 6 + 3.2 * e : 3 + 1.6 * e) * u + breathe;
    nodes.push(["circle", "eh" + i, { cx: f(cc[0]), cy: f(cc[1]), r: f(on ? rr : 0), fill: ink, opacity: f(on ? (i ? 0.06 : 0.1) * Math.min(1, 0.4 + e) : 0) }]);
  }
  /* the rim: two fine crackling filaments hugging it and a fainter ring outside, each broken where its pattern dips, with
     kinks at uneven steps so it reads as crackle, not teeth */
  for (let i = 0; i < 3; i++) {
    const outer = i === 2;
    const rr = r + (outer ? 3.6 + 1.4 * e : 1.5 + 0.35 * e + i * 0.55) * u;
    const jit = (outer ? 0.6 + 0.7 * e : 0.22 + 0.4 * e) * u;
    const off = rnd() * TAU, lobes = outer ? 3 : 4 + i;
    const segs: Pt[][] = [[]];
    for (let a = from; a <= from + sweep; a += (((outer ? 2.6 : 1.6) * u) / rr) * (0.6 + 0.8 * rnd())) {
      if (Math.sin(lobes * (a - from) + off) < (outer ? -0.35 : -0.6)) {
        if (segs[segs.length - 1].length) segs.push([]);
        continue;
      }
      const j = (rnd() - 0.5) * 2 * jit;
      segs[segs.length - 1].push([cc[0] + Math.cos(a) * (rr + j), cc[1] + Math.sin(a) * (rr + j)]);
    }
    const d = segs.filter((s) => s.length > 1).map((s) => poly(s)).join("");
    const vis = on && (outer ? e > 0.45 : true) && d.length > 0;
    nodes.push(["path", "er" + i, merge(stroke((outer ? 0.7 : i ? 0.5 : 0.65) * wk, ink), { d: vis ? d : "M0 0", opacity: f(vis ? (outer ? 0.5 : i ? 0.8 : 0.95) : 0) })]);
  }
  /* sparks: short jagged flicks leaping off the ring */
  const sparks = on ? Math.round(3 + 6 * Math.min(1, e)) : 0;
  for (let k = 0; k < SPARKS; k++) {
    const a = from + rnd() * sweep, len = (2.2 + 2.4 * rnd() * (0.6 + 0.4 * e)) * u;
    const root: Pt = [cc[0] + Math.cos(a) * (r + 2 * u), cc[1] + Math.sin(a) * (r + 2 * u)];
    const pts = zigzag(rnd, root, a + (rnd() - 0.5) * 0.9, len, 2, 0.9 * u);
    const vis = k < sparks;
    nodes.push(["path", "es" + k, { d: vis ? taper(pts, 1.05 * wk) : "M0 0", fill: ink, opacity: f(vis ? 0.85 : 0) }]);
  }
  /* the bolts: forked, fanned round the side away from the head, thinning to a point; more and longer as the charge builds */
  const count = Math.round(clamp((e - 0.2) / 1.1) * BOLT_RANK.length);
  BOLT_RANK.forEach((rank, b) => {
    let ang = away + ((b + 0.5) / BOLT_RANK.length - 0.5) * 3.4 + (rnd() - 0.5) * 0.45;
    if (clear !== undefined) {
      const off = Math.atan2(Math.sin(ang - clear), Math.cos(ang - clear));
      if (Math.abs(off) < 0.6) ang = clear + (off < 0 ? -0.6 : 0.6) + off * 0.5;
    }
    const len = r * (0.45 + 0.9 * e) * (0.7 + 0.6 * rnd());
    const root: Pt = [cc[0] + Math.cos(ang) * (r + 1.6 * u), cc[1] + Math.sin(ang) * (r + 1.6 * u)];
    const main = zigzag(rnd, root, ang, len, 3 + Math.round(len / (3.5 * u)), (0.9 + 0.5 * e) * u);
    const k = Math.ceil(main.length / 2) - 1;
    const fork = zigzag(rnd, main[k], ang + (rnd() < 0.5 ? -1 : 1) * (0.45 + 0.4 * rnd()), len * (0.35 + 0.25 * rnd()), 2 + Math.round(len / (7 * u)), (0.7 + 0.3 * e) * u);
    const op = 0.8 + 0.2 * rnd();
    const vis = on && rank < count;
    const w = (1.5 + 0.5 * Math.min(1, e)) * wk;
    nodes.push(["path", "eb" + b, { d: vis ? taper(main, w) : "M0 0", fill: ink, opacity: f(vis ? op : 0) }]);
    nodes.push(["path", "ef" + b, { d: vis ? taper(fork, w * 0.6 * (1 - k / main.length)) : "M0 0", fill: ink, opacity: f(vis ? op * 0.9 : 0) }]);
  });
  return nodes;
}

/** The astra: fired once, the wave and the energy settle on the lockup. */
export function astraFrame(c: StingCtx): FNode[] {
  return astraScene(c, false);
}

/**
 * The endless astra: the same summon, charge and swing, then it fires and never stops. The energy keeps crackling round the
 * bead and sparks ride out along the wave, which streams on across a wide stage and thins away at its far end.
 */
export function astraEndlessFrame(c: StingCtx): FNode[] {
  return astraScene(c, true);
}

const BRIDGES = 6, BEADS = 4;

/* the astra's proportions: the crescent bead on a short thread, from the fist (the grip ends just below it, the bead's base
   7.2 above it) */
const AS = 0.47;
const AR = MARK.R * AS, BEAD_AT = 7.2 + AR, TIP_AT = BEAD_AT + MARK.top * AS;

/** How the stage frames the astra for an aim (see `astraView`). */
export interface AstraView {
  /** The aim the scene is drawn with, 90 to 270 (he faces left); an aim to the right is drawn as its mirror image. */
  aim: number;
  /** Aimed to the right: the scene is mirrored, so he turns round and faces where he fires. */
  mirror: boolean;
  /** How far the view pulls back (1: not at all) and how far it lifts the scene, so the whole wave stays on the stage. */
  scale: number;
  lift: number;
  /** The wave's full length in scene units. */
  length: number;
  /** The scene-to-stage transform once he has risen ("" when the scene is the stage); `astraStage` gives it on the way. */
  transform: string;
  /** The point the view pulls back about (his feet), the stage's width and where its left edge is in the scene. */
  anchor: Pt;
  width: number;
  left: number;
}

/** The framings worked out so far, most recently used last; capped, since an aim that slides through fractions of a degree would add entries for ever. */
const views = new Map<string, AstraView>();
const MAX_VIEWS = 48;
/** How many framings are cached right now (tests). */
export const astraViewCount = () => views.size;

/** The arm for an aim: along it, except steeply up or down, where it reaches out to the side and the astra alone points the aim, clear of his head and body. */
const armFor = (aim: number) => (aim < 135 ? 135 + (135 - aim) * 0.42 : aim > 225 ? 225 - (aim - 225) * 0.55 : aim);
/** How far a downward shot lifts him off the ground and tucks his feet (0 to 1, from the downward pull of the aim). */
const hoverFor = (dAim: Pt) => sstep((dAim[1] - 0.45) / 0.45);

/** Where the scene stands on the standard square stage: his body's x, and how far the stage's top sits above his ground line. */
const BX0 = 104;
const Y0 = 24;

/** What the astra's pose depends on at a moment: the recoil, brace (0 to 1), charge (0 to 1), swing (0 to 1, clamped) and the wobble of the endless stream. */
interface AstraBeat {
  recoil: number;
  brace: number;
  charge: number;
  sw: number;
  tremble: number;
  /** The front arm's angle (protractor degrees). */
  armAng: number;
}
/** How his feet stand for a moment (x of the front and the back foot): braced, pushed by the recoil, tucked up when he hovers. */
const feetX = (side: number, hover: number, brace: number, recoil: number): [number, number] => [
  lerp(lerp(BX0 - 5, BX0 - 14, brace) + recoil * side * 0.3, BX0 - 2, hover),
  lerp(lerp(BX0 + 5, BX0 + 9, brace) + recoil * side, BX0 + 7, hover),
];
/**
 * His pose on the standard stage, facing left, for an aim at a moment: where his body stands, the front fist that holds the
 * astra and the free hand (swung back for balance, nearer the hip for a steep shot). `astraScene` draws it as it happens and
 * `astraView` takes the settled one (`SETTLED`), so the framing always fits what the scene ends with.
 */
function astraPose(aim: number, dA: Pt, b: AstraBeat) {
  /* how level the shot is: the recoil pushes him back along it, sideways for a level shot, down or up for a steep one */
  const side = sstep(-dA[0] / 0.5);
  const bx = BX0 + b.recoil * side + b.tremble;
  const by = 53 + Y0 + 1.2 * b.brace - 0.5 * b.charge - 0.6 * b.recoil * dA[1] * (1 - side);
  const shL: Pt = [bx - 6.1, by - 5.3];
  const shR: Pt = [bx + 6.1, by - 5.3];
  const ad = towards(b.armAng);
  const reach = lerp(12, 13.6, b.sw) - b.recoil * 0.25;
  const fist: Pt = [shL[0] + ad[0] * reach, shL[1] + ad[1] * reach];
  /* one hand only: the free hand is a fist at the hip, then swings back for balance, opposite the astra */
  const restR: Pt = [BX0 + 11, 51 + Y0 - 4 * b.charge];
  const backD = towards(aim + 180 - 16);
  const balance: Pt = [shR[0] + backD[0] * 13.2, shR[1] + backD[1] * 13.2];
  /* (a steep shot keeps the free hand nearer the hip) */
  const bal = b.sw * (0.35 + 0.65 * side);
  const hand: Pt = [lerp(restR[0], balance[0], bal), lerp(restR[1], balance[1], bal)];
  return { side, bx, by, fist, hand };
}
/** The pose he ends in, once the recoil has settled. */
const settled = (aim: number): AstraBeat => ({ recoil: 0.9, brace: 1, charge: 0, sw: 1, tremble: 0, armAng: armFor(aim) });

/** The stage transform for a view, with its lift risen `rise` (0 to 1) of the way. */
export function astraStage(v: AstraView, rise: number): string {
  const lift = v.lift * rise;
  const camera = v.scale === 1 && lift === 0 && v.left === 0 ? "" : "translate(" + f(v.anchor[0] - v.left) + " " + f(v.anchor[1] - lift) + ") scale(" + f(v.scale) + ") translate(" + f(-v.anchor[0]) + " " + f(-v.anchor[1]) + ")";
  return (v.mirror ? "translate(" + v.width + " 0) scale(-1 1)" + (camera ? " " : "") : "") + camera;
}

/**
 * The framing for an aim of 30 to 330 degrees (protractor: 90 up, 180 level to the left, 270 down). Aims to the right are
 * drawn mirrored. The wave runs as far as the stage allows from the final pose; when that is shorter than a useful wave (an
 * aim straight up, or down into the ground he stands on), the view pulls back about his feet (and lifts the scene for a shot
 * fired downward) just enough for one. Aims the stage already fits keep the scene as it is.
 */
export function astraView(aimDeg: number, endless: boolean): AstraView {
  const a0 = clamp(Number.isFinite(aimDeg) ? aimDeg : endless ? 172 : 150, 30, 330);
  const key = a0 + "|" + endless;
  const known = views.get(key);
  if (known) {
    views.delete(key);
    views.set(key, known);
    return known;
  }
  const mirror = a0 < 90 || a0 > 270;
  const aim = mirror ? (a0 < 90 ? 180 - a0 : 540 - a0) : a0;
  const W = endless ? ASTRA_ENDLESS_STING.box[0] : ASTRA_STING.box[0], H = ASTRA_STING.box[1], M = 2;
  const left = 128 - W, G: Pt = [BX0, 102];
  /* the final pose (as astraScene draws it once the recoil has settled) */
  const dA = towards(aim), nrm: Pt = [-dA[1], dA[0]];
  const { side, bx, by, fist, hand } = astraPose(aim, dA, settled(aim));
  const hover = hoverFor(dA);
  const feet = feetX(side, hover, 1, 0.9);
  const at = (q: number): Pt => [fist[0] + dA[0] * q, fist[1] + dA[1] * q];
  const cc = at(BEAD_AT), O = at(BEAD_AT + MARK.top * AS + 3);
  const headY = by - 22.7;
  /* the wave's swing either side of its line (as much room as the astra's wave always took) */
  const swingX = 8 + Math.abs(nrm[0]) * 10 - M, swingY = 8 + Math.abs(nrm[1]) * 10 - M;
  const box = (L: number) => {
    const E: Pt = [O[0] + dA[0] * L, O[1] + dA[1] * L];
    const xs = [feet[0] - 3, feet[1] + 3, bx - 11, bx + 11, hand[0] - 2.2, hand[0] + 2.2, cc[0] - AR - 8, cc[0] + AR + 8, at(TIP_AT)[0], at(-4.2)[0], O[0] - swingX, O[0] + swingX, E[0] - swingX, E[0] + swingX];
    const ys = [headY - 11, 102, hand[1] - 2.2, hand[1] + 2.2, cc[1] - AR - 8, cc[1] + AR + 8, at(TIP_AT)[1], at(-4.2)[1], O[1] - swingY, O[1] + swingY, E[1] - swingY, E[1] + swingY];
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  /* the lift that fits length L at scale k (none unless `lifts`), or -1 when it does not fit */
  const fits = (k: number, L: number, lifts: boolean) => {
    const b = box(L);
    if (G[0] + k * (b.x0 - G[0]) < left + M - 1e-6 || G[0] + k * (b.x1 - G[0]) > 128 - M + 1e-6) return -1;
    if (k * (b.y1 - b.y0) > H - 2 * M + 1e-6) return -1;
    const lift = Math.max(0, G[1] + k * (b.y1 - G[1]) - (H - M));
    if (lift > 0 && !lifts) return -1;
    return G[1] + k * (b.y0 - G[1]) - lift < M - 1e-6 ? -1 : lift;
  };
  const cap = endless ? 400 : 70;
  const longest = (k: number, lifts: boolean) => {
    if (fits(k, 0, lifts) < 0) return -1;
    if (fits(k, cap, lifts) >= 0) return cap;
    let lo = 0, hi = cap;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (fits(k, mid, lifts) >= 0) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  /* the largest scale (down to `least`) at which a useful wave fits, standing on the ground if he can, lifted if he must */
  const need = endless ? 80 : 40, least = endless ? 0.5 : 0.6;
  const pick = (lifts: boolean) => {
    if (longest(1, lifts) >= need) return 1;
    if (longest(least, lifts) < need) return 0;
    let lo = least, hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (longest(mid, lifts) >= need) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const grounded = pick(false);
  const lifts = grounded === 0;
  const scale = grounded || pick(true) || least;
  const length = Math.max(20, longest(scale, lifts));
  const lift = Math.max(0, fits(scale, length, lifts));
  const view: AstraView = { aim, mirror, scale, lift, length, transform: "", anchor: G, width: W, left };
  view.transform = astraStage(view, 1);
  views.set(key, view);
  if (views.size > MAX_VIEWS) views.delete(views.keys().next().value as string);
  return view;
}

function astraScene(c: StingCtx, endless: boolean): FNode[] {
  /* the astra's lockup is its last frame, so a play ends without a jump; the endless astra never ends and holds a still pose */
  const still = c.still && endless;
  const T = c.still ? (endless ? 99 : ASTRA_STING.len) : c.tt;
  const INK = c.ink;
  /* the scene is drawn facing left, at the standard place on the square stage (the figure's masks cover it only); the view
     mirrors it for an aim to the right, pulls back for a steep one and moves it onto the wide stage of the endless astra */
  const view = astraView(c.aim, endless);
  const aim = view.aim;
  const s = AS, R = AR, tw = MARK.t * s + 0.4, GRIP_END = -4.2;
  const dAim = towards(aim);
  const fire = T >= 3.1 ? T - 3.1 : -1;
  const recoil = fire < 0 ? 0 : 2.8 * Math.exp(-fire / 0.22) * Math.min(1, fire / 0.04) + 0.9 * sstep(fire / 0.3);
  /* the endless stream: once it holds, he trembles with its force */
  const tremble = endless && !still && fire >= 0 ? 0.35 * sstep(fire / 0.4) * Math.sin(T * 47) : 0;
  const charge = sstep((T - 2.05) / 0.5) * (1 - sstep((T - 2.7) / 0.3));
  const brace = sstep((T - 2.5) / 0.5);
  const swing = keys(T, [[2.62, 0], [2.78, -0.12, eout], [3.08, 1.08, ein], [3.22, 1, eout]]);
  const sw = clamp(swing);
  /* the front arm: rises in front for the summon, lifts for the charge, swings out along the aim */
  const armAng = lerp(keys(T, [[0, 235], [0.5, 142, eout], [1.95, 142], [2.45, 128], [2.62, 126]]), armFor(aim), swing);
  /* a downward shot: he rises off the ground as he swings the astra down (so the raised astra never leaves the stage) and
     hovers with his feet tucked */
  const rise = still ? 1 : sstep((T - 2.62) / 0.55);
  const hover = hoverFor(dAim) * rise;
  /* where he stands, his front fist and his free hand: the pose `astraView` takes its settled form from */
  const { side, bx: bxP, by: byP, fist: Fg, hand: freeHand } = astraPose(aim, dAim, { recoil, brace, charge, sw, tremble, armAng });
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
  const feet = feetX(side, hover, brace, recoil);
  const P: FigurePose = {
    bx: bxP,
    by: byP,
    lean: -3 * brace + (4.5 * recoil * side) / 2.8 - 2 * charge,
    sy: 1 + 0.03 * charge - 0.04 * brace,
    hr: -4 * charge + 3 * brace,
    hdy: 0,
    hands: [Fg, freeHand],
    bend: [-1, -1],
    feet: [
      [feet[0], 75.5 + Y0 - 3 * hover],
      [feet[1], 75.5 + Y0 - 3 * hover],
    ],
    kbend: [1, -1],
    /* he looks along the aim: ahead and a little up for a level shot, up or down for a steep one */
    F: { eyes: "open", mouth: "flat", brows: "focus", lx: -0.9 * Math.min(1, -dAim[0] / 0.7), ly: -0.3 + (dAim[1] > 0 ? 1.5 * dAim[1] : 1.2 * Math.min(0, dAim[1] + 0.71)), blink: 0.86, open: 0, turn: -0.34, ex: 4.6, my: 6.4 },
  };
  if (T < 0.6) Object.assign(P.F, { mouth: "small", brows: null });
  if (T > 1.25 && T < 1.95) Object.assign(P.F, { ly: -1.5, eyes: "wide", brows: null });
  if (fire >= 0) P.F.mouth = fire < 0.9 ? "o" : endless ? "flat" : "small";

  let nodes: FNode[] = [];
  /* the wave: five layered sines streaming out of the head along the aim, each a ribbon that thins to a point */
  const O: Pt = [CC[0] + dAim[0] * (MARK.top * s + 3), CC[1] + dAim[1] * (MARK.top * s + 3)];
  const nrm: Pt = [-dAim[1], dAim[0]];
  /* the wave runs as far as the view allows; the astra's settles shorter, the endless one holds its power and pulses */
  const Lw = view.length;
  const front = fire < 0 ? 0 : still ? 1 : clamp(fire / (endless ? 1.4 : 0.85));
  const span = fire < 0 ? 0 : still ? (endless ? 1 : 0.6) : endless ? front : lerp(front, 0.6, sstep((fire - 1.05) / 0.7));
  const pulse = endless && !still ? 1 + 0.08 * Math.sin(T * 3.3) + 0.05 * Math.sin(T * 7.9) : 1;
  const power = fire < 0 ? 0 : still ? (endless ? 1 : 0.8) : lerp(1.3 * Math.min(1, fire / 0.15), endless ? 1 : 0.8, sstep((fire - 0.9) / 0.6)) * pulse;
  const tw2 = still ? 1.4 : T;
  /* over its longer run the endless wave keeps the astra's wavelength, reaches full height sooner and swells as it flows */
  const km = endless ? Lw / 70 : 1;
  const waveAt = (L: (typeof WAVES)[number], u: number): Pt => {
    const grow2 = 0.36 + 0.64 * Math.min(1, Math.pow(u / (endless ? 0.18 : 0.55), 0.85));
    const swell = endless ? 1 + 0.16 * Math.sin(TAU * (u * 1.6 - tw2 * 0.5)) : 1;
    const a = TAU * (L.fr * u * km - L.sp * tw2) + L.ph;
    const y = 11 * power * L.amp * grow2 * swell * (0.82 * Math.sin(a) + 0.18 * Math.sin(a * 0.5 + L.ph * 1.3));
    return [O[0] + dAim[0] * u * Lw + nrm[0] * y, O[1] + dAim[1] * u * Lw + nrm[1] * y];
  };
  const wk = Math.max(1, Math.sqrt(120 / Math.max(40, c.size * view.scale)));
  /* the endless stream glows: a faint wash between its outer strands, narrowing away where the wave thins */
  if (endless) {
    const n = Math.round(40 * Math.max(1, km)), top: Pt[] = [], bottom: Pt[] = [];
    for (let q = 0; q <= n; q++) {
      const u = (q / n) * Math.max(0.001, span), v = q / n;
      const across = WAVES.map((L) => waveAt(L, u)).map((p) => (p[0] - O[0]) * nrm[0] + (p[1] - O[1]) * nrm[1]);
      const keep = 1 - sstep((v - 0.6) / 0.4), mid = (Math.max(...across) + Math.min(...across)) / 2;
      const hiY = mid + (Math.max(...across) + 1.5 - mid) * keep, loY = mid + (Math.min(...across) - 1.5 - mid) * keep;
      const base: Pt = [O[0] + dAim[0] * u * Lw, O[1] + dAim[1] * u * Lw];
      top.push([base[0] + nrm[0] * hiY, base[1] + nrm[1] * hiY]);
      bottom.push([base[0] + nrm[0] * loY, base[1] + nrm[1] * loY]);
    }
    const vis = span > 0.01;
    nodes.push(["path", "glow", { d: vis ? poly(top.concat(bottom.reverse())) + "Z" : "M0 0", fill: INK, opacity: f(vis ? 0.07 * Math.min(1, power) : 0) }]);
  }
  WAVES.forEach((L, i) => {
    const n = endless ? Math.round(40 * Math.max(1, km)) : 40, c0: Pt[] = [];
    for (let q = 0; q <= n; q++) c0.push(waveAt(L, (q / n) * Math.max(0.001, span)));
    const left: Pt[] = [], right: Pt[] = [];
    for (let q = 0; q <= n; q++) {
      const p0 = c0[Math.max(0, q - 1)], p1 = c0[Math.min(n, q + 1)];
      const tl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const nx = -(p1[1] - p0[1]) / tl, ny = (p1[0] - p0[0]) / tl;
      const v = q / n;
      /* the endless wave holds its weight until its last 30 percent */
      const hw = endless
        ? (L.w / 2) * (0.55 + 0.45 * sstep(v / 0.06)) * (1 - sstep((v - 0.7) / 0.3))
        : (L.w / 2) * (0.55 + 0.45 * sstep(v / 0.1)) * (1 - sstep((v - 0.42) / 0.58));
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
  /* the endless flow: lightning jumping across the wave between its outer strands and beads gliding out along its main
     strand, all running outward and gone before the wave thins */
  if (endless) {
    const flow = still ? 1 : sstep((fire - 0.5) / 0.6);
    const fadeAt = (u: number) => sstep((u - 0.07) / 0.06) * (1 - sstep((u - 0.5) / 0.22));
    for (let k = 0; k < BRIDGES; k++) {
      const u = still ? 0.12 + (k / BRIDGES) * 0.52 : (T * 0.42 + k / BRIDGES) % 1;
      /* the outermost strands at this point of the wave */
      const across = WAVES.map((L) => waveAt(L, u)).sort((a, b) => (a[0] - b[0]) * nrm[0] + (a[1] - b[1]) * nrm[1]);
      const lo = across[0], hi = across[across.length - 1];
      const gap = Math.hypot(hi[0] - lo[0], hi[1] - lo[1]);
      const vis = fire >= 0 && u < span && u > 0.07 && gap > 3.5;
      const rnd = seeded((still ? 5 : Math.floor(T * 22)) * 131 + k * 977);
      const pts = zigzag(rnd, lo, Math.atan2(hi[1] - lo[1], hi[0] - lo[0]), gap, 4, 1.3);
      pts[pts.length - 1] = hi;
      nodes.push(["path", "rb" + k, { d: vis ? taper(pts, 1.7 * wk) : "M0 0", fill: INK, opacity: f(vis ? 0.95 * fadeAt(u) * flow : 0) }]);
    }
    for (let k = 0; k < BEADS; k++) {
      const u = still ? 0.2 + (k / BEADS) * 0.4 : (T * 0.3 + k / BEADS) % 1;
      const p = waveAt(WAVES[0], u), p2 = waveAt(WAVES[0], u + 0.004);
      const vis = fire >= 0 && u < span && u > 0.07;
      nodes.push(["ellipse", "bd" + k, { cx: f(p[0]), cy: f(p[1]), rx: f(vis ? 2.5 : 0), ry: f(vis ? 1.6 : 0), transform: "rotate(" + f((Math.atan2(p2[1] - p[1], p2[0] - p[0]) * 180) / Math.PI) + " " + pt(p) + ")", fill: INK, opacity: f(vis ? fadeAt(u) * flow : 0) }]);
    }
  }
  /* the charge: lightning crackles round the bead, bursts as it fires and keeps crackling while the wave streams (and on
     the lockup, held still; the endless astra keeps it at full strength); heavier lines when the sting is drawn small */
  const fig = figure({ size: c.size * 0.8 * view.scale, k: 1, ink: INK, bead: INK }, P);
  const E = endless
    ? still
      ? 1
      : keys(T, [[2, 0], [2.35, 0.75, eout], [2.62, 0.55], [2.92, 0.95], [3.1, 1.5, eout], [3.6, 1]]) + (T > 3.6 ? 0.2 * Math.sin((T - 3.6) * 2.3) + 0.1 * Math.sin((T - 3.6) * 6.1) : 0)
    : still
      ? 0.36
      : keys(T, [[2, 0], [2.35, 0.75, eout], [2.62, 0.55], [2.92, 0.95], [3.1, 1.5, eout], [3.45, 0.8], [4.6, 0.36]]);
  const clear = endless && fire >= 0 ? Math.atan2(dAim[1], dAim[0]) : undefined;
  nodes = nodes.concat(energy(CC, R, E, still ? 3 : Math.floor(T * 22), still ? 0 : T, fig.H, INK, wk, clear));
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
  nodes = nodes.concat(fig.nodes);
  return view.transform ? [["g", "stage", { transform: astraStage(view, rise) }, nodes]] : nodes;
}
