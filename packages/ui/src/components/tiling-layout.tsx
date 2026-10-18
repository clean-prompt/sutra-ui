import * as React from "react";
import { createPortal } from "react-dom";
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiDraggable,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiLayoutColumnLine,
  RiLayoutMasonryLine,
  RiLayoutRowLine,
  RiPictureInPicture2Line,
  RiPictureInPictureExitLine,
  RiSave3Line,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import { Input } from "./input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu";
import { useShortcuts, type ShortcutDefinition } from "./shortcuts";
import {
  addPane,
  closePane,
  createTabsNode,
  equalizeSplit,
  fillLayoutSlots,
  findPane,
  isSameLayoutShape,
  layoutPresets,
  listGroups,
  listPanes,
  movePane,
  normalizeLayout,
  removeGroup,
  resizeSplit,
  setActiveTab,
  splitGroup,
  splitPane,
  toZoneLayout,
  type LayoutNode,
  type LayoutPreset,
  type LayoutTabsNode,
  type TilingDirection,
  type TilingDropEdge,
} from "./tiling-model";

export * from "./tiling-model";

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

const safeId = (value: string) => value.replace(/[^\w-]/g, "_");

function textOf(node: React.ReactNode, fallback: string): string {
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

function TilingHandle({ direction, sizes, index, min, step, controls, label, onResize, onEqualize }: TilingHandleProps) {
  const row = direction === "row";
  const sizesRef = React.useRef(sizes);
  sizesRef.current = sizes;
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
        row ? "before:inset-y-0 before:-left-1.5 before:-right-1.5" : "before:inset-x-0 before:-top-1.5 before:-bottom-1.5",
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

const PaneHostContext = React.createContext<((paneId: string) => HTMLElement | null) | null>(null);

/** Placeholder that adopts the persistent DOM host of a pane, so moving it never remounts content. */
function PaneSlot({ paneId }: { paneId: string }) {
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
  onPanesChange: (panes: FloatingPaneState[]) => void;
  renderPane: (paneId: string) => React.ReactNode;
  paneTitle?: (paneId: string) => React.ReactNode;
  paneIcon?: (paneId: string) => React.ReactNode;
  /** Plain-text name for labels (defaults to a string title or the id). */
  paneLabel?: (paneId: string) => string;
  /** Show a "dock" button that hands the pane back to the layout. */
  onDock?: (paneId: string) => void;
  onClose?: (paneId: string) => void;
  minWidth?: number;
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
    const setRefs = (node: HTMLDivElement | null) => {
      layerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };
    const panesRef = React.useRef(panes);
    panesRef.current = panes;
    const dragRef = React.useRef<{
      id: string;
      pointerId: number;
      x: number;
      y: number;
      start: FloatingPaneState;
      mode: "move" | "resize";
    } | null>(null);

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
        x: Math.min(Math.max(0, rect.x), Math.max(0, bounds.width - w)),
        y: Math.min(Math.max(0, rect.y), Math.max(0, bounds.height - h)),
      };
    };

    const patch = (id: string, next: (p: FloatingPaneState) => FloatingPaneState) =>
      onPanesChange(panesRef.current.map((p) => (p.id === id ? clampRect(next(p)) : p)));

    const bringToFront = (id: string) => {
      const list = panesRef.current;
      if (list[list.length - 1]?.id === id) return;
      const pane = list.find((p) => p.id === id);
      if (pane) onPanesChange([...list.filter((p) => p.id !== id), pane]);
    };
    const bringToFrontRef = React.useRef(bringToFront);
    bringToFrontRef.current = bringToFront;

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

    const begin = (id: string, mode: "move" | "resize") => (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const start = panesRef.current.find((p) => p.id === id);
      if (!start) return;
      dragRef.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, start, mode };
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* best effort */
      }
    };
    const move = (event: React.PointerEvent<HTMLElement>) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== event.pointerId) return;
      const dx = event.clientX - d.x;
      const dy = event.clientY - d.y;
      patch(d.id, (p) =>
        d.mode === "move"
          ? { ...p, x: d.start.x + dx, y: d.start.y + dy }
          : { ...p, width: d.start.width + dx, height: d.start.height + dy }
      );
    };
    const end = (event: React.PointerEvent<HTMLElement>) => {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    };
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
              style={{ left: pane.x, top: pane.y, width: pane.width, height: pane.height, zIndex: z + 1 }}
            >
              <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border bg-subtle pr-1">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Move ${label}`}
                  aria-roledescription="draggable window"
                  data-slot="floating-pane-handle"
                  className={cn(
                    "flex min-w-0 flex-1 cursor-grab touch-none select-none items-center gap-1.5 self-stretch pl-2 text-xs font-medium text-foreground active:cursor-grabbing",
                    focusRing
                  )}
                  onPointerDown={begin(pane.id, "move")}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  onKeyDown={keyNudge(pane.id, "move")}
                >
                  <RiDraggable aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                  {paneIcon?.(pane.id)}
                  <span className="truncate">{title}</span>
                </div>
                {onDock && (
                  <Button variant="ghost" size="icon-xs" aria-label={`Dock ${label}`} onClick={() => onDock(pane.id)}>
                    <RiPictureInPictureExitLine className="size-3.5" />
                  </Button>
                )}
                {onClose && (
                  <Button variant="ghost" size="icon-xs" aria-label={`Close ${label}`} onClick={() => onClose(pane.id)}>
                    <RiCloseLine className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="relative min-h-0 flex-1 overflow-auto">{renderPane(pane.id)}</div>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Resize ${label}`}
                data-slot="floating-pane-resize"
                className={cn(
                  "absolute right-0 bottom-0 size-4 cursor-nwse-resize touch-none rounded-tl-xs",
                  "bg-[linear-gradient(135deg,transparent_55%,var(--color-border-strong)_55%,var(--color-border-strong)_65%,transparent_65%,transparent_75%,var(--color-border-strong)_75%,var(--color-border-strong)_85%,transparent_85%)]",
                  focusRing
                )}
                onPointerDown={begin(pane.id, "resize")}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
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

/* ------------------------------------------------------------------ */
/* TilingLayout                                                        */
/* ------------------------------------------------------------------ */

interface DropTarget {
  groupId: string;
  edge: TilingDropEdge;
}

interface TilingContextValue {
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

const TilingContext = React.createContext<TilingContextValue | null>(null);

function useTiling() {
  const ctx = React.useContext(TilingContext);
  if (!ctx) throw new Error("Tiling parts must be rendered inside <TilingLayout>.");
  return ctx;
}

export interface TilingLayoutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange"> {
  layout?: LayoutNode;
  defaultLayout?: LayoutNode;
  onLayoutChange?: (layout: LayoutNode) => void;
  renderPane: (paneId: string) => React.ReactNode;
  /** Tab title (default: the pane id). */
  paneTitle?: (paneId: string) => React.ReactNode;
  paneIcon?: (paneId: string) => React.ReactNode;
  /** Plain-text name used in aria labels when `paneTitle` returns a node. */
  paneLabel?: (paneId: string) => string;
  /** Whether a pane shows a close button. Default: all closable. */
  paneClosable?: (paneId: string) => boolean;
  /** Called after a pane was closed from the UI. */
  onPaneClose?: (paneId: string) => void;
  /**
   * Supply a new pane id for "Split right/down". Without it, splitting moves the tab into a
   * new group (or creates an empty group when it is the only tab).
   */
  createPane?: (fromPaneId: string, direction: TilingDirection) => string | null | undefined;
  /** Content for empty groups (default: a drop hint). */
  renderEmptyGroup?: (groupId: string) => React.ReactNode;
  /** Keep inactive tabs mounted (hidden) so their state survives. Default true. */
  keepAlive?: boolean;
  /** Floating windows rendered over the layout; enables "Pop out" and "Dock". */
  floating?: FloatingPaneState[];
  onFloatingChange?: (panes: FloatingPaneState[]) => void;
  /** Maximized group id (controlled). */
  maximizedGroup?: string | null;
  onMaximizedGroupChange?: (groupId: string | null) => void;
  /** Register keyboard shortcuts (mod+\, mod+shift+\, mod+w, ctrl+tab, mod+1…9). */
  shortcuts?: boolean;
  /** Minimum fraction per split child. Default 0.08. */
  minSize?: number;
  /** Keyboard resize step (fraction). Default 0.02. */
  step?: number;
  /** Accessible name of the workspace. Default "Workspace". */
  label?: string;
}

/** IDE-style tiling workspace: nested resizable splits of tab groups with drag-and-drop, zoom and keep-alive panes. */
export const TilingLayout = React.forwardRef<HTMLDivElement, TilingLayoutProps>(
  (
    {
      layout: layoutProp,
      defaultLayout,
      onLayoutChange,
      renderPane,
      paneTitle,
      paneIcon,
      paneLabel,
      paneClosable,
      onPaneClose,
      createPane,
      renderEmptyGroup,
      keepAlive = true,
      floating,
      onFloatingChange,
      maximizedGroup,
      onMaximizedGroupChange,
      shortcuts = false,
      minSize = 0.08,
      step = 0.02,
      label = "Workspace",
      className,
      ...props
    },
    forwardedRef
  ) => {
    const uid = safeId(React.useId());
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    const [layout, setLayout] = useControllableState<LayoutNode>({
      value: layoutProp,
      defaultValue: defaultLayout ?? createTabsNode(),
      onChange: onLayoutChange,
    });
    const [maximizedRaw, setMaximized] = useControllableState<string | null>({
      value: maximizedGroup,
      defaultValue: null,
      onChange: onMaximizedGroupChange,
    });
    const layoutRef = React.useRef(layout);
    layoutRef.current = layout;
    const setLayoutRef = React.useRef(setLayout);
    setLayoutRef.current = setLayout;

    const update = React.useCallback((fn: (l: LayoutNode) => LayoutNode) => {
      const next = fn(layoutRef.current);
      if (next === layoutRef.current) return;
      layoutRef.current = next;
      setLayoutRef.current(next);
    }, []);

    const groups = listGroups(layout);
    const [focusedRaw, setFocused] = React.useState<string | null>(null);
    const focusedGroup = groups.some((g) => g.id === focusedRaw) ? focusedRaw : (groups[0]?.id ?? null);
    const maximized = maximizedRaw && groups.some((g) => g.id === maximizedRaw) ? maximizedRaw : null;

    const floatingList = floating ?? [];
    const floatingRef = React.useRef(floatingList);
    floatingRef.current = floatingList;
    const floatingEnabled = Boolean(onFloatingChange);

    const title = (id: string) => paneTitle?.(id) ?? id;
    const labelOf = (id: string) => paneLabel?.(id) ?? textOf(paneTitle?.(id), id);
    const closable = (id: string) => paneClosable?.(id) ?? true;
    const tabId = (id: string) => `${uid}-tab-${safeId(id)}`;
    const panelId = (id: string) => `${uid}-panel-${safeId(id)}`;
    const cellId = (id: string) => `${uid}-cell-${safeId(id)}`;

    const focusTab = (paneId: string) => {
      requestAnimationFrame?.(() => document.getElementById(tabId(paneId))?.focus());
    };

    const activate = (paneId: string) => update((l) => setActiveTab(l, paneId));
    const close = (paneId: string) => {
      if (!findPane(layoutRef.current, paneId)) return;
      update((l) => closePane(l, paneId));
      onPaneClose?.(paneId);
    };
    const closeOthers = (paneId: string) => {
      const loc = findPane(layoutRef.current, paneId);
      if (!loc) return;
      loc.group.panes.filter((p) => p !== paneId && closable(p)).forEach(close);
      activate(paneId);
    };
    const split = (paneId: string, direction: TilingDirection) => {
      const fresh = createPane?.(paneId, direction);
      update((l) => {
        if (fresh) return splitPane(l, paneId, direction, fresh);
        const loc = findPane(l, paneId);
        if (!loc) return l;
        if (loc.group.panes.length > 1) return movePane(l, paneId, loc.group.id, direction === "row" ? "right" : "bottom");
        return splitGroup(l, loc.group.id, direction);
      });
    };
    const splitEmpty = (groupId: string, direction: TilingDirection) => update((l) => splitGroup(l, groupId, direction));
    const moveToNewGroup = (paneId: string) =>
      update((l) => {
        const loc = findPane(l, paneId);
        return loc ? movePane(l, paneId, loc.group.id, "right") : l;
      });
    const popOut = (paneId: string) => {
      if (!onFloatingChange) return;
      const n = floatingRef.current.length;
      update((l) => closePane(l, paneId));
      onFloatingChange([
        ...floatingRef.current.filter((p) => p.id !== paneId),
        { id: paneId, x: 32 + n * 24, y: 32 + n * 24, width: 360, height: 240 },
      ]);
    };
    const dock = (paneId: string) => {
      onFloatingChange?.(floatingRef.current.filter((p) => p.id !== paneId));
      update((l) => addPane(l, paneId, focusedGroup ?? undefined));
    };
    const toggleMaximize = (groupId: string) => setMaximized(maximized === groupId ? null : groupId);

    /* ---- tab drag & drop ---- */
    const [drag, setDrag] = React.useState<{ paneId: string; x: number; y: number } | null>(null);
    const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null);
    const dragCleanup = React.useRef<(() => void) | null>(null);
    React.useEffect(() => () => dragCleanup.current?.(), []);

    const hitTest = (event: PointerEvent): DropTarget | null => {
      const fromPoint =
        typeof document.elementFromPoint === "function" ? document.elementFromPoint(event.clientX, event.clientY) : null;
      const origin = fromPoint ?? (event.target instanceof Element ? event.target : null);
      const el = origin?.closest("[data-tiling-drop-edge]");
      if (!el || !rootRef.current?.contains(el)) return null;
      const groupId = el.getAttribute("data-tiling-drop-group");
      const edge = el.getAttribute("data-tiling-drop-edge") as TilingDropEdge | null;
      return groupId && edge ? { groupId, edge } : null;
    };

    const startTabDrag = (event: React.PointerEvent, paneId: string) => {
      if (event.button !== 0 || typeof window === "undefined") return;
      dragCleanup.current?.();
      const state = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false };
      const finish = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey, true);
        dragCleanup.current = null;
        setDrag(null);
        setDropTarget(null);
      };
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== state.pointerId) return;
        if (!state.active) {
          if (Math.hypot(ev.clientX - state.x, ev.clientY - state.y) < 5) return;
          state.active = true;
        }
        setDrag({ paneId, x: ev.clientX, y: ev.clientY });
        setDropTarget(hitTest(ev));
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== state.pointerId) return;
        const target = state.active ? hitTest(ev) : null;
        finish();
        if (target) update((l) => movePane(l, paneId, target.groupId, target.edge));
      };
      const onCancel = () => finish();
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape" && state.active) {
          ev.preventDefault();
          finish();
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey, true);
      dragCleanup.current = finish;
    };

    /* ---- keep-alive hosts ---- */
    const hostsRef = React.useRef(new Map<string, HTMLElement>());
    const getHost = React.useCallback((paneId: string) => {
      if (typeof document === "undefined") return null;
      let host = hostsRef.current.get(paneId);
      if (!host) {
        host = document.createElement("div");
        host.className = "h-full w-full";
        host.setAttribute("data-slot", "tiling-pane-host");
        host.setAttribute("data-pane-id", paneId);
        hostsRef.current.set(paneId, host);
      }
      return host;
    }, []);
    const mountedIds = [
      ...(keepAlive ? listPanes(layout) : groups.map((g) => g.active).filter(Boolean)),
      ...floatingList.map((p) => p.id),
    ];
    const mountedKey = mountedIds.join("\u0000");
    React.useEffect(() => {
      const keep = new Set(mountedKey.split("\u0000"));
      for (const id of [...hostsRef.current.keys()]) if (!keep.has(id)) hostsRef.current.delete(id);
    }, [mountedKey]);

    /* ---- focus tracking & Escape (native: pane content is portalled into keep-alive hosts) ---- */
    const maximizedRef = React.useRef(maximized);
    maximizedRef.current = maximized;
    const setMaximizedRef = React.useRef(setMaximized);
    setMaximizedRef.current = setMaximized;
    React.useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      // The group of *this* layout containing `target` (skipping groups of nested layouts).
      const groupOf = (target: EventTarget | null): string | null => {
        let found: string | null = null;
        let el = target instanceof Element ? target : null;
        for (; el && el !== root; el = el.parentElement) {
          const slot = el.getAttribute("data-slot");
          if (slot === "tiling-layout") found = null;
          else if (slot === "tiling-group" && found === null) found = el.getAttribute("data-group-id");
        }
        return el === root ? found : null;
      };
      const onActivate = (event: Event) => {
        const id = groupOf(event.target);
        if (id != null && listGroups(layoutRef.current).some((g) => g.id === id)) {
          setFocused((f) => (f === id ? f : id));
        }
      };
      // Window-level bubble listener so handlers inside the content (React or native) can preventDefault first.
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || event.defaultPrevented || !maximizedRef.current) return;
        if (!(event.target instanceof Node) || !root.contains(event.target)) return;
        setMaximizedRef.current(null);
      };
      const win = root.ownerDocument.defaultView;
      root.addEventListener("pointerdown", onActivate, true);
      root.addEventListener("focusin", onActivate, true);
      win?.addEventListener("keydown", onKeyDown);
      return () => {
        root.removeEventListener("pointerdown", onActivate, true);
        root.removeEventListener("focusin", onActivate, true);
        win?.removeEventListener("keydown", onKeyDown);
      };
    }, []);

    /* ---- shortcuts ---- */
    const focusedNode = groups.find((g) => g.id === focusedGroup);
    const cycle = (dir: 1 | -1) => {
      if (!focusedNode || focusedNode.panes.length < 2) return;
      const i = focusedNode.panes.indexOf(focusedNode.active);
      const next = focusedNode.panes[(i + dir + focusedNode.panes.length) % focusedNode.panes.length];
      activate(next);
      focusTab(next);
    };
    const withActive = (fn: (paneId: string) => void) => () => {
      if (focusedNode?.active) fn(focusedNode.active);
    };
    const defs: ShortcutDefinition[] = shortcuts
      ? [
          { keys: "mod+\\", label: "Split right", group: "Layout", allowInInputs: true, handler: withActive((p) => split(p, "row")) },
          {
            keys: ["mod+shift+\\", "mod+shift+|"],
            label: "Split down",
            group: "Layout",
            allowInInputs: true,
            handler: withActive((p) => split(p, "column")),
          },
          {
            keys: "mod+w",
            label: "Close tab",
            group: "Layout",
            allowInInputs: true,
            handler: withActive((p) => closable(p) && close(p)),
          },
          { keys: "ctrl+tab", label: "Next tab", group: "Layout", allowInInputs: true, handler: () => cycle(1) },
          { keys: "ctrl+shift+tab", label: "Previous tab", group: "Layout", allowInInputs: true, handler: () => cycle(-1) },
          ...Array.from({ length: 9 }, (_, i): ShortcutDefinition => ({
            keys: `mod+${i + 1}`,
            label: i === 0 ? "Focus group 1–9" : `Focus group ${i + 1}`,
            hidden: i > 0,
            group: "Layout",
            allowInInputs: true,
            handler: () => {
              const g = listGroups(layoutRef.current)[i];
              if (!g) return;
              setFocused(g.id);
              if (g.active) focusTab(g.active);
            },
          })),
        ]
      : [];
    useShortcuts(defs);

    const ctx: TilingContextValue = {
      uid,
      layout,
      groups,
      focusedGroup,
      maximized,
      drag,
      dropTarget,
      minSize,
      step,
      floatingEnabled,
      title,
      icon: (id) => paneIcon?.(id),
      label: labelOf,
      closable,
      renderEmptyGroup,
      tabId,
      panelId,
      cellId,
      update,
      focusGroup: (id) => setFocused((f) => (f === id ? f : id)),
      activate,
      close,
      closeOthers,
      split,
      splitEmpty,
      moveToNewGroup,
      popOut,
      toggleMaximize,
      startTabDrag,
    };

    return (
      <TilingContext.Provider value={ctx}>
        <PaneHostContext.Provider value={getHost}>
          <div
            ref={setRefs}
            role="group"
            aria-label={label}
            data-slot="tiling-layout"
            data-dragging={drag ? true : undefined}
            data-maximized={maximized ?? undefined}
            className={cn(
              "relative flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background",
              drag && "cursor-grabbing select-none",
              className
            )}
            {...props}
          >
            <TilingNodeView node={layout} />
            {floatingEnabled && (
              <FloatingPanes
                panes={floatingList}
                onPanesChange={(p) => onFloatingChange?.(p)}
                renderPane={(id) => <PaneSlot paneId={id} />}
                paneTitle={title}
                paneIcon={paneIcon}
                paneLabel={labelOf}
                onDock={dock}
                onClose={(id) => {
                  onFloatingChange?.(floatingRef.current.filter((p) => p.id !== id));
                  onPaneClose?.(id);
                }}
              />
            )}
            {drag && (
              <div
                aria-hidden
                data-slot="tiling-drag-ghost"
                className="pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-control border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-lg"
                style={{ left: drag.x + 12, top: drag.y + 12 }}
              >
                {paneIcon?.(drag.paneId)}
                {title(drag.paneId)}
              </div>
            )}
          </div>
          {mountedIds.map((id) => {
            const host = getHost(id);
            return host ? createPortal(renderPane(id), host, id) : null;
          })}
        </PaneHostContext.Provider>
      </TilingContext.Provider>
    );
  }
);
TilingLayout.displayName = "TilingLayout";

function TilingNodeView({ node }: { node: LayoutNode }) {
  const ctx = useTiling();
  if (node.type === "tabs") return <TilingGroupView group={node} />;
  const row = node.direction === "row";
  return (
    <div
      data-slot="tiling-split"
      data-direction={node.direction}
      className={cn("flex h-full min-h-0 w-full min-w-0", row ? "flex-row" : "flex-col")}
    >
      {node.children.map((child, i) => (
        <React.Fragment key={child.id}>
          {i > 0 && (
            <TilingHandle
              direction={node.direction}
              sizes={node.sizes}
              index={i - 1}
              min={ctx.minSize}
              step={ctx.step}
              controls={ctx.cellId(node.children[i - 1].id)}
              label={row ? "Resize columns" : "Resize rows"}
              onResize={(index, delta) => ctx.update((l) => resizeSplit(l, node.id, index, delta, ctx.minSize))}
              onEqualize={() => ctx.update((l) => equalizeSplit(l, node.id))}
            />
          )}
          <div
            id={ctx.cellId(child.id)}
            data-slot="tiling-cell"
            className="flex min-h-0 min-w-0 overflow-hidden"
            style={{ flex: `${node.sizes[i] ?? 1} 1 0%` }}
          >
            <TilingNodeView node={child} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const dropZoneClass: Record<TilingDropEdge, string> = {
  left: "inset-y-0 left-0 w-1/4",
  right: "inset-y-0 right-0 w-1/4",
  top: "inset-x-1/4 top-0 h-1/4",
  bottom: "inset-x-1/4 bottom-0 h-1/4",
  center: "inset-1/4",
};

const dropPreviewClass: Record<TilingDropEdge, string> = {
  left: "top-1 bottom-1 left-1 right-1/2",
  right: "top-1 bottom-1 left-1/2 right-1",
  top: "top-1 left-1 right-1 bottom-1/2",
  bottom: "top-1/2 left-1 right-1 bottom-1",
  center: "inset-1",
};

const dropEdges: TilingDropEdge[] = ["left", "right", "top", "bottom", "center"];

function TilingGroupView({ group }: { group: LayoutTabsNode }) {
  const ctx = useTiling();
  const index = ctx.groups.findIndex((g) => g.id === group.id);
  const maximized = ctx.maximized === group.id;
  const covered = ctx.maximized != null && !maximized;
  const focused = ctx.focusedGroup === group.id;
  const target = ctx.dropTarget?.groupId === group.id ? ctx.dropTarget.edge : null;
  const removable = ctx.groups.length > 1;
  const stripRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!group.active) return;
    const tab = document.getElementById(ctx.tabId(group.active));
    tab?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.active]);

  const onStripKeyDown = (event: React.KeyboardEvent) => {
    const panes = group.panes;
    const i = panes.indexOf(group.active);
    let next: string | undefined;
    if (event.key === "ArrowRight") next = panes[(i + 1) % panes.length];
    else if (event.key === "ArrowLeft") next = panes[(i - 1 + panes.length) % panes.length];
    else if (event.key === "Home") next = panes[0];
    else if (event.key === "End") next = panes[panes.length - 1];
    else if (event.key === "Delete" && group.active && ctx.closable(group.active)) {
      event.preventDefault();
      const after = panes[i + 1] ?? panes[i - 1];
      ctx.close(group.active);
      if (after) requestAnimationFrame?.(() => document.getElementById(ctx.tabId(after))?.focus());
      return;
    } else return;
    event.preventDefault();
    if (next) {
      ctx.activate(next);
      document.getElementById(ctx.tabId(next))?.focus();
    }
  };

  const stripDrop = {
    "data-tiling-drop-group": group.id,
    "data-tiling-drop-edge": "center",
  } as const;

  return (
    <div
      role="group"
      aria-label={`Group ${index + 1}`}
      data-slot="tiling-group"
      data-group-id={group.id}
      data-focused={focused || undefined}
      data-maximized={maximized || undefined}
      inert={covered || undefined}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-background",
        maximized ? "absolute inset-0 z-20" : "relative"
      )}
    >
      <div
        data-slot="tiling-group-header"
        className={cn(
          "flex h-9 shrink-0 items-stretch border-b border-border bg-subtle",
          target === "center" && "bg-primary-soft"
        )}
      >
        {group.panes.length > 0 ? (
          <div
            ref={stripRef}
            role="tablist"
            aria-label={`Group ${index + 1} tabs`}
            data-slot="tiling-tabstrip"
            {...stripDrop}
            className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-none"
            onKeyDown={onStripKeyDown}
            onWheel={(event) => {
              const el = stripRef.current;
              if (el && Math.abs(event.deltaY) > Math.abs(event.deltaX)) el.scrollLeft += event.deltaY;
            }}
            onDoubleClick={(event) => {
              if (event.target === event.currentTarget) ctx.toggleMaximize(group.id);
            }}
          >
            {group.panes.map((paneId) => (
              <TilingTab key={paneId} group={group} paneId={paneId} focused={focused} />
            ))}
          </div>
        ) : (
          <div {...stripDrop} className="flex min-w-0 flex-1 items-center px-3 text-xs text-muted-foreground">
            Empty
          </div>
        )}
        <div className="flex shrink-0 items-center gap-0.5 border-l border-border px-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Split group right"
            onClick={() => (group.active ? ctx.split(group.active, "row") : ctx.splitEmpty(group.id, "row"))}
          >
            <RiLayoutColumnLine className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={maximized ? "Restore group" : "Maximize group"}
            aria-pressed={maximized}
            onClick={() => ctx.toggleMaximize(group.id)}
          >
            {maximized ? <RiFullscreenExitLine className="size-3.5" /> : <RiFullscreenLine className="size-3.5" />}
          </Button>
          {group.panes.length === 0 && removable && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Close group"
              onClick={() => ctx.update((l) => removeGroup(l, group.id))}
            >
              <RiCloseLine className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div data-slot="tiling-group-body" className="relative min-h-0 flex-1">
        {group.panes.map((paneId) => (
          <div
            key={paneId}
            role="tabpanel"
            id={ctx.panelId(paneId)}
            aria-labelledby={ctx.tabId(paneId)}
            data-pane-id={paneId}
            hidden={paneId !== group.active}
            className="absolute inset-0 overflow-auto"
          >
            <PaneSlot paneId={paneId} />
          </div>
        ))}
        {group.panes.length === 0 &&
          (ctx.renderEmptyGroup?.(group.id) ?? (
            <div
              data-slot="tiling-empty"
              className="flex h-full flex-col items-center justify-center gap-1.5 p-4 text-center text-sm text-muted-foreground"
            >
              <RiLayoutMasonryLine aria-hidden className="size-6 opacity-60" />
              <p className="font-medium text-foreground">Empty group</p>
              <p className="text-xs">Drag a tab here</p>
            </div>
          ))}
        {ctx.drag && (
          <div data-slot="tiling-drop-overlay" className="absolute inset-0 z-30">
            {dropEdges.map((edge) => (
              <div
                key={edge}
                aria-hidden
                data-tiling-drop-group={group.id}
                data-tiling-drop-edge={edge}
                className={cn("absolute", dropZoneClass[edge])}
              />
            ))}
            {target && (
              <div
                aria-hidden
                data-slot="tiling-drop-preview"
                data-edge={target}
                className={cn(
                  "pointer-events-none absolute rounded-box border-2 border-primary bg-primary/15 transition-all duration-100",
                  dropPreviewClass[target]
                )}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TilingTab({ group, paneId, focused }: { group: LayoutTabsNode; paneId: string; focused: boolean }) {
  const ctx = useTiling();
  const active = group.active === paneId;
  const name = ctx.label(paneId);
  const closable = ctx.closable(paneId);
  const others = group.panes.filter((p) => p !== paneId && ctx.closable(p)).length;
  const dragging = ctx.drag?.paneId === paneId;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="presentation"
          data-slot="tiling-tab"
          data-active={active || undefined}
          data-dragging={dragging || undefined}
          className={cn(
            "group/tab relative flex max-w-52 shrink-0 items-center border-r border-border text-xs transition-colors",
            active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            active &&
              "after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:content-['']",
            active && (focused ? "after:bg-primary" : "after:bg-border-strong"),
            dragging && "opacity-50"
          )}
        >
          <button
            type="button"
            role="tab"
            id={ctx.tabId(paneId)}
            aria-selected={active}
            aria-controls={ctx.panelId(paneId)}
            tabIndex={active ? 0 : -1}
            aria-keyshortcuts={closable ? "Delete" : undefined}
            draggable={false}
            className={cn("flex h-full min-w-0 items-center gap-1.5 pl-3", closable ? "pr-1" : "pr-3", focusRing, "focus-visible:ring-inset")}
            onClick={() => ctx.activate(paneId)}
            onPointerDown={(event) => ctx.startTabDrag(event, paneId)}
            onMouseDown={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
            onAuxClick={(event) => {
              if (event.button === 1 && closable) {
                event.preventDefault();
                ctx.close(paneId);
              }
            }}
          >
            {ctx.icon(paneId) && <span className="flex shrink-0 [&_svg]:size-3.5">{ctx.icon(paneId)}</span>}
            <span className="truncate">{ctx.title(paneId)}</span>
          </button>
          {closable && (
            // Mouse affordance only: keyboard users close with Delete, mod+w or the context menu.
            <span
              aria-hidden
              title={`Close ${name}`}
              data-slot="tiling-tab-close"
              className={cn(
                "mr-1 flex size-5 shrink-0 cursor-default items-center justify-center rounded-xs text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
                active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100"
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => ctx.close(paneId)}
            >
              <RiCloseLine className="size-3.5" />
            </span>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem icon={<RiLayoutColumnLine />} onSelect={() => ctx.split(paneId, "row")}>
          Split right
        </ContextMenuItem>
        <ContextMenuItem icon={<RiLayoutRowLine />} onSelect={() => ctx.split(paneId, "column")}>
          Split down
        </ContextMenuItem>
        <ContextMenuItem disabled={group.panes.length < 2} onSelect={() => ctx.moveToNewGroup(paneId)}>
          Move to new group
        </ContextMenuItem>
        {ctx.floatingEnabled && (
          <ContextMenuItem icon={<RiPictureInPicture2Line />} onSelect={() => ctx.popOut(paneId)}>
            Pop out
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          icon={ctx.maximized === group.id ? <RiFullscreenExitLine /> : <RiFullscreenLine />}
          onSelect={() => ctx.toggleMaximize(group.id)}
        >
          {ctx.maximized === group.id ? "Restore group" : "Maximize group"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!closable} onSelect={() => ctx.close(paneId)}>
          Close
        </ContextMenuItem>
        <ContextMenuItem disabled={others === 0} onSelect={() => ctx.closeOthers(paneId)}>
          Close others
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

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
      "flex flex-col items-stretch gap-1.5 rounded-box border border-border bg-card p-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground",
      "aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-foreground",
      focusRing
    );

    return (
      <div ref={ref} data-slot="layout-preset-picker" className={cn("flex flex-col gap-4", className)} {...props}>
        <div role="group" aria-label="Layout presets" className="grid grid-cols-3 gap-2">
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
            className="flex items-end gap-2"
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
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="sm" variant="secondary" leadingIcon={<RiSave3Line />} disabled={!current || !name.trim()}>
              Save current arrangement
            </Button>
          </form>
        )}
        {saved.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Saved arrangements</p>
            <ul aria-label="Saved arrangements" className="grid grid-cols-3 gap-2">
              {saved.map((item) => (
                <li key={item.id} className="relative">
                  <button
                    type="button"
                    aria-pressed={current ? isSameLayoutShape(item.layout, current) : false}
                    className={cn(tileClass, "w-full")}
                    onClick={() => applySaved(item)}
                  >
                    <LayoutThumbnail layout={item.layout} />
                    <span className="truncate pr-5">{item.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Delete ${item.name}`}
                    className="absolute right-1 bottom-1"
                    onClick={() => setSaved(saved.filter((s) => s.id !== item.id))}
                  >
                    <RiDeleteBinLine className="size-3.5" />
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

/* ------------------------------------------------------------------ */
/* ZoneEditor                                                          */
/* ------------------------------------------------------------------ */

export interface ZoneEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Starting arrangement (panes are ignored). Default: two columns. */
  defaultLayout?: LayoutNode;
  /** When given, the applied layout has these panes filled into the zones in order. */
  panes?: string[];
  onApply: (layout: LayoutNode) => void;
  onCancel?: () => void;
  /** Called on every edit with the zone tree. */
  onChange?: (zones: LayoutNode) => void;
  /** Minimum zone fraction per split. Default 0.1. */
  minSize?: number;
}

/** FancyZones-style editor: click to split zones (Shift for horizontal), drag dividers, delete zones. */
export const ZoneEditor = React.forwardRef<HTMLDivElement, ZoneEditorProps>(
  ({ defaultLayout, panes, onApply, onCancel, onChange, minSize = 0.1, className, ...props }, ref) => {
    const initial = React.useMemo(
      () => normalizeLayout(toZoneLayout(defaultLayout ?? layoutPresets[1].create())),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );
    const [zones, setZonesState] = React.useState(initial);
    const zonesRef = React.useRef(zones);
    zonesRef.current = zones;
    const uid = safeId(React.useId());
    const setZones = (fn: (z: LayoutNode) => LayoutNode) => {
      const next = fn(zonesRef.current);
      if (next === zonesRef.current) return;
      zonesRef.current = next;
      setZonesState(next);
      onChange?.(next);
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
                className="absolute top-2 right-2 opacity-70 hover:opacity-100"
                onClick={() => setZones((z) => removeGroup(z, node.id))}
              >
                <RiDeleteBinLine className="size-3.5" />
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
          <span className="mr-auto text-xs text-muted-foreground" aria-live="polite">
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
