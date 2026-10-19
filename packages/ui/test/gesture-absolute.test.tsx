/**
 * useDrag additions for the drag migration: absolute mode (a seek bar: the press is the first position, track fractions, RTL),
 * the `scale` option, `cancel()`, `set()` during a drag, and the pure helpers `trackPoint` and `unscaleTravel`.
 */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "./gesture-pointer";
import { useDrag, type DragBinding, type DragInfo, type UseDragOptions } from "../src/hooks/use-drag";
import { trackPoint, unscaleTravel } from "../src/lib/gesture";

const rect = (left: number, width: number, top = 0, height = 20) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} });
const at = (x: number, y = 5, extra: object = {}) => ({ pointerId: 1, clientX: x, clientY: y, ...extra });
const el = () => screen.getByTestId("box");

let binding: DragBinding;
function Box({ renders, ...options }: UseDragOptions & { renders?: { current: number } }) {
  const drag = useDrag(options);
  binding = drag;
  if (renders) renders.current++;
  return (
    <div data-testid="box" ref={drag.ref} {...drag.handlers} data-dragging={drag.dragging || undefined}>
      <div data-testid="inner" />
    </div>
  );
}
const withRect = (width = 200, left = 0) => {
  el().getBoundingClientRect = () => rect(left, width) as DOMRect;
};

describe("trackPoint and unscaleTravel", () => {
  it("clamps to the track and gives fractions from the inline start", () => {
    const r = { left: 100, top: 10, width: 200, height: 20 };
    expect(trackPoint(r, 150, 20)).toEqual({ x: 50, y: 10, fx: 0.25, fy: 0.5 });
    expect(trackPoint(r, 0, 100)).toEqual({ x: 0, y: 20, fx: 0, fy: 1 });
    expect(trackPoint(r, 900, 0)).toEqual({ x: 200, y: 0, fx: 1, fy: 0 });
    expect(trackPoint(r, 150, 20, true).fx).toBe(0.75);
    expect(trackPoint(r, 150, 20, true).x).toBe(50);
  });
  it("handles an empty track", () => {
    expect(trackPoint({ left: 0, top: 0, width: 0, height: 0 }, 5, 5, true)).toEqual({ x: 0, y: 0, fx: 0, fy: 0 });
  });
  it("divides the travel by the scale and ignores a bad scale", () => {
    expect(unscaleTravel(30, 3)).toBe(10);
    expect(unscaleTravel(30)).toBe(30);
    expect(unscaleTravel(30, 0)).toBe(30);
    expect(unscaleTravel(30, Number.NaN)).toBe(30);
  });
});

describe("useDrag absolute mode", () => {
  it("makes the press the first position, follows moves and ends on release (no buttons or threshold)", () => {
    const calls: string[] = [];
    const onStart = vi.fn((i: DragInfo) => calls.push(`start ${i.fx}`));
    const onMove = vi.fn((i: DragInfo) => calls.push(`move ${i.fx} ${i.x}`));
    const onEnd = vi.fn((i: DragInfo, c: boolean) => calls.push(`end ${i.fx} ${c}`));
    render(<Box mode="absolute" onStart={onStart} onMove={onMove} onEnd={onEnd} />);
    withRect();
    fireEvent.pointerDown(el(), at(50, 5, { button: 0 }));
    expect(calls).toEqual(["start 0.25", "move 0.25 50"]);
    expect(el()).toHaveAttribute("data-dragging");
    expect(el().style.getPropertyValue("--sutra-drag-x")).toBe("50px");
    fireEvent.pointerMove(el(), at(100));
    fireEvent.pointerMove(el(), at(999)); // beyond the end clamps
    fireEvent.pointerUp(el(), at(999));
    expect(calls.slice(2)).toEqual(["move 0.5 100", "move 1 200", "end 1 false"]);
    expect(el()).not.toHaveAttribute("data-dragging");
  });

  it("uses touch-action none, ignores a second pointer and other mouse buttons, and does not swallow the click", () => {
    const onMove = vi.fn();
    render(<Box mode="absolute" axis="x" onMove={onMove} />);
    withRect();
    expect(el().style.touchAction).toBe("none");
    fireEvent.pointerDown(el(), at(10, 5, { pointerType: "mouse", button: 2 }));
    expect(onMove).not.toHaveBeenCalled();
    fireEvent.pointerDown(el(), at(10, 5, { pointerType: "touch", pointerId: 4 }));
    fireEvent.pointerDown(el(), at(90, 5, { pointerType: "touch", pointerId: 5 }));
    expect(onMove).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(el(), at(10, 5, { pointerType: "touch", pointerId: 4 }));
    const click = vi.fn();
    el().addEventListener("click", click);
    fireEvent.click(el());
    expect(click).toHaveBeenCalledTimes(1);
    expect(fireEvent.click(el())).toBe(true);
  });

  it("measures from the right edge with rtl and from trackRef when given", () => {
    const onMove = vi.fn();
    const trackRef = React.createRef<HTMLElement>();
    function WithTrack() {
      const drag = useDrag({ mode: "absolute", rtl: true, trackRef, onMove });
      return (
        <div data-testid="box" ref={drag.ref} {...drag.handlers}>
          <div data-testid="track" ref={trackRef as React.RefObject<HTMLDivElement>} />
        </div>
      );
    }
    render(<WithTrack />);
    screen.getByTestId("track").getBoundingClientRect = () => rect(100, 100) as DOMRect;
    fireEvent.pointerDown(el(), at(125));
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ x: 25, fx: 0.75 }));
  });

  it("ends as cancelled on pointercancel and drops the session when disabled", () => {
    const onEnd = vi.fn();
    const { rerender } = render(<Box mode="absolute" onEnd={onEnd} />);
    withRect();
    fireEvent.pointerDown(el(), at(20));
    fireEvent.pointerCancel(el(), at(20));
    expect(onEnd).toHaveBeenCalledWith(expect.any(Object), true);
    fireEvent.pointerDown(el(), at(20));
    rerender(<Box mode="absolute" enabled={false} onEnd={onEnd} />);
    expect(el()).not.toHaveAttribute("data-dragging");
  });

  it("no React render per move", () => {
    const renders = { current: 0 };
    render(<Box mode="absolute" renders={renders} onMove={() => {}} />);
    withRect();
    const initial = renders.current;
    fireEvent.pointerDown(el(), at(10));
    const afterDown = renders.current;
    const perFlip = afterDown - initial; // 1 render per state flip (2 when the test renderer double-renders)
    expect(perFlip).toBeGreaterThan(0);
    for (let x = 11; x < 60; x += 2) fireEvent.pointerMove(el(), at(x));
    expect(renders.current).toBe(afterDown);
    fireEvent.pointerUp(el(), at(60));
    expect(renders.current).toBe(afterDown + perFlip);
  });
});

const touchAt = (x: number, y: number, extra: object = {}) => ({ pointerId: 1, pointerType: "touch", clientX: x, clientY: y, ...extra });

describe("useDrag scale, set during a drag and cancel", () => {
  it("divides the travel by `scale` (a zoomed layer)", () => {
    render(<Box scale={2} threshold={0} />);
    fireEvent.pointerDown(el(), touchAt(0, 0));
    fireEvent.pointerMove(el(), touchAt(40, 20));
    expect(binding.get()).toEqual({ x: 20, y: 10 });
  });

  it("set() during a drag moves the layer and the finger carries on from there", () => {
    render(<Box threshold={0} />);
    fireEvent.pointerDown(el(), touchAt(0, 0));
    fireEvent.pointerMove(el(), touchAt(10, 10));
    expect(binding.get()).toEqual({ x: 10, y: 10 });
    act(() => binding.set(100, 100));
    expect(binding.get()).toEqual({ x: 100, y: 100 });
    fireEvent.pointerMove(el(), touchAt(15, 12));
    expect(binding.get()).toEqual({ x: 105, y: 102 });
  });

  it("cancel() ends the drag as cancelled once and is a no-op when idle", () => {
    const onEnd = vi.fn();
    render(<Box threshold={0} onEnd={onEnd} />);
    act(() => binding.cancel());
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.pointerDown(el(), touchAt(0, 0));
    fireEvent.pointerMove(el(), touchAt(10, 0));
    expect(el()).toHaveAttribute("data-dragging");
    act(() => binding.cancel());
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]![1]).toBe(true);
    expect(el()).not.toHaveAttribute("data-dragging");
    fireEvent.pointerMove(el(), touchAt(50, 0));
    expect(binding.get().x).toBe(10);
  });
});

describe("useDrag captureOnPress", () => {
  it("captures on the press, starts on the first move and skips the buttons check", () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    render(<Box threshold={0} captureOnPress onStart={onStart} onMove={onMove} />);
    const capture = vi.fn();
    (el() as HTMLElement & { setPointerCapture: (id: number) => void }).setPointerCapture = capture;
    fireEvent.pointerDown(el(), { pointerId: 1, pointerType: "mouse", button: 0, clientX: 5, clientY: 5 });
    expect(capture).toHaveBeenCalledWith(1);
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.pointerMove(el(), { pointerId: 1, pointerType: "mouse", clientX: 9, clientY: 5 }); // buttons 0, as in jsdom
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ dx: 4, dy: 0 }));
  });

  it("without it a mouse move with no button pressed drops the press (the release happened outside)", () => {
    const onMove = vi.fn();
    render(<Box threshold={0} onMove={onMove} />);
    fireEvent.pointerDown(el(), { pointerId: 1, pointerType: "mouse", button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(el(), { pointerId: 1, pointerType: "mouse", clientX: 9, clientY: 5 });
    expect(onMove).not.toHaveBeenCalled();
  });
});
