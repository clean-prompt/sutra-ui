/** UndoAction: counted undo window on the wall clock, commit only at the end, pause, controlled arming (Toast pairing), live region, axe. */
import "./gesture-pointer";
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UndoAction } from "../src/primitives/undo-action";
import { axeViolations } from "./a11y";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const button = () => screen.getByRole("button");
const root = () => document.querySelector<HTMLElement>('[data-slot="undo-action"]')!;
const status = () => screen.getByRole("status");
const dash = () => Number(root().querySelector("circle:last-of-type")!.getAttribute("stroke-dashoffset"));

describe("UndoAction", () => {
  it("is a destructive button until pressed, then a counted Undo; it commits only at the end", () => {
    const onCommit = vi.fn();
    const onArm = vi.fn();
    render(<UndoAction onCommit={onCommit} onArm={onArm} seconds={5} />);
    expect(button()).toHaveAccessibleName("Delete");
    expect(root()).toHaveAttribute("data-state", "idle");
    fireEvent.click(button());
    expect(onArm).toHaveBeenCalledTimes(1);
    expect(root()).toHaveAttribute("data-state", "armed");
    expect(button()).toHaveAccessibleName("Undo");
    expect(root().querySelector('[data-slot="undo-action-ring"]')).toHaveTextContent("5");
    advance(4900);
    expect(onCommit).not.toHaveBeenCalled();
    expect(root().querySelector('[data-slot="undo-action-ring"]')).toHaveTextContent("1");
    advance(200);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(root()).toHaveAttribute("data-state", "committed");
    expect(root()).toHaveAttribute("aria-disabled", "true");
    expect(button()).toHaveAccessibleName("Deleted");
    advance(60_000);
    expect(onCommit).toHaveBeenCalledTimes(1);
    fireEvent.click(button()); // inert once committed
    expect(root()).toHaveAttribute("data-state", "committed");
  });

  it("Undo cancels the commit and keeps the focus on the same button", () => {
    const onCommit = vi.fn();
    const onUndo = vi.fn();
    render(<UndoAction onCommit={onCommit} onUndo={onUndo} />);
    const before = button();
    act(() => before.focus());
    fireEvent.click(before);
    advance(3000);
    fireEvent.click(button());
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(root()).toHaveAttribute("data-state", "idle");
    expect(button()).toBe(before);
    expect(before).toHaveFocus();
    advance(60_000);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.click(button()); // and it can be armed again, with a fresh window
    advance(7900);
    expect(onCommit).not.toHaveBeenCalled();
    advance(200);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("counts on the wall clock: a throttled timer still commits on time", () => {
    const onCommit = vi.fn();
    render(<UndoAction onCommit={onCommit} seconds={5} />);
    fireEvent.click(button());
    act(() => void vi.setSystemTime(Date.now() + 9000)); // the tab slept, no timer ran
    expect(onCommit).not.toHaveBeenCalled();
    advance(100);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("the ring depletes as time runs out", () => {
    render(<UndoAction onCommit={() => {}} seconds={10} />);
    fireEvent.click(button());
    const start = dash();
    advance(5000);
    expect(dash()).toBeGreaterThan(start);
    expect(dash()).toBeCloseTo(Math.PI * 8, 0); // half of 2 pi r
  });

  it("pauseOnHover holds the countdown and resumes with the time that was left", () => {
    const onCommit = vi.fn();
    render(<UndoAction onCommit={onCommit} seconds={5} pauseOnHover />);
    fireEvent.click(button());
    advance(3000);
    fireEvent.pointerEnter(button(), { pointerType: "mouse" });
    advance(30_000);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerLeave(button(), { pointerType: "mouse" });
    advance(1900);
    expect(onCommit).not.toHaveBeenCalled();
    advance(200);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("without pauseOnHover the pointer does not matter; touch never pauses", () => {
    const onCommit = vi.fn();
    const { unmount } = render(<UndoAction onCommit={onCommit} seconds={2} />);
    fireEvent.click(button());
    fireEvent.pointerEnter(button(), { pointerType: "mouse" });
    advance(2100);
    expect(onCommit).toHaveBeenCalledTimes(1);
    unmount();
    const onCommit2 = vi.fn();
    render(<UndoAction onCommit={onCommit2} seconds={2} pauseOnHover />);
    fireEvent.click(button());
    fireEvent.pointerEnter(button(), { pointerType: "touch" });
    advance(2100);
    expect(onCommit2).toHaveBeenCalledTimes(1);
  });

  it("pairs with a toast through a controlled armed: outside cancel, onArmedChange at the commit", () => {
    const onCommit = vi.fn();
    const onArmedChange = vi.fn();
    function App() {
      const [armed, setArmed] = React.useState(false);
      return (
        <>
          <UndoAction armed={armed} onArmedChange={(a) => (onArmedChange(a), setArmed(a))} onCommit={onCommit} seconds={5} />
          <button onClick={() => setArmed(false)}>toast undo</button>
          <button onClick={() => setArmed(true)}>start</button>
        </>
      );
    }
    render(<App />);
    fireEvent.click(screen.getByText("start")); // armed from outside
    expect(root()).toHaveAttribute("data-state", "armed");
    advance(2000);
    fireEvent.click(screen.getByText("toast undo"));
    expect(root()).toHaveAttribute("data-state", "idle");
    advance(60_000);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.click(root());
    advance(5100);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onArmedChange).toHaveBeenLastCalledWith(false);
    expect(root()).toHaveAttribute("data-state", "committed");
    fireEvent.click(screen.getByText("start")); // re-armed from outside after a commit
    expect(root()).toHaveAttribute("data-state", "armed");
  });

  it("defaultArmed starts the countdown at once", () => {
    const onCommit = vi.fn();
    render(<UndoAction onCommit={onCommit} defaultArmed seconds={3} />);
    expect(root()).toHaveAttribute("data-state", "armed");
    advance(3100);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("a promise from onCommit shows a spinner; a rejection brings the button back", async () => {
    let reject!: (e: Error) => void;
    const onCommit = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    render(<UndoAction onCommit={onCommit} seconds={1} />);
    fireEvent.click(button());
    advance(1100);
    expect(root()).toHaveAttribute("aria-busy", "true");
    await act(async () => reject(new Error("offline")));
    expect(root()).toHaveAttribute("data-state", "idle");
    expect(root()).not.toHaveAttribute("aria-busy");
  });

  it("announces the countdown, the undo and the commit", () => {
    render(<UndoAction onCommit={() => {}} seconds={3} />);
    expect(status()).toHaveTextContent("");
    fireEvent.click(button());
    expect(status()).toHaveTextContent("Undo available for 3 seconds");
    fireEvent.click(button());
    expect(status()).toHaveTextContent("Undone");
    fireEvent.click(button());
    advance(3100);
    expect(status()).toHaveTextContent("Done");
  });

  it("messages, labels and variants can be changed", () => {
    render(
      <UndoAction
        onCommit={() => {}}
        label="Archive"
        undoLabel="Take back"
        committedLabel="Archived"
        messages={{ armed: (s) => `${s}s left`, committed: "Archived it" }}
        variant="outline"
        armedVariant="ghost"
        seconds={2}
      />
    );
    expect(button()).toHaveAccessibleName("Archive");
    fireEvent.click(button());
    expect(button()).toHaveAccessibleName("Take back");
    expect(status()).toHaveTextContent("2s left");
    advance(2100);
    expect(button()).toHaveAccessibleName("Archived");
    expect(status()).toHaveTextContent("Archived it");
  });

  it("an unmounted button never commits", () => {
    const onCommit = vi.fn();
    const { unmount } = render(<UndoAction onCommit={onCommit} seconds={2} />);
    fireEvent.click(button());
    unmount();
    advance(10_000);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("keeps consumer props, forwards the ref, and has no axe violations in any state", async () => {
    const ref = React.createRef<HTMLButtonElement>();
    const { container } = render(<UndoAction ref={ref} onCommit={() => {}} className="custom" data-testid="u" seconds={2} />);
    expect(ref.current).toBe(screen.getByTestId("u"));
    expect(ref.current).toHaveClass("custom");
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
    vi.useFakeTimers();
    fireEvent.click(button());
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });
});
