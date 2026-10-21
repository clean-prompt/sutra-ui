/**
 * WheelPicker and WheelPickerGroup: the pure helpers (lib/wheel), the listbox contract (roles, active descendant, keys,
 * type-ahead), settling a scroll into a value (fake timers), controlled and uncontrolled use, loading and empty, axe.
 * jsdom has no layout, so a scroll is simulated by setting `scrollTop` and firing `scroll`.
 */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { wheelEdgeEnabled, wheelNearestEnabled, wheelScrollTop, wheelIndex, wheelStepEnabled, typeAheadIndex, wheelRange } from "../src/lib/wheel";
import { WheelPicker, WheelPickerGroup } from "../src/primitives/wheel-picker";
import { axeViolations } from "./helpers/a11y";

describe("lib/wheel", () => {
  it("wheelIndex rounds the scroll position to a row and clamps to the list", () => {
    expect(wheelIndex(0, 36, 10)).toBe(0);
    expect(wheelIndex(53, 36, 10)).toBe(1); // 1.47
    expect(wheelIndex(55, 36, 10)).toBe(2); // 1.53
    expect(wheelIndex(-40, 36, 10)).toBe(0);
    expect(wheelIndex(9999, 36, 10)).toBe(9);
    expect(wheelIndex(100, 36, 0)).toBe(0);
    expect(wheelScrollTop(3, 36)).toBe(108);
  });

  it("wheelNearestEnabled, wheelStepEnabled and wheelEdgeEnabled skip disabled rows and never wrap", () => {
    const d = [true, false, true, true, false, true];
    expect(wheelNearestEnabled(d, 0)).toBe(1);
    expect(wheelNearestEnabled(d, 3)).toBe(4); // 2 away from 1, 1 away from 4
    expect(wheelNearestEnabled(d, 2)).toBe(1); // tie: the upper one
    expect(wheelNearestEnabled([true, true], 0)).toBe(-1);
    expect(wheelStepEnabled(d, 1, 1)).toBe(4);
    expect(wheelStepEnabled(d, 4, 1)).toBe(4); // nothing after
    expect(wheelStepEnabled(d, 4, -5)).toBe(1);
    expect(wheelEdgeEnabled(d, "first")).toBe(1);
    expect(wheelEdgeEnabled(d, "last")).toBe(4);
    expect(wheelEdgeEnabled([true], "last")).toBe(-1);
  });

  it("typeAheadIndex matches a prefix, cycles on a repeated letter and skips disabled rows", () => {
    const texts = ["Apple", "Avocado", "Banana", "Blueberry", "Cherry"];
    const none = texts.map(() => false);
    expect(typeAheadIndex(texts, none, "b", 0)).toBe(2);
    expect(typeAheadIndex(texts, none, "bl", 2)).toBe(3);
    expect(typeAheadIndex(texts, none, "b", 2)).toBe(3); // same letter again: next row with it
    expect(typeAheadIndex(texts, none, "bb", 3)).toBe(2); // wraps
    expect(typeAheadIndex(texts, [false, false, true, false, false], "ba", 0)).toBe(-1);
    expect(typeAheadIndex(texts, none, "z", 0)).toBe(-1);
    expect(typeAheadIndex(texts, none, "", 0)).toBe(-1);
  });

  it("wheelRange builds padded numeric options", () => {
    expect(wheelRange(0, 3)).toEqual(["0", "1", "2", "3"]);
    expect(wheelRange(0, 45, { step: 15, pad: 2 })).toEqual(["00", "15", "30", "45"]);
    expect(wheelRange(1, 3, { step: 0 })).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */

const original = window.matchMedia;
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = original;
});

const fruit = ["Apple", "Avocado", "Banana", "Blueberry", "Cherry", "Date", "Elderberry"];
const listbox = () => screen.getByRole("listbox");
const selectedOption = () => screen.getByRole("option", { selected: true });
const scrollTo = (list: HTMLElement, top: number) => {
  list.scrollTop = top;
  fireEvent.scroll(list);
};

describe("WheelPicker", () => {
  it("is a named listbox with the value as the selected option and the active descendant", () => {
    render(<WheelPicker aria-label="Fruit" options={fruit} defaultValue="Banana" />);
    expect(listbox()).toHaveAccessibleName("Fruit");
    expect(screen.getAllByRole("option")).toHaveLength(7);
    expect(selectedOption()).toHaveTextContent("Banana");
    expect(listbox().getAttribute("aria-activedescendant")).toBe(selectedOption().id);
    expect(listbox().tabIndex).toBe(0);
  });

  it("lands the scroll on the value at mount and marks the centre row", () => {
    render(<WheelPicker aria-label="Fruit" options={fruit} defaultValue="Cherry" itemHeight={40} />);
    expect(listbox().scrollTop).toBe(160);
    expect(selectedOption()).toHaveAttribute("data-centered");
  });

  it("defaults to the first enabled option", () => {
    render(<WheelPicker aria-label="Fruit" options={[{ value: "a", disabled: true }, "b", "c"]} />);
    expect(selectedOption()).toHaveTextContent("b");
  });

  it("arrow keys, page keys, Home and End move the value and report it", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker aria-label="Fruit" options={fruit} defaultValue="Banana" onValueChange={onValueChange} />);
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(selectedOption()).toHaveTextContent("Blueberry");
    fireEvent.keyDown(listbox(), { key: "ArrowUp" });
    fireEvent.keyDown(listbox(), { key: "ArrowUp" });
    expect(selectedOption()).toHaveTextContent("Avocado");
    fireEvent.keyDown(listbox(), { key: "End" });
    expect(selectedOption()).toHaveTextContent("Elderberry");
    fireEvent.keyDown(listbox(), { key: "ArrowDown" }); // already last: no wrap
    expect(selectedOption()).toHaveTextContent("Elderberry");
    fireEvent.keyDown(listbox(), { key: "PageUp" });
    expect(selectedOption()).toHaveTextContent("Avocado");
    fireEvent.keyDown(listbox(), { key: "Home" });
    expect(selectedOption()).toHaveTextContent("Apple");
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual(["Blueberry", "Banana", "Avocado", "Elderberry", "Avocado", "Apple"]);
  });

  it("keys skip disabled rows; type-ahead selects by prefix and cycles; a pause resets the query", () => {
    render(<WheelPicker aria-label="Fruit" options={[{ value: "Apple" }, { value: "Avocado", disabled: true }, { value: "Banana" }, { value: "Blueberry" }, { value: "Cherry" }]} defaultValue="Apple" />);
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(selectedOption()).toHaveTextContent("Banana");
    fireEvent.keyDown(listbox(), { key: "c" });
    expect(selectedOption()).toHaveTextContent("Cherry");
    act(() => void vi.advanceTimersByTime(700));
    fireEvent.keyDown(listbox(), { key: "b" });
    expect(selectedOption()).toHaveTextContent("Banana");
    fireEvent.keyDown(listbox(), { key: "b" });
    expect(selectedOption()).toHaveTextContent("Blueberry");
    fireEvent.keyDown(listbox(), { key: "a", ctrlKey: true }); // shortcuts are left alone
    expect(selectedOption()).toHaveTextContent("Blueberry");
  });

  it("clicking a row selects it; a disabled row ignores the click", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker aria-label="Fruit" options={[{ value: "a" }, { value: "b", disabled: true }, { value: "c" }]} defaultValue="a" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("option", { name: "b" }));
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("option", { name: "c" }));
    expect(onValueChange).toHaveBeenCalledWith("c");
    expect(screen.getByRole("option", { name: "b" })).toHaveAttribute("aria-disabled", "true");
  });

  it("a free scroll becomes the value once it stops (timer fallback and scrollend), and tracks the centre row while moving", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker aria-label="Fruit" options={fruit} defaultValue="Apple" itemHeight={36} onValueChange={onValueChange} />);
    scrollTo(listbox(), 76); // 2.1 rows
    expect(onValueChange).not.toHaveBeenCalled(); // still moving
    act(() => void vi.advanceTimersByTime(130));
    expect(onValueChange).toHaveBeenCalledWith("Banana");
    scrollTo(listbox(), 150); // 4.17 rows
    fireEvent(listbox(), new Event("scrollend"));
    expect(onValueChange).toHaveBeenLastCalledWith("Cherry");
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it("a scroll that stops on a disabled row hands over to the nearest enabled one", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker aria-label="n" options={[{ value: "a" }, { value: "b", disabled: true }, { value: "c", disabled: true }, { value: "d" }]} defaultValue="a" itemHeight={36} onValueChange={onValueChange} />);
    scrollTo(listbox(), 36); // row b (disabled): nearest enabled is a (tie goes up)
    act(() => void vi.advanceTimersByTime(130));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(listbox().scrollTop).toBe(0);
    scrollTo(listbox(), 72); // row c: nearest enabled is d
    act(() => void vi.advanceTimersByTime(130));
    expect(onValueChange).toHaveBeenCalledWith("d");
  });

  it("controlled: shows the value, reports changes, scrolls to a new value from the parent", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<WheelPicker aria-label="Fruit" options={fruit} value="Apple" onValueChange={onValueChange} />);
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(onValueChange).toHaveBeenCalledWith("Avocado");
    expect(selectedOption()).toHaveTextContent("Apple"); // the parent did not accept it
    rerender(<WheelPicker aria-label="Fruit" options={fruit} value="Date" onValueChange={onValueChange} />);
    expect(selectedOption()).toHaveTextContent("Date");
    expect(listbox().scrollTop).toBe(5 * 36);
  });

  it("reduced motion: a key press jumps to the row (no smooth scroll)", () => {
    window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("reduce") })) as typeof window.matchMedia;
    render(<WheelPicker aria-label="Fruit" options={fruit} defaultValue="Apple" />);
    const scrollToSpy = vi.fn();
    listbox().scrollTo = scrollToSpy as unknown as typeof listbox extends () => infer T ? (T extends HTMLElement ? T["scrollTo"] : never) : never;
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(listbox().scrollTop).toBe(36);
  });

  it("smooth scroll for keys when motion is allowed", () => {
    render(<WheelPicker aria-label="Fruit" options={fruit} defaultValue="Apple" />);
    const scrollToSpy = vi.fn();
    listbox().scrollTo = scrollToSpy as never;
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 36, behavior: "smooth" });
  });

  it("an even visibleCount becomes odd, so there is a centre row", () => {
    const { container } = render(<WheelPicker aria-label="Fruit" options={fruit} visibleCount={4} itemHeight={30} />);
    expect(container.firstElementChild).toHaveStyle({ height: "150px" });
  });

  it("loading shows placeholders and aria-busy instead of a listbox; no options shows the empty state", () => {
    const { rerender, container } = render(<WheelPicker aria-label="Slots" options={fruit} value="Date" loading />);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    rerender(<WheelPicker aria-label="Slots" options={[]} value="Date" emptyState="No free slots" />);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByText("No free slots")).toBeInTheDocument();
    rerender(<WheelPicker aria-label="Slots" options={fruit} value="Date" />); // the wheel comes back on the value
    expect(listbox().scrollTop).toBe(5 * 36);
  });

  it("scrolling does not render the component per event: only a settled value does", () => {
    let commits = 0;
    render(
      <React.Profiler id="wheel" onRender={() => commits++}>
        <WheelPicker aria-label="Fruit" options={fruit} defaultValue="Apple" itemHeight={36} />
      </React.Profiler>
    );
    const atMount = commits;
    for (let top = 4; top <= 120; top += 4) scrollTo(listbox(), top); // 30 scroll events across three rows
    expect(commits).toBe(atMount);
    act(() => void vi.advanceTimersByTime(130));
    expect(commits - atMount).toBeLessThanOrEqual(1); // one render for the settled value
    expect(selectedOption()).toHaveTextContent("Blueberry");
  });

  it("disabled: not focusable, ignores keys", () => {
    render(<WheelPicker aria-label="Fruit" options={fruit} defaultValue="Apple" disabled />);
    expect(listbox().tabIndex).toBe(-1);
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(selectedOption()).toHaveTextContent("Apple");
  });

  it("spreads props on the root after its own and forwards the ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<WheelPicker ref={ref} aria-label="Fruit" options={fruit} data-testid="w" className="w-24" id="mine" />);
    expect(ref.current).toBe(screen.getByTestId("w"));
    expect(ref.current).toHaveAttribute("id", "mine");
    expect(ref.current).toHaveClass("w-24");
  });

  it("has no axe violations (default, group, loading, empty)", async () => {
    vi.useRealTimers();
    const { container } = render(
      <div>
        <WheelPicker aria-label="Fruit" options={fruit} defaultValue="Banana" />
        <WheelPickerGroup aria-label="Time" columns={[{ id: "h", label: "Hours", options: wheelRange(1, 12), separator: ":" }, { id: "m", label: "Minutes", options: wheelRange(0, 59, { pad: 2 }) }]} />
        <WheelPicker aria-label="Slots" options={fruit} loading />
        <WheelPicker aria-label="Slots" options={[]} />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("WheelPickerGroup", () => {
  const columns = [
    { id: "h", label: "Hours", options: wheelRange(1, 12), separator: ":" },
    { id: "m", label: "Minutes", options: wheelRange(0, 59, { pad: 2 }) },
    { id: "p", label: "Period", options: ["AM", "PM"] },
  ];

  it("is a labelled group of named listboxes with a value per column", () => {
    render(<WheelPickerGroup aria-label="Start time" columns={columns} defaultValue={["9", "30", "PM"]} />);
    expect(screen.getByRole("group", { name: "Start time" })).toBeInTheDocument();
    expect(screen.getAllByRole("listbox").map((l) => l.getAttribute("aria-label"))).toEqual(["Hours", "Minutes", "Period"]);
    expect(screen.getAllByRole("option", { selected: true }).map((o) => o.textContent)).toEqual(["9", "30", "PM"]);
  });

  it("changing one column reports the whole value and which column moved", () => {
    const onValueChange = vi.fn();
    render(<WheelPickerGroup aria-label="Start time" columns={columns} defaultValue={["9", "30", "AM"]} onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Minutes" }), { key: "ArrowDown" });
    expect(onValueChange).toHaveBeenLastCalledWith(["9", "31", "AM"], { columnId: "m", index: 1 });
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Period" }), { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith(["9", "31", "PM"], { columnId: "p", index: 2 });
  });

  it("defaults each column to its first option, and is controlled with `value`", () => {
    const { rerender } = render(<WheelPickerGroup aria-label="Duration" columns={columns} />);
    expect(screen.getAllByRole("option", { selected: true }).map((o) => o.textContent)).toEqual(["1", "00", "AM"]);
    rerender(<WheelPickerGroup aria-label="Duration" columns={columns} value={["12", "05", "PM"]} />);
    expect(screen.getAllByRole("option", { selected: true }).map((o) => o.textContent)).toEqual(["12", "05", "PM"]);
  });
});
