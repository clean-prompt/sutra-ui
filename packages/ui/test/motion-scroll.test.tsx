/**
 * Scroll-driven effects: the range maths (progressFor, scrollProgressOf), the feature test, useScrollProgress (script
 * fallback: data-scroll, --sutra-progress, frames, reduced motion, cleanup, StrictMode), ScrollReveal, ScrollProgressBar,
 * ScrollStage, and a stylesheet lint (every native timeline sits inside @supports, reduced motion and the end state).
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCROLL_REVEAL_RANGE, progressFor, scrollProgressOf, supportsScrollTimeline, useScrollProgress, type UseScrollProgressOptions } from "../src/hooks/use-scroll-progress";
import { ScrollProgressBar, ScrollReveal } from "../src/patterns/scroll-reveal";
import { ScrollStage } from "../src/patterns/scroll-stage";
import { axeViolations } from "./helpers/a11y";
import { reduceMotion, resetMedia } from "./helpers/media";
import { readSutraCss } from "./helpers/css";

const timelines = (on: boolean) => vi.stubGlobal("CSS", { supports: (q: string) => on && q.includes("animation-timeline") });

/** requestAnimationFrame as a queue the test flushes by hand. */
let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
const flush = () => {
  const q = [...queue.values()];
  queue = new Map();
  act(() => q.forEach((cb) => cb(0)));
};
beforeEach(() => {
  queue = new Map();
  nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => (queue.set(nextId, cb), nextId++));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => queue.delete(id));
  timelines(false);
  Object.defineProperty(document.documentElement, "clientHeight", { value: 800, configurable: true });
});
afterEach(() => {
  resetMedia();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Elements report `data-top` / `data-h` as their box, so a test can "scroll" by changing the attribute. */
function fakeLayout() {
  return vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const top = Number((this as HTMLElement).dataset?.top ?? 0);
    const height = Number((this as HTMLElement).dataset?.h ?? 0);
    return { top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON() {} } as DOMRect;
  });
}
const scrollTo = (el: HTMLElement, top: number, target: EventTarget = window) => {
  el.dataset.top = String(top);
  act(() => {
    target.dispatchEvent(new Event("scroll"));
  });
  flush();
};

describe("progressFor (viewport 800, element 200 tall)", () => {
  const at = (top: number, range?: Parameters<typeof progressFor>[2]) => progressFor({ top, height: 200 }, 800, range);

  it("entry: 0 when the top edge reaches the bottom of the scrollport, 1 when the bottom edge does", () => {
    expect(at(800)).toBe(0);
    expect(at(700)).toBe(0.5);
    expect(at(600)).toBe(1);
    expect(at(900)).toBe(0);
    expect(at(-500)).toBe(1);
  });

  it("exit: 0 when the top edge reaches the top, 1 when the bottom edge does", () => {
    expect(at(0, "exit")).toBe(0);
    expect(at(-100, "exit")).toBe(0.5);
    expect(at(-200, "exit")).toBe(1);
    expect(at(300, "exit")).toBe(0);
  });

  it("cover: from the first touch at the bottom to the last at the top", () => {
    expect(at(800, "cover")).toBe(0);
    expect(at(300, "cover")).toBe(0.5);
    expect(at(-200, "cover")).toBe(1);
  });

  it("contain: while fully inside (short element) and while fully covering (tall element)", () => {
    expect(at(600, "contain")).toBe(0);
    expect(at(300, "contain")).toBe(0.5);
    expect(at(0, "contain")).toBe(1);
    // a 2400px runway in an 800px scrollport: 0 at the top edge, 1 when the bottom edge reaches the bottom (top = -1600)
    const tall = (top: number) => progressFor({ top, height: 2400 }, 800, "contain");
    expect(tall(0)).toBe(0);
    expect(tall(-800)).toBe(0.5);
    expect(tall(-1600)).toBe(1);
    expect(tall(200)).toBe(0);
    expect(tall(-2000)).toBe(1);
    // exactly as tall as the scrollport: a step
    expect(progressFor({ top: 10, height: 800 }, 800, "contain")).toBe(0);
    expect(progressFor({ top: -10, height: 800 }, 800, "contain")).toBe(1);
  });

  it("slices of a range, like animation-range: entry 0% entry 60%", () => {
    expect(at(800, ["entry", 0, 0.6])).toBe(0);
    expect(at(740, ["entry", 0, 0.6])).toBe(0.5); // entry is 0.3 here
    expect(at(680, ["entry", 0, 0.6])).toBe(1); // entry is 0.6
    expect(at(600, ["entry", 0, 0.6])).toBe(1);
    // two numbers slice the cover range
    expect(at(300, [0.25, 0.75])).toBe(0.5);
    expect(at(800, [0.25, 0.75])).toBe(0);
    expect(at(-200, [0.25, 0.75])).toBe(1);
    // an empty slice is a step
    expect(at(690, ["entry", 0.5, 0.5])).toBe(1);
    expect(at(750, ["entry", 0.5, 0.5])).toBe(0);
  });

  it("never leaves 0..1, handles zero-height elements, and gives 0 for the scroll range", () => {
    for (const range of ["entry", "exit", "cover", "contain"] as const) {
      for (const top of [-5000, -1, 0, 1, 400, 799, 800, 5000]) {
        const p = progressFor({ top, height: 0 }, 800, range);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
        expect(Number.isFinite(p)).toBe(true);
      }
    }
    expect(progressFor({ top: 500, height: 0 }, 800, "entry")).toBe(1);
    expect(progressFor({ top: 900, height: 0 }, 800, "entry")).toBe(0);
    expect(at(100, "scroll")).toBe(0);
  });

  it("the reveal range is the same slice the CSS declares", () => {
    expect(SCROLL_REVEAL_RANGE).toEqual(["entry", 0, 0.6]);
  });
});

describe("scrollProgressOf / supportsScrollTimeline", () => {
  it("is the scroll offset over the distance that can be scrolled", () => {
    expect(scrollProgressOf(0, 2000, 500)).toBe(0);
    expect(scrollProgressOf(750, 2000, 500)).toBe(0.5);
    expect(scrollProgressOf(1500, 2000, 500)).toBe(1);
    expect(scrollProgressOf(1700, 2000, 500)).toBe(1); // overscroll
    expect(scrollProgressOf(-20, 2000, 500)).toBe(0);
    expect(scrollProgressOf(10, 400, 500)).toBe(0); // nothing to scroll
  });

  it("asks CSS.supports for the right timeline, and is false without CSS.supports", () => {
    const supports = vi.fn(() => true);
    vi.stubGlobal("CSS", { supports });
    expect(supportsScrollTimeline()).toBe(true);
    expect(supports).toHaveBeenLastCalledWith("animation-timeline: view()");
    supportsScrollTimeline("scroll");
    expect(supports).toHaveBeenLastCalledWith("animation-timeline: scroll()");
    vi.stubGlobal("CSS", {});
    expect(supportsScrollTimeline()).toBe(false);
    vi.stubGlobal("CSS", undefined);
    expect(supportsScrollTimeline()).toBe(false);
  });
});

function Probe({ options, ...rest }: { options?: UseScrollProgressOptions; [attr: `data-${string}`]: string | undefined }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useScrollProgress(ref, options);
  return <div ref={ref} data-testid="probe" {...rest} />;
}

describe("useScrollProgress (script path)", () => {
  it("marks the element and writes --sutra-progress before the first paint, then follows the scroll one frame at a time", () => {
    fakeLayout();
    render(<Probe data-top="900" data-h="200" />);
    const el = screen.getByTestId("probe");
    expect(el).toHaveAttribute("data-scroll", "script");
    expect(el.style.getPropertyValue("--sutra-progress")).toBe("0");
    scrollTo(el, 700);
    expect(el.style.getPropertyValue("--sutra-progress")).toBe("0.5");
    scrollTo(el, 500);
    expect(el.style.getPropertyValue("--sutra-progress")).toBe("1");
    // several scroll events in one frame schedule one frame
    el.dataset.top = "700";
    act(() => {
      for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("scroll"));
    });
    expect(queue.size).toBe(1);
    flush();
    expect(el.style.getPropertyValue("--sutra-progress")).toBe("0.5");
  });

  it("writes only when the value changed, and reports it through onProgress", () => {
    fakeLayout();
    const onProgress = vi.fn();
    render(<Probe data-top="900" data-h="200" options={{ onProgress }} />);
    const el = screen.getByTestId("probe");
    const set = vi.spyOn(el.style, "setProperty");
    const base = onProgress.mock.calls.length;
    scrollTo(el, 900); // same position: nothing new
    expect(set).not.toHaveBeenCalled();
    expect(onProgress.mock.calls.length).toBe(base);
    scrollTo(el, 700);
    expect(set).toHaveBeenCalledWith("--sutra-progress", "0.5");
    expect(onProgress).toHaveBeenLastCalledWith(0.5);
  });

  it("is passive to native timelines: nothing happens where the browser has them, unless `always`", () => {
    fakeLayout();
    timelines(true);
    const { unmount } = render(<Probe data-top="700" data-h="200" />);
    const el = screen.getByTestId("probe");
    expect(el).not.toHaveAttribute("data-scroll");
    expect(el.style.getPropertyValue("--sutra-progress")).toBe("");
    unmount();
    render(<Probe data-top="700" data-h="200" options={{ always: true }} />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-scroll", "script");
    expect(screen.getByTestId("probe").style.getPropertyValue("--sutra-progress")).toBe("0.5");
  });

  it("does nothing under reduced motion or when disabled (end state: no attribute, no variable, no listener)", () => {
    fakeLayout();
    const add = vi.spyOn(window, "addEventListener");
    reduceMotion(true);
    const { unmount } = render(<Probe data-top="900" data-h="200" />);
    expect(screen.getByTestId("probe")).not.toHaveAttribute("data-scroll");
    expect(screen.getByTestId("probe").style.getPropertyValue("--sutra-progress")).toBe("");
    expect(add.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(0);
    unmount();
    reduceMotion(false);
    render(<Probe data-top="900" data-h="200" options={{ enabled: false }} />);
    expect(screen.getByTestId("probe")).not.toHaveAttribute("data-scroll");
  });

  it("follows a scroller element (its top and height), and the scroller's own progress for range 'scroll'", () => {
    fakeLayout();
    const scroller = document.createElement("div");
    scroller.dataset.top = "100";
    Object.defineProperty(scroller, "clientHeight", { value: 400 });
    Object.defineProperty(scroller, "scrollHeight", { value: 1400 });
    document.body.appendChild(scroller);
    const ref = { current: scroller };
    function InScroller({ range }: { range?: "scroll" }) {
      const el = React.useRef<HTMLDivElement>(null);
      useScrollProgress(el, { scroller: ref, range });
      return <div ref={el} data-testid="inner" data-top="400" data-h="200" />;
    }
    render(<InScroller />);
    const inner = screen.getByTestId("inner");
    // top 400 - scroller top 100 = 300 of 400: entry progress (400 - 300) / 200 = 0.5
    expect(inner.style.getPropertyValue("--sutra-progress")).toBe("0.5");
    inner.dataset.top = "250";
    scrollTo(inner, 250, scroller);
    expect(inner.style.getPropertyValue("--sutra-progress")).toBe("1");
    render(<InScroller range="scroll" />);
    const second = screen.getAllByTestId("inner")[1]!;
    expect(second.style.getPropertyValue("--sutra-progress")).toBe("0");
    scroller.scrollTop = 500;
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    flush();
    expect(second.style.getPropertyValue("--sutra-progress")).toBe("0.5");
    scroller.remove();
  });

  it("cleans up: listeners removed, frame cancelled, attribute and variable gone, and it survives a remount", () => {
    fakeLayout();
    const removeWin = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Probe data-top="900" data-h="200" />);
    const el = screen.getByTestId("probe");
    el.dataset.top = "700";
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    }); // a frame is pending
    expect(queue.size).toBe(1);
    unmount();
    expect(queue.size).toBe(0);
    expect(removeWin.mock.calls.filter(([type]) => type === "scroll").length).toBeGreaterThan(0);
    expect(el).not.toHaveAttribute("data-scroll");
    expect(el.style.getPropertyValue("--sutra-progress")).toBe("");
    // StrictMode (every render here) already ran mount, unmount, mount: the element must still be driven afterwards
    render(<Probe data-top="800" data-h="200" data-testid2="x" />);
    expect(screen.getAllByTestId("probe").at(-1)).toHaveAttribute("data-scroll", "script");
  });

  it("does not touch window or document while rendering on the server", () => {
    vi.stubGlobal("CSS", undefined);
    expect(renderToString(<Probe data-top="0" data-h="0" />)).toContain('data-testid="probe"');
    expect(renderToString(<ScrollReveal>Hi</ScrollReveal>)).toContain("scroll-reveal");
    expect(renderToString(<ScrollStage>Hi</ScrollStage>)).toContain("scroll-stage");
  });
});

describe("ScrollReveal", () => {
  it("is the scroll-reveal utility with its direction and distance, and passes props through", () => {
    render(
      <ScrollReveal from="start" distance={40} as="section" aria-label="Intro" className="rounded" style={{ color: "red" }} data-testid="r">
        Hello
      </ScrollReveal>
    );
    const el = screen.getByTestId("r");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveClass("scroll-reveal", "rounded");
    expect(el).toHaveAttribute("data-from", "start");
    expect(el).toHaveAttribute("data-slot", "scroll-reveal");
    expect(el.style.getPropertyValue("--sutra-reveal-distance")).toBe("40px");
    expect(el.style.color).toBe("red");
  });

  it("slides up by default (no data-from) and forwards the ref", () => {
    const ref = React.createRef<HTMLElement>();
    render(<ScrollReveal ref={ref} data-testid="r" />);
    expect(screen.getByTestId("r")).not.toHaveAttribute("data-from");
    expect(screen.getByTestId("r").style.getPropertyValue("--sutra-reveal-distance")).toBe("24px");
    expect(ref.current).toBe(screen.getByTestId("r"));
  });

  it("runs the script path only where there are no native timelines, or when forced; none under reduced motion", () => {
    fakeLayout();
    const { unmount } = render(<ScrollReveal data-testid="r" data-top="900" data-h="200" />);
    expect(screen.getByTestId("r")).toHaveAttribute("data-scroll", "script");
    expect(screen.getByTestId("r").style.getPropertyValue("--sutra-progress")).toBe("0");
    unmount();
    timelines(true);
    const second = render(<ScrollReveal data-testid="r" data-top="900" data-h="200" />);
    expect(screen.getByTestId("r")).not.toHaveAttribute("data-scroll");
    second.unmount();
    render(<ScrollReveal data-testid="r" forceFallback data-top="900" data-h="200" />);
    expect(screen.getByTestId("r")).toHaveAttribute("data-scroll", "script");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ScrollReveal as="article">
        <h2>Title</h2>
        <p>Body</p>
      </ScrollReveal>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ScrollProgressBar", () => {
  it("is decorative, carries the utility and follows the scroller's progress on the script path", () => {
    fakeLayout();
    const scroller = document.createElement("div");
    Object.defineProperty(scroller, "clientHeight", { value: 300 });
    Object.defineProperty(scroller, "scrollHeight", { value: 900 });
    document.body.appendChild(scroller);
    render(<ScrollProgressBar scroller={{ current: scroller }} className="fixed" />);
    const bar = document.querySelector<HTMLElement>('[data-slot="scroll-progress-bar"]')!;
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveClass("scroll-progress-bar", "fixed");
    expect(bar.style.getPropertyValue("--sutra-progress")).toBe("0");
    scroller.scrollTop = 300;
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    flush();
    expect(bar.style.getPropertyValue("--sutra-progress")).toBe("0.5");
    scroller.remove();
  });
});

describe("ScrollStage", () => {
  it("is a sticky stage over a runway, with --sutra-progress on the root", () => {
    fakeLayout();
    const onScrollProgress = vi.fn();
    render(
      <ScrollStage runway={4} stageHeight="30rem" aria-label="Story" data-testid="s" data-top="0" data-h="3200" onScrollProgress={onScrollProgress}>
        <p>Inside</p>
      </ScrollStage>
    );
    const root = screen.getByTestId("s");
    expect(root).toHaveAttribute("data-slot", "scroll-stage");
    expect(root.style.height).toBe("400vh");
    const stage = root.querySelector<HTMLElement>('[data-slot="scroll-stage-viewport"]')!;
    expect(stage).toHaveClass("sticky", "top-0");
    expect(stage.style.height).toBe("30rem");
    expect(root).toHaveAttribute("data-scroll", "script"); // it always runs the script (children read the variable)
    expect(root.style.getPropertyValue("--sutra-progress")).toBe("0");
    scrollTo(root, -1200); // (3200 - 800) runway: halfway
    expect(root.style.getPropertyValue("--sutra-progress")).toBe("0.5");
    expect(onScrollProgress).toHaveBeenLastCalledWith(0.5);
    scrollTo(root, -2400);
    expect(root.style.getPropertyValue("--sutra-progress")).toBe("1");
  });

  it("accepts a CSS length for the runway", () => {
    render(<ScrollStage runway="250svh" data-testid="s" />);
    expect(screen.getByTestId("s").style.height).toBe("250svh");
  });

  it("under reduced motion it is an ordinary block: no runway, not sticky, no variable", () => {
    fakeLayout();
    reduceMotion(true);
    render(
      <ScrollStage data-testid="s" data-top="0" data-h="2400">
        <p>Inside</p>
      </ScrollStage>
    );
    const root = screen.getByTestId("s");
    expect(root.style.height).toBe("");
    expect(root.querySelector('[data-slot="scroll-stage-viewport"]')).not.toHaveClass("sticky");
    expect(root).not.toHaveAttribute("data-scroll");
    expect(root.style.getPropertyValue("--sutra-progress")).toBe("");
  });

  it("keeps its content reachable and has no accessibility violations", async () => {
    const { container } = render(
      <ScrollStage aria-label="Walkthrough" role="region">
        <button type="button">Next</button>
      </ScrollStage>
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("scroll utilities in styles/sutra.css", () => {
  const css = readSutraCss().replace(/\/\*[\s\S]*?\*\//g, "");
  const block = (header: string) => {
    const start = css.indexOf(header);
    expect(start, header).toBeGreaterThan(-1);
    let i = css.indexOf("{", start);
    const open = i;
    for (let depth = 1; depth > 0; ) {
      i++;
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    return css.slice(open + 1, i);
  };

  it("every native timeline is inside @supports (animation-timeline: ...)", () => {
    for (const utility of ["@utility scroll-reveal", "@utility scroll-progress-bar"]) {
      const body = block(utility);
      const withoutSupports = body.replace(/@supports \(animation-timeline: (?:view|scroll)\(\)\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
      expect(body, utility).toMatch(/@supports \(animation-timeline: (view|scroll)\(\)\)/);
      expect(withoutSupports, utility).not.toMatch(/animation-timeline|animation:/);
    }
  });

  it("the reveal runs the same slice as SCROLL_REVEAL_RANGE and ends in its natural state (no `to` keyframe)", () => {
    expect(block("@utility scroll-reveal")).toContain("animation-range: entry 0% entry 60%");
    const keyframes = block("@keyframes sutra-reveal");
    expect(keyframes).toContain("from");
    expect(keyframes).not.toMatch(/\bto\b/);
  });

  it("the script path reads --sutra-progress with a default that is the end state, and is gated by data-scroll", () => {
    const reveal = block("@utility scroll-reveal");
    expect(reveal).toContain('&[data-scroll="script"]');
    expect(reveal).toContain("var(--sutra-progress, 1)");
    expect(block("@utility scroll-progress-bar")).toContain("var(--sutra-progress, 0)");
  });

  it("reduced motion stops both animations", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce)", css.indexOf("@utility scroll-progress-bar"));
    const reduced = css.slice(at, at + 300);
    expect(reduced).toContain('[class*="scroll-reveal"]');
    expect(reduced).toContain('[class*="scroll-progress-bar"]');
    expect(reduced).toMatch(/animation:\s*none/);
  });
});
