/* Private helpers shared by the memory-map modules: the d3-force simulation, time rings and glyph paths. */
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { seededRandom } from "../../lib/hash";
import { memoryTime, type MemoryGlyph, type MemoryLayoutOptions, type MemoryNode, type MemoryRadialTime } from "./memory-map-model";

export interface SimNode extends SimulationNodeDatum {
  id: string;
  r: number;
  t: number;
}

export const RING_INNER = 36;

export function nodeRadiusFor(weight: number | undefined, maxWeight: number) {
  const w = Math.max(0, weight ?? 1);
  return 4 + 8 * Math.sqrt(w / (maxWeight || 1));
}

export function timeExtent(nodes: readonly MemoryNode[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const n of nodes) {
    const t = memoryTime(n.createdAt);
    if (!Number.isFinite(t)) continue;
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  }
  return Number.isFinite(lo) ? [lo, hi] : [0, 0];
}

export function radialFrac(t: number, [lo, hi]: [number, number], radial: MemoryRadialTime) {
  const f = hi === lo ? 1 : (t - lo) / (hi - lo);
  return radial === "old-outer" ? 1 - f : f;
}

export function createSimulation(nodes: readonly MemoryNode[], options: MemoryLayoutOptions) {
  const rnd = seededRandom(options.seed ?? 1);
  const R = options.radius ?? 300;
  const extent = timeExtent(nodes);
  const maxWeight = Math.max(1, ...nodes.map((n) => n.weight ?? 1));
  const spread = Math.max(60, Math.sqrt(nodes.length) * 30);
  const simNodes: SimNode[] = nodes.map((n) => ({
    id: n.id,
    r: nodeRadiusFor(n.weight, maxWeight),
    t: memoryTime(n.createdAt),
    x: (rnd() - 0.5) * spread,
    y: (rnd() - 0.5) * spread,
  }));
  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const links: SimulationLinkDatum<SimNode>[] = [];
  for (const n of nodes)
    for (const l of n.links ?? []) {
      if (!ids.has(l) || l === n.id) continue;
      const key = n.id < l ? `${n.id}|${l}` : `${l}|${n.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: n.id, target: l });
    }
  const radial = options.radialTime;
  const sim: Simulation<SimNode, SimulationLinkDatum<SimNode>> = forceSimulation<SimNode>(simNodes)
    .randomSource(rnd)
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((d) => d.id)
        .distance(36)
        .strength(radial ? 0.08 : 0.35)
    )
    .force("charge", forceManyBody<SimNode>().strength(radial ? -18 : -55).distanceMax(220))
    .force("collide", forceCollide<SimNode>((d) => d.r + 2.5).strength(0.9))
    .stop();
  if (radial) {
    sim.force("radial", forceRadial<SimNode>((d) => RING_INNER + radialFrac(d.t, extent, radial) * (R - RING_INNER), 0, 0).strength(0.85));
  } else {
    sim.force("x", forceX<SimNode>(0).strength(0.06)).force("y", forceY<SimNode>(0).strength(0.06));
  }
  return { sim, simNodes };
}

export function glyphPath(ctx: CanvasRenderingContext2D | Path2DLike, glyph: MemoryGlyph, x: number, y: number, r: number) {
  const poly = (pts: [number, number][]) => {
    ctx.moveTo(x + pts[0]![0], y + pts[0]![1]);
    for (const [px, py] of pts.slice(1)) ctx.lineTo(x + px, y + py);
    ctx.closePath();
  };
  switch (glyph) {
    case "square": {
      const s = r * 0.88;
      poly([[-s, -s], [s, -s], [s, s], [-s, s]]);
      break;
    }
    case "diamond":
      poly([[0, -r * 1.2], [r * 1.2, 0], [0, r * 1.2], [-r * 1.2, 0]]);
      break;
    case "triangle":
      poly([[0, -r * 1.2], [r * 1.1, r * 0.8], [-r * 1.1, r * 0.8]]);
      break;
    case "hexagon":
      poly(Array.from({ length: 6 }, (_, i) => [Math.cos((Math.PI / 3) * i) * r * 1.05, Math.sin((Math.PI / 3) * i) * r * 1.05] as [number, number]));
      break;
    case "star":
      poly(
        Array.from({ length: 10 }, (_, i) => {
          const rr = i % 2 ? r * 0.55 : r * 1.25;
          const a = (Math.PI / 5) * i - Math.PI / 2;
          return [Math.cos(a) * rr, Math.sin(a) * rr] as [number, number];
        })
      );
      break;
    default:
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

export interface Path2DLike {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  closePath(): void;
}

export class SvgPath implements Path2DLike {
  d = "";
  moveTo(x: number, y: number) {
    this.d += `M${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  lineTo(x: number, y: number) {
    this.d += `L${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  arc(x: number, y: number, r: number) {
    this.d += `M${(x - r).toFixed(2)} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  }
  closePath() {
    this.d += "Z";
  }
}
