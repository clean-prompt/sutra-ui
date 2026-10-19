import * as React from "react";
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
import {
  RiCloseLine,
  RiFocus3Line,
  RiListUnordered,
  RiMoreLine,
  RiPauseFill,
  RiPlayFill,
  RiZoomInLine,
  RiZoomOutLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { chartColors } from "../../lib/tokens";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePrefersReducedMotion } from "../../hooks/use-media-query";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { clamp } from "../../lib/math";
import { seededRandom } from "../../lib/hash";
import { base64UrlDecode, base64UrlEncode } from "../../lib/encoding";
import { formatClockTime, formatShortDate, toMs, type TimeInput } from "../../lib/time";
import { Button } from "../../primitives/button";
import { CopyButton } from "../../primitives/copy-button";
import { Input } from "../../primitives/input";
import { RangeSlider } from "../../primitives/slider";
import { SimpleSelect } from "../../primitives/select";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "../../primitives/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../primitives/dropdown-menu";

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
  { kind: "memory", label: "Memory", color: chartColors[0], glyph: "circle" },
  { kind: "skill", label: "Skill", color: chartColors[1], glyph: "diamond" },
  { kind: "fact", label: "Fact", color: chartColors[2], glyph: "square" },
  { kind: "person", label: "Person", color: chartColors[3], glyph: "hexagon" },
  { kind: "project", label: "Project", color: chartColors[4], glyph: "star" },
  { kind: "document", label: "Document", color: chartColors[5], glyph: "triangle" },
  { kind: "event", label: "Event", color: chartColors[6], glyph: "circle" },
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
      color: chartColors[(7 + i) % chartColors.length]!,
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

interface SimNode extends SimulationNodeDatum {
  id: string;
  r: number;
  t: number;
}

const RING_INNER = 36;

function nodeRadiusFor(weight: number | undefined, maxWeight: number) {
  const w = Math.max(0, weight ?? 1);
  return 4 + 8 * Math.sqrt(w / (maxWeight || 1));
}

function timeExtent(nodes: readonly MemoryNode[]): [number, number] {
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

function radialFrac(t: number, [lo, hi]: [number, number], radial: MemoryRadialTime) {
  const f = hi === lo ? 1 : (t - lo) / (hi - lo);
  return radial === "old-outer" ? 1 - f : f;
}

function createSimulation(nodes: readonly MemoryNode[], options: MemoryLayoutOptions) {
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

/** Pure, deterministic d3-force layout (link + charge + collide, optional radial time rings). */
export function layoutMemoryGraph(nodes: readonly MemoryNode[], options: MemoryLayoutOptions = {}): Record<string, MemoryPoint> {
  const { sim, simNodes } = createSimulation(nodes, options);
  sim.tick(options.ticks ?? 300);
  const out: Record<string, MemoryPoint> = {};
  for (const n of simNodes) out[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
  return out;
}

/* ------------------------------------------------------------------ */
/* Glyphs                                                              */
/* ------------------------------------------------------------------ */

function glyphPath(ctx: CanvasRenderingContext2D | Path2DLike, glyph: MemoryGlyph, x: number, y: number, r: number) {
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

interface Path2DLike {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  closePath(): void;
}

class SvgPath implements Path2DLike {
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

export interface MemoryGlyphIconProps extends React.SVGAttributes<SVGSVGElement> {
  glyph: MemoryGlyph;
  color: string;
  /** Pixel size. Default 12. */
  size?: number;
}

/** Small SVG swatch of a memory-map glyph. */
export const MemoryGlyphIcon = React.forwardRef<SVGSVGElement, MemoryGlyphIconProps>(
  ({ glyph, color, size = 12, className, ...props }, ref) => {
    const p = new SvgPath();
    glyphPath(p, glyph, 6, 6, 4.4);
    return (
      <svg ref={ref} viewBox="0 0 12 12" width={size} height={size} aria-hidden className={cn("shrink-0", className)} {...props}>
        <path d={p.d} fill={color} />
      </svg>
    );
  }
);
MemoryGlyphIcon.displayName = "MemoryGlyphIcon";

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

export interface MemoryMapLegendProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onToggle"> {
  items: MemoryLegendItem[];
  hiddenKinds?: string[];
  /** Makes entries toggle buttons that filter by kind. */
  onToggleKind?: (kind: string) => void;
}

/** Kind → color/glyph legend; doubles as a kind filter when `onToggleKind` is set. */
export const MemoryMapLegend = React.forwardRef<HTMLDivElement, MemoryMapLegendProps>(
  ({ items, hiddenKinds = [], onToggleKind, className, ...props }, ref) => (
    <div ref={ref} role="group" aria-label="Legend: filter by kind" className={cn("flex flex-wrap items-center gap-1", className)} {...props}>
      {items.map((it) => {
        const hidden = hiddenKinds.includes(it.kind);
        const body = (
          <>
            <MemoryGlyphIcon glyph={it.glyph} color={it.color} className={cn(hidden && "opacity-30")} />
            <span className={cn(hidden && "text-muted-foreground line-through")}>{it.label}</span>
            <span className="tabular-nums text-muted-foreground">{it.count}</span>
          </>
        );
        return onToggleKind ? (
          <button
            key={it.kind}
            type="button"
            aria-pressed={!hidden}
            onClick={() => onToggleKind(it.kind)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-control border border-border bg-background px-2 text-xs transition-colors hover:bg-accent",
              focusRing
            )}
          >
            {body}
          </button>
        ) : (
          <span key={it.kind} className="inline-flex h-7 items-center gap-1.5 px-2 text-xs">
            {body}
          </span>
        );
      })}
    </div>
  )
);
MemoryMapLegend.displayName = "MemoryMapLegend";

/* ------------------------------------------------------------------ */
/* TimeScrubber                                                        */
/* ------------------------------------------------------------------ */

const SCALE = 1000;

export interface TimeScrubberProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Items to histogram (only `createdAt` is used). */
  nodes: readonly Pick<MemoryNode, "id" | "createdAt">[];
  min?: number;
  max?: number;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (range: [number, number]) => void;
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  speed?: number;
  defaultSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  speeds?: number[];
  /** Histogram bucket count. Default 32. */
  buckets?: number;
  /** Full sweep duration at 1× in ms. Default 8000. */
  duration?: number;
  /** Playback tick in ms. Default 100. */
  tickMs?: number;
  formatTime?: (t: number) => string;
  locale?: string;
}

/** Range slider over time with a histogram of counts per bucket and chronological play/pause playback (Space toggles). */
export const TimeScrubber = React.forwardRef<HTMLDivElement, TimeScrubberProps>(
  (
    {
      nodes,
      min: minProp,
      max: maxProp,
      value: valueProp,
      defaultValue,
      onValueChange,
      playing: playingProp,
      defaultPlaying,
      onPlayingChange,
      speed: speedProp,
      defaultSpeed,
      onSpeedChange,
      speeds = [0.5, 1, 2, 4],
      buckets = 32,
      duration = 8000,
      tickMs = 100,
      formatTime,
      locale,
      className,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const extent = React.useMemo(() => timeExtent(nodes as MemoryNode[]), [nodes]);
    const min = minProp ?? extent[0];
    const max = maxProp ?? extent[1];
    // Uncontrolled and untouched, the range is "everything": it follows [min, max] as nodes arrive.
    const [rangeState, setValue] = useControllableState<[number, number] | undefined>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((range: [number, number] | undefined) => void) | undefined,
    });
    const value: [number, number] = rangeState ?? [min, max];
    const [playing, setPlaying] = useControllableState<boolean>({
      value: playingProp,
      defaultValue: defaultPlaying ?? false,
      onChange: onPlayingChange,
    });
    const [speed, setSpeed] = useControllableState<number>({ value: speedProp, defaultValue: defaultSpeed ?? 1, onChange: onSpeedChange });
    const fmt = React.useMemo(() => {
      if (formatTime) return formatTime;
      const span = max - min;
      if (span > 2 * 864e5) {
        const year = span > 300 * 864e5 ? "always" : "never";
        return (t: number) => formatShortDate(t, { locale, year });
      }
      return (t: number) => formatClockTime(t, { locale });
    }, [formatTime, locale, min, max]);

    const valueRef = React.useRef(value);
    valueRef.current = value;
    const setValueRef = useLatestRef(setValue);
    const setPlayingRef = useLatestRef(setPlaying);

    React.useEffect(() => {
      if (!playing) return;
      const span = max - min;
      if (span <= 0) {
        setPlayingRef.current(false);
        return;
      }
      const step = (span * tickMs * speed) / duration;
      const id = setInterval(() => {
        const [a, b] = valueRef.current;
        const end = Math.min(max, b + step);
        const next: [number, number] = [a, end];
        valueRef.current = next;
        setValueRef.current(next);
        if (end >= max) setPlayingRef.current(false);
      }, tickMs);
      return () => clearInterval(id);
    }, [playing, speed, min, max, duration, tickMs]);

    const togglePlay = () => {
      if (!playing && valueRef.current[1] >= max) {
        const restart: [number, number] = [valueRef.current[0], valueRef.current[0]];
        valueRef.current = restart;
        setValue(restart);
      }
      setPlaying(!playing);
    };

    const toScale = (t: number) => (max === min ? 0 : Math.round(((t - min) / (max - min)) * SCALE));
    const fromScale = (s: number) => min + ((max - min) * s) / SCALE;
    const hist = React.useMemo(() => bucketByTime(nodes, buckets, [min, max]), [nodes, buckets, min, max]);
    const peak = Math.max(1, ...hist.map((h) => h.count));
    const inRange = nodes.reduce((n, x) => {
      const t = memoryTime(x.createdAt);
      return n + (t >= value[0] && t <= value[1] ? 1 : 0);
    }, 0);

    return (
      <div
        ref={ref}
        role="group"
        aria-label="Time scrubber"
        aria-keyshortcuts="Space"
        tabIndex={0}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || (e.key !== " " && e.code !== "Space")) return;
          const target = e.target as HTMLElement;
          if (target.closest("button,[role=combobox],input,textarea,select")) return;
          e.preventDefault();
          togglePlay();
        }}
        className={cn("flex flex-col gap-2 rounded-box p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50", className)}
        {...props}
      >
        <div aria-hidden className="flex h-10 items-end gap-px px-2">
          {hist.map((h, i) => {
            const active = h.end >= value[0] && h.start <= value[1];
            return (
              <div
                key={i}
                data-bucket={i}
                title={`${fmt(h.start)}: ${h.count}`}
                className={cn("min-h-px flex-1 rounded-t-xs transition-colors", active ? "bg-primary/70" : "bg-muted")}
                style={{ height: `${(h.count / peak) * 100}%` }}
              />
            );
          })}
        </div>
        <RangeSlider
          min={0}
          max={SCALE}
          step={1}
          minStepsBetweenThumbs={0}
          value={[toScale(value[0]), toScale(value[1])]}
          onValueChange={(v) => setValue([fromScale(v[0] ?? 0), fromScale(v[1] ?? SCALE)])}
          thumbLabels={[`Start: ${fmt(value[0])}`, `End: ${fmt(value[1])}`]}
          size="sm"
          className="px-2"
        />
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label={playing ? "Pause playback" : "Play timeline"}
            aria-pressed={playing}
            onClick={togglePlay}
          >
            {playing ? <RiPauseFill aria-hidden /> : <RiPlayFill aria-hidden />}
          </Button>
          <SimpleSelect
            size="sm"
            aria-label="Playback speed"
            className="w-20"
            value={String(speed)}
            onValueChange={(v) => setSpeed(Number(v))}
            options={speeds.map((s) => ({ value: String(s), label: `${s}×` }))}
          />
          <span className="tabular-nums">
            {fmt(value[0])} – {fmt(value[1])}
          </span>
          <span className="ml-auto tabular-nums" aria-live="polite" aria-atomic>
            {playing ? "" : `${inRange} of ${nodes.length} in range`}
          </span>
        </div>
      </div>
    );
  }
);
TimeScrubber.displayName = "TimeScrubber";

/* ------------------------------------------------------------------ */
/* Share codes                                                         */
/* ------------------------------------------------------------------ */

export interface MemoryMapViewState {
  hiddenKinds?: string[];
  range?: [number, number];
  selectedId?: string;
  zoom?: { k: number; x: number; y: number };
}

const SHARE_PREFIX = "mm1.";


const r2 = (n: number) => Math.round(n * 100) / 100;

/** Compact base64url share code for a memory-map view (filters, time range, selection, zoom). */
export function encodeMemoryShareCode(state: MemoryMapViewState): string {
  const o: Record<string, unknown> = {};
  if (state.hiddenKinds?.length) o.h = state.hiddenKinds;
  if (state.range) o.r = state.range.map((t) => Math.round(t / 1000).toString(36));
  if (state.selectedId) o.s = state.selectedId;
  if (state.zoom) o.z = [r2(state.zoom.k), Math.round(state.zoom.x), Math.round(state.zoom.y)];
  return SHARE_PREFIX + base64UrlEncode(JSON.stringify(o));
}

export type MemoryShareDecodeResult = { ok: true; state: MemoryMapViewState } | { ok: false; error: string };

/** Parse and validate a share code from `encodeMemoryShareCode`. */
export function decodeMemoryShareCode(code: string): MemoryShareDecodeResult {
  const c = code.trim();
  if (!c) return { ok: false, error: "Paste a share code." };
  if (!c.startsWith(SHARE_PREFIX)) return { ok: false, error: "Not a memory map share code." };
  const body = c.slice(SHARE_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(body)) return { ok: false, error: "The code contains invalid characters." };
  let o: unknown;
  try {
    o = JSON.parse(base64UrlDecode(body) ?? "");
  } catch {
    return { ok: false, error: "The code is corrupted." };
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, error: "The code is corrupted." };
  const raw = o as Record<string, unknown>;
  const state: MemoryMapViewState = {};
  if (raw.h !== undefined) {
    if (!Array.isArray(raw.h) || !raw.h.every((k) => typeof k === "string")) return { ok: false, error: "Invalid kind filter." };
    state.hiddenKinds = raw.h as string[];
  }
  if (raw.r !== undefined) {
    const r = Array.isArray(raw.r) ? raw.r.map((x) => (typeof x === "string" && /^-?[0-9a-z]+$/.test(x) ? parseInt(x, 36) * 1000 : NaN)) : [];
    if (r.length !== 2 || !r.every(Number.isFinite) || r[0]! > r[1]!) return { ok: false, error: "Invalid time range." };
    state.range = [r[0]!, r[1]!];
  }
  if (raw.s !== undefined) {
    if (typeof raw.s !== "string") return { ok: false, error: "Invalid selection." };
    state.selectedId = raw.s;
  }
  if (raw.z !== undefined) {
    const z = raw.z;
    if (!Array.isArray(z) || z.length !== 3 || !z.every((n) => typeof n === "number" && Number.isFinite(n)) || (z[0] as number) <= 0)
      return { ok: false, error: "Invalid zoom." };
    state.zoom = { k: z[0] as number, x: z[1] as number, y: z[2] as number };
  }
  return { ok: true, state };
}

export interface ShareCodeControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current view to export. */
  state: MemoryMapViewState;
  /** Called with a validated view decoded from a pasted code. */
  onImport: (state: MemoryMapViewState) => void;
}

/** Copy the current view as a compact base64url share code, or load one (validated). */
export const ShareCodeControls = React.forwardRef<HTMLDivElement, ShareCodeControlsProps>(({ state, onImport, className, ...props }, ref) => {
  const code = React.useMemo(() => encodeMemoryShareCode(state), [state]);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const ids = { code: React.useId(), input: React.useId(), error: React.useId() };
  return (
    <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.code} className="text-sm font-medium">
          Share code
        </label>
        <div className="flex gap-2">
          <Input id={ids.code} readOnly value={code} size="sm" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <CopyButton value={code} variant="button" size="sm" />
        </div>
      </div>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const res = decodeMemoryShareCode(input);
          if (res.ok) {
            setError(null);
            setLoaded(true);
            onImport(res.state);
          } else {
            setLoaded(false);
            setError(res.error);
          }
        }}
      >
        <label htmlFor={ids.input} className="text-sm font-medium">
          Load a share code
        </label>
        <div className="flex gap-2">
          <Input
            id={ids.input}
            size="sm"
            value={input}
            placeholder="mm1.…"
            className="font-mono text-xs"
            invalid={!!error}
            aria-describedby={error ? ids.error : undefined}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
              setLoaded(false);
            }}
          />
          <Button type="submit" size="sm" disabled={!input.trim()}>
            Load
          </Button>
        </div>
        {error && (
          <p id={ids.error} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <p role="status" className="text-xs text-success">
          {loaded ? "View loaded." : ""}
        </p>
      </form>
    </div>
  );
});
ShareCodeControls.displayName = "ShareCodeControls";

/* ------------------------------------------------------------------ */
/* MemoryMap                                                           */
/* ------------------------------------------------------------------ */

export interface MemoryMapZoom {
  k: number;
  x: number;
  y: number;
}

export interface MemoryNodeActions {
  onOpen?: (node: MemoryNode) => void;
  onEdit?: (node: MemoryNode) => void;
  onDelete?: (node: MemoryNode) => void;
}

export interface MemoryMapDetailHelpers {
  links: MemoryNode[];
  select: (id: string | null) => void;
  legend: MemoryLegendItem | undefined;
  actions: React.ReactNode;
}

export interface MemoryMapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect">, MemoryNodeActions {
  nodes: MemoryNode[];
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (node: MemoryNode | null) => void;
  hiddenKinds?: string[];
  defaultHiddenKinds?: string[];
  onHiddenKindsChange?: (kinds: string[]) => void;
  timeRange?: [number, number];
  defaultTimeRange?: [number, number];
  onTimeRangeChange?: (range: [number, number]) => void;
  zoom?: MemoryMapZoom;
  defaultZoom?: MemoryMapZoom;
  onZoomChange?: (zoom: MemoryMapZoom) => void;
  /** Rings by creation time: true / "old-center" puts the oldest at the center, "old-outer" at the edge. */
  radialTime?: MemoryRadialTime;
  /** Number of labeled time rings. Default 6. */
  rings?: number;
  /** Layout seed (deterministic). Default 1. */
  seed?: number | string;
  /** Compute the layout synchronously (true = 300 ticks, or a tick count) instead of animating the settle. */
  staticLayout?: boolean | number;
  /** Called with node positions once the layout settles. */
  onLayout?: (positions: Record<string, MemoryPoint>) => void;
  /** Canvas height in px. Default 480. */
  height?: number;
  showLegend?: boolean;
  showScrubber?: boolean;
  showDetail?: boolean;
  /** Replace the default detail panel. */
  renderDetail?: (node: MemoryNode, helpers: MemoryMapDetailHelpers) => React.ReactNode;
  legendOverrides?: MemoryLegendOverrides;
  listView?: boolean;
  defaultListView?: boolean;
  onListViewChange?: (on: boolean) => void;
  /** Props forwarded to the TimeScrubber (e.g. controlled `playing`). */
  scrubberProps?: Partial<Omit<TimeScrubberProps, "nodes" | "value" | "onValueChange">>;
  /** Extra toolbar content. */
  toolbarExtra?: React.ReactNode;
  locale?: string;
  "aria-label"?: string;
}


const WORLD_R = 300;
const DEFAULT_ZOOM: MemoryMapZoom = { k: 1, x: 0, y: 0 };

/** Knowledge / memory graph over time on a canvas: d3-force layout, radial time rings, pan/zoom, legend filter, time scrubber, detail panel and an accessible list view. */
export const MemoryMap = React.forwardRef<HTMLDivElement, MemoryMapProps>(
  (
    {
      nodes,
      selectedId: selectedProp,
      defaultSelectedId,
      onSelect,
      hiddenKinds: hiddenProp,
      defaultHiddenKinds,
      onHiddenKindsChange,
      timeRange: rangeProp,
      defaultTimeRange,
      onTimeRangeChange,
      zoom: zoomProp,
      defaultZoom,
      onZoomChange,
      radialTime = false,
      rings = 6,
      seed = 1,
      staticLayout,
      onLayout,
      height = 480,
      showLegend = true,
      showScrubber = true,
      showDetail = true,
      renderDetail,
      legendOverrides,
      listView: listViewProp,
      defaultListView,
      onListViewChange,
      scrubberProps,
      toolbarExtra,
      onOpen,
      onEdit,
      onDelete,
      locale,
      "aria-label": ariaLabel = "Memory map",
      className,
      ...props
    },
    ref
  ) => {
    const reducedMotion = usePrefersReducedMotion();
    const extent = React.useMemo(() => timeExtent(nodes), [nodes]);
    const byId = React.useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
    const neighbours = React.useMemo(() => {
      const m = new Map<string, Set<string>>();
      for (const n of nodes) m.set(n.id, new Set());
      for (const n of nodes)
        for (const l of n.links ?? []) {
          if (!byId.has(l) || l === n.id) continue;
          m.get(n.id)!.add(l);
          m.get(l)!.add(n.id);
        }
      return m;
    }, [nodes, byId]);
    const legend = React.useMemo(() => memoryMapLegend(nodes, legendOverrides), [nodes, legendOverrides]);
    const legendByKind = React.useMemo(() => new Map(legend.map((l) => [l.kind, l])), [legend]);

    const [selectedId, setSelectedId] = useControllableState<string | null>({
      value: selectedProp,
      defaultValue: defaultSelectedId ?? null,
    });
    const select = React.useCallback(
      (id: string | null) => {
        setSelectedId(id);
        onSelect?.(id ? (byId.get(id) ?? null) : null);
      },
      [setSelectedId, onSelect, byId]
    );
    const [hiddenKinds, setHiddenKinds] = useControllableState<string[]>({
      value: hiddenProp,
      defaultValue: defaultHiddenKinds ?? [],
      onChange: onHiddenKindsChange,
    });
    // Uncontrolled and untouched, the range is the full extent and keeps following it as nodes load.
    const [rangeState, setRange] = useControllableState<[number, number] | undefined>({
      value: rangeProp,
      defaultValue: defaultTimeRange,
      onChange: onTimeRangeChange as ((range: [number, number] | undefined) => void) | undefined,
    });
    const range: [number, number] = rangeState ?? extent;
    const [listView, setListView] = useControllableState<boolean>({
      value: listViewProp,
      defaultValue: defaultListView ?? false,
      onChange: onListViewChange,
    });
    const [hover, setHover] = React.useState<{ id: string; x: number; y: number } | null>(null);
    const [menuNode, setMenuNode] = React.useState<MemoryNode | null>(null);

    const visible = React.useMemo(() => {
      const hidden = new Set(hiddenKinds);
      return nodes.filter((n) => {
        const t = memoryTime(n.createdAt);
        return !hidden.has(n.kind) && t >= range[0] && t <= range[1];
      });
    }, [nodes, hiddenKinds, range]);
    const visibleIds = React.useMemo(() => new Set(visible.map((n) => n.id)), [visible]);
    const fmtDate = React.useCallback((d: TimeInput) => formatShortDate(d, { locale, year: "always" }), [locale]);

    /* ---------- layout ---------- */
    const positionsRef = React.useRef<Map<string, MemoryPoint>>(new Map());
    const radiusRef = React.useRef<Map<string, number>>(new Map());
    const extentRef = React.useRef(WORLD_R + 30);
    const drawRef = React.useRef<() => void>(() => {});
    const frame = React.useRef<number | null>(null);
    const scheduleDraw = React.useCallback(() => {
      if (frame.current != null) return;
      const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16) as unknown as number;
      frame.current = raf(() => {
        frame.current = null;
        drawRef.current();
      });
    }, []);
    const onLayoutRef = useLatestRef(onLayout);

    React.useEffect(() => {
      const maxWeight = Math.max(1, ...nodes.map((n) => n.weight ?? 1));
      radiusRef.current = new Map(nodes.map((n) => [n.id, nodeRadiusFor(n.weight, maxWeight)]));
      const opts: MemoryLayoutOptions = { seed, radialTime, radius: WORLD_R };
      const runStatic = staticLayout !== undefined && staticLayout !== false ? staticLayout : reducedMotion ? true : false;
      const fit = (pos: Map<string, MemoryPoint>) => {
        if (radialTime) return WORLD_R + 30;
        let m = 40;
        for (const p of pos.values()) m = Math.max(m, Math.hypot(p.x, p.y) + 16);
        return m;
      };
      const emit = (pos: Map<string, MemoryPoint>) => {
        const out: Record<string, MemoryPoint> = {};
        for (const [id, p] of pos) out[id] = { x: p.x, y: p.y };
        onLayoutRef.current?.(out);
      };
      if (runStatic) {
        const ticks = typeof runStatic === "number" ? runStatic : 300;
        const pos = layoutMemoryGraph(nodes, { ...opts, ticks });
        positionsRef.current = new Map(Object.entries(pos));
        extentRef.current = fit(positionsRef.current);
        emit(positionsRef.current);
        scheduleDraw();
        return;
      }
      const { sim, simNodes } = createSimulation(nodes, opts);
      const sync = () => {
        const m = new Map<string, MemoryPoint>();
        for (const n of simNodes) m.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
        positionsRef.current = m;
      };
      sim.tick(20);
      sync();
      extentRef.current = radialTime ? WORLD_R + 30 : Math.max(80, Math.sqrt(nodes.length) * 22 + 40);
      sim.on("tick", () => {
        sync();
        scheduleDraw();
      });
      sim.on("end", () => {
        sync();
        extentRef.current = fit(positionsRef.current);
        emit(positionsRef.current);
        scheduleDraw();
      });
      sim.alpha(0.8).restart();
      scheduleDraw();
      return () => {
        sim.on("tick", null).on("end", null).stop();
      };
    }, [nodes, seed, radialTime, staticLayout, reducedMotion, scheduleDraw]);

    /* ---------- viewport ---------- */
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [width, setWidth] = React.useState(640);
    React.useEffect(() => {
      const w = containerRef.current?.clientWidth;
      if (w) setWidth(w);
    }, [listView]);
    // The canvas container only exists outside list view; a new target re-subscribes when it mounts.
    useResizeObserver(listView ? null : containerRef, (entry) => {
      const w = entry.contentRect.width;
      if (w) setWidth(w);
    });

    const zoomRef = React.useRef<MemoryMapZoom>(zoomProp ?? defaultZoom ?? DEFAULT_ZOOM);
    React.useEffect(() => {
      if (zoomProp) {
        zoomRef.current = zoomProp;
        scheduleDraw();
      }
    }, [zoomProp, scheduleDraw]);
    const zoomTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
    const emitZoom = () => {
      clearTimeout(zoomTimer.current);
      zoomTimer.current = setTimeout(() => onZoomChange?.({ ...zoomRef.current }), 150);
    };
    React.useEffect(() => () => clearTimeout(zoomTimer.current), []);

    const baseScale = () => Math.min(width, height) / (2 * extentRef.current);
    const toWorld = (sx: number, sy: number) => {
      const z = zoomRef.current;
      const s = baseScale() * z.k;
      return { x: (sx - width / 2 - z.x) / s, y: (sy - height / 2 - z.y) / s };
    };
    const toScreen = (p: MemoryPoint) => {
      const z = zoomRef.current;
      const s = baseScale() * z.k;
      return { x: width / 2 + z.x + p.x * s, y: height / 2 + z.y + p.y * s };
    };
    const hitTest = (sx: number, sy: number): MemoryNode | null => {
      const w = toWorld(sx, sy);
      const tol = 4 / (baseScale() * zoomRef.current.k);
      let best: MemoryNode | null = null;
      let bestD = Infinity;
      for (const n of visible) {
        const p = positionsRef.current.get(n.id);
        if (!p) continue;
        const d = Math.hypot(p.x - w.x, p.y - w.y);
        const r = (radiusRef.current.get(n.id) ?? 6) + tol;
        if (d <= r && d < bestD) {
          best = n;
          bestD = d;
        }
      }
      return best;
    };
    const zoomAt = (factor: number, sx = width / 2, sy = height / 2) => {
      const z = zoomRef.current;
      const k = clamp(z.k * factor, 0.25, 8);
      const f = k / z.k;
      const cx = sx - width / 2;
      const cy = sy - height / 2;
      zoomRef.current = { k, x: cx - (cx - z.x) * f, y: cy - (cy - z.y) * f };
      scheduleDraw();
      emitZoom();
    };

    /* ---------- drawing ---------- */
    const ringInfo = React.useMemo(() => {
      if (!radialTime || extent[1] <= extent[0]) return [];
      const span = extent[1] - extent[0];
      const f = new Intl.DateTimeFormat(locale, span > 60 * 864e5 ? { month: "short", year: "numeric" } : { month: "short", day: "numeric" });
      return Array.from({ length: rings }, (_, i) => {
        const start = extent[0] + (span * i) / rings;
        const end = extent[0] + (span * (i + 1)) / rings;
        const outerT = radialTime === "old-outer" ? start : end;
        return { start, end, label: f.format(new Date(start)), radius: RING_INNER + radialFrac(outerT, extent, radialTime) * (WORLD_R - RING_INNER) };
      });
    }, [radialTime, extent, rings, locale]);

    drawRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext("2d");
      } catch {
        ctx = null;
      }
      if (!ctx) return;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const css = getComputedStyle(canvas);
      const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
      const fg = v("--foreground", "#18181b");
      const muted = v("--muted-foreground", "#71717a");
      const border = v("--border", "#e4e4e7");
      const bg = v("--background", "#ffffff");
      const primary = v("--primary", "#615fff");
      const z = zoomRef.current;
      const s = baseScale() * z.k;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(width / 2 + z.x, height / 2 + z.y);
      ctx.scale(s, s);
      const px = 1 / s;

      if (ringInfo.length) {
        ctx.lineWidth = px;
        ctx.strokeStyle = border;
        ctx.fillStyle = muted;
        ctx.font = `${10 * px}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        for (const ring of ringInfo) {
          ctx.beginPath();
          ctx.setLineDash([3 * px, 4 * px]);
          ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillText(ring.label, 0, -ring.radius - 2 * px);
        }
      }

      const pos = positionsRef.current;
      const sel = selectedId && visibleIds.has(selectedId) ? selectedId : null;
      const focusSet = sel ? neighbours.get(sel) : hover ? neighbours.get(hover.id) : undefined;
      const focusId = sel ?? hover?.id ?? null;

      ctx.lineWidth = px;
      for (const n of visible) {
        const a = pos.get(n.id);
        if (!a) continue;
        for (const l of neighbours.get(n.id) ?? []) {
          if (l < n.id || !visibleIds.has(l)) continue;
          const b = pos.get(l);
          if (!b) continue;
          const hot = focusId != null && (n.id === focusId || l === focusId);
          ctx.globalAlpha = hot ? 0.9 : focusId ? 0.12 : 0.35;
          ctx.strokeStyle = hot ? primary : muted;
          ctx.lineWidth = (hot ? 1.5 : 1) * px;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      for (const n of visible) {
        const p = pos.get(n.id);
        if (!p) continue;
        const item = legendByKind.get(n.kind);
        const r = radiusRef.current.get(n.id) ?? 6;
        const dim = focusId != null && n.id !== focusId && !focusSet?.has(n.id);
        ctx.globalAlpha = dim ? 0.3 : 1;
        ctx.beginPath();
        glyphPath(ctx, item?.glyph ?? "circle", p.x, p.y, r);
        ctx.fillStyle = item?.color ?? muted;
        ctx.fill();
        ctx.lineWidth = 1.5 * px;
        ctx.strokeStyle = bg;
        ctx.stroke();
        if (n.id === sel || n.id === hover?.id) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4 * px, 0, Math.PI * 2);
          ctx.lineWidth = 2 * px;
          ctx.strokeStyle = n.id === sel ? primary : muted;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      ctx.font = `${11 * px}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const n of visible) {
        const show = n.id === focusId || focusSet?.has(n.id) || (z.k >= 2 && (radiusRef.current.get(n.id) ?? 0) >= 8);
        if (!show) continue;
        const p = pos.get(n.id);
        if (!p) continue;
        const r = radiusRef.current.get(n.id) ?? 6;
        ctx.lineWidth = 3 * px;
        ctx.strokeStyle = bg;
        ctx.strokeText(n.label, p.x, p.y + r + 3 * px);
        ctx.fillStyle = fg;
        ctx.fillText(n.label, p.x, p.y + r + 3 * px);
      }
    };

    React.useEffect(() => {
      scheduleDraw();
    }, [scheduleDraw, visible, selectedId, hover, width, height, ringInfo, legendByKind, listView]);

    React.useEffect(
      () => () => {
        if (frame.current != null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame.current);
        // Clear the pending id so a remount (e.g. StrictMode's mount → unmount → mount) can schedule again.
        frame.current = null;
      },
      []
    );

    /* ---------- pointer ---------- */
    const pointers = React.useRef(new Map<number, { x: number; y: number }>());
    const gesture = React.useRef<{ moved: boolean; startX: number; startY: number; pinch?: number } | null>(null);
    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const zoomAtRef = useLatestRef(zoomAt);
    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        zoomAtRef.current(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
      };
      canvas.addEventListener("wheel", onWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", onWheel);
    }, [listView, zoomAtRef]);

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const p = local(e);
      pointers.current.set(e.pointerId, p);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        gesture.current = { moved: true, startX: p.x, startY: p.y, pinch: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
      } else gesture.current = { moved: false, startX: p.x, startY: p.y };
    };
    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const p = local(e);
      const prev = pointers.current.get(e.pointerId);
      const g = gesture.current;
      if (prev && g) {
        pointers.current.set(e.pointerId, p);
        if (pointers.current.size === 2 && g.pinch) {
          const [a, b] = Array.from(pointers.current.values());
          const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
          zoomAt(d / g.pinch, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
          g.pinch = d;
          return;
        }
        if (!g.moved && Math.hypot(p.x - g.startX, p.y - g.startY) > 3) g.moved = true;
        if (g.moved) {
          const z = zoomRef.current;
          zoomRef.current = { ...z, x: z.x + (p.x - prev.x), y: z.y + (p.y - prev.y) };
          setHover(null);
          scheduleDraw();
        }
        return;
      }
      const hit = hitTest(p.x, p.y);
      setHover((h) => (hit ? (h?.id === hit.id && h.x === p.x && h.y === p.y ? h : { id: hit.id, x: p.x, y: p.y }) : null));
    };
    const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const g = gesture.current;
      pointers.current.delete(e.pointerId);
      if (pointers.current.size > 0) return;
      gesture.current = null;
      if (!g) return;
      if (g.moved) {
        emitZoom();
        return;
      }
      const p = local(e);
      const hit = hitTest(p.x, p.y);
      select(hit ? hit.id : null);
    };

    const hasActions = !!(onOpen || onEdit || onDelete);
    const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
    const hoverNode = hover ? byId.get(hover.id) : undefined;

    const actionItems = (node: MemoryNode, Item: typeof DropdownMenuItem | typeof ContextMenuItem) => (
      <>
        {onOpen && <Item onSelect={() => onOpen(node)}>Open</Item>}
        {onEdit && <Item onSelect={() => onEdit(node)}>Edit</Item>}
        {onDelete && (
          <Item variant="destructive" onSelect={() => onDelete(node)}>
            Delete
          </Item>
        )}
      </>
    );

    const detailActions =
      selected && hasActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost" aria-label={`Actions for ${selected.label}`}>
              <RiMoreLine aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            {actionItems(selected, DropdownMenuItem)}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null;

    const canvasLabel = `${ariaLabel}: ${visible.length} of ${nodes.length} nodes shown${
      ringInfo.length ? `, arranged in time rings from ${radialTime === "old-outer" ? "newest at the center" : "oldest at the center"}` : ""
    }${selected ? `. Selected: ${selected.label}` : ""}.`;

    const canvasEl = (
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={canvasLabel}
        width={width}
        height={height}
        style={{ width: "100%", height }}
        className={cn("block touch-none select-none", hover ? "cursor-pointer" : "cursor-grab active:cursor-grabbing")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          gesture.current = null;
        }}
        onPointerLeave={() => setHover(null)}
      />
    );

    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
        <div className="flex flex-wrap items-center gap-2">
          {showLegend && (
            <MemoryMapLegend
              items={legend}
              hiddenKinds={hiddenKinds}
              onToggleKind={(k) => setHiddenKinds(hiddenKinds.includes(k) ? hiddenKinds.filter((x) => x !== k) : [...hiddenKinds, k])}
            />
          )}
          <div className="ml-auto flex items-center gap-1">
            {toolbarExtra}
            {!listView && (
              <>
                <Button size="icon-sm" variant="ghost" aria-label="Zoom in" onClick={() => zoomAt(1.3)}>
                  <RiZoomInLine aria-hidden />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.3)}>
                  <RiZoomOutLine aria-hidden />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Reset view"
                  onClick={() => {
                    zoomRef.current = DEFAULT_ZOOM;
                    scheduleDraw();
                    emitZoom();
                  }}
                >
                  <RiFocus3Line aria-hidden />
                </Button>
              </>
            )}
            <Button size="sm" variant={listView ? "soft" : "ghost"} aria-pressed={listView} leadingIcon={<RiListUnordered aria-hidden />} onClick={() => setListView(!listView)}>
              List view
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-box border border-border bg-background">
            {listView ? (
              <div className="scrollbar-thin overflow-auto" style={{ maxHeight: height }}>
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    {ariaLabel}: {visible.length} nodes
                  </caption>
                  <thead className="sticky top-0 bg-subtle text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Label</th>
                      <th scope="col" className="px-3 py-2 font-medium">Kind</th>
                      <th scope="col" className="px-3 py-2 font-medium">Created</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...visible]
                      .sort((a, b) => memoryTime(a.createdAt) - memoryTime(b.createdAt))
                      .map((n) => {
                        const item = legendByKind.get(n.kind);
                        return (
                          <tr key={n.id} aria-selected={n.id === selectedId} className={cn("border-t border-border", n.id === selectedId && "bg-primary-soft/50")}>
                            <td className="px-3 py-1.5">
                              <button
                                type="button"
                                onClick={() => select(n.id)}
                                aria-pressed={n.id === selectedId}
                                className={cn("rounded-xs text-left font-medium hover:underline", focusRing)}
                              >
                                {n.label}
                              </button>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="inline-flex items-center gap-1.5">
                                {item && <MemoryGlyphIcon glyph={item.glyph} color={item.color} />}
                                {item?.label ?? n.kind}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{fmtDate(n.createdAt)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{neighbours.get(n.id)?.size ?? 0}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div ref={containerRef} className="relative">
                {hasActions ? (
                  <ContextMenu onOpenChange={(o) => !o && setMenuNode(null)}>
                    <ContextMenuTrigger
                      asChild
                      onContextMenu={(e) => {
                        const p = local(e);
                        const hit = hitTest(p.x, p.y);
                        if (!hit) {
                          e.preventDefault();
                          return;
                        }
                        if (hit.id !== selectedId) select(hit.id);
                        setMenuNode(hit);
                      }}
                    >
                      {canvasEl}
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-36">
                      {menuNode && (
                        <>
                          <ContextMenuLabel>{menuNode.label}</ContextMenuLabel>
                          <ContextMenuSeparator />
                          {actionItems(menuNode, ContextMenuItem)}
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  canvasEl
                )}
                {hoverNode && hover && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute z-10 max-w-56 rounded-md bg-inverse px-2 py-1 text-xs text-inverse-foreground shadow-md"
                    style={{ left: Math.min(hover.x + 12, width - 200), top: hover.y + 12 }}
                  >
                    <div className="font-medium">{hoverNode.label}</div>
                    <div className="opacity-75">
                      {legendByKind.get(hoverNode.kind)?.label ?? hoverNode.kind} · {fmtDate(hoverNode.createdAt)}
                    </div>
                  </div>
                )}
                <ul className="sr-only" aria-label={`${ariaLabel} nodes`}>
                  {visible.map((n) => (
                    <li key={n.id} data-memory-node={n.id}>
                      {n.label}, {legendByKind.get(n.kind)?.label ?? n.kind}, created {fmtDate(n.createdAt)},{" "}
                      {neighbours.get(n.id)?.size ?? 0} links{n.id === selectedId ? ", selected" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {showDetail && selected && (
            <aside aria-label="Node details" className="flex w-full shrink-0 flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs lg:w-72">
              {renderDetail ? (
                renderDetail(selected, {
                  links: Array.from(neighbours.get(selected.id) ?? []).map((id) => byId.get(id)!),
                  select,
                  legend: legendByKind.get(selected.kind),
                  actions: detailActions,
                })
              ) : (
                <MemoryNodeDetail
                  node={selected}
                  legend={legendByKind.get(selected.kind)}
                  links={Array.from(neighbours.get(selected.id) ?? []).map((id) => byId.get(id)!)}
                  onSelect={select}
                  actions={detailActions}
                  dateText={fmtDate(selected.createdAt)}
                />
              )}
            </aside>
          )}
        </div>

        {showScrubber && nodes.length > 0 && (
          <TimeScrubber nodes={nodes} min={extent[0]} max={extent[1]} value={range} onValueChange={setRange} locale={locale} {...scrubberProps} />
        )}
      </div>
    );
  }
);
MemoryMap.displayName = "MemoryMap";

function MemoryNodeDetail({
  node,
  legend,
  links,
  onSelect,
  actions,
  dateText,
}: {
  node: MemoryNode;
  legend?: MemoryLegendItem;
  links: MemoryNode[];
  onSelect: (id: string | null) => void;
  actions: React.ReactNode;
  dateText: string;
}) {
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {legend && <MemoryGlyphIcon glyph={legend.glyph} color={legend.color} />}
            {legend?.label ?? node.kind} · {dateText}
          </span>
          <h3 className="text-base font-semibold text-foreground">{node.label}</h3>
        </div>
        {actions}
        <Button size="icon-xs" variant="ghost" aria-label="Close details" onClick={() => onSelect(null)}>
          <RiCloseLine aria-hidden />
        </Button>
      </div>
      {node.description && <p className="text-sm text-muted-foreground">{node.description}</p>}
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Weight</dt>
          <dd className="font-medium tabular-nums">{node.weight ?? 1}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Links</dt>
          <dd className="font-medium tabular-nums">{links.length}</dd>
        </div>
      </dl>
      {links.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-medium text-muted-foreground">Linked</h4>
          <ul className="flex flex-col gap-0.5">
            {links.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onSelect(l.id)}
                  className={cn("w-full truncate rounded-xs px-1 py-0.5 text-left text-sm hover:bg-accent", focusRing)}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
