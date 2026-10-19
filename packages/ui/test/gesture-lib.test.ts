import { describe, expect, it } from "vitest";
import {
  applyBounds,
  dragStartDecision,
  inertiaDistance,
  inertiaStep,
  nearestIndex,
  dragProgress,
  projectRelease,
  recordSample,
  releaseDecision,
  rubberBand,
  snapIndex,
  velocityFromSamples,
  type DragSample,
} from "../src/lib/gesture";

const line = (n: number, stepMs: number, pxPerMs: number): DragSample[] => {
  const out: DragSample[] = [];
  for (let i = 0; i <= n; i++) recordSample(out, { t: i * stepMs, x: i * stepMs * pxPerMs, y: 0 });
  return out;
};

describe("velocityFromSamples", () => {
  it("is zero without two samples and px/s otherwise", () => {
    expect(velocityFromSamples([])).toEqual({ x: 0, y: 0 });
    expect(velocityFromSamples([{ t: 0, x: 5, y: 5 }])).toEqual({ x: 0, y: 0 });
    expect(velocityFromSamples(line(10, 10, 1)).x).toBeCloseTo(1000, 5);
  });

  it("uses a time window, so the sampling rate does not matter", () => {
    const slowPointer = velocityFromSamples(line(20, 16, 0.8)).x;
    const fastPointer = velocityFromSamples(line(80, 4, 0.8)).x;
    expect(slowPointer).toBeCloseTo(800, 0);
    expect(fastPointer).toBeCloseTo(800, 0);
  });

  it("only looks at the last 100 ms (a slow start then a flick is a flick)", () => {
    const s: DragSample[] = [];
    for (let t = 0; t <= 400; t += 20) recordSample(s, { t, x: t * 0.1, y: 0 }); // 100 px/s
    for (let t = 420; t <= 500; t += 20) recordSample(s, { t, x: 40 + (t - 400) * 2, y: 0 }); // 2000 px/s
    expect(velocityFromSamples(s).x).toBeGreaterThan(1500);
  });

  it("is zero when the pointer rested longer than the window before the release", () => {
    const s = line(10, 10, 1);
    expect(velocityFromSamples(s, 100 + 50).x).toBeGreaterThan(0);
    expect(velocityFromSamples(s, 100 + 150)).toEqual({ x: 0, y: 0 });
  });

  it("recordSample keeps the buffer short", () => {
    const s: DragSample[] = [];
    for (let t = 0; t < 2000; t += 8) recordSample(s, { t, x: t, y: 0 });
    expect(s.length).toBeLessThan(20);
  });
});

describe("bounds and rubber band", () => {
  it("passes values inside and stops hard at elastic 0", () => {
    expect(applyBounds(40, 0, 100)).toBe(40);
    expect(applyBounds(140, 0, 100)).toBe(100);
    expect(applyBounds(-30, 0, 100)).toBe(0);
    expect(applyBounds(5)).toBe(5);
  });

  it("pulls past a limit by the elastic factor or a curve", () => {
    expect(applyBounds(140, 0, 100, 0.5)).toBe(120);
    expect(applyBounds(-40, 0, 100, 0.25)).toBe(-10);
    expect(applyBounds(140, 0, 100, 5)).toBe(140); // factor is capped at 1
    expect(applyBounds(104, 0, 100, (o) => Math.sqrt(o))).toBe(102);
  });

  it("rubberBand grows with the overshoot and never passes its limit", () => {
    expect(rubberBand(0, 100)).toBe(0);
    expect(rubberBand(-5, 100)).toBe(0);
    const a = rubberBand(50, 100);
    const b = rubberBand(500, 100);
    const c = rubberBand(50000, 100);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeLessThan(100);
  });
});

describe("dragStartDecision", () => {
  it("waits below the threshold", () => {
    expect(dragStartDecision({ axis: "x", dx: 2, dy: 3 })).toEqual({ type: "wait" });
  });
  it("starts on the chosen axis and hands the page its scroll when the cross axis wins", () => {
    expect(dragStartDecision({ axis: "x", dx: 6, dy: 2 })).toEqual({ type: "start", axis: "x" });
    expect(dragStartDecision({ axis: "x", dx: 2, dy: 9 })).toEqual({ type: "ignore" });
    expect(dragStartDecision({ axis: "y", dx: 9, dy: 2 })).toEqual({ type: "ignore" });
    expect(dragStartDecision({ axis: "y", dx: 1, dy: -5 })).toEqual({ type: "start", axis: "y" });
  });
  it("both axes start at once, or lock to the dominant axis after the lock distance", () => {
    expect(dragStartDecision({ axis: "both", dx: 5, dy: 1 })).toEqual({ type: "start", axis: "both" });
    expect(dragStartDecision({ axis: "both", dx: 6, dy: 3, lockAxis: true })).toEqual({ type: "wait" });
    expect(dragStartDecision({ axis: "both", dx: 10, dy: 3, lockAxis: true })).toEqual({ type: "start", axis: "x" });
    expect(dragStartDecision({ axis: "both", dx: -2, dy: 12, lockAxis: true })).toEqual({ type: "start", axis: "y" });
  });
});

describe("releaseDecision", () => {
  it("commits past the distance in the direction of the offset", () => {
    expect(releaseDecision({ offset: 91 })).toBe(1);
    expect(releaseDecision({ offset: -120 })).toBe(-1);
    expect(releaseDecision({ offset: 60 })).toBe(0);
    expect(releaseDecision({ offset: 60, distance: 50 })).toBe(1);
  });
  it("commits a fast flick with enough travel", () => {
    expect(releaseDecision({ offset: 40, velocity: 600 })).toBe(1);
    expect(releaseDecision({ offset: -40, velocity: -600 })).toBe(-1);
    expect(releaseDecision({ offset: 40, velocity: 300 })).toBe(0);
    expect(releaseDecision({ offset: 10, velocity: 900 })).toBe(0); // a twitch, not a flick
  });
  it("a fast reversal against the offset does not commit by speed", () => {
    expect(releaseDecision({ offset: 40, velocity: -900 })).toBe(0);
    expect(releaseDecision({ offset: 130, velocity: -900 })).toBe(1); // but the distance still counts
  });
});

describe("snaps, progress, projection and inertia", () => {
  it("nearestIndex and snapIndex", () => {
    expect(nearestIndex([], 3)).toBe(-1);
    expect(nearestIndex([0.5, 1], 0.9)).toBe(1);
    expect(snapIndex([0.25, 0.5, 1], 0.6)).toBe(1);
    expect(snapIndex([0.25, 0.5, 1], 0.6, { current: 1, flick: 1 })).toBe(2);
    expect(snapIndex([0.25, 0.5, 1], 0.6, { current: 2, flick: 1 })).toBe(2);
    expect(snapIndex([0.25, 0.5, 1], 0.6, { current: 0, flick: -1 })).toBe(0);
    expect(snapIndex([], 1)).toBe(-1);
  });
  it("dragProgress clamps to 0..1", () => {
    expect(dragProgress(45, 90)).toBe(0.5);
    expect(dragProgress(-300, 90)).toBe(1);
    expect(dragProgress(10, 0)).toBe(0);
  });
  it("projectRelease adds 0.2 s of travel at the release velocity", () => {
    expect(projectRelease(100, 500)).toBe(200);
    expect(projectRelease(100, -500, 0.1)).toBe(50);
  });
  it("inertia is frame-rate independent and ends where the closed form says", () => {
    const run = (hz: number, seconds: number) => {
      let v = 1200;
      let x = 0;
      for (let i = 0; i < hz * seconds; i++) {
        const s = inertiaStep(v, 6, 1 / hz);
        v = s.velocity;
        x += s.delta;
      }
      return { x, v };
    };
    const a = run(60, 1);
    const b = run(240, 1);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.v).toBeCloseTo(b.v, 6);
    expect(a.x).toBeCloseTo((1200 / 6) * (1 - Math.exp(-6)), 6);
    expect(inertiaDistance(1200, 6)).toBe(200);
    expect(inertiaStep(100, 0, 0.5)).toEqual({ velocity: 100, delta: 50 });
  });
});
