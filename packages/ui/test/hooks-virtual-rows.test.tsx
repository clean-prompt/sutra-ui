import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVirtualRows } from "../src/hooks/use-virtual-rows";

/** A scroller whose height is fixed and whose scroll position the test sets (jsdom has no layout). */
function scroller(clientHeight: number) {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
  el.scrollTop = 0;
  return el;
}

const scrollTo = async (el: HTMLElement, top: number) => {
  el.scrollTop = top;
  await act(async () => {
    el.dispatchEvent(new Event("scroll"));
  });
};

describe("useVirtualRows", () => {
  it("renders every row when disabled", () => {
    const { result } = renderHook(() => useVirtualRows({ count: 50, rowHeight: 20, scrollElement: scroller(100), enabled: false }));
    expect(result.current).toEqual({ start: 0, end: 50, totalHeight: 1000, offset: 0 });
  });

  it("assumes the fallback height until there is an element to measure", () => {
    const { result } = renderHook(() => useVirtualRows({ count: 1000, rowHeight: 20, scrollElement: null, overscan: 2 }));
    expect(result.current).toMatchObject({ start: 0, end: 26, totalHeight: 20000, offset: 0 }); // ceil(480 / 20) + 2
  });

  it("windows the rows around the viewport and follows the scroll", async () => {
    const el = scroller(100);
    const { result } = renderHook(() => useVirtualRows({ count: 1000, rowHeight: 20, scrollElement: el, overscan: 2 }));
    expect(result.current).toEqual({ start: 0, end: 7, totalHeight: 20000, offset: 0 });
    await scrollTo(el, 1000);
    await waitFor(() => expect(result.current).toEqual({ start: 48, end: 57, totalHeight: 20000, offset: 960 }));
  });

  it("never runs past the end, even when the scroll position is stale", async () => {
    const el = scroller(100);
    const { result } = renderHook(() => useVirtualRows({ count: 1000, rowHeight: 20, scrollElement: el, overscan: 2 }));
    await scrollTo(el, 999_999);
    await waitFor(() => expect(result.current.end).toBe(1000));
    expect(result.current.start).toBe(993); // the last 100 px are 5 rows, plus the overscan
  });

  it("keeps the window valid when the list shrinks below the viewport", async () => {
    const el = scroller(100);
    const { result, rerender } = renderHook(({ count }) => useVirtualRows({ count, rowHeight: 20, scrollElement: el, overscan: 2 }), {
      initialProps: { count: 1000 },
    });
    await scrollTo(el, 5000);
    await waitFor(() => expect(result.current.start).toBeGreaterThan(200));
    rerender({ count: 3 });
    expect(result.current).toEqual({ start: 0, end: 3, totalHeight: 60, offset: 0 });
  });

  it("removes its scroll listener on unmount", () => {
    const el = scroller(100);
    const remove = vi.spyOn(el, "removeEventListener");
    const { unmount } = renderHook(() => useVirtualRows({ count: 100, rowHeight: 20, scrollElement: el }));
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
