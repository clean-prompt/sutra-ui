/**
 * The mala character of SutraMascot (internal): a head bead leading three smaller beads on a thread, like a little
 * caterpillar. Rig: a spine (head first) carries the beads at fixed spacings; each state moves the head (`hx`, `hy`, `hr` turn
 * in degrees, `hs` squash) and nudges each trailing bead (`off`). Sleeping blends the spine into a curl round the head; the
 * tile form is curled already.
 */
import {
  CUT, along, bang, blink, clamp, crSample, dots, eio, eout, f, faceKids, hear, keys, lengths, lerp, maskArea, merge, mod, pt, ring,
  ringPath, sine, smooth, sparkles, spring, sstep, stroke, sweat, talk, zees, type Face, type FNode, type FrameCtx, type Pt,
} from "./mascot-kit-internal";

export function malaFrame(c: FrameCtx): FNode[] {
  const s = c.state, t = c.t, tt = c.tt, still = c.still, k = c.k;
  const tile = c.form === "tile";
  const INK = c.ink;
  const rh = tile ? 15 : 12.8;
  const rb = tile ? [5.4, 4.7, 4] : [6.2, 5.4, 4.6];
  const gapE = tile ? 4 : 5.2;
  const restSpine: Pt[] = tile ? [[35, 27], [32, 51], [16.5, 44], [10.5, 29], [14, 17]] : [[42, 29.5], [30, 42.5], [18.5, 47], [8, 43.5], [4.8, 33], [8.6, 23]];
  const curlSpine: Pt[] = tile ? restSpine : [[37, 34.5], [24, 48], [12, 39.5], [13, 25], [24, 17], [33, 14.5]];
  let hx = 0, hy = 0, hr = 0, hs = 1;
  let off: Pt[] = [[0, 0], [0, 0], [0, 0]];
  const scl = [1, 1, 1];
  const F: Face = { eyes: "open", mouth: "smile", brows: null, lx: 0.4, ly: 0, blink: 1, open: 0, turn: 0.34, k, R: rh, ex: 4.9, my: 6.6, eyeBig: [1.08, 1.08] };
  let X = "";
  let p: number;
  switch (s) {
    case "listening": {
      /* the head lifts and leans toward the user; the first bead follows a little */
      const up = still ? 1 : spring(tt - 0.1, 1.2, 0.48);
      hy = -6.2 * up + (still ? 0 : 0.5 * sine(t, 3.2));
      hx = 1.4 * up;
      hr = 9 * up + (still ? 0 : 1.6 * sine(t, 3.2, 0.2));
      off[0] = [0.6 * up, -2.2 * up];
      Object.assign(F, { eyes: "wide", mouth: "small", turn: 0.46, lx: 0.9, ly: -0.3, blink: still ? 1 : blink(t, 1.1) });
      X = "hear";
      break;
    }
    case "thinking": {
      /* a hop runs along the beads, tail to head, like fingers counting a mala; the head watches them */
      const T = 2.8;
      p = still ? 0.62 : mod(t, T);
      for (let i = 2; i >= 0; i--) {
        const hp = clamp((p - (2 - i) * 0.3) / 0.36);
        off[i] = [0, -4.2 * Math.sin(Math.PI * hp)];
        scl[i] = 1 + 0.08 * Math.sin(Math.PI * hp);
      }
      const nod = clamp((p - 0.9) / 0.4);
      hy = -1.6 * Math.sin(Math.PI * nod);
      hr = -4 + 3 * Math.sin(Math.PI * nod);
      Object.assign(F, { eyes: "squint", brows: "raised", mouth: "smirk", turn: 0.12, lx: -1.1, ly: -0.9, blink: still ? 1 : blink(t, 2.6) });
      X = "dots";
      break;
    }
    case "working": {
      /* inching along: the middle arches up and the tail draws in, then the head reaches forward and the arch lays flat */
      const T2 = 1.9;
      p = still ? 0.45 : mod(t, T2) / T2;
      const arch = keys(p, [[0, 0], [0.42, 1, eio], [0.62, 1], [1, 0, eio]]);
      const reach = keys(p, [[0, 0], [0.45, -0.4], [0.75, 1, eout], [1, 0, eio]]);
      off = [[-1.4 * arch + reach, -3.6 * arch], [1.4 * arch, -5.2 * arch], [4.4 * arch, -1.2 * arch]];
      hx = 2.4 * reach - 0.6 * arch;
      hy = 0.6 * arch;
      hr = 4 * reach - 2 * arch;
      Object.assign(F, { eyes: "open", blink: 0.74, mouth: "flat", turn: 0.4, lx: 1, ly: 0.4 });
      X = "sweat";
      break;
    }
    case "speaking": {
      /* the head bobs with the voice and the beads echo it, each a beat later and softer */
      const lv = still ? 0.6 : talk(t, 11);
      hy = -2.2 * lv;
      hs = 1 + 0.05 * (lv - 0.3);
      hr = still ? 2 : 2.5 * sine(t, 3.6);
      for (let i = 0; i < 3; i++) off[i] = [0, -2.1 * Math.pow(0.7, i) * (still ? 0.6 : talk(t - 0.1 * (i + 1), 11))];
      Object.assign(F, { mouth: "say", open: lv, lx: 0.6, blink: still ? 1 : blink(t, 3.3) });
      break;
    }
    case "happy": {
      /* a wave runs down the string twice, head first, then a happy sway */
      const waveAt = (q: number, delay: number) => {
        let a = 0;
        for (let w = 0; w < 2; w++) a += Math.sin(Math.PI * clamp((q - delay - w * 0.85) / 0.42)) * (w ? 0.7 : 1);
        return a;
      };
      if (still) {
        hy = -5;
        off = [[0, 2.2], [0, -3.4], [0, 1.8]];
        hr = -6;
      } else {
        hy = -6.5 * waveAt(tt, 0) + 0.8 * sine(t, 3) * sstep((tt - 2) / 0.6);
        hs = 1 - 0.06 * waveAt(tt, -0.1) + 0.05 * waveAt(tt, 0.05);
        hr = -7 * waveAt(tt, 0.05);
        for (let i = 0; i < 3; i++) off[i] = [0, -5 * Math.pow(0.85, i) * waveAt(tt, 0.13 * (i + 1))];
      }
      Object.assign(F, { eyes: "happy", mouth: "grin", turn: 0.22 });
      X = "sparkles";
      break;
    }
    case "sleeping": {
      /* it curls into a ring round itself, tail first, and breathes slowly */
      const br = still ? 0 : sine(t, 5.2);
      hs = 1 + 0.022 * br;
      hy = 0.3 * br;
      Object.assign(F, { eyes: "closed", mouth: "sleep", turn: -0.05, lx: -0.3, ly: 0.6 });
      X = "zees";
      break;
    }
    case "error": {
      /* the beads jumble out of line with a jolt; the head shakes once */
      const J: Pt[] = [[3.2, -8.2], [-1.2, -6.6], [6.4, -2.6]];
      for (let i = 0; i < 3; i++) {
        const e = still ? 1 : spring(tt - 0.03 * i, 2.4, 0.32);
        off[i] = [J[i][0] * e, J[i][1] * e];
      }
      hx = still ? 0 : 2.4 * ring(tt, 3, 0.25);
      hr = still ? -5 : -5 * sstep(tt / 0.3) + 6 * ring(tt, 3, 0.25);
      hy = 1;
      Object.assign(F, { eyes: "wide", eyeBig: [0.9, 0.9], brows: "worried", mouth: "wavy", turn: 0.12, lx: -0.2, ly: 0.6 });
      X = "bang";
      break;
    }
    default: {
      /* idle: the beads breathe in a wave from the head to the tail */
      for (let i = 0; i < 3; i++) {
        const wv = still ? 0 : sine(t, 3.4, -0.14 * (i + 1));
        scl[i] = 1 + 0.07 * wv;
        off[i] = [0, -0.5 * wv];
      }
      const w0 = still ? 0 : sine(t, 3.4);
      hs = 1 + 0.02 * w0;
      hy = -0.7 * w0;
      hr = still ? 0 : 1.6 * sine(t, 6.8);
      F.blink = still ? 1 : blink(t, 0.7);
    }
  }

  /* the curl for sleeping: each bead slides from the rest spine onto the curl, the tail first */
  let spine = restSpine;
  if (s === "sleeping" && !tile) {
    spine = restSpine.map((q, i): Pt => {
      const dl = still ? 1 : eio((tt - 0.12 * (restSpine.length - 1 - i)) / 0.9);
      return [lerp(q[0], curlSpine[i][0], dl), lerp(q[1], curlSpine[i][1], dl)];
    });
  }
  const dense = crSample(spine, 14);
  const cum = lengths(dense);
  const H: Pt = [spine[0][0] + hx, spine[0][1] + hy];
  let sAt = rh + gapE + rb[0];
  const beads: Pt[] = [];
  for (let i = 0; i < 3; i++) {
    const q = along(dense, cum, sAt);
    beads.push([q[0] + off[i][0], q[1] + off[i][1]]);
    sAt += rb[i] + gapE + (rb[i + 1] || rb[i]);
  }
  const tl = along(dense, cum, sAt - (rb[2] + gapE) + rb[2] + 2.2);
  const tail: Pt = [tl[0] + off[2][0], tl[1] + off[2][1]];
  const tw = c.size >= 96 ? 2.6 : c.size >= 64 ? 3 : c.size >= 48 ? 3.3 : 3.7;
  const gap = 1.3;
  const { box, white } = maskArea(-40, -40, 144, 144);

  let nodes: FNode[] = [];
  const threadD = smooth([H, ...beads, tail]);
  const tcut: FNode[] = [["rect", "tmr", white], ["ellipse", "tmh", { cx: H[0], cy: H[1], rx: rh + gap, ry: rh * hs + gap, fill: CUT }]];
  for (let i = 0; i < 3; i++) tcut.push(["circle", "tmb" + i, { cx: beads[i][0], cy: beads[i][1], r: rb[i] * scl[i] + gap, fill: CUT }]);
  nodes.push(["mask", "tm", box, tcut]);
  nodes.push(["mask", "fmask", box, [["rect", "fmr", white], ["g", "fg", { transform: "translate(" + pt(H) + ") rotate(" + f(hr) + ") scale(" + f(1 / hs) + " " + f(hs) + ") translate(0 -0.6)" }, faceKids("f", F)]]]);
  nodes.push(["path", "thread", merge(stroke(tw, INK), { d: threadD, mask: "url(#@tm)" })]);
  for (let i = 0; i < 3; i++) nodes.push(["path", "b" + i, { d: ringPath(beads[i][0], beads[i][1], rb[i] * scl[i], 0), fill: c.bead }]);
  nodes.push(["g", "hg", { mask: "url(#@fmask)" }, [["ellipse", "head", { cx: H[0], cy: H[1], rx: rh / hs, ry: rh * hs, transform: "rotate(" + f(hr) + " " + pt(H) + ")", fill: c.bead }]]]);

  const top = H[1] - rh;
  if (X === "hear") nodes = nodes.concat(hear("x", INK, H[0] + rh * 0.15, H[1] - 1, rh * 0.85, t, still));
  if (X === "dots") nodes = nodes.concat(dots("x", INK, H[0] + rh * 0.55 + 2, top + 1.2, t, still));
  if (X === "sweat") nodes = nodes.concat(sweat("x", INK, H[0] - rh * 0.72 - 1.4, H[1] - rh * 0.78, t, still, tile ? 0.85 : 0.95));
  if (X === "sparkles") nodes = nodes.concat(sparkles("x", INK, tile ? [[54, 14, 0.7], [12, 50, 0.6]] : [[26, 12, 0.85], [60, 9, 0.7], [10, 27, 0.6]], t, still));
  if (X === "zees") nodes = nodes.concat(zees("x", INK, H[0] + rh * 0.55 + 3, top + 3.5, t, still, tile ? 0.75 : 0.9));
  if (X === "bang") nodes = nodes.concat(bang("x", INK, tile ? 55 : 59, tile ? 16 : 13, tt, still, tile ? 0.8 : 0.9));
  return nodes;
}
