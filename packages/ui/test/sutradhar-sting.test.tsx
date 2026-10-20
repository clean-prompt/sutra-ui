/**
 * SutradharSting: the mark and astra stings with the crescent mark. The lockup is the markup (server, reduced motion, before a
 * play); a play runs on the shared frame driver, ends on the lockup and calls onComplete once; the astra's aim is clamped.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SutradharSting } from "../src/assets/sutradhar-sting";
import { activeFrameCount } from "../src/assets/mascot-driver-internal";
import { axeViolations } from "./a11y";

const svgOf = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;
const art = (container: HTMLElement) => container.querySelector('[data-part="art"]') as SVGGElement;
const strip = (s: string) => s.replace(/id="[^"]*"|url\(#[^)]*\)/g, "");

function withReducedMotion(fn: () => void) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("reduce") })) as typeof window.matchMedia;
  try {
    fn();
  } finally {
    window.matchMedia = original;
  }
}

afterEach(() => vi.restoreAllMocks());

describe("SutradharSting", () => {
  it("draws the mark and the astra in their own boxes, sized by height", () => {
    const { container, rerender } = render(<SutradharSting size={160} autoPlay={false} />);
    let svg = svgOf(container);
    expect(svg).toHaveAttribute("data-slot", "sutradhar-sting");
    expect(svg).toHaveAttribute("data-variant", "mark");
    expect(svg).toHaveAttribute("viewBox", "0 0 96 80");
    expect(svg).toHaveAttribute("height", "160");
    expect(svg).toHaveAttribute("width", "192");
    rerender(<SutradharSting variant="astra" size={104} autoPlay={false} />);
    svg = svgOf(container);
    expect(svg).toHaveAttribute("viewBox", "0 0 128 104");
    expect(svg).toHaveAttribute("width", "128");
    expect(art(container).querySelectorAll("[data-k]").length).toBeGreaterThan(20);
  });

  it("is decorative unless titled", async () => {
    const { container, rerender } = render(<SutradharSting autoPlay={false} />);
    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true");
    rerender(<SutradharSting autoPlay={false} title="Sutradhar plants the Sutra mark" />);
    expect(svgOf(container)).toHaveAttribute("role", "img");
    expect(svgOf(container).querySelector("title")).toHaveTextContent("Sutradhar plants the Sutra mark");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("clamps the aim to 135 to 180 degrees", () => {
    const look = (aim: number) => {
      const { container, unmount } = render(<SutradharSting variant="astra" aim={aim} autoPlay={false} />);
      const s = strip(art(container).innerHTML);
      unmount();
      return s;
    };
    expect(look(90)).toBe(look(135));
    expect(look(260)).toBe(look(180));
    expect(look(150)).not.toBe(look(135));
  });

  it("under reduced motion shows only the lockup, requests no frame and completes at once", () => {
    withReducedMotion(() => {
      const raf = vi.spyOn(window, "requestAnimationFrame");
      const done = vi.fn();
      const { unmount } = render(<SutradharSting onComplete={done} />);
      expect(raf).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  it("autoPlay false waits on the lockup; a new replayKey plays it", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const { rerender, container } = render(<SutradharSting autoPlay={false} />);
    expect(raf).not.toHaveBeenCalled();
    expect(svgOf(container)).not.toHaveAttribute("data-playing");
    rerender(<SutradharSting autoPlay={false} replayKey={1} />);
    expect(svgOf(container)).toHaveAttribute("data-playing");
    expect(activeFrameCount()).toBe(1);
  });

  it("plays to the lockup, calls onComplete once and leaves the frame", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      const done = vi.fn();
      const { container } = render(<SutradharSting onComplete={done} />);
      expect(svgOf(container)).toHaveAttribute("data-playing");
      const lockup = strip(art(container).innerHTML);
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(strip(art(container).innerHTML)).not.toBe(lockup);
      await act(async () => {
        vi.advanceTimersByTime(6000);
      });
      expect(done).toHaveBeenCalledTimes(1);
      expect(svgOf(container)).not.toHaveAttribute("data-playing");
      expect(activeFrameCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("loops without completing", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      const done = vi.fn();
      const { container } = render(<SutradharSting variant="astra" loop onComplete={done} />);
      await act(async () => {
        vi.advanceTimersByTime(14000);
      });
      expect(done).not.toHaveBeenCalled();
      expect(svgOf(container)).toHaveAttribute("data-playing");
    } finally {
      vi.useRealTimers();
    }
  });
});
