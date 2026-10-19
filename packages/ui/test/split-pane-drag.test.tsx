/** SplitPane divider on useDrag (absolute mode): the size follows the pointer along the pane, RTL measures from the inline start. */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./gesture-pointer";
import { SplitPane, SplitPaneHandle, SplitPanePanel } from "../src/patterns/split-pane";

const rect = (width: number, height: number) => ({ left: 100, top: 50, width, height, right: 100 + width, bottom: 50 + height, x: 100, y: 50, toJSON() {} }) as DOMRect;
const pt = (x: number, y: number, extra: object = {}) => ({ pointerId: 1, pointerType: "mouse", button: 0, buttons: 1, clientX: x, clientY: y, ...extra });

function Split(props: Partial<React.ComponentProps<typeof SplitPane>>) {
  return (
    <SplitPane min={20} max={80} step={10} {...props}>
      <SplitPanePanel label="Editor">Editor</SplitPanePanel>
      <SplitPaneHandle />
      <SplitPanePanel label="Preview">Preview</SplitPanePanel>
    </SplitPane>
  );
}
const setup = (props: Partial<React.ComponentProps<typeof SplitPane>> = {}, size: readonly [number, number] = [400, 200]) => {
  const onSizeChange = vi.fn();
  const { container } = render(<Split onSizeChange={onSizeChange} {...props} />);
  const root = container.querySelector<HTMLElement>('[data-slot="split-pane"]')!;
  root.getBoundingClientRect = () => rect(size[0], size[1]);
  const sep = screen.getByRole("separator", { name: "Resize panels" });
  return { root, sep, onSizeChange };
};

beforeEach(() => window.localStorage.clear());

describe("SplitPane divider drag", () => {
  it("sizes from the pointer position (clamped), flags dragging and ends on release", () => {
    const { root, sep, onSizeChange } = setup();
    fireEvent.pointerDown(sep, pt(300, 100));
    expect(root).toHaveAttribute("data-dragging");
    expect(onSizeChange).not.toHaveBeenCalled(); // the press alone changes nothing
    expect(sep).toHaveAttribute("aria-valuenow", "50");
    fireEvent.pointerMove(sep, pt(260, 100)); // (260 - 100) / 400 = 40%
    expect(sep).toHaveAttribute("aria-valuenow", "40");
    fireEvent.pointerMove(sep, pt(110, 100)); // 2.5% clamps to the minimum
    expect(sep).toHaveAttribute("aria-valuenow", "20");
    fireEvent.pointerMove(sep, pt(900, 100));
    expect(sep).toHaveAttribute("aria-valuenow", "80");
    fireEvent.pointerUp(sep, pt(900, 100));
    expect(root).not.toHaveAttribute("data-dragging");
    fireEvent.pointerMove(sep, pt(200, 100));
    expect(sep).toHaveAttribute("aria-valuenow", "80");
  });

  it("measures vertically for a column pane", () => {
    const { sep } = setup({ orientation: "vertical" });
    fireEvent.pointerDown(sep, pt(0, 150, { pointerType: "touch" }));
    fireEvent.pointerMove(sep, pt(0, 100, { pointerType: "touch" })); // (100 - 50) / 200 = 25%
    expect(sep).toHaveAttribute("aria-valuenow", "25");
    fireEvent.pointerUp(sep, pt(0, 100, { pointerType: "touch" }));
  });

  it("measures from the right edge in RTL (the first pane sits on the right)", () => {
    document.documentElement.setAttribute("dir", "rtl");
    try {
      const { sep } = setup();
      fireEvent.pointerDown(sep, pt(300, 100));
      fireEvent.pointerMove(sep, pt(440, 100)); // 60 px from the right edge of a 400 px pane: 15% -> clamps to 20
      expect(sep).toHaveAttribute("aria-valuenow", "20");
      fireEvent.pointerMove(sep, pt(400, 100)); // (500 - 400) / 400 = 25%
      expect(sep).toHaveAttribute("aria-valuenow", "25");
      fireEvent.pointerUp(sep, pt(400, 100));
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("ignores other mouse buttons and a pane with no size; a cancel ends the drag", () => {
    const { root, sep, onSizeChange } = setup({}, [0, 0]);
    fireEvent.pointerDown(sep, pt(300, 100, { button: 2, buttons: 2 }));
    expect(root).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(sep, pt(300, 100));
    fireEvent.pointerMove(sep, pt(310, 100));
    expect(onSizeChange).not.toHaveBeenCalled();
    fireEvent.pointerCancel(sep, pt(310, 100));
    expect(root).not.toHaveAttribute("data-dragging");
  });

  it("calls the consumer's pointer handlers first and lets a prevented press through", () => {
    const onPointerDown = vi.fn((e: React.PointerEvent) => e.preventDefault());
    render(
      <SplitPane>
        <SplitPanePanel label="A">A</SplitPanePanel>
        <SplitPaneHandle onPointerDown={onPointerDown} />
        <SplitPanePanel label="B">B</SplitPanePanel>
      </SplitPane>
    );
    const sep = screen.getByRole("separator");
    fireEvent.pointerDown(sep, pt(10, 10));
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(sep.closest('[data-slot="split-pane"]')).not.toHaveAttribute("data-dragging");
  });
});
