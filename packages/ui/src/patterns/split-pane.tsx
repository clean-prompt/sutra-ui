import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { useElementWidth } from "../hooks/use-resize-observer";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { logicalArrow } from "../lib/direction";
import { useDrag } from "../hooks/use-drag";
import { useDirection } from "../hooks/use-direction";

type Orientation = "horizontal" | "vertical";

interface SplitPaneContextValue {
  orientation: Orientation;
  size: number;
  min: number;
  max: number;
  step: number;
  collapsed: boolean;
  stacked: boolean;
  collapseMode: "stack" | "primary";
  /** In `primary` collapse mode: which panel is showing. */
  activePanel: number;
  primaryId: string;
  setSize: (size: number) => void;
  toggleCollapse: () => void;
  reset: () => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  setDragging: (dragging: boolean) => void;
}

const SplitPaneContext = React.createContext<SplitPaneContextValue | null>(null);
const PanelIndexContext = React.createContext(0);

function useSplitPane() {
  const ctx = React.useContext(SplitPaneContext);
  if (!ctx) throw new Error("SplitPane parts must be rendered inside <SplitPane>.");
  return ctx;
}

function readStored(key: string | undefined): number | undefined {
  if (!key || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(key: string | undefined, value: number) {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(Math.round(value * 10) / 10));
  } catch {
    /* storage may be unavailable (private mode, quota) */
  }
}

export interface SplitPaneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** `horizontal`: panes side by side (vertical divider). `vertical`: stacked (horizontal divider). */
  orientation?: Orientation;
  /** Size of the first panel in percent (controlled). */
  size?: number;
  /** Initial size of the first panel in percent; also the double-click reset value. Default 50. */
  defaultSize?: number;
  /** Called with the first panel's size in percent while the divider moves. */
  onSizeChange?: (size: number) => void;
  /** Minimum first-panel size in percent. Default 15. */
  min?: number;
  /** Maximum first-panel size in percent. Default 85. */
  max?: number;
  /** Keyboard step in percent (Shift ×2). Default 5. */
  step?: number;
  /** Persist the size in localStorage under this key. */
  storageKey?: string;
  /** Below this container width (px) the split collapses. */
  collapseBelow?: number;
  /** When collapsed: stack both panes, or show one at a time with a toggle. Default "stack". */
  collapseMode?: "stack" | "primary";
  /** Allow Enter on the handle to collapse/restore the first panel. Default true. */
  collapsible?: boolean;
}

/** Two resizable panes with an accessible draggable divider, persistence and a narrow-width fallback. */
export const SplitPane = React.forwardRef<HTMLDivElement, SplitPaneProps>(
  (
    {
      orientation = "horizontal",
      size: sizeProp,
      defaultSize = 50,
      onSizeChange,
      min = 15,
      max = 85,
      step = 5,
      storageKey,
      collapseBelow,
      collapseMode = "stack",
      collapsible = true,
      className,
      children,
      ...props
    },
    forwardedRef
  ) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(rootRef, forwardedRef);
    const restoring = React.useRef(false);
    // The first render (server and hydration) starts at `defaultSize`: the saved size is read after mount.
    const [size, setSizeState] = useControllableState({
      value: sizeProp === undefined ? undefined : clamp(sizeProp, min, max),
      defaultValue: clamp(defaultSize, min, max),
      onChange: (next: number) => {
        if (!restoring.current) onSizeChange?.(next);
      },
    });
    // Restore the saved size before paint. It is not a user move, so it does not call onSizeChange.
    useIsoLayoutEffect(() => {
      if (sizeProp !== undefined) return;
      const stored = readStored(storageKey);
      if (stored === undefined) return;
      restoring.current = true;
      setSizeState(clamp(stored, min, max));
      restoring.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [collapsed, setCollapsed] = React.useState(false);
    const [dragging, setDragging] = React.useState(false);
    const [activePanel, setActivePanel] = React.useState(0);
    const primaryId = React.useId();

    const setSize = React.useCallback(
      (next: number) => {
        const value = clamp(next, min, max);
        setCollapsed(false);
        writeStored(storageKey, value);
        setSizeState(value);
      },
      [min, max, storageKey, setSizeState]
    );

    const toggleCollapse = React.useCallback(() => {
      if (!collapsible) return;
      setCollapsed((c) => !c);
    }, [collapsible]);

    const reset = React.useCallback(() => setSize(defaultSize), [setSize, defaultSize]);

    const width = useElementWidth(collapseBelow ? rootRef : null);

    // Width 0 means "not measured yet" (or hidden): don't collapse on it.
    const stacked = Boolean(collapseBelow && width > 0 && width < collapseBelow);

    const items = React.Children.toArray(children).filter(React.isValidElement);
    const panels = items.filter((c) => c.type === SplitPanePanel);
    const hasHandle = items.some((c) => c.type === SplitPaneHandle);
    let panelIndex = 0;
    const laidOut: React.ReactNode[] = [];
    items.forEach((child, i) => {
      if (child.type === SplitPanePanel) {
        if (panelIndex === 1 && !hasHandle) laidOut.push(<SplitPaneHandle key="__handle" />);
        laidOut.push(
          <PanelIndexContext.Provider key={child.key ?? `p${i}`} value={panelIndex}>
            {child}
          </PanelIndexContext.Provider>
        );
        panelIndex++;
      } else laidOut.push(child);
    });

    const ctx: SplitPaneContextValue = {
      orientation,
      size,
      min,
      max,
      step,
      collapsed,
      stacked,
      collapseMode,
      activePanel,
      primaryId,
      setSize,
      toggleCollapse,
      reset,
      rootRef,
      setDragging,
    };

    const showToggle = stacked && collapseMode === "primary" && panels.length > 1;

    return (
      <SplitPaneContext.Provider value={ctx}>
        <div
          ref={setRefs}
          data-slot="split-pane"
          data-orientation={orientation}
          data-stacked={stacked || undefined}
          data-collapse-mode={stacked ? collapseMode : undefined}
          data-dragging={dragging || undefined}
          className={cn(
            "relative flex min-h-0 min-w-0 overflow-hidden",
            orientation === "horizontal" && !stacked ? "flex-row" : "flex-col",
            dragging && (orientation === "horizontal" ? "cursor-col-resize select-none" : "cursor-row-resize select-none"),
            className
          )}
          {...props}
        >
          {showToggle && (
            <div role="group" aria-label="Show panel" className="flex shrink-0 gap-1 border-b border-border p-1.5">
              {panels.map((p, i) => {
                const label = (p.props as SplitPanePanelProps).label ?? `Panel ${i + 1}`;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={activePanel === i}
                    onClick={() => setActivePanel(i)}
                    className={cn(
                      "h-8 flex-1 rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground",
                      focusRing
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {laidOut}
        </div>
      </SplitPaneContext.Provider>
    );
  }
);
SplitPane.displayName = "SplitPane";

export interface SplitPanePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label used by the narrow-width toggle (`collapseMode="primary"`). */
  label?: React.ReactNode;
}

/** One side of a `SplitPane`. The first panel is sized; the second fills the rest. */
export const SplitPanePanel = React.forwardRef<HTMLDivElement, SplitPanePanelProps>(
  ({ className, style, label: _label, id, ...props }, ref) => {
    const ctx = useSplitPane();
    const index = React.useContext(PanelIndexContext);
    const first = index === 0;
    const hiddenInPrimaryMode = ctx.stacked && ctx.collapseMode === "primary" && ctx.activePanel !== index;
    const sized = first && !ctx.stacked;
    const basis = ctx.collapsed ? 0 : ctx.size;
    return (
      <div
        ref={ref}
        id={first ? (id ?? ctx.primaryId) : id}
        data-slot="split-pane-panel"
        data-panel={index}
        data-collapsed={first && ctx.collapsed && !ctx.stacked ? true : undefined}
        hidden={hiddenInPrimaryMode || (sized && ctx.collapsed) || undefined}
        className={cn("relative min-h-0 min-w-0 overflow-auto", sized ? "shrink-0" : "flex-1", className)}
        style={sized ? { flexBasis: `${basis}%`, ...style } : style}
        {...props}
      />
    );
  }
);
SplitPanePanel.displayName = "SplitPanePanel";

export interface SplitPaneHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show a grip in the middle of the divider. Default true. */
  withGrip?: boolean;
}

/** Draggable divider: `role="separator"` with arrows/Home/End, Enter to collapse, double-click to reset. */
export const SplitPaneHandle = React.forwardRef<HTMLDivElement, SplitPaneHandleProps>(
  (
    {
      className,
      withGrip = true,
      onKeyDown,
      onDoubleClick,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
      ...props
    },
    ref
  ) => {
    const ctx = useSplitPane();
    const horizontal = ctx.orientation === "horizontal";
    const rtl = useDirection(ctx.rootRef) === "rtl";
    // The divider follows the pointer's position along the pane (absolute mode: fractions from the inline start, so RTL is right).
    const drag = useDrag({
      mode: "absolute",
      axis: horizontal ? "x" : "y",
      trackRef: ctx.rootRef,
      rtl,
      onDown: (event) => event.preventDefault(),
      onStart: () => ctx.setDragging(true),
      onMove: (info) => {
        if (info.dx === 0 && info.dy === 0) return; // the press itself moves nothing; the first real move sets the size
        const rect = ctx.rootRef.current?.getBoundingClientRect();
        if (!rect || !(horizontal ? rect.width : rect.height)) return;
        ctx.setSize((horizontal ? info.fx! : info.fy!) * 100);
      },
      onEnd: () => ctx.setDragging(false),
    });
    const setRefs = useMergedRefs<HTMLDivElement>(ref, drag.ref as React.Ref<HTMLDivElement>);
    if (ctx.stacked) return null;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      const delta = ctx.step * (event.shiftKey ? 2 : 1);
      const dec = horizontal ? "ArrowLeft" : "ArrowUp";
      const inc = horizontal ? "ArrowRight" : "ArrowDown";
      switch (logicalArrow(event)) {
        case dec:
          ctx.setSize((ctx.collapsed ? ctx.min : ctx.size) - delta);
          break;
        case inc:
          ctx.setSize((ctx.collapsed ? ctx.min : ctx.size) + delta);
          break;
        case "Home":
          ctx.setSize(ctx.min);
          break;
        case "End":
          ctx.setSize(ctx.max);
          break;
        case "Enter":
          ctx.toggleCollapse();
          break;
        default:
          return;
      }
      event.preventDefault();
    };

    return (
      <div
        ref={setRefs}
        role="separator"
        tabIndex={0}
        aria-orientation={horizontal ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(ctx.collapsed ? 0 : ctx.size)}
        aria-valuemin={ctx.min}
        aria-valuemax={ctx.max}
        aria-controls={ctx.primaryId}
        aria-label={props["aria-label"] ?? "Resize panels"}
        data-slot="split-pane-handle"
        data-collapsed={ctx.collapsed || undefined}
        className={cn(
          "group/handle relative z-10 flex shrink-0 touch-none items-center justify-center bg-border transition-colors hover:bg-primary/60 data-[collapsed]:bg-border-strong",
          horizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
          "before:absolute before:content-['']",
          horizontal ? "before:inset-y-0 before:-start-1.5 before:-end-1.5" : "before:inset-x-0 before:-top-1.5 before:-bottom-1.5",
          focusRing,
          "focus-visible:bg-ring",
          className
        )}
        onKeyDown={handleKeyDown}
        onDoubleClick={(event) => {
          onDoubleClick?.(event);
          if (!event.defaultPrevented) ctx.reset();
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          drag.handlers.onPointerDown?.(event);
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          drag.handlers.onPointerMove?.(event);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          drag.handlers.onPointerUp?.(event);
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          drag.handlers.onPointerCancel?.(event);
        }}
        onLostPointerCapture={(event) => {
          onLostPointerCapture?.(event);
          drag.handlers.onLostPointerCapture?.(event);
        }}
        {...props}
      >
        {withGrip && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute rounded-full border border-border bg-background shadow-xs transition-colors group-hover/handle:border-primary/60",
              horizontal ? "h-8 w-1.5" : "h-1.5 w-8"
            )}
          />
        )}
      </div>
    );
  }
);
SplitPaneHandle.displayName = "SplitPaneHandle";
