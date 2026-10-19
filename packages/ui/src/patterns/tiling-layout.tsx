/** IDE-style tiling workspace (TilingLayout) plus the floating panes, preset picker, zone editor and layout model it builds on. */
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useSafeId } from "../hooks/use-safe-id";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useShortcuts, type ShortcutDefinition } from "./shortcuts";
import {
  addPane,
  closePane,
  createTabsNode,
  findPane,
  listGroups,
  listPanes,
  movePane,
  setActiveTab,
  splitGroup,
  splitPane,
  type LayoutNode,
  type TilingDirection,
  type TilingDropEdge,
} from "./tiling-model";
import { PaneHostContext, PaneSlot, TilingContext, safeId, textOf, type DropTarget, type TilingContextValue } from "./tiling-layout-internal";
import { TilingNodeView } from "./tiling-layout-group-internal";
import { FloatingPanes, type FloatingPaneState } from "./tiling-layout-floating";

export * from "./tiling-model";
export * from "./tiling-layout-floating";
export * from "./tiling-layout-presets";
export * from "./tiling-layout-zone-editor";

/* ------------------------------------------------------------------ */
/* TilingLayout                                                        */
/* ------------------------------------------------------------------ */

export interface TilingLayoutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange"> {
  /** Controlled layout tree: nested splits (with a direction and sizes) and tab groups holding pane ids. Use with `onLayoutChange`. */
  layout?: LayoutNode;
  /** Initial layout tree when uncontrolled. */
  defaultLayout?: LayoutNode;
  /** Called with the new layout after a resize, split, move, close or drop. */
  onLayoutChange?: (layout: LayoutNode) => void;
  /** Renders the content of a pane from its pane id. */
  renderPane: (paneId: string) => React.ReactNode;
  /** Tab title (default: the pane id). */
  paneTitle?: (paneId: string) => React.ReactNode;
  /** Icon shown before the pane's tab title. */
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
  /** Called with the new list of floating windows after one is moved, resized or closed; setting it also enables "Pop out" and "Dock". */
  onFloatingChange?: (panes: FloatingPaneState[]) => void;
  /** Maximized group id (controlled). */
  maximizedGroup?: string | null;
  /** Initially maximized group id when uncontrolled. */
  defaultMaximizedGroup?: string | null;
  /** Called with the maximized group id (or `null` when restored). */
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
      defaultMaximizedGroup = null,
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
    const uid = useSafeId("tiling");
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(rootRef, forwardedRef);

    const [layout, setLayout] = useControllableState<LayoutNode>({
      value: layoutProp,
      defaultValue: defaultLayout ?? createTabsNode(),
      onChange: onLayoutChange,
    });
    const [maximizedRaw, setMaximized] = useControllableState<string | null>({
      value: maximizedGroup,
      defaultValue: defaultMaximizedGroup,
      onChange: onMaximizedGroupChange,
    });
    const layoutRef = React.useRef(layout);
    layoutRef.current = layout;
    const setLayoutRef = useLatestRef(setLayout);

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
    const floatingRef = useLatestRef(floatingList);
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
    const maximizedRef = useLatestRef(maximized);
    const setMaximizedRef = useLatestRef(setMaximized);
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
