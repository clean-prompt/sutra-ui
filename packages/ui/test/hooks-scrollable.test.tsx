import { act, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollable } from "../src/hooks/use-scrollable";

function Region({ children }: { children?: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const scrollable = useScrollable(ref);
  return (
    <div ref={ref} data-testid="region" tabIndex={scrollable ? 0 : undefined}>
      {children}
    </div>
  );
}

let observers: { callback: ResizeObserverCallback; observed: Set<Element>; disconnected: boolean }[] = [];
let content = { scrollHeight: 100, clientHeight: 100 };

beforeEach(() => {
  observers = [];
  content = { scrollHeight: 100, clientHeight: 100 };
  vi.stubGlobal(
    "ResizeObserver",
    class {
      entry = { callback: undefined as unknown as ResizeObserverCallback, observed: new Set<Element>(), disconnected: false };
      constructor(callback: ResizeObserverCallback) {
        this.entry.callback = callback;
        observers.push(this.entry);
      }
      observe(el: Element) {
        this.entry.observed.add(el);
      }
      unobserve(el: Element) {
        this.entry.observed.delete(el);
      }
      disconnect() {
        this.entry.disconnected = true;
      }
    }
  );
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(() => content.scrollHeight);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockImplementation(() => content.clientHeight);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const resized = () => act(() => void observers.forEach((o) => o.callback([], {} as ResizeObserver)));

describe("useScrollable", () => {
  it("adds no tab stop to a region that fits", () => {
    render(<Region />);
    expect(screen.getByTestId("region")).not.toHaveAttribute("tabindex");
  });

  it("is true on mount when the content already overflows", () => {
    content = { scrollHeight: 300, clientHeight: 100 };
    render(<Region />);
    expect(screen.getByTestId("region")).toHaveAttribute("tabindex", "0");
  });

  it("follows resizes, in both directions", () => {
    render(<Region />);
    content = { scrollHeight: 300, clientHeight: 100 };
    resized();
    expect(screen.getByTestId("region")).toHaveAttribute("tabindex", "0");
    content = { scrollHeight: 100, clientHeight: 100 };
    resized();
    expect(screen.getByTestId("region")).not.toHaveAttribute("tabindex");
  });

  it("tolerates a one pixel rounding difference", () => {
    content = { scrollHeight: 101, clientHeight: 100 };
    render(<Region />);
    expect(screen.getByTestId("region")).not.toHaveAttribute("tabindex");
  });

  it("watches children, and re-measures when the child list changes", async () => {
    const { rerender } = render(
      <Region>
        <p>one</p>
      </Region>
    );
    const region = screen.getByTestId("region");
    expect([...observers.flatMap((o) => [...o.observed])]).toContain(region.firstElementChild);
    content = { scrollHeight: 400, clientHeight: 100 };
    rerender(
      <Region>
        <p>one</p>
        <p>two</p>
      </Region>
    );
    await waitFor(() => expect(region).toHaveAttribute("tabindex", "0"));
    expect([...observers.flatMap((o) => [...o.observed])]).toContain(region.lastElementChild);
  });

  it("disconnects its observers on unmount", () => {
    const { unmount } = render(<Region />);
    unmount();
    expect(observers.length).toBeGreaterThan(0);
    expect(observers.every((o) => o.disconnected)).toBe(true);
  });
});
