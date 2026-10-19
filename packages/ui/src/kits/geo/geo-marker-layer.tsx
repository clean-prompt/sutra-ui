import * as React from "react";
import { cn, focusRing } from "../../lib/cn";
import { clamp, roundTo } from "../../lib/math";
import { formatList } from "../../lib/format";
import { COLOR_TOKENS, normalizeTone, resolveColorToken, type ToneInput } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { clusterPoints, type GeoCluster, type GeoPointInput } from "./geo-model";

/* ------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------*/

export interface GeoMarkerRenderState {
  selected: boolean;
  /** Box size of the marker in px. */
  size: number;
}

/** A point on a map: a dot, an icon, or any React content (an avatar with a badge). */
export interface GeoMarker {
  id: string;
  point: GeoPointInput;
  /** Accessible name of the marker button; also its tooltip title. */
  label: string;
  /** Second tooltip line and the "Details" cell of the map's screen-reader table. */
  description?: React.ReactNode;
  /** Semantic colour of the dot. */
  tone?: ToneInput;
  /** Colour token or any CSS colour; wins over `tone`. */
  color?: string;
  /** Diameter in px. Defaults to a size scaled by `value`, else 12 (32 with `render`). */
  size?: number;
  /** Scales the dot between the layer's `sizeRange` when `size` is not set. */
  value?: number;
  /** Icon drawn inside the dot. */
  icon?: React.ReactNode;
  /** Custom content in place of the dot (e.g. an `Avatar`). */
  render?: React.ReactNode | ((state: GeoMarkerRenderState) => React.ReactNode);
  /** Small node pinned to the marker's bottom-right corner (a source or status badge). */
  badge?: React.ReactNode;
  /** A soft ping around the marker for live items (off under reduced motion). */
  pulse?: boolean;
  /** Called when this marker is activated. */
  onSelect?: (marker: GeoMarker) => void;
}

export interface GeoMarkerClusterOptions {
  /** Markers closer than this (px) merge into one bubble. Default 36 (48 in compact mode). */
  radius?: number;
}

export interface GeoMarkerLayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  markers: readonly GeoMarker[];
  /** Screen position of a point, or `null` to hide the marker (clipped, or on a globe's far side). */
  project: (point: GeoPointInput) => readonly [number, number] | null;
  /** Size of the drawing the layer sits on, used to keep tooltips inside. */
  width: number;
  height: number;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** Called with the new selection (`null` when the selected marker is activated again). */
  onSelectedIdChange?: (id: string | null, marker: GeoMarker | undefined) => void;
  /** Merge nearby markers into count bubbles. The selected marker always stays on its own. */
  cluster?: boolean | GeoMarkerClusterOptions;
  /** Called when a cluster bubble is activated. */
  onClusterSelect?: (members: GeoMarker[], cluster: GeoCluster<GeoMarker>) => void;
  /** Diameter range in px for `value`-scaled markers. Default `[8, 28]`. */
  sizeRange?: [number, number];
  /** Show a tooltip for the hovered or focused marker. Default true. */
  tooltip?: boolean;
  /**
   * Smaller markers (about 70%) and a wider default cluster radius, for small maps where avatars would crowd.
   * Default: on when `width` is under 480 px.
   */
  compact?: boolean;
  /** Opacity per marker, 0–1 (the globe fades markers near its edge). Markers at 0 are not rendered. */
  markerOpacity?: (marker: GeoMarker) => number;
  /** A marker to show as active from outside (tooltip and ring), e.g. while a list row for it has focus. */
  activeId?: string | null;
}

/* ------------------------------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------------------------------*/

const MIN_TARGET = 24;
const DEFAULT_CLUSTER_RADIUS = 36;
const COMPACT_CLUSTER_RADIUS = 48;
/** Below this width (px) the layer switches to compact markers unless told otherwise. */
const COMPACT_BELOW = 480;
const COMPACT_SCALE = 0.7;

/** The CSS colour of a marker or arc: `color` (token or CSS) first, then `tone`, then primary. */
export function geoItemColor(item: { color?: string; tone?: ToneInput }): string {
  if (item.color) return resolveColorToken(item.color);
  return COLOR_TOKENS[normalizeTone(item.tone, "primary")];
}

function markerSizer(markers: readonly GeoMarker[], [lo, hi]: [number, number]) {
  const maxValue = markers.reduce((m, k) => (Number.isFinite(k.value) && k.value! > m ? k.value! : m), 0);
  return (m: GeoMarker) => {
    if (Number.isFinite(m.size) && m.size! > 0) return m.size!;
    if (m.render) return 32;
    if (Number.isFinite(m.value) && maxValue > 0) return Math.round(lo + (hi - lo) * Math.sqrt(Math.max(0, m.value!) / maxValue));
    return 12;
  };
}

const clusterLabel = (members: readonly GeoMarker[]) => {
  const names = members.slice(0, 3).map((m) => m.label);
  const rest = members.length - names.length;
  return `${members.length} markers: ${rest > 0 ? `${names.join(", ")} and ${rest} more` : formatList(names)}`;
};

interface Placed {
  key: string;
  x: number;
  y: number;
  /** Drawn size in px (after the compact scale). */
  size: number;
  /** Size the custom content is laid out at before scaling (`size / scale`). */
  baseSize: number;
  scale: number;
  opacity: number;
  marker?: GeoMarker;
  cluster?: GeoCluster<GeoMarker>;
}

/* ------------------------------------------------------------------------------------------------
 * GeoMarkerLayer
 * ----------------------------------------------------------------------------------------------*/

/**
 * HTML overlay of marker buttons positioned over a map drawing: focusable, labelled, `aria-pressed` for the
 * selected one, optional clustering into count bubbles and a hover/focus tooltip. Shared by WorldMap and the globe.
 */
export const GeoMarkerLayer = React.forwardRef<HTMLDivElement, GeoMarkerLayerProps>(
  (
    {
      markers,
      project,
      width,
      height,
      selectedId: selectedProp,
      defaultSelectedId = null,
      onSelectedIdChange,
      cluster,
      onClusterSelect,
      sizeRange = [8, 28],
      tooltip = true,
      compact: compactProp,
      markerOpacity,
      activeId = null,
      className,
      ...props
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = useControllableState<string | null>({
      value: selectedProp,
      defaultValue: defaultSelectedId,
      onChange: (id) => onSelectedIdChange?.(id, markers.find((m) => m.id === id)),
    });
    const [hoverKey, setHoverKey] = React.useState<string | null>(null);
    const [focusKey, setFocusKey] = React.useState<string | null>(null);
    const [lo, hi] = sizeRange;
    const compact = compactProp ?? (Number.isFinite(width) && width > 0 && width < COMPACT_BELOW);
    const k = compact ? COMPACT_SCALE : 1;
    const radius = cluster
      ? typeof cluster === "object" && Number.isFinite(cluster.radius)
        ? cluster.radius!
        : compact
          ? COMPACT_CLUSTER_RADIUS
          : DEFAULT_CLUSTER_RADIUS
      : 0;

    const placed = React.useMemo<Placed[]>(() => {
      const sizeOf = markerSizer(markers, [lo, hi]);
      const alpha = (m: GeoMarker) => {
        const a = markerOpacity ? markerOpacity(m) : 1;
        return Number.isFinite(a) ? clamp(a, 0, 1) : 1;
      };
      const at = (m: GeoMarker) => (alpha(m) > 0 ? project(m.point) : null);
      const single = (m: GeoMarker, xy: readonly [number, number]): Placed => {
        const base = sizeOf(m);
        // Custom content keeps its layout size and is scaled down; plain dots are simply drawn smaller.
        const size = m.render ? base * k : Math.max(6, Math.round(base * k));
        return { key: `m:${m.id}`, x: xy[0], y: xy[1], size, baseSize: m.render ? base : size, scale: m.render ? k : 1, opacity: alpha(m), marker: m };
      };
      if (!radius) {
        return markers.flatMap((m) => {
          const xy = at(m);
          return xy ? [single(m, xy)] : [];
        });
      }
      const selected = markers.find((m) => m.id === selectedId);
      const groups = clusterPoints(
        markers.filter((m) => m !== selected),
        at,
        radius
      );
      const out = groups.map((g): Placed => {
        if (g.count === 1) return single(g.members[0]!, [g.x, g.y]);
        const size = Math.round((26 + Math.min(18, 4 * Math.log2(g.count))) * (compact ? 0.85 : 1));
        return { key: g.id, x: g.x, y: g.y, size, baseSize: size, scale: 1, opacity: Math.max(...g.members.map(alpha)), cluster: g };
      });
      const selectedXY = selected ? at(selected) : null;
      if (selected && selectedXY) out.push(single(selected, selectedXY));
      return out;
    }, [markers, project, radius, selectedId, lo, hi, k, compact, markerOpacity]);

    const activate = (m: GeoMarker) => {
      m.onSelect?.(m);
      setSelectedId(selectedId === m.id ? null : m.id);
    };

    const activeKey = activeId != null ? `m:${activeId}` : null;
    const shownKey = hoverKey ?? focusKey ?? activeKey;
    const shown = tooltip ? placed.find((p) => p.key === shownKey) : undefined;

    return (
      <div
        ref={ref}
        data-slot="geo-marker-layer"
        data-compact={compact || undefined}
        className={cn("pointer-events-none absolute inset-0", className)}
        onPointerLeave={() => setHoverKey(null)}
        {...props}
      >
        {placed.map((p) => {
          const box = Math.max(MIN_TARGET, p.size);
          const buttonProps = {
            type: "button" as const,
            className: cn("pointer-events-auto absolute inset-0 rounded-full", focusRing),
            onPointerEnter: () => setHoverKey(p.key),
            onPointerLeave: () => setHoverKey((k) => (k === p.key ? null : k)),
            onFocus: () => setFocusKey(p.key),
            onBlur: () => setFocusKey((k) => (k === p.key ? null : k)),
          };
          // The visual sits beside the button, not inside it, so avatar initials or badge text never compete
          // with the button's accessible name.
          const item = (visual: React.ReactNode, button: React.ReactNode) => (
            <div
              key={p.key}
              data-slot="geo-marker-item"
              className={cn(
                "absolute top-0 left-0 flex items-center justify-center",
                p.key === shownKey ? "z-20" : p.marker && p.marker.id === selectedId ? "z-10" : undefined
              )}
              style={{
                transform: `translate(${roundTo(p.x - box / 2, 1)}px, ${roundTo(p.y - box / 2, 1)}px)`,
                width: box,
                height: box,
                opacity: p.opacity < 1 ? roundTo(p.opacity, 2) : undefined,
              }}
            >
              {visual}
              {button}
            </div>
          );
          if (p.cluster) {
            const cl = p.cluster;
            const tones = new Set(cl.members.map(geoItemColor));
            const color = tones.size === 1 ? [...tones][0]! : COLOR_TOKENS.primary;
            return item(
              <span
                aria-hidden
                data-slot="geo-marker-visual"
                className="flex shrink-0 items-center justify-center rounded-full border-2 border-background text-xs font-semibold tabular-nums text-white shadow-md"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: color,
                  boxShadow: `0 0 0 4px color-mix(in oklab, ${color} 25%, transparent)`,
                }}
              >
                {cl.count > 99 ? "99+" : cl.count}
              </span>,
              <button
                {...buttonProps}
                aria-label={clusterLabel(cl.members)}
                data-slot="geo-marker-cluster"
                data-count={cl.count}
                onClick={() => onClusterSelect?.(cl.members, cl)}
              />
            );
          }
          const m = p.marker!;
          const selected = m.id === selectedId;
          const color = geoItemColor(m);
          const custom = typeof m.render === "function" ? m.render({ selected, size: p.baseSize }) : m.render;
          return item(
            <>
              {m.pulse ? (
                <span
                  aria-hidden
                  className="absolute rounded-full opacity-60 motion-safe:animate-ping motion-reduce:hidden"
                  style={{ width: p.size, height: p.size, backgroundColor: color }}
                />
              ) : null}
              <span
                aria-hidden
                data-slot="geo-marker-visual"
                className={cn(
                  "relative flex shrink-0 items-center justify-center rounded-full",
                  !custom && "border-2 border-background text-white shadow-sm",
                  selected
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : p.key === activeKey && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                )}
                style={{
                  width: p.baseSize,
                  height: p.baseSize,
                  backgroundColor: custom ? undefined : color,
                  transform: p.scale !== 1 ? `scale(${p.scale})` : undefined,
                }}
              >
                {custom ?? (m.icon ? <span className="flex items-center justify-center [&_svg]:size-[70%]">{m.icon}</span> : null)}
                {m.badge ? (
                  <span data-slot="geo-marker-badge" className="absolute -right-1 -bottom-1 flex items-center justify-center">
                    {m.badge}
                  </span>
                ) : null}
              </span>
            </>,
            <button
              {...buttonProps}
              aria-label={m.label}
              aria-pressed={selected}
              data-slot="geo-marker"
              data-id={m.id}
              data-selected={selected || undefined}
              onClick={() => activate(m)}
            />
          );
        })}
        {shown ? <GeoMarkerTooltip placed={shown} width={width} height={height} /> : null}
      </div>
    );
  }
);
GeoMarkerLayer.displayName = "GeoMarkerLayer";


function GeoMarkerTooltip({ placed, width, height }: { placed: Placed; width: number; height: number }) {
  const tipW = 200;
  const half = Math.max(MIN_TARGET, placed.size) / 2;
  const above = placed.y - half - 8 > 40 || placed.y + half + 48 > height;
  const left = clamp(placed.x - tipW / 2, 0, Math.max(0, width - tipW));
  const members = placed.cluster?.members;
  return (
    <div
      aria-hidden
      data-slot="geo-marker-tooltip"
      className="pointer-events-none absolute z-30 flex justify-center"
      style={{ left, width: tipW, ...(above ? { bottom: height - (placed.y - half - 6) } : { top: placed.y + half + 6 }) }}
    >
      <div className="max-w-full rounded-md bg-inverse px-2 py-1 text-xs text-inverse-foreground shadow-md">
        {members ? (
          <>
            <div className="font-medium">{`${members.length} markers`}</div>
            <div className="truncate opacity-80">
              {members.slice(0, 3).map((m) => m.label).join(", ")}
              {members.length > 3 ? ` +${members.length - 3}` : ""}
            </div>
          </>
        ) : (
          <>
            <div className="truncate font-medium">{placed.marker!.label}</div>
            {placed.marker!.description ? <div className="truncate opacity-80">{placed.marker!.description}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}
