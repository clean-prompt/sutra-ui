import * as React from "react";
import { RiAddLine, RiFullscreenExitLine, RiSubtractLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useZoomPan, type UseZoomPanOptions } from "../hooks/use-zoom-pan";

export * from "../hooks/use-zoom-pan";

/* ------------------------------------------------------------------ */
/* ZoomPan                                                             */
/* ------------------------------------------------------------------ */

export interface ZoomPanProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">, UseZoomPanOptions {
  /** Accessible name of the zoomable region. Default "Zoomable content". */
  label?: string;
  /** Show the zoom controls overlay. Default true. */
  controls?: boolean;
  controlsPosition?: "top-right" | "bottom-right" | "bottom-left" | "top-left";
  contentClassName?: string;
}

const controlsPos = {
  "top-right": "right-2 top-2",
  "bottom-right": "bottom-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "top-left": "left-2 top-2",
};

/** Zoom & pan viewport for images, diagrams or SVG, with a controls overlay. */
export const ZoomPan = React.forwardRef<HTMLDivElement, ZoomPanProps>(
  (
    {
      label = "Zoomable content",
      controls = true,
      controlsPosition = "bottom-right",
      minScale,
      maxScale,
      defaultScale,
      step,
      wheelRequiresModifier,
      panStep,
      onValueChange,
      onChange,
      className,
      contentClassName,
      children,
      ...props
    },
    forwardedRef
  ) => {
    const zp = useZoomPan({ minScale, maxScale, defaultScale, step, wheelRequiresModifier, panStep, onValueChange, onChange });
    const setRefs = useMergedRefs(zp.ref, forwardedRef);
    const percent = Math.round(zp.scale * 100);
    const ctrl = cn(
      "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
      focusRing
    );
    return (
      <div className={cn("relative overflow-hidden rounded-box border border-border bg-subtle", className)}>
        <div
          ref={setRefs}
          role="group"
          aria-roledescription="zoomable area"
          aria-label={`${label}, ${percent}%`}
          tabIndex={0}
          data-scale={zp.scale}
          data-dragging={zp.dragging ? "" : undefined}
          className={cn(
            "size-full touch-none select-none outline-none",
            zp.dragging ? "cursor-grabbing" : "cursor-grab",
            "focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/35"
          )}
          {...zp.handlers}
          {...props}
        >
          <div
            data-slot="zoom-pan-content"
            className={cn("flex size-full items-center justify-center will-change-transform", !zp.dragging && "transition-transform duration-150 ease-out motion-reduce:transition-none", contentClassName)}
            style={zp.contentStyle}
          >
            {children}
          </div>
        </div>
        {controls && (
          <div
            role="toolbar"
            aria-label="Zoom controls"
            data-zoom-pan-ignore=""
            className={cn("absolute flex items-center gap-0.5 rounded-control border border-border bg-popover/90 p-0.5 shadow-sm backdrop-blur", controlsPos[controlsPosition])}
          >
            <button type="button" aria-label="Zoom out" title="Zoom out (−)" disabled={zp.scale <= zp.minScale} onClick={zp.zoomOut} className={ctrl}>
              <RiSubtractLine aria-hidden />
            </button>
            <span aria-live="polite" className="min-w-10 text-center text-xs font-medium tabular-nums text-foreground">
              {percent}%
            </span>
            <button type="button" aria-label="Zoom in" title="Zoom in (+)" disabled={zp.scale >= zp.maxScale} onClick={zp.zoomIn} className={ctrl}>
              <RiAddLine aria-hidden />
            </button>
            <button type="button" aria-label="Reset zoom" title="Reset (0)" onClick={zp.reset} className={ctrl}>
              <RiFullscreenExitLine aria-hidden />
            </button>
          </div>
        )}
      </div>
    );
  }
);
ZoomPan.displayName = "ZoomPan";
