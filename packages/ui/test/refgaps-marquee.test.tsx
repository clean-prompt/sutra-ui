import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  autoScrollDelta,
  combineSelection,
  rectContains,
  rectFromPoints,
  rectsIntersect,
  useMarqueeSelection,
} from "../src/hooks/use-marquee-selection";
import { SelectionArea, useSelectionArea, type SelectionAreaProps } from "../src/patterns/selection-area";
import { axeViolations } from "./a11y";

// jsdom may lack PointerEvent; without it fireEvent.pointer* drops clientX/clientY.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Box = { left: number; top: number; width: number; height: number };

/** Gives an element a layout: `rect` is read live, so tests can move it (page scroll). */
function layout(el: Element, rect: () => Box) {
  el.getBoundingClientRect = () => {
    const r = rect();
    return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r } as DOMRect;
  };
}

/** Scroll metrics for the container (jsdom has none). */
function scrollable(el: HTMLElement, { clientWidth = 400, clientHeight = 300, scrollWidth = 400, scrollHeight = 300 } = {}) {
  let top = 0;
  let left = 0;
  Object.defineProperties(el, {
    clientWidth: { configurable: true, get: () => clientWidth },
    clientHeight: { configurable: true, get: () => clientHeight },
    scrollWidth: { configurable: true, get: () => scrollWidth },
    scrollHeight: { configurable: true, get: () => scrollHeight },
    scrollTop: { configurable: true, get: () => top, set: (v: number) => (top = Math.max(0, Math.min(v, scrollHeight - clientHeight))) },
    scrollLeft: { configurable: true, get: () => left, set: (v: number) => (left = Math.max(0, Math.min(v, scrollWidth - clientWidth))) },
  });
}

/** Content-space positions of the items (client rect = container rect + this − scroll). */
const ITEM_POS: Record<string, { x: number; y: number }> = {
  a: { x: 10, y: 10 },
  b: { x: 100, y: 10 },
  c: { x: 10, y: 100 },
  d: { x: 100, y: 100 },
};
const IDS = Object.keys(ITEM_POS);

function Grid({ withButton = false }: { withButton?: boolean }) {
  const { getItemProps } = useSelectionArea();
  return (
    <>
      {withButton && <button type="button">New folder</button>}
      {IDS.map((id) => (
        <div key={id} {...getItemProps(id)} aria-label={`File ${id}`}>
          {id}
        </div>
      ))}
    </>
  );
}

/** Renders a SelectionArea and lays it out: container 400×300 at `origin`, items 50×50 at ITEM_POS. */
function setup(props: Partial<SelectionAreaProps> = {}, options: { withButton?: boolean; scroll?: Parameters<typeof scrollable>[1] } = {}) {
  const origin = { left: 0, top: 0 };
  const utils = render(
    <SelectionArea aria-label="Files" {...props}>
      {props.children ?? <Grid withButton={options.withButton} />}
    </SelectionArea>
  );
  const area = screen.getByRole("listbox", { name: "Files" });
  scrollable(area, options.scroll);
  layout(area, () => ({ ...origin, width: 400, height: 300 }));
  for (const id of IDS) {
    const el = area.querySelector(`[data-selection-id="${id}"]`);
    if (!el) continue;
    layout(el, () => ({
      left: origin.left + ITEM_POS[id]!.x - area.scrollLeft,
      top: origin.top + ITEM_POS[id]!.y - area.scrollTop,
      width: 50,
      height: 50,
    }));
  }
  return { ...utils, area, origin };
}

const item = (id: string) => screen.getByRole("option", { name: `File ${id}` });
const selectedIds = () =>
  screen
    .queryAllByRole("option")
    .filter((el) => el.getAttribute("aria-selected") === "true")
    .map((el) => el.getAttribute("data-selection-id"));
const marquee = (area: HTMLElement) => area.querySelector<HTMLElement>("[data-slot='selection-area-marquee']");

type Mods = { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };
function down(target: Element, x: number, y: number, mods: Mods = {}) {
  fireEvent.pointerDown(target, { clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: "mouse", ...mods });
}
function move(x: number, y: number) {
  fireEvent.pointerMove(window, { clientX: x, clientY: y, pointerId: 1, pointerType: "mouse" });
}
function up(x: number, y: number) {
  fireEvent.pointerUp(window, { clientX: x, clientY: y, pointerId: 1, pointerType: "mouse" });
}
function drag(target: Element, from: [number, number], to: [number, number], mods: Mods = {}) {
  down(target, ...from, mods);
  move(from[0] + (to[0] - from[0]) / 2, from[1] + (to[1] - from[1]) / 2);
  move(...to);
  up(...to);
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

describe("marquee geometry", () => {
  it("builds a rect from two points in any direction", () => {
    expect(rectFromPoints({ x: 50, y: 40 }, { x: 10, y: 100 })).toEqual({
      left: 10,
      top: 40,
      right: 50,
      bottom: 100,
      width: 40,
      height: 60,
    });
    expect(rectFromPoints({ x: 5, y: 5 }, { x: 5, y: 5 })).toMatchObject({ width: 0, height: 0 });
  });

  it("tests intersection and containment", () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(rectsIntersect(a, { left: 5, top: 5, right: 20, bottom: 20 })).toBe(true);
    expect(rectsIntersect(a, { left: 10, top: 10, right: 20, bottom: 20 })).toBe(true); // touching edges
    expect(rectsIntersect(a, { left: 11, top: 0, right: 20, bottom: 10 })).toBe(false);
    expect(rectsIntersect(a, { left: 0, top: -20, right: 10, bottom: -1 })).toBe(false);
    expect(rectsIntersect(a, { left: NaN, top: 0, right: 5, bottom: 5 })).toBe(false);
    expect(rectContains(a, { left: 2, top: 2, right: 8, bottom: 8 })).toBe(true);
    expect(rectContains(a, { left: 2, top: 2, right: 12, bottom: 8 })).toBe(false);
  });

  it("combines a drag with the starting selection", () => {
    expect(combineSelection(["a", "b"], ["c", "c"], "replace")).toEqual(["c"]);
    expect(combineSelection(["a", "b"], ["b", "c"], "add")).toEqual(["a", "b", "c"]);
    expect(combineSelection(["a", "b"], ["b", "c"], "toggle")).toEqual(["a", "c"]);
  });

  it("computes auto-scroll speed near the edges", () => {
    expect(autoScrollDelta(150, 0, 300, 30, 20)).toBe(0);
    expect(autoScrollDelta(0, 0, 300, 30, 20)).toBe(-20);
    expect(autoScrollDelta(285, 0, 300, 30, 20)).toBe(10);
    expect(autoScrollDelta(400, 0, 300, 30, 20)).toBe(20); // past the edge: full speed
    expect(autoScrollDelta(5, 0, 0)).toBe(0);
    expect(autoScrollDelta(NaN, 0, 300)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Dragging                                                            */
/* ------------------------------------------------------------------ */

describe("SelectionArea marquee", () => {
  it("selects the items the rectangle touches and draws it while dragging", () => {
    const onValueChange = vi.fn();
    const { area } = setup({ onValueChange });
    down(area, 5, 5);
    move(80, 80);
    const box = marquee(area);
    expect(box).not.toBeNull();
    expect(box!.style.left).toBe("5px");
    expect(box!.style.top).toBe("5px");
    expect(box!.style.width).toBe("75px");
    expect(box!.style.height).toBe("75px");
    expect(selectedIds()).toEqual(["a"]);
    expect(area).toHaveAttribute("data-selecting");
    move(160, 70);
    expect(selectedIds()).toEqual(["a", "b"]);
    up(160, 70);
    expect(marquee(area)).toBeNull();
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(area).not.toHaveAttribute("data-selecting");
  });

  it("selects when dragging up and left too, and supports contain mode", () => {
    const { area } = setup({ mode: "contain" });
    down(area, 170, 170);
    move(30, 30); // only d fits entirely (100..150)
    expect(selectedIds()).toEqual(["d"]);
    move(5, 5);
    expect(selectedIds().sort()).toEqual(["a", "b", "c", "d"]);
    up(5, 5);
  });

  it("Shift-drag adds and Mod-drag toggles", () => {
    const first = setup({ defaultValue: ["c"] });
    drag(first.area, [5, 5], [70, 70], { shiftKey: true });
    expect(selectedIds()).toEqual(["a", "c"]);
    first.unmount();

    const second = setup({ defaultValue: ["a", "c"] });
    drag(second.area, [5, 5], [160, 70], { ctrlKey: true });
    expect(selectedIds()).toEqual(["b", "c"]);
    second.unmount();

    const third = setup({ defaultValue: ["a"] });
    drag(third.area, [5, 5], [160, 70], { metaKey: true });
    expect(selectedIds()).toEqual(["b"]);
  });

  it("a plain click on empty space clears; a modified click keeps the selection", () => {
    const { area } = setup({ defaultValue: ["a", "b"] });
    down(area, 300, 250, { shiftKey: true });
    up(300, 250);
    expect(selectedIds()).toEqual(["a", "b"]);
    down(area, 300, 250);
    up(300, 250);
    expect(selectedIds()).toEqual([]);
  });

  it("clearOnClick={false} keeps the selection on empty clicks", () => {
    const { area } = setup({ defaultValue: ["a"], clearOnClick: false });
    down(area, 300, 250);
    up(300, 250);
    expect(selectedIds()).toEqual(["a"]);
  });

  it("small movements stay a click (threshold)", () => {
    const { area } = setup({ defaultValue: ["d"] });
    down(area, 5, 5);
    move(7, 7);
    expect(marquee(area)).toBeNull();
    expect(selectedIds()).toEqual(["d"]);
    move(12, 12);
    expect(marquee(area)).not.toBeNull();
    up(12, 12);
  });

  it("threshold is configurable", () => {
    const custom = setup({ threshold: 20 });
    down(custom.area, 300, 250);
    move(290, 240);
    expect(marquee(custom.area)).toBeNull();
    move(270, 230);
    expect(marquee(custom.area)).not.toBeNull();
    up(270, 230);
  });

  it("does not start on items, interactive elements or other buttons", () => {
    const { area } = setup({ defaultValue: ["d"] }, { withButton: true });
    down(item("a"), 20, 20);
    move(160, 160);
    expect(marquee(area)).toBeNull();
    up(160, 160);
    expect(selectedIds()).toEqual(["d"]);

    down(screen.getByRole("button", { name: "New folder" }), 300, 250);
    move(5, 5);
    expect(marquee(area)).toBeNull();
    up(5, 5);
    expect(selectedIds()).toEqual(["d"]);

    fireEvent.pointerDown(area, { clientX: 5, clientY: 5, button: 2, pointerId: 1, pointerType: "mouse" });
    move(160, 160);
    expect(marquee(area)).toBeNull();
    up(160, 160);

    fireEvent.pointerDown(area, { clientX: 5, clientY: 5, button: 0, pointerId: 1, pointerType: "touch" });
    move(160, 160);
    expect(marquee(area)).toBeNull();
    up(160, 160);
    expect(selectedIds()).toEqual(["d"]);
  });

  it("Escape during a drag restores the starting selection", () => {
    const { area } = setup({ defaultValue: ["d"] });
    down(area, 5, 5);
    move(160, 70);
    expect(selectedIds()).toEqual(["a", "b"]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(marquee(area)).toBeNull();
    expect(selectedIds()).toEqual(["d"]);
    move(5, 160); // the drag is over
    expect(selectedIds()).toEqual(["d"]);
  });

  it("uses content coordinates in a scrolled container", () => {
    const { area } = setup({}, { scroll: { scrollHeight: 900 } });
    area.scrollTop = 90;
    down(area, 5, 5); // content y = 95
    move(60, 30); // content y = 120 → touches c (100..150) but not a (10..60)
    const box = marquee(area)!;
    expect(box.style.top).toBe("95px");
    expect(box.style.height).toBe("25px");
    expect(selectedIds()).toEqual(["c"]);
    up(60, 30);
  });

  it("follows the container when the page scrolls mid-drag", () => {
    const { area, origin } = setup();
    down(area, 5, 5);
    move(80, 80);
    expect(selectedIds()).toEqual(["a"]);
    origin.top = -50; // page scrolled by 50px; the pointer stays put
    fireEvent.scroll(window);
    expect(marquee(area)!.style.height).toBe("125px");
    expect(selectedIds()).toEqual(["a", "c"]);
    up(80, 80);
  });

  it("auto-scrolls the container near its edges", async () => {
    const { area } = setup({}, { scroll: { scrollHeight: 900 } });
    down(area, 5, 5);
    move(60, 299);
    await waitFor(() => expect(area.scrollTop).toBeGreaterThan(20));
    up(60, 299);
    const stopped = area.scrollTop;
    await new Promise((r) => setTimeout(r, 60));
    expect(area.scrollTop).toBe(stopped);
  });

  it("does nothing when disabled and cleans up listeners on unmount", () => {
    const disabled = setup({ disabled: true, defaultValue: ["a"] });
    drag(disabled.area, [5, 5], [160, 160]);
    expect(selectedIds()).toEqual(["a"]);
    disabled.unmount();

    const removeSpy = vi.spyOn(window, "removeEventListener");
    const live = setup();
    down(live.area, 5, 5);
    move(80, 80);
    live.unmount();
    expect(removeSpy.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(["pointermove", "pointerup"]));
    removeSpy.mockRestore();
    expect(() => move(160, 160)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Controlled / uncontrolled, hook with getItems                       */
/* ------------------------------------------------------------------ */

describe("SelectionArea state", () => {
  it("is controlled by value", () => {
    const onValueChange = vi.fn();
    const { area, rerender } = setup({ value: ["d"], onValueChange });
    drag(area, [5, 5], [70, 70]);
    expect(onValueChange).toHaveBeenLastCalledWith(["a"]);
    expect(selectedIds()).toEqual(["d"]); // parent did not update
    rerender(
      <SelectionArea aria-label="Files" value={["a", "b"]} onValueChange={onValueChange}>
        <Grid />
      </SelectionArea>
    );
    expect(selectedIds()).toEqual(["a", "b"]);
  });

  it("supports the render-prop form", () => {
    render(
      <SelectionArea aria-label="Files" defaultValue={["b"]}>
        {({ getItemProps, isSelected, value }) => (
          <>
            {IDS.map((id) => (
              <div key={id} {...getItemProps(id)} aria-label={`File ${id}`}>
                {isSelected(id) ? `${id} (selected)` : id}
              </div>
            ))}
            <output>{value.length}</output>
          </>
        )}
      </SelectionArea>
    );
    expect(item("b")).toHaveTextContent("b (selected)");
    expect(screen.getByText("1", { selector: "output" })).toBeInTheDocument();
  });

  it("useMarqueeSelection works with getItems and element ids (ref-app style)", () => {
    function Files() {
      const ref = React.useRef<HTMLDivElement>(null);
      const { value, box } = useMarqueeSelection({
        containerRef: ref,
        getItems: () => IDS.map((id) => ({ id, element: document.getElementById(`file-item-${id}`) })),
      });
      return (
        <div ref={ref} data-testid="zone" style={{ position: "relative" }}>
          {IDS.map((id) => (
            <div key={id} id={`file-item-${id}`}>
              {id}
            </div>
          ))}
          {box && <div data-testid="box" />}
          <output>{value.join(",")}</output>
        </div>
      );
    }
    render(<Files />);
    const zone = screen.getByTestId("zone");
    layout(zone, () => ({ left: 0, top: 0, width: 400, height: 300 }));
    for (const id of IDS) {
      layout(document.getElementById(`file-item-${id}`)!, () => ({ left: ITEM_POS[id]!.x, top: ITEM_POS[id]!.y, width: 50, height: 50 }));
    }
    down(zone, 5, 5);
    move(160, 70);
    expect(screen.getByTestId("box")).toBeInTheDocument();
    up(160, 70);
    expect(screen.getByText("a,b", { selector: "output" })).toBeInTheDocument();
    // Presses on an item are left to the item.
    down(document.getElementById("file-item-c")!, 20, 110);
    move(170, 170);
    expect(screen.queryByTestId("box")).toBeNull();
    up(170, 170);
    expect(screen.getByText("a,b", { selector: "output" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Clicks and keyboard                                                 */
/* ------------------------------------------------------------------ */

describe("SelectionArea clicks and keyboard", () => {
  it("click selects one, Mod-click toggles, Shift-click selects a range", () => {
    setup();
    fireEvent.click(item("b"));
    expect(selectedIds()).toEqual(["b"]);
    fireEvent.click(item("d"), { shiftKey: true });
    expect(selectedIds()).toEqual(["b", "c", "d"]);
    fireEvent.click(item("c"), { ctrlKey: true });
    expect(selectedIds()).toEqual(["b", "d"]);
    fireEvent.click(item("a"), { shiftKey: true }); // anchor is now c
    expect(selectedIds()).toEqual(["a", "b", "c"]);
    fireEvent.click(item("a"));
    expect(selectedIds()).toEqual(["a"]);
  });

  it("Shift-click follows the items prop order", () => {
    setup({ items: ["d", "c", "b", "a"] });
    fireEvent.click(item("d"));
    fireEvent.click(item("b"), { shiftKey: true });
    expect(selectedIds().sort()).toEqual(["b", "c", "d"]);
  });

  it("Mod+A selects all, Escape clears, Space toggles the focused item", () => {
    setup();
    const a = item("a");
    a.focus();
    fireEvent.keyDown(a, { key: "a", ctrlKey: true });
    expect(selectedIds()).toEqual(["a", "b", "c", "d"]);
    fireEvent.keyDown(a, { key: "Escape" });
    expect(selectedIds()).toEqual([]);
    fireEvent.keyDown(a, { key: " " });
    expect(selectedIds()).toEqual(["a"]);
    fireEvent.keyDown(a, { key: " " });
    expect(selectedIds()).toEqual([]);
  });

  it("Mod+A also works from the container itself", () => {
    const { area } = setup();
    fireEvent.keyDown(area, { key: "A", metaKey: true });
    expect(selectedIds()).toHaveLength(4);
  });

  it("moves focus with the arrow keys (roving tabindex) and Shift+arrow extends", () => {
    setup();
    expect(item("a")).toHaveAttribute("tabindex", "0");
    expect(item("b")).toHaveAttribute("tabindex", "-1");
    item("a").focus();
    fireEvent.keyDown(item("a"), { key: "ArrowRight" });
    expect(item("b")).toHaveFocus();
    expect(item("b")).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(item("b"), { key: "End" });
    expect(item("d")).toHaveFocus();
    fireEvent.keyDown(item("d"), { key: " " });
    fireEvent.keyDown(item("d"), { key: "ArrowLeft", shiftKey: true });
    expect(item("c")).toHaveFocus();
    expect(selectedIds()).toEqual(["c", "d"]);
    fireEvent.keyDown(item("c"), { key: "Home" });
    expect(item("a")).toHaveFocus();
  });

  it("ignores clicks on controls inside an item", () => {
    function WithMenu() {
      const { getItemProps } = useSelectionArea();
      return (
        <div {...getItemProps("a")} aria-label="File a">
          a <button type="button">Menu</button>
        </div>
      );
    }
    render(
      <SelectionArea aria-label="Files" role="group">
        <WithMenu />
      </SelectionArea>
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByLabelText("File a")).toHaveAttribute("aria-selected", "false");
    fireEvent.click(screen.getByLabelText("File a"));
    expect(screen.getByLabelText("File a")).toHaveAttribute("aria-selected", "true");
  });

  it("announces selection count changes politely", async () => {
    setup();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("");
    fireEvent.click(item("a"));
    await waitFor(() => expect(status).toHaveTextContent("1 item selected"));
    fireEvent.click(item("c"), { shiftKey: true });
    await waitFor(() => expect(status).toHaveTextContent("3 items selected"));
    act(() => {
      fireEvent.keyDown(item("a"), { key: "Escape" });
    });
    await waitFor(() => expect(status).toHaveTextContent("No items selected"));
  });

  it("uses formatAnnouncement and the accent colour", async () => {
    const { area } = setup({ accent: "pink", formatAnnouncement: (n) => `${n} Dateien` });
    expect(area.style.getPropertyValue("--sutra-accent")).toBe("#f6339a");
    fireEvent.click(item("a"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 Dateien"));
  });

  it("has no axe violations", async () => {
    const { container, area } = setup({ defaultValue: ["a"] });
    expect(area).toHaveAttribute("aria-multiselectable", "true");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("throws a helpful error outside a SelectionArea", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bad() {
      useSelectionArea();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/inside <SelectionArea>/);
    spy.mockRestore();
  });
});
