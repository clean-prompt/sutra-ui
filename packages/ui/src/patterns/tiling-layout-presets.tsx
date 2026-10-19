/** LayoutThumbnail and LayoutPresetPicker: mini previews of layout trees and a preset chooser. */
import * as React from "react";
import { RiDeleteBinLine, RiSave3Line } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import {
  fillLayoutSlots,
  isSameLayoutShape,
  layoutPresets,
  listPanes,
  normalizeLayout,
  toZoneLayout,
  type LayoutNode,
  type LayoutPreset,
} from "./tiling-model";

/* ------------------------------------------------------------------ */
/* LayoutThumbnail & LayoutPresetPicker                                */
/* ------------------------------------------------------------------ */

export interface LayoutThumbnailProps extends React.SVGProps<SVGSVGElement> {
  layout: LayoutNode;
  /** Gap between tiles in viewBox units (viewBox is 100×64). Default 3. */
  gap?: number;
}

/** Mini SVG preview of a layout tree. */
export const LayoutThumbnail = React.forwardRef<SVGSVGElement, LayoutThumbnailProps>(
  ({ layout, gap = 3, className, ...props }, ref) => {
    const rects: { id: string; x: number; y: number; w: number; h: number }[] = [];
    const walk = (node: LayoutNode, x: number, y: number, w: number, h: number) => {
      if (node.type === "tabs") {
        rects.push({ id: node.id, x, y, w, h });
        return;
      }
      const row = node.direction === "row";
      const total = (row ? w : h) - gap * (node.children.length - 1);
      let offset = 0;
      node.children.forEach((child, i) => {
        const len = total * (node.sizes[i] ?? 1 / node.children.length);
        if (row) walk(child, x + offset, y, len, h);
        else walk(child, x, y + offset, w, len);
        offset += len + gap;
      });
    };
    walk(layout, 1, 1, 98, 62);
    return (
      <svg
        ref={ref}
        viewBox="0 0 100 64"
        aria-hidden
        data-slot="layout-thumbnail"
        className={cn("h-auto w-full", className)}
        {...props}
      >
        {rects.map((r) => (
          <rect
            key={r.id}
            x={r.x}
            y={r.y}
            width={Math.max(0, r.w)}
            height={Math.max(0, r.h)}
            rx={2}
            fill="currentColor"
            fillOpacity={0.14}
            stroke="currentColor"
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        ))}
      </svg>
    );
  }
);
LayoutThumbnail.displayName = "LayoutThumbnail";

export interface SavedLayoutPreset {
  id: string;
  name: string;
  layout: LayoutNode;
}

export interface LayoutPresetPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Built-in presets. Default `layoutPresets`. */
  presets?: LayoutPreset[];
  /** Current arrangement: highlights the matching preset and is what "Save" stores. */
  current?: LayoutNode;
  /** Panes to distribute into a chosen preset (default: panes of `current`). */
  panes?: string[];
  /** Called with the layout to apply. */
  onSelect: (layout: LayoutNode, presetId: string) => void;
  savedPresets?: SavedLayoutPreset[];
  defaultSavedPresets?: SavedLayoutPreset[];
  onSavedPresetsChange?: (presets: SavedLayoutPreset[]) => void;
  /** Show the save form. Default true. */
  allowSave?: boolean;
}

/** Thumbnail grid of layout presets plus saving and re-applying custom arrangements. */
export const LayoutPresetPicker = React.forwardRef<HTMLDivElement, LayoutPresetPickerProps>(
  (
    {
      presets = layoutPresets,
      current,
      panes: panesProp,
      onSelect,
      savedPresets,
      defaultSavedPresets = [],
      onSavedPresetsChange,
      allowSave = true,
      className,
      ...props
    },
    ref
  ) => {
    const [saved, setSaved] = useControllableState({
      value: savedPresets,
      defaultValue: defaultSavedPresets,
      onChange: onSavedPresetsChange,
    });
    const [name, setName] = React.useState("");
    const panes = panesProp ?? (current ? listPanes(current) : []);
    const previews = React.useMemo(() => presets.map((p) => ({ preset: p, layout: p.create() })), [presets]);
    const nameId = React.useId();

    const applySaved = (item: SavedLayoutPreset) => {
      const savedPanes = listPanes(item.layout);
      const sameSet = savedPanes.length === panes.length && savedPanes.every((p) => panes.includes(p));
      onSelect(sameSet ? normalizeLayout(item.layout) : fillLayoutSlots(toZoneLayout(item.layout), panes), item.id);
    };

    const tileClass = cn(
      "flex flex-col items-stretch gap-1.5 rounded-box border border-border bg-card p-2 text-start text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground",
      "aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-foreground",
      focusRing
    );

    return (
      <div ref={ref} data-slot="layout-preset-picker" className={cn("flex flex-col gap-4", className)} {...props}>
        <div role="group" aria-label="Layout presets" className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
          {previews.map(({ preset, layout }) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={current ? isSameLayoutShape(layout, current) : false}
              data-preset-id={preset.id}
              className={tileClass}
              onClick={() => onSelect(preset.create(panes), preset.id)}
            >
              <LayoutThumbnail layout={layout} />
              <span className="truncate">{preset.label}</span>
            </button>
          ))}
        </div>
        {allowSave && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = name.trim();
              if (!trimmed || !current) return;
              setSaved([
                ...saved,
                { id: `saved-${Date.now().toString(36)}-${saved.length}`, name: trimmed, layout: normalizeLayout(current) },
              ]);
              setName("");
            }}
          >
            <label htmlFor={nameId} className="sr-only">
              Preset name
            </label>
            <Input
              id={nameId}
              size="sm"
              placeholder="Name this arrangement"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-w-32 flex-1"
            />
            <Button type="submit" size="sm" variant="secondary" leadingIcon={<RiSave3Line aria-hidden />} disabled={!current || !name.trim()}>
              Save current arrangement
            </Button>
          </form>
        )}
        {saved.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Saved arrangements</p>
            <ul aria-label="Saved arrangements" className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
              {saved.map((item) => (
                <li key={item.id} className="relative">
                  <button
                    type="button"
                    aria-pressed={current ? isSameLayoutShape(item.layout, current) : false}
                    className={cn(tileClass, "w-full")}
                    onClick={() => applySaved(item)}
                  >
                    <LayoutThumbnail layout={item.layout} />
                    <span className="truncate pe-5">{item.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Delete ${item.name}`}
                    className="absolute end-1 bottom-1"
                    onClick={() => setSaved(saved.filter((s) => s.id !== item.id))}
                  >
                    <RiDeleteBinLine aria-hidden className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);
LayoutPresetPicker.displayName = "LayoutPresetPicker";
