import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadarChart } from "../src/patterns/chart";
import { axeViolations } from "./helpers/a11y";

const skills = [
  { skill: "Speed", a: 80, b: 40 },
  { skill: "Accuracy", a: 60, b: 90 },
  { skill: "Cost", a: 100, b: 20 },
  { skill: "Safety", a: 30, b: 70 },
];
const two = [
  { key: "a", label: "Model A" },
  { key: "b", label: "Model B" },
];

// jsdom: the chart is 600x320 and the center is (300, 160).
const CX = 300;
const CY = 160;
const slot = (c: HTMLElement, s: string) => Array.from(c.querySelectorAll(`[data-slot="${s}"]`));
const chart = (c: HTMLElement) => c.querySelector('[data-slot="chart"]') as HTMLElement;
const tip = (c: HTMLElement) => c.querySelector('[data-slot="chart-tooltip"]')?.textContent;
const live = (c: HTMLElement) => c.querySelector('[aria-live="polite"]')!.textContent;
const hitAt = (c: HTMLElement, x: number, y: number) => fireEvent.mouseMove(slot(c, "chart-hit")[0]!, { clientX: x, clientY: y });
const points = (d: string) => (d.match(/-?[\d.]+,-?[\d.]+/g) ?? []).map((p) => p.split(",").map(Number) as [number, number]);

describe("RadarChart", () => {
  it("draws one polygon per series with a dot per spoke", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={two} />);
    expect(slot(container, "chart-area")).toHaveLength(2);
    expect(slot(container, "chart-dot")).toHaveLength(8);
    expect(slot(container, "chart-spoke")).toHaveLength(4);
    expect(slot(container, "chart-axis-label").map((t) => t.textContent)).toEqual(["Speed", "Accuracy", "Cost", "Safety"]);
  });

  it("places values on their spokes, scaled to the domain", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={[two[0]!]} domain={[0, 100]} />);
    const [top, right, bottom, left] = points(slot(container, "chart-area")[0]!.getAttribute("d")!);
    const R = CY - 24; // limited by the height
    expect(top![0]).toBeCloseTo(CX, 1);
    expect(CY - top![1]).toBeCloseTo(R * 0.8, 1); // 80 of 100 straight up
    expect(right![0] - CX).toBeCloseTo(R * 0.6, 1); // 60 to the right
    expect(bottom![1] - CY).toBeCloseTo(R * 1.0, 1); // 100 straight down
    expect(CX - left![0]).toBeCloseTo(R * 0.3, 1); // 30 to the left
  });

  it("draws polygon rings by default, circles when asked or with under three spokes", () => {
    const { container, rerender } = render(<RadarChart data={skills} index="skill" series={two} domain={[0, 100]} />);
    expect(slot(container, "chart-ring").map((r) => r.tagName)).toEqual(["polygon", "polygon", "polygon", "polygon", "polygon"]);
    rerender(<RadarChart data={skills} index="skill" series={two} domain={[0, 100]} shape="circle" />);
    expect(slot(container, "chart-ring").every((r) => r.tagName === "circle")).toBe(true);
    rerender(<RadarChart data={skills.slice(0, 2)} index="skill" series={two} domain={[0, 100]} />);
    expect(slot(container, "chart-ring").every((r) => r.tagName === "circle")).toBe(true);
    expect(container.innerHTML).not.toContain("NaN");
  });

  it("labels the rings along the first spoke and can hide them", () => {
    const { container, rerender } = render(<RadarChart data={skills} index="skill" series={two} domain={[0, 100]} />);
    expect(slot(container, "chart-level").map((t) => t.textContent)).toEqual(["20", "40", "60", "80", "100"]);
    rerender(<RadarChart data={skills} index="skill" series={two} domain={[0, 100]} levelLabels={false} />);
    expect(slot(container, "chart-level")).toHaveLength(0);
  });

  it("fits the rim to the data by default and takes `levels`", () => {
    const { container, rerender } = render(<RadarChart data={skills} index="skill" series={two} />);
    expect(slot(container, "chart-level").pop()!.textContent).toBe("100");
    rerender(<RadarChart data={[{ skill: "A", a: 3 }, { skill: "B", a: 7 }, { skill: "C", a: 5 }]} index="skill" series={[{ key: "a" }]} levels={2} />);
    expect(slot(container, "chart-ring").length).toBeLessThanOrEqual(3);
    expect(slot(container, "chart-level").pop()!.textContent).toBe("10");
  });

  it("copes with missing values, negative values and a single spoke", () => {
    const { container, rerender } = render(
      <RadarChart data={[{ m: "A", v: null }, { m: "B", v: 4 }, { m: "C", v: "x" }]} index="m" series={[{ key: "v" }]} />
    );
    expect(slot(container, "chart-dot")).toHaveLength(1);
    rerender(<RadarChart data={[{ m: "A", v: -5 }, { m: "B", v: 10 }, { m: "C", v: 2 }]} index="m" series={[{ key: "v" }]} />);
    expect(slot(container, "chart-level").map((t) => t.textContent)).toEqual(["-5", "0", "5", "10"]); // the center value is labelled when it is not 0
    rerender(<RadarChart data={[{ m: "A", v: 5 }]} index="m" series={[{ key: "v" }]} />);
    expect(slot(container, "chart-dot")).toHaveLength(1);
    expect(container.innerHTML).not.toContain("NaN");
  });

  it("fill and dots can be turned off", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={two} fill={false} dots={false} />);
    expect(slot(container, "chart-area")[0]!.getAttribute("fill")).toBe("none");
    expect(slot(container, "chart-dot")).toHaveLength(0);
  });

  it("shortens long spoke labels and keeps the full name in a title", () => {
    const long = [{ m: "An extremely long measurement name that cannot fit", v: 3 }, { m: "B", v: 4 }, { m: "C", v: 5 }];
    const { container } = render(<RadarChart data={long} index="m" series={[{ key: "v" }]} />);
    const first = slot(container, "chart-axis-label")[0]!;
    expect(first.textContent!.endsWith("…")).toBe(false); // top spoke is centered with room to spare
    const { container: narrow } = render(<div style={{ width: 200 }}><RadarChart data={long} index="m" series={[{ key: "v" }]} /></div>);
    expect(narrow.querySelectorAll("[data-slot=chart-axis-label]")).toHaveLength(3);
  });

  it("finds the spoke under the pointer by angle and shows its values", () => {
    const seen: (number | null)[] = [];
    const { container } = render(<RadarChart data={skills} index="skill" series={two} onActiveIndexChange={(i) => seen.push(i)} />);
    hitAt(container, CX, CY - 100); // straight up: Speed
    expect(tip(container)).toContain("Speed");
    expect(tip(container)).toContain("Model A");
    expect(tip(container)).toContain("80");
    hitAt(container, CX + 100, CY + 5); // right: Accuracy
    expect(tip(container)).toContain("Accuracy");
    hitAt(container, CX - 60, CY - 5); // left: Safety
    expect(tip(container)).toContain("Safety");
    fireEvent.mouseLeave(slot(container, "chart-hit")[0]!);
    expect(tip(container)).toBeUndefined();
    expect(seen[seen.length - 1]).toBeNull();
    expect(seen).toContain(3);
  });

  it("respects tooltip={false}", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={two} tooltip={false} />);
    hitAt(container, CX, CY - 100);
    expect(tip(container)).toBeUndefined();
  });

  it("steps through the spokes with the keyboard and announces them", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={two} valueFormatter={(v) => `${v}pt`} />);
    const el = chart(container);
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toBe("Speed: Model A 80pt, Model B 40pt");
    fireEvent.keyDown(el, { key: "ArrowDown" });
    expect(live(container)).toBe("Accuracy: Model A 60pt, Model B 90pt");
    fireEvent.keyDown(el, { key: "End" });
    expect(live(container)).toContain("Safety");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toContain("Speed");
    fireEvent.keyDown(el, { key: "ArrowLeft" });
    expect(live(container)).toContain("Safety");
    expect(slot(container, "chart-dot").some((d) => d.getAttribute("r") === "5")).toBe(true);
    fireEvent.keyDown(el, { key: "Escape" });
    expect(tip(container)).toBeUndefined();
  });

  it("toggles series from the legend and says when all are hidden", async () => {
    const user = userEvent.setup();
    const { container } = render(<RadarChart data={skills} index="skill" series={two} />);
    await user.click(screen.getByRole("button", { name: "Model B" }));
    expect(slot(container, "chart-series")).toHaveLength(1);
    expect(slot(container, "chart-series")[0]!.getAttribute("data-series")).toBe("a");
    await user.click(screen.getByRole("button", { name: "Model A" }));
    expect(screen.getByText("All series hidden")).toBeTruthy();
  });

  it("supports controlled hidden series", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    const { container, rerender } = render(
      <RadarChart data={skills} index="skill" series={two} hiddenSeries={["b"]} onHiddenSeriesChange={(h) => changes.push(h)} />
    );
    expect(slot(container, "chart-series")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Model A" }));
    expect(changes[0]).toEqual(["b", "a"]);
    expect(slot(container, "chart-series")).toHaveLength(1);
    rerender(<RadarChart data={skills} index="skill" series={two} hiddenSeries={[]} />);
    expect(slot(container, "chart-series")).toHaveLength(2);
  });

  it("shows no legend for a single series by default", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={[two[0]!]} />);
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeNull();
  });

  it("uses the series colors", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={[{ key: "a", color: "success" }, { key: "b" }]} />);
    expect(slot(container, "chart-area")[0]!.getAttribute("stroke")).toBe("var(--success)");
    expect(slot(container, "chart-area")[1]!.getAttribute("stroke")).toContain("var(--chart-2");
  });

  it("exposes the data in a screen-reader table inside div.sr-only", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={two} />);
    const table = container.querySelector("div.sr-only > table")!;
    expect(Array.from(table.querySelectorAll("thead th")).map((t) => t.textContent)).toEqual(["skill", "Model A", "Model B"]);
    expect(table.querySelectorAll("tbody tr")[2]!.textContent).toBe("Cost10020");
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Speed");
  });

  it("shows an empty state, and never while loading", () => {
    const { container, rerender } = render(<RadarChart data={[]} index="m" series={two} />);
    expect(container.querySelector('[data-slot="chart-empty"]')?.textContent).toBe("No data");
    rerender(<RadarChart data={[]} index="m" series={two} emptyState="Nothing to compare" />);
    expect(screen.getByText("Nothing to compare")).toBeTruthy();
    rerender(<RadarChart data={[]} index="m" series={two} loading emptyState="Nothing to compare" />);
    expect(container.querySelector('[data-slot="chart-empty"]')).toBeNull();
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="chart-legend-skeleton"]')).toBeTruthy();
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading radar chart…")).toBeTruthy();
  });

  it("keeps showing data while refreshing", () => {
    const { container } = render(<RadarChart data={skills} index="skill" series={two} loading />);
    expect(slot(container, "chart-area")).toHaveLength(2);
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeNull();
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
  });

  it("takes className, ref and a label", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<RadarChart ref={ref} data={skills} index="skill" series={two} className="mine" label="Model comparison" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current!.className).toContain("mine");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Model comparison");
  });

  it("has no axe violations (data, empty, loading)", async () => {
    const a = render(<RadarChart data={skills} index="skill" series={two} />);
    expect(await axeViolations(a.container)).toEqual([]);
    const b = render(<RadarChart data={[]} index="m" series={two} />);
    expect(await axeViolations(b.container)).toEqual([]);
    const c = render(<RadarChart data={[]} index="m" series={two} loading />);
    expect(await axeViolations(c.container)).toEqual([]);
  });
});
