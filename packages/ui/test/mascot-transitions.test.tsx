/**
 * Smooth changes of state for SutraMascot. The frame-drawn characters blend the pose on screen into the new state over a third
 * of a second (geometry number by number, a shape that changes form cross-fades, new parts fade in and old ones fade out) and
 * blink on the way, so the expression swaps behind shut eyes; the first blended frame goes in before the browser paints. The
 * bead's new face opens from a blink. Under reduced motion a change of state is instant.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SutraMascot } from "../src/assets/mascot";
import { blendFrames, faceKids, withEyesShut, type FNode } from "../src/assets/mascot-kit-internal";

function withReducedMotion(fn: () => void) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("reduce") })) as typeof window.matchMedia;
  try {
    fn();
  } finally {
    window.matchMedia = original;
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const byKey = (nodes: FNode[], key: string): FNode | undefined => {
  for (const n of nodes) {
    const hit = n[1] === key ? n : n[3] && byKey(n[3], key);
    if (hit) return hit;
  }
  return undefined;
};

describe("blendFrames", () => {
  const a: FNode[] = [
    ["circle", "c", { cx: 0, cy: 0, r: 2 }],
    ["path", "p", { d: "M0 0L10 0" }],
    ["g", "old", {}, [["circle", "o", { cx: 1, cy: 1, r: 1 }]]],
    ["path", "shape", { d: "M0 0L5 5" }],
  ];
  const b: FNode[] = [
    ["circle", "c", { cx: 10, cy: 4, r: 2 }],
    ["path", "p", { d: "M0 0L20 10", transform: "rotate(30 5 5)" }],
    ["circle", "new", { cx: 5, cy: 5, r: 1 }],
    ["path", "shape", { d: "M0 0C1 1 2 2 5 5" }],
  ];

  it("starts on the old pose and ends on the new one, number by number in between", () => {
    expect(byKey(blendFrames(a, b, 0, false), "c")![2]).toMatchObject({ cx: 0, cy: 0 });
    expect(byKey(blendFrames(a, b, 1, true), "c")![2]).toMatchObject({ cx: 10, cy: 4 });
    const mid = blendFrames(a, b, 0.5, false);
    expect(byKey(mid, "c")![2]).toMatchObject({ cx: 5, cy: 2 });
    expect(byKey(mid, "p")![2].d).toBe("M0 0L15 5");
  });

  it("blends a transform only one frame has from none", () => {
    expect(byKey(blendFrames(a, b, 0, false), "p")![2].transform).toBe("rotate(0 5 5)");
    expect(byKey(blendFrames(a, b, 0.5, false), "p")![2].transform).toBe("rotate(15 5 5)");
  });

  it("cross-fades a shape that changes form, fades new parts in and old ones out", () => {
    const mid = blendFrames(a, b, 0.25, false);
    expect(byKey(mid, "shape")![2]).toMatchObject({ d: "M0 0C1 1 2 2 5 5", opacity: "0.25" });
    expect(byKey(mid, "shape~")![2]).toMatchObject({ d: "M0 0L5 5", opacity: "0.75" });
    expect(byKey(mid, "new")![2].opacity).toBe("0.25");
    expect(byKey(mid, "old")![2].opacity).toBe("0.75");
    expect(byKey(mid, "o")).toBeDefined();
  });
});

describe("the blink", () => {
  it("shuts every face's eyes (not the brows) while asked, and only then", () => {
    const lids = (nodes: FNode[]) => [byKey(nodes, "flid0")![2].transform, byKey(nodes, "flid1")![2].transform];
    const face = { eyes: "open", mouth: "smile", brows: "focus" } as const;
    expect(lids(faceKids("f", face))).toEqual(["scale(1 1)", "scale(1 1)"]);
    expect(lids(withEyesShut(1, () => faceKids("f", face)))).toEqual(["scale(1 0.08)", "scale(1 0.08)"]);
    expect(byKey(withEyesShut(1, () => faceKids("f", face)), "fb0")).toBeDefined();
    expect(lids(faceKids("f", face))).toEqual(["scale(1 1)", "scale(1 1)"]);
  });
});

describe("a change of state", () => {
  const fakeFrames = () => vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });

  it("blends a frame-drawn character from the pose on screen, blinking on the way, and settles on the new state", async () => {
    fakeFrames();
    const { container, rerender } = render(<SutraMascot character="pendant" state="working" />);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    const bead = () => {
      const el = container.querySelector('[data-k="bead"]')!;
      return [Number(el.getAttribute("cx")), Number(el.getAttribute("cy"))];
    };
    const lids = () => [...container.querySelectorAll('[data-k$="lid0"], [data-k$="lid1"]')].map((el) => el.getAttribute("transform"));
    const before = bead();
    rerender(<SutraMascot character="pendant" state="sleeping" />);
    /* the first frame of the blend is drawn at once and is still the old pose: no jump, no still markup in between */
    const first = bead();
    expect(Math.hypot(first[0] - before[0], first[1] - before[1])).toBeLessThan(1.5);
    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    expect(lids().some((t) => /^scale\(1 0\.[0-3]/.test(t ?? ""))).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(container.querySelector('[data-k$="~"]')).toBeNull();
    expect(lids().every((t) => t === "scale(1 1)")).toBe(true);
  });

  it("is instant under reduced motion: the new state's still pose", () => {
    withReducedMotion(() => {
      const { container, rerender } = render(<SutraMascot character="pendant" state="working" />);
      rerender(<SutraMascot character="pendant" state="sleeping" />);
      const { container: fresh } = render(<SutraMascot character="pendant" state="sleeping" />);
      const art = (c: HTMLElement) => c.querySelector('[data-part="art"]')!.innerHTML.replace(/id="[^"]*"|url\(#[^)]*\)/g, "");
      expect(art(container)).toBe(art(fresh));
    });
  });

  it("opens the bead's new face from a blink, and not on the first render", () => {
    const { container, rerender } = render(<SutraMascot state="idle" />);
    expect(container.querySelectorAll('[data-part="lid"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="lid"][data-swap]')).toHaveLength(0);
    rerender(<SutraMascot state="happy" />);
    expect(container.querySelectorAll('[data-part="lid"][data-swap]')).toHaveLength(2);
  });
});
