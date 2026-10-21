/* MemoryGlyphIcon and MemoryMapLegend: kind swatches and the legend that doubles as a kind filter. */
import * as React from "react";
import { cn, focusRing } from "../../lib/cn";
import type { MemoryGlyph, MemoryLegendItem } from "./memory-map-model";
import { glyphPath, SvgPath } from "./memory-map-internal";

export interface MemoryGlyphIconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Shape of the marker (for example circle, square, diamond); matches the node glyph on the map. */
  glyph: MemoryGlyph;
  /** Fill colour of the marker, any CSS colour. */
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
      <svg ref={ref} viewBox="0 0 12 12" width={size} height={size} aria-hidden className={cn("shrink-0", className)} data-slot="memory-glyph-icon" {...props}>
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
  /** Legend entries, each with a kind, label, glyph and colour. */
  items: MemoryLegendItem[];
  /** Kinds currently hidden on the map; their entries are shown dimmed. */
  hiddenKinds?: string[];
  /** Makes entries toggle buttons that filter by kind. */
  onToggleKind?: (kind: string) => void;
}

/** Kind → color/glyph legend; doubles as a kind filter when `onToggleKind` is set. */
export const MemoryMapLegend = React.forwardRef<HTMLDivElement, MemoryMapLegendProps>(
  ({ items, hiddenKinds = [], onToggleKind, className, ...props }, ref) => (
    <div ref={ref} role="group" aria-label="Legend: filter by kind" className={cn("flex flex-wrap items-center gap-1", className)} data-slot="memory-map-legend" {...props}>
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
