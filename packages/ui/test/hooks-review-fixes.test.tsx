/**
 * Review fixes in hooks/ and lib/: RTL marquee and textarea mirror, the shared mirror style list, typewriter following the
 * motion attribute, useScrollable watching added children, useReorder composing moves, useDrag ending on disable,
 * errorMessage with an empty message, and the modules split out of use-async-action.
 */
import * as React from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "./helpers/gesture-pointer";
import { useDrag, type DragInfo } from "../src/hooks/use-drag";
import { useMarqueeSelection } from "../src/hooks/use-marquee-selection";
import { useMountedRef as splitMountedRef } from "../src/hooks/use-mounted-ref";
import { errorMessage as splitErrorMessage } from "../src/lib/error";
import { errorMessage, useMountedRef } from "../src/hooks/use-async-action";
import { useReorder } from "../src/hooks/use-reorder";
import { useScrollable } from "../src/hooks/use-scrollable";
import { useTextareaMirror } from "../src/hooks/use-textarea-mirror";
import { useTypewriter } from "../src/hooks/use-typewriter";
import { TEXT_MIRROR_BORDER_STYLES, TEXT_MIRROR_STYLES } from "../src/lib/text-field";
import { getPaginationRange, type PaginationOptions, type UsePaginationOptions } from "../src/lib/pagination";
import { formatClock } from "../src/lib/duration";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-motion");
});

describe("errorMessage and the modules split out of use-async-action", () => {
  it("falls back for an empty (or blank) message, and the old import path still works", () => {
    expect(errorMessage(new Error(""))).toBe("Something went wrong. Please try again.");
    expect(errorMessage(new Error("  "), "nope")).toBe("nope");
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("text")).toBe("text");
    expect(errorMessage).toBe(splitErrorMessage);
    expect(useMountedRef).toBe(splitMountedRef);
  });
});

describe("lib", () => {
  it("PaginationOptions is the type, UsePaginationOptions the deprecated alias", () => {
    const options: PaginationOptions = { page: 1, totalPages: 3 };
    const legacy: UsePaginationOptions = options;
    expect(getPaginationRange(legacy)).toEqual([1, 2, 3]);
  });
  it("formatClock still pads through the shared helper", () => {
    expect(formatClock(65, { padMinutes: true })).toBe("01:05");
    expect(formatClock(3725, { padHours: true })).toBe("01:02:05");
  });
});

describe("useTextareaMirror", () => {
  function Field({ rtl }: { rtl?: boolean }) {
    const ref = React.useRef<HTMLTextAreaElement>(null);
    const { mirrorRef } = useTextareaMirror(ref, "hello");
    return (
      <div>
        <div ref={mirrorRef} data-testid="mirror" />
        <textarea ref={ref} data-testid="ta" defaultValue="hello" style={{ paddingRight: "8px", paddingLeft: "8px", borderWidth: 0, direction: rtl ? "rtl" : "ltr" }} />
      </div>
    );
  }
  const withGutter = () => {
    // offsetWidth 100, clientWidth 85, no borders: a 15 px scrollbar.
    Object.defineProperty(HTMLTextAreaElement.prototype, "offsetWidth", { configurable: true, get: () => 100 });
    Object.defineProperty(HTMLTextAreaElement.prototype, "clientWidth", { configurable: true, get: () => 85 });
  };
  afterEach(() => {
    delete (HTMLTextAreaElement.prototype as { offsetWidth?: unknown }).offsetWidth;
    delete (HTMLTextAreaElement.prototype as { clientWidth?: unknown }).clientWidth;
  });

  it("puts the scrollbar gutter on the right in LTR", () => {
    withGutter();
    render(<Field />);
    expect(screen.getByTestId("mirror").style.paddingRight).toBe("23px");
  });

  it("puts it on the left in RTL", () => {
    withGutter();
    render(<Field rtl />);
    const mirror = screen.getByTestId("mirror");
    expect(mirror.style.paddingLeft).toBe("23px");
    expect(mirror.style.paddingRight).toBe("8px");
  });

  it("one shared list: the typography, wrapping and padding the caret probe and the mirror both need", () => {
    for (const prop of ["fontFeatureSettings", "wordBreak", "paddingLeft", "paddingRight", "direction", "borderLeftWidth"]) {
      expect(TEXT_MIRROR_STYLES).toContain(prop);
    }
    expect(TEXT_MIRROR_BORDER_STYLES).toHaveLength(4);
  });
});

describe("useMarqueeSelection in right-to-left", () => {
  const items = { a: { left: 100, width: 50 }, b: { left: 300, width: 50 } };

  function Area({ onValue }: { onValue: (v: string[]) => void }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const nodes = React.useRef<Record<string, HTMLElement | null>>({});
    const { box } = useMarqueeSelection({
      containerRef: ref,
      getItems: () => Object.entries(nodes.current).map(([id, element]) => ({ id, element })),
      onValueChange: onValue,
      threshold: 0,
      autoScroll: false,
    });
    return (
      <div dir="rtl">
        <div ref={ref} data-testid="area">
          {Object.keys(items).map((id) => (
            <div key={id} ref={(n) => void (nodes.current[id] = n)} data-testid={id} />
          ))}
          <span data-testid="box">{box ? `${box.left},${box.width}` : "none"}</span>
        </div>
      </div>
    );
  }

  it("keeps the box and the hit test in scrolled RTL content (scrollLeft is negative, content lies left of the origin)", () => {
    const onValue = vi.fn();
    render(<Area onValue={onValue} />);
    const area = screen.getByTestId("area");
    Object.defineProperties(area, {
      clientWidth: { configurable: true, get: () => 400 },
      clientHeight: { configurable: true, get: () => 300 },
      scrollWidth: { configurable: true, get: () => 800 },
      scrollHeight: { configurable: true, get: () => 300 },
      scrollLeft: { configurable: true, get: () => -400, set: () => {} },
    });
    area.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    for (const [id, { left, width }] of Object.entries(items)) {
      screen.getByTestId(id).getBoundingClientRect = () =>
        ({ left, top: 10, right: left + width, bottom: 60, width, height: 50, x: left, y: 10, toJSON: () => ({}) }) as DOMRect;
    }
    // Press at client x 190 (content x -210), drag to client x 120 (content x -280): the rectangle covers client 120..190.
    fireEvent.pointerDown(area, { clientX: 190, clientY: 100, button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerMove(window, { clientX: 120, clientY: 30, pointerId: 1, pointerType: "mouse" });
    expect(screen.getByTestId("box").textContent).toBe("-280,70");
    expect(onValue).toHaveBeenLastCalledWith(["a"]);
    fireEvent.pointerUp(window, { clientX: 120, clientY: 30, pointerId: 1, pointerType: "mouse" });
  });
});

describe("useTypewriter", () => {
  it("follows <html data-motion> live (it subscribes instead of reading once in render)", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useTypewriter("hello", { speed: 10 }));
      expect(result.current.text).toBe("");
      await act(async () => {
        document.documentElement.setAttribute("data-motion", "reduce");
        await Promise.resolve();
      });
      expect(result.current).toMatchObject({ text: "hello", done: true });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("useScrollable", () => {
  it("starts watching children added after mount", async () => {
    const observed: Element[] = [];
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe(el: Element) {
        observed.push(el);
      }
      unobserve(el: Element) {
        observed.splice(observed.indexOf(el), 1);
      }
      disconnect() {
        observed.length = 0;
      }
    } as unknown as typeof ResizeObserver;
    try {
      function Probe() {
        const ref = React.useRef<HTMLDivElement>(null);
        const scrollable = useScrollable(ref);
        return <div ref={ref} data-testid="box" data-scrollable={scrollable} />;
      }
      render(<Probe />);
      const box = screen.getByTestId("box");
      expect(observed).toEqual([box]);
      const child = document.createElement("p");
      await act(async () => {
        box.appendChild(child);
        await Promise.resolve();
      });
      expect(observed).toContain(child);
      await act(async () => {
        box.removeChild(child);
        await Promise.resolve();
      });
      expect(observed).not.toContain(child);
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});

describe("useReorder", () => {
  it("two moves in one tick compose", () => {
    const { result } = renderHook(() => useReorder({ defaultItems: ["a", "b", "c", "d"] }));
    act(() => {
      result.current.moveDown(0); // b a c d
      result.current.moveToBottom(0); // a c d b
    });
    expect(result.current.items).toEqual(["a", "c", "d", "b"]);
  });

  it("composes against the controlled value too", () => {
    const onItemsChange = vi.fn();
    const { result } = renderHook(() => useReorder({ items: ["a", "b", "c"], onItemsChange }));
    act(() => {
      result.current.moveUp(1); // b a c
      result.current.moveToTop(2); // c b a
    });
    expect(onItemsChange).toHaveBeenLastCalledWith(["c", "b", "a"]);
  });
});

describe("useDrag", () => {
  it("calls onEnd(info, true) when it is disabled mid-drag", () => {
    const onEnd = vi.fn<(info: DragInfo, cancelled: boolean) => void>();
    function Box({ enabled }: { enabled: boolean }) {
      const drag = useDrag({ enabled, onEnd });
      return <div data-testid="box" ref={drag.ref} {...drag.handlers} />;
    }
    const { rerender } = render(<Box enabled />);
    const el = screen.getByTestId("box");
    const at = (x: number, y: number) => ({ pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: y });
    fireEvent.pointerDown(el, at(10, 10));
    fireEvent.pointerMove(el, at(60, 10));
    expect(onEnd).not.toHaveBeenCalled();
    rerender(<Box enabled={false} />);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0]![1]).toBe(true);
  });

  it("does not call onEnd when disabled while idle", () => {
    const onEnd = vi.fn();
    function Box({ enabled }: { enabled: boolean }) {
      const drag = useDrag({ enabled, onEnd });
      return <div ref={drag.ref} {...drag.handlers} />;
    }
    const { rerender } = render(<Box enabled />);
    rerender(<Box enabled={false} />);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
