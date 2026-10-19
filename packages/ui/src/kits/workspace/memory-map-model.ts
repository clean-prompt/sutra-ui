/* Memory-map model: node and legend types, kind legend, time buckets and layout options (pure, no React). */
import { chartColorVars } from "../../lib/tokens";
import { toMs, type TimeInput } from "../../lib/time";

/* ------------------------------------------------------------------ */
/* Model & helpers                                                     */
/* ------------------------------------------------------------------ */

export type MemoryNodeKind = "memory" | "skill" | "fact" | "person" | "project" | "document" | "event" | (string & {});
export type MemoryGlyph = "circle" | "square" | "diamond" | "triangle" | "hexagon" | "star";

export interface MemoryNode {
  id: string;
  label: string;
  kind: MemoryNodeKind;
  createdAt: TimeInput;
  /** Importance; scales the node radius. Default 1. */
  weight?: number;
  /** Ids of related nodes (undirected). */
  links?: string[];
  description?: string;
}

export interface MemoryLegendItem {
  kind: string;
  label: string;
  color: string;
  glyph: MemoryGlyph;
  count: number;
}

export type MemoryLegendOverrides = Record<string, Partial<Pick<MemoryLegendItem, "label" | "color" | "glyph">>>;

const knownKinds: { kind: string; label: string; color: string; glyph: MemoryGlyph }[] = [
  { kind: "memory", label: "Memory", color: chartColorVars[0]!, glyph: "circle" },
  { kind: "skill", label: "Skill", color: chartColorVars[1]!, glyph: "diamond" },
  { kind: "fact", label: "Fact", color: chartColorVars[2]!, glyph: "square" },
  { kind: "person", label: "Person", color: chartColorVars[3]!, glyph: "hexagon" },
  { kind: "project", label: "Project", color: chartColorVars[4]!, glyph: "star" },
  { kind: "document", label: "Document", color: chartColorVars[5]!, glyph: "triangle" },
  { kind: "event", label: "Event", color: chartColorVars[6]!, glyph: "circle" },
];
const glyphCycle: MemoryGlyph[] = ["circle", "square", "diamond", "triangle", "hexagon", "star"];

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Legend entries (kind → label, color, glyph, count): known kinds first in a fixed order, then others by first appearance. */
export function memoryMapLegend(source: readonly MemoryNode[] | readonly string[], overrides: MemoryLegendOverrides = {}): MemoryLegendItem[] {
  const counts = new Map<string, number>();
  for (const s of source) {
    const kind = typeof s === "string" ? s : s.kind;
    counts.set(kind, (counts.get(kind) ?? 0) + (typeof s === "string" ? 0 : 1));
  }
  const known = knownKinds.filter((k) => counts.has(k.kind));
  const unknown = Array.from(counts.keys()).filter((k) => !knownKinds.some((kk) => kk.kind === k));
  const items: MemoryLegendItem[] = [
    ...known.map((k) => ({ ...k, count: counts.get(k.kind)! })),
    ...unknown.map((kind, i) => ({
      kind,
      label: titleCase(kind),
      color: chartColorVars[(7 + i) % chartColorVars.length]!,
      glyph: glyphCycle[i % glyphCycle.length]!,
      count: counts.get(kind)!,
    })),
  ];
  return items.map((it) => ({ ...it, ...overrides[it.kind] }));
}

export interface MemoryTimeBucket {
  start: number;
  end: number;
  count: number;
  ids: string[];
}

export const memoryTime = (d: TimeInput) => toMs(d) ?? NaN;

/** Split nodes into `buckets` equal time spans (over `range`, default min–max createdAt). The last bucket includes its end. */
export function bucketByTime(
  nodes: readonly Pick<MemoryNode, "id" | "createdAt">[],
  buckets: number,
  range?: readonly [number, number]
): MemoryTimeBucket[] {
  const n = Math.max(1, Math.floor(buckets) || 1);
  const times = nodes.map((x) => memoryTime(x.createdAt)).filter(Number.isFinite);
  if (!range && !times.length) return [];
  const lo = range ? range[0] : Math.min(...times);
  const hi = range ? range[1] : Math.max(...times);
  const span = Math.max(hi - lo, 0);
  const out: MemoryTimeBucket[] = Array.from({ length: n }, (_, i) => ({
    start: lo + (span * i) / n,
    end: i === n - 1 ? hi : lo + (span * (i + 1)) / n,
    count: 0,
    ids: [],
  }));
  for (const node of nodes) {
    const t = memoryTime(node.createdAt);
    if (!Number.isFinite(t) || t < lo || t > hi) continue;
    const i = span === 0 ? 0 : Math.min(n - 1, Math.floor(((t - lo) / span) * n));
    out[i]!.count++;
    out[i]!.ids.push(node.id);
  }
  return out;
}


export type MemoryRadialTime = boolean | "old-center" | "old-outer";

export interface MemoryLayoutOptions {
  seed?: number | string;
  /** Run this many ticks synchronously. Default 300. */
  ticks?: number;
  /** Place nodes on rings by creation time (true = oldest at the center). */
  radialTime?: MemoryRadialTime;
  /** World radius of the outermost ring. Default 300. */
  radius?: number;
}

export interface MemoryPoint {
  x: number;
  y: number;
}

export interface MemoryMapZoom {
  k: number;
  x: number;
  y: number;
}
