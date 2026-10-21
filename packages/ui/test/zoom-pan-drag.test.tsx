/** useZoomPan on useDrag: a one-pointer pan re-renders nothing, reports every move, a pinch hands over and back, controls opt out. */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "./helpers/gesture-pointer";
import { useZoomPan } from "../src/hooks/use-zoom-pan";
import { ZoomPan } from "../src/patterns/zoom-pan";

const mouse = (x: number, y: number, extra: object = {}) => ({ pointerId: 1, pointerType: "mouse", button: 0, buttons: 1, clientX: x, clientY: y, ...extra });
const finger = (id: number, x: number, y: number) => ({ pointerId: id, pointerType: "touch", clientX: x, clientY: y });
const rectOf = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON() {} }) as DOMRect;

let renders = 0;
let api: ReturnType<typeof useZoomPan>;
function Probe({ onValueChange }: { onValueChange?: (s: unknown) => void }) {
  const zp = useZoomPan({ onValueChange });
  api = zp;
  renders++;
  return (
    <div data-testid="vp" ref={zp.ref} {...zp.handlers} tabIndex={0}>
      <button type="button">inside</button>
      <div data-testid="content" style={zp.contentStyle} />
    </div>
  );
}
const vp = () => screen.getByTestId("vp");
const vx = () => vp().style.getPropertyValue("--sutra-zoom-x");
const vy = () => vp().style.getPropertyValue("--sutra-zoom-y");

describe("useZoomPan pan on useDrag", () => {
  it("follows the pointer through CSS variables, reports every move and commits state when it ends", () => {
    const onValueChange = vi.fn();
    render(<Probe onValueChange={onValueChange} />);
    vp().getBoundingClientRect = rectOf;
    fireEvent.pointerDown(vp(), mouse(10, 10));
    fireEvent.pointerMove(vp(), mouse(25, 40));
    expect(vx()).toBe("15px");
    expect(vy()).toBe("30px");
    expect(onValueChange).toHaveBeenLastCalledWith({ scale: 1, x: 15, y: 30 });
    fireEvent.pointerMove(vp(), mouse(30, 40));
    expect(api.getState()).toEqual({ scale: 1, x: 20, y: 30 });
    expect(api.x).toBe(0); // React state catches up when the pan ends
    expect(onValueChange).toHaveBeenCalledTimes(2);
    fireEvent.pointerUp(vp(), mouse(30, 40));
    expect(api.state).toEqual({ scale: 1, x: 20, y: 30 });
    expect(screen.getByTestId("content").style.transform).toContain("scale(1)");
    expect(vx()).toBe("20px");
  });

  it("renders only at the press and the release, not per move", () => {
    renders = 0;
    render(<Probe />);
    fireEvent.pointerDown(vp(), mouse(0, 0));
    fireEvent.pointerMove(vp(), mouse(1, 1)); // the drag starts here (its `dragging` flag flips once)
    const afterStart = renders;
    for (let i = 2; i <= 30; i++) fireEvent.pointerMove(vp(), mouse(i, i));
    expect(renders).toBe(afterStart);
    fireEvent.pointerUp(vp(), mouse(30, 30));
    expect(renders).toBeLessThanOrEqual(afterStart + 6); // the release flips the flags and commits the offset
  });

  it("keeps panning where the keys and the reset left it", () => {
    render(<Probe />);
    fireEvent.pointerDown(vp(), mouse(0, 0));
    fireEvent.pointerMove(vp(), mouse(10, 0));
    fireEvent.pointerUp(vp(), mouse(10, 0));
    fireEvent.keyDown(vp(), { key: "ArrowLeft" });
    expect(api.state.x).toBe(50);
    expect(vx()).toBe("50px");
    fireEvent.pointerDown(vp(), mouse(0, 0));
    fireEvent.pointerMove(vp(), mouse(5, 0));
    expect(api.getState().x).toBe(55);
    fireEvent.pointerUp(vp(), mouse(5, 0));
    fireEvent.doubleClick(vp());
    expect(api.state).toEqual({ scale: 1, x: 0, y: 0 });
    expect(vx()).toBe("0px");
  });

  it("does not pan from a control, another button or a second mouse press", () => {
    const onValueChange = vi.fn();
    render(<Probe onValueChange={onValueChange} />);
    fireEvent.pointerDown(screen.getByRole("button"), mouse(0, 0));
    fireEvent.pointerMove(vp(), mouse(30, 30));
    fireEvent.pointerDown(vp(), mouse(0, 0, { button: 2, buttons: 2 }));
    fireEvent.pointerMove(vp(), mouse(30, 30));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("a pinch zooms around the midpoint and the remaining finger carries on panning", () => {
    render(<Probe />);
    vp().getBoundingClientRect = rectOf;
    fireEvent.pointerDown(vp(), finger(1, 80, 100));
    fireEvent.pointerMove(vp(), finger(1, 90, 100)); // one finger: pans
    expect(api.getState().x).toBe(10);
    fireEvent.pointerDown(vp(), finger(2, 120, 100));
    fireEvent.pointerMove(vp(), finger(2, 160, 100)); // two fingers: zoom, no pan from finger 1
    expect(api.getState().scale).toBeGreaterThan(1);
    const zoomed = api.getState();
    fireEvent.pointerUp(vp(), finger(2, 160, 100));
    expect(api.getState()).toEqual(zoomed);
    fireEvent.pointerMove(vp(), finger(1, 100, 100)); // finger 1 resumes from its last position (90): this move counts in full
    fireEvent.pointerMove(vp(), finger(1, 110, 100));
    expect(api.getState().x).toBeCloseTo(zoomed.x + 20, 5);
    fireEvent.pointerUp(vp(), finger(1, 110, 100));
    expect(api.state.scale).toBe(zoomed.scale);
  });

  it("the transform reads the hook's own variables, so an ancestor's drag offset never leaks in", () => {
    render(
      <div style={{ ["--sutra-drag-x" as string]: "999px" }}>
        <ZoomPan label="Map" className="h-40">
          <svg role="img" aria-label="x" />
        </ZoomPan>
      </div>
    );
    const content = document.querySelector<HTMLElement>('[data-slot="zoom-pan-content"], [style*="translate("]')!;
    expect(content.style.transform).toMatch(/--sutra-zoom-x/);
    expect(content.style.transform).not.toMatch(/--sutra-drag/);
  });
});
