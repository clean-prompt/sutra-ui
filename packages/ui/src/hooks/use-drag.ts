import * as React from "react";
import { createSpring, springs, type SpringConfig, type SpringHandle, type SpringName } from "../lib/spring";
import {
  applyBounds,
  dragStartDecision,
  recordSample,
  velocityFromSamples,
  AXIS_LOCK_DISTANCE,
  DRAG_THRESHOLD,
  type DragAxis,
  type DragSample,
  type Elastic,
} from "../lib/gesture";
import { useIsoLayoutEffect, useLatestRef } from "./use-iso-layout-effect";
import { prefersReducedMotion } from "./use-media-query";

export interface DragInfo {
  /** Current offset of the dragged thing (after bounds and elastic), in px. */
  x: number;
  y: number;
  /** Raw pointer travel since the press. */
  dx: number;
  dy: number;
  /** Release velocity in px/s over the last ~100 ms (zero when the pointer rested before the release). */
  vx: number;
  vy: number;
  /** Pointer position at the press (client coordinates). */
  startX: number;
  startY: number;
  /** `performance.now()` of this event. */
  time: number;
  /** The axis this drag follows (the locked one with `lockAxis`). */
  axis: DragAxis;
}

export interface DragBounds {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface UseDragOptions {
  /** Axis that follows the finger; the other is left to native scrolling (the hook sets `touch-action`). Default "both". */
  axis?: DragAxis;
  /** Pointer travel (px) before a press becomes a drag; below it taps and clicks go through. Default 4. */
  threshold?: number;
  /** With `axis="both"`: decide the axis after `lockDistance` px and follow it only. Needs `touch-action: none`. */
  lockAxis?: boolean;
  /** Distance used by `lockAxis`. Default 8. */
  lockDistance?: number;
  /** Limits of the offset. A single-axis drag whose cross axis wins at the start is handed back to the page. */
  bounds?: DragBounds;
  /** Resistance beyond `bounds`: a 0..1 factor of the overshoot (0 = hard stop) or a curve. Default 0. */
  elastic?: Elastic;
  /** Also drag with the mouse (touch and pen always count). Default true. */
  mouse?: boolean;
  enabled?: boolean;
  /** Asked on press; return false to ignore the whole gesture (a slider, a text field, a scrolled area). */
  allow?: (event: React.PointerEvent<HTMLElement>) => boolean;
  /** Called on every accepted press, before any travel (stop an inertia loop here). */
  onDown?: (event: React.PointerEvent<HTMLElement>) => void;
  /** Asked once when the travel passes the threshold; return false to hand the gesture back. */
  shouldStart?: (info: DragInfo, event: React.PointerEvent<HTMLElement>) => boolean;
  onStart?: (info: DragInfo) => void;
  /** Runs on every pointer move (pointer events are frame-aligned by the browser, so it is already once per frame). */
  onMove?: (info: DragInfo) => void;
  /** Release (or `cancelled` for `pointercancel` and a lost capture): decide to commit or call `settle`. */
  onEnd?: (info: DragInfo, cancelled: boolean) => void;
  /** Runs whenever the offset changes (drag, settle frame, `set`), for consumers that write a style of their own. */
  onPosition?: (x: number, y: number) => void;
}

export interface DragBinding {
  /** Attach to the dragged element: it sets `touch-action` and writes `--sutra-drag-x` / `--sutra-drag-y` (px) without React state. */
  ref: React.RefCallback<HTMLElement>;
  handlers: Pick<
    React.HTMLAttributes<HTMLElement>,
    "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture" | "onClickCapture"
  >;
  /** True while a drag is under way (state flips at the start and the end only). */
  dragging: boolean;
  /** Spring to a position (an omitted axis stays), starting at the release velocity (px/s). Instant under reduced motion. */
  settle(to: { x?: number; y?: number }, spring?: SpringConfig | SpringName, velocity?: { x?: number; y?: number }, onDone?: () => void): void;
  /** Jump to a position at rest (stops a settle in flight). */
  set(x: number, y: number): void;
  /** Stop a settle where it is. */
  stop(): void;
  /** The current offset. */
  get(): { x: number; y: number };
}

interface Session {
  id: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  active: boolean;
  axis: DragAxis;
  samples: DragSample[];
}

const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const touchActionFor = (axis: DragAxis) => (axis === "x" ? "pan-y" : axis === "y" ? "pan-x" : "none");

/**
 * Tracks a pointer drag: the offset follows the finger through CSS variables (no React state per move), with an axis lock,
 * bounds with elastic, a release velocity from a 100 ms window, `settle` with the spring maths and a click guard after a drag.
 * Spread `handlers` on an element, pass `ref` to it. A press that never passes `threshold` is a plain click. The pointer is
 * captured only once the drag starts; `pointercancel`, a lost capture and a disabled hook end it. The hook sets `touch-action`
 * on the element (`pan-y` for horizontal drags, `pan-x` for vertical ones, `none` for both).
 */
export function useDrag(options: UseDragOptions = {}): DragBinding {
  const opts = useLatestRef(options);
  const { axis = "both", enabled = true } = options;
  const [dragging, setDragging] = React.useState(false);
  const elRef = React.useRef<HTMLElement | null>(null);
  const pos = React.useRef({ x: 0, y: 0 });
  const session = React.useRef<Session | null>(null);
  const settling = React.useRef<SpringHandle[]>([]);
  const justDragged = React.useRef(false);
  const clickTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touched = React.useRef(false);

  const touchAction = enabled ? touchActionFor(axis) : "";
  const applyTouchAction = (el: HTMLElement | null, value: string) => {
    if (!el) return;
    if (value) {
      el.style.touchAction = value;
      touched.current = true;
    } else if (touched.current) {
      el.style.touchAction = "";
      touched.current = false;
    }
  };

  const binding = React.useMemo(() => {
    const write = (x: number, y: number) => {
      pos.current.x = x;
      pos.current.y = y;
      const el = elRef.current;
      if (el) {
        el.style.setProperty("--sutra-drag-x", `${x}px`);
        el.style.setProperty("--sutra-drag-y", `${y}px`);
      }
      opts.current.onPosition?.(x, y);
    };
    const stop = () => {
      settling.current.forEach((s) => s.stop());
      settling.current = [];
    };
    const offsetFor = (s: Session, dx: number, dy: number) => {
      const { bounds: b = {}, elastic = 0 } = opts.current;
      return {
        x: s.axis === "y" ? s.originX : applyBounds(s.originX + dx, b.left, b.right, elastic),
        y: s.axis === "x" ? s.originY : applyBounds(s.originY + dy, b.top, b.bottom, elastic),
      };
    };
    const infoFor = (s: Session, clientX: number, clientY: number, t: number): DragInfo => {
      const v = velocityFromSamples(s.samples, t);
      return {
        x: pos.current.x,
        y: pos.current.y,
        dx: clientX - s.startX,
        dy: clientY - s.startY,
        vx: s.axis === "y" ? 0 : v.x,
        vy: s.axis === "x" ? 0 : v.y,
        startX: s.startX,
        startY: s.startY,
        time: t,
        axis: s.axis,
      };
    };
    const end = (event: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
      const s = session.current;
      if (!s || s.id !== event.pointerId) return;
      session.current = null;
      if (!s.active) return;
      const t = clock();
      if (!cancelled) {
        recordSample(s.samples, { t, x: event.clientX, y: event.clientY });
        const o = offsetFor(s, event.clientX - s.startX, event.clientY - s.startY);
        write(o.x, o.y);
      }
      justDragged.current = true;
      clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => (justDragged.current = false), 0);
      setDragging(false);
      opts.current.onEnd?.(infoFor(s, event.clientX, event.clientY, t), cancelled);
    };

    const handlers: DragBinding["handlers"] = {
      onPointerDown(event) {
        const o = opts.current;
        if (o.enabled === false || event.defaultPrevented) return;
        if (session.current && session.current.id !== event.pointerId) return; // a second finger never joins a drag
        if (event.pointerType === "mouse" && (o.mouse === false || event.button !== 0)) return;
        if (o.allow && !o.allow(event)) return;
        o.onDown?.(event);
        stop();
        const t = clock();
        session.current = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: pos.current.x,
          originY: pos.current.y,
          active: false,
          axis: o.axis ?? "both",
          samples: [{ t, x: event.clientX, y: event.clientY }],
        };
      },
      onPointerMove(event) {
        const s = session.current;
        if (!s || s.id !== event.pointerId) return;
        const o = opts.current;
        const t = clock();
        if (!s.active && event.pointerType === "mouse" && event.buttons === 0) {
          session.current = null; // the release happened outside the window
          return;
        }
        recordSample(s.samples, { t, x: event.clientX, y: event.clientY });
        const dx = event.clientX - s.startX;
        const dy = event.clientY - s.startY;
        if (!s.active) {
          const decision = dragStartDecision({
            axis: s.axis,
            dx,
            dy,
            threshold: o.threshold ?? DRAG_THRESHOLD,
            lockAxis: o.lockAxis,
            lockDistance: o.lockDistance ?? AXIS_LOCK_DISTANCE,
          });
          if (decision.type === "wait") return;
          if (decision.type === "ignore") {
            session.current = null;
            return;
          }
          s.axis = decision.axis;
          if (o.shouldStart && !o.shouldStart(infoFor(s, event.clientX, event.clientY, t), event)) {
            session.current = null;
            return;
          }
          stop(); // a settle that started after the press (a blur closing a row) must not fight the finger
          s.originX = pos.current.x;
          s.originY = pos.current.y;
          s.active = true;
          try {
            elRef.current?.setPointerCapture?.(event.pointerId);
          } catch {
            /* capture is best-effort */
          }
          setDragging(true);
          o.onStart?.(infoFor(s, event.clientX, event.clientY, t));
        }
        const next = offsetFor(s, dx, dy);
        write(next.x, next.y);
        o.onMove?.(infoFor(s, event.clientX, event.clientY, t));
      },
      onPointerUp: (event) => end(event, false),
      onPointerCancel: (event) => end(event, true),
      onLostPointerCapture(event) {
        // A touch pointer is implicitly captured by its target (a child); our own capture replaces it and that child reports the loss.
        if (event.target === event.currentTarget) end(event, true);
      },
      onClickCapture(event) {
        if (!justDragged.current) return;
        event.preventDefault();
        event.stopPropagation();
      },
    };

    const set = (x: number, y: number) => {
      stop();
      write(x, y);
    };
    const settle: DragBinding["settle"] = (to, spring = "snappy", velocity, onDone) => {
      stop();
      const target = { x: to.x ?? pos.current.x, y: to.y ?? pos.current.y };
      if (prefersReducedMotion() || (target.x === pos.current.x && target.y === pos.current.y && !velocity?.x && !velocity?.y)) {
        write(target.x, target.y);
        onDone?.();
        return;
      }
      const config = typeof spring === "string" ? springs[spring] : spring;
      let pending = 2;
      const finish = () => {
        if (--pending === 0) {
          settling.current = [];
          onDone?.();
        }
      };
      const run = (axisKey: "x" | "y"): SpringHandle => {
        let doneOnce = false;
        const handle = createSpring(
          config,
          (v) => {
            write(axisKey === "x" ? v : pos.current.x, axisKey === "y" ? v : pos.current.y);
            if (!doneOnce && v === target[axisKey]) {
              doneOnce = true;
              finish();
            }
          },
          pos.current[axisKey]
        );
        return handle;
      };
      const sx = run("x");
      const sy = run("y");
      settling.current = [sx, sy];
      sx.to(target.x, velocity?.x);
      sy.to(target.y, velocity?.y);
    };

    return {
      handlers,
      set,
      settle,
      stop,
      get: () => ({ x: pos.current.x, y: pos.current.y }),
      ref: (el: HTMLElement | null) => {
        elRef.current = el;
        if (!el) {
          // The element left (a closed dialog) mid-drag: no pointerup will arrive, so drop the session.
          if (session.current) {
            session.current = null;
            setDragging(false);
          }
          return;
        }
        applyTouchAction(el, opts.current.enabled === false ? "" : touchActionFor(opts.current.axis ?? "both"));
        el.style.setProperty("--sutra-drag-x", `${pos.current.x}px`);
        el.style.setProperty("--sutra-drag-y", `${pos.current.y}px`);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useIsoLayoutEffect(() => {
    applyTouchAction(elRef.current, touchAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touchAction]);

  // A disabled hook ends a drag in flight; unmounting stops springs and timers (and survives a StrictMode remount).
  React.useEffect(() => {
    if (!enabled && session.current) {
      session.current = null;
      setDragging(false);
    }
  }, [enabled]);
  React.useEffect(
    () => () => {
      binding.stop();
      clearTimeout(clickTimer.current);
      session.current = null;
    },
    [binding]
  );

  return React.useMemo<DragBinding>(
    () => ({ ref: binding.ref, handlers: binding.handlers, dragging, settle: binding.settle, set: binding.set, stop: binding.stop, get: binding.get }),
    [binding, dragging]
  );
}
