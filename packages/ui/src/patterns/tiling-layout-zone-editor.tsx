/** ZoneEditor: FancyZones-style editor for building a layout of zones. */
import * as React from "react";
import { RiDeleteBinLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";
import { Button } from "../primitives/button";
import {
  equalizeSplit,
  fillLayoutSlots,
  layoutPresets,
  listGroups,
  normalizeLayout,
  removeGroup,
  resizeSplit,
  splitGroup,
  toZoneLayout,
  type LayoutNode,
} from "./tiling-model";
import { TilingHandle, safeId } from "./tiling-layout-internal";

/* ------------------------------------------------------------------ */
/* ZoneEditor                                                          */
/* ------------------------------------------------------------------ */

export interface ZoneEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Starting arrangement (panes are ignored). Default: two columns. */
  defaultLayout?: LayoutNode;
  /** When given, the applied layout has these panes filled into the zones in order. */
  panes?: string[];
  /** Called with the layout the user drew when "Apply" is clicked. */
  onApply: (layout: LayoutNode) => void;
  /** Called when the user cancels the editor. */
  onCancel?: () => void;
  /** Called on every edit with the zone tree. */
  onValueChange?: (zones: LayoutNode) => void;
  /** Called on every edit with the zone tree. @deprecated Use `onValueChange`. */
  onChange?: (zones: LayoutNode) => void;
  /** Minimum zone fraction per split. Default 0.1. */
  minSize?: number;
}

/** FancyZones-style editor: click to split zones (Shift for horizontal), drag dividers, delete zones. */
export const ZoneEditor = React.forwardRef<HTMLDivElement, ZoneEditorProps>(
  ({ defaultLayout, panes, onApply, onCancel, onValueChange, onChange, minSize = 0.1, className, ...props }, ref) => {
    const initial = React.useMemo(
      () => normalizeLayout(toZoneLayout(defaultLayout ?? layoutPresets[1].create())),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );
    const [zones, setZonesState] = React.useState(initial);
    const zonesRef = React.useRef(zones);
    zonesRef.current = zones;
    const uid = useSafeId("zone");
    const setZones = (fn: (z: LayoutNode) => LayoutNode) => {
      const next = fn(zonesRef.current);
      if (next === zonesRef.current) return;
      zonesRef.current = next;
      setZonesState(next);
      (onValueChange ?? onChange)?.(next);
    };
    const zoneList = listGroups(zones);
    const numberOf = (id: string) => zoneList.findIndex((z) => z.id === id) + 1;

    const renderNode = (node: LayoutNode, area: number): React.ReactNode => {
      if (node.type === "tabs") {
        const n = numberOf(node.id);
        const pct = Math.round(area * 100);
        const split = (shift: boolean) => setZones((z) => splitGroup(z, node.id, shift ? "column" : "row"));
        return (
          <div data-slot="zone" data-zone-id={node.id} className="group/zone relative flex min-h-0 min-w-0 flex-1 p-1">
            <button
              type="button"
              aria-label={`Zone ${n}, ${pct}%. Click to split vertically, Shift+click to split horizontally`}
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-box border-2 border-dashed border-primary/40 bg-primary-soft/50 text-primary-soft-foreground transition-colors hover:border-primary hover:bg-primary-soft",
                focusRing
              )}
              onClick={(event) => split(event.shiftKey)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  split(event.shiftKey);
                }
              }}
            >
              <span className="text-lg font-semibold tabular-nums">{n}</span>
              <span className="text-2xs tabular-nums opacity-80">{pct}%</span>
            </button>
            {zoneList.length > 1 && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete zone ${n}`}
                className="absolute top-2 end-2 opacity-70 hover:opacity-100"
                onClick={() => setZones((z) => removeGroup(z, node.id))}
              >
                <RiDeleteBinLine aria-hidden className="size-3.5" />
              </Button>
            )}
          </div>
        );
      }
      const row = node.direction === "row";
      return (
        <div
          data-slot="zone-split"
          data-direction={node.direction}
          className={cn("flex min-h-0 min-w-0 flex-1", row ? "flex-row" : "flex-col")}
        >
          {node.children.map((child, i) => (
            <React.Fragment key={child.id}>
              {i > 0 && (
                <TilingHandle
                  direction={node.direction}
                  sizes={node.sizes}
                  index={i - 1}
                  min={minSize}
                  step={0.02}
                  controls={`${uid}-${safeId(node.children[i - 1].id)}`}
                  label={row ? "Resize zones horizontally" : "Resize zones vertically"}
                  onResize={(index, delta) => setZones((z) => resizeSplit(z, node.id, index, delta, minSize))}
                  onEqualize={() => setZones((z) => equalizeSplit(z, node.id))}
                />
              )}
              <div
                id={`${uid}-${safeId(child.id)}`}
                className="flex min-h-0 min-w-0"
                style={{ flex: `${node.sizes[i] ?? 1} 1 0%` }}
              >
                {renderNode(child, area * (node.sizes[i] ?? 0))}
              </div>
            </React.Fragment>
          ))}
        </div>
      );
    };

    return (
      <div ref={ref} data-slot="zone-editor" className={cn("flex flex-col gap-3", className)} {...props}>
        <p className="text-xs text-muted-foreground">
          Click a zone to split it vertically, hold <kbd className="font-mono">Shift</kbd> to split horizontally. Drag
          dividers to resize; double-click a divider to equalize.
        </p>
        <div
          data-slot="zone-canvas"
          className="flex aspect-video min-h-48 w-full overflow-hidden rounded-box border border-border bg-subtle p-1"
        >
          {renderNode(zones, 1)}
        </div>
        <div className="flex items-center gap-2">
          <span className="me-auto text-xs text-muted-foreground" aria-live="polite">
            {zoneList.length} {zoneList.length === 1 ? "zone" : "zones"}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setZones(() => initial)}>
            Reset
          </Button>
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={() => onApply(panes ? fillLayoutSlots(zones, panes) : normalizeLayout(zones))}>
            Apply
          </Button>
        </div>
      </div>
    );
  }
);
ZoneEditor.displayName = "ZoneEditor";
