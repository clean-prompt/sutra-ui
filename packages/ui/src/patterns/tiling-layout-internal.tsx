/** Private pieces shared by the tiling modules: id helpers, the resize handle, keep-alive pane hosts and the layout context. */
import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import type { LayoutNode, LayoutTabsNode, TilingDirection, TilingDropEdge } from "./tiling-model";


/** Pane ids are user strings; make them safe inside generated element ids. */
export const safeId = (value: string) => value.replace(/[^\w-]/g, "_");

export function textOf(node: React.ReactNode, fallback: string): string {
  return typeof node === "string" || typeof node === "number" ? String(node) : fallback;
}

/* ------------------------------------------------------------------ */
/* Resize handle (shared by TilingLayout and ZoneEditor)               */
/* ------------------------------------------------------------------ */

interface TilingHandleProps {
  direction: TilingDirection;
  sizes: number[];
  /** Divider sits after child `index`. */
  index: number;
  min: number;
  step: number;
  controls?: string;
  label: string;
  onResize: (index: number, delta: number) => void;
  onEqualize: () => void;
}

export function TilingHandle({ direction, sizes, index, min, step, controls, label, onResize, onEqualize }: TilingHandleProps) {
  const row = direction === "row";
  const sizesRef = useLatestRef(sizes);
  const dragRef = React.useRef<{ pointerId: number; pos: number; start: number; total: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const a = sizes[index] ?? 0;
  const pair = a + (sizes[index + 1] ?? 0);
  const lo = Math.min(min, pair / 2);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = step * (event.shiftKey ? 5 : 1);
    const dec = row ? "ArrowLeft" : "ArrowUp";
    const inc = row ? "ArrowRight" : "ArrowDown";
    if (event.key === dec) onResize(index, -delta);
    else if (event.key === inc) onResize(index, delta);
    else if (event.key === "Home") onResize(index, -pair);
    else if (event.key === "End") onResize(index, pair);
    else if (event.key === "Enter") onEqualize();
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={row ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(a * 100)}
      aria-valuemin={Math.round(lo * 100)}
      aria-valuemax={Math.round((pair - lo) * 100)}
      aria-controls={controls}
      aria-label={label}
      data-slot="tiling-handle"
      data-dragging={dragging || undefined}
      className={cn(
        "relative z-10 shrink-0 touch-none bg-border transition-colors hover:bg-primary/60 data-[dragging]:bg-primary",
        row ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
        "before:absolute before:content-['']",
        row ? "before:inset-y-0 before:-start-1.5 before:-end-1.5" : "before:inset-x-0 before:-top-1.5 before:-bottom-1.5",
        focusRing,
        "focus-visible:bg-ring"
      )}
      onKeyDown={handleKeyDown}
      onDoubleClick={onEqualize}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        const rect = event.currentTarget.parentElement?.getBoundingClientRect();
        dragRef.current = {
          pointerId: event.pointerId,
          pos: row ? event.clientX : event.clientY,
          start: sizesRef.current[index] ?? 0,
          total: rect ? (row ? rect.width : rect.height) : 0,
        };
        setDragging(true);
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          /* best effort */
        }
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        const d = dragRef.current;
        if (!d || d.pointerId !== event.pointerId || !d.total) return;
        const target = d.start + ((row ? event.clientX : event.clientY) - d.pos) / d.total;
        onResize(index, target - (sizesRef.current[index] ?? 0));
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null;
          setDragging(false);
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Keep-alive pane hosts                                               */
/* ------------------------------------------------------------------ */

export const PaneHostContext = React.createContext<((paneId: string) => HTMLElement | null) | null>(null);

/** Placeholder that adopts the persistent DOM host of a pane, so moving it never remounts content. */
export function PaneSlot({ paneId }: { paneId: string }) {
  const getHost = React.useContext(PaneHostContext);
  const ref = React.useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const host = getHost?.(paneId);
    if (!el || !host) return;
    el.appendChild(host);
    return () => {
      if (host.parentNode === el) el.removeChild(host);
    };
  }, [getHost, paneId]);
  return <div ref={ref} data-slot="tiling-pane-slot" className="h-full w-full" />;
}

/* ------------------------------------------------------------------ */
/* TilingLayout context                                                */
/* ------------------------------------------------------------------ */

export interface DropTarget {
  groupId: string;
  edge: TilingDropEdge;
}

export interface TilingContextValue {
  uid: string;
  layout: LayoutNode;
  groups: LayoutTabsNode[];
  focusedGroup: string | null;
  maximized: string | null;
  drag: { paneId: string; x: number; y: number } | null;
  dropTarget: DropTarget | null;
  minSize: number;
  step: number;
  floatingEnabled: boolean;
  title: (paneId: string) => React.ReactNode;
  icon: (paneId: string) => React.ReactNode;
  label: (paneId: string) => string;
  closable: (paneId: string) => boolean;
  renderEmptyGroup?: (groupId: string) => React.ReactNode;
  tabId: (paneId: string) => string;
  panelId: (paneId: string) => string;
  cellId: (nodeId: string) => string;
  update: (fn: (layout: LayoutNode) => LayoutNode) => void;
  focusGroup: (groupId: string) => void;
  activate: (paneId: string) => void;
  close: (paneId: string) => void;
  closeOthers: (paneId: string) => void;
  split: (paneId: string, direction: TilingDirection) => void;
  splitEmpty: (groupId: string, direction: TilingDirection) => void;
  moveToNewGroup: (paneId: string) => void;
  popOut: (paneId: string) => void;
  toggleMaximize: (groupId: string) => void;
  startTabDrag: (event: React.PointerEvent, paneId: string) => void;
}

export const TilingContext = React.createContext<TilingContextValue | null>(null);

export function useTiling() {
  const ctx = React.useContext(TilingContext);
  if (!ctx) throw new Error("Tiling parts must be rendered inside <TilingLayout>.");
  return ctx;
}
