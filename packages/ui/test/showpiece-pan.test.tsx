/** PanSurface: drag with inertia, bounds, wheel, keys, recenter, composed zoom, reduced motion, a11y. */
import "./helpers/gesture-pointer";
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PanSurface, type PanSurfaceApi, type PanSurfaceProps } from "../src/patterns/pan-surface";
import { axeViolations } from "./helpers/a11y";
import { reduceMotion, resetMedia } from "./helpers/media";

let clock = 0;
let frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const run = (ms: number) => {
  for (let t = 0; t < ms; t += 16) {
    clock += 16;
    const batch = [...frames.values()];
    frames = new Map();
    act(() => batch.forEach((cb) => cb(clock)));
  }
};
const sizeOf: Record<string, [number, number]> = { "pan-surface": [400, 300], "pan-surface-content": [1000, 800] };
beforeEach(() => {
  clock = 1000;
  frames = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.set(++frameId, cb);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => void frames.delete(id));
  const dim = (prop: string, index: number) =>
    vi.spyOn(HTMLElement.prototype, prop as "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return sizeOf[this.getAttribute("data-slot") ?? ""]?.[index] ?? 0;
    });
  dim("clientWidth", 0);
  dim("clientHeight", 1);
  dim("offsetWidth", 0);
  dim("offsetHeight", 1);
  reduceMotion(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  resetMedia();
});

function Surface(props: Partial<PanSurfaceProps>) {
  return (
    <PanSurface label="Board" {...props}>
      <div>
        <button type="button">Card A</button>
        <p>Board content</p>
      </div>
    </PanSurface>
  );
}
const surface = () => screen.getByRole("group", { name: "Board" });
const content = () => document.querySelector('[data-slot="pan-surface-content"]') as HTMLElement;
const pos = () => ({
  x: parseFloat(surface().style.getPropertyValue("--sutra-drag-x")) || 0,
  y: parseFloat(surface().style.getPropertyValue("--sutra-drag-y")) || 0,
});
const touch = { pointerId: 1, pointerType: "touch", isPrimary: true } as const;
const at = (x: number, y = 0) => ({ ...touch, clientX: x, clientY: y });
const drag = (el: HTMLElement, dx: number, dy: number, { steps = 5, gap = 16, release = true } = {}) => {
  fireEvent.pointerDown(el, at(100, 100));
  for (let i = 1; i <= steps; i++) {
    clock += gap;
    fireEvent.pointerMove(el, at(100 + (dx / steps) * i, 100 + (dy / steps) * i));
  }
  if (release) fireEvent.pointerUp(el, at(100 + dx, 100 + dy));
};

describe("PanSurface structure", () => {
  it("is a labelled, focusable group with the content in the DOM and a hint", () => {
    render(<Surface />);
    expect(surface()).toHaveAttribute("aria-roledescription", "pannable canvas");
    expect(surface()).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Board content")).toBeInTheDocument();
    expect(document.getElementById(surface().getAttribute("aria-describedby")!)).toHaveTextContent(/arrow keys/i);
    expect(screen.queryByRole("button", { name: "Recenter" })).toBeNull(); // controls "auto": hidden at rest
  });
  it("spreads props, merges className and composes handlers (theirs first)", () => {
    const onKeyDown = vi.fn();
    const onPointerDown = vi.fn();
    render(<Surface className="h-96" data-testid="p" onKeyDown={onKeyDown} onPointerDown={onPointerDown} />);
    expect(screen.getByTestId("p")).toHaveClass("h-96");
    expect(screen.getByTestId("p")).not.toHaveClass("h-80");
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(surface(), at(0, 0));
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
  it("lets a consumer override the role and label", () => {
    render(<Surface role="region" aria-label="Mine" />);
    expect(screen.getByRole("region", { name: "Mine" })).toBeInTheDocument();
  });
});

describe("keyboard", () => {
  it("arrow keys move the canvas opposite to the arrow, Shift moves four times as far", () => {
    render(<Surface />);
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    run(1200);
    expect(pos().x).toBeCloseTo(-48, 0);
    fireEvent.keyDown(surface(), { key: "ArrowDown", shiftKey: true });
    run(1200);
    expect(pos().y).toBeCloseTo(-192, 0);
  });
  it("stops at the edge of the canvas (half of what it overflows)", () => {
    render(<Surface />);
    for (let i = 0; i < 4; i++) fireEvent.keyDown(surface(), { key: "ArrowRight", shiftKey: true }); // 4 x 192 > 300
    run(1500);
    expect(pos().x).toBeCloseTo(-300, 0);
  });
  it("Home recenters, announces it, and the recenter button appears once moved", () => {
    render(<Surface />);
    fireEvent.keyDown(surface(), { key: "ArrowLeft" });
    run(1200);
    const button = screen.getByRole("button", { name: "Recenter" });
    fireEvent.click(button);
    run(1500);
    expect(pos().x).toBeCloseTo(0, 0);
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("Recentered");
    expect(screen.queryByRole("button", { name: "Recenter" })).toBeNull();
    fireEvent.keyDown(surface(), { key: "PageDown" });
    run(1200);
    expect(pos().y).toBeCloseTo(-240, 0);
    fireEvent.keyDown(surface(), { key: "Home" });
    run(1500);
    expect(pos().y).toBeCloseTo(0, 0);
  });
  it("leaves keys that belong to something inside the canvas", () => {
    render(<Surface />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Card A" }), { key: "ArrowRight" });
    run(600);
    expect(pos().x).toBe(0);
  });
  it("disabled drops the tab stop and ignores keys and drags", () => {
    render(<Surface disabled />);
    expect(surface()).not.toHaveAttribute("tabindex");
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    drag(surface(), -100, 0);
    run(600);
    expect(pos().x).toBe(0);
  });
});

describe("wheel", () => {
  it("moves the canvas and keeps the page from scrolling while it can move", () => {
    render(<Surface />);
    const notPrevented = fireEvent.wheel(surface(), { deltaY: 100 });
    expect(notPrevented).toBe(false);
    expect(pos().y).toBe(-100);
    fireEvent.wheel(surface(), { deltaX: 30, deltaY: 0 });
    expect(pos().x).toBe(-30);
  });
  it("hands the wheel back to the page at the edge", () => {
    render(<Surface />);
    fireEvent.wheel(surface(), { deltaY: 900 });
    expect(pos().y).toBe(-250);
    expect(fireEvent.wheel(surface(), { deltaY: 100 })).toBe(true);
  });
  it('wheel="none" ignores it', () => {
    render(<Surface wheel="none" />);
    expect(fireEvent.wheel(surface(), { deltaY: 100 })).toBe(true);
    expect(pos().y).toBe(0);
  });
});

describe("dragging", () => {
  it("follows the pointer and, released at rest, stays put; the controls then show", () => {
    const onPan = vi.fn();
    render(<Surface onPan={onPan} />);
    drag(surface(), -120, -40, { gap: 200 });
    run(600);
    expect(pos().x).toBeCloseTo(-120, 0);
    expect(pos().y).toBeCloseTo(-40, 0);
    expect(onPan).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Recenter" })).toBeInTheDocument();
  });
  it("a flick keeps gliding after the release, slows down and stays inside the bounds", () => {
    render(<Surface />);
    drag(surface(), -90, 0, { gap: 10 });
    const released = pos().x;
    run(80);
    expect(pos().x).toBeLessThan(released - 10);
    const early = pos().x;
    run(3000);
    const settled = pos().x;
    expect(settled).toBeLessThan(early);
    expect(settled).toBeGreaterThanOrEqual(-300 - 0.5);
    run(1000);
    expect(pos().x).toBeCloseTo(settled, 1); // came to rest
  });
  it("pulled past the edge it springs back inside", () => {
    render(<Surface />);
    drag(surface(), -500, 0, { gap: 200, steps: 5 });
    expect(pos().x).toBeLessThan(-300);
    run(2500);
    expect(pos().x).toBeCloseTo(-300, 0);
  });
  it("a press stops the glide", () => {
    render(<Surface />);
    drag(surface(), -90, 0, { gap: 10 });
    run(32);
    fireEvent.pointerDown(surface(), { ...at(50, 50), pointerId: 2 });
    const frozen = pos().x;
    run(300);
    expect(pos().x).toBe(frozen);
  });
  it("does not start from a data-pan-ignore part, but a drag from a button pans and swallows the click", async () => {
    const onClick = vi.fn();
    render(
      <PanSurface label="Board">
        <button type="button" onClick={onClick}>
          Open
        </button>
        <div data-pan-ignore data-testid="ignore">
          handle
        </div>
      </PanSurface>
    );
    drag(screen.getByTestId("ignore"), -100, 0, { gap: 200 });
    run(600);
    expect(pos().x).toBe(0);
    const button = screen.getByRole("button", { name: "Open" });
    drag(button, -100, 0, { gap: 200 });
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(pos().x).toBeCloseTo(-100, 0);
    await new Promise((r) => setTimeout(r, 5)); // the click guard lasts until the next task
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("axis x leaves vertical movement alone", () => {
    render(<Surface axis="x" />);
    drag(surface(), -60, 0, { gap: 200 });
    run(600);
    expect(pos().x).toBeCloseTo(-60, 0);
    expect(surface().style.touchAction).toBe("pan-y");
  });
  it('bounds="none" lets the canvas go anywhere', () => {
    render(<Surface bounds="none" />);
    drag(surface(), -900, 0, { gap: 200 });
    run(600);
    expect(pos().x).toBeCloseTo(-900, 0);
  });
  it("is free to move until it has been measured", () => {
    sizeOf["pan-surface"] = [0, 0];
    render(<Surface />);
    drag(surface(), -500, 0, { gap: 200 });
    run(600);
    expect(pos().x).toBeCloseTo(-500, 0);
    sizeOf["pan-surface"] = [400, 300];
  });
});

describe("home", () => {
  it('home="start" begins at the first edge, with no controls until it moves, and Home and Recenter come back to it', () => {
    render(<Surface home="start" />);
    expect(pos()).toEqual({ x: 300, y: 250 });
    expect(screen.queryByRole("button", { name: "Recenter" })).toBeNull();
    fireEvent.keyDown(surface(), { key: "ArrowRight", shiftKey: true });
    run(1200);
    expect(pos().x).toBeCloseTo(108, 0);
    fireEvent.click(screen.getByRole("button", { name: "Recenter" }));
    run(1500);
    expect(pos().x).toBeCloseTo(300, 0);
    expect(screen.queryByRole("button", { name: "Recenter" })).toBeNull();
    fireEvent.keyDown(surface(), { key: "ArrowDown" });
    run(1200);
    fireEvent.keyDown(surface(), { key: "Home" });
    run(1500);
    expect(pos().y).toBeCloseTo(250, 0);
  });
  it("starts at the right edge in right-to-left text", () => {
    render(
      <div dir="rtl">
        <Surface home="start" />
      </div>
    );
    expect(pos().x).toBe(-300);
    expect(pos().y).toBe(250);
  });
  it("is centred by default, and a canvas that fits stays centred", () => {
    render(<Surface />);
    expect(pos()).toEqual({ x: 0, y: 0 });
  });
});

describe("zoom (composed from useZoomPan)", () => {
  const scaleOf = () => parseFloat(content().style.scale || "1");
  it("is off by default: Ctrl+wheel and + do nothing", () => {
    render(<Surface />);
    fireEvent.wheel(surface(), { deltaY: -100, ctrlKey: true });
    fireEvent.keyDown(surface(), { key: "+" });
    expect(content().style.scale).toBe("");
  });
  it("Ctrl+wheel zooms, plain wheel still pans", () => {
    render(<Surface zoom />);
    fireEvent.wheel(surface(), { deltaY: -200, ctrlKey: true });
    expect(scaleOf()).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    fireEvent.wheel(surface(), { deltaY: 50 });
    expect(pos().y).toBe(-50);
  });
  it("the buttons and the +, - and 0 keys zoom and reset; the bounds grow with the scale", () => {
    render(<Surface zoom controls />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(scaleOf()).toBeCloseTo(1.25, 2);
    fireEvent.keyDown(surface(), { key: "+" });
    expect(scaleOf()).toBeCloseTo(1.5625, 3);
    fireEvent.wheel(surface(), { deltaX: 900 });
    expect(pos().x).toBeCloseTo(-((1000 * 1.5625 - 400) / 2), 0); // wider limit than 300
    fireEvent.keyDown(surface(), { key: "-" });
    expect(scaleOf()).toBeCloseTo(1.25, 2);
    expect(Math.abs(pos().x)).toBeLessThanOrEqual((1000 * 1.25 - 400) / 2 + 0.5); // pulled back inside the smaller bounds
    fireEvent.keyDown(surface(), { key: "0" });
    run(1500);
    expect(scaleOf()).toBe(1);
    expect(pos().x).toBeCloseTo(0, 0);
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("Recentered");
  });
  it("zooms around the pointer, keeping the offset the pan hook holds", () => {
    render(<Surface zoom />);
    fireEvent.wheel(surface(), { deltaX: 100 }); // panned to x = -100
    fireEvent.wheel(surface(), { deltaY: -100, ctrlKey: true, clientX: 0, clientY: 0 }); // zoom with the pointer at the viewport centre in jsdom (rect is 0)
    expect(scaleOf()).toBeGreaterThan(1);
    expect(pos().x).toBeLessThan(0); // the pan was carried into the zoom, not reset
  });
  it("Recenter resets zoom and position", () => {
    const api = React.createRef<PanSurfaceApi>();
    render(<Surface zoom apiRef={api} />);
    fireEvent.keyDown(surface(), { key: "+" });
    fireEvent.wheel(surface(), { deltaX: 80 });
    act(() => api.current!.recenter());
    run(1500);
    expect(scaleOf()).toBe(1);
    expect(pos().x).toBeCloseTo(0, 0);
  });
});

describe("api, reduced motion and a11y", () => {
  it("apiRef pans by and to, clamped", () => {
    const api = React.createRef<PanSurfaceApi>();
    render(<Surface apiRef={api} />);
    act(() => api.current!.panTo(-5000, 20));
    run(1500);
    expect(api.current!.get().x).toBeCloseTo(-300, 0);
    act(() => api.current!.panBy(100, 0));
    run(1500);
    expect(api.current!.get().x).toBeCloseTo(-200, 0);
  });
  it("under reduced motion keys move at once and a release stops where it is", () => {
    reduceMotion(true);
    render(<Surface />);
    fireEvent.keyDown(surface(), { key: "ArrowRight" });
    expect(pos().x).toBe(-48);
    drag(surface(), -50, 0, { gap: 10 });
    const stop = pos().x;
    run(500);
    expect(pos().x).toBe(stop);
  });
  it("is axe clean, with and without controls and zoom", async () => {
    const { container, rerender } = render(<Surface />);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<Surface zoom controls />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
