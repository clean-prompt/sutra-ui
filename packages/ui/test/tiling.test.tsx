import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import {
  FloatingPanes,
  LayoutPresetPicker,
  TilingLayout,
  ZoneEditor,
  addPane,
  closePane,
  createSplitNode,
  createTabsNode,
  equalizeSplit,
  fillLayoutSlots,
  findNode,
  findPane,
  isLayoutNode,
  isSameLayoutShape,
  layoutPresets,
  listGroups,
  listPanes,
  movePane,
  normalizeLayout,
  parseLayout,
  removeGroup,
  resizeSplit,
  serializeLayout,
  setActiveTab,
  splitPane,
  toZoneLayout,
  type FloatingPaneState,
  type LayoutNode,
  type LayoutSplitNode,
  type LayoutTabsNode,
  type SavedLayoutPreset,
} from "../src/patterns/tiling-layout";
import { detectShortcutPlatform } from "../src/patterns/shortcuts";
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

const pointer = { pointerId: 1, pointerType: "mouse", button: 0 };

const tabs = (id: string, panes: string[], active = panes[0] ?? ""): LayoutTabsNode => ({ type: "tabs", id, panes, active });
const split = (id: string, direction: "row" | "column", children: LayoutNode[], sizes?: number[]): LayoutSplitNode => ({
  type: "split",
  id,
  direction,
  children,
  sizes: sizes ?? children.map(() => 1 / children.length),
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

describe("tiling model", () => {
  it("splitPane wraps a group, then inserts siblings in the same direction", () => {
    const one = tabs("g1", ["a", "b"]);
    const two = splitPane(one, "a", "row", "c") as LayoutSplitNode;
    expect(two.type).toBe("split");
    expect(two.direction).toBe("row");
    expect(two.sizes).toEqual([0.5, 0.5]);
    expect((two.children[0] as LayoutTabsNode).panes).toEqual(["a", "b"]);
    expect((two.children[1] as LayoutTabsNode).panes).toEqual(["c"]);

    const three = splitPane(two, "c", "row", "d") as LayoutSplitNode;
    expect(three.children).toHaveLength(3);
    expect(three.sizes).toEqual([0.5, 0.25, 0.25]);

    const before = splitPane(one, "a", "row", "z", "before") as LayoutSplitNode;
    expect((before.children[0] as LayoutTabsNode).panes).toEqual(["z"]);

    const nested = splitPane(two, "c", "column", "e") as LayoutSplitNode;
    const right = nested.children[1] as LayoutSplitNode;
    expect(right.direction).toBe("column");
    expect(listPanes(nested)).toEqual(["a", "b", "c", "e"]);
  });

  it("splitPane moves an existing pane instead of duplicating it", () => {
    const tree = split("s", "row", [tabs("g1", ["a"]), tabs("g2", ["b", "c"])]);
    const next = splitPane(tree, "a", "column", "c");
    expect(listPanes(next).filter((p) => p === "c")).toHaveLength(1);
    expect(findPane(next, "c")?.group.panes).toEqual(["c"]);
    // Splitting a pane with itself moves it to a new group when its group has other tabs.
    const self = splitPane(tabs("g", ["a", "b"]), "a", "row", "a") as LayoutSplitNode;
    expect(listGroups(self).map((g) => g.panes)).toEqual([["b"], ["a"]]);
  });

  it("closePane fixes the active tab and collapses empty groups and single-child splits", () => {
    const g = tabs("g", ["a", "b", "c"], "b");
    expect((closePane(g, "b") as LayoutTabsNode).active).toBe("c");
    expect((closePane(tabs("g", ["a", "b"], "b"), "b") as LayoutTabsNode).active).toBe("a");
    expect(closePane(g, "zzz")).toBe(g);

    const tree = split("root", "row", [tabs("g1", ["a"]), split("inner", "column", [tabs("g2", ["b"]), tabs("g3", ["c"])])]);
    const afterB = closePane(tree, "b") as LayoutSplitNode;
    expect(afterB.children.map((c) => c.id)).toEqual(["g1", "g3"]);
    const afterA = closePane(afterB, "a");
    expect(afterA).toMatchObject({ type: "tabs", id: "g3", panes: ["c"] });
    const empty = closePane(afterA, "c");
    expect(empty).toMatchObject({ type: "tabs", panes: [], active: "" });

    const kept = closePane(tree, "b", { keepEmptyGroup: true });
    expect(findNode(kept, "g2")).toMatchObject({ panes: [] });
  });

  it("movePane moves to the center and to each edge", () => {
    const base = split("s", "row", [tabs("g1", ["a", "b"]), tabs("g2", ["c"])]);

    const center = movePane(base, "a", "g2", "center");
    expect(findPane(center, "a")?.group.id).toBe("g2");
    expect((findNode(center, "g2") as LayoutTabsNode).active).toBe("a");
    expect(movePane(base, "a", "g2", "center", 0) && findNode(movePane(base, "a", "g2", "center", 0), "g2")).toMatchObject({
      panes: ["a", "c"],
    });

    const right = movePane(base, "a", "g2", "right") as LayoutSplitNode;
    expect(right.direction).toBe("row");
    expect(listGroups(right).map((g) => g.panes)).toEqual([["b"], ["c"], ["a"]]);

    const left = movePane(base, "a", "g2", "left") as LayoutSplitNode;
    expect(listGroups(left).map((g) => g.panes)).toEqual([["b"], ["a"], ["c"]]);

    const top = movePane(base, "a", "g2", "top") as LayoutSplitNode;
    const col = top.children[1] as LayoutSplitNode;
    expect(col.direction).toBe("column");
    expect(listGroups(col).map((g) => g.panes)).toEqual([["a"], ["c"]]);

    const bottom = movePane(base, "a", "g2", "bottom") as LayoutSplitNode;
    expect(listGroups(bottom.children[1]).map((g) => g.panes)).toEqual([["c"], ["a"]]);

    // Moving the only pane of a group removes the source group.
    const emptied = movePane(base, "c", "g1", "center");
    expect(emptied).toMatchObject({ type: "tabs", id: "g1", panes: ["a", "b", "c"] });
    // Moving a group's only pane onto its own edge is a no-op.
    expect(movePane(base, "c", "g2", "left")).toBe(base);
    // Reorder within a group.
    expect(movePane(base, "b", "g1", "center", 0)).toMatchObject({ children: [{ panes: ["b", "a"], active: "b" }, {}] });
    // Unknown target / pane.
    expect(movePane(base, "a", "nope", "left")).toBe(base);
    expect(movePane(base, "x", "g2", "left")).toBe(base);
  });

  it("resizeSplit clamps both neighbours to the minimum", () => {
    const tree = split("s", "row", [tabs("a", []), tabs("b", []), tabs("c", [])], [0.4, 0.3, 0.3]);
    const grown = resizeSplit(tree, "s", 0, 0.1) as LayoutSplitNode;
    expect(grown.sizes[0]).toBeCloseTo(0.5);
    expect(grown.sizes[1]).toBeCloseTo(0.2);
    expect(grown.sizes[2]).toBeCloseTo(0.3);
    const clamped = resizeSplit(tree, "s", 0, 1, 0.1) as LayoutSplitNode;
    expect(clamped.sizes[0]).toBeCloseTo(0.6);
    expect(clamped.sizes[1]).toBeCloseTo(0.1);
    const clampedLow = resizeSplit(tree, "s", 1, -1, 0.05) as LayoutSplitNode;
    expect(clampedLow.sizes[1]).toBeCloseTo(0.05);
    expect(sum(clampedLow.sizes)).toBeCloseTo(1);
    expect(resizeSplit(tree, "s", 2, 0.1)).toBe(tree);
    expect(resizeSplit(tree, "a", 0, 0.1)).toBe(tree);
    expect((equalizeSplit(grown, "s") as LayoutSplitNode).sizes).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  it("normalizeLayout flattens, collapses, repairs sizes, dedupes panes and fixes active", () => {
    const messy = split(
      "root",
      "row",
      [
        split("same", "row", [tabs("a", ["p1"]), tabs("b", ["p2"])], [0.5, 0.5]),
        split("single", "column", [tabs("c", ["p3", "p1"], "zzz")]),
        split("empty", "column", []),
      ],
      [0.5, 0.5, 1]
    );
    messy.sizes = [2, 2, 1];
    const out = normalizeLayout(messy) as LayoutSplitNode;
    expect(out.children.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(out.sizes.map((s) => +s.toFixed(3))).toEqual([0.25, 0.25, 0.5]);
    expect(out.children[2]).toMatchObject({ panes: ["p3"], active: "p3" });

    const badSizes = normalizeLayout(split("s", "column", [tabs("x", []), tabs("y", [])], [NaN, -1])) as LayoutSplitNode;
    expect(badSizes.sizes).toEqual([0.5, 0.5]);
    expect(normalizeLayout(split("lonely", "row", []))).toMatchObject({ type: "tabs", panes: [] });
    // Empty groups are kept (zone slots).
    expect(listGroups(normalizeLayout(split("z", "row", [tabs("e1", []), tabs("e2", [])])))).toHaveLength(2);
  });

  it("serializes and parses round-trip and rejects invalid input", () => {
    const tree = split("root", "row", [tabs("g1", ["a", "b"], "b"), split("c", "column", [tabs("g2", ["c"]), tabs("g3", [])], [0.7, 0.3])], [0.6, 0.4]);
    const json = serializeLayout(tree);
    expect(parseLayout(json)).toEqual(normalizeLayout(tree));
    expect(serializeLayout(parseLayout(json)!)).toBe(json);
    expect(parseLayout(JSON.parse(json))).toEqual(normalizeLayout(tree));
    expect(parseLayout("{nope")).toBeNull();
    expect(parseLayout('{"type":"tabs","id":"x"}')).toBeNull();
    expect(parseLayout({ type: "split", id: "s", direction: "diagonal", children: [], sizes: [] })).toBeNull();
    expect(isLayoutNode(tree)).toBe(true);
    expect(serializeLayout(tabs("g", ["a"]), 2)).toContain("\n  ");
  });

  it("builds every preset with the right number of slots and distributes panes", () => {
    expect(layoutPresets.map((p) => p.id)).toEqual(["single", "two-columns", "three-columns", "main-sidebar", "grid", "main-bottom"]);
    for (const preset of layoutPresets) {
      const empty = preset.create();
      expect(listGroups(empty)).toHaveLength(preset.slots);
      expect(listPanes(empty)).toEqual([]);
    }
    const panes = ["main", "two", "three", "four", "five"];
    const single = layoutPresets[0].create(panes) as LayoutTabsNode;
    expect(single.panes).toEqual(panes);
    expect(single.active).toBe("main");

    const sidebar = layoutPresets.find((p) => p.id === "main-sidebar")!.create(["main", "side"]) as LayoutSplitNode;
    expect(listGroups(sidebar).map((g) => g.panes)).toEqual([["side"], ["main"]]);
    expect(sidebar.sizes[1]).toBeGreaterThan(sidebar.sizes[0]);

    const grid = layoutPresets.find((p) => p.id === "grid")!.create(panes) as LayoutSplitNode;
    expect(grid.direction).toBe("column");
    expect(listGroups(grid).map((g) => g.panes)).toEqual([["main", "five"], ["two"], ["three"], ["four"]]);

    const bottom = layoutPresets.find((p) => p.id === "main-bottom")!.create(["a", "b"]) as LayoutSplitNode;
    expect(bottom.direction).toBe("column");
    expect(isSameLayoutShape(bottom, layoutPresets[5].create())).toBe(true);
    expect(isSameLayoutShape(bottom, layoutPresets[1].create())).toBe(false);
  });

  it("covers the small helpers", () => {
    const tree = split("s", "row", [tabs("g1", ["a", "b"]), tabs("g2", ["c"])]);
    expect(findPane(tree, "b")).toMatchObject({ index: 1, path: ["s", "g1"] });
    expect(findPane(tree, "x")).toBeNull();
    expect((setActiveTab(tree, "b") as LayoutSplitNode).children[0]).toMatchObject({ active: "b" });
    expect(setActiveTab(tree, "a")).toBe(tree);
    expect(findPane(addPane(tree, "d", "g2"), "d")?.group.id).toBe("g2");
    expect(findPane(addPane(tree, "d"), "d")?.group.id).toBe("g1");
    expect(findPane(addPane(tree, "c", "g1"), "c")?.group.id).toBe("g1");
    expect(listGroups(removeGroup(tree, "g2"))).toHaveLength(1);
    expect(listPanes(toZoneLayout(tree))).toEqual([]);
    const filled = fillLayoutSlots(toZoneLayout(tree), ["x", "y", "z"]);
    expect(listGroups(filled).map((g) => g.panes)).toEqual([["x", "z"], ["y"]]);
    expect(createTabsNode(["a", "b"], "b")).toMatchObject({ panes: ["a", "b"], active: "b" });
    expect(createSplitNode("row", [tabs("x", []), tabs("y", [])]).sizes).toEqual([0.5, 0.5]);
  });
});

/* ------------------------------------------------------------------ */
/* TilingLayout                                                        */
/* ------------------------------------------------------------------ */

function Counter({ id }: { id: string }) {
  const [n, setN] = React.useState(0);
  return (
    <div>
      <p>
        {id} count {n}
      </p>
      <button type="button" onClick={() => setN((x) => x + 1)}>
        Increment {id}
      </button>
    </div>
  );
}

const titles: Record<string, string> = { a: "Alpha", b: "Beta", c: "Gamma", d: "Delta" };

function Harness({
  initial,
  onChange,
  ...rest
}: {
  initial: LayoutNode;
  onChange?: (l: LayoutNode) => void;
} & Partial<React.ComponentProps<typeof TilingLayout>>) {
  const [layout, setLayout] = React.useState(initial);
  const [floating, setFloating] = React.useState<FloatingPaneState[]>([]);
  return (
    <div style={{ height: 400 }}>
      <TilingLayout
        layout={layout}
        onLayoutChange={(l) => {
          setLayout(l);
          onChange?.(l);
        }}
        renderPane={(id) => <Counter id={id} />}
        paneTitle={(id) => titles[id] ?? id}
        floating={floating}
        onFloatingChange={setFloating}
        {...rest}
      />
      <output data-testid="floating">{floating.map((f) => f.id).join(",")}</output>
    </div>
  );
}

const twoGroups = () => split("root", "row", [tabs("g1", ["a", "b"]), tabs("g2", ["c"])]);

describe("TilingLayout", () => {
  it("renders groups, tabs and panes from the tree", async () => {
    const { container } = render(<Harness initial={twoGroups()} />);
    expect(screen.getByRole("group", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getAllByRole("tablist")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("a count 0")).toBeInTheDocument();
    expect(screen.getByText("c count 0")).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: "Resize columns" })).toHaveAttribute("aria-valuenow", "50");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps inactive tabs mounted (keep-alive) when switching", () => {
    render(<Harness initial={twoGroups()} />);
    fireEvent.click(screen.getByRole("button", { name: "Increment a" }));
    fireEvent.click(screen.getByRole("button", { name: "Increment a" }));
    expect(screen.getByText("a count 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    // Alpha's panel is hidden but still mounted with its state.
    const alphaPanel = document.getElementById(screen.getByRole("tab", { name: "Alpha" }).getAttribute("aria-controls")!)!;
    expect(alphaPanel).toHaveAttribute("hidden");
    expect(within(alphaPanel).getByText("a count 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Alpha" }));
    expect(screen.getByText("a count 2")).toBeVisible();
  });

  it("supports arrow keys in the tab strip", () => {
    render(<Harness initial={twoGroups()} />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(alpha, { key: "Home" });
    expect(alpha).toHaveAttribute("aria-selected", "true");
  });

  it("closes tabs with the close button, middle-click and Delete", () => {
    const onChange = vi.fn();
    const onPaneClose = vi.fn();
    render(<Harness initial={twoGroups()} onChange={onChange} onPaneClose={onPaneClose} />);
    const betaTab = screen.getByRole("tab", { name: "Beta" }).closest('[data-slot="tiling-tab"]') as HTMLElement;
    fireEvent.click(betaTab.querySelector('[data-slot="tiling-tab-close"]')!);
    expect(onPaneClose).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("tab", { name: "Beta" })).toBeNull();

    const gamma = screen.getByRole("tab", { name: "Gamma" });
    fireEvent(gamma, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }));
    expect(screen.queryByRole("tab", { name: "Gamma" })).toBeNull();
    // Group g2 collapsed: only one group left.
    expect(listGroups(onChange.mock.calls.at(-1)![0])).toHaveLength(1);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "Delete" });
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("Empty group")).toBeInTheDocument();
  });

  it("splits from the tab context menu and closes others", async () => {
    const onChange = vi.fn();
    render(<Harness initial={tabs("g1", ["a", "b", "c"])} onChange={onChange} />);
    fireEvent.contextMenu(screen.getByRole("tab", { name: "Beta" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Split right" }));
    const after = onChange.mock.calls.at(-1)![0] as LayoutSplitNode;
    expect(after.direction).toBe("row");
    expect(listGroups(after).map((g) => g.panes)).toEqual([["a", "c"], ["b"]]);
    expect(screen.getAllByRole("tablist")).toHaveLength(2);

    fireEvent.contextMenu(screen.getByRole("tab", { name: "Alpha" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Close others" }));
    expect(screen.queryByRole("tab", { name: "Gamma" })).toBeNull();

    // Split down of a group's only tab creates an empty group below.
    fireEvent.contextMenu(screen.getByRole("tab", { name: "Beta" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Split down" }));
    expect(screen.getByText("Empty group")).toBeInTheDocument();
  });

  it("uses createPane for split right when provided", async () => {
    const onChange = vi.fn();
    render(<Harness initial={tabs("g1", ["a"])} onChange={onChange} createPane={() => "d"} />);
    fireEvent.contextMenu(screen.getByRole("tab", { name: "Alpha" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Split right" }));
    expect(listGroups(onChange.mock.calls.at(-1)![0]).map((g) => g.panes)).toEqual([["a"], ["d"]]);
  });

  it("resizes splits with the keyboard and equalizes on double-click", () => {
    const onChange = vi.fn();
    render(<Harness initial={twoGroups()} onChange={onChange} step={0.05} minSize={0.1} />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep).toHaveAttribute("aria-valuenow", "55");
    fireEvent.keyDown(sep, { key: "ArrowLeft", shiftKey: true });
    expect(sep).toHaveAttribute("aria-valuenow", "30");
    fireEvent.keyDown(sep, { key: "Home" });
    expect(sep).toHaveAttribute("aria-valuenow", "10");
    fireEvent.keyDown(sep, { key: "End" });
    expect(sep).toHaveAttribute("aria-valuenow", "90");
    fireEvent.doubleClick(sep);
    expect(sep).toHaveAttribute("aria-valuenow", "50");
    expect((onChange.mock.calls.at(-1)![0] as LayoutSplitNode).sizes).toEqual([0.5, 0.5]);
  });

  it("resizes splits by dragging the handle", () => {
    const onChange = vi.fn();
    render(<Harness initial={twoGroups()} onChange={onChange} />);
    const sep = screen.getByRole("separator");
    vi.spyOn(sep.parentElement!, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400, toJSON: () => ({}),
    } as DOMRect);
    fireEvent.pointerDown(sep, { ...pointer, clientX: 500 });
    fireEvent.pointerMove(sep, { ...pointer, clientX: 700 });
    fireEvent.pointerUp(sep, { ...pointer, clientX: 700 });
    expect((onChange.mock.calls.at(-1)![0] as LayoutSplitNode).sizes[0]).toBeCloseTo(0.7);
  });

  it("maximizes and restores a group without remounting panes", async () => {
    const { container } = render(<Harness initial={twoGroups()} />);
    fireEvent.click(screen.getByRole("button", { name: "Increment c" }));
    const groups = container.querySelectorAll('[data-slot="tiling-group"]');
    fireEvent.click(within(groups[1] as HTMLElement).getByRole("button", { name: "Maximize group" }));
    expect(groups[1]).toHaveAttribute("data-maximized");
    expect(groups[0]).toHaveAttribute("inert");
    expect(screen.getByText("c count 1")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Restore group" }));
    expect(groups[1]).not.toHaveAttribute("data-maximized");
    expect(groups[0]).not.toHaveAttribute("inert");

    // Escape restores too.
    fireEvent.click(within(groups[0] as HTMLElement).getByRole("button", { name: "Maximize group" }));
    expect(groups[0]).toHaveAttribute("data-maximized");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "Escape" });
    expect(groups[0]).not.toHaveAttribute("data-maximized");
    expect(screen.getByText("c count 1")).toBeInTheDocument();
  });

  it("drags a tab onto another group's edge drop zone (and keeps its state)", () => {
    const onChange = vi.fn();
    const { container } = render(<Harness initial={twoGroups()} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Increment a" }));
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    fireEvent.pointerDown(alpha, { ...pointer, clientX: 10, clientY: 10 });
    // Below the threshold nothing happens.
    fireEvent.pointerMove(alpha, { ...pointer, clientX: 12, clientY: 10 });
    expect(container.querySelector('[data-slot="tiling-drop-overlay"]')).toBeNull();
    fireEvent.pointerMove(alpha, { ...pointer, clientX: 60, clientY: 40 });
    expect(container.querySelectorAll('[data-slot="tiling-drop-overlay"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="tiling-drag-ghost"]')).toHaveTextContent("Alpha");

    const zone = container.querySelector('[data-tiling-drop-group="g2"][data-tiling-drop-edge="bottom"]')!;
    fireEvent.pointerMove(zone, { ...pointer, clientX: 600, clientY: 380 });
    expect(container.querySelector('[data-slot="tiling-drop-preview"]')).toHaveAttribute("data-edge", "bottom");
    fireEvent.pointerUp(zone, { ...pointer, clientX: 600, clientY: 380 });

    const after = onChange.mock.calls.at(-1)![0] as LayoutSplitNode;
    expect(listGroups(after).map((g) => g.panes)).toEqual([["b"], ["c"], ["a"]]);
    expect((after.children[1] as LayoutSplitNode).direction).toBe("column");
    expect(container.querySelector('[data-slot="tiling-drop-overlay"]')).toBeNull();
    // Keep-alive across the move: state survived re-parenting.
    expect(screen.getByText("a count 1")).toBeInTheDocument();
  });

  it("drops a tab onto another tab strip (center) and cancels with Escape", () => {
    const onChange = vi.fn();
    const { container } = render(<Harness initial={twoGroups()} onChange={onChange} />);
    const beta = screen.getByRole("tab", { name: "Beta" });
    fireEvent.pointerDown(beta, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(beta, { ...pointer, clientX: 80, clientY: 10 });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector('[data-slot="tiling-drop-overlay"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(beta, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(beta, { ...pointer, clientX: 80, clientY: 10 });
    const strip = within(container.querySelector('[data-group-id="g2"]') as HTMLElement).getByRole("tablist");
    fireEvent.pointerUp(strip, { ...pointer, clientX: 600, clientY: 10 });
    expect(findPane(onChange.mock.calls.at(-1)![0], "b")?.group.id).toBe("g2");
  });

  it("pops a pane out into a floating window and docks it back", async () => {
    render(<Harness initial={twoGroups()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    fireEvent.click(screen.getByRole("button", { name: "Increment b" }));
    fireEvent.contextMenu(screen.getByRole("tab", { name: "Beta" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Pop out" }));
    expect(screen.getByTestId("floating")).toHaveTextContent("b");
    const win = screen.getByRole("dialog", { name: "Beta" });
    expect(within(win).getByText("b count 1")).toBeInTheDocument();
    fireEvent.click(within(win).getByRole("button", { name: "Dock Beta" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("tab", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getByText("b count 1")).toBeInTheDocument();
  });

  it("registers keyboard shortcuts when enabled", () => {
    const onChange = vi.fn();
    const { container } = render(<Harness initial={twoGroups()} onChange={onChange} shortcuts />);
    const mod = detectShortcutPlatform() === "mac" ? { metaKey: true } : { ctrlKey: true };
    fireEvent.keyDown(document, { key: "Tab", code: "Tab", ctrlKey: true });
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(document, { key: "\\", code: "Backslash", ...mod });
    expect(listGroups(onChange.mock.calls.at(-1)![0]).map((g) => g.panes)).toEqual([["a"], ["b"], ["c"]]);
    fireEvent.keyDown(document, { key: "3", code: "Digit3", ...mod });
    expect(container.querySelector('[data-group-id="g2"]')).toHaveAttribute("data-focused");
    fireEvent.keyDown(document, { key: "w", code: "KeyW", ...mod });
    expect(screen.queryByRole("tab", { name: "Gamma" })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* FloatingPanes                                                       */
/* ------------------------------------------------------------------ */

function FloatingHarness({ onDock }: { onDock?: (id: string) => void }) {
  const [panes, setPanes] = React.useState<FloatingPaneState[]>([
    { id: "one", x: 10, y: 10, width: 200, height: 150 },
    { id: "two", x: 50, y: 50, width: 200, height: 150 },
  ]);
  return (
    <div style={{ position: "relative", height: 500 }}>
      <FloatingPanes
        panes={panes}
        onPanesChange={setPanes}
        renderPane={(id) => <p>content {id}</p>}
        paneTitle={(id) => `Window ${id}`}
        onDock={onDock}
        onClose={(id) => setPanes((ps) => ps.filter((p) => p.id !== id))}
      />
    </div>
  );
}

describe("FloatingPanes", () => {
  it("drags, resizes, brings to front, docks and closes", async () => {
    const onDock = vi.fn();
    const { container } = render(<FloatingHarness onDock={onDock} />);
    const one = screen.getByRole("dialog", { name: "Window one" });
    const two = screen.getByRole("dialog", { name: "Window two" });
    expect(two).toHaveAttribute("data-front");
    expect(one.style.zIndex).toBe("1");

    const handle = within(one).getByRole("button", { name: "Move Window one" });
    fireEvent.pointerDown(handle, { ...pointer, clientX: 100, clientY: 100 });
    expect(one).toHaveAttribute("data-front");
    expect(one.style.zIndex).toBe("2");
    fireEvent.pointerMove(handle, { ...pointer, clientX: 140, clientY: 130 });
    fireEvent.pointerUp(handle, { ...pointer, clientX: 140, clientY: 130 });
    expect(one.style.left).toBe("50px");
    expect(one.style.top).toBe("40px");

    const grip = within(one).getByRole("button", { name: "Resize Window one" });
    fireEvent.pointerDown(grip, { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(grip, { ...pointer, clientX: 100, clientY: -500 });
    fireEvent.pointerUp(grip, { ...pointer });
    expect(one.style.width).toBe("300px");
    expect(one.style.height).toBe("120px"); // min height

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(one.style.left).toBe("60px");

    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(within(one).getByRole("button", { name: "Dock Window one" }));
    expect(onDock).toHaveBeenCalledWith("one");
    fireEvent.click(within(two).getByRole("button", { name: "Close Window two" }));
    expect(screen.queryByRole("dialog", { name: "Window two" })).toBeNull();
  });

  it("clamps windows inside the container", () => {
    render(<FloatingHarness />);
    const layer = document.querySelector('[data-slot="floating-panes"]')!;
    vi.spyOn(layer, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, toJSON: () => ({}),
    } as DOMRect);
    const one = screen.getByRole("dialog", { name: "Window one" });
    const handle = within(one).getByRole("button", { name: "Move Window one" });
    fireEvent.pointerDown(handle, { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 1000, clientY: -1000 });
    expect(one.style.left).toBe("200px");
    expect(one.style.top).toBe("0px");
  });
});

/* ------------------------------------------------------------------ */
/* LayoutPresetPicker                                                  */
/* ------------------------------------------------------------------ */

describe("LayoutPresetPicker", () => {
  it("selects presets, saves the current arrangement and re-applies it", async () => {
    const onSelect = vi.fn();
    const onSaved = vi.fn();
    const current = layoutPresets[1].create(["a", "b"]);
    const { container, rerender } = render(
      <LayoutPresetPicker current={current} onSelect={onSelect} onSavedPresetsChange={onSaved} />
    );
    expect(container.querySelectorAll('[data-slot="layout-thumbnail"]')).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Two columns" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Single" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "2×2 grid" }));
    const [grid, id] = onSelect.mock.calls[0];
    expect(id).toBe("grid");
    expect(listGroups(grid)).toHaveLength(4);
    expect(listPanes(grid)).toEqual(["a", "b"]);

    const save = screen.getByRole("button", { name: "Save current arrangement" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Preset name"), { target: { value: "My split" } });
    fireEvent.click(save);
    const saved = onSaved.mock.calls[0][0] as SavedLayoutPreset[];
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("My split");
    expect(screen.getByRole("list", { name: "Saved arrangements" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "My split" }));
    expect(onSelect.mock.calls.at(-1)![0]).toEqual(normalizeLayout(current));

    // Different panes: the saved shape is refilled.
    rerender(<LayoutPresetPicker current={current} panes={["x", "y", "z"]} onSelect={onSelect} onSavedPresetsChange={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "My split" }));
    expect(listGroups(onSelect.mock.calls.at(-1)![0]).map((g) => g.panes)).toEqual([["x", "z"], ["y"]]);

    fireEvent.click(screen.getByRole("button", { name: "Delete My split" }));
    expect(onSaved.mock.calls.at(-1)![0]).toEqual([]);
    expect(screen.queryByRole("list", { name: "Saved arrangements" })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* ZoneEditor                                                          */
/* ------------------------------------------------------------------ */

describe("ZoneEditor", () => {
  it("splits zones on click (Shift for horizontal), deletes and applies", async () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(<ZoneEditor onApply={onApply} onCancel={onCancel} panes={["p1", "p2", "p3", "p4"]} />);
    expect(screen.getByText("2 zones")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /^Zone 1,/ }));
    expect(screen.getByText("3 zones")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Zone 3,/ }), { shiftKey: true });
    expect(screen.getByText("4 zones")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Zone 1, 25%/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const out = onApply.mock.calls[0][0] as LayoutSplitNode;
    expect(out.direction).toBe("row");
    expect(out.children).toHaveLength(3);
    expect(out.sizes).toEqual([0.25, 0.25, 0.5]);
    const last = out.children[2] as LayoutSplitNode;
    expect(last.direction).toBe("column");
    expect(listGroups(out).map((g) => g.panes)).toEqual([["p1"], ["p2"], ["p3"], ["p4"]]);

    // Keyboard divider resize and zone deletion.
    const seps = screen.getAllByRole("separator");
    fireEvent.keyDown(seps[0], { key: "ArrowRight" });
    expect(seps[0]).toHaveAttribute("aria-valuenow", "27");
    fireEvent.click(screen.getByRole("button", { name: "Delete zone 4" }));
    expect(screen.getByText("3 zones")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("2 zones")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("outputs empty pane slots without panes", () => {
    const onApply = vi.fn();
    const onChange = vi.fn();
    render(<ZoneEditor defaultLayout={layoutPresets[0].create(["x"])} onApply={onApply} onChange={onChange} />);
    expect(screen.getByText("1 zone")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete zone/ })).toBeNull();
    fireEvent.keyDown(screen.getByRole("button", { name: /^Zone 1,/ }), { key: "Enter", shiftKey: true });
    expect(onChange).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const out = onApply.mock.calls[0][0] as LayoutSplitNode;
    expect(out.direction).toBe("column");
    expect(listGroups(out).every((g) => g.panes.length === 0)).toBe(true);
  });
});

void act;
