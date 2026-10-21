import * as React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantOrb, assistantOrbVariantLabels, assistantOrbVariants } from "../src/kits/voice/assistant-orb";
import { LevelHistory, readOrbArtPalette } from "../src/kits/voice/assistant-orb-art-internal";
import { assistantOrbLabels, assistantOrbStates, type AssistantOrbState, type OrbArtVariant } from "../src/lib/orb";
import { axeViolations } from "./helpers/a11y";

const ART: OrbArtVariant[] = ["mala", "string", "ink", "rings", "graph", "halftone"];

/* ------------------------------------------------------------------ */
/* Environment: manual frames, controllable observers, a recording 2D  */
/* context                                                             */
/* ------------------------------------------------------------------ */

let queue = new Map<number, FrameRequestCallback>();
let nextId = 0;
let clock = 0;
const rafSpy = vi.fn();

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

/** Every call a context receives, with its arguments and the paint at that moment. */
interface Call {
  op: string;
  args: number[];
  fill: string;
  stroke: string;
  alpha: number;
  comp: string;
}
const calls: Call[] = [];
function makeCtx(canvasEl?: HTMLCanvasElement) {
  const ctx: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineCap: "",
    lineJoin: "",
    canvas: canvasEl,
  };
  const record = (op: string) =>
    vi.fn((...args: unknown[]) => {
      calls.push({ op, args: args.filter((a): a is number => typeof a === "number").map((a) => Math.round(a * 10) / 10), fill: String(ctx.fillStyle), stroke: String(ctx.strokeStyle), alpha: Number(ctx.globalAlpha), comp: String(ctx.globalCompositeOperation) });
    });
  for (const op of ["setTransform", "clearRect", "beginPath", "closePath", "moveTo", "lineTo", "arc", "ellipse", "rect", "fill", "stroke", "save", "restore", "clip", "drawImage", "setLineDash", "fillRect", "quadraticCurveTo"]) {
    ctx[op] = record(op);
  }
  ctx.createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  return ctx as unknown as CanvasRenderingContext2D;
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalRect = Element.prototype.getBoundingClientRect;
const originalIO = globalThis.IntersectionObserver;
const originalRO = globalThis.ResizeObserver;
let box = { width: 120, height: 120 };

beforeEach(() => {
  queue = new Map();
  nextId = 0;
  clock = 0;
  calls.length = 0;
  rafSpy.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafSpy();
    queue.set(++nextId, cb);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    queue.delete(id);
  });
  IO.all = [];
  RO.all = [];
  globalThis.IntersectionObserver = IO as unknown as typeof IntersectionObserver;
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return makeCtx(this);
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  box = { width: 120, height: 120 };
  Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, left: 0, top: 0, right: box.width, bottom: box.height, width: box.width, height: box.height, toJSON() {} } as DOMRect;
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
  document.documentElement.removeAttribute("dir");
});

const orbOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="assistant-orb"]')!;
/** What was drawn since `from`, as one comparable string (the shape, not the colours). */
const shape = (from = 0) =>
  calls
    .slice(from)
    .filter((c) => ["moveTo", "lineTo", "arc", "ellipse", "rect", "fill", "stroke"].includes(c.op))
    .map((c) => `${c.op}(${c.args.join(",")})`)
    .join(";");
const tokens = {
  "--primary": "rgb(1, 2, 3)",
  "--chart-2": "rgb(2, 2, 2)",
  "--chart-6": "rgb(6, 6, 6)",
  "--foreground": "rgb(9, 9, 9)",
  "--destructive": "rgb(200, 0, 0)",
  "--muted-foreground": "rgb(120, 120, 120)",
} as React.CSSProperties;

/* ------------------------------------------------------------------ */

describe("AssistantOrb variants: markup", () => {
  it("exports the looks in picker order with their names", () => {
    expect(assistantOrbVariants).toEqual(["orb", "waveform", "mala", "string", "ink", "rings", "graph", "halftone"]);
    expect(assistantOrbVariantLabels.string).toBe("Sutra string");
  });

  it("renders every ink look as a named image around a hidden canvas", () => {
    for (const v of ART) {
      const { container, unmount } = render(<AssistantOrb variant={v} state="listening" />);
      const el = orbOf(container);
      expect(el).toHaveAttribute("data-variant", v);
      expect(el).toHaveAttribute("data-state", "listening");
      expect(el).toHaveAttribute("role", "img");
      expect(el).toHaveAttribute("aria-label", assistantOrbLabels.listening);
      expect(el.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
      expect(el.querySelector('[data-part="blob"]')).toBeNull();
      unmount();
    }
  });

  it("takes the round looks' size as a box (128 by default) and the string's as a height (64), square below 48 px", () => {
    const a = render(<AssistantOrb variant="mala" />);
    expect(orbOf(a.container).style.getPropertyValue("--orb-size")).toBe("128px");
    a.unmount();
    const b = render(<AssistantOrb variant="string" />);
    expect(orbOf(b.container).style.getPropertyValue("--orb-size")).toBe("64px");
    expect(orbOf(b.container)).toHaveAttribute("data-form", "bar");
    b.unmount();
    const c = render(<AssistantOrb variant="string" size={32} />);
    expect(orbOf(c.container)).toHaveAttribute("data-form", "square");
    c.unmount();
    const d = render(<AssistantOrb variant="string" size="3rem" />);
    expect(orbOf(d.container)).toHaveAttribute("data-form", "bar");
    d.unmount();
    const e = render(<AssistantOrb variant="ink" />);
    expect(orbOf(e.container)).not.toHaveAttribute("data-form");
  });

  it("reads an unknown variant as the glass orb", () => {
    const { container } = render(<AssistantOrb variant={"sparkle" as OrbArtVariant} />);
    expect(orbOf(container)).toHaveAttribute("data-variant", "orb");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("lets the consumer override role, name and slot, merges class and style, forwards the ref and goes decorative with an empty label", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container, unmount } = render(<AssistantOrb ref={ref} variant="graph" role="presentation" aria-label="Mine" data-slot="mine" className="w-full" style={{ opacity: 0.5 }} />);
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute("role", "presentation");
    expect(el).toHaveAttribute("aria-label", "Mine");
    expect(el).toHaveAttribute("data-slot", "mine");
    expect(el).toHaveClass("w-full");
    expect(el.style.opacity).toBe("0.5");
    unmount();
    const quiet = render(<AssistantOrb variant="halftone" label="" />);
    expect(orbOf(quiet.container)).toHaveAttribute("aria-hidden", "true");
    expect(orbOf(quiet.container)).not.toHaveAttribute("role");
  });

  it("switches between looks without leaking loops", async () => {
    const { rerender, unmount } = render(<AssistantOrb variant="mala" state="speaking" level={0.5} />);
    await frames(2);
    rerender(<AssistantOrb variant="ink" state="speaking" level={0.5} />);
    await frames(2);
    rerender(<AssistantOrb variant="waveform" state="speaking" level={0.5} />);
    await frames(2);
    expect(queue.size).toBe(1);
    unmount();
    expect(queue.size).toBe(0);
  });

  it("has no axe violations in any look", async () => {
    for (const v of ART) {
      const { container, unmount } = render(<AssistantOrb variant={v} state="thinking" />);
      expect(await axeViolations(container)).toEqual([]);
      unmount();
    }
  });
});

describe("AssistantOrb variants: drawing", () => {
  it("draws a first frame at once in every look, sized to the box and the pixel ratio (capped at 2)", () => {
    const dpr = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", { value: 3, configurable: true });
    try {
      for (const v of ART) {
        calls.length = 0;
        const { container, unmount } = render(<AssistantOrb variant={v} state="listening" />);
        const c = container.querySelector("canvas")!;
        expect(c.width).toBe(240);
        expect(calls.some((x) => x.op === "setTransform" && x.args[0] === 2)).toBe(true);
        expect(calls.some((x) => x.op === "fill" || x.op === "stroke")).toBe(true);
        unmount();
      }
    } finally {
      Object.defineProperty(window, "devicePixelRatio", { value: dpr, configurable: true });
    }
  });

  it("shows each state in its own shape, still, under reduced motion, and never asks for a frame", () => {
    system(true);
    for (const v of ART) {
      const seen = new Set<string>();
      for (const s of assistantOrbStates) {
        const from = calls.length;
        const { unmount } = render(<AssistantOrb variant={v} state={s} level={0.7} />);
        seen.add(shape(from));
        unmount();
      }
      expect(seen.size, v).toBe(assistantOrbStates.length);
    }
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("draws the same still pose every time (stable for snapshots and screenshots)", () => {
    system(true);
    for (const v of ART) {
      const a = calls.length;
      render(<AssistantOrb variant={v} state="speaking" />).unmount();
      const first = shape(a);
      const b = calls.length;
      render(<AssistantOrb variant={v} state="speaking" />).unmount();
      expect(shape(b)).toBe(first);
    }
  });

  it("redraws the still pose when the state changes under reduced motion", () => {
    system(true);
    const { rerender } = render(<AssistantOrb variant="rings" state="idle" />);
    const from = calls.length;
    rerender(<AssistantOrb variant="rings" state="thinking" />);
    expect(calls.slice(from).some((c) => c.op === "arc")).toBe(true);
  });

  it("animates on every frame while running, follows the level while listening and ignores it when idle", async () => {
    const run = async (state: AssistantOrbState, level: number) => {
      calls.length = 0;
      const { unmount } = render(<AssistantOrb variant="mala" state={state} level={level} />);
      await frames(30);
      const from = calls.length;
      await frame();
      const out = shape(from);
      unmount();
      return out;
    };
    const quiet = await run("listening", 0);
    const loud = await run("listening", 1);
    expect(loud).not.toBe(quiet);
    expect(await run("idle", 0)).toBe(await run("idle", 1));
  });

  it("does no frame work when paused, but redraws for a new state", async () => {
    const { rerender } = render(<AssistantOrb variant="graph" state="listening" level={0.6} paused />);
    expect(queue.size).toBe(0);
    const from = calls.length;
    rerender(<AssistantOrb variant="graph" state="thinking" level={0.6} paused />);
    expect(calls.length).toBeGreaterThan(from);
    expect(queue.size).toBe(0);
    rerender(<AssistantOrb variant="graph" state="thinking" level={0.6} />);
    expect(queue.size).toBe(1);
  });

  it("rests while off screen and picks up when it comes back", async () => {
    render(<AssistantOrb variant="halftone" state="speaking" level={0.6} />);
    await frames(2);
    const io = IO.all.find((o) => !o.disconnected)!;
    io.show(false);
    await frames(2);
    expect(queue.size).toBe(0);
    io.show(true);
    expect(queue.size).toBe(1);
  });

  it("keeps one loop through StrictMode remounts and cancels it on unmount", async () => {
    const { unmount } = render(
      <React.StrictMode>
        <AssistantOrb variant="ink" state="speaking" level={0.8} />
      </React.StrictMode>
    );
    await frames(3);
    expect(queue.size).toBe(1);
    unmount();
    expect(queue.size).toBe(0);
    expect(RO.all.every((r) => r.disconnected)).toBe(true);
  });

  it("draws the string as a bar in a wide box and as the square logo in a square one", () => {
    system(true);
    box = { width: 192, height: 64 };
    const a = calls.length;
    render(<AssistantOrb variant="string" state="idle" />).unmount();
    const bar = calls.slice(a).filter((c) => c.op === "lineTo");
    box = { width: 32, height: 32 };
    const b = calls.length;
    render(<AssistantOrb variant="string" state="idle" size={32} />).unmount();
    const square = calls.slice(b).filter((c) => c.op === "lineTo");
    expect(Math.max(...bar.map((c) => c.args[0]!))).toBeGreaterThan(150);
    expect(Math.max(...square.map((c) => c.args[0]!))).toBeLessThanOrEqual(32);
  });

  it("slides the string's bead the other way in right-to-left", async () => {
    box = { width: 300, height: 100 };
    const beadX = async (dir: "ltr" | "rtl") => {
      document.documentElement.setAttribute("dir", dir);
      calls.length = 0;
      const { unmount } = render(<AssistantOrb variant="string" state="thinking" />);
      await frames(20, 25);
      const from = calls.length;
      await frame(25);
      const ring = calls.slice(from).find((c) => c.op === "ellipse")!;
      unmount();
      return ring.args[0]!;
    };
    const ltr = await beadX("ltr");
    const rtl = await beadX("rtl");
    expect(Math.abs(ltr - 150)).toBeGreaterThan(10);
    expect(ltr - 150).toBeCloseTo(-(rtl - 150), 0);
  });
});

describe("ink look colours", () => {
  it("is one ink in the paper style, the primary and chart hues in colour, red for an error and grey when muted", () => {
    system(true);
    const fills = (state: AssistantOrbState, paper: boolean) => {
      const from = calls.length;
      const { unmount } = render(
        <div data-style={paper ? "paper" : undefined}>
          <AssistantOrb variant="mala" state={state} style={tokens} />
        </div>
      );
      unmount();
      // Paint only: the cuts (destination-out) erase and carry no colour.
      return new Set(calls.slice(from).filter((c) => (c.op === "fill" || c.op === "stroke") && c.comp !== "destination-out").map((c) => (c.op === "fill" ? c.fill : c.stroke)));
    };
    expect(fills("idle", true)).toEqual(new Set(["rgb(9, 9, 9)"]));
    expect(fills("idle", false)).toEqual(new Set(["rgb(1, 2, 3)", "rgb(6, 6, 6)", "rgb(2, 2, 2)"]));
    expect(fills("error", true)).toEqual(new Set(["rgb(200, 0, 0)"]));
    expect(fills("muted", false)).toEqual(new Set(["rgb(120, 120, 120)"]));
  });

  it("reads the palette from the element's tokens and knows a dark surface", () => {
    const wrap = document.createElement("div");
    wrap.className = "dark";
    const el = document.createElement("div");
    for (const [k, v] of Object.entries(tokens)) el.style.setProperty(k, String(v));
    wrap.appendChild(el);
    document.body.appendChild(wrap);
    const p = readOrbArtPalette(el, "listening");
    expect(p).toMatchObject({ paper: false, dark: true, main: "rgb(1, 2, 3)", second: "rgb(6, 6, 6)", third: "rgb(2, 2, 2)" });
    expect(p.lineAlpha).toBeLessThan(1);
    wrap.setAttribute("data-style", "paper");
    expect(readOrbArtPalette(el, "listening")).toMatchObject({ paper: true, main: "rgb(9, 9, 9)", lineAlpha: 1 });
    wrap.remove();
  });
});

describe("LevelHistory", () => {
  it("reads the level of a moment ago, between samples", () => {
    const h = new LevelHistory();
    expect(h.at(1)).toBe(0);
    h.push(0, 0);
    h.push(0.1, 1);
    expect(h.at(0.05)).toBeCloseTo(0.5);
    expect(h.at(0.2)).toBe(1);
    expect(h.at(-1)).toBe(0);
    for (let i = 0; i < 300; i++) h.push(0.1 + i * 0.01, i % 2);
    expect(h.at(0.1 + 299 * 0.01)).toBe(1);
  });
});
