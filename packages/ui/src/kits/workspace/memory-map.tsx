/* MemoryMap: knowledge / memory graph over time on a canvas. The model, legend, scrubber, share codes and
   renderer live in the memory-map-* modules; this file keeps the component and re-exports the rest. */
import * as React from "react";
import { RiFocus3Line, RiListUnordered, RiMoreLine, RiZoomInLine, RiZoomOutLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePrefersReducedMotion } from "../../hooks/use-media-query";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { clamp } from "../../lib/math";
import { formatShortDate, type TimeInput } from "../../lib/time";
import { Button } from "../../primitives/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "../../primitives/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../primitives/dropdown-menu";
import {
  memoryMapLegend,
  memoryTime,
  type MemoryLayoutOptions,
  type MemoryLegendItem,
  type MemoryLegendOverrides,
  type MemoryMapZoom,
  type MemoryNode,
  type MemoryPoint,
  type MemoryRadialTime,
} from "./memory-map-model";
import { createSimulation, nodeRadiusFor, radialFrac, RING_INNER, timeExtent } from "./memory-map-internal";
import { MemoryGlyphIcon, MemoryMapLegend } from "./memory-map-legend";
import { TimeScrubber, type TimeScrubberProps } from "./memory-map-scrubber";
import { drawMemoryMap } from "./memory-map-canvas-internal";
import { MemoryNodeDetail } from "./memory-map-detail-internal";

export * from "./memory-map-model";
export * from "./memory-map-legend";
export * from "./memory-map-scrubber";
export * from "./memory-map-share";

/** Pure, deterministic d3-force layout (link + charge + collide, optional radial time rings). */
export function layoutMemoryGraph(nodes: readonly MemoryNode[], options: MemoryLayoutOptions = {}): Record<string, MemoryPoint> {
  const { sim, simNodes } = createSimulation(nodes, options);
  sim.tick(options.ticks ?? 300);
  const out: Record<string, MemoryPoint> = {};
  for (const n of simNodes) out[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
  return out;
}

/* ------------------------------------------------------------------ */
/* MemoryMap                                                           */
/* ------------------------------------------------------------------ */

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

    drawRef.current = () =>
      drawMemoryMap(canvasRef.current, {
        width,
        height,
        zoom: zoomRef.current,
        baseScale: baseScale(),
        ringInfo,
        positions: positionsRef.current,
        radii: radiusRef.current,
        visible,
        visibleIds,
        neighbours,
        legendByKind,
        selectedId,
        hover,
      });

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
          <div className="ms-auto flex items-center gap-1">
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
                  <thead className="sticky top-0 bg-subtle text-start text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Label</th>
                      <th scope="col" className="px-3 py-2 font-medium">Kind</th>
                      <th scope="col" className="px-3 py-2 font-medium">Created</th>
                      <th scope="col" className="px-3 py-2 text-end font-medium">Links</th>
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
                                className={cn("rounded-xs text-start font-medium hover:underline", focusRing)}
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
                            <td className="px-3 py-1.5 text-end tabular-nums">{neighbours.get(n.id)?.size ?? 0}</td>
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
