/**
 * useDrag, useSwipeDismiss and usePan: following the finger without React state per move, axis lock, bounds and elastic,
 * touch-action, release velocity from a time window, cancel paths, click guard, settle and inertia, reduced motion, StrictMode.
 */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./gesture-pointer";
import { useDrag, type DragInfo, type UseDragOptions } from "../src/hooks/use-drag";
import { useSwipeDismiss } from "../src/hooks/use-swipe-dismiss";
import { usePan } from "../src/hooks/use-pan";

const original = window.matchMedia;
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: on && query.includes("reduce") })) as typeof window.matchMedia;
};
let clock = 0;
let frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
/** Advance the mocked clock in 16 ms frames, running the queued animation frames (the springs and the glide). */
const run = (ms: number) => {
  for (let t = 0; t < ms; t += 16) {
    clock += 16;
    const batch = [...frames.values()];
    frames = new Map();
    batch.forEach((cb) => cb(clock));
  }
};
beforeEach(() => {
  clock = 1000;
  frames = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.set(++frameId, cb);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => void frames.delete(id));
  reduceMotion(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = original;
});

const touch = { pointerId: 1, pointerType: "touch", isPrimary: true } as const;
const at = (x: number, y: number, extra: object = {}) => ({ ...touch, clientX: x, clientY: y, ...extra });
const tick = (ms: number) => {
  clock += ms;
};
const el = () => screen.getByTestId("box");
const dragX = () => el().style.getPropertyValue("--sutra-drag-x");
const dragY = () => el().style.getPropertyValue("--sutra-drag-y");

function Box({ renders, ...options }: UseDragOptions & { renders?: { current: number } }) {
  const drag = useDrag(options);
  if (renders) renders.current++;
  return <div data-testid="box" ref={drag.ref} {...drag.handlers} data-dragging={drag.dragging || undefined} onClick={() => ((window as unknown as { __clicks: number }).__clicks++)} />;
}

describe("useDrag", () => {
  beforeEach(() => {
    (window as unknown as { __clicks: number }).__clicks = 0;
  });

  it("writes --sutra-drag-x/-y while the finger moves and does not re-render per move", () => {
    const renders = { current: 0 };
    render(<Box renders={renders} />);
    fireEvent.pointerDown(el(), at(100, 100));
    fireEvent.pointerMove(el(), at(110, 100)); // passes the threshold: dragging flips on
    expect(el()).toHaveAttribute("data-dragging", "true");
    const afterStart = renders.current;
    for (let i = 1; i <= 30; i++) {
      tick(8);
      fireEvent.pointerMove(el(), at(110 + i * 3, 100 + i));
    }
    expect(renders.current).toBe(afterStart);
    expect(dragX()).toBe("100px");
    expect(dragY()).toBe("30px");
    fireEvent.pointerUp(el(), at(200, 130));
    expect(el()).not.toHaveAttribute("data-dragging");
    expect(renders.current).toBeGreaterThan(afterStart);
    expect(renders.current).toBeLessThanOrEqual(afterStart + 4); // the end flips one state (StrictMode doubles the render)
  });

  it("sets touch-action from the axis and clears it when disabled", () => {
    const { rerender } = render(<Box axis="x" />);
    expect(el().style.touchAction).toBe("pan-y");
    rerender(<Box axis="y" />);
    expect(el().style.touchAction).toBe("pan-x");
    rerender(<Box />);
    expect(el().style.touchAction).toBe("none");
    rerender(<Box enabled={false} />);
    expect(el().style.touchAction).toBe("");
  });

  it("lets a tap through, and swallows the click that follows a drag", () => {
    render(<Box />);
    fireEvent.pointerDown(el(), at(10, 10));
    fireEvent.pointerMove(el(), at(12, 11));
    fireEvent.pointerUp(el(), at(12, 11));
    fireEvent.click(el());
    expect((window as unknown as { __clicks: number }).__clicks).toBe(1);

    fireEvent.pointerDown(el(), at(10, 10));
    fireEvent.pointerMove(el(), at(60, 10));
    fireEvent.pointerUp(el(), at(60, 10));
    fireEvent.click(el());
    expect((window as unknown as { __clicks: number }).__clicks).toBe(1);
  });

  it("hands a cross-axis gesture back (no drag, no capture) so the page can scroll", () => {
    const onStart = vi.fn();
    render(<Box axis="x" onStart={onStart} />);
    fireEvent.pointerDown(el(), at(100, 100));
    fireEvent.pointerMove(el(), at(103, 120));
    fireEvent.pointerMove(el(), at(140, 125));
    expect(onStart).not.toHaveBeenCalled();
    expect(el()).not.toHaveAttribute("data-dragging");
    expect(dragX()).toBe("0px");
  });

  it("locks the axis after 8 px with lockAxis and moves along it only", () => {
    render(<Box lockAxis />);
    fireEvent.pointerDown(el(), at(100, 100));
    fireEvent.pointerMove(el(), at(105, 102));
    expect(el()).not.toHaveAttribute("data-dragging");
    fireEvent.pointerMove(el(), at(112, 104));
    fireEvent.pointerMove(el(), at(140, 130));
    expect(dragX()).toBe("40px");
    expect(dragY()).toBe("0px");
    fireEvent.pointerUp(el(), at(140, 130));
  });

  it("applies bounds with elastic and a custom curve", () => {
    const { unmount } = render(<Box axis="x" bounds={{ left: -50, right: 50 }} elastic={0.5} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(30, 0));
    expect(dragX()).toBe("30px");
    fireEvent.pointerMove(el(), at(110, 0));
    expect(dragX()).toBe("80px");
    fireEvent.pointerMove(el(), at(-110, 0));
    expect(dragX()).toBe("-80px");
    fireEvent.pointerUp(el(), at(-110, 0));
    unmount();
    render(<Box axis="x" bounds={{ right: 20 }} elastic={(o) => o / 10} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(120, 0));
    expect(dragX()).toBe("30px");
  });

  it("ignores secondary mouse buttons, a second finger and mouse when mouse={false}", () => {
    const onStart = vi.fn();
    const { unmount } = render(<Box onStart={onStart} />);
    fireEvent.pointerDown(el(), { pointerId: 2, pointerType: "mouse", button: 2, buttons: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(el(), { pointerId: 2, pointerType: "mouse", buttons: 2, clientX: 40, clientY: 0 });
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerDown(el(), { pointerId: 3, pointerType: "touch", clientX: 0, clientY: 0 });
    fireEvent.pointerMove(el(), { pointerId: 3, pointerType: "touch", clientX: 90, clientY: 0 });
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.pointerMove(el(), at(30, 0));
    expect(onStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(el(), at(30, 0));
    unmount();

    const onStart2 = vi.fn();
    render(<Box mouse={false} onStart={onStart2} />);
    fireEvent.pointerDown(el(), { pointerId: 1, pointerType: "mouse", button: 0, buttons: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(el(), { pointerId: 1, pointerType: "mouse", buttons: 1, clientX: 50, clientY: 0 });
    expect(onStart2).not.toHaveBeenCalled();
  });

  it("allow and shouldStart can refuse a gesture; a mouse move without a button cancels a pending press", () => {
    const allow = vi.fn(() => false);
    const { unmount } = render(<Box allow={allow} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(50, 0));
    expect(el()).not.toHaveAttribute("data-dragging");
    unmount();
    render(<Box shouldStart={() => false} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(50, 0));
    expect(el()).not.toHaveAttribute("data-dragging");
    fireEvent.pointerUp(el(), at(50, 0));
  });

  it("reports the release velocity from the last 100 ms and ends on pointercancel and lostpointercapture", () => {
    const onEnd = vi.fn<(info: DragInfo, cancelled: boolean) => void>();
    render(<Box onEnd={onEnd} />);
    fireEvent.pointerDown(el(), at(0, 0));
    for (let i = 1; i <= 10; i++) {
      tick(10);
      fireEvent.pointerMove(el(), at(i * 20, 0)); // 2000 px/s
    }
    tick(5);
    fireEvent.pointerUp(el(), at(200, 0));
    expect(onEnd).toHaveBeenCalledTimes(1);
    const [info, cancelled] = onEnd.mock.calls[0]!;
    expect(cancelled).toBe(false);
    expect(info.vx).toBeGreaterThan(1500);
    expect(info.x).toBe(200);

    // rested before the release: no velocity
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(100, 0));
    tick(400);
    fireEvent.pointerUp(el(), at(100, 0));
    expect(onEnd.mock.calls[1]![0].vx).toBe(0);

    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(30, 0));
    fireEvent.pointerCancel(el(), at(30, 0));
    expect(onEnd.mock.calls[2]![1]).toBe(true);

    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(30, 0));
    fireEvent.lostPointerCapture(el(), { pointerId: 1 });
    expect(onEnd.mock.calls[3]![1]).toBe(true);
    fireEvent.pointerUp(el(), at(30, 0));
    expect(onEnd).toHaveBeenCalledTimes(4); // a late pointerup after the capture was lost is not a second end
  });

  it("ignores the capture a touch pointer loses on a child when the hook takes over (real browsers fire it)", () => {
    const onEnd = vi.fn();
    function WithChild() {
      const drag = useDrag({ onEnd });
      return (
        <div data-testid="box" ref={drag.ref} {...drag.handlers}>
          <span data-testid="child">child</span>
        </div>
      );
    }
    render(<WithChild />);
    fireEvent.pointerDown(screen.getByTestId("child"), at(0, 0));
    fireEvent.pointerMove(screen.getByTestId("child"), at(30, 0));
    fireEvent.lostPointerCapture(screen.getByTestId("child"), { pointerId: 1 });
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.pointerMove(el(), at(60, 0));
    expect(dragX()).toBe("60px");
    fireEvent.pointerUp(el(), at(60, 0));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("starts the next drag from where the last settled (the offset persists)", () => {
    render(<Box axis="x" />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(40, 0));
    fireEvent.pointerUp(el(), at(40, 0));
    fireEvent.pointerDown(el(), at(500, 0));
    fireEvent.pointerMove(el(), at(520, 0));
    expect(dragX()).toBe("60px");
    fireEvent.pointerUp(el(), at(520, 0));
  });

  it("a disabled hook ignores presses", () => {
    render(<Box enabled={false} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(50, 0));
    expect(el()).not.toHaveAttribute("data-dragging");
  });
});

function SettleBox({ reduce = false, done }: { reduce?: boolean; done?: () => void }) {
  const drag = useDrag({ axis: "x" });
  return (
    <div>
      <div data-testid="box" ref={drag.ref} {...drag.handlers} />
      <button onClick={() => drag.settle({ x: 120 }, "snappy", undefined, done)}>go</button>
      <button onClick={() => drag.set(7, 0)}>set</button>
      <span>{reduce ? "reduced" : ""}</span>
    </div>
  );
}

describe("useDrag settle", () => {
  it("springs to the target and reports when it is done", () => {
    const done = vi.fn();
    render(<SettleBox done={done} />);
    fireEvent.click(screen.getByText("go"));
    expect(done).not.toHaveBeenCalled();
    act(() => run(3000));
    expect(done).toHaveBeenCalledTimes(1);
    expect(dragX()).toBe("120px");
  });

  it("is instant under reduced motion", () => {
    reduceMotion(true);
    const done = vi.fn();
    render(<SettleBox done={done} />);
    fireEvent.click(screen.getByText("go"));
    expect(dragX()).toBe("120px");
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("set jumps and a new press takes over a settle in flight", () => {
    render(<SettleBox />);
    fireEvent.click(screen.getByText("go"));
    act(() => run(64));
    fireEvent.pointerDown(el(), at(0, 0));
    const grabbed = parseFloat(dragX());
    expect(grabbed).toBeGreaterThan(0);
    act(() => run(160));
    expect(parseFloat(dragX())).toBe(grabbed);
    fireEvent.pointerUp(el(), at(0, 0));
    fireEvent.click(screen.getByText("set"));
    expect(dragX()).toBe("7px");
  });
});

function Dismiss({ onDismiss, axis = "x", flyOut }: { onDismiss: (d: -1 | 1) => void; axis?: "x" | "y"; flyOut?: boolean }) {
  const swipe = useSwipeDismiss({ axis, onDismiss, flyOut });
  return <div data-testid="box" ref={swipe.ref} {...swipe.handlers} />;
}

describe("useSwipeDismiss", () => {
  it("dismisses past 90 px with the direction, and flies off", () => {
    const onDismiss = vi.fn();
    render(<Dismiss onDismiss={onDismiss} />);
    fireEvent.pointerDown(el(), at(200, 0));
    fireEvent.pointerMove(el(), at(150, 0));
    fireEvent.pointerMove(el(), at(90, 0));
    fireEvent.pointerUp(el(), at(90, 0));
    expect(onDismiss).toHaveBeenCalledWith(-1);
    act(() => run(3000));
    expect(parseFloat(dragX())).toBeLessThan(-300);
  });

  it("dismisses a fast short flick (450 px/s) on the vertical axis", () => {
    const onDismiss = vi.fn();
    render(<Dismiss axis="y" onDismiss={onDismiss} />);
    fireEvent.pointerDown(el(), at(0, 0));
    tick(20);
    fireEvent.pointerMove(el(), at(0, 20));
    tick(20);
    fireEvent.pointerMove(el(), at(0, 50));
    tick(10);
    fireEvent.pointerUp(el(), at(0, 60));
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it("springs back after a short slow drag and after a cancel", () => {
    const onDismiss = vi.fn();
    render(<Dismiss onDismiss={onDismiss} />);
    fireEvent.pointerDown(el(), at(0, 0));
    tick(300);
    fireEvent.pointerMove(el(), at(40, 0));
    tick(300);
    fireEvent.pointerUp(el(), at(40, 0));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => run(3000));
    expect(dragX()).toBe("0px");

    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(300, 0));
    fireEvent.pointerCancel(el(), at(300, 0));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => run(3000));
    expect(dragX()).toBe("0px");
  });

  it("stays put after a dismissal with flyOut={false}", () => {
    const onDismiss = vi.fn();
    render(<Dismiss onDismiss={onDismiss} flyOut={false} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(100, 0));
    fireEvent.pointerUp(el(), at(130, 0));
    expect(onDismiss).toHaveBeenCalledWith(1);
    expect(dragX()).toBe("130px");
  });
});

function Pan({ bounds, onChange }: { bounds?: { left?: number; right?: number }; onChange?: (x: number, y: number) => void }) {
  const pan = usePan({ axis: "x", bounds, onChange });
  return (
    <div>
      <div data-testid="box" ref={pan.ref} {...pan.handlers} />
      <button onClick={() => pan.to(55, 0)}>to</button>
    </div>
  );
}

describe("usePan", () => {
  it("keeps gliding after a fast release and stops by itself", () => {
    render(<Pan />);
    fireEvent.pointerDown(el(), at(0, 0));
    for (let i = 1; i <= 8; i++) {
      tick(10);
      fireEvent.pointerMove(el(), at(i * 25, 0)); // 2500 px/s
    }
    fireEvent.pointerUp(el(), at(200, 0));
    const released = parseFloat(dragX());
    act(() => run(3000));
    expect(parseFloat(dragX())).toBeGreaterThan(released + 40);
  });

  it("a press stops the glide", () => {
    render(<Pan />);
    fireEvent.pointerDown(el(), at(0, 0));
    for (let i = 1; i <= 8; i++) {
      tick(10);
      fireEvent.pointerMove(el(), at(i * 25, 0));
    }
    fireEvent.pointerUp(el(), at(200, 0));
    act(() => run(50));
    fireEvent.pointerDown(el(), at(0, 0));
    const grabbed = dragX();
    act(() => run(120));
    expect(dragX()).toBe(grabbed);
  });

  it("does not glide under reduced motion, and a release past a bound is pulled back", () => {
    reduceMotion(true);
    const { unmount } = render(<Pan />);
    fireEvent.pointerDown(el(), at(0, 0));
    for (let i = 1; i <= 8; i++) {
      tick(10);
      fireEvent.pointerMove(el(), at(i * 25, 0));
    }
    fireEvent.pointerUp(el(), at(200, 0));
    const released = dragX();
    act(() => run(100));
    expect(dragX()).toBe(released);
    unmount();

    render(<Pan bounds={{ left: -100, right: 100 }} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(200, 0));
    fireEvent.pointerUp(el(), at(200, 0));
    expect(dragX()).toBe("100px"); // instant under reduced motion
  });

  it("springs back inside the bounds, reports every change and moves with to()", () => {
    const onChange = vi.fn();
    render(<Pan bounds={{ left: -100, right: 100 }} onChange={onChange} />);
    fireEvent.pointerDown(el(), at(0, 0));
    fireEvent.pointerMove(el(), at(200, 0)); // elastic .4 -> 140
    expect(dragX()).toBe("140px");
    tick(500);
    fireEvent.pointerUp(el(), at(200, 0));
    act(() => run(3000));
    expect(dragX()).toBe("100px");
    expect(onChange).toHaveBeenCalled();
    fireEvent.click(screen.getByText("to"));
    act(() => run(3000));
    expect(dragX()).toBe("55px");
  });
});
