import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { layoutTree, resolveTreemapPath, squarify, treemapNeighbor, treemapValue, type TreemapRect } from "../src/lib/treemap";
import { StorageMap, Treemap, type StorageMapItem, type TreemapNode } from "../src/patterns/treemap";
import { axeViolations } from "./a11y";

const area = (r: TreemapRect) => r.width * r.height;
const ratio = (r: TreemapRect) => Math.max(r.width / r.height, r.height / r.width);
const inside = (r: TreemapRect, b: TreemapRect, eps = 1e-6) =>
  r.x >= b.x - eps && r.y >= b.y - eps && r.x + r.width <= b.x + b.width + eps && r.y + r.height <= b.y + b.height + eps;

describe("squarify", () => {
  const bounds = { x: 10, y: 20, width: 600, height: 400 };
  // The example from Bruls et al.
  const values = [6, 6, 4, 3, 2, 2, 1];

  it("gives areas proportional to values, inside the bounds, in input order", () => {
    const rects = squarify(values.map((value) => ({ value })), bounds);
    expect(rects).toHaveLength(values.length);
    const total = values.reduce((a, b) => a + b, 0);
    rects.forEach((r, i) => {
      expect(area(r)).toBeCloseTo((values[i]! / total) * 600 * 400, 3);
      expect(inside(r, bounds)).toBe(true);
    });
    expect(rects.reduce((s, r) => s + area(r), 0)).toBeCloseTo(600 * 400, 3);
  });

  it("does not overlap and keeps aspect ratios reasonable", () => {
    const vals = [500, 433, 78, 25, 25, 17, 15, 9, 6, 6, 5, 2, 1, 1];
    const rects = squarify(vals.map((value) => ({ value })), { x: 0, y: 0, width: 800, height: 500 });
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        expect(ox > 1e-6 && oy > 1e-6).toBe(false);
      }
    const bruls = squarify(values.map((value) => ({ value })), { x: 0, y: 0, width: 6, height: 4 });
    expect(Math.max(...bruls.map(ratio))).toBeLessThan(3);
    // Average ratio stays close to square, far better than slicing into strips.
    const avg = rects.slice(0, 6).reduce((s, r) => s + ratio(r), 0) / 6;
    expect(avg).toBeLessThan(3);
  });

  it("treats zero, negative and non-finite values as empty", () => {
    const rects = squarify([{ value: 5 }, { value: 0 }, { value: -3 }, { value: Number.NaN }, { value: 5 }], bounds);
    expect(rects.map(area).map((a) => Math.round(a))).toEqual([120000, 0, 0, 0, 120000]);
    expect(squarify([{ value: 1 }], { x: 0, y: 0, width: 0, height: 10 })).toEqual([{ x: 0, y: 0, width: 0, height: 0 }]);
    expect(squarify([], bounds)).toEqual([]);
    expect(squarify([{ value: 0 }], bounds)[0]).toEqual({ x: 10, y: 20, width: 0, height: 0 });
  });

  it("is deterministic and keeps ties in input order", () => {
    const items = [{ value: 3 }, { value: 3 }, { value: 1 }];
    expect(squarify(items, bounds)).toEqual(squarify(items, bounds));
    const [a, b] = squarify(items, bounds);
    expect(a!.x <= b!.x && a!.y <= b!.y).toBe(true);
  });
});

const tree: TreemapNode = {
  id: "root",
  name: "Disk",
  children: [
    {
      id: "apps",
      name: "Applications",
      children: [
        { id: "xcode", name: "Xcode", value: 40 },
        { id: "chrome", name: "Chrome", value: 10 },
      ],
    },
    { id: "docs", name: "Documents", value: 30 },
    { id: "music", name: "Music", value: 19 },
    { id: "tiny", name: "Tiny", value: 1 },
  ],
};

describe("layoutTree", () => {
  it("sums children when value is absent and resolves paths", () => {
    expect(treemapValue(tree)).toBe(100);
    expect(treemapValue({ id: "x", name: "x", value: -5 })).toBe(0);
    expect(resolveTreemapPath(tree, ["apps", "xcode"]).map((n) => n.id)).toEqual(["apps", "xcode"]);
    expect(resolveTreemapPath(tree, ["apps", "nope", "xcode"]).map((n) => n.id)).toEqual(["apps"]);
  });

  it("lays out one level by default, nested levels with padding and headers", () => {
    const rect = { x: 0, y: 0, width: 400, height: 300 };
    const flat = layoutTree(tree, rect);
    expect(flat.map((n) => n.node.id)).toEqual(["apps", "docs", "music", "tiny"]);
    expect(flat.every((n) => n.depth === 1 && !n.expanded)).toBe(true);

    const nested = layoutTree(tree, rect, { depth: 2, padding: 4, headerHeight: 16 });
    const apps = nested.find((n) => n.node.id === "apps")!;
    const xcode = nested.find((n) => n.node.id === "xcode")!;
    expect(apps.expanded).toBe(true);
    expect(xcode.depth).toBe(2);
    expect(xcode.path).toEqual(["apps", "xcode"]);
    const inner = { x: apps.x + 4, y: apps.y + 20, width: apps.width - 8, height: apps.height - 24 };
    expect(inside(xcode, inner)).toBe(true);
    expect(area(xcode) / area(nested.find((n) => n.node.id === "chrome")!)).toBeCloseTo(4, 3);
  });

  it("finds spatial neighbours for arrow keys", () => {
    const rects = [
      { x: 0, y: 0, width: 50, height: 100 },
      { x: 50, y: 0, width: 50, height: 50 },
      { x: 50, y: 50, width: 50, height: 50 },
    ];
    expect(treemapNeighbor(rects, 0, "right")).toBe(1);
    expect(treemapNeighbor(rects, 1, "down")).toBe(2);
    expect(treemapNeighbor(rects, 2, "left")).toBe(0);
    expect(treemapNeighbor(rects, 0, "left")).toBe(0);
  });
});

const tiles = () => screen.getAllByRole("button").filter((b) => b.getAttribute("data-slot") === "treemap-tile");
const tile = (id: string) => tiles().find((t) => t.dataset.id === id)!;
const px = (el: HTMLElement, prop: "width" | "height") => parseFloat(el.style[prop]);

describe("Treemap", () => {
  it("renders tiles with areas proportional to their values", () => {
    render(<Treemap data={tree} label="Disk usage" gap={0} defaultWidth={500} height={200} />);
    expect(screen.getByRole("group", { name: "Disk usage" })).toHaveAttribute("aria-roledescription", "treemap");
    const a = tile("apps");
    const d = tile("docs");
    expect((px(a, "width") * px(a, "height")) / (px(d, "width") * px(d, "height"))).toBeCloseTo(50 / 30, 2);
    expect(a).toHaveAccessibleName("Applications, 50, 50%, 2 items");
  });

  it("hides labels on tiles that are too small", () => {
    render(<Treemap data={tree} defaultWidth={300} height={120} />);
    expect(tile("apps").dataset.label).toBe("full");
    expect(tile("tiny").dataset.label).toBe("hidden");
    expect(tile("tiny")).toHaveTextContent("");
    expect(tile("tiny")).toHaveAccessibleName("Tiny, 1, 1%");
  });

  it("formats values and colours by colorFor or the category palette", () => {
    render(
      <Treemap
        data={tree}
        valueFormatter={(v) => `${v} GB`}
        colorFor={(node) => (node.id === "docs" ? "red" : undefined)}
        palette={["#123456"]}
      />
    );
    expect(tile("apps")).toHaveTextContent("50 GB");
    expect(tile("docs").style.backgroundColor).toContain("#fb2c36");
    expect(tile("music").style.backgroundColor).toContain("#123456");
  });

  it("moves between tiles with arrow keys using a roving tab stop", () => {
    render(<Treemap data={tree} defaultWidth={500} height={200} />);
    expect(tiles().filter((t) => t.tabIndex === 0)).toHaveLength(1);
    const first = tile("apps");
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowRight" });
    const next = document.activeElement as HTMLElement;
    expect(next).not.toBe(first);
    expect(next.dataset.slot).toBe("treemap-tile");
    expect(next.tabIndex).toBe(0);
    fireEvent.keyDown(next, { key: "Home" });
    expect(document.activeElement).toBe(tile("apps"));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(tiles()[tiles().length - 1]);
  });

  it("drills in with Enter, goes up with Backspace/Escape and the breadcrumb, and reports onSelect", () => {
    const onSelect = vi.fn();
    const onPathChange = vi.fn();
    render(<Treemap data={tree} onSelect={onSelect} onPathChange={onPathChange} />);
    const apps = tile("apps");
    act(() => apps.focus());
    fireEvent.click(apps);
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "apps" }), ["apps"]);
    expect(onPathChange).toHaveBeenLastCalledWith(["apps"]);
    expect(tiles().map((t) => t.dataset.id)).toEqual(["xcode", "chrome"]);
    expect(document.activeElement).toBe(tile("xcode"));
    const crumbs = screen.getByRole("navigation", { name: "Treemap location" });
    expect(within(crumbs).getByText("Applications")).toHaveAttribute("aria-current", "page");

    fireEvent.click(tile("chrome"));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "chrome" }), ["apps", "chrome"]);
    expect(tiles()).toHaveLength(2);

    fireEvent.keyDown(document.activeElement!, { key: "Backspace" });
    expect(onPathChange).toHaveBeenLastCalledWith([]);
    expect(tiles()).toHaveLength(4);
    expect(document.activeElement).toBe(tile("apps"));

    fireEvent.click(tile("apps"));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(tiles()).toHaveLength(4);

    fireEvent.click(tile("apps"));
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Disk" }));
    expect(tiles()).toHaveLength(4);
  });

  it("supports a controlled path", () => {
    const onPathChange = vi.fn();
    const { rerender } = render(<Treemap data={tree} path={["apps"]} onPathChange={onPathChange} />);
    expect(tiles().map((t) => t.dataset.id)).toEqual(["xcode", "chrome"]);
    fireEvent.keyDown(tile("xcode"), { key: "Escape" });
    expect(onPathChange).toHaveBeenCalledWith([]);
    expect(tiles()).toHaveLength(2);
    rerender(<Treemap data={tree} path={[]} onPathChange={onPathChange} />);
    expect(tiles()).toHaveLength(4);
  });

  it("draws nested levels inside framed parents", () => {
    render(<Treemap data={tree} depth={2} defaultWidth={600} height={300} />);
    expect(tile("apps").dataset.expanded).toBe("true");
    expect(tile("xcode").dataset.depth).toBe("2");
  });

  it("shows a tooltip for the hovered tile", () => {
    render(<Treemap data={tree} />);
    fireEvent.pointerEnter(tile("docs"));
    const tip = document.querySelector("[data-slot=treemap-tooltip]")!;
    expect(tip).toHaveTextContent("Documents");
    expect(tip).toHaveTextContent("30%");
    expect(tile("docs").dataset.highlighted).toBe("true");
    fireEvent.pointerLeave(tile("docs"));
    expect(document.querySelector("[data-slot=treemap-tooltip]")).toBeNull();
  });

  it("has a text alternative listing the visible nodes", () => {
    render(<Treemap data={tree} label="Disk usage" valueLabel="Size" />);
    const table = screen.getByRole("table", { name: "Disk usage" });
    expect(within(table).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Name", "Size", "Share"]);
    expect(within(table).getByRole("rowheader", { name: "Documents" }).closest("tr")).toHaveTextContent("Documents3030%");
    expect(within(table).getAllByRole("row")).toHaveLength(5);
  });

  it("shows the empty state when nothing has a size", () => {
    render(<Treemap data={{ id: "r", name: "r", children: [{ id: "a", name: "A", value: 0 }] }} emptyState="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("has no axe violations (flat, nested and drilled)", async () => {
    const { container, unmount } = render(<Treemap data={tree} legend depth={2} />);
    fireEvent.pointerEnter(tile("docs"));
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(tile("apps"));
    expect(await axeViolations(container)).toEqual([]);
    unmount();
  });
});

const GB = 1e9;
const disk: StorageMapItem[] = [
  { id: "system", name: "System", size: 18 * GB, category: "macos" },
  { id: "library", name: "Library", category: "app-data", children: [
    { id: "caches", name: "Caches", size: 22 * GB },
    { id: "containers", name: "Containers", size: 40 * GB },
  ] },
  { id: "docs", name: "Documents", size: 120 * GB, category: "yours" },
  { id: "movies", name: "Movies", size: 60 * GB, category: "yours" },
  { id: "tmp", name: "Temporary files", size: 5 * GB },
];

describe("StorageMap", () => {
  it("shows used and free in decimal units and a category legend", () => {
    render(<StorageMap items={disk} capacity={494.38 * GB} />);
    expect(document.querySelector("[data-slot=storage-map-used]")).toHaveTextContent("265GB");
    expect(screen.getByText("In use of 494.38 GB")).toBeInTheDocument();
    expect(document.querySelector("[data-slot=storage-map-free]")).toHaveTextContent("229.38 GB");
    const legend = document.querySelector("[data-slot=treemap-legend]")!;
    const rows = within(legend as HTMLElement).getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector("[data-slot=breakdown-list-label]")!.textContent)).toEqual(["macOS", "App data", "Yours", "Other"]);
    expect(rows[2]).toHaveTextContent("180 GB");
    expect(rows[2]).toHaveTextContent("68%");
  });

  it("groups folders by category with fixed colours and drills into folders", () => {
    const onSelect = vi.fn();
    render(<StorageMap items={disk} capacity={500 * GB} used={300 * GB} categories={{ other: { label: "Misc" } }} onSelect={onSelect} />);
    expect(document.querySelector("[data-slot=storage-map-used]")).toHaveTextContent("300GB");
    expect(document.querySelector("[data-slot=storage-map-free]")).toHaveTextContent("200 GB");
    expect(tile("yours")).toHaveAccessibleName("Yours, 180 GB, 68%, 2 items");
    expect(tile("macos").style.backgroundColor).toContain("#2b7fff");
    expect(tile("docs").style.backgroundColor).toContain("#fe9a00");
    expect(screen.getByText("Misc", { selector: "[data-slot=breakdown-list-label]" })).toBeInTheDocument();
    fireEvent.click(tile("app-data"));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "app-data" }), ["app-data"]);
    expect(tiles().map((t) => t.dataset.id)).toEqual(["library", "containers", "caches"]);
    expect(screen.getByRole("table", { name: "Storage › App data" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<StorageMap items={disk} capacity={494.38 * GB} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
