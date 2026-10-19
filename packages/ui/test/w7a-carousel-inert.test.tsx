import * as React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Carousel } from "../src/patterns/carousel";
import { axeViolations } from "./a11y";

/** An IntersectionObserver whose reports the test sends by hand (ratios by slide index). */
let reports: Array<(ratios: number[]) => void> = [];
const RealIO = globalThis.IntersectionObserver;
class StubIO {
  targets: Element[] = [];
  constructor(private cb: IntersectionObserverCallback) {
    reports.push((ratios) =>
      this.cb(
        this.targets.map((t) => ({ target: t, intersectionRatio: ratios[Number((t as HTMLElement).dataset.index)] ?? 0 }) as unknown as IntersectionObserverEntry),
        this as unknown as IntersectionObserver
      )
    );
  }
  observe(el: Element) {
    this.targets.push(el);
  }
  unobserve() {}
  disconnect() {
    this.targets = [];
  }
  takeRecords() {
    return [];
  }
}
beforeEach(() => {
  reports = [];
  globalThis.IntersectionObserver = StubIO as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  cleanup();
  globalThis.IntersectionObserver = RealIO;
});

const send = (ratios: number[]) => act(() => reports[reports.length - 1]!(ratios));
const slides = ["One", "Two", "Three"].map((t) => (
  <div key={t}>
    <a href={`#${t}`}>{t} link</a>
  </div>
));
const slideEls = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>("[data-index]"));

describe("Carousel slides that are out of view are inert", () => {
  it("nothing is inert until the observer reports, then only the slides outside the strip", () => {
    const { container } = render(<Carousel label="Featured">{slides}</Carousel>);
    expect(slideEls(container).some((s) => s.hasAttribute("inert"))).toBe(false);
    send([1, 0, 0]);
    expect(slideEls(container).map((s) => s.hasAttribute("inert"))).toEqual([false, true, true]);
    // a peeking slide that shows even a sliver stays interactive
    send([0.6, 0.1, 0]);
    expect(slideEls(container).map((s) => s.hasAttribute("inert"))).toEqual([false, false, true]);
    send([0, 0.2, 1]);
    expect(slideEls(container).map((s) => s.hasAttribute("inert"))).toEqual([true, false, false]);
  });

  it("an empty report (no slide showing) does not lock every slide", () => {
    const { container } = render(<Carousel label="Featured">{slides}</Carousel>);
    send([0, 0, 0]);
    expect(slideEls(container).some((s) => s.hasAttribute("inert"))).toBe(false);
  });

  it("the controls stay reachable and the strip passes axe with inert slides", async () => {
    const { container } = render(<Carousel label="Featured">{slides}</Carousel>);
    send([1, 0, 0]);
    expect(screen.getAllByRole("button", { name: /Go to slide/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
