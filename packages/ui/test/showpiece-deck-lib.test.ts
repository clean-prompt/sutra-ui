/** lib/deck: stack maths, which side a swipe means in each reading direction, keys, release, stamps, undo rule. */
import { describe, expect, it } from "vitest";
import {
  DECK_FLY_WIDTHS,
  clampDeckIndex,
  deckFlyDistance,
  deckKeyAction,
  deckRelease,
  deckSide,
  deckSign,
  deckStackStyle,
  deckStamps,
  deckTilt,
  undoTarget,
} from "../src/lib/deck";

describe("tilt and stack", () => {
  it("tilts 0.05 degrees per px", () => {
    expect(deckTilt(100)).toBe(5);
    expect(deckTilt(-40)).toBe(-2);
    expect(deckTilt(0)).toBe(0);
  });
  it("steps the scale by .04 and the rise by 10 px per card of depth", () => {
    expect(deckStackStyle(0)).toEqual({ scale: 1, rise: 0 });
    expect(deckStackStyle(1)).toEqual({ scale: 0.96, rise: 10 });
    expect(deckStackStyle(2)).toEqual({ scale: 0.92, rise: 20 });
  });
  it("moves the cards behind up the stack as the top card is dragged away", () => {
    expect(deckStackStyle(1, 1)).toEqual({ scale: 1, rise: 0 });
    expect(deckStackStyle(2, 0.5)).toEqual({ scale: 0.94, rise: 15 });
    expect(deckStackStyle(1, 5)).toEqual({ scale: 1, rise: 0 }); // progress is clamped
  });
});

describe("sides follow the reading direction", () => {
  it("maps a physical swipe to start or end", () => {
    expect(deckSide(1, "ltr")).toBe("end");
    expect(deckSide(-1, "ltr")).toBe("start");
    expect(deckSide(1, "rtl")).toBe("start");
    expect(deckSide(-1, "rtl")).toBe("end");
  });
  it("is the inverse of deckSign", () => {
    for (const dir of ["ltr", "rtl"] as const) for (const side of ["start", "end"] as const) expect(deckSide(deckSign(side, dir), dir)).toBe(side);
    expect(deckSign("end", "rtl")).toBe(-1);
  });
  it("flies a card 1.2 widths towards the side, 400 px wide when unmeasured", () => {
    expect(deckFlyDistance("end", "ltr", 300)).toBe(300 * DECK_FLY_WIDTHS);
    expect(deckFlyDistance("end", "rtl", 300)).toBe(-300 * DECK_FLY_WIDTHS);
    expect(deckFlyDistance("start", "ltr", 0)).toBe(-480);
  });
});

describe("release", () => {
  it("commits past 90 px and on a flick, not on a short slow drag or a reversal", () => {
    expect(deckRelease(120, 0, "ltr")).toBe("end");
    expect(deckRelease(-120, 0, "ltr")).toBe("start");
    expect(deckRelease(50, 800, "ltr")).toBe("end");
    expect(deckRelease(40, 0, "ltr")).toBeNull();
    expect(deckRelease(50, -900, "ltr")).toBeNull();
  });
  it("mirrors in right-to-left text", () => {
    expect(deckRelease(120, 0, "rtl")).toBe("start");
    expect(deckRelease(-120, 0, "rtl")).toBe("end");
  });
  it("takes a custom distance", () => {
    expect(deckRelease(60, 0, "ltr", { distance: 50 })).toBe("end");
  });
});

describe("stamps", () => {
  it("shows the stamp of the side being dragged to, after a dead zone, full before the commit distance", () => {
    expect(deckStamps(0, "ltr")).toEqual({ start: 0, end: 0 });
    expect(deckStamps(10, "ltr").end).toBe(0);
    expect(deckStamps(90, "ltr").end).toBe(1);
    expect(deckStamps(-90, "ltr")).toEqual({ start: 1, end: 0 });
    const mid = deckStamps(45, "ltr").end;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
  it("swaps in right-to-left text", () => {
    expect(deckStamps(90, "rtl")).toEqual({ start: 1, end: 0 });
  });
});

describe("keys", () => {
  it("arrows are physical, Enter is the end side, Ctrl or Command Z undoes", () => {
    expect(deckKeyAction("ArrowRight", "ltr")).toEqual({ type: "swipe", side: "end" });
    expect(deckKeyAction("ArrowLeft", "ltr")).toEqual({ type: "swipe", side: "start" });
    expect(deckKeyAction("ArrowRight", "rtl")).toEqual({ type: "swipe", side: "start" });
    expect(deckKeyAction("ArrowLeft", "rtl")).toEqual({ type: "swipe", side: "end" });
    expect(deckKeyAction("Enter", "rtl")).toEqual({ type: "swipe", side: "end" });
    expect(deckKeyAction("z", "ltr", { ctrl: true })).toEqual({ type: "undo" });
    expect(deckKeyAction("z", "ltr", { meta: true })).toEqual({ type: "undo" });
  });
  it("ignores other keys, a bare z and redo", () => {
    expect(deckKeyAction("a", "ltr")).toBeNull();
    expect(deckKeyAction("z", "ltr")).toBeNull();
    expect(deckKeyAction("z", "ltr", { ctrl: true, shift: true })).toBeNull();
    expect(deckKeyAction("ArrowUp", "ltr")).toBeNull();
  });
});

describe("index and undo", () => {
  it("keeps the index in 0..count", () => {
    expect([clampDeckIndex(-2, 5), clampDeckIndex(3, 5), clampDeckIndex(9, 5), clampDeckIndex(NaN, 5), clampDeckIndex(2, 0)]).toEqual([0, 3, 5, 0, 0]);
  });
  it("undoes only the swipe just before the current card, and only while it is the same card", () => {
    const keys = ["a", "b", "c"];
    const keyOf = (i: number) => keys[i];
    const history = [{ index: 0, key: "a", side: "start" as const }, { index: 1, key: "b", side: "end" as const }];
    expect(undoTarget(history, 2, keyOf)).toEqual(history[1]);
    expect(undoTarget(history, 1, keyOf)).toBeNull(); // the index moved elsewhere
    expect(undoTarget(history, 2, (i) => (i === 1 ? "z" : keys[i]))).toBeNull(); // the list changed
    expect(undoTarget([], 2, keyOf)).toBeNull();
  });
});
