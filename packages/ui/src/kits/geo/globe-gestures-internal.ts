/* Pointer, wheel, pinch, double-click and keyboard input for the globe (private). */
import * as React from "react";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { rotationToCenter } from "./geo-model";
import type { GlobeEngine } from "./globe-internal";

/** Movement in px before a press becomes a drag, so clicks on markers and countries still land. */
const DRAG_THRESHOLD = 4;
const MARKER_SELECTOR = '[data-slot="geo-marker"],[data-slot="geo-marker-cluster"]';
const CONTROLS_SELECTOR = '[data-slot="globe-controls"]';

interface Options {
  engine: GlobeEngine;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  wheelZoom: boolean;
  onDragStart: () => void;
  onReset: () => void;
}

const closest = (target: EventTarget | null, selector: string) => (target instanceof Element ? target.closest(selector) : null);

export function useGlobeGestures(options: Options) {
  const { engine, canvasRef } = options;
  const opts = useLatestRef(options);
  const state = React.useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    start: { x: 0, y: 0 },
    moved: false,
    pinch: null as { dist: number; zoom: number } | null,
    suppressClick: false,
  });

  // Wheel needs a non-passive native listener to keep the page from scrolling while it zooms.
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (!opts.current.enabled || !opts.current.wheelZoom || closest(e.target, CONTROLS_SELECTOR)) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      // Trackpad pinch arrives as a wheel event with ctrlKey and small deltas.
      const factor = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0015));
      const before = engine.view.zoom;
      engine.hold("wheel");
      engine.zoomBy(factor, false);
      // At the zoom limits the page scrolls as usual.
      if (engine.view.zoom !== before) e.preventDefault();
      clearTimeout(timer);
      timer = setTimeout(() => {
        engine.settle();
        engine.release("wheel");
      }, 200);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (timer !== undefined) {
        clearTimeout(timer);
        engine.release("wheel");
      }
    };
  }, [engine, canvasRef, opts]);

  const s = state.current;

  const endGesture = (el: HTMLElement) => {
    const moved = s.moved;
    s.moved = false;
    s.pinch = null;
    delete el.dataset.dragging;
    if (moved) s.suppressClick = true;
    engine.endDrag(moved);
  };

  const canvasHandlers = {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (!opts.current.enabled || closest(e.target, CONTROLS_SELECTOR)) return;
      if ((e.pointerType === "mouse" && e.button !== 0) || !Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (s.pointers.size === 1) {
        s.start = { x: e.clientX, y: e.clientY };
        s.moved = false;
        s.suppressClick = false;
        engine.beginDrag();
      } else if (s.pointers.size === 2) {
        const [a, b] = [...s.pointers.values()];
        s.pinch = { dist: Math.max(1, Math.hypot(a!.x - b!.x, a!.y - b!.y)), zoom: engine.view.zoom };
        s.moved = true;
        for (const id of s.pointers.keys()) capture(e.currentTarget, id);
      }
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const prev = s.pointers.get(e.pointerId);
      if (!prev || !Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
      const next = { x: e.clientX, y: e.clientY };
      s.pointers.set(e.pointerId, next);
      if (s.pinch && s.pointers.size >= 2) {
        const [a, b] = [...s.pointers.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        engine.setView({ zoom: (s.pinch.zoom * dist) / s.pinch.dist }, false);
        return;
      }
      if (!s.moved) {
        if (Math.hypot(next.x - s.start.x, next.y - s.start.y) < DRAG_THRESHOLD) return;
        s.moved = true;
        capture(e.currentTarget, e.pointerId);
        e.currentTarget.dataset.dragging = "";
        opts.current.onDragStart();
      }
      engine.dragBy(next.x - prev.x, next.y - prev.y);
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      if (!s.pointers.delete(e.pointerId)) return;
      if (s.pointers.size === 1) {
        // Pinch → drag with the remaining finger.
        s.pinch = null;
        return;
      }
      if (s.pointers.size === 0) endGesture(e.currentTarget);
    },
    onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
      if (!s.pointers.delete(e.pointerId)) return;
      if (s.pointers.size === 0) endGesture(e.currentTarget);
    },
    onLostPointerCapture(e: React.PointerEvent<HTMLDivElement>) {
      if (s.pointers.delete(e.pointerId) && s.pointers.size === 0) endGesture(e.currentTarget);
    },
    onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
      if (!s.suppressClick) return;
      s.suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    },
    onDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
      if (!opts.current.enabled || closest(e.target, `${MARKER_SELECTOR},${CONTROLS_SELECTOR}`)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const point = engine.invert(e.clientX - rect.left, e.clientY - rect.top);
      const rotation = point ? rotationToCenter(point, engine.view.rotation[2]) : undefined;
      engine.flyTo({ rotation, zoom: engine.view.zoom * (e.shiftKey ? 0.5 : 2) }, 450);
    },
    onPointerOver(e: React.PointerEvent<HTMLDivElement>) {
      if (e.pointerType === "mouse" && closest(e.target, MARKER_SELECTOR)) engine.hold("hover");
    },
    onPointerOut(e: React.PointerEvent<HTMLDivElement>) {
      if (closest(e.target, MARKER_SELECTOR) && !closest(e.relatedTarget, MARKER_SELECTOR)) engine.release("hover");
    },
    onFocus(e: React.FocusEvent<HTMLDivElement>) {
      if (closest(e.target, MARKER_SELECTOR)) engine.hold("focus");
    },
    onBlur(e: React.FocusEvent<HTMLDivElement>) {
      if (closest(e.target, MARKER_SELECTOR) && !closest(e.relatedTarget, MARKER_SELECTOR)) engine.release("focus");
    },
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !opts.current.enabled || e.altKey || e.metaKey || e.ctrlKey) return;
    const step = (e.shiftKey ? 30 : 10) / Math.max(1, engine.view.zoom);
    const actions: Record<string, () => void> = {
      ArrowLeft: () => engine.rotateBy(step, 0),
      ArrowRight: () => engine.rotateBy(-step, 0),
      ArrowUp: () => engine.rotateBy(0, -step),
      ArrowDown: () => engine.rotateBy(0, step),
      "+": () => engine.zoomBy(1.25),
      "=": () => engine.zoomBy(1.25),
      "-": () => engine.zoomBy(0.8),
      _: () => engine.zoomBy(0.8),
      Home: () => opts.current.onReset(),
      "0": () => opts.current.onReset(),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  return {
    canvasHandlers,
    onKeyDown,
    /** Whether a drag is in progress (hover tooltips stay hidden meanwhile). */
    dragging: () => s.moved,
  };
}

function capture(el: HTMLElement, pointerId: number) {
  try {
    el.setPointerCapture?.(pointerId);
  } catch {
    // The pointer may already be gone (e.g. a synthetic event in tests).
  }
}
