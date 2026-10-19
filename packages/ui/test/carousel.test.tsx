/**
 * Carousel: the pure helpers (lib/carousel), the ARIA carousel contract, arrows, dots, keys, controlled and uncontrolled
 * use, the slide in view from a stubbed IntersectionObserver, autoplay (fake timers) with its pause rules and reduced
 * motion, loading and empty, axe. jsdom has no scrolling, so the strip's scrolling itself is checked in the browser.
 */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activeSlide, autoplayInterval, stepSlide } from "../src/lib/carousel";
import { Carousel } from "../src/patterns/carousel";
import { axeViolations } from "./a11y";

describe("lib/carousel", () => {
  it("activeSlide is the most visible slide, the first on a tie, -1 when none shows", () => {
    expect(activeSlide([0, 1, 0])).toBe(1);
    expect(activeSlide([0.4, 0.6])).toBe(1);
    expect(activeSlide([0.5, 0.5])).toBe(0);
    expect(activeSlide([1, 1, 0.3])).toBe(0);
    expect(activeSlide([0, 0])).toBe(-1);
    expect(activeSlide([])).toBe(-1);
  });

  it("stepSlide stops at the ends, or rewinds with loop", () => {
    expect(stepSlide(0, 3, 1, false)).toBe(1);
    expect(stepSlide(2, 3, 1, false)).toBe(2);
    expect(stepSlide(0, 3, -1, false)).toBe(0);
    expect(stepSlide(2, 3, 1, true)).toBe(0);
    expect(stepSlide(0, 3, -1, true)).toBe(2);
    expect(stepSlide(0, 0, 1, true)).toBe(0);
  });

  it("autoplayInterval: true is 5 s, numbers are floored at 1 s, the rest is off", () => {
    expect(autoplayInterval(true)).toBe(5000);
    expect(autoplayInterval(3000)).toBe(3000);
    expect(autoplayInterval(200)).toBe(1000);
    expect(autoplayInterval(false)).toBe(0);
    expect(autoplayInterval(undefined)).toBe(0);
    expect(autoplayInterval(0)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

const original = window.matchMedia;
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: on && query.includes("reduce") })) as typeof window.matchMedia;
};

/** An IntersectionObserver whose reports the test sends by hand. */
type Report = (ratios: number[]) => void;
let reports: Report[] = [];
const RealIO = globalThis.IntersectionObserver;
class StubIO {
  targets: Element[] = [];
  constructor(private cb: IntersectionObserverCallback) {
    reports.push((ratios) => this.cb(this.targets.map((t) => ({ target: t, intersectionRatio: ratios[Number((t as HTMLElement).dataset.index)] ?? 0 }) as unknown as IntersectionObserverEntry), this as unknown as IntersectionObserver));
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
  vi.useFakeTimers();
  reduceMotion(false);
  reports = [];
  globalThis.IntersectionObserver = StubIO as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = original;
  globalThis.IntersectionObserver = RealIO;
});

const slides = ["One", "Two", "Three"].map((t) => <div key={t}>{t}</div>);
const dots = () => screen.getAllByRole("button", { name: /Go to slide/ });
const current = () => dots().findIndex((d) => d.getAttribute("aria-current") === "true");
const lastReport = () => reports[reports.length - 1]!;

describe("Carousel", () => {
  it("follows the ARIA carousel pattern: named region, slides named n of N, dots with the current one marked", () => {
    render(<Carousel label="Featured">{slides}</Carousel>);
    const region = screen.getByRole("region", { name: "Featured" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    const items = screen.getAllByRole("group", { name: /of 3/ });
    expect(items.map((i) => i.getAttribute("aria-label"))).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
    expect(items.every((i) => i.getAttribute("aria-roledescription") === "slide")).toBe(true);
    expect(dots()).toHaveLength(3);
    expect(current()).toBe(0);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeEnabled();
  });

  it("arrows and dots move to a slide, report it and announce it; arrows stop at the ends", () => {
    const onValueChange = vi.fn();
    render(<Carousel label="Featured" onValueChange={onValueChange}>{slides}</Carousel>);
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(current()).toBe(1);
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole("status")).toHaveTextContent("2 of 3");
    fireEvent.click(dots()[2]!);
    expect(current()).toBe(2);
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(current()).toBe(1);
  });

  it("loop rewinds instead of stopping", () => {
    render(<Carousel label="Featured" loop defaultValue={2}>{slides}</Carousel>);
    const next = screen.getByRole("button", { name: "Next slide" });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(current()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(current()).toBe(2);
  });

  it("Arrow, Home and End keys work on the strip and on the controls, not inside a slide", () => {
    render(
      <Carousel label="Featured">
        <div>
          <input aria-label="Name" />
        </div>
        <div>Two</div>
        <div>Three</div>
      </Carousel>
    );
    const strip = screen.getByRole("group", { name: "Slides" });
    expect(strip.tabIndex).toBe(0);
    fireEvent.keyDown(strip, { key: "ArrowRight" });
    expect(current()).toBe(1);
    fireEvent.keyDown(strip, { key: "End" });
    expect(current()).toBe(2);
    fireEvent.keyDown(strip, { key: "ArrowLeft" });
    expect(current()).toBe(1);
    fireEvent.keyDown(strip, { key: "Home" });
    expect(current()).toBe(0);
    fireEvent.keyDown(dots()[0]!, { key: "ArrowRight" });
    expect(current()).toBe(1);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), { key: "ArrowRight" });
    expect(current()).toBe(1);
  });

  it("controlled: the parent decides, and a new value shows that slide", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Carousel label="Featured" value={0} onValueChange={onValueChange}>{slides}</Carousel>);
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(onValueChange).toHaveBeenCalledWith(1);
    expect(current()).toBe(0);
    rerender(<Carousel label="Featured" value={2} onValueChange={onValueChange}>{slides}</Carousel>);
    expect(current()).toBe(2);
  });

  it("the slide in view follows a free scroll, with an announcement", () => {
    const onValueChange = vi.fn();
    render(<Carousel label="Featured" onValueChange={onValueChange}>{slides}</Carousel>);
    act(() => lastReport()([0.2, 0.8, 0]));
    expect(current()).toBe(1);
    expect(onValueChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole("status")).toHaveTextContent("2 of 3");
    act(() => lastReport()([0, 0, 0])); // nothing visible: no change
    expect(current()).toBe(1);
  });

  it("loading shows a placeholder and aria-busy; no slides shows the empty state", () => {
    const { rerender } = render(<Carousel label="Featured" loading>{slides}</Carousel>);
    expect(screen.getByRole("region", { name: "Featured" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("group", { name: "1 of 3" })).toBeNull();
    rerender(<Carousel label="Featured" emptyState="No stories yet">{null}</Carousel>);
    expect(screen.getByText("No stories yet")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("counts the children of a fragment as slides", () => {
    render(
      <Carousel label="Featured">
        <>
          <div>One</div>
          <div>Two</div>
        </>
        <div>Three</div>
      </Carousel>
    );
    expect(screen.getAllByRole("group", { name: /of 3/ })).toHaveLength(3);
  });

  it("a single slide shows no controls; arrows and dots can be turned off; labels are replaceable", () => {
    const { rerender } = render(<Carousel label="One">{slides[0]}</Carousel>);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<Carousel label="Featured" arrows={false} labels={{ goTo: (n) => `Aller à ${n}` }}>{slides}</Carousel>);
    expect(screen.queryByRole("button", { name: "Next slide" })).toBeNull();
    expect(screen.getByRole("button", { name: "Aller à 2" })).toBeInTheDocument();
    rerender(<Carousel label="Featured" dots={false}>{slides}</Carousel>);
    expect(screen.queryByRole("button", { name: /Go to slide/ })).toBeNull();
  });

  it("spreads props on the section after its own, and forwards the ref", () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <Carousel ref={ref} label="Featured" data-testid="c" className="max-w-sm">
        {slides}
      </Carousel>
    );
    expect(ref.current).toBe(screen.getByTestId("c"));
    expect(ref.current).toHaveClass("max-w-sm");
  });

  it("has no axe violations (default, autoplay, loading, empty)", async () => {
    vi.useRealTimers();
    const { container } = render(
      <div>
        <Carousel label="A">{slides}</Carousel>
        <Carousel label="B" autoplay progress>{slides}</Carousel>
        <Carousel label="C" loading>{slides}</Carousel>
        <Carousel label="D">{null}</Carousel>
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Carousel autoplay", () => {
  const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it("advances every interval, has a visible pause button, and the user can pause and resume", () => {
    render(<Carousel label="Featured" autoplay={2000}>{slides}</Carousel>);
    const pause = screen.getByRole("button", { name: "Pause slide show" });
    tick(1999);
    expect(current()).toBe(0);
    tick(1);
    expect(current()).toBe(1);
    fireEvent.click(pause);
    expect(screen.getByRole("button", { name: "Start slide show" })).toBeInTheDocument();
    tick(10_000);
    expect(current()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Start slide show" }));
    tick(2000);
    expect(current()).toBe(2);
  });

  it("does not announce slides it changes by itself", () => {
    render(<Carousel label="Featured" autoplay={2000}>{slides}</Carousel>);
    tick(2000);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("pauses while the pointer or focus is inside, and starts the interval over afterwards", () => {
    render(<Carousel label="Featured" autoplay={2000}>{slides}</Carousel>);
    const region = screen.getByRole("region", { name: "Featured" });
    fireEvent.pointerEnter(region);
    tick(10_000);
    expect(current()).toBe(0);
    fireEvent.pointerLeave(region);
    tick(1500);
    expect(current()).toBe(0);
    tick(500);
    expect(current()).toBe(1);
    fireEvent.focus(screen.getByRole("group", { name: "Slides" }));
    tick(10_000);
    expect(current()).toBe(1);
    fireEvent.blur(screen.getByRole("group", { name: "Slides" }), { relatedTarget: document.body });
    tick(2000);
    expect(current()).toBe(2);
  });

  it("loops back to the start only with loop; otherwise it stops on the last slide", () => {
    const { unmount } = render(<Carousel label="Featured" autoplay={1000} defaultValue={2}>{slides}</Carousel>);
    tick(5000);
    expect(current()).toBe(2);
    unmount();
    render(<Carousel label="Featured" autoplay={1000} defaultValue={2} loop>{slides}</Carousel>);
    tick(1000);
    expect(current()).toBe(0);
  });

  it("is off under reduced motion until the user presses play, and shows no progress bar", () => {
    reduceMotion(true);
    const { container } = render(<Carousel label="Featured" autoplay={1000} progress>{slides}</Carousel>);
    expect(screen.getByRole("button", { name: "Start slide show" })).toBeInTheDocument();
    tick(5000);
    expect(current()).toBe(0);
    expect(container.querySelector(".bg-primary.origin-left")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start slide show" }));
    tick(1000);
    expect(current()).toBe(1);
  });

  it("the progress bar fills over the interval with a plain transition and restarts on each slide", () => {
    const { container } = render(<Carousel label="Featured" autoplay={3000} progress>{slides}</Carousel>);
    const fill = () => container.querySelector<HTMLElement>(".origin-left");
    expect(fill()).toHaveStyle({ transitionDuration: "3000ms" });
    expect(fill()!.className).toContain("scale-x-0");
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(fill()!.className).toContain("scale-x-100");
    tick(3000);
    expect(current()).toBe(1);
    expect(fill()!.className).toContain("scale-x-0");
  });

  it("stops its timer on unmount", () => {
    const { unmount } = render(<Carousel label="Featured" autoplay={1000}>{slides}</Carousel>);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
