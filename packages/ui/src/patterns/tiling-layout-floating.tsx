/** FloatingPanes: draggable, resizable floating windows over the tiling layout. */
import * as React from "react";
import {
  RiCloseLine,
  RiDraggable,
  RiPictureInPictureExitLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { useDrag } from "../hooks/use-drag";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useElementSize } from "../hooks/use-resize-observer";
import { Button } from "../primitives/button";
import { textOf } from "./tiling-layout-internal";

/* ------------------------------------------------------------------ */
/* FloatingPanes                                                       */
/* ------------------------------------------------------------------ */

export interface FloatingPaneState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingPanesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Windows; the last one is in front. */
  panes: FloatingPaneState[];
  /** Called with the full window list after a window moves, resizes, closes or is brought to the front. */
  onPanesChange: (panes: FloatingPaneState[]) => void;
  /** Renders the content of a window from its pane id. */
  renderPane: (paneId: string) => React.ReactNode;
  /** Window title from the pane id; defaults to a string title or the id. */
  paneTitle?: (paneId: string) => React.ReactNode;
  /** Icon shown before the window title. */
  paneIcon?: (paneId: string) => React.ReactNode;
  /** Plain-text name for labels (defaults to a string title or the id). */
  paneLabel?: (paneId: string) => string;
  /** Show a "dock" button that hands the pane back to the layout. */
  onDock?: (paneId: string) => void;
  /** Called with the pane id when the window's close button is clicked. */
  onClose?: (paneId: string) => void;
  /**
   * Smallest window width in px.
   * @default 180
   */
  minWidth?: number;
  /**
   * Smallest window height in px.
   * @default 120
   */
  minHeight?: number;
}

/** Layer of draggable, resizable floating windows kept inside their container. */
export const FloatingPanes = React.forwardRef<HTMLDivElement, FloatingPanesProps>(
  (
    {
      panes,
      onPanesChange,
      renderPane,
      paneTitle,
      paneIcon,
      paneLabel,
      onDock,
      onClose,
      minWidth = 180,
      minHeight = 120,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const layerRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(layerRef, forwardedRef);
    const panesRef = useLatestRef(panes);
    // Windows opened (or kept in state) for a wider stage must not hang out of a narrower one: the rect is fitted at render time.
    const layerSize = useElementSize(layerRef);
    const fit = (rect: FloatingPaneState): FloatingPaneState => {
      const { width: bw, height: bh } = layerSize;
      if (!bw || !bh) return rect;
      const w = Math.min(Math.max(minWidth, rect.width), bw);
      const h = Math.min(Math.max(minHeight, rect.height), bh);
      return { ...rect, width: w, height: h, x: clamp(rect.x, 0, Math.max(0, bw - w)), y: clamp(rect.y, 0, Math.max(0, bh - h)) };
    };
    const clampRect = (rect: FloatingPaneState): FloatingPaneState => {
      const width = Math.max(minWidth, rect.width);
      const height = Math.max(minHeight, rect.height);
      const bounds = layerRef.current?.getBoundingClientRect();
      if (!bounds || !bounds.width || !bounds.height) return { ...rect, width, height };
      const w = Math.min(width, bounds.width);
      const h = Math.min(height, bounds.height);
      return {
        ...rect,
        width: w,
        height: h,
        x: clamp(rect.x, 0, Math.max(0, bounds.width - w)),
        y: clamp(rect.y, 0, Math.max(0, bounds.height - h)),
      };
    };

    const patch = (id: string, next: (p: FloatingPaneState) => FloatingPaneState) =>
      onPanesChange(panesRef.current.map((p) => (p.id === id ? clampRect(next(fit(p))) : p)));

    const bringToFront = (id: string) => {
      const list = panesRef.current;
      if (list[list.length - 1]?.id === id) return;
      const pane = list.find((p) => p.id === id);
      if (pane) onPanesChange([...list.filter((p) => p.id !== id), pane]);
    };
    const bringToFrontRef = useLatestRef(bringToFront);

    // Native capture listeners: window content may be portalled in (e.g. TilingLayout keep-alive hosts),
    // and React events from a portal don't propagate through the window wrapper.
    React.useEffect(() => {
      const layer = layerRef.current;
      if (!layer) return;
      const onActivate = (event: Event) => {
        let el = event.target instanceof Element ? event.target : null;
        while (el && el.parentElement !== layer) el = el.parentElement;
        const id = el?.getAttribute("data-slot") === "floating-pane" ? el.getAttribute("data-pane-id") : null;
        if (id != null) bringToFrontRef.current(id);
      };
      layer.addEventListener("pointerdown", onActivate, true);
      layer.addEventListener("focusin", onActivate, true);
      return () => {
        layer.removeEventListener("pointerdown", onActivate, true);
        layer.removeEventListener("focusin", onActivate, true);
      };
    }, []);

    /** The window's rect at the press (fitted to the stage), or null when it is gone. */
    const startOf = (id: string) => {
      const found = panesRef.current.find((p) => p.id === id);
      return found ? fit(found) : null;
    };
    const apply = (id: string, mode: "move" | "resize", start: FloatingPaneState, dx: number, dy: number) =>
      patch(id, (p) => (mode === "move" ? { ...p, x: start.x + dx, y: start.y + dy } : { ...p, width: start.width + dx, height: start.height + dy }));
    const keyNudge = (id: string, mode: "move" | "resize") => (event: React.KeyboardEvent<HTMLElement>) => {
      const step = event.shiftKey ? 50 : 10;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!d) return;
      event.preventDefault();
      patch(id, (p) =>
        mode === "move" ? { ...p, x: p.x + d[0], y: p.y + d[1] } : { ...p, width: p.width + d[0], height: p.height + d[1] }
      );
    };

    // Stable DOM order (z-order via z-index) so bringing a window forward never moves its DOM node.
    const ordered = [...panes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    return (
      <div
        ref={setRefs}
        data-slot="floating-panes"
        className={cn("pointer-events-none absolute inset-0 z-40 overflow-hidden", className)}
        {...props}
      >
        {ordered.map((pane) => {
          const z = panes.indexOf(pane);
          const rect = fit(pane);
          const front = z === panes.length - 1;
          const title = paneTitle?.(pane.id) ?? pane.id;
          const label = paneLabel?.(pane.id) ?? textOf(title, pane.id);
          return (
            <div
              key={pane.id}
              role="dialog"
              aria-label={label}
              data-slot="floating-pane"
              data-pane-id={pane.id}
              data-front={front || undefined}
              className={cn(
                "pointer-events-auto absolute flex flex-col overflow-hidden rounded-box border bg-card shadow-2xl",
                front ? "border-border-strong" : "border-border"
              )}
              style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: z + 1 }}
            >
              <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border bg-subtle pe-1">
                <FloatingGrip
                  id={pane.id}
                  mode="move"
                  startOf={startOf}
                  apply={apply}
                  role="button"
                  tabIndex={0}
                  aria-label={`Move ${label}`}
                  aria-roledescription="draggable window"
                  data-slot="floating-pane-handle"
                  className={cn(
                    "flex min-w-0 flex-1 cursor-grab touch-none select-none items-center gap-1.5 self-stretch ps-2 text-xs font-medium text-foreground active:cursor-grabbing",
                    focusRing
                  )}
                  onKeyDown={keyNudge(pane.id, "move")}
                >
                  <RiDraggable aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                  {paneIcon?.(pane.id)}
                  <span className="truncate">{title}</span>
                </FloatingGrip>
                {onDock && (
                  <Button variant="ghost" size="icon-xs" aria-label={`Dock ${label}`} onClick={() => onDock(pane.id)}>
                    <RiPictureInPictureExitLine aria-hidden className="size-3.5" />
                  </Button>
                )}
                {onClose && (
                  <Button variant="ghost" size="icon-xs" aria-label={`Close ${label}`} onClick={() => onClose(pane.id)}>
                    <RiCloseLine aria-hidden className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="relative min-h-0 flex-1 overflow-auto">{renderPane(pane.id)}</div>
              <FloatingGrip
                id={pane.id}
                mode="resize"
                startOf={startOf}
                apply={apply}
                role="button"
                tabIndex={0}
                aria-label={`Resize ${label}`}
                data-slot="floating-pane-resize"
                className={cn(
                  "absolute end-0 bottom-0 size-4 cursor-nwse-resize touch-none rounded-ss-xs",
                  "bg-[linear-gradient(135deg,transparent_55%,var(--color-border-strong)_55%,var(--color-border-strong)_65%,transparent_65%,transparent_75%,var(--color-border-strong)_75%,var(--color-border-strong)_85%,transparent_85%)]",
                  focusRing
                )}
                onKeyDown={keyNudge(pane.id, "resize")}
              />
            </div>
          );
        })}
      </div>
    );
  }
);
FloatingPanes.displayName = "FloatingPanes";

interface FloatingGripProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "id"> {
  id: string;
  mode: "move" | "resize";
  startOf: (id: string) => FloatingPaneState | null;
  apply: (id: string, mode: "move" | "resize", start: FloatingPaneState, dx: number, dy: number) => void;
}

/** A title bar or resize grip: a relative drag on `useDrag` (captured on the press: nothing clickable inside) that reports the travel since the press. */
function FloatingGrip({ id, mode, startOf, apply, children, ...props }: FloatingGripProps) {
  const startRef = React.useRef<FloatingPaneState | null>(null);
  const drag = useDrag({
    threshold: 0,
    captureOnPress: true,
    allow: () => startOf(id) !== null,
    onDown: () => (startRef.current = startOf(id)),
    onMove: (info) => {
      const start = startRef.current;
      if (start) apply(id, mode, start, info.dx, info.dy);
    },
    onEnd: () => (startRef.current = null),
  });
  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture } = drag.handlers;
  return (
    <div
      ref={drag.ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      {...props}
    >
      {children}
    </div>
  );
}
