/** FloatingPanes title bar and resize grip on useDrag: travel since the press, secondary buttons, cancel, a window that vanished. */
import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "./gesture-pointer";
import { FloatingPanes } from "../src/patterns/tiling-layout-floating";

const pt = (x: number, y: number, extra: object = {}) => ({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y, ...extra });

function Harness({ onPanesChange }: { onPanesChange?: (p: unknown) => void }) {
  const [panes, setPanes] = React.useState([{ id: "one", x: 10, y: 10, width: 200, height: 150 }]);
  return (
    <div style={{ width: 800, height: 600 }}>
      <FloatingPanes
        panes={panes}
        onPanesChange={(next) => {
          onPanesChange?.(next);
          setPanes(next);
        }}
        renderPane={(id) => <p>Body {id}</p>}
        paneTitle={() => "One"}
      />
    </div>
  );
}
const win = () => screen.getByRole("dialog", { name: "One" });
const bar = () => within(win()).getByRole("button", { name: "Move One" });
const grip = () => within(win()).getByRole("button", { name: "Resize One" });

describe("FloatingPanes drag on useDrag", () => {
  it("moves by the travel since the press and stops after the release", () => {
    render(<Harness />);
    fireEvent.pointerDown(bar(), pt(50, 50));
    fireEvent.pointerMove(bar(), pt(80, 70));
    expect(win().style.left).toBe("40px");
    expect(win().style.top).toBe("30px");
    fireEvent.pointerMove(bar(), pt(90, 70)); // relative to the press, not to the last move
    expect(win().style.left).toBe("50px");
    fireEvent.pointerUp(bar(), pt(90, 70));
    fireEvent.pointerMove(bar(), pt(400, 400));
    expect(win().style.left).toBe("50px");
  });

  it("resizes from the grip and ignores a second pointer and a secondary mouse button", () => {
    const onPanesChange = vi.fn();
    render(<Harness onPanesChange={onPanesChange} />);
    fireEvent.pointerDown(grip(), pt(0, 0, { button: 2 }));
    fireEvent.pointerMove(grip(), pt(30, 30, { button: 2 }));
    expect(onPanesChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(grip(), pt(0, 0, { pointerType: "touch" }));
    fireEvent.pointerMove(grip(), pt(40, 25, { pointerType: "touch" }));
    expect(win().style.width).toBe("240px");
    expect(win().style.height).toBe("175px");
    fireEvent.pointerMove(grip(), pt(900, 900, { pointerId: 2, pointerType: "touch" })); // another finger
    expect(win().style.width).toBe("240px");
    fireEvent.pointerCancel(grip(), pt(40, 25, { pointerType: "touch" }));
    fireEvent.pointerMove(grip(), pt(100, 100, { pointerType: "touch" }));
    expect(win().style.width).toBe("240px");
  });
});
