import { act, render } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCaretAnchor } from "../src/hooks/use-caret-anchor";

type Pos = ReturnType<typeof useCaretAnchor>;

function Harness({ position, open, onPos }: { position: number | null; open: boolean; onPos: (pos: Pos) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const pos = useCaretAnchor(ref, position, open);
  onPos(pos);
  return <textarea ref={ref} defaultValue="hello world" aria-label="field" />;
}

const fieldAt = (top: number, left = 10) =>
  vi.spyOn(HTMLTextAreaElement.prototype, "getBoundingClientRect").mockReturnValue({
    top, left, right: left + 100, bottom: top + 40, width: 100, height: 40, x: left, y: top, toJSON: () => ({}),
  });

afterEach(() => vi.restoreAllMocks());

describe("useCaretAnchor", () => {
  it("has no position while closed or without a caret", () => {
    const seen: Pos[] = [];
    const { rerender } = render(<Harness position={3} open={false} onPos={(p) => seen.push(p)} />);
    rerender(<Harness position={null} open onPos={(p) => seen.push(p)} />);
    expect(seen.every((p) => p === null)).toBe(true);
  });

  it("measures the caret when it opens and again on resize", () => {
    fieldAt(40);
    let current: Pos = null;
    render(<Harness position={5} open onPos={(p) => (current = p)} />);
    const inset = current!.top - 40; // the field's own border (jsdom gives inputs 1px), constant across measurements
    expect(current!.left).toBeGreaterThanOrEqual(10);
    expect(current!.height).toBeGreaterThan(0);

    fieldAt(90);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(current!.top).toBe(90 + inset);
  });

  it("re-measures when any ancestor scrolls (capture phase)", () => {
    fieldAt(20);
    let current: Pos = null;
    render(<Harness position={0} open onPos={(p) => (current = p)} />);
    const inset = current!.top - 20;
    fieldAt(5);
    act(() => void document.body.dispatchEvent(new Event("scroll")));
    expect(current!.top).toBe(5 + inset);
  });

  it("clears the position on close and stops listening on unmount", () => {
    fieldAt(40);
    let current: Pos = null;
    const remove = vi.spyOn(window, "removeEventListener");
    const { rerender, unmount } = render(<Harness position={2} open onPos={(p) => (current = p)} />);
    expect(current).not.toBeNull();
    rerender(<Harness position={2} open={false} onPos={(p) => (current = p)} />);
    expect(current).toBeNull();
    unmount();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
