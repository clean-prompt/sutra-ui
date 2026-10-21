/**
 * MorphPill: states and switching (uncontrolled from inside, controlled from outside), the measured size on the surface,
 * the content swap class (never on mount), the announcement, props, axe.
 */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MorphPill } from "../src/patterns/morph-pill";
import { axeViolations } from "./helpers/a11y";

type S = "idle" | "picker" | "timer";
const states = {
  idle: ({ setState }: { setState: (s: S) => void }) => <button onClick={() => setState("picker")}>Start</button>,
  picker: ({ setState }: { setState: (s: S) => void }) => (
    <div>
      <button onClick={() => setState("timer")}>25 min</button>
      <button onClick={() => setState("idle")}>Cancel</button>
    </div>
  ),
  timer: <p>Running 24:59</p>,
};
const pill = () => document.querySelector<HTMLElement>("[data-slot=morph-pill]")!;
const rect = Element.prototype.getBoundingClientRect;
afterEach(() => {
  Element.prototype.getBoundingClientRect = rect;
});

describe("MorphPill", () => {
  it("starts in the first state (or defaultState), and content functions can switch states", () => {
    render(<MorphPill states={states} label="Focus timer" />);
    expect(screen.getByRole("group", { name: "Focus timer" })).toBe(pill());
    expect(pill()).toHaveAttribute("data-state", "idle");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(pill()).toHaveAttribute("data-state", "picker");
    fireEvent.click(screen.getByRole("button", { name: "25 min" }));
    expect(screen.getByText("Running 24:59")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("defaultState picks the first state; no label means no group role", () => {
    render(<MorphPill states={states} defaultState="timer" />);
    expect(pill()).toHaveAttribute("data-state", "timer");
    expect(pill()).not.toHaveAttribute("role");
  });

  it("controlled: the parent owns the state; setState is reported", () => {
    const onStateChange = vi.fn();
    const { rerender } = render(<MorphPill states={states} state="idle" onStateChange={onStateChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStateChange).toHaveBeenCalledWith("picker");
    expect(pill()).toHaveAttribute("data-state", "idle");
    rerender(<MorphPill states={states} state="picker" onStateChange={onStateChange} />);
    expect(pill()).toHaveAttribute("data-state", "picker");
  });

  it("fades the new content in on a change, never on the first render", () => {
    const { rerender } = render(<MorphPill states={states} state="idle" />);
    const swapped = () => document.querySelector("[data-slot=morph-pill-content]")!.firstElementChild!;
    expect(swapped().className).not.toContain("animate-fade-in");
    rerender(<MorphPill states={states} state="picker" />);
    expect(swapped().className).toContain("animate-fade-in");
  });

  it("the surface takes the measured size of its content, and follows it", () => {
    let size = { width: 90, height: 36 };
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return this.getAttribute("data-slot") === "morph-pill-content" ? ({ ...rect.call(this), ...size } as DOMRect) : rect.call(this);
    };
    const callbacks: ResizeObserverCallback[] = [];
    const RealRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }
      observe(el: Element) {
        this.el = el;
      }
      unobserve() {}
      disconnect() {}
      el?: Element;
    } as unknown as typeof ResizeObserver;
    try {
      const { rerender } = render(<MorphPill states={states} state="idle" />);
      expect(pill()).toHaveStyle({ width: "90px", height: "36px" });
      size = { width: 220, height: 120 };
      rerender(<MorphPill states={states} state="picker" />);
      act(() => callbacks.forEach((cb) => cb([{ target: document.querySelector("[data-slot=morph-pill-content]")! } as ResizeObserverEntry], {} as ResizeObserver)));
      expect(pill()).toHaveStyle({ width: "220px", height: "120px" });
    } finally {
      globalThis.ResizeObserver = RealRO;
    }
  });

  it("rides the chosen spring token for width and height", () => {
    const { rerender } = render(<MorphPill states={states} state="idle" />);
    expect(pill().className).toContain("ease-(--sutra-spring-snappy)");
    rerender(<MorphPill states={states} state="idle" spring="bouncy" />);
    expect(pill().className).toContain("duration-(--sutra-spring-bouncy-duration)");
  });

  it("announcement is a polite status; the pill itself is silent", () => {
    render(<MorphPill states={states} state="timer" announcement="Timer running, 25 minutes" />);
    expect(screen.getByRole("status")).toHaveTextContent("Timer running, 25 minutes");
    expect(pill()).not.toHaveAttribute("aria-live");
  });

  it("props go on the root, the consumer's style is kept next to the measured size, the ref is forwarded", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<MorphPill ref={ref} states={states} data-testid="p" className="w-fit" style={{ minWidth: 100 }} id="mine" />);
    expect(ref.current).toBe(screen.getByTestId("p"));
    expect(ref.current).toHaveAttribute("id", "mine");
    expect(ref.current).toHaveClass("w-fit");
    expect(ref.current).toHaveStyle({ minWidth: "100px" });
  });

  it("has no axe violations", async () => {
    const { container } = render(<MorphPill states={states} label="Focus timer" announcement="Idle" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
