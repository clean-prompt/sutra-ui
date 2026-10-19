import * as React from "react";
import { RiAddLine, RiFocus3Line, RiSubtractLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { canPan, clampPan, panBounds, panHome, panKeyAction, wheelDelta, type PanLimits } from "../lib/pan-surface";
import { directionOf } from "../lib/direction";
import { INERTIA_FRICTION, type DragAxis } from "../lib/gesture";
import type { SpringConfig, SpringName } from "../lib/spring";
import { usePan, type PanBinding } from "../hooks/use-pan";
import { useZoomPan, type ZoomPanState } from "../hooks/use-zoom-pan";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useResizeObserver } from "../hooks/use-resize-observer";
import { useSafeId } from "../hooks/use-safe-id";
import { Button } from "../primitives/button";

export interface PanSurfaceApi {
  /** Glide back to the centre (and the default zoom). */
  recenter: () => void;
  /** Glide to an offset in px from the centre, clamped to the bounds. */
  panTo: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  /** The current offset in px. */
  get: () => { x: number; y: number };
}

export interface PanSurfaceProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The canvas: a board, a big image, a diagram. It is centred and keeps its own size. */
  children: React.ReactNode;
  /** Accessible name of the surface. Default "Pannable canvas". */
  label?: string;
  /** Axis that follows the finger; the other is left to native scrolling. Default "both". */
  axis?: DragAxis;
  /** `"content"` stops the canvas where its edge meets the viewport (a canvas that fits cannot move); `"none"` lets it go anywhere. Default "content". */
  bounds?: "content" | "none";
  /** Where the canvas rests and where Recenter and Home bring it: `"center"`, or `"start"` to line its inline-start and top edges up with the viewport's (a board begins at its first column; right-to-left text starts at the right). Default "center". */
  home?: "center" | "start";
  /** Natural size of the canvas when it is known (otherwise measured). */
  contentSize?: { width: number; height: number };
  /** Friction per second of the glide after a flick. Default 6. */
  friction?: number;
  /** Spring of the bounce and of the recenter glide. Default "gentle". */
  spring?: SpringConfig | SpringName;
  /** Px of one arrow key press (four times that with Shift). Default 48. */
  step?: number;
  /** `"pan"`: the wheel moves the canvas (and is left to the page at the edge); `"none"`. Default "pan". */
  wheel?: "pan" | "none";
  /** Add zoom, composed from `useZoomPan`: Ctrl or Command with the wheel (a trackpad pinch), the buttons and the `+`, `-`, `0` keys. Default false. */
  zoom?: boolean;
  /** Smallest zoom. Default 0.5. */
  minScale?: number;
  /** Largest zoom. Default 4. */
  maxScale?: number;
  /** The zoom at rest and after Recenter. Default 1. */
  defaultScale?: number;
  /** The control buttons: `"auto"` shows them once the canvas has moved or zoomed, `true` always, `false` never. Default "auto". */
  controls?: boolean | "auto";
  /** Accessible name of the recenter button. Default "Recenter". */
  recenterLabel?: string;
  /** Ignore drags, the wheel and keys (and drop the tab stop). */
  disabled?: boolean;
  /** Runs whenever the offset changes (every frame of a drag or glide). */
  onPan?: (x: number, y: number) => void;
  /** Classes of the layer that moves (padding around the canvas goes here). */
  contentClassName?: string;
  /** Imperative handle (`recenter`, `panTo`, `panBy`, `get`). */
  apiRef?: React.Ref<PanSurfaceApi>;
}

const NO_PAN = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-pan-ignore]';
const GOAL_MS = 350;
const call = <E extends React.SyntheticEvent>(theirs: ((e: E) => void) | undefined, ours: ((e: E) => void) | undefined) =>
  theirs || ours
    ? (e: E) => {
        theirs?.(e);
        ours?.(e);
      }
    : undefined;

/**
 * An inertial canvas for boards and big images: drag it and it keeps gliding with time-based friction (`usePan`), stops at its
 * edges with a springy bounce, and moves with the wheel and the arrow keys (Shift for bigger steps, Page Up and Down, Home to
 * recenter). With `zoom` the existing `useZoomPan` handles the scale (wheel with Ctrl or Command, buttons, `+`, `-`, `0`);
 * the offset stays in `usePan`'s CSS variables, so a drag never re-renders. A recenter button appears once the canvas has
 * moved. It is a labelled, focusable group whose content stays in the DOM order for screen readers. A drag on a button inside
 * the canvas still pans and the click after a drag is swallowed; put `data-pan-ignore` on parts that need their own pointer
 * handling. The surface takes touch from the page (`touch-action: none` on its axis), so leave room to scroll around it.
 */
export const PanSurface = React.forwardRef<HTMLDivElement, PanSurfaceProps>(function PanSurface(
  {
    children,
    label = "Pannable canvas",
    axis = "both",
    bounds: boundsMode = "content",
    home = "center",
    contentSize,
    friction = INERTIA_FRICTION,
    spring = "gentle",
    step = 48,
    wheel = "pan",
    zoom = false,
    minScale,
    maxScale,
    defaultScale = 1,
    controls = "auto",
    recenterLabel = "Recenter",
    disabled = false,
    onPan,
    contentClassName,
    apiRef,
    className,
    style,
    ...props
  },
  forwardedRef
) {
  const viewport = React.useRef<HTMLDivElement | null>(null);
  const content = React.useRef<HTMLDivElement | null>(null);
  const [sizes, setSizes] = React.useState({ vw: 0, vh: 0, cw: 0, ch: 0 });
  const [away, setAway] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const hintId = useSafeId("pan-hint");
  const panRef = React.useRef<PanBinding | null>(null);
  const goal = React.useRef<{ x: number; y: number; at: number } | null>(null);

  // Untransformed layout sizes (a scaled canvas must not measure as scaled).
  const measure = React.useCallback(() => {
    const v = viewport.current;
    const c = content.current;
    if (!v || !c) return;
    setSizes((prev) => {
      const next = { vw: v.clientWidth, vh: v.clientHeight, cw: c.offsetWidth, ch: c.offsetHeight };
      return prev.vw === next.vw && prev.vh === next.vh && prev.cw === next.cw && prev.ch === next.ch ? prev : next;
    });
  }, []);
  useIsoLayoutEffect(measure, [measure]);
  useResizeObserver(viewport, measure);
  useResizeObserver(content, measure);

  const natural = contentSize ? { width: contentSize.width, height: contentSize.height } : { width: sizes.cw, height: sizes.ch };
  const boundsFor = React.useCallback(
    (scale: number): PanLimits | null => (boundsMode === "none" ? null : panBounds(natural, { width: sizes.vw, height: sizes.vh }, scale)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boundsMode, natural.width, natural.height, sizes.vw, sizes.vh]
  );
  const homeAt = React.useCallback((scale: number) => panHome(boundsFor(scale), home, directionOf(viewport.current)), [boundsFor, home]);
  const latest = useLatestRef({ boundsFor, homeAt, onPan, step, zoom, sizes, defaultScale, wheel, disabled });

  const zp = useZoomPan({
    minScale,
    maxScale,
    defaultScale,
    wheelRequiresModifier: true,
    onValueChange: (s: ZoomPanState) => {
      const o = latest.current;
      const pan = panRef.current;
      if (!pan) return;
      const next = clampPan(s.x, s.y, o.boundsFor(s.scale));
      const cur = pan.get();
      if (next.x !== cur.x || next.y !== cur.y) {
        pan.stop();
        pan.set(next.x, next.y);
      }
    },
  });
  const scale = zoom ? zp.scale : 1;
  const bounds = boundsFor(scale);
  const scaleRef = React.useRef(scale);
  scaleRef.current = scale;

  const pan = usePan({
    axis,
    friction,
    spring,
    bounds: bounds ?? undefined,
    enabled: !disabled,
    allow: (e) => !(e.target as Element).closest?.(NO_PAN),
    onChange: (x, y) => {
      latest.current.onPan?.(x, y);
      const rest = latest.current.homeAt(latest.current.defaultScale);
      const a = Math.abs(x - rest.x) > 1 || Math.abs(y - rest.y) > 1;
      setAway((prev) => (prev === a ? prev : a));
    },
  });
  panRef.current = pan;

  /** Hand the zoom hook the offset it should zoom from (it only knows what it was told). */
  const syncZoom = () => {
    const { x, y } = pan.get();
    zp.setState((s) => (s.x === x && s.y === y ? s : { ...s, x, y }));
  };
  const panTo = (x: number, y: number) => {
    const c = clampPan(x, y, boundsFor(scale));
    goal.current = { ...c, at: performance.now() };
    pan.to(c.x, c.y);
  };
  const panBy = (dx: number, dy: number) => {
    const g = goal.current && performance.now() - goal.current.at < GOAL_MS ? goal.current : null;
    const from = g ?? pan.get();
    panTo(from.x + dx, from.y + dy);
  };
  const recenter = () => {
    if (zoom) {
      syncZoom();
      zp.zoomTo(defaultScale);
    }
    const rest = homeAt(zoom ? defaultScale : 1);
    panTo(rest.x, rest.y);
    setAnnouncement("Recentered");
  };
  const zoomBy = (direction: 1 | -1) => {
    syncZoom();
    if (direction > 0) zp.zoomIn();
    else zp.zoomOut();
  };
  React.useImperativeHandle(apiRef, () => ({ recenter, panTo, panBy, get: () => pan.get() }));

  // The first time the sizes are known, put the canvas at home (before paint, so it never shows centred first).
  const homed = React.useRef(false);
  useIsoLayoutEffect(() => {
    if (homed.current || !bounds) return;
    homed.current = true;
    const rest = homeAt(zoom ? defaultScale : 1);
    if (rest.x || rest.y) pan.set(rest.x, rest.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes.vw, sizes.vh, natural.width, natural.height]);

  // Wheel: a capture listener, so it runs before the zoom hook's own and can hand it the current offset first.
  useIsoLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const o = latest.current;
      if (o.disabled) return;
      if (e.ctrlKey || e.metaKey) {
        if (o.zoom) syncZoom();
        return;
      }
      if (o.wheel !== "pan") return;
      const { dx, dy } = wheelDelta(e, { width: o.sizes.vw, height: o.sizes.vh });
      const { x, y } = pan.get();
      const b = o.boundsFor(scaleRef.current);
      if (!canPan(x, y, -dx, -dy, b)) return;
      e.preventDefault();
      const next = clampPan(x - dx, y - dy, b);
      pan.stop();
      pan.set(next.x, next.y);
      goal.current = null;
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || disabled) return;
    const action = panKeyAction(event.key, { step, viewportHeight: sizes.vh, shift: event.shiftKey, zoom });
    if (!action || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    if (action.type === "pan") panBy(action.dx, action.dy);
    else if (action.type === "recenter") recenter();
    else if (action.type === "zoom") zoomBy(action.direction);
    else if (action.type === "zoom-reset") recenter();
  };
  React.useEffect(() => {
    if (zoom && scale !== defaultScale) setAnnouncement(`Zoom ${Math.round(scale * 100)}%`);
  }, [zoom, scale, defaultScale]);

  const setRefs = useMergedRefs<HTMLDivElement>(pan.ref as React.Ref<HTMLDivElement>, zoom ? (zp.ref as React.Ref<HTMLDivElement>) : undefined, viewport, forwardedRef);
  const showControls = controls === true || (controls === "auto" && (away || (zoom && scale !== defaultScale)));
  const h = pan.handlers;
  const ctrl = "pointer-events-auto";
  return (
    <div
      role="group"
      aria-roledescription="pannable canvas"
      aria-label={label}
      aria-describedby={hintId}
      tabIndex={disabled ? undefined : 0}
      data-slot="pan-surface"
      data-dragging={pan.dragging ? "true" : undefined}
      data-away={away ? "true" : undefined}
      {...props}
      ref={setRefs}
      onPointerDown={call(props.onPointerDown, h.onPointerDown)}
      onPointerMove={call(props.onPointerMove, h.onPointerMove)}
      onPointerUp={call(props.onPointerUp, h.onPointerUp)}
      onPointerCancel={call(props.onPointerCancel, h.onPointerCancel)}
      onLostPointerCapture={call(props.onLostPointerCapture, h.onLostPointerCapture)}
      onClickCapture={call(props.onClickCapture, h.onClickCapture)}
      onKeyDown={call(props.onKeyDown, onKeyDown)}
      className={cn(
        "relative flex h-80 w-full min-w-0 select-none items-center justify-center overflow-clip rounded-box border border-border bg-subtle",
        !disabled && "cursor-grab data-[dragging=true]:cursor-grabbing",
        focusRing,
        className
      )}
      style={style}
    >
      <div
        ref={content}
        data-slot="pan-surface-content"
        className={cn("shrink-0", contentClassName)}
        style={{ translate: "var(--sutra-drag-x, 0px) var(--sutra-drag-y, 0px)", scale: zoom ? scale : undefined }}
      >
        {children}
      </div>
      {showControls && (
        <div data-slot="pan-surface-controls" data-pan-ignore className="absolute bottom-3 end-3 z-10 flex items-center gap-1 rounded-control border border-border bg-popover p-1 shadow-sm">
          {zoom && (
            <>
              <Button variant="ghost" size="icon-sm" className={ctrl} aria-label="Zoom out" disabled={scale <= (minScale ?? 0.5)} onClick={() => zoomBy(-1)}>
                <RiSubtractLine aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon-sm" className={ctrl} aria-label="Zoom in" disabled={scale >= (maxScale ?? 4)} onClick={() => zoomBy(1)}>
                <RiAddLine aria-hidden="true" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" className={ctrl} aria-label={recenterLabel} onClick={recenter}>
            <RiFocus3Line aria-hidden="true" />
          </Button>
        </div>
      )}
      <span id={hintId} className="sr-only">
        {`Drag or use the arrow keys to move the canvas, Page Up and Page Down for a screen, Home to recenter${zoom ? ", plus and minus to zoom" : ""}.`}
      </span>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
});
PanSurface.displayName = "PanSurface";
