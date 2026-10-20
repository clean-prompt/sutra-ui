/**
 * The bindu character of SutraMascot (internal): a drop of ink whose tip curls into a thread end, with a cut-out face and
 * squash and stretch for every state. Production changes from the review (to keep it clear of Dragon Quest's Slime, a squat
 * drop with a short pointed tip and a wide grin): the body is taller and narrower (radius 14.2 instead of 15.4, the tip 29.5
 * above the belly's centre instead of 25.5), the thread curl is longer and more prominent (a bigger loop, scaled 1.18), and the
 * mouth is smaller (0.72 of the shared face).
 */
import {
  bang, blink, clamp, dots, eio, ein, eout, f, faceKids, hear, keys, lerp, merge, mod, pt, ring, rot, sine, smooth, sparkles,
  spring, sstep, stroke, talk, zees, type Face, type FNode, type FrameCtx, type Pt,
} from "./mascot-kit-internal";

/** The drop: a round belly (centre cx, cy, radii rx, ry) pinched up to a tip of the thread's width at (tx, ty). */
function dropPath(cx: number, cy: number, rx: number, ry: number, tx: number, ty: number, w: number) {
  const kk = 0.5523;
  return (
    "M" + pt([tx - w, ty]) +
    "C" + pt([tx - w * 1.25, ty + (cy - ty) * 0.45]) + " " + pt([cx - rx, cy - ry * 0.98]) + " " + pt([cx - rx, cy]) +
    "C" + pt([cx - rx, cy + ry * kk]) + " " + pt([cx - rx * kk, cy + ry]) + " " + pt([cx, cy + ry]) +
    "C" + pt([cx + rx * kk, cy + ry]) + " " + pt([cx + rx, cy + ry * kk]) + " " + pt([cx + rx, cy]) +
    "C" + pt([cx + rx, cy - ry * 0.98]) + " " + pt([tx + w * 1.25, ty + (cy - ty) * 0.45]) + " " + pt([tx + w, ty]) + "Z"
  );
}
/** The thread end at the tip, in the tip's frame (y up is negative): it rises and curls over toward the user. */
const CURL: Pt[] = [[0, 0.6], [0.1, -3], [1.2, -6.4], [4, -8.9], [7.6, -8.8], [9.6, -6.2], [8.8, -3.2], [6.2, -2.5]];
const STIFF: Pt[] = [[0, 0.6], [0, -2.6], [0.2, -5.3], [1.1, -6.8], [-0.5, -8.2], [0.4, -9.9], [0.5, -11.6], [0.5, -12.8]];
const CURL_SCALE = 1.18;

export function binduFrame(c: FrameCtx): FNode[] {
  const s = c.state, t = c.t, tt = c.tt, still = c.still, k = c.k;
  const tile = c.form === "tile", sil = c.form === "sil";
  const INK = c.ink;
  const R = 14.2, y0 = tile ? 57 : 58.5, cx0 = 32, HT = 29.5;
  let sy = 1, lean = 0, rk = 0, up = 0, dx = 0, crot = 0, csc = 1, wind = 0, stiff = 0;
  const F: Face = { eyes: "open", mouth: "smile", brows: null, lx: 0.4, ly: 0.2, blink: 1, open: 0, turn: 0.3, k, R, ex: 4.8, my: 6.2, mk: 0.72 };
  let X = "";
  let drip: number | null = null, trail: number | null = null;
  switch (s) {
    case "listening": {
      /* it leans toward the user and the tip curls their way, eyes wide */
      const ul = still ? 1 : spring(tt - 0.06, 1.3, 0.45);
      lean = 4.6 * ul + (still ? 0 : 0.8 * sine(t, 3.2));
      sy = 1 + 0.03 * ul;
      crot = 24 * ul + (still ? 0 : 4 * sine(t - 0.3, 3.2));
      csc = 1 + 0.12 * ul;
      Object.assign(F, { eyes: "wide", mouth: "small", turn: 0.44, lx: 1, ly: -0.3, blink: still ? 1 : blink(t, 1.6) });
      X = "hear";
      break;
    }
    case "thinking": {
      /* it rocks slowly while the tip winds into a spiral and turns */
      rk = still ? -5 : 6 * sine(t, 5.2);
      wind = 1;
      crot = still ? -10 : -10 + 14 * sine(t, 2.6);
      sy = 1 + (still ? 0 : 0.02 * sine(t, 2.6));
      Object.assign(F, { eyes: "squint", brows: "raised", mouth: "smirk", turn: 0.16, ly: -1.2, lx: 0.4, blink: still ? 1 : blink(t, 2.8) });
      X = "dots";
      break;
    }
    case "working": {
      /* it hops along on the spot and leaves a dotted trail of ink behind it */
      const T = 1.3;
      const p = still ? 0.48 : mod(t, T) / T;
      up = 4.6 * Math.sin(Math.PI * clamp((p - 0.22) / 0.52));
      sy = 1 + keys(p, [[0, 0], [0.18, -0.11, eout], [0.3, 0.07, eout], [0.62, 0.03], [0.74, 0], [0.82, -0.12, eout], [1, 0, eio]]);
      lean = 2.2;
      crot = -12 * Math.sin(Math.PI * clamp((p - 0.3) / 0.6)) + 6;
      trail = p;
      Object.assign(F, { eyes: "open", blink: 0.72, mouth: "flat", turn: 0.4, lx: 0.8, ly: 0.6 });
      break;
    }
    case "speaking": {
      /* it stretches with the open mouth and squashes between words; the tip bobs after it */
      const lv = still ? 0.6 : talk(t, 9), lv2 = still ? 0.6 : talk(t - 0.12, 9);
      sy = 1 + 0.075 * (lv - 0.3);
      crot = 14 * (lv2 - 0.3) + (still ? 0 : 3 * sine(t, 2.8));
      lean = still ? 0.6 : 0.8 * sine(t, 3.6);
      Object.assign(F, { mouth: "say", open: lv, lx: 0.6, blink: still ? 1 : blink(t, 3.4) });
      break;
    }
    case "happy": {
      /* a squash, a jump with a stretch, a squash on landing and a small bounce; the tip flicks behind */
      if (still) {
        up = 5;
        sy = 1.06;
        crot = -16;
      } else {
        up = keys(tt, [[0, 0], [0.16, 0], [0.42, 7, eout], [0.62, 0, ein], [0.78, 2.2, eout], [0.92, 0, ein]]);
        sy = 1 + keys(tt, [[0, 0], [0.16, -0.14, eout], [0.3, 0.1, eout], [0.5, 0.02], [0.62, -0.15, eout], [0.74, 0.05], [0.92, -0.05], [1.1, 0]]);
        crot = -28 * Math.sin(Math.PI * clamp((tt - 0.2) / 0.5)) + 16 * ring(tt - 0.62, 1.8, 0.4) + 3 * sine(t, 2.8) * sstep((tt - 1.2) / 0.5);
      }
      Object.assign(F, { eyes: "happy", mouth: "grin", turn: 0.16 });
      X = "sparkles";
      break;
    }
    case "sleeping": {
      /* it settles flatter, the tip flops over, and it breathes slowly */
      sy = 0.86 + (still ? 0 : 0.022 * sine(t, 5.4));
      crot = -112;
      csc = 0.92;
      lean = -1.2;
      Object.assign(F, { eyes: "closed", mouth: "sleep", turn: 0.04, ly: 0.8 });
      X = "zees";
      break;
    }
    case "error": {
      /* a shiver, the tip goes stiff with a kink, and one droplet drips off */
      dx = still ? 0 : 1.6 * ring(tt, 4, 0.22);
      stiff = still ? 1 : sstep(tt / 0.15);
      sy = still ? 0.97 : 1 - 0.05 * sstep(tt / 0.2) + 0.02 * ring(tt, 4, 0.25);
      drip = still ? 0.62 : clamp((tt - 0.15) / 1.4);
      Object.assign(F, { eyes: "wide", eyeBig: [0.86, 0.86], brows: "worried", mouth: "wavy", turn: 0.1, ly: 0.7 });
      X = "bang";
      break;
    }
    default: {
      /* idle: a slow wobble (squash and stretch) with the tip swaying a beat behind */
      const wv = still ? 0 : sine(t, 3);
      sy = 1 + 0.03 * wv;
      lean = still ? 0 : 1.1 * sine(t - 0.15, 6);
      crot = still ? 0 : -7 * sine(t - 0.38, 3);
      F.blink = still ? 1 : blink(t, 0.9);
    }
  }

  const tw = c.size >= 96 ? 3.3 : c.size >= 64 ? 3.7 : c.size >= 48 ? 4 : c.size >= 32 ? 4.5 : 5;
  const rx = R / Math.sqrt(sy), ry = R * sy;
  const gy = y0 - up;
  const cx = cx0 + dx, cy = gy - ry;
  const tx = cx + lean, ty = cy - HT * sy;
  /* the curl: rest shape, wound tighter (thinking) or stiffened (error), turned and scaled at the tip */
  const cc = CURL.map((q, i): Pt => {
    let a: Pt = [q[0], q[1]];
    if (wind) {
      const ctr: Pt = [6.6, -5.6], f2 = i < 3 ? 1 : 1 - 0.26 * ((i - 2) / 5);
      a = [ctr[0] + (a[0] - ctr[0]) * f2, ctr[1] + (a[1] - ctr[1]) * f2];
    }
    if (stiff) a = [lerp(a[0], STIFF[i][0], stiff), lerp(a[1], STIFF[i][1], stiff)];
    const r2 = rot(a[0] * csc * CURL_SCALE, a[1] * csc * CURL_SCALE, crot * (0.25 + 0.75 * (i / 7)));
    return [tx + r2[0], ty + r2[1]];
  });
  const rockT = rk ? "rotate(" + f(rk) + " " + f(cx) + " " + f(gy) + ")" : "";
  const tileT = tile ? "translate(32 37.5) scale(0.98) translate(-32 -38)" : "";
  const nodes: FNode[] = [];
  if (!sil) {
    nodes.push(["mask", "fm", { maskUnits: "userSpaceOnUse", x: -40, y: -40, width: 144, height: 144 }, [
      ["rect", "fmr", { x: -40, y: -40, width: 144, height: 144, fill: "white" }],
      ["g", "fg", { transform: "translate(" + f(cx + lean * 0.25) + " " + f(cy - 1.2 * sy) + ") scale(" + f(1 / Math.sqrt(sy)) + " " + f(sy) + ")" }, faceKids("f", F)],
    ]]);
  }
  let kids: FNode[] = [];
  kids.push(["path", "curl", merge(stroke(tw, INK), { d: smooth(cc) })]);
  kids.push(["g", "bodyg", sil ? {} : { mask: "url(#@fm)" }, [["path", "body", { d: dropPath(cx, cy, rx, ry, tx, ty + 0.4, tw / 2), fill: c.bead }]]]);
  if (s === "error" && !sil) {
    /* the droplet swells at the side, lets go and falls, stretching as it drops */
    const dp = drip ?? 0;
    const dg = clamp(dp / 0.3), fall = clamp((dp - 0.3) / 0.7);
    const dxp = cx + rx * 0.62, dyp = cy + ry * 0.66 + 22 * fall * fall;
    const dr = 2.6 * (0.35 + 0.65 * dg), st = 1 + 0.5 * fall;
    kids.push(["path", "drip", { d: "M0 -3.6C1.8 -1.2 2.6 .2 2.6 1.2A2.6 2.6 0 0 1 -2.6 1.2C-2.6 .2 -1.8 -1.2 0 -3.6Z", fill: c.bead, transform: "translate(" + f(dxp) + " " + f(dyp) + ") scale(" + f(dr / 2.6) + " " + f((dr / 2.6) * st) + ")", opacity: f(1 - sstep((fall - 0.85) / 0.15)) }]);
  }
  if (s === "working" && !sil) {
    /* ink dots left behind, sliding away and shrinking */
    for (let j = 0; j < 3; j++) {
      const u = (j + (trail ?? 0)) / 3;
      const r3 = 2.3 * (1 - u * 0.6);
      kids.push(["circle", "tr" + j, { cx: cx - R - 2 - u * 15, cy: y0 - r3, r: r3, fill: c.bead, opacity: f(1 - sstep((u - 0.7) / 0.3)) }]);
    }
  }
  if (!sil) {
    if (X === "hear") kids = kids.concat(hear("x", INK, cx + rx * 0.3, cy - 2, rx * 0.72, t, still));
    if (X === "dots") kids = kids.concat(dots("x", INK, cx + rx * 0.7 + 3, ty + 3, t, still));
    if (X === "sparkles") kids = kids.concat(sparkles("x", INK, [[12, 20, 0.85], [53, 16, 0.7], [56, 40, 0.55]], t, still));
    if (X === "zees") kids = kids.concat(zees("x", INK, cx + rx * 0.62 + 2, cy - ry - 3, t, still, 0.95));
    if (X === "bang") kids = kids.concat(bang("x", INK, 54, 17, tt, still, 0.9));
  }
  const wrapT = (tileT + " " + rockT).trim();
  nodes.push(["g", "all", wrapT ? { transform: wrapT } : {}, kids]);
  return nodes;
}
