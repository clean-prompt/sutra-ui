import * as React from "react";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantOrb, useAssistantOrbState } from "../src/kits/voice/assistant-orb";
import { drawWave, readWavePalette } from "../src/kits/voice/assistant-orb-canvas-internal";
import { createFrameLoop } from "../src/kits/voice/assistant-orb-internal";
import { assistantOrbLabels, assistantOrbStates, orbParams, orbStillLevel, waveLayers, type AssistantOrbState } from "../src/lib/orb";
import { axeViolations } from "./helpers/a11y";

/* ------------------------------------------------------------------ */
/* Environment: a manual frame queue, controllable observers, a canvas */
/* ------------------------------------------------------------------ */

let queue = new Map<number, FrameRequestCallback>();
let nextId = 0;
let clock = 0;
const rafSpy = vi.fn();
const cancelSpy = vi.fn();

/** Runs the queued frames once, `ms` later. */
const frame = (ms = 16) =>
  act(() => {
    clock += ms;
    const due = [...queue.values()];
    queue.clear();
    due.forEach((cb) => cb(clock));
  });
const frames = async (n: number, ms = 16) => {
  for (let i = 0; i < n; i++) await frame(ms);
};

const originalMatchMedia = window.matchMedia;
const system = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({ ...originalMatchMedia(query), matches: reduce && query.includes("reduce") })) as typeof window.matchMedia;
};

class IO {
  static all: IO[] = [];
  callback: IntersectionObserverCallback;
  disconnected = false;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    IO.all.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  show(visible: boolean) {
    act(() => this.callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
}

class RO {
  static all: RO[] = [];
  callback: ResizeObserverCallback;
  disconnected = false;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    RO.all.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
}

interface Stroke {
  style: string;
  alpha: number;
  width: number;
  op: string;
  ys: number[];
  xs: number[];
}
function makeCtx() {
  const strokes: Stroke[] = [];
  let path = { xs: [] as number[], ys: [] as number[] };
  const ctx = {
    strokeStyle: "",
    fillStyle: "" as unknown,
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineJoin: "",
    lineCap: "",
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(() => {
      path = { xs: [], ys: [] };
    }),
    moveTo: vi.fn((x: number, y: number) => {
      path.xs.push(x);
      path.ys.push(y);
    }),
    lineTo: vi.fn((x: number, y: number) => {
      path.xs.push(x);
      path.ys.push(y);
    }),
    stroke: vi.fn(() => {
      strokes.push({ style: String(ctx.strokeStyle), alpha: ctx.globalAlpha, width: ctx.lineWidth, op: ctx.globalCompositeOperation, ...path });
    }),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D & typeof ctx, strokes };
}

let canvas = makeCtx();
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalRect = Element.prototype.getBoundingClientRect;
const originalIO = globalThis.IntersectionObserver;
const originalRO = globalThis.ResizeObserver;

beforeEach(() => {
  queue = new Map();
  nextId = 0;
  clock = 0;
  rafSpy.mockClear();
  cancelSpy.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafSpy();
    queue.set(++nextId, cb);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    cancelSpy(id);
    queue.delete(id);
  });
  IO.all = [];
  RO.all = [];
  globalThis.IntersectionObserver = IO as unknown as typeof IntersectionObserver;
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;
  canvas = makeCtx();
  HTMLCanvasElement.prototype.getContext = (() => canvas.ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 100, width: 300, height: 100, toJSON() {} } as DOMRect;
  };
  system(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.matchMedia = originalMatchMedia;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  Element.prototype.getBoundingClientRect = originalRect;
  globalThis.IntersectionObserver = originalIO;
  globalThis.ResizeObserver = originalRO;
  document.documentElement.removeAttribute("data-motion");
  document.documentElement.removeAttribute("data-style");
  document.documentElement.classList.remove("dark");
});

const orbOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="assistant-orb"]')!;
const levelOf = (el: HTMLElement) => Number(el.style.getPropertyValue("--orb-level") || 0);
const fired = (el: HTMLElement) => el.querySelectorAll('[data-part="ripple"][data-fire]').length;

/* ------------------------------------------------------------------ */
/* Markup and API                                                      */
/* ------------------------------------------------------------------ */

describe("AssistantOrb markup", () => {
  it("is a named image with the state on it", () => {
    const { container } = render(<AssistantOrb />);
    const el = orbOf(container);
    expect(el).toHaveAttribute("role", "img");
    expect(el).toHaveAttribute("aria-label", assistantOrbLabels.idle);
    expect(el).toHaveAttribute("data-variant", "orb");
    expect(el).toHaveAttribute("data-state", "idle");
    expect(el.style.getPropertyValue("--orb-size")).toBe("128px");
  });

  it("names every state, accepts its own name and becomes decorative with an empty one", () => {
    for (const s of assistantOrbStates) {
      const { container, unmount } = render(<AssistantOrb state={s} />);
      expect(orbOf(container)).toHaveAttribute("aria-label", assistantOrbLabels[s]);
      unmount();
    }
    const named = render(<AssistantOrb state="listening" label="Sutra is listening" />);
    expect(orbOf(named.container)).toHaveAttribute("aria-label", "Sutra is listening");
    named.unmount();
    const { container } = render(<AssistantOrb label="" />);
    const el = orbOf(container);
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-label");
  });

  it("writes the per-state targets as custom properties", () => {
    for (const s of assistantOrbStates) {
      const { container, unmount } = render(<AssistantOrb state={s} />);
      const el = orbOf(container);
      const p = orbParams(s);
      expect(el.style.getPropertyValue("--orb-scale")).toBe(String(p.scale));
      expect(el.style.getPropertyValue("--orb-swell")).toBe(String(p.swell));
      expect(el.style.getPropertyValue("--orb-sat")).toBe(String(p.saturation));
      expect(el.style.getPropertyValue("--orb-speed")).toBe(String(p.speed));
      expect(el.style.getPropertyValue("--orb-glow")).toBe(String(p.glow));
      unmount();
    }
  });

  it("takes a size as a number (px) or any CSS length, and a default per variant", () => {
    const a = render(<AssistantOrb size={48} />);
    expect(orbOf(a.container).style.getPropertyValue("--orb-size")).toBe("48px");
    a.unmount();
    const b = render(<AssistantOrb size="12rem" />);
    expect(orbOf(b.container).style.getPropertyValue("--orb-size")).toBe("12rem");
    b.unmount();
    const c = render(<AssistantOrb variant="waveform" />);
    expect(orbOf(c.container).style.getPropertyValue("--orb-size")).toBe("64px");
  });

  it("reads an unknown state as idle", () => {
    const { container } = render(<AssistantOrb state={"dancing" as AssistantOrbState} />);
    expect(orbOf(container)).toHaveAttribute("data-state", "idle");
  });

  it("renders the layers of the orb and a canvas for the waveform", () => {
    const o = render(<AssistantOrb />);
    expect(o.container.querySelectorAll('[data-part="blob"]')).toHaveLength(4);
    expect(o.container.querySelectorAll('[data-part="ripple"]')).toHaveLength(3);
    expect(o.container.querySelectorAll('[data-part="ring"]')).toHaveLength(2);
    expect(o.container.querySelector('[data-part="arc"]')).not.toBeNull();
    expect(o.container.querySelector("canvas")).toBeNull();
    o.unmount();
    const w = render(<AssistantOrb variant="waveform" />);
    expect(w.container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
    expect(w.container.querySelector('[data-part="blob"]')).toBeNull();
  });

  it("lets the consumer override role, name and slot, merges class and style, and forwards the ref", () => {
    for (const variant of ["orb", "waveform"] as const) {
      const ref = React.createRef<HTMLDivElement>();
      const { container, unmount } = render(
        <AssistantOrb ref={ref} variant={variant} role="presentation" aria-label="Mine" data-slot="mine" id="x" className="w-full custom" style={{ opacity: 0.5 }} />
      );
      const el = container.firstElementChild as HTMLElement;
      expect(ref.current).toBe(el);
      expect(el).toHaveAttribute("role", "presentation");
      expect(el).toHaveAttribute("aria-label", "Mine");
      expect(el).toHaveAttribute("data-slot", "mine");
      expect(el).toHaveAttribute("id", "x");
      expect(el).toHaveClass("w-full", "custom");
      expect(el.style.opacity).toBe("0.5");
      expect(el.style.getPropertyValue("--orb-size")).not.toBe("");
      unmount();
    }
  });

  it("changes state without remounting", () => {
    const { container, rerender } = render(<AssistantOrb state="idle" />);
    const el = orbOf(container);
    rerender(<AssistantOrb state="thinking" />);
    expect(orbOf(container)).toBe(el);
    expect(el).toHaveAttribute("data-state", "thinking");
    expect(el).toHaveAttribute("aria-label", assistantOrbLabels.thinking);
    expect(el.style.getPropertyValue("--orb-speed")).toBe(String(orbParams("thinking").speed));
  });

  it("has no axe violations in any state or variant", async () => {
    for (const variant of ["orb", "waveform"] as const) {
      const { container, unmount } = render(
        <div>
          {assistantOrbStates.map((s) => (
            <AssistantOrb key={s} variant={variant} state={s} />
          ))}
          <AssistantOrb variant={variant} label="" />
        </div>
      );
      expect(await axeViolations(container)).toEqual([]);
      unmount();
    }
  });

  it("marks a paused orb", () => {
    const { container } = render(<AssistantOrb paused />);
    expect(orbOf(container)).toHaveAttribute("data-paused");
  });
});

describe("useAssistantOrbState", () => {
  it("returns the state by priority and keeps the same value for the same flags", () => {
    const { result, rerender } = renderHook((flags: Parameters<typeof useAssistantOrbState>[0]) => useAssistantOrbState(flags), { initialProps: {} });
    expect(result.current).toBe("idle");
    rerender({ listening: true });
    expect(result.current).toBe("listening");
    rerender({ listening: true, thinking: true });
    expect(result.current).toBe("thinking");
    rerender({ listening: true, thinking: true, speaking: true });
    expect(result.current).toBe("speaking");
    rerender({ listening: true, speaking: true, error: true });
    expect(result.current).toBe("error");
    rerender({ muted: true });
    expect(result.current).toBe("muted");
    rerender({});
    expect(result.current).toBe("idle");
  });
});

/* ------------------------------------------------------------------ */
/* The level loop of the orb                                           */
/* ------------------------------------------------------------------ */

describe("orb level loop", () => {
  it("rises fast and falls slowly, writing a CSS variable without re-rendering the parts", async () => {
    const { container, rerender } = render(<AssistantOrb state="listening" level={0} />);
    const el = orbOf(container);
    const blob = el.querySelector('[data-part="blob"]')!;
    rerender(<AssistantOrb state="listening" level={1} />);
    await frames(2); // the first frame only starts the clock
    await frames(4);
    const up = levelOf(el);
    expect(up).toBeGreaterThan(0.5);
    expect(el.querySelector('[data-part="blob"]')).toBe(blob); // same node: nothing re-rendered underneath
    rerender(<AssistantOrb state="listening" level={0} />);
    await frames(4);
    const down = levelOf(el);
    expect(down).toBeLessThan(up);
    expect(down).toBeGreaterThan(up * 0.3); // the release is slow
  });

  it("stops requesting frames once it is at rest and wakes when the level moves", async () => {
    const { container, rerender } = render(<AssistantOrb state="listening" level={0.6} />);
    await frames(80);
    expect(levelOf(orbOf(container))).toBeCloseTo(0.6, 1);
    expect(queue.size).toBe(1); // still running while the level is non-zero
    rerender(<AssistantOrb state="listening" level={0} />);
    await frames(200);
    expect(levelOf(orbOf(container))).toBeLessThan(0.01);
    expect(queue.size).toBe(0);
    const before = rafSpy.mock.calls.length;
    await frames(5);
    expect(rafSpy.mock.calls.length).toBe(before);
    rerender(<AssistantOrb state="listening" level={0.8} />);
    expect(queue.size).toBe(1);
  });

  it("keeps at most one loop alive through StrictMode remounts and a state change", async () => {
    const { rerender } = render(<AssistantOrb state="speaking" level={0.5} />);
    expect(queue.size).toBe(1);
    rerender(<AssistantOrb state="thinking" level={0.5} />);
    expect(queue.size).toBe(1);
    await frames(3);
    expect(queue.size).toBe(1);
  });

  it("ignores the level in idle, error and muted (no loop, no swell)", async () => {
    for (const s of ["idle", "error", "muted"] as const) {
      const { container, unmount } = render(<AssistantOrb state={s} level={1} />);
      await frames(20);
      expect(levelOf(orbOf(container))).toBe(0);
      expect(queue.size).toBe(0);
      unmount();
    }
  });

  it("sends ripples on loud input while listening, spaced apart, and never while speaking", async () => {
    const { container, rerender } = render(<AssistantOrb state="listening" level={1} />);
    const el = orbOf(container);
    await frames(10, 16);
    expect(fired(el)).toBe(1);
    await frames(10, 100); // about a second more: a second and a third ripple, not ten
    expect(fired(el)).toBeGreaterThanOrEqual(2);
    expect(fired(el)).toBeLessThanOrEqual(3);
    rerender(<AssistantOrb state="speaking" level={1} />);
    el.querySelectorAll('[data-part="ripple"]').forEach((r) => r.removeAttribute("data-fire"));
    await frames(30, 50);
    expect(fired(el)).toBe(0);
    rerender(<AssistantOrb state="listening" level={0.2} />);
    await frames(30, 50); // the loud tail of the speech settles first
    el.querySelectorAll('[data-part="ripple"]').forEach((r) => r.removeAttribute("data-fire"));
    await frames(30, 50);
    expect(fired(el)).toBe(0); // quiet input sends none
  });

  it("does no frame work when paused, and picks up again when resumed", async () => {
    const { container, rerender } = render(<AssistantOrb state="listening" level={1} paused />);
    expect(queue.size).toBe(0);
    expect(rafSpy).not.toHaveBeenCalled();
    rerender(<AssistantOrb state="listening" level={1} paused={false} />);
    expect(queue.size).toBe(1);
    await frames(6);
    const held = levelOf(orbOf(container));
    expect(held).toBeGreaterThan(0.3);
    rerender(<AssistantOrb state="listening" level={1} paused />);
    expect(queue.size).toBe(0);
    expect(cancelSpy).toHaveBeenCalled();
    await frames(5);
    expect(levelOf(orbOf(container))).toBe(held); // frozen where it was
  });

  it("cancels its pending frame on unmount", () => {
    const { unmount } = render(<AssistantOrb state="speaking" level={0.7} />);
    expect(queue.size).toBe(1);
    unmount();
    expect(queue.size).toBe(0);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("rests while off screen and wakes when it comes back", async () => {
    const { container } = render(<AssistantOrb state="listening" level={0.9} />);
    const el = orbOf(container);
    await frames(3);
    const io = IO.all.find((o) => !o.disconnected)!;
    io.show(false);
    expect(el).toHaveAttribute("data-offscreen");
    await frame(); // the pending frame sees it is off screen and ends the loop
    expect(queue.size).toBe(0);
    const before = rafSpy.mock.calls.length;
    await frames(4);
    expect(rafSpy.mock.calls.length).toBe(before);
    io.show(true);
    expect(el).not.toHaveAttribute("data-offscreen");
    expect(queue.size).toBe(1);
  });

  it("disconnects its observer on unmount", () => {
    const { unmount } = render(<AssistantOrb />);
    const observers = IO.all.slice();
    unmount();
    expect(observers.length).toBeGreaterThan(0);
    expect(observers.every((o) => o.disconnected)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Reduced motion                                                      */
/* ------------------------------------------------------------------ */

describe("reduced motion", () => {
  it("never asks for a frame and shows the still pose of each state", async () => {
    system(true);
    const { container, rerender } = render(<AssistantOrb state="listening" level={1} />);
    const el = orbOf(container);
    await frames(10);
    expect(rafSpy).not.toHaveBeenCalled();
    expect(queue.size).toBe(0);
    expect(levelOf(el)).toBe(orbStillLevel("listening")); // the live level does not move it
    rerender(<AssistantOrb state="speaking" level={0} />);
    expect(levelOf(el)).toBe(orbStillLevel("speaking"));
    rerender(<AssistantOrb state="idle" level={1} />);
    expect(levelOf(el)).toBe(0);
    expect(rafSpy).not.toHaveBeenCalled();
    expect(fired(el)).toBe(0);
  });

  it("follows <html data-motion> in both directions", async () => {
    document.documentElement.setAttribute("data-motion", "reduce");
    const a = render(<AssistantOrb state="listening" level={1} />);
    await frames(3);
    expect(rafSpy).not.toHaveBeenCalled();
    a.unmount();
    document.documentElement.setAttribute("data-motion", "full");
    system(true);
    render(<AssistantOrb state="listening" level={1} />);
    expect(queue.size).toBe(1); // "full" lifts the system request
  });

  it("starts the loop when motion is allowed again while mounted", async () => {
    document.documentElement.setAttribute("data-motion", "reduce");
    render(<AssistantOrb state="speaking" level={0.5} />);
    expect(queue.size).toBe(0);
    await act(async () => {
      document.documentElement.removeAttribute("data-motion");
      await Promise.resolve();
    });
    expect(queue.size).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* The waveform                                                        */
/* ------------------------------------------------------------------ */

const midOf = (s: Stroke) => s.ys.reduce((a, b) => a + b, 0) / s.ys.length;
const spread = (strokes: Stroke[]) => Math.max(...strokes.flatMap((s) => s.ys.map((y) => Math.abs(y - 50))));
/** The strokes of the last frame: the last `layers * 2` strokes. */
const lastFrame = (n = 10) => canvas.strokes.slice(-n);

describe("waveform canvas", () => {
  it("sizes the canvas to its box and the device pixel ratio, and draws a first frame", () => {
    const dpr = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    try {
      const { container } = render(<AssistantOrb variant="waveform" state="speaking" />);
      const c = container.querySelector("canvas")!;
      expect(c.width).toBe(600);
      expect(c.height).toBe(200);
      expect(canvas.ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
      expect(canvas.ctx.clearRect).toHaveBeenCalled();
      expect(canvas.strokes.length).toBeGreaterThanOrEqual(10); // five layers, a soft and a crisp stroke each
    } finally {
      Object.defineProperty(window, "devicePixelRatio", { value: dpr, configurable: true });
    }
  });

  it("follows a resize", () => {
    const { container } = render(<AssistantOrb variant="waveform" />);
    const c = container.querySelector("canvas")!;
    Element.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, left: 0, top: 0, right: 150, bottom: 40, width: 150, height: 40, toJSON() {} } as DOMRect;
    };
    const ro = RO.all.find((r) => !r.disconnected)!;
    act(() => ro.callback([], ro as unknown as ResizeObserver));
    expect(c.width).toBe(150 * (window.devicePixelRatio || 1));
    expect(c.height).toBe(40 * (window.devicePixelRatio || 1));
  });

  it("redraws on every frame while running and stops when unmounted", async () => {
    const { unmount } = render(<AssistantOrb variant="waveform" state="listening" level={0.5} />);
    expect(queue.size).toBe(1);
    const a = canvas.strokes.length;
    await frames(3);
    expect(canvas.strokes.length).toBe(a + 3 * 10);
    unmount();
    expect(queue.size).toBe(0);
    const b = canvas.strokes.length;
    await frames(3);
    expect(canvas.strokes.length).toBe(b);
    expect(RO.all.every((r) => r.disconnected)).toBe(true);
  });

  it("shows a different shape in each state: flat idle, taller listening, tallest speaking", async () => {
    const heights: Record<string, number> = {};
    for (const s of ["idle", "listening", "speaking"] as const) {
      canvas.strokes.length = 0;
      const { unmount } = render(<AssistantOrb variant="waveform" state={s} level={0.8} />);
      await frames(60);
      heights[s] = spread(lastFrame());
      unmount();
    }
    expect(heights.idle).toBeLessThan(heights.listening!);
    expect(heights.listening!).toBeLessThan(heights.speaking!);
    expect(heights.idle).toBeLessThan(6);
  });

  it("follows the level while listening", async () => {
    const { rerender } = render(<AssistantOrb variant="waveform" state="listening" level={0} />);
    await frames(60);
    const quiet = spread(lastFrame());
    rerender(<AssistantOrb variant="waveform" state="listening" level={1} />);
    await frames(60);
    expect(spread(lastFrame())).toBeGreaterThan(quiet * 3);
  });

  it("travels a pulse across the wave while thinking", async () => {
    render(<AssistantOrb variant="waveform" state="thinking" />);
    await frames(20, 50); // let the pulse fade in
    const peakAt = () => {
      const s = lastFrame()[1]!; // crisp stroke of the first (tallest) layer
      let best = 0;
      s.ys.forEach((y, i) => {
        if (Math.abs(y - 50) > Math.abs(s.ys[best]! - 50)) best = i;
      });
      return s.xs[best]!;
    };
    const seen = new Set<number>();
    for (let i = 0; i < 8; i++) {
      await frames(1, 200);
      seen.add(Math.round(peakAt() / 40));
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it("draws one still frame per state under reduced motion and no frame loop", async () => {
    system(true);
    const heights: Record<string, number> = {};
    for (const s of ["idle", "listening", "thinking", "speaking"] as const) {
      canvas.strokes.length = 0;
      const { unmount } = render(<AssistantOrb variant="waveform" state={s} level={1} />);
      await frames(5);
      heights[s] = spread(canvas.strokes.slice(-10));
      expect(canvas.strokes.length).toBeGreaterThanOrEqual(10);
      expect(rafSpy).not.toHaveBeenCalled();
      unmount();
    }
    expect(new Set(Object.values(heights).map((h) => h.toFixed(1))).size).toBe(4);
    expect(heights.idle).toBeLessThan(heights.listening!);
    expect(heights.speaking).toBeGreaterThan(heights.listening!);
  });

  it("redraws the still frame when the state changes under reduced motion", () => {
    system(true);
    const { rerender } = render(<AssistantOrb variant="waveform" state="idle" />);
    const idle = spread(lastFrame());
    rerender(<AssistantOrb variant="waveform" state="speaking" />);
    expect(spread(lastFrame())).toBeGreaterThan(idle * 3);
    expect(queue.size).toBe(0);
  });

  it("holds the frame when paused and redraws only for a new state", async () => {
    const { rerender } = render(<AssistantOrb variant="waveform" state="listening" level={0.5} paused />);
    expect(queue.size).toBe(0);
    const n = canvas.strokes.length;
    expect(n).toBeGreaterThanOrEqual(10);
    await frames(4);
    expect(canvas.strokes.length).toBe(n);
    rerender(<AssistantOrb variant="waveform" state="speaking" level={0.5} paused />);
    expect(canvas.strokes.length).toBeGreaterThan(n);
    expect(queue.size).toBe(0);
  });

  it("paints the pose of the state on the first frame, even when paused or off screen", () => {
    render(<AssistantOrb variant="waveform" state="speaking" paused />);
    expect(spread(lastFrame())).toBeGreaterThan(8);
    canvas.strokes.length = 0;
    render(<AssistantOrb variant="waveform" state="idle" paused />);
    expect(spread(lastFrame())).toBeLessThan(4);
  });

  it("does not run off screen", async () => {
    render(<AssistantOrb variant="waveform" state="speaking" level={0.5} />);
    const io = IO.all.find((o) => !o.disconnected)!;
    io.show(false);
    await frame();
    expect(queue.size).toBe(0);
    const n = canvas.strokes.length;
    await frames(3);
    expect(canvas.strokes.length).toBe(n);
    io.show(true);
    expect(queue.size).toBe(1);
  });

  it("mirrors the wave in right-to-left", () => {
    system(true);
    const ltr = render(<AssistantOrb variant="waveform" state="speaking" />);
    const a = lastFrame()[1]!;
    ltr.unmount();
    canvas.strokes.length = 0;
    render(
      <div dir="rtl">
        <AssistantOrb variant="waveform" state="speaking" />
      </div>
    );
    const b = lastFrame()[1]!;
    expect(b.ys.map((y) => Math.round(y * 100))).toEqual(a.ys.map((y) => Math.round(y * 100)).reverse());
  });

  it("re-reads the palette when the theme changes", async () => {
    const vars = {
      "--primary": "rgb(10, 20, 30)",
      "--chart-2": "rgb(1, 1, 1)",
      "--chart-6": "rgb(2, 2, 2)",
      "--chart-4": "rgb(3, 3, 3)",
      "--chart-3": "rgb(4, 4, 4)",
      "--foreground": "rgb(9, 9, 9)",
    } as React.CSSProperties;
    render(<AssistantOrb variant="waveform" state="listening" level={0.5} style={vars} paused />);
    expect(new Set(lastFrame().map((s) => s.style)).size).toBe(5);
    await act(async () => {
      document.documentElement.setAttribute("data-style", "paper");
      await Promise.resolve();
    });
    expect(new Set(lastFrame().map((s) => s.style))).toEqual(new Set(["rgb(9, 9, 9)"]));
    await act(async () => {
      document.documentElement.removeAttribute("data-style");
      await Promise.resolve();
    });
    expect(new Set(lastFrame().map((s) => s.style)).size).toBe(5);
  });
});

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

describe("readWavePalette", () => {
  const themed = (attrs: Record<string, string>, ancestorAttrs: Record<string, string> = {}) => {
    const wrap = document.createElement("div");
    for (const [k, v] of Object.entries(ancestorAttrs)) wrap.setAttribute(k, v);
    const el = document.createElement("div");
    for (const [k, v] of Object.entries(attrs)) el.style.setProperty(k, v);
    wrap.appendChild(el);
    document.body.appendChild(wrap);
    return { el, done: () => wrap.remove() };
  };
  const tokens = {
    "--primary": "rgb(1, 2, 3)",
    "--chart-2": "rgb(2, 2, 2)",
    "--chart-6": "rgb(6, 6, 6)",
    "--chart-4": "rgb(4, 4, 4)",
    "--chart-3": "rgb(3, 3, 3)",
    "--foreground": "rgb(9, 9, 9)",
    "--destructive": "rgb(200, 0, 0)",
    "--muted-foreground": "rgb(120, 120, 120)",
  };

  it("uses the primary and chart hues in the stock look", () => {
    const { el, done } = themed(tokens);
    const p = readWavePalette(el, "listening");
    expect(p.colors).toEqual(["rgb(1, 2, 3)", "rgb(2, 2, 2)", "rgb(6, 6, 6)", "rgb(4, 4, 4)", "rgb(3, 3, 3)"]);
    expect(p.dark).toBe(false);
    done();
  });

  it("is one ink in the paper style, found on an ancestor", () => {
    const { el, done } = themed(tokens, { "data-style": "paper" });
    expect(readWavePalette(el, "speaking").colors).toEqual(["rgb(9, 9, 9)"]);
    done();
  });

  it("goes red for an error and grey when muted, whatever the style", () => {
    const { el, done } = themed(tokens, { "data-style": "paper" });
    expect(readWavePalette(el, "error").colors).toEqual(["rgb(200, 0, 0)"]);
    expect(readWavePalette(el, "muted").colors).toEqual(["rgb(120, 120, 120)"]);
    done();
  });

  it("knows a dark surface, through .dark or data-theme", () => {
    const a = themed(tokens, { class: "dark" });
    expect(readWavePalette(a.el, "idle").dark).toBe(true);
    a.done();
    const b = themed(tokens, { "data-theme": "dark" });
    expect(readWavePalette(b.el, "idle").dark).toBe(true);
    b.done();
  });

  it("falls back to a neutral colour when a token is missing", () => {
    const { el, done } = themed({});
    const p = readWavePalette(el, "listening");
    expect(p.colors.every((c) => c === "gray")).toBe(true);
    done();
  });
});

describe("drawWave", () => {
  const base = { width: 200, height: 100, dpr: 1, layers: waveLayers(5), phase: 0.5, amplitude: 0.8, pulse: null, rtl: false };

  it("strokes every layer twice, adds light on dark and fades the ends", () => {
    const { ctx, strokes } = makeCtx();
    drawWave(ctx, { ...base, palette: { colors: ["red", "blue"], dark: true } });
    expect(strokes).toHaveLength(10);
    expect(strokes[0]!.op).toBe("lighter");
    expect(strokes[0]!.style).toBe("red");
    expect(strokes[2]!.style).toBe("blue");
    expect(strokes[4]!.style).toBe("red");
    expect(strokes[0]!.width).toBeGreaterThan(strokes[1]!.width); // the soft glow is wider than the crisp line
    expect(strokes[0]!.alpha).toBeLessThan(strokes[1]!.alpha);
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.globalCompositeOperation).toBe("source-over");
  });

  it("covers instead of adding on a light surface, and draws nothing for an empty box", () => {
    const light = makeCtx();
    drawWave(light.ctx, { ...base, palette: { colors: ["red"], dark: false } });
    expect(light.strokes[0]!.op).toBe("source-over");
    const empty = makeCtx();
    drawWave(empty.ctx, { ...base, width: 0, height: 0, palette: { colors: ["red"], dark: false } });
    expect(empty.strokes).toHaveLength(0);
    expect(empty.ctx.clearRect).toHaveBeenCalled();
  });

  it("is flat at amplitude 0 and its path spans the width", () => {
    const { ctx, strokes } = makeCtx();
    drawWave(ctx, { ...base, amplitude: 0, palette: { colors: ["red"], dark: false } });
    expect(strokes[1]!.ys.every((y) => y === 50)).toBe(true);
    expect(strokes[1]!.xs[0]).toBe(0);
    expect(strokes[1]!.xs[strokes[1]!.xs.length - 1]).toBe(200);
  });
});

/* ------------------------------------------------------------------ */
/* The frame loop                                                      */
/* ------------------------------------------------------------------ */

describe("createFrameLoop", () => {
  it("starts once however often it is woken, passes the elapsed seconds, and ends when tick says so", () => {
    const dts: number[] = [];
    let keep = true;
    const loop = createFrameLoop((dt) => {
      dts.push(dt);
      return keep;
    }, () => true);
    loop.wake();
    loop.wake();
    expect(rafSpy).toHaveBeenCalledTimes(1);
    act(() => void frame(16));
    act(() => void frame(16));
    act(() => void frame(500)); // capped at 0.1 s after a stall
    expect(dts[0]).toBe(0);
    expect(dts[1]).toBeCloseTo(0.016, 5);
    expect(dts[2]).toBe(0.1);
    keep = false;
    act(() => void frame(16));
    expect(queue.size).toBe(0);
    loop.wake();
    expect(queue.size).toBe(1);
    loop.stop();
    expect(queue.size).toBe(0);
  });

  it("does not start when it is not allowed, and ends when it stops being allowed", () => {
    let allowed = false;
    const tick = vi.fn(() => true);
    const loop = createFrameLoop(tick, () => allowed);
    loop.wake();
    expect(queue.size).toBe(0);
    allowed = true;
    loop.wake();
    expect(queue.size).toBe(1);
    allowed = false;
    act(() => void frame(16));
    expect(tick).not.toHaveBeenCalled();
    expect(queue.size).toBe(0);
  });
});
