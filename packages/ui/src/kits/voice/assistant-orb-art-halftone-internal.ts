// Assistant orb art: the halftone look (private).
import { clamp } from "../../lib/math";
import { halftonePitch, halftoneRings, HALFTONE_DOT, HALFTONE_HUB } from "../../lib/orb-art-internal";
import { TAU, type ArtFrame } from "./assistant-orb-art-core-internal";

/* ------------------------------------------------------------------ */
/* halftone                                                            */
/* ------------------------------------------------------------------ */

export function drawHalftone(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame): void {
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

