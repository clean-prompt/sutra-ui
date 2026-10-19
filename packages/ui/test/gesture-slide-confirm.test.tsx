/** SlideToConfirm: slider semantics and keys, drag to confirm, snap-back spring, loading and promises, controlled, reduced motion, axe. */
import "./gesture-pointer";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlideToConfirm } from "../src/primitives/slide-to-confirm";
import { slideConfirms, slideProgress } from "../src/lib/gesture";
import { axeViolations } from "./a11y";

const original = window.matchMedia;
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: on && query.includes("reduce") })) as typeof window.matchMedia;
};
let clock = 0;
let frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const run = (ms: number) => {
  for (let t = 0; t < ms; t += 16) {
    clock += 16;
    const batch = [...frames.values()];
    frames = new Map();
    batch.forEach((cb) => cb(clock));
  }
};
const rect = (width: number) => ({ width, height: 48, top: 0, left: 0, right: width, bottom: 48, x: 0, y: 0, toJSON() {} }) as DOMRect;
beforeEach(() => {
  clock = 1000;
  frames = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.set(++frameId, cb);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => void frames.delete(id));
  const real = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const slot = this.getAttribute("data-slot");
    if (slot === "slide-to-confirm") return rect(300); // travel = 300 - 40 - 8 = 252
    if (slot === "slide-to-confirm-thumb") return rect(40);
    return real.call(this);
  });
  reduceMotion(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = original;
});

const touch = { pointerId: 1, pointerType: "touch", isPrimary: true } as const;
const at = (x: number) => ({ ...touch, clientX: x, clientY: 0 });
const tick = (ms: number) => {
  clock += ms;
};
const TRAVEL = 252;
const thumb = () => screen.getByRole("slider");
const root = () => document.querySelector<HTMLElement>('[data-slot="slide-to-confirm"]')!;
const x = () => parseFloat(root().style.getPropertyValue("--sutra-drag-x"));
function slide(to: number, release = to) {
  fireEvent.pointerDown(thumb(), at(100));
  for (let i = 1; i <= 5; i++) {
    tick(100);
    fireEvent.pointerMove(thumb(), at(100 + (to * i) / 5));
  }
  tick(200);
  fireEvent.pointerUp(thumb(), at(100 + release));
}

describe("slideProgress / slideConfirms (pure)", () => {
  it("maps the offset to 0..1 and confirms from 90%", () => {
    expect(slideProgress(126, 252)).toBe(0.5);
    expect(slideProgress(-5, 252)).toBe(0);
    expect(slideProgress(900, 252)).toBe(1);
    expect(slideProgress(10, 0)).toBe(0);
    expect(slideConfirms(226, 252)).toBe(false);
    expect(slideConfirms(227, 252)).toBe(true);
  });
});

describe("SlideToConfirm", () => {
  it("is a slider with a name, a range and keys", () => {
    render(<SlideToConfirm />);
    expect(thumb()).toHaveAccessibleName("Slide to confirm");
    expect(thumb()).toHaveAttribute("aria-valuemin", "0");
    expect(thumb()).toHaveAttribute("aria-valuemax", "100");
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    expect(thumb()).toHaveAttribute("tabindex", "0");
  });

  it("follows the thumb, writes the value without rendering and snaps back from a short slide", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.pointerDown(thumb(), at(100));
    fireEvent.pointerMove(thumb(), at(110));
    fireEvent.pointerMove(thumb(), at(226));
    expect(x()).toBe(126);
    expect(thumb()).toHaveAttribute("aria-valuenow", "50");
    expect(root()).toHaveAttribute("data-state", "dragging");
    expect(root().style.getPropertyValue("--sutra-slide-progress")).toBe("0.500");
    fireEvent.pointerMove(thumb(), at(2000));
    expect(x()).toBe(TRAVEL); // bounded at the end of the track
    fireEvent.pointerMove(thumb(), at(-500));
    expect(x()).toBe(0);
    fireEvent.pointerMove(thumb(), at(226));
    tick(300);
    fireEvent.pointerUp(thumb(), at(226));
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => run(3000));
    expect(x()).toBe(0);
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    expect(root()).toHaveAttribute("data-state", "idle");
  });

  it("does not re-render per pointer move", () => {
    const onRender = vi.fn();
    render(
      <React.Profiler id="slide" onRender={onRender}>
        <SlideToConfirm />
      </React.Profiler>
    );
    fireEvent.pointerDown(thumb(), at(100));
    fireEvent.pointerMove(thumb(), at(110));
    const commits = onRender.mock.calls.length;
    for (let i = 1; i <= 25; i++) fireEvent.pointerMove(thumb(), at(110 + i * 4));
    expect(onRender.mock.calls.length).toBe(commits);
    expect(thumb()).toHaveAttribute("aria-valuenow", String(Math.round((110 / TRAVEL) * 100)));
    fireEvent.pointerUp(thumb(), at(210));
  });

  it("confirms when released past 90% and stays at the end", () => {
    const onConfirm = vi.fn();
    const onConfirmedChange = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} onConfirmedChange={onConfirmedChange} confirmedLabel="Sent" />);
    slide(240);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirmedChange).toHaveBeenCalledWith(true);
    act(() => run(3000));
    expect(x()).toBe(TRAVEL);
    expect(root()).toHaveAttribute("data-state", "confirmed");
    expect(thumb()).toHaveAttribute("aria-valuenow", "100");
    expect(thumb()).toHaveAttribute("aria-valuetext", "Sent");
    expect(screen.getByRole("status")).toHaveTextContent("Sent");
    // locked: a second slide does nothing
    slide(-100);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not confirm on speed alone: a fast flick that stops short springs back", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.pointerDown(thumb(), at(100));
    tick(10);
    fireEvent.pointerMove(thumb(), at(160));
    tick(10);
    fireEvent.pointerMove(thumb(), at(220));
    fireEvent.pointerUp(thumb(), at(220));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("arrow keys step, Home resets, End, Enter and Space confirm", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    expect(thumb()).toHaveAttribute("aria-valuenow", "10");
    fireEvent.keyDown(thumb(), { key: "ArrowUp" });
    expect(thumb()).toHaveAttribute("aria-valuenow", "20");
    act(() => run(2000));
    expect(x()).toBeCloseTo(0.2 * TRAVEL, 5);
    fireEvent.keyDown(thumb(), { key: "ArrowLeft" });
    expect(thumb()).toHaveAttribute("aria-valuenow", "10");
    fireEvent.keyDown(thumb(), { key: "ArrowLeft" });
    fireEvent.keyDown(thumb(), { key: "ArrowLeft" });
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    fireEvent.keyDown(thumb(), { key: "Home" });
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    expect(onConfirm).not.toHaveBeenCalled();
    for (const key of ["Enter", " ", "End"]) {
      cleanup();
      onConfirm.mockClear();
      render(<SlideToConfirm onConfirm={onConfirm} />);
      fireEvent.keyDown(thumb(), { key });
      expect(onConfirm).toHaveBeenCalledTimes(1);
    }
  });

  it("stepping to the end with the arrow keys confirms; the step is configurable", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} step={50} />);
    fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("a promise keeps it busy, a rejection slides it back", async () => {
    let reject!: (e: Error) => void;
    const onConfirm = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    render(<SlideToConfirm onConfirm={onConfirm} />);
    fireEvent.keyDown(thumb(), { key: "Enter" });
    expect(root()).toHaveAttribute("data-state", "loading");
    expect(root()).toHaveAttribute("aria-busy", "true");
    await act(async () => reject(new Error("no")));
    expect(root()).toHaveAttribute("data-state", "idle");
    act(() => run(3000));
    expect(x()).toBe(0);
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
  });

  it("a resolved promise stays confirmed", async () => {
    render(<SlideToConfirm onConfirm={() => Promise.resolve()} />);
    fireEvent.keyDown(thumb(), { key: "Enter" });
    await act(async () => {});
    expect(root()).toHaveAttribute("data-state", "confirmed");
  });

  it("loading shows a spinner and locks the control", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm loading onConfirm={onConfirm} />);
    expect(root()).toHaveAttribute("data-state", "loading");
    expect(x()).toBe(TRAVEL); // at the end while it works
    expect(thumb()).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Confirming…")).toBeInTheDocument();
    slide(-150);
    fireEvent.keyDown(thumb(), { key: "Home" });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(x()).toBe(TRAVEL);
  });

  it("disabled never moves or confirms", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm disabled onConfirm={onConfirm} />);
    expect(thumb()).toHaveAttribute("aria-disabled", "true");
    expect(thumb()).toHaveAttribute("tabindex", "-1");
    slide(250);
    fireEvent.keyDown(thumb(), { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(x()).toBe(0);
  });

  it("is controlled with confirmed: a parent can reset it, and ignoring the change slides it back", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<SlideToConfirm confirmed onConfirm={onConfirm} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "100");
    expect(x()).toBe(TRAVEL);
    rerender(<SlideToConfirm confirmed={false} onConfirm={onConfirm} />);
    act(() => run(3000));
    expect(x()).toBe(0);
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(thumb(), { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    act(() => run(3000));
    expect(x()).toBe(0); // the parent did not accept: back home
  });

  it("starts at the end with defaultConfirmed", () => {
    render(<SlideToConfirm defaultConfirmed />);
    expect(root()).toHaveAttribute("data-state", "confirmed");
    expect(x()).toBe(TRAVEL);
  });

  it("only the thumb starts a drag, and the release is instant under reduced motion", () => {
    reduceMotion(true);
    render(<SlideToConfirm />);
    fireEvent.pointerDown(root(), at(100));
    fireEvent.pointerMove(root(), at(200));
    expect(x()).toBe(0);
    fireEvent.pointerUp(root(), at(200));
    slide(100);
    expect(x()).toBe(0); // instant snap-back
  });

  it("keeps consumer props, forwards the ref, and has no axe violations", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<SlideToConfirm ref={ref} data-testid="s" className="custom" label="Slide to pay" />);
    expect(ref.current).toBe(screen.getByTestId("s"));
    expect(ref.current).toHaveClass("custom");
    expect(screen.getByRole("slider", { name: "Slide to pay" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
