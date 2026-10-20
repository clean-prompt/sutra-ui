/**
 * The pendant characters of SutraMascot (internal): a bead hanging on a thread that comes down from above the box (or the
 * tile's top edge), with a paper gap where the thread meets the rim, as in the mark. Three variants share one rig:
 * `pendant` (a knot under the bead), `knot-pendant` (the bead hangs straight from a knot whose loose end points up) and `bun`
 * (no knot: a bun with a pin at the back of the head, and lashes).
 *
 * Rig: `ang` swings the whole pendulum, `lift` shortens the thread, `climb` moves the bead alone up the thread, `tilt` turns
 * the bead on the thread, the face `turn` twists it on its axis, `sy` squashes or stretches it, `knot` is the knot's own swing
 * (it lags: overlap), `kink` bends the thread.
 */
import {
  CUT, TAU, bang, blink, clamp, dots, down, ein, eout, f, faceKids, hear, keys, merge, mod, poly, pt, ring, rot, sine, sparkles,
  spring, sstep, stroke, sweat, talk, zees, type Face, type FNode, type FrameCtx, type Pt,
} from "./mascot-kit-internal";

/** How far above the bare box the pendulum hangs from (the thread is cut by the box edge). */
const HANG = 20;

export interface PendantVariant {
  knot: "below" | "above";
  bun?: boolean;
  lashes?: boolean;
}

export function pendantFrame(V: PendantVariant) {
  const above = V.knot === "above";
  return function frame(c: FrameCtx): FNode[] {
    const s = c.state, t = c.t, tt = c.tt, still = c.still, k = c.k;
    const tile = c.form === "tile", sil = c.form === "sil";
    const INK = c.ink;
    const PY = tile ? -2 : -HANG;
    const BY = above ? (tile ? 35 : 36.5) : tile ? 29.5 : 32.2;
    const R0 = above ? (tile ? 18 : 15.6) : tile ? 18 : 15;
    let ang = 0, lift = 0, climb = 0, tilt = 0, sy = 1, knot: number | null = null, kink = 0, marks = 0, knotDrop = 0;
    const below = tile ? 7.6 : 8.2;
    const F: Face = { eyes: "open", mouth: "smile", brows: null, lx: 0.3, ly: 0, blink: 1, open: 0, turn: 0.26, k, R: R0, ex: 5.3, my: 7.2 };
    let sw: number, p: number;
    switch (s) {
      case "listening": {
        /* a small dip, then it rises on a shorter thread and leans toward the user, eyes wide */
        const up = still ? 1 : spring(tt - 0.12, 1.25, 0.5);
        const dip = still ? 0 : -1.6 * Math.sin(Math.PI * clamp(tt / 0.2));
        lift = 4.4 * up + dip;
        tilt = -11 * up - (still ? 0 : 1.8 * sine(t, 3.4));
        ang = 1.6 * up + (still ? 0 : 0.9 * sine(t, 3.4, 0.12));
        knot = ang * 0.5 - (still ? 2 : 2 * sine(t - 0.5, 3.4));
        Object.assign(F, { eyes: "wide", mouth: "small", lx: 1.2 * up, ly: -0.4, turn: 0.26 + 0.12 * up, blink: still ? 1 : blink(t, 1.3) });
        break;
      }
      case "thinking": {
        /* it twists on its thread: looks to one side, holds, turns to the other; the thread shows the twist */
        const T = 6.4;
        const twz = still ? -0.5 : keys(mod(t, T), [[0, -0.5], [1.0, -0.5], [2.1, 0.5], [3.7, 0.5], [4.8, -0.5], [6.4, -0.5]]);
        Object.assign(F, { turn: twz, ly: -1.4, eyes: "squint", brows: "raised", mouth: "smirk", blink: still ? 1 : blink(t, 2.4) });
        ang = still ? 0 : 0.7 * sine(t, T);
        knot = still ? 0 : -2.2 * sine(t - 0.35, T / 2);
        marks = twz;
        break;
      }
      case "working": {
        /* it climbs its thread in three hitches (squash before each, stretch during), then slides back onto the knot */
        const T2 = 3.8;
        p = still ? 2.2 : mod(t, T2);
        climb = keys(p, [[0, 0], [0.22, -0.5, eout], [0.52, 2.9, eout], [0.72, 2.7], [0.92, 2.3, eout], [1.22, 5.7, eout], [1.42, 5.5], [1.62, 5.1, eout], [1.92, 8.4, eout], [2.75, 8.4], [3.35, 0, ein], [3.8, 0]]);
        sy = 1 + keys(p, [[0, 0], [0.22, -0.08], [0.42, 0.06], [0.72, 0], [0.92, -0.08], [1.12, 0.06], [1.42, 0], [1.62, -0.08], [1.82, 0.06], [2.2, 0], [3.3, 0], [3.42, -0.1, eout], [3.6, 0.03], [3.8, 0]]);
        knot = still ? 0 : -1.4 * Math.sin(TAU * clamp((p - 3.3) / 0.5)) * (1 - clamp((p - 3.3) / 0.5));
        Object.assign(F, { eyes: "open", blink: 0.74, mouth: "flat", ly: -1.5, lx: 0.5, turn: 0.2 });
        break;
      }
      case "speaking": {
        /* it bobs on the thread like a spring: the bead dips with each phrase, the knot follows a beat later */
        const lv = still ? 0.62 : talk(t, 7), lv1 = still ? 0.62 : talk(t - 0.08, 7), lv2 = still ? 0.62 : talk(t - 0.2, 7);
        lift = -2.4 * lv1 + (still ? 0 : 0.35 * sine(t, 2.6));
        sy = 1 + 0.05 * (lv1 - 0.3);
        knotDrop = 2.4 * (lv2 - lv1);
        ang = still ? 0 : 1.1 * sine(t, 3.9);
        knot = still ? 0 : 1.6 * sine(t - 0.4, 3.9);
        Object.assign(F, { mouth: "say", open: lv, lx: 0.6, blink: still ? 1 : blink(t, 3.1) });
        break;
      }
      case "happy": {
        /* one big swing: a wind-up, a throw toward the user, swings that die away, then a contented sway */
        const SW: Array<[number, number, ((x: number) => number)?]> = [[0, 0], [0.24, -6.5, eout], [0.72, 19], [1.24, -11], [1.72, 6], [2.18, -3], [2.62, 1.1], [3.05, 0]];
        const calm = sstep((tt - 2.6) / 0.9);
        sw = still ? 13 : keys(tt, SW) + calm * 1.6 * sine(t, 3.4);
        ang = sw;
        knot = still ? 6 : keys(tt - 0.13, SW) * 1.3 + calm * 2.4 * sine(t - 0.4, 3.4);
        tilt = still ? 3 : 0.18 * sw;
        lift = still ? 1.2 : (1.2 * Math.abs(sw)) / 19;
        Object.assign(F, { eyes: "happy", mouth: "grin", lx: 0.2, turn: 0.08 });
        break;
      }
      case "sleeping": {
        /* it hangs low and still, head lolling, breathing slowly */
        lift = -2.8;
        tilt = 9;
        sy = 1 + (still ? 0 : 0.024 * sine(t, 5.4));
        ang = still ? -0.6 : -0.6 + 0.5 * sine(t, 10.8);
        knot = ang - 1.5;
        Object.assign(F, { eyes: "closed", mouth: "sleep", lx: -0.2, ly: 0.9, turn: -0.08 });
        break;
      }
      case "error": {
        /* a sudden jerk down, the thread kinks; a short shake dies out and it stays a little low, worried */
        lift = still ? -1.4 : -keys(tt, [[0, 0], [0.06, 5.2, ein], [0.3, -1.2, eout], [0.52, 2.4], [0.78, 1.1], [1.05, 1.4]]);
        ang = still ? -2 : 6.5 * ring(tt - 0.04, 2.5, 0.3) - 2 * sstep(tt / 0.8);
        knot = still ? -7 : ang * 1.4 - 10 * ring(tt - 0.12, 2.1, 0.42) - 4 * sstep(tt / 0.9);
        kink = still ? 1 : sstep((tt - 0.02) / 0.1);
        tilt = still ? 4 : 4 * sstep(tt / 0.5);
        Object.assign(F, { eyes: "wide", eyeBig: [0.9, 0.9], brows: "worried", mouth: "wavy", lx: -0.3, ly: 0.6, turn: 0 });
        break;
      }
      default: {
        /* idle: a slow sway with the knot a beat behind, a breath, a blink */
        sw = still ? 0 : sine(t, 4.6);
        ang = 2.4 * sw;
        knot = still ? 0 : 3.3 * sine(t - 0.42, 4.6);
        sy = 1 + (still ? 0 : 0.013 * sine(t, 2.3, 0.25));
        F.lx = 0.7 + 0.5 * sw;
        F.blink = still ? 1 : blink(t);
      }
    }
    const kn = knot ?? ang;
    if (above) {
      lift += climb;
      climb = 0;
    }
    if (V.lashes) {
      F.lashes = true;
      F.small = c.size < 64;
    }

    /* geometry */
    const sx = 1 / sy, syy = sy;
    const Lrest = BY - PY;
    const u = down(ang);
    const C: Pt = [32 + u[0] * (Lrest - lift - climb), PY + u[1] * (Lrest - lift - climb)];
    const Cn: Pt = [32 + u[0] * (Lrest - lift), PY + u[1] * (Lrest - lift)];
    const bAng = ang + tilt;
    const rx = R0 * 1.02 * sx, ry = R0 * 0.98 * syy;
    const axis = down(bAng);
    const B: Pt = [C[0] + axis[0] * ry, C[1] + axis[1] * ry];
    const kd = down(kn);
    let K: Pt = [Cn[0] + kd[0] * (ry + below + knotDrop), Cn[1] + kd[1] * (ry + below + knotDrop)];
    const tw = c.size >= 96 ? 3.6 : c.size >= 64 ? 4.2 : c.size >= 48 ? 4.5 : c.size >= 32 ? 5 : 5.6;
    /* the thread: from above the pivot (so its end is never seen) down to the bead, through it, to the knot */
    const P: Pt = [32 - u[0] * 8, PY - u[1] * 8];
    const pts: Pt[] = [P];
    if (kink > 0.001) {
      /* a crimp in the thread above the bead, pointing away from the user */
      const dk = tile ? 7 : HANG + 3.2;
      const nrm: Pt = [-u[1], u[0]];
      const a1: Pt = [32 + u[0] * dk, PY + u[1] * dk];
      const a2: Pt = [a1[0] + u[0] * 3 - nrm[0] * 4.6 * kink, a1[1] + u[1] * 3 - nrm[1] * 4.6 * kink];
      const a3: Pt = [a1[0] + u[0] * 6, a1[1] + u[1] * 6];
      pts.push([32, PY], a1, a2, a3);
    }
    /* knot above: it sits right on the bead (a hairline of paper between them) and moves with it: the bead hangs from it */
    let KA: Pt | null = null;
    if (above && !V.bun) {
      const kr0 = tw * 0.86 + 0.3;
      const ax0 = down(ang + tilt);
      KA = [C[0] - ax0[0] * (R0 * 0.98 * syy + kr0 + 1.1), C[1] - ax0[1] * (R0 * 0.98 * syy + kr0 + 1.1)];
    }
    if (above) pts.push(KA ?? C);
    else pts.push(C, B, K);
    const threadD = poly(pts);
    /* knot above: its loose end points up beside the thread (up and away from the user); below: it hangs down */
    const tailA = above ? ang + 206 + 1.3 * (kn - ang) : kn + 9 + 0.8 * (kn - ang);
    if (KA) K = KA;
    const td = down(tailA);
    const KR = tw * 0.86 + 0.3;
    const tailLen = above ? KR + (c.size < 64 ? 2 : 3.2) : KR + 2.6;
    const tailEnd: Pt = [K[0] + td[0] * tailLen, K[1] + td[1] * tailLen];
    /* down(a) swings right for a > 0, which is a counter-clockwise turn */
    const beadT = "rotate(" + f(-bAng) + " " + pt(C) + ")";
    const box = { maskUnits: "userSpaceOnUse", x: -60, y: -90, width: 184, height: 220 };
    const white = { x: -60, y: -90, width: 184, height: 220, fill: "white" };

    let nodes: FNode[] = [];
    const gap = 2.2;
    if (!sil) {
      const cut: FNode[] = [
        ["rect", "tmr", white],
        ["ellipse", "tmc", { cx: C[0], cy: C[1], rx: rx + gap, ry: ry + gap, transform: beadT, fill: CUT }],
      ];
      if (s === "thinking") {
        /* twist marks: thin paper cuts across the thread above the bead, sliding as it turns */
        for (let i = 0; i < 3; i++) {
          const dd = (tile ? 4 : HANG + 1.5) + mod(i * 3.4 + marks * 5, 10.2);
          const m0: Pt = [32 + u[0] * dd, PY + u[1] * dd];
          const md = rot(4.2, 0, ang - 32);
          cut.push(["path", "tmk" + i, merge(stroke(1.1), { d: "M" + pt([m0[0] - md[0], m0[1] - md[1]]) + "L" + pt([m0[0] + md[0], m0[1] + md[1]]) })]);
        }
      }
      nodes.push(["mask", "tm", box, cut]);
      nodes.push(["mask", "fm", box, [
        ["rect", "fmr", white],
        ["g", "fg", { transform: "translate(" + pt(C) + ") rotate(" + f(-bAng) + ") scale(" + f(sx) + " " + f(syy) + ") translate(0 -0.9)" }, faceKids("f", F)],
      ]]);
    }
    nodes.push(["path", "thread", merge(stroke(tw, INK), sil ? { d: threadD } : { d: threadD, mask: "url(#@tm)" })]);
    if (!V.bun) {
      nodes.push(["path", "tail", merge(stroke(tw * 0.9, INK), { d: "M" + pt(K) + "L" + pt(tailEnd) })]);
      nodes.push(["circle", "knot", { cx: K[0], cy: K[1], r: KR, fill: INK }]);
    } else {
      /* the bun sits behind the head at the back (away from the user); a pin goes through it like the thread through the mark */
      const bl = rot(-R0 * 0.66, -R0 * 0.84, -bAng), bc: Pt = [C[0] + bl[0], C[1] + bl[1]], brr = tile ? 8 : 7.6;
      const pa = rot(4.6, 2.2, -bAng), pb = rot(-9.4, -4.4, -bAng);
      const p1: Pt = [bc[0] + pa[0], bc[1] + pa[1]], p2: Pt = [bc[0] + pb[0], bc[1] + pb[1]];
      const headCut = { cx: C[0], cy: C[1], rx: rx + gap, ry: ry + gap, transform: beadT, fill: CUT };
      if (!sil) {
        nodes.push(["mask", "bm", box, [["rect", "bmr", white], ["ellipse", "bmh", headCut], ["path", "bmp", merge(stroke(1.9 + 2 * 1.6), { d: "M" + pt(p1) + "L" + pt(p2) })]]]);
        nodes.push(["mask", "pm", box, [["rect", "pmr", white], ["ellipse", "pmh", headCut]]]);
      }
      nodes.push(["g", "bung", sil ? {} : { mask: "url(#@bm)" }, [["circle", "bun", { cx: bc[0], cy: bc[1], r: brr, fill: INK }]]]);
      if (!sil) {
        nodes.push(["g", "ping", { mask: "url(#@pm)" }, [
          ["path", "pin", merge(stroke(1.9, INK), { d: "M" + pt(p1) + "L" + pt(p2) })],
          ["circle", "pinh", { cx: p2[0], cy: p2[1], r: 1.7, fill: INK }],
        ]]);
      }
    }
    /* the mask sits on an untransformed wrapper: a mask in userSpaceOnUse follows the masked element's own transform */
    nodes.push(["g", "beadg", sil ? {} : { mask: "url(#@fm)" }, [["ellipse", "bead", { cx: C[0], cy: C[1], rx, ry, transform: beadT, fill: c.bead }]]]);

    if (!sil) {
      const top = C[1] - ry;
      if (s === "listening") nodes = nodes.concat(hear("x", INK, C[0] + rx * 0.2, C[1] - 1, rx * 0.8, t, still));
      if (s === "thinking") nodes = nodes.concat(dots("x", INK, C[0] + rx + 1.2, top + 2.6, t, still));
      if (s === "happy") nodes = nodes.concat(sparkles("x", INK, tile ? [[14, 15, 0.8], [52, 13, 0.62]] : [[12, 9, 0.95], [7, 30, 0.62], [57, 7, 0.75]], t, still));
      if (s === "sleeping") nodes = nodes.concat(zees("x", INK, C[0] + rx * 0.62 + 4, top + 5, t, still, tile ? 0.8 : 1));
      if (s === "error") nodes = nodes.concat(bang("x", INK, tile ? 50 : 53, tile ? 17 : 15, tt, still, tile ? 0.85 : 1));
      if (s === "working") nodes = nodes.concat(sweat("x", INK, C[0] - rx * 0.86 - 2.4, C[1] - ry * 0.62, t, still, tile ? 0.85 : 1));
    }
    return nodes;
  };
}
