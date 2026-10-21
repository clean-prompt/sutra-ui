/**
 * One shared requestAnimationFrame for every frame-drawn mascot and sting on the page (internal).
 *
 * A drawing joins the frame only while it is active (motion allowed, not paused, playing) and on screen, and leaves it when it
 * scrolls away or unmounts, so nothing runs at rest and a page full of mascots costs one frame callback. No React render per
 * frame: the callbacks write SVG attributes directly.
 */
import * as React from "react";
import { useLatestRef } from "../hooks/use-iso-layout-effect";

type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let raf = 0;

/** Ticks that have already thrown (each is reported once, so a broken drawing does not flood the console at 60 a second). */
const reported = new WeakSet<Tick>();

/* a drawing that throws must not stop the others (or the next frame): the error is reported, the tick stays on the frame */
function frame(now: number) {
  raf = 0;
  ticks.forEach((tick) => {
    try {
      tick(now);
    } catch (error) {
      if (reported.has(tick)) return;
      reported.add(tick);
      if (typeof reportError === "function") reportError(error);
      else console.error(error);
    }
  });
  if (ticks.size) raf = requestAnimationFrame(frame);
}
function join(tick: Tick) {
  ticks.add(tick);
  if (!raf) raf = requestAnimationFrame(frame);
}
function leave(tick: Tick) {
  ticks.delete(tick);
  if (!ticks.size && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

/** How many drawings are on the shared frame right now (tests). */
export const activeFrameCount = () => ticks.size;

/**
 * Calls `tick(seconds)` on the shared frame while `active` is true and the element is on screen (true where there is no
 * IntersectionObserver). The latest `tick` is always used, so it may close over fresh props.
 */
export function useFrameTicker(ref: React.RefObject<Element | null>, active: boolean, tick: (seconds: number) => void) {
  const latest = useLatestRef(tick);
  React.useEffect(() => {
    if (!active) return;
    const el = ref.current;
    let visible = true;
    let joined = false;
    const onFrame: Tick = (now) => latest.current(now / 1000);
    const sync = () => {
      if (visible && !joined) {
        join(onFrame);
        joined = true;
      } else if (!visible && joined) {
        leave(onFrame);
        joined = false;
      }
    };
    let io: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        visible = entry.isIntersecting;
        sync();
      });
      io.observe(el);
    }
    sync();
    return () => {
      io?.disconnect();
      if (joined) leave(onFrame);
      joined = false;
    };
  }, [active, ref, latest]);
}
