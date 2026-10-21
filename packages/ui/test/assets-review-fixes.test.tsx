/**
 * Review fixes of the mascot, the Sutradhar sting and the brand marks (October 2026): the sting redraws its lockup when motion
 * turns off mid-play, restarts on a new variant, ignores the aim for the mark and pauses; a state that changes again mid-blend
 * blends from the pose on screen; one throwing drawing does not freeze the shared frame; one title contract for the four
 * assets; the astra's framings are cached within a bound; a character name that is not one is not looked up on Object.prototype;
 * the crescent geometry has one source.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SutraMascot } from "../src/assets/mascot";
import { SutradharSting } from "../src/assets/sutradhar-sting";
import { SutraAppIcon, SutraMark } from "../src/assets/brand";
import { InkEmoji } from "../src/assets/emoji-ink";
import { activeFrameCount, useFrameTicker } from "../src/assets/mascot-driver-internal";
import { frameOf } from "../src/assets/mascot-frames-internal";
import { astraView, astraViewCount } from "../src/assets/sutradhar-sting-internal";
import { CRESCENT_BEAD, CRESCENT_BOLD, CRESCENT_FINE, MARK } from "../src/assets/brand-internal";

afterEach(() => {
  document.documentElement.removeAttribute("data-motion");
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fakeFrames = () => vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
const strip = (s: string) => s.replace(/id="[^"]*"|url\(#[^)]*\)/g, "");
const art = (c: HTMLElement) => c.querySelector('[data-part="art"]') as SVGGElement;
const svgOf = (c: HTMLElement) => c.querySelector("svg") as SVGSVGElement;

describe("SutradharSting: motion, variant, aim and pause", () => {
  it("goes back to its lockup when motion turns off in the middle of a play, instead of freezing on a frame", async () => {
    fakeFrames();
    const { container } = render(<SutradharSting />);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    const { container: still } = render(<SutradharSting autoPlay={false} />);
    expect(strip(art(container).innerHTML)).not.toBe(strip(art(still).innerHTML));
    expect(svgOf(container)).toHaveAttribute("data-playing");
    await act(async () => {
      document.documentElement.setAttribute("data-motion", "reduce");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(strip(art(container).innerHTML)).toBe(strip(art(still).innerHTML));
    expect(svgOf(container)).not.toHaveAttribute("data-playing");
    expect(activeFrameCount()).toBe(0);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(strip(art(container).innerHTML)).toBe(strip(art(still).innerHTML));
    await act(async () => {
      document.documentElement.removeAttribute("data-motion");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it("starts the new variant from its first frame when the variant changes mid-play", async () => {
    fakeFrames();
    const { container, rerender } = render(<SutradharSting variant="mark" />);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    rerender(<SutradharSting variant="astra" />);
    const { container: fresh } = render(<SutradharSting variant="astra" />);
    expect(strip(art(container).innerHTML)).toBe(strip(art(fresh).innerHTML));
    expect(svgOf(container)).toHaveAttribute("data-playing");
  });

  it("the mark ignores the aim: changing it neither remounts the art nor restarts the play", async () => {
    fakeFrames();
    const { container, rerender } = render(<SutradharSting variant="mark" aim={100} />);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    const g = art(container);
    const frame = strip(g.innerHTML);
    rerender(<SutradharSting variant="mark" aim={250} />);
    expect(art(container)).toBe(g);
    expect(strip(g.innerHTML)).toBe(frame);
    /* the astra does use it */
    rerender(<SutradharSting variant="astra" aim={100} />);
    const astra = art(container);
    rerender(<SutradharSting variant="astra" aim={250} />);
    expect(art(container)).not.toBe(astra);
  });

  it("pauses: the clock stops, the frame leaves the shared driver, and it carries on from where it stood", async () => {
    fakeFrames();
    const { container, rerender } = render(<SutradharSting />);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(activeFrameCount()).toBe(1);
    rerender(<SutradharSting paused />);
    expect(svgOf(container)).toHaveAttribute("data-paused");
    expect(activeFrameCount()).toBe(0);
    const frame = strip(art(container).innerHTML);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(strip(art(container).innerHTML)).toBe(frame);
    rerender(<SutradharSting />);
    expect(svgOf(container)).not.toHaveAttribute("data-paused");
    expect(activeFrameCount()).toBe(1);
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    /* the pause was five seconds: the play has not jumped to its end */
    expect(svgOf(container)).toHaveAttribute("data-playing");
  });
});

describe("a state that changes again in the middle of a blend", () => {
  it("blends from the pose on screen, so nothing snaps", async () => {
    fakeFrames();
    const { container, rerender } = render(<SutraMascot character="pendant" state="working" />);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    const bead = () => {
      const el = container.querySelector('[data-k="bead"]')!;
      return [Number(el.getAttribute("cx")), Number(el.getAttribute("cy"))];
    };
    rerender(<SutraMascot character="pendant" state="sleeping" />);
    await act(async () => {
      vi.advanceTimersByTime(112);
    });
    /* in the middle of working -> sleeping */
    const onScreen = bead();
    rerender(<SutraMascot character="pendant" state="happy" />);
    const next = bead();
    expect(Math.hypot(next[0] - onScreen[0], next[1] - onScreen[1])).toBeLessThan(1.2);
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(container.querySelector('[data-k$="~"]')).toBeNull();
  });
});

describe("the shared frame driver", () => {
  it("keeps the other drawings (and the next frame) going when one tick throws, and reports the error once", async () => {
    fakeFrames();
    const reported = vi.fn();
    vi.stubGlobal("reportError", reported);
    const good = vi.fn();
    let bad = 0;
    function Ticker({ fn }: { fn: () => void }) {
      const ref = React.useRef<SVGSVGElement>(null);
      useFrameTicker(ref, true, fn);
      return <svg ref={ref} />;
    }
    render(
      <>
        <Ticker
          fn={() => {
            bad++;
            throw new Error("boom");
          }}
        />
        <Ticker fn={good} />
      </>
    );
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(bad).toBeGreaterThan(3);
    expect(good.mock.calls.length).toBeGreaterThan(3);
    expect(reported).toHaveBeenCalledTimes(1);
    expect(activeFrameCount()).toBe(2);
  });
});

describe("one title contract", () => {
  it("names the sting by its variant when title is true, and by the string otherwise", () => {
    const { container, rerender } = render(<SutradharSting autoPlay={false} title />);
    expect(svgOf(container)).toHaveAttribute("role", "img");
    expect(svgOf(container).querySelector("title")).toHaveTextContent("Sutradhar forms the Sutra mark");
    rerender(<SutradharSting autoPlay={false} variant="astra" title />);
    expect(svgOf(container).querySelector("title")).toHaveTextContent("Sutradhar fires a hand astra");
    rerender(<SutradharSting autoPlay={false} title="Plant the mark" />);
    expect(svgOf(container).querySelector("title")).toHaveTextContent("Plant the mark");
    rerender(<SutradharSting autoPlay={false} title={false} />);
    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true");
    expect(svgOf(container).querySelector("title")).toBeNull();
  });

  it("gives an ink emoji without a drawing an accessible name when title is true", () => {
    const { container, rerender } = render(<InkEmoji emoji="🦩" fallback title />);
    const span = container.querySelector('[data-slot="emoji"]')!;
    expect(span).toHaveAttribute("role", "img");
    expect(span).toHaveAttribute("aria-label", "🦩");
    rerender(<InkEmoji emoji="🦩" fallback title="a flamingo" />);
    expect(span).toHaveAttribute("aria-label", "a flamingo");
    rerender(<InkEmoji emoji="🦩" fallback />);
    expect(span).toHaveAttribute("aria-hidden", "true");
    expect(span).not.toHaveAttribute("role");
  });

  it("keeps naming the mascot by its state and the brand marks by their string", () => {
    const { container } = render(<SutraMascot state="listening" title />);
    expect(svgOf(container).querySelector("title")).toHaveTextContent("Sutra is listening");
    const mark = render(<SutraMark title="Sutra" />);
    expect(svgOf(mark.container)).toHaveAttribute("role", "img");
    const icon = render(<SutraAppIcon app="notes" />);
    expect(svgOf(icon.container)).toHaveAttribute("aria-hidden", "true");
  });
});

describe("the astra's framings", () => {
  it("are cached within a bound, however many fractional aims a slider passes through", () => {
    for (let i = 0; i < 300; i++) astraView(31 + i * 0.37, false);
    expect(astraViewCount()).toBeLessThanOrEqual(64);
    /* the most recent ones are still kept */
    const again = astraView(31 + 299 * 0.37, false);
    expect(astraView(31 + 299 * 0.37, false)).toBe(again);
  });
});

describe("a character name that is not one", () => {
  it("is never looked up on Object.prototype", () => {
    expect(frameOf("constructor")).toBeUndefined();
    expect(frameOf("toString")).toBeUndefined();
    expect(frameOf("bead")).toBeUndefined();
    expect(frameOf("pendant")).toBeTypeOf("function");
    const { container } = render(<SutraMascot character={"constructor" as never} />);
    expect(svgOf(container)).toHaveAttribute("data-character", "bead");
  });
});

describe("the crescent geometry", () => {
  it("has one source: the brand mark's strings and the sting's bead come from it", () => {
    expect(CRESCENT_BEAD).toBe("M-6.93 -15.52A17 17 0 1 0 6.93 -15.52A8.5 13 0 1 1 -6.93 -15.52Z");
    expect(CRESCENT_FINE).toEqual({
      bead: "M25.07 15.18A17 17 0 1 0 38.93 15.18A8.5 13 0 1 1 25.07 15.18Z",
      above: "M29.8 5.1A2.2 2.2 0 0 1 34.2 5.1V33.19A3.76 3.76 0 0 1 29.8 33.19Z",
      below: "M29.8 49.37A18.8 18.8 0 0 0 34.2 49.37V58.9A2.2 2.2 0 0 1 29.8 58.9Z",
    });
    expect(CRESCENT_BOLD).toEqual({
      bead: "M26.45 18.53A13.6 13.6 0 1 0 37.55 18.53A6.8 10.4 0 1 1 26.45 18.53Z",
      above: "M29.7 10.45A2.3 2.3 0 0 1 34.3 10.45V32.18A2.85 2.85 0 0 1 29.7 32.18Z",
      below: "M29.7 45.97A15.2 15.2 0 0 0 34.3 45.97V53.55A2.3 2.3 0 0 1 29.7 53.55Z",
    });
    expect(MARK).toEqual({ R: 17, t: 4.4, g: 1.8, top: 25.6 });
    const { container } = render(<SutraMark />);
    expect(container.querySelector('[data-part="bead"]')).toHaveAttribute("d", CRESCENT_FINE.bead);
  });
});
