import * as React from "react";
import { clamp } from "../lib/math";
import { useDrag } from "./use-drag";
import { useIsoLayoutEffect, useLatestRef } from "./use-iso-layout-effect";

export interface ZoomPanState {
  scale: number;
  x: number;
  y: number;
}

export interface UseZoomPanOptions {
  /**
   * Smallest zoom factor.
   * @default 0.5
   */
  minScale?: number;
  /**
   * Largest zoom factor.
   * @default 4
   */
  maxScale?: number;
  /**
   * Initial zoom factor.
   * @default 1
   */
  defaultScale?: number;
  /** Multiplier per zoom step (buttons / keys). Default 1.25. */
  step?: number;
  /** Require Ctrl/⌘ for wheel zoom (so the page can still scroll). Default false. */
  wheelRequiresModifier?: boolean;
  /** Pixels per arrow-key pan. Default 40. */
  panStep?: number;
  /** Called with the new scale and offset after every zoom or pan. */
  onValueChange?: (state: ZoomPanState) => void;
  /** Legacy name of `onValueChange`. @deprecated Use `onValueChange`. */
  onChange?: (state: ZoomPanState) => void;
}

/**
 * Zoom/pan state + handlers: wheel and pinch zoom around the pointer, drag to pan, double-click reset, keyboard +/−/0/arrows.
 * A one-pointer pan runs on `useDrag`: the offset follows the finger through `--sutra-zoom-x/-y` on the viewport (`contentStyle`
 * reads them; the names are the hook's own so a nested ZoomPan or a Drawer around it never leaks an offset in), so a pan re-renders nothing; `onValueChange` still fires on every move and `state` catches up when the pan ends
 * (`getState()` is always live). A pinch zooms through React state as before.
 */
export function useZoomPan({
  minScale = 0.5,
  maxScale = 4,
  defaultScale = 1,
  step = 1.25,
  wheelRequiresModifier = false,
  panStep = 40,
  onValueChange,
  onChange,
}: UseZoomPanOptions = {}) {
  const [state, setStateRaw] = React.useState<ZoomPanState>({ scale: defaultScale, x: 0, y: 0 });
  const stateRef = React.useRef(state);
  const changeRef = useLatestRef(onValueChange ?? onChange);
  const viewportRef = React.useRef<HTMLElement | null>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{ dist: number; scale: number } | null>(null);
  const pinched = React.useRef(false);
  const [dragging, setDragging] = React.useState(false);
  const panning = React.useRef(false);
  const syncing = React.useRef(false);
  const resume = React.useRef<number | null>(null);
  const dragEl = React.useRef<HTMLElement | null>(null);

  const drag = useDrag({
    axis: "both",
    threshold: 0,
    // A pan never starts on a control or an element that opts out; the first press of a pinch is handled below.
    allow: (e) => !(e.target as HTMLElement).closest("button, a, input, [data-zoom-pan-ignore]"),
    onStart: () => (panning.current = true),
    onPosition: (x, y) => {
      if (syncing.current) return;
      const s = stateRef.current;
      if (s.x === x && s.y === y) return;
      stateRef.current = { ...s, x, y };
      writeVars(x, y);
      changeRef.current?.(stateRef.current);
    },
    onEnd: () => {
      panning.current = false;
      setStateRaw(stateRef.current); // the pan's live offset becomes React state once the finger lifts
    },
  });
  const writeVars = (x: number, y: number) => {
    const node = viewportRef.current;
    node?.style.setProperty("--sutra-zoom-x", `${x}px`);
    node?.style.setProperty("--sutra-zoom-y", `${y}px`);
  };
  const syncDrag = (x: number, y: number) => {
    syncing.current = true;
    drag.set(x, y);
    syncing.current = false;
    writeVars(x, y);
  };

  const setState = React.useCallback((next: ZoomPanState | ((s: ZoomPanState) => ZoomPanState)) => {
    const value = typeof next === "function" ? next(stateRef.current) : next;
    stateRef.current = value;
    if (panning.current) syncDrag(value.x, value.y); // a zoom or a key during a pan: the finger carries on from the new offset
    setStateRaw(value);
    changeRef.current?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Keep the drag's own offset equal to the state after every non-pan change (keys, buttons, wheel, pinch, reset).
  useIsoLayoutEffect(() => {
    syncDrag(state.x, state.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.x, state.y]);

  /** Zoom to `scale`, keeping the point (cx, cy) (viewport-relative, from centre) fixed. */
  const zoomTo = React.useCallback(
    (scale: number, cx = 0, cy = 0) =>
      setState((s) => {
        const next = clamp(scale, minScale, maxScale);
        const k = next / s.scale;
        return { scale: next, x: cx - (cx - s.x) * k, y: cy - (cy - s.y) * k };
      }),
    [minScale, maxScale, setState]
  );
  const zoomIn = React.useCallback(() => zoomTo(stateRef.current.scale * step), [zoomTo, step]);
  const zoomOut = React.useCallback(() => zoomTo(stateRef.current.scale / step), [zoomTo, step]);
  const reset = React.useCallback(() => setState({ scale: defaultScale, x: 0, y: 0 }), [defaultScale, setState]);
  const panBy = React.useCallback((dx: number, dy: number) => setState((s) => ({ ...s, x: s.x + dx, y: s.y + dy })), [setState]);

  const relative = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  const wheelOpts = useLatestRef({ wheelRequiresModifier });
  const zoomToRef = useLatestRef(zoomTo);

  const ref = React.useCallback((node: HTMLElement | null) => {
    const prev = viewportRef.current as (HTMLElement & { __zpWheel?: (e: WheelEvent) => void }) | null;
    if (prev?.__zpWheel) prev.removeEventListener("wheel", prev.__zpWheel);
    viewportRef.current = node;
    if (!node) return;
    node.style.setProperty("--sutra-zoom-x", `${stateRef.current.x}px`);
    node.style.setProperty("--sutra-zoom-y", `${stateRef.current.y}px`);
    const onWheel = (e: WheelEvent) => {
      if (wheelOpts.current.wheelRequiresModifier && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      const p = relative(e.clientX, e.clientY);
      zoomToRef.current(stateRef.current.scale * factor, p.x, p.y);
    };
    (node as HTMLElement & { __zpWheel?: (e: WheelEvent) => void }).__zpWheel = onWheel;
    node.addEventListener("wheel", onWheel, { passive: false });
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if ((e.target as HTMLElement).closest("button, a, input, [data-zoom-pan-ignore]")) return;
      // The drag binds to the viewport on the first press (not in `ref`: a PanSurface shares that element with its own usePan).
      if (dragEl.current !== e.currentTarget) {
        dragEl.current = e.currentTarget;
        drag.ref(e.currentTarget);
        syncDrag(stateRef.current.x, stateRef.current.y);
      }
      e.currentTarget.setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 1) drag.handlers.onPointerDown?.(e);
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: stateRef.current.scale };
        drag.cancel(); // the first finger's pan hands over to the pinch
        pinched.current = true;
      }
      setDragging(true);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size >= 2 && gesture.current) {
        const [a, b] = Array.from(pointers.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = relative((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (gesture.current.dist > 0) zoomTo((gesture.current.scale * dist) / gesture.current.dist, mid.x, mid.y);
      } else if (pointers.current.size === 1) {
        if (resume.current === e.pointerId) {
          // The other finger of a pinch lifted: this one carries on panning from where it is now.
          resume.current = null;
          // Start the pan at the finger's last known position, so the move that triggered this still counts in full.
          const from = { pointerId: e.pointerId, pointerType: e.pointerType, button: 0, clientX: prev.x, clientY: prev.y, defaultPrevented: false, target: e.target };
          drag.handlers.onPointerDown?.(from as unknown as React.PointerEvent<HTMLElement>);
        }
        drag.handlers.onPointerMove?.(e);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      drag.handlers.onPointerUp?.(e);
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) gesture.current = null;
      resume.current = pointers.current.size === 1 && pinched.current ? (pointers.current.keys().next().value ?? null) : null;
      if (pointers.current.size === 0) {
        pinched.current = false;
        setDragging(false);
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      drag.handlers.onPointerCancel?.(e);
      pointers.current.delete(e.pointerId);
      gesture.current = null;
      resume.current = pointers.current.size === 1 && pinched.current ? (pointers.current.keys().next().value ?? null) : null;
      if (pointers.current.size === 0) {
        pinched.current = false;
        setDragging(false);
      }
    },
    onLostPointerCapture: drag.handlers.onLostPointerCapture,
    onDoubleClick: (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button, a, input, [data-zoom-pan-ignore]")) return;
      reset();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      const k = e.key;
      if (k === "+" || k === "=") zoomIn();
      else if (k === "-" || k === "_") zoomOut();
      else if (k === "0") reset();
      else if (k === "ArrowLeft") panBy(panStep, 0);
      else if (k === "ArrowRight") panBy(-panStep, 0);
      else if (k === "ArrowUp") panBy(0, panStep);
      else if (k === "ArrowDown") panBy(0, -panStep);
      else return;
      e.preventDefault();
    },
  };

  return {
    ...state,
    state,
    dragging,
    minScale,
    maxScale,
    setState,
    zoomTo,
    zoomIn,
    zoomOut,
    reset,
    panBy,
    /** The live state: during a one-pointer pan `state` / `x` / `y` update when the pan ends, this one on every move. */
    getState: () => stateRef.current,
    /** Attach to the viewport element (registers a non-passive wheel listener). */
    ref,
    handlers,
    /** Inline style for the transformed content layer. */
    contentStyle: {
      transform: `translate(var(--sutra-zoom-x, ${state.x}px), var(--sutra-zoom-y, ${state.y}px)) scale(${state.scale})`,
      transformOrigin: "center center",
    } as React.CSSProperties,
  };
}
