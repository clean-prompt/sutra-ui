/**
 * The bow character of SutraMascot (internal): the bead buddy's body (a bead on its thread, the thread running under the
 * right rim) with lashes and a bow tied from the thread at the back of her head: two loops, two short tails and a knot, laid
 * over the rim with the mark's paper gap. Below 48 px the bow is drawn bigger, flatter and solid, lifted clear of the head, so
 * it stays a bow. The head moves (x, y, rot, sy); the bow wobbles a beat behind it (`sway`, degrees), its tails a little more.
 */
import {
  CUT, bang, blink, dots, eio, ein, eout, f, faceKids, hear, keys, merge, mod, pt, ring, rot, sine, sparkles, spring, sstep,
  stroke, sweat, talk, zees, type Attrs, type Face, type FNode, type FrameCtx, type Pt,
} from "./mascot-kit-internal";

const BOW_LOOP = "M.5 -1.2C3 -6.6 10.4 -7.9 11 -2.3C11.5 2.7 4.6 3.8 .5 1.4Z";
const BOW_HOLE = "M3.7 -1C5.3 -4 8.6 -4.6 8.9 -1.7C9.2 1 5.6 1.7 3.7 .6Z";

/** The bow at (x, y), turned deg, scaled sc. `halo` > 0 draws it as a mask cut-out grown by halo (the paper gap on the head). */
function bowNodes(p: string, x: number, y: number, deg: number, sc: number, sway: number, holes: boolean, paint: string, halo: number): FNode[] {
  const fill = halo ? CUT : paint;
  const edge: Attrs = halo ? { stroke: CUT, "stroke-width": f(halo), "stroke-linejoin": "round" } : {};
  const loopD = BOW_LOOP + (holes ? BOW_HOLE : "");
  const t1 = rot(-3.4, 7, sway * 0.7), t2 = rot(4.4, 6.3, sway * 0.7);
  const tw2 = 2.9 + (halo || 0);
  return [["g", p + "g", { transform: "translate(" + f(x) + " " + f(y) + ") rotate(" + f(deg) + ") scale(" + f(sc) + ")" }, [
    ["path", p + "t1", merge(stroke(tw2, fill), { d: "M-.6 1.2L" + pt(t1) })],
    ["path", p + "t2", merge(stroke(tw2, fill), { d: "M.6 1.2L" + pt(t2) })],
    ["path", p + "l1", merge(edge, { d: loopD, fill, "fill-rule": "evenodd" })],
    ["path", p + "l2", merge(edge, { d: loopD, fill, "fill-rule": "evenodd", transform: "scale(-1 1)" })],
    ["ellipse", p + "k", merge(edge, { cx: 0, cy: 0.1, rx: 2.7, ry: 2.9, fill })],
  ]]];
}

export function bowFrame(c: FrameCtx): FNode[] {
  const s = c.state, t = c.t, tt = c.tt, still = c.still, k = c.k;
  const tile = c.form === "tile", sil = c.form === "sil";
  const INK = c.ink;
  const R = tile ? 17.6 : 17;
  const C0: Pt = tile ? [33.5, 31] : [33, 32.5];
  let dx = 0, dy = 0, hr = 0, sy = 1, sway = 0;
  const F: Face = { eyes: "open", mouth: "smile", brows: null, lx: 0.5, ly: 0.2, blink: 1, open: 0, turn: 0.3, k, R, ex: 5.4, my: 7, lashes: true, small: c.size < 64 };
  let X = "";
  switch (s) {
    case "listening": {
      const up = still ? 1 : spring(tt - 0.08, 1.3, 0.48);
      hr = 7 * up + (still ? 0 : 1.4 * sine(t, 3.4));
      dy = -1.6 * up;
      dx = 0.8 * up;
      sway = -10 * up + (still ? 0 : 3 * sine(t - 0.4, 3.4));
      Object.assign(F, { eyes: "wide", mouth: "small", turn: 0.44, lx: 1, ly: -0.2, blink: still ? 1 : blink(t, 1.7) });
      X = "hear";
      break;
    }
    case "thinking": {
      hr = still ? -4 : 4 * sine(t, 3.6);
      sway = still ? 6 : -9 * sine(t - 0.45, 3.6);
      Object.assign(F, { eyes: "squint", brows: "raised", mouth: "smirk", turn: 0.18, ly: -1.2, lx: 0.4, blink: still ? 1 : blink(t, 2.9) });
      X = "dots";
      break;
    }
    case "working": {
      /* she tugs her thread: a small pull and release; the bow bounces with each tug */
      const T = 1.5;
      const p = still ? 0.3 : mod(t, T) / T;
      const pull = (q: number) => keys(q, [[0, 0], [0.25, 1, eout], [0.45, 0.85], [0.7, -0.3, eio], [1, 0, eio]]);
      const tug = pull(p);
      dx = 1.4 * tug;
      hr = 2.5 * tug;
      sway = still ? -6 : -12 * pull(mod(p - 0.08, 1));
      Object.assign(F, { eyes: "open", blink: 0.72, mouth: "flat", turn: 0.38, lx: 0.8, ly: 0.6 });
      X = "sweat";
      break;
    }
    case "speaking": {
      const lv = still ? 0.6 : talk(t, 13), lv2 = still ? 0.6 : talk(t - 0.14, 13);
      dy = -1.5 * lv;
      sy = 1 + 0.04 * (lv - 0.3);
      hr = still ? 2 : 2.4 * sine(t, 3.8);
      sway = 12 * (lv2 - lv) + (still ? 0 : 3 * sine(t - 0.5, 3.8));
      Object.assign(F, { mouth: "say", open: lv, blink: still ? 1 : blink(t, 3.2) });
      break;
    }
    case "happy": {
      /* a jump: squash, stretch up, squash on landing; the bow flaps after her and settles */
      if (still) {
        dy = -5;
        sy = 1.05;
        sway = 16;
      } else {
        dy = -keys(tt, [[0, 0], [0.16, 0], [0.42, 8, eout], [0.62, 0, ein], [0.78, 2.4, eout], [0.92, 0, ein]]);
        sy = 1 + keys(tt, [[0, 0], [0.16, -0.12, eout], [0.3, 0.1, eout], [0.5, 0.02], [0.62, -0.13, eout], [0.74, 0.04], [0.92, -0.04], [1.1, 0]]);
        sway = 20 * Math.sin(Math.PI * Math.min(1, Math.max(0, (tt - 0.22) / 0.55))) - 12 * ring(tt - 0.75, 1.6, 0.4) + 3 * sine(t, 3) * sstep((tt - 1.3) / 0.5);
      }
      Object.assign(F, { eyes: "happy", mouth: "grin", turn: 0.18 });
      X = "sparkles";
      break;
    }
    case "sleeping": {
      hr = -8;
      dy = 1.4;
      sy = 1 + (still ? 0 : 0.022 * sine(t, 5.2));
      sway = 4;
      Object.assign(F, { eyes: "closed", mouth: "sleep", turn: 0.06, ly: 0.8 });
      X = "zees";
      break;
    }
    case "error": {
      dx = still ? 0 : 2.2 * ring(tt, 3.2, 0.3);
      hr = still ? -3 : -3 * sstep(tt / 0.3) + 3 * ring(tt, 3.2, 0.3);
      sway = still ? -14 : -22 * ring(tt - 0.08, 1.6, 0.5) - 8 * sstep(tt / 0.6);
      Object.assign(F, { eyes: "wide", eyeBig: [0.9, 0.9], brows: "worried", mouth: "wavy", turn: 0.12, ly: 0.6 });
      X = "bang";
      break;
    }
    default: {
      sy = 1 + (still ? 0 : 0.02 * sine(t, 4));
      hr = still ? 0 : 1.2 * sine(t, 8);
      sway = still ? 0 : 6 * sine(t - 0.5, 4.2);
      F.blink = still ? 1 : blink(t, 0.2);
    }
  }

  const Cc: Pt = [C0[0] + dx, C0[1] + dy];
  const sx = 1 / Math.sqrt(sy);
  const W = (p: Pt): Pt => {
    const q = rot(p[0] * sx, p[1] * sy, hr);
    return [Cc[0] + q[0], Cc[1] + q[1]];
  };
  const tw = c.size >= 96 ? 3.6 : c.size >= 64 ? 4.2 : c.size >= 48 ? 4.5 : 5;
  const gap = 2;
  /* the bow: at the back of the head, tilted with its curve; below 48 px bigger, flatter, solid and clear of the head */
  const smallBow = c.size < 48;
  const bpos = smallBow ? W([-R * 0.5, -R * 1.04]) : W([-R * 0.58, -R * 0.84]);
  const bdeg = (smallBow ? -16 : -32) + hr + sway * 0.45 + (s === "sleeping" ? -14 : 0);
  const bsc = (tile ? 1.02 : 0.98) * (smallBow ? (c.size < 32 ? 1.5 : 1.36) : 1);
  const holes = !smallBow && !sil;
  const stubEnd = W([R + (tile ? 30 : 7.6), 1.2]), stubStart = W([R * 0.3, 1.2]);
  const box = { maskUnits: "userSpaceOnUse", x: -40, y: -40, width: 144, height: 144 };
  const white = { x: -40, y: -40, width: 144, height: 144, fill: "white" };
  const headT = "rotate(" + f(hr) + " " + pt(Cc) + ")";
  let nodes: FNode[] = [];
  if (!sil) {
    nodes.push(["mask", "tm", box, [["rect", "tmr", white], ["ellipse", "tmc", { cx: Cc[0], cy: Cc[1], rx: R * sx + gap, ry: R * sy + gap, transform: headT, fill: CUT }]]]);
    nodes.push(["mask", "fm", box, [
      ["rect", "fmr", white],
      ["g", "fg", { transform: "translate(" + pt(Cc) + ") rotate(" + f(hr) + ") scale(" + f(sx) + " " + f(sy) + ") translate(0 -0.8)" }, faceKids("f", F)],
      ["g", "fbw", {}, bowNodes("fh", bpos[0], bpos[1], bdeg, bsc, sway, false, CUT, (2 * gap) / bsc)],
    ]]);
  }
  const threadD = "M" + pt(stubStart) + "L" + pt(stubEnd);
  nodes.push(["path", "thread", merge(stroke(tw, INK), sil ? { d: threadD } : { d: threadD, mask: "url(#@tm)" })]);
  nodes.push(["g", "headg", sil ? {} : { mask: "url(#@fm)" }, [["ellipse", "head", { cx: Cc[0], cy: Cc[1], rx: R * sx, ry: R * sy, transform: headT, fill: c.bead }]]]);
  nodes = nodes.concat(bowNodes("bw", bpos[0], bpos[1], bdeg, bsc, sway, holes, INK, 0));
  if (!sil) {
    const top = Cc[1] - R * sy;
    if (X === "hear") nodes = nodes.concat(hear("x", INK, Cc[0] + R * 0.25, Cc[1] - 6.5, R * 0.75, t, still));
    if (X === "dots") nodes = nodes.concat(dots("x", INK, Cc[0] + R * 0.62 + 1.5, top + 2.2, t, still));
    if (X === "sweat") nodes = nodes.concat(sweat("x", INK, Cc[0] + R * 0.82 + 2.6, Cc[1] - R * 0.78, t, still, 0.95));
    if (X === "sparkles") nodes = nodes.concat(sparkles("x", INK, tile ? [[56, 14, 0.7], [12, 46, 0.6]] : [[58, 12, 0.8], [8, 44, 0.65], [59, 46, 0.55]], t, still));
    if (X === "zees") nodes = nodes.concat(zees("x", INK, Cc[0] + R * 0.62 + 2.5, top + 4, t, still, 0.9));
    if (X === "bang") nodes = nodes.concat(bang("x", INK, 57, 12, tt, still, 0.9));
  }
  return nodes;
}
