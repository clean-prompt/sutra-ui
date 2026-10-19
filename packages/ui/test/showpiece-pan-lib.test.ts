/** lib/pan-surface: bounds for centred content, wheel and key meaning, whether a wheel can still move the surface. */
import { describe, expect, it } from "vitest";
import { canPan, clampPan, panBounds, panHome, panKeyAction, panLimit, wheelDelta } from "../src/lib/pan-surface";

describe("bounds", () => {
  it("lets content travel half of what it overflows, scaled", () => {
    expect(panLimit(1000, 400)).toBe(300);
    expect(panLimit(1000, 400, 2)).toBe(800);
    expect(panLimit(300, 400)).toBe(0);
    expect(panLimit(300, 400, 2)).toBe(100);
  });
  it("is symmetric, so right-to-left needs no mirroring, and null while unmeasured", () => {
    expect(panBounds({ width: 1000, height: 800 }, { width: 400, height: 300 })).toEqual({ left: -300, right: 300, top: -250, bottom: 250 });
    expect(panBounds({ width: 0, height: 800 }, { width: 400, height: 300 })).toBeNull();
    expect(panBounds({ width: 1000, height: 800 }, { width: 0, height: 0 })).toBeNull();
  });
  it("clamps an offset, and leaves it alone with no bounds", () => {
    const b = { left: -10, right: 10, top: -5, bottom: 5 };
    expect(clampPan(50, -50, b)).toEqual({ x: 10, y: -5 });
    expect(clampPan(50, -50, null)).toEqual({ x: 50, y: -50 });
  });
  it("knows when a move would change nothing", () => {
    const b = { left: -10, right: 10, top: -10, bottom: 10 };
    expect(canPan(0, 0, 5, 0, b)).toBe(true);
    expect(canPan(10, 0, 5, 0, b)).toBe(false);
    expect(canPan(10, 0, -5, 0, b)).toBe(true);
    expect(canPan(0, 0, 5, 5, null)).toBe(true);
  });
});

describe("home", () => {
  const limits = { left: -300, right: 300, top: -250, bottom: 250 };
  it("centre is the origin; start lines the inline-start and top edges up", () => {
    expect(panHome(limits, "center")).toEqual({ x: 0, y: 0 });
    expect(panHome(limits, "start", "ltr")).toEqual({ x: 300, y: 250 }); // content moved right and down: its left and top edges meet the viewport's
    expect(panHome(limits, "start", "rtl")).toEqual({ x: -300, y: 250 }); // right-to-left starts at the right edge
  });
  it("is the centre while unmeasured or when the content fits", () => {
    expect(panHome(null, "start")).toEqual({ x: 0, y: 0 });
    expect(panHome({ left: 0, right: 0, top: 0, bottom: 0 }, "start")).toEqual({ x: 0, y: 0 });
  });
});

describe("wheel", () => {
  const vp = { width: 400, height: 300 };
  it("converts lines and pages to px", () => {
    expect(wheelDelta({ deltaX: 0, deltaY: 3, deltaMode: 1 }, vp)).toEqual({ dx: 0, dy: 48 });
    expect(wheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2 }, vp)).toEqual({ dx: 0, dy: 300 });
    expect(wheelDelta({ deltaX: 4, deltaY: 9, deltaMode: 0 }, vp)).toEqual({ dx: 4, dy: 9 });
  });
  it("turns a Shift wheel sideways only when there is no sideways delta", () => {
    expect(wheelDelta({ deltaX: 0, deltaY: 40, deltaMode: 0, shiftKey: true }, vp)).toEqual({ dx: 40, dy: 0 });
    expect(wheelDelta({ deltaX: 7, deltaY: 40, deltaMode: 0, shiftKey: true }, vp)).toEqual({ dx: 7, dy: 40 });
  });
});

describe("keys", () => {
  it("moves the content opposite to the arrow, 4 times as far with Shift", () => {
    expect(panKeyAction("ArrowRight")).toEqual({ type: "pan", dx: -48, dy: 0 });
    expect(panKeyAction("ArrowUp", { step: 10 })).toEqual({ type: "pan", dx: 0, dy: 10 });
    expect(panKeyAction("ArrowLeft", { step: 10, shift: true })).toEqual({ type: "pan", dx: 40, dy: 0 });
  });
  it("pages by 80% of the viewport and Home recenters", () => {
    expect(panKeyAction("PageDown", { viewportHeight: 300 })).toEqual({ type: "pan", dx: 0, dy: -240 });
    expect(panKeyAction("PageUp", { viewportHeight: 300 })).toEqual({ type: "pan", dx: 0, dy: 240 });
    expect(panKeyAction("Home")).toEqual({ type: "recenter" });
  });
  it("zoom keys count only with zoom on", () => {
    expect(panKeyAction("+")).toBeNull();
    expect(panKeyAction("+", { zoom: true })).toEqual({ type: "zoom", direction: 1 });
    expect(panKeyAction("-", { zoom: true })).toEqual({ type: "zoom", direction: -1 });
    expect(panKeyAction("0", { zoom: true })).toEqual({ type: "zoom-reset" });
    expect(panKeyAction("x", { zoom: true })).toBeNull();
  });
});
