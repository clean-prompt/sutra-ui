/** SwipeRow: follows the finger, reveals and commits actions, rubber band, spring release, keys and buttons, controlled, a11y. */
import "./gesture-pointer";
import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SwipeRow, type SwipeAction } from "../src/patterns/swipe-row";
import { Item, ItemContent, ItemGroup, ItemTitle } from "../src/primitives/item";
import { swipeRowRelease } from "../src/lib/gesture";
import { axeViolations } from "./a11y";

const original = window.matchMedia;
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: on && query.includes("reduce") })) as typeof window.matchMedia;
};
let clock = 0;
let frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
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
  const real = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.getAttribute("data-slot") === "swipe-row") return { width: 360, height: 56, top: 0, left: 0, right: 360, bottom: 56, x: 0, y: 0, toJSON() {} } as DOMRect;
    return real.call(this);
  });
  reduceMotion(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = original;
});

const touch = { pointerId: 1, pointerType: "touch", isPrimary: true } as const;
const at = (x: number, y = 0) => ({ ...touch, clientX: x, clientY: y });
const tick = (ms: number) => {
  clock += ms;
};

const start: SwipeAction[] = [{ id: "done", label: "Done", tone: "success" }];
const end: SwipeAction[] = [
  { id: "snooze", label: "Snooze", tone: "warning" },
  { id: "delete", label: "Delete", tone: "destructive" },
];

function Row(props: Partial<React.ComponentProps<typeof SwipeRow>>) {
  return (
    <SwipeRow data-testid="row" startActions={start} endActions={end} {...props}>
      {props.children ?? (
        <Item>
          <ItemContent>
            <ItemTitle>Pay rent</ItemTitle>
          </ItemContent>
        </Item>
      )}
    </SwipeRow>
  );
}
const row = () => screen.getByTestId("row");
const x = () => parseFloat(row().style.getPropertyValue("--sutra-drag-x"));

/** A slow drag from 0 to `to` px (touch). */
function slowDrag(to: number, { release = to }: { release?: number } = {}) {
  fireEvent.pointerDown(row(), at(200));
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    tick(120);
    fireEvent.pointerMove(row(), at(200 + (to * i) / steps));
  }
  tick(300);
  fireEvent.pointerUp(row(), at(200 + release));
}
function flick(distance: number, ms = 60) {
  fireEvent.pointerDown(row(), at(200));
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    tick(ms / steps);
    fireEvent.pointerMove(row(), at(200 + (distance * i) / steps));
  }
  fireEvent.pointerUp(row(), at(200 + distance));
}

describe("swipeRowRelease (pure)", () => {
  const base = { startWidth: 72, endWidth: 144, rowWidth: 360 };
  it("opens past 40% of the actions' width and closes below", () => {
    expect(swipeRowRelease({ ...base, offset: 40 })).toEqual({ type: "reveal", side: "start" });
    expect(swipeRowRelease({ ...base, offset: 20 })).toEqual({ type: "closed" });
    expect(swipeRowRelease({ ...base, offset: -70 })).toEqual({ type: "reveal", side: "end" });
    expect(swipeRowRelease({ ...base, offset: -40 })).toEqual({ type: "closed" });
  });
  it("a flick projects the landing point", () => {
    expect(swipeRowRelease({ ...base, offset: 20, velocity: 400 })).toEqual({ type: "reveal", side: "start" });
    expect(swipeRowRelease({ ...base, offset: 72, velocity: -400 })).toEqual({ type: "closed" });
    expect(swipeRowRelease({ ...base, offset: 72, velocity: -900 })).toEqual({ type: "reveal", side: "end" }); // thrown through the middle
  });
  it("commits past half the row, or fast with the actions mostly out; never without a side or with commit off", () => {
    expect(swipeRowRelease({ ...base, offset: 200 })).toEqual({ type: "commit", side: "start" });
    expect(swipeRowRelease({ ...base, offset: -200 })).toEqual({ type: "commit", side: "end" });
    expect(swipeRowRelease({ ...base, offset: 60, velocity: 1500 })).toEqual({ type: "commit", side: "start" });
    expect(swipeRowRelease({ ...base, offset: 200, commit: false })).toEqual({ type: "reveal", side: "start" });
    expect(swipeRowRelease({ ...base, startWidth: 0, offset: 200 })).toEqual({ type: "closed" });
    expect(swipeRowRelease({ ...base, offset: 0 })).toEqual({ type: "closed" });
  });
});

describe("SwipeRow", () => {
  it("follows the finger and opens on a slow drag past 40% of the actions' width", () => {
    const onValueChange = vi.fn();
    render(<Row onValueChange={onValueChange} />);
    fireEvent.pointerDown(row(), at(200));
    fireEvent.pointerMove(row(), at(190));
    fireEvent.pointerMove(row(), at(150));
    expect(row()).toHaveAttribute("data-dragging", "true");
    expect(x()).toBe(-50);
    fireEvent.pointerUp(row(), at(100));
    expect(onValueChange).toHaveBeenLastCalledWith("end");
    act(() => run(2000));
    expect(x()).toBe(-144);
    expect(row()).toHaveAttribute("data-state", "end");
  });

  it("does not re-render per pointer move", () => {
    const onRender = vi.fn();
    render(
      <React.Profiler id="row" onRender={onRender}>
        <Row />
      </React.Profiler>
    );
    fireEvent.pointerDown(row(), at(200));
    fireEvent.pointerMove(row(), at(190));
    const commits = onRender.mock.calls.length;
    for (let i = 1; i <= 25; i++) fireEvent.pointerMove(row(), at(190 - i * 3));
    expect(onRender.mock.calls.length).toBe(commits);
    expect(x()).toBe(-85);
    fireEvent.pointerUp(row(), at(115));
  });

  it("opens the start side on a drag toward the end and springs back from a short drag", () => {
    render(<Row />);
    slowDrag(60);
    act(() => run(2000));
    expect(x()).toBe(72);
    expect(row()).toHaveAttribute("data-state", "start");
    slowDrag(-60);
    act(() => run(2000));
    expect(x()).toBe(0);
    expect(row()).toHaveAttribute("data-state", "closed");
  });

  it("rubber-bands past the open position instead of moving freely, and past a side without actions", () => {
    render(<Row commit={false} startActions={[]} />);
    fireEvent.pointerDown(row(), at(200));
    fireEvent.pointerMove(row(), at(210));
    fireEvent.pointerMove(row(), at(400)); // 190 px to the right where nothing is revealed
    expect(x()).toBeGreaterThan(0);
    expect(x()).toBeLessThan(72);
    fireEvent.pointerMove(row(), at(0)); // 200 to the left, the end actions are 144 wide
    expect(x()).toBeLessThan(-144);
    expect(x()).toBeGreaterThan(-144 - 72);
    fireEvent.pointerUp(row(), at(0));
  });

  it("a full swipe runs the outermost action; the row flies out and comes back", () => {
    const onAction = vi.fn();
    const onSelect = vi.fn();
    render(<Row onAction={onAction} endActions={[end[0]!, { ...end[1]!, onSelect }]} />);
    slowDrag(-230);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]![0].id).toBe("delete");
    expect(onAction.mock.calls[0]![1]).toBe("end");
    expect(onSelect).toHaveBeenCalledTimes(1);
    act(() => run(3000));
    expect(x()).toBe(0);
    expect(row()).toHaveAttribute("data-state", "closed");
  });

  it("a fast flick commits; a commit mark picks the action; commit={false} only reveals", () => {
    const onAction = vi.fn();
    const { unmount } = render(<Row onAction={onAction} startActions={[{ id: "a", label: "A" }, { id: "b", label: "B", commit: true }]} />);
    flick(120, 60);
    expect(onAction.mock.calls[0]![0].id).toBe("b");
    unmount();
    const onAction2 = vi.fn();
    render(<Row onAction={onAction2} commit={false} />);
    slowDrag(230);
    expect(onAction2).not.toHaveBeenCalled();
    act(() => run(2000));
    expect(x()).toBe(72);
  });

  it("buttons are real buttons: a press runs onAction and closes", () => {
    const onAction = vi.fn();
    render(<Row onAction={onAction} defaultValue="end" />);
    const group = screen.getAllByRole("group", { name: "Actions" })[1]!;
    fireEvent.click(within(group).getByRole("button", { name: "Snooze" }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: "snooze" }), "end");
    expect(row()).toHaveAttribute("data-state", "closed");
  });

  it("opens its side when an action takes focus and closes when focus leaves", () => {
    render(<Row />);
    act(() => screen.getByRole("button", { name: "Done" }).focus());
    expect(row()).toHaveAttribute("data-state", "start");
    act(() => run(2000));
    expect(x()).toBe(72);
    act(() => screen.getByRole("button", { name: "Done" }).blur());
    expect(row()).toHaveAttribute("data-state", "closed");
  });

  it("Arrow keys on the row open and close it, Escape closes and returns focus", () => {
    render(
      <Row>
        <button type="button">Open note</button>
      </Row>
    );
    const open = screen.getByRole("button", { name: "Open note" });
    act(() => open.focus());
    fireEvent.keyDown(open, { key: "ArrowLeft" });
    expect(row()).toHaveAttribute("data-state", "end");
    expect(screen.getByRole("button", { name: "Snooze" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Snooze" }), { key: "ArrowRight" });
    expect(row()).toHaveAttribute("data-state", "closed");
    expect(open).toHaveFocus();
    fireEvent.keyDown(open, { key: "ArrowRight" });
    expect(row()).toHaveAttribute("data-state", "start");
    fireEvent.keyDown(screen.getByRole("button", { name: "Done" }), { key: "Escape" });
    expect(row()).toHaveAttribute("data-state", "closed");
    expect(open).toHaveFocus();
  });

  it("arrow keys are left alone inside text fields", () => {
    render(
      <Row>
        <input aria-label="Title" />
      </Row>
    );
    fireEvent.keyDown(screen.getByLabelText("Title"), { key: "ArrowLeft" });
    expect(row()).toHaveAttribute("data-state", "closed");
  });

  it("is controlled with value / onValueChange and follows outside changes", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Row value={null} onValueChange={onValueChange} />);
    rerender(<Row value="start" onValueChange={onValueChange} />);
    act(() => run(2000));
    expect(x()).toBe(72);
    slowDrag(-80);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("starts open at once with defaultValue (no animation on mount)", () => {
    render(<Row defaultValue="end" />);
    expect(x()).toBe(-144);
  });

  it("a tap on an open row closes it without activating the content", () => {
    const onClick = vi.fn();
    render(
      <Row defaultValue="end">
        <button type="button" onClick={onClick}>
          Open note
        </button>
      </Row>
    );
    fireEvent.click(screen.getByRole("button", { name: "Open note" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(row()).toHaveAttribute("data-state", "closed");
    fireEvent.click(screen.getByRole("button", { name: "Open note" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("closes when the pointer goes down outside", () => {
    render(
      <div>
        <button>outside</button>
        <Row defaultValue="start" />
      </div>
    );
    fireEvent.pointerDown(screen.getByText("outside"), at(5));
    expect(row()).toHaveAttribute("data-state", "closed");
  });

  it("under reduced motion the release is instant", () => {
    reduceMotion(true);
    render(<Row />);
    slowDrag(60);
    expect(x()).toBe(72);
  });

  it("disabled rows do not drag", () => {
    render(<Row disabled />);
    slowDrag(-100);
    expect(x()).toBe(0);
    expect(row()).not.toHaveAttribute("data-dragging");
  });

  it("does not drag from a text field; hands touch-action pan-y to the page for vertical scrolling", () => {
    render(
      <Row>
        <input aria-label="Title" />
      </Row>
    );
    expect(row().style.touchAction).toBe("pan-y");
    fireEvent.pointerDown(screen.getByLabelText("Title"), at(200));
    fireEvent.pointerMove(screen.getByLabelText("Title"), at(100));
    expect(row()).not.toHaveAttribute("data-dragging");
  });

  it("works in an ItemGroup, keeps the list semantics and has no axe violations", async () => {
    const { container } = render(
      <ItemGroup>
        <SwipeRow endActions={end} startActions={start}>
          <Item>
            <ItemContent>
              <ItemTitle>One</ItemTitle>
            </ItemContent>
          </Item>
        </SwipeRow>
        <SwipeRow endActions={end}>
          <Item>
            <ItemContent>
              <ItemTitle>Two</ItemTitle>
            </ItemContent>
          </Item>
        </SwipeRow>
      </ItemGroup>
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps consumer handlers and forwards the ref", () => {
    const onPointerDown = vi.fn();
    const ref = React.createRef<HTMLDivElement>();
    render(<Row ref={ref} onPointerDown={onPointerDown} className="custom" />);
    fireEvent.pointerDown(row(), at(10));
    expect(onPointerDown).toHaveBeenCalled();
    expect(ref.current).toBe(row());
    expect(row()).toHaveClass("custom");
  });
});
