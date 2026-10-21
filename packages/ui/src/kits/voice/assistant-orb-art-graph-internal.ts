// Assistant orb art: the graph look (private).
import { easeInOutCubic, graphCount, graphLinked, graphWalker, hash01, orbGraph, smoothstep } from "../../lib/orb-art-internal";
import { TAU, type ArtFrame } from "./assistant-orb-art-core-internal";

/* ------------------------------------------------------------------ */
/* graph                                                               */
/* ------------------------------------------------------------------ */

export function drawGraph(ctx: CanvasRenderingContext2D, w: number, h: number, f: ArtFrame): void {
  const S = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const { state: s, t } = f;
  const p = f.palette;
  const graph = orbGraph(graphCount(S));
  const N = graph.points.length;
  const l0 = f.level(0);
  const spin = s === "error" || s === "muted" ? 0.9 : (f.rtl ? -1 : 1) * TAU * (s === "thinking" ? 0.06 : 0.045) * t;
  const ct = Math.cos(0.42);
  const st = Math.sin(0.42);
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  const Rs = 0.4 * S * (1 + (s === "listening" ? 0.05 * l0 : s === "speaking" ? 0.035 * l0 : 0) + (s === "idle" ? 0.012 * Math.sin((TAU * t) / 5.5) : 0));
  const X = new Float32Array(N + 1);
  const Y = new Float32Array(N + 1);
  const Z = new Float32Array(N + 1);
  const E = new Float32Array(N + 1);
  for (let i = 0; i < N; i++) {
    const q = graph.points[i]!;
    const x1 = q[0] * cs + q[2] * sn;
    const z1 = -q[0] * sn + q[2] * cs;
    const y2 = q[1] * ct - z1 * st;
    const z2 = q[1] * st + z1 * ct;
    const k = 4 / (4 - z2); // mild perspective: the near side a little larger
    X[i] = cx + x1 * Rs * k;
    Y[i] = cy - y2 * Rs * k;
    Z[i] = (z2 + 1) / 2; // 0 at the back, 1 at the front
    if (s === "error" && hash01(i, 51) < 0.22) Y[i]! += S * (0.05 + 0.06 * hash01(i, 52)); // knocked loose
  }
  // The hub: the centre of the sphere, half way back, pulsing with the level while listening and speaking.
  X[N] = cx;
  Y[N] = cy;
  Z[N] = 0.5;
  if (s === "listening" || s === "speaking") E[N] = l0;
  if (s === "listening") {
    for (let i = 0; i < N; i++) E[i] = f.level(0.015 * (i % 6)) * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * (0.9 + 1.6 * hash01(i, 41)) * t + TAU * hash01(i, 42))));
  } else if (s === "speaking") {
    for (let i = 0; i < N; i++) {
      const rho = Math.hypot(X[i]! - cx, Y[i]! - cy) / Rs;
      E[i] = f.level(rho * 0.3) * (0.5 + 0.5 * Math.cos(TAU * (rho * 1.3 - 1.5 * t))) ** 3;
    }
  }
  const r0 = Math.max(1.1, S * 0.017);
  const ew = Math.max(0.75, S * 0.005);
  const hot = new Set<number>();
  if (!p.paper && p.dark) ctx.globalCompositeOperation = "lighter";
  if (s !== "muted") {
    ctx.strokeStyle = p.main;
    const link = (a: number, b: number) => {
      const fz = (Z[a]! + Z[b]!) / 2;
      ctx.globalAlpha = (0.12 + 0.6 * fz * fz) * (s === "thinking" ? 0.7 : 1);
      ctx.lineWidth = ew * (1 + 1.3 * ((E[a]! + E[b]!) / 2));
      ctx.beginPath();
      if (s === "error") {
        // Broken links: only stubs are left at both ends.
        ctx.moveTo(X[a]!, Y[a]!);
        ctx.lineTo(X[a]! + (X[b]! - X[a]!) * 0.3, Y[a]! + (Y[b]! - Y[a]!) * 0.3);
        ctx.moveTo(X[b]!, Y[b]!);
        ctx.lineTo(X[b]! + (X[a]! - X[b]!) * 0.3, Y[b]! + (Y[a]! - Y[b]!) * 0.3);
      } else {
        ctx.moveTo(X[a]!, Y[a]!);
        ctx.lineTo(X[b]!, Y[b]!);
      }
      ctx.stroke();
    };
    for (const [a, b] of graph.edges) link(a, b);
    for (const sp of graph.spokes) link(N, sp);
  }
  if (s === "thinking") {
    // Signals leave the hub along a spoke and hop through the graph, lighting the link they take.
    const hop = 0.34;
    ctx.strokeStyle = p.third;
    ctx.fillStyle = p.third;
    for (let k = 0; k < 3; k++) {
      const tt = t + k * 0.41;
      const hh = Math.floor(tt / hop);
      const fr = easeInOutCubic(smoothstep(0.12, 1, tt / hop - hh));
      const n0 = graphWalker(graph, k, hh - 1, true);
      const n1 = graphWalker(graph, k, hh, true);
      const n2 = graphWalker(graph, k, hh + 1, true);
      if (graphLinked(graph, n0, n1)) {
        ctx.globalAlpha = (0.25 + 0.5 * Z[n1]!) * (1 - fr);
        ctx.lineWidth = ew * 1.8;
        ctx.beginPath();
        ctx.moveTo(X[n0]!, Y[n0]!);
        ctx.lineTo(X[n1]!, Y[n1]!);
        ctx.stroke();
      }
      let sx = X[n1]!;
      let sy = Y[n1]!;
      let sz = Z[n1]!;
      if (graphLinked(graph, n1, n2)) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.max(Z[n1]!, Z[n2]!);
        ctx.lineWidth = ew * 2.2;
        ctx.beginPath();
        ctx.moveTo(X[n1]!, Y[n1]!);
        ctx.lineTo(X[n2]!, Y[n2]!);
        ctx.stroke();
        sx += (X[n2]! - X[n1]!) * fr;
        sy += (Y[n2]! - Y[n1]!) * fr;
        sz += (Z[n2]! - Z[n1]!) * fr;
        hot.add(n2);
      }
      hot.add(n1);
      ctx.globalAlpha = 0.45 + 0.55 * sz;
      ctx.beginPath();
      ctx.arc(sx, sy, r0 * (1.15 + 0.75 * sz), 0, TAU);
      ctx.fill();
    }
  }
  // Nodes back to front: nearer is larger and darker. The hub is a little bigger than the nearest dots.
  const order = Array.from({ length: N + 1 }, (_, i) => i).sort((a, b) => Z[a]! - Z[b]!);
  for (const i of order) {
    const z = Z[i]!;
    const e = E[i]!;
    let r: number;
    if (i === N) {
      r = r0 * (s === "muted" ? 0.95 : 1.32) * (1 + 0.6 * e) * (s === "idle" ? 1 + 0.05 * Math.sin((TAU * t) / 5.5) : 1);
      ctx.globalAlpha = s === "muted" ? 0.75 : 1;
      ctx.fillStyle = hot.has(i) ? p.third : p.main;
    } else {
      r = r0 * (0.5 + 0.55 * z) * (1 + 0.9 * e) * (s === "muted" ? 0.72 : s === "thinking" && !hot.has(i) ? 0.85 : 1);
      ctx.globalAlpha = s === "muted" ? 0.3 + 0.55 * z : 0.28 + 0.72 * z;
      ctx.fillStyle = e > 0.35 || hot.has(i) ? p.third : z < 0.42 ? p.second : p.main;
    }
    ctx.beginPath();
    ctx.arc(X[i]!, Y[i]!, r, 0, TAU);
    ctx.fill();
  }
}

