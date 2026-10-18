import * as React from "react";
import { clamp } from "../lib/math";

export interface ZoomPanState {
  scale: number;
  x: number;
  y: number;
}

export interface UseZoomPanOptions {
  minScale?: number;
  maxScale?: number;
  defaultScale?: number;
  /** Multiplier per zoom step (buttons / keys). Default 1.25. */
  step?: number;
  /** Require Ctrl/⌘ for wheel zoom (so the page can still scroll). Default false. */
  wheelRequiresModifier?: boolean;
  /** Pixels per arrow-key pan. Default 40. */
  panStep?: number;
  /** Called with the new scale and offset after every zoom or pan. */
  onValueChange?: (state: ZoomPanState) => void;
  /** @deprecated Use `onValueChange`. */
  onChange?: (state: ZoomPanState) => void;
}

/** Zoom/pan state + handlers: wheel and pinch zoom around the pointer, drag to pan, double-click reset, keyboard +/−/0/arrows. */
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
  const changeRef = React.useRef(onValueChange ?? onChange);
  changeRef.current = onValueChange ?? onChange;
  const viewportRef = React.useRef<HTMLElement | null>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{ dist: number; scale: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const setState = React.useCallback((next: ZoomPanState | ((s: ZoomPanState) => ZoomPanState)) => {
    const value = typeof next === "function" ? next(stateRef.current) : next;
    stateRef.current = value;
    setStateRaw(value);
    changeRef.current?.(value);
  }, []);

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

  const wheelOpts = React.useRef({ wheelRequiresModifier });
  wheelOpts.current = { wheelRequiresModifier };
  const zoomToRef = React.useRef(zoomTo);
  zoomToRef.current = zoomTo;

  const ref = React.useCallback((node: HTMLElement | null) => {
    const prev = viewportRef.current as (HTMLElement & { __zpWheel?: (e: WheelEvent) => void }) | null;
    if (prev?.__zpWheel) prev.removeEventListener("wheel", prev.__zpWheel);
    viewportRef.current = node;
    if (!node) return;
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
      e.currentTarget.setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: stateRef.current.scale };
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
      } else {
        panBy(e.clientX - prev.x, e.clientY - prev.y);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) gesture.current = null;
      if (pointers.current.size === 0) setDragging(false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(e.pointerId);
      gesture.current = null;
      if (pointers.current.size === 0) setDragging(false);
    },
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
    /** Attach to the viewport element (registers a non-passive wheel listener). */
    ref,
    handlers,
    /** Inline style for the transformed content layer. */
    contentStyle: {
      transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
      transformOrigin: "center center",
    } as React.CSSProperties,
  };
}
