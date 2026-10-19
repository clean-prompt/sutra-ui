import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { ACCENT_COLORS, resolveAccent } from "../lib/accent";
import { formatShare } from "../lib/breakdown";
import { clamp } from "../lib/math";
import { formatMemory, splitValueUnit } from "../lib/system-monitor";
import {
  layoutTree,
  resolveTreemapPath,
  treemapNeighbor,
  treemapValue,
  type TreemapDatum,
  type TreemapDirection,
  type TreemapLayoutNode,
  type TreemapRect,
} from "../lib/treemap";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useSafeId } from "../hooks/use-safe-id";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../primitives/breadcrumbs";
import { BreakdownList } from "../primitives/meter";
import { Skeleton } from "../primitives/progress";
import { ChartTooltip } from "./chart-container";
import { StatValue } from "./stat-card";

/* ------------------------------------------------------------------------------------------------
 * Treemap
 * ----------------------------------------------------------------------------------------------*/

/** A node of treemap data. `value` defaults to the sum of the children. */
export interface TreemapNode extends TreemapDatum {
  children?: readonly TreemapNode[];
  /** Fixed colour for this node (and, on a top-level node, its whole category): an accent name or any CSS colour. */
  color?: string;
}

export interface TreemapColorInfo {
  /** The top-level node this one belongs to (the node itself at the top level). */
  category: TreemapNode;
  /** Index of the category among the root's children. */
  categoryIndex: number;
  /** Depth below the current view (1 = a direct child). */
  depth: number;
  /** Size rank among its siblings (0 = largest). */
  rank: number;
}

export interface TreemapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  /** The root node; its children fill the map. */
  data: TreemapNode;
  /** Accessible name of the map and caption of its screen-reader table. Default "Treemap". */
  label?: string;
  /** Map height in px. Default 320. */
  height?: number;
  /** Width used before the container is measured (and in jsdom). Default 600. */
  defaultWidth?: number;
  /** Levels drawn below the current view. Deeper levels appear inside framed parents with a header. Default 1. */
  depth?: number;
  /** Gap between tiles in px. Default 2. */
  gap?: number;
  valueFormatter?: (value: number) => string;
  /** Column header for values in the screen-reader table. Default "Value". */
  valueLabel?: string;
  /** Tile colour (an accent name or any CSS colour). Defaults to the node's `color`, then its category's colour. */
  colorFor?: (node: TreemapNode, info: TreemapColorInfo) => string | undefined;
  /** Category colours, cycled by the index of the top-level node. Defaults to a set of `ACCENT_COLORS`. */
  palette?: readonly string[];
  /** Drill path: child ids from the root down to the node shown. */
  path?: string[];
  defaultPath?: string[];
  onPathChange?: (path: string[]) => void;
  /** Called when a tile is clicked or activated with Enter/Space (before drilling into it). */
  onSelect?: (node: TreemapNode, path: string[]) => void;
  /** Tiles narrower or shorter than this (px) hide their label. Default `{ width: 44, height: 22 }`. */
  minLabelSize?: { width: number; height: number };
  /** Show a category legend (`BreakdownList`) under the map. Default false. */
  legend?: boolean;
  /** Show the drill breadcrumb. Defaults to true when some top-level node has children. */
  breadcrumb?: boolean;
  /** Show a tooltip for the hovered or focused tile. Default true. */
  tooltip?: boolean;
  /** Shown when nothing has a size. Default "No data". */
  emptyState?: React.ReactNode;
  /** Data is on its way: with nothing to draw, placeholder tiles (and legend rows) fill the map; otherwise the root is marked busy. */
  loading?: boolean;
}

const DEFAULT_PALETTE: readonly string[] = [
  ACCENT_COLORS.blue,
  ACCENT_COLORS.violet,
  ACCENT_COLORS.amber,
  ACCENT_COLORS.emerald,
  ACCENT_COLORS.pink,
  ACCENT_COLORS.cyan,
  ACCENT_COLORS.orange,
  ACCENT_COLORS.lime,
  ACCENT_COLORS.rose,
  ACCENT_COLORS.sky,
  ACCENT_COLORS.purple,
  ACCENT_COLORS.teal,
];

const plainFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const defaultValueFormatter = (v: number) => plainFormat.format(v);
const keyOf = (path: readonly string[]) => path.join("\u0000");
const hasChildren = (node: TreemapNode) => (node.children?.length ?? 0) > 0;
const itemsText = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

const ARROWS: Record<string, TreemapDirection> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

interface Tile extends TreemapLayoutNode<TreemapNode> {
  key: string;
  color: string;
  share: number;
  valueText: string;
  /** Rect used for arrow-key navigation (a frame's header strip, or the whole tile). */
  nav: TreemapRect;
}

/**
 * Squarified treemap: tiles sized by value, coloured by category, with hover/focus tooltips, arrow-key navigation,
 * drill-down (Enter, click) and up (Backspace, Escape, breadcrumb), an optional legend and a screen-reader table.
 */
export const Treemap = React.forwardRef<HTMLDivElement, TreemapProps>(
  (
    {
      data,
      label = "Treemap",
      height = 320,
      defaultWidth = 600,
      depth = 1,
      gap = 2,
      valueFormatter = defaultValueFormatter,
      valueLabel = "Value",
      colorFor,
      palette = DEFAULT_PALETTE,
      path: pathProp,
      defaultPath,
      onPathChange,
      onSelect,
      minLabelSize = { width: 44, height: 22 },
      legend = false,
      breadcrumb,
      tooltip = true,
      emptyState = "No data",
      loading,
      className,
      ...props
    },
    ref
  ) => {
    const mapRef = React.useRef<HTMLDivElement>(null);
    const measured = Math.round(useElementWidth(mapRef));
    const width = measured > 0 ? measured : defaultWidth;
    const hintId = useSafeId("treemap-hint");

    const [rawPath, setPath] = useControllableState<string[]>({ value: pathProp, defaultValue: defaultPath ?? [], onChange: onPathChange });
    const trail = React.useMemo(() => resolveTreemapPath(data, rawPath), [data, rawPath]);
    const path = React.useMemo(() => trail.map((n) => n.id), [trail]);
    const view = trail[trail.length - 1] ?? data;
    const viewTotal = treemapValue(view);
    const categories = React.useMemo(() => data.children ?? [], [data]);
    const drillable = categories.some(hasChildren);
    const showBreadcrumb = breadcrumb ?? drillable;

    const headerHeight = depth > 1 ? 20 : 0;
    const padding = depth > 1 ? 3 : 0;

    const tiles = React.useMemo<Tile[]>(() => {
      const nodes = layoutTree(view, { x: 0, y: 0, width, height }, { depth, padding, headerHeight });
      const categoryColor = (index: number) => {
        const cat = categories[index];
        return resolveAccent(cat?.color) ?? palette[index % Math.max(1, palette.length)] ?? ACCENT_COLORS.blue;
      };
      return nodes.map((n) => {
        const fullPath = [...path, ...n.path];
        const category = categories.find((c) => c.id === fullPath[0]) ?? n.node;
        const categoryIndex = Math.max(0, categories.indexOf(category));
        const color =
          resolveAccent(colorFor?.(n.node, { category, categoryIndex, depth: n.depth, rank: n.rank })) ??
          resolveAccent(n.node.color) ??
          categoryColor(categoryIndex);
        const nav = n.expanded ? { x: n.x, y: n.y, width: n.width, height: Math.min(n.height, padding + headerHeight) } : n;
        return {
          ...n,
          key: keyOf(n.path),
          color,
          share: viewTotal > 0 ? n.value / viewTotal : 0,
          valueText: valueFormatter(n.value),
          nav: { x: nav.x, y: nav.y, width: nav.width, height: nav.height },
        };
      });
    }, [view, width, height, depth, padding, headerHeight, categories, palette, colorFor, path, viewTotal, valueFormatter]);

    const [activeKey, setActiveKey] = React.useState<string | null>(null);
    const [hoverKey, setHoverKey] = React.useState<string | null>(null);
    const [focusKey, setFocusKey] = React.useState<string | null>(null);
    const [focusTick, setFocusTick] = React.useState(0);
    const tileRefs = React.useRef(new Map<string, HTMLButtonElement>());
    const current = tiles.find((t) => t.key === activeKey) ?? tiles[0];
    const currentKey = React.useRef<string | undefined>(undefined);
    currentKey.current = current?.key;

    React.useEffect(() => {
      if (focusTick === 0 || currentKey.current === undefined) return;
      tileRefs.current.get(currentKey.current)?.focus();
    }, [focusTick]);

    const moveFocus = (key: string | null) => {
      setActiveKey(key);
      setFocusTick((n) => n + 1);
    };

    const goTo = (next: string[], focusChild: string | null) => {
      setPath(next);
      setHoverKey(null);
      moveFocus(focusChild);
    };

    const activate = (tile: Tile) => {
      const fullPath = [...path, ...tile.path];
      onSelect?.(tile.node, fullPath);
      if (hasChildren(tile.node)) goTo(fullPath, null);
      else setActiveKey(tile.key);
    };

    const goUp = (levels = 1) => {
      if (path.length === 0) return false;
      const keep = Math.max(0, path.length - levels);
      goTo(path.slice(0, keep), keyOf([path[keep]!]));
      return true;
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      props.onKeyDown?.(e);
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !current) return;
      const index = tiles.indexOf(current);
      const dir = ARROWS[e.key];
      let next: number | null = null;
      if (dir) next = treemapNeighbor(tiles.map((t) => t.nav), index, dir);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tiles.length - 1;
      else if (e.key === "Backspace" || e.key === "Escape") {
        if (goUp()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (next === null) return;
      e.preventDefault();
      moveFocus(tiles[next]!.key);
    };

    const shown = hoverKey ?? focusKey;
    const tipTile = tooltip ? tiles.find((t) => t.key === shown) : undefined;
    const names = (t: Tile) => [...trail.map((n) => n.name), ...pathNames(view, t.path)];
    const hovered = tiles.find((t) => t.key === hoverKey);
    const related = (t: Tile) =>
      !hovered || t.key === hovered.key || keyOf(hovered.path).startsWith(t.key + "\u0000") || t.key.startsWith(hovered.key + "\u0000");

    const minW = minLabelSize.width;
    const minH = minLabelSize.height;
    const inset = Math.max(0, gap) / 2;

    return (
      <div ref={ref} data-slot="treemap" aria-busy={loading || undefined} className={cn("flex min-w-0 flex-col gap-3", className)} {...props} onKeyDown={onKeyDown}>
        {showBreadcrumb ? (
          <Breadcrumb size="sm" aria-label={`${label} location`} data-slot="treemap-breadcrumb">
            <BreadcrumbList>
              {[data, ...trail].map((node, i, all) => {
                const last = i === all.length - 1;
                return (
                  <React.Fragment key={keyOf(path.slice(0, i)) || "\u0000root"}>
                    {i > 0 ? <BreadcrumbSeparator /> : null}
                    <BreadcrumbItem>
                      {last ? (
                        <BreadcrumbPage>{node.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <button type="button" onClick={() => goUp(path.length - i)}>
                            {node.name}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}

        {tiles.length === 0 && loading ? (
          <>
            <span className="sr-only">{`Loading ${label}…`}</span>
            <div aria-hidden data-slot="treemap-skeleton" className="relative w-full" style={{ height }}>
              {TREEMAP_SKELETON_TILES.map(([x, y, w, h], i) => (
                <Skeleton
                  key={i}
                  className="absolute rounded-md"
                  style={{
                    left: `calc(${x}% + ${Math.max(0, gap) / 2}px)`,
                    top: `calc(${y}% + ${Math.max(0, gap) / 2}px)`,
                    width: `calc(${w}% - ${Math.max(0, gap)}px)`,
                    height: `calc(${h}% - ${Math.max(0, gap)}px)`,
                  }}
                />
              ))}
            </div>
            {legend ? (
              <div aria-hidden data-slot="treemap-legend-skeleton" className="grid gap-1 gap-x-6 text-xs sm:grid-cols-2">
                {[52, 40, 60, 34].map((w, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <Skeleton className="size-2.5 shrink-0 rounded-[3px]" />
                    <span className="min-w-0 flex-1">
                      <Skeleton shape="text" className="h-3" width={`${w}%`} />
                    </span>
                    <Skeleton shape="text" className="h-3 w-10 shrink-0" />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : tiles.length === 0 ? (
          <div
            data-slot="treemap-empty"
            className="flex items-center justify-center rounded-box border border-dashed border-border text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyState}
          </div>
        ) : (
          <div
            ref={mapRef}
            role="group"
            aria-label={label}
            aria-roledescription="treemap"
            aria-describedby={hintId}
            data-slot="treemap-map"
            className="relative w-full select-none"
            style={{ height }}
            onPointerLeave={() => setHoverKey(null)}
          >
            {tiles.map((t) => {
              const w = Math.max(0, t.width - inset * 2);
              const h = Math.max(0, t.height - inset * 2);
              const showName = w >= minW && h >= (t.expanded ? Math.min(minH, headerHeight) : minH);
              const showValue = showName && !t.expanded && w >= minW + 12 && h >= minH + 18;
              const mix = t.expanded ? 10 : Math.max(16, 34 - t.rank * 3);
              const focusable = t.key === current?.key;
              const kids = t.node.children?.length ?? 0;
              return (
                <button
                  key={t.key}
                  ref={(el) => {
                    if (el) tileRefs.current.set(t.key, el);
                    else tileRefs.current.delete(t.key);
                  }}
                  type="button"
                  tabIndex={focusable ? 0 : -1}
                  aria-label={`${t.node.name}, ${t.valueText}, ${formatShare(t.share)}${kids ? `, ${itemsText(kids)}` : ""}`}
                  data-slot="treemap-tile"
                  data-id={t.node.id}
                  data-depth={t.depth}
                  data-expanded={t.expanded || undefined}
                  data-label={showName ? (showValue ? "full" : "name") : "hidden"}
                  data-highlighted={hoverKey === t.key || undefined}
                  className={cn(
                    "absolute flex flex-col overflow-hidden rounded-md border text-left transition-[opacity,background-color] duration-150",
                    t.expanded ? "items-stretch justify-start px-1.5 py-0.5" : "items-start justify-start gap-0.5 p-2",
                    focusRing,
                    "focus-visible:z-10",
                    !related(t) && "opacity-55"
                  )}
                  style={{
                    left: t.x + inset,
                    top: t.y + inset,
                    width: w,
                    height: h,
                    backgroundColor: `color-mix(in oklab, ${t.color} ${hoverKey === t.key ? mix + 12 : mix}%, var(--card))`,
                    borderColor: `color-mix(in oklab, ${t.color} ${t.expanded ? 30 : 45}%, transparent)`,
                  }}
                  onClick={() => activate(t)}
                  onFocus={() => {
                    setFocusKey(t.key);
                    setActiveKey(t.key);
                  }}
                  onBlur={() => setFocusKey((k) => (k === t.key ? null : k))}
                  onPointerEnter={() => setHoverKey(t.key)}
                  onPointerLeave={() => setHoverKey((k) => (k === t.key ? null : k))}
                >
                  {showName ? (
                    <span aria-hidden className="flex w-full min-w-0 items-baseline gap-1.5">
                      <span className={cn("truncate font-medium text-foreground", t.expanded || h < minH + 18 ? "text-xs" : "text-sm")}>
                        {t.node.name}
                      </span>
                      {t.expanded && w >= minW + 60 ? (
                        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{t.valueText}</span>
                      ) : null}
                    </span>
                  ) : null}
                  {showValue ? (
                    <span aria-hidden className="truncate text-xs tabular-nums text-muted-foreground">
                      {t.valueText}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {tipTile ? (
              <ChartTooltip
                aria-hidden
                data-slot="treemap-tooltip"
                label={names(tipTile).join(" › ")}
                items={[{ key: tipTile.key, label: formatShare(tipTile.share), color: tipTile.color, value: tipTile.valueText }]}
                footer={hasChildren(tipTile.node) ? itemsText(tipTile.node.children!.length) : undefined}
                style={tooltipPosition(tipTile, width, height)}
              />
            ) : null}
            <p id={hintId} className="sr-only">
              Arrow keys move between tiles. Enter opens a tile that has items inside{path.length ? "; Backspace or Escape goes up" : ""}.
            </p>
          </div>
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {path.length ? `Showing ${trail.map((n) => n.name).join(", ")}` : ""}
        </div>

        {tiles.length ? (
          <div className="sr-only">
            <table data-slot="treemap-table">
              <caption>{[label, ...trail.map((n) => n.name)].join(" › ")}</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">{valueLabel}</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {tiles.map((t) => (
                  <tr key={t.key}>
                    <th scope="row">{pathNames(view, t.path).join(" › ")}</th>
                    <td>{t.valueText}</td>
                    <td>{formatShare(t.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {legend && categories.length ? (
          <BreakdownList
            data-slot="treemap-legend"
            size="sm"
            showPercent
            valueFormatter={valueFormatter}
            className="grid gap-x-6 sm:grid-cols-2"
            items={categories
              .map((c, i) => ({ node: c, i, value: treemapValue(c) }))
              .filter((c) => c.value > 0)
              .map(({ node, i, value }) => ({
                key: node.id,
                label: node.name,
                value,
                color:
                  resolveAccent(colorFor?.(node, { category: node, categoryIndex: i, depth: 1, rank: 0 })) ??
                  resolveAccent(node.color) ??
                  palette[i % Math.max(1, palette.length)] ??
                  ACCENT_COLORS.blue,
              }))}
          />
        ) : null}
      </div>
    );
  }
);
Treemap.displayName = "Treemap";

/** Placeholder tiles as [left, top, width, height] in percent: a squarified-looking split. */
const TREEMAP_SKELETON_TILES: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 46, 100],
  [46, 0, 54, 55],
  [46, 55, 30, 45],
  [76, 55, 24, 25],
  [76, 80, 24, 20],
];

function pathNames(root: TreemapNode, ids: readonly string[]): string[] {
  return resolveTreemapPath(root, ids).map((n) => n.name);
}

function tooltipPosition(t: Tile, width: number, height: number): React.CSSProperties {
  const tipW = 176;
  const tipH = 72;
  const left = clamp(t.x + Math.min(12, t.width / 2), 0, Math.max(0, width - tipW));
  const below = t.y + t.height + 6;
  const top = below + tipH <= height ? below : t.y - tipH - 6 >= 0 ? t.y - tipH - 6 : clamp(t.y + 6, 0, Math.max(0, height - tipH));
  return { left, top, width: tipW };
}

/* ------------------------------------------------------------------------------------------------
 * StorageMap
 * ----------------------------------------------------------------------------------------------*/

export type StorageCategory = "macos" | "app-data" | "yours" | "other";

/** Default label and colour of each storage category, in display order. */
export const STORAGE_CATEGORIES: readonly { id: StorageCategory; label: string; color: string }[] = [
  { id: "macos", label: "macOS", color: ACCENT_COLORS.blue },
  { id: "app-data", label: "App data", color: ACCENT_COLORS.violet },
  { id: "yours", label: "Yours", color: ACCENT_COLORS.amber },
  { id: "other", label: "Other", color: ACCENT_COLORS.slate },
];

/** A folder or file on disk. `size` (bytes) defaults to the sum of the children. */
export interface StorageMapItem {
  id: string;
  name: string;
  size?: number;
  /** Top-level items only. Default "other". */
  category?: StorageCategory;
  children?: StorageMapItem[];
}

type StorageMapTreemapProps = Pick<
  TreemapProps,
  | "path"
  | "defaultPath"
  | "onPathChange"
  | "onSelect"
  | "height"
  | "defaultWidth"
  | "depth"
  | "gap"
  | "minLabelSize"
  | "legend"
  | "breadcrumb"
  | "tooltip"
  | "emptyState"
>;

export interface StorageMapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect">, StorageMapTreemapProps {
  items: StorageMapItem[];
  /** Disk capacity in bytes. */
  capacity?: number;
  /** Used bytes. Defaults to the sum of `items`. */
  used?: number;
  /** Free bytes. Defaults to `capacity - used`. */
  free?: number;
  /** Accessible name of the map and its root crumb. Default "Storage". */
  label?: string;
  /** Override category labels or colours (an accent name or any CSS colour). */
  categories?: Partial<Record<StorageCategory, { label?: string; color?: string }>>;
  /** Formats byte counts. Default decimal units ("412.5 GB"), like the system kit. */
  formatBytes?: (bytes: number) => string;
  /** Data is on its way: with no items, placeholders stand in for the used and free values, the map and the legend. */
  loading?: boolean;
}

const toNode = (item: StorageMapItem): TreemapNode => ({
  id: item.id,
  name: item.name,
  value: item.size,
  children: item.children?.map(toNode),
});

/** Disk usage map: a used/free header, a treemap of folders grouped by category (macOS, App data, Yours, Other) and a legend. */
export const StorageMap = React.forwardRef<HTMLDivElement, StorageMapProps>(
  (
    {
      items,
      capacity,
      used: usedProp,
      free: freeProp,
      label = "Storage",
      categories: overrides,
      formatBytes = formatMemory,
      path,
      defaultPath,
      onPathChange,
      onSelect,
      height,
      defaultWidth,
      depth = 2,
      gap,
      minLabelSize,
      legend = true,
      breadcrumb,
      tooltip,
      emptyState,
      loading,
      className,
      ...props
    },
    ref
  ) => {
    const data = React.useMemo<TreemapNode>(() => {
      const groups = STORAGE_CATEGORIES.map((cat) => ({
        id: cat.id,
        name: overrides?.[cat.id]?.label ?? cat.label,
        color: resolveAccent(overrides?.[cat.id]?.color) ?? cat.color,
        children: items.filter((it) => (it.category ?? "other") === cat.id).map(toNode),
      })).filter((g) => g.children.length > 0);
      return { id: "storage", name: label, children: groups };
    }, [items, overrides, label]);

    const finiteOr = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
    const cap = finiteOr(capacity);
    const used = finiteOr(usedProp) ?? treemapValue(data);
    const free = finiteOr(freeProp) ?? (cap !== undefined ? Math.max(0, cap - used) : undefined);
    const usedText = splitValueUnit(formatBytes(used));
    const skeleton = !!loading && items.length === 0;

    return (
      <div
        ref={ref}
        data-slot="storage-map"
        aria-busy={loading || undefined}
        className={cn("flex min-w-0 flex-col gap-4 rounded-box border border-border bg-card p-5 text-card-foreground shadow-xs", className)}
        {...props}
      >
        <div data-slot="storage-map-header" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="text-sm text-muted-foreground">{cap !== undefined ? `In use of ${formatBytes(cap)}` : "In use"}</div>
            {skeleton ? (
              <Skeleton data-slot="storage-map-used-skeleton" className="my-0.5 h-8 w-28" />
            ) : (
              <StatValue data-slot="storage-map-used" value={usedText.value} unit={usedText.unit} size="lg" className="text-foreground" />
            )}
          </div>
          {skeleton && cap !== undefined && finiteOr(freeProp) === undefined ? (
            <dl className="flex items-baseline gap-2 text-sm">
              <dt className="text-muted-foreground">Free</dt>
              <dd className="self-center">
                <Skeleton shape="text" className="h-3.5 w-16" />
              </dd>
            </dl>
          ) : free !== undefined ? (
            <dl className="flex items-baseline gap-2 text-sm">
              <dt className="text-muted-foreground">Free</dt>
              <dd data-slot="storage-map-free" className="font-medium tabular-nums text-foreground">
                {formatBytes(free)}
              </dd>
            </dl>
          ) : null}
        </div>
        <Treemap
          data={data}
          label={label}
          valueFormatter={formatBytes}
          valueLabel="Size"
          path={path}
          defaultPath={defaultPath}
          onPathChange={onPathChange}
          onSelect={onSelect}
          height={height}
          defaultWidth={defaultWidth}
          depth={depth}
          gap={gap}
          minLabelSize={minLabelSize}
          legend={legend}
          breadcrumb={breadcrumb}
          tooltip={tooltip}
          emptyState={emptyState}
          loading={loading}
        />
      </div>
    );
  }
);
StorageMap.displayName = "StorageMap";
