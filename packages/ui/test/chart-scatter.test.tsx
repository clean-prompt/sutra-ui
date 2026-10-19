import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScatterChart } from "../src/patterns/chart";
import { axeViolations } from "./a11y";

const runs = [
  { cost: 10, score: 60, tokens: 100, speed: 30 },
  { cost: 20, score: 70, tokens: 25, speed: 45 },
  { cost: 30, score: 90, tokens: 1, speed: 20 },
  { cost: 40, score: 85, tokens: 64, speed: 55 },
];
const one = [{ key: "score", label: "Score" }];

const dots = (c: HTMLElement, series?: string) =>
  Array.from(c.querySelectorAll(`[data-slot="chart-point"]${series ? `[data-series="${series}"]` : ""}`));
const attr = (el: Element, a: string) => Number(el.getAttribute(a));
const chart = (c: HTMLElement) => c.querySelector('[data-slot="chart"]') as HTMLElement;
const tip = (c: HTMLElement) => c.querySelector('[data-slot="chart-tooltip"]')?.textContent;
const live = (c: HTMLElement) => c.querySelector('[aria-live="polite"]')!.textContent;
const texts = (c: HTMLElement) => Array.from(c.querySelectorAll("svg text")).map((t) => t.textContent);
const hover = (c: HTMLElement, el: Element, dx = 0, dy = 0) =>
  fireEvent.mouseMove(c.querySelector('[data-slot="chart-hit"]')!, { clientX: attr(el, "cx") + dx, clientY: attr(el, "cy") + dy });

describe("ScatterChart", () => {
  it("draws a point per row and series at its x and y", () => {
    const { container } = render(<ScatterChart data={runs} index="cost" series={one} />);
    const d = dots(container);
    expect(d).toHaveLength(4);
    const xs = d.map((p) => attr(p, "cx"));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    // Even x spacing in the data gives even spacing on the axis; the best score sits highest.
    expect(xs[1]! - xs[0]!).toBeCloseTo(xs[2]! - xs[1]!, 1);
    expect(attr(d[2]!, "cy")).toBeLessThan(attr(d[0]!, "cy"));
    expect(d[0]!.getAttribute("r")).toBe("4.5");
  });

  it("fits the value axis to the data instead of including zero", () => {
    const { container } = render(
      <ScatterChart data={[{ x: 1, y: 100 }, { x: 2, y: 110 }]} index="x" series={[{ key: "y" }]} />
    );
    const yLabels = Array.from(container.querySelectorAll("svg text[x=\"32\"]")).map((t) => Number(t.textContent));
    expect(yLabels.length).toBeGreaterThan(2);
    expect(Math.min(...yLabels)).toBeGreaterThanOrEqual(90);
  });

  it("sizes bubbles by area, between the min and max radius", () => {
    const { container } = render(
      <ScatterChart data={runs} index="cost" series={[{ key: "score", sizeKey: "tokens" }]} bubbleSize={[3, 20]} />
    );
    // Sizes 100, 64, 25 and 1, drawn largest first.
    const r = dots(container).map((p) => attr(p, "r"));
    expect(r[0]).toBe(20); // the largest value
    expect(r[1]).toBeCloseTo(16, 1); // 64% of the value, 80% of the radius: area follows the value
    expect(r[2]).toBeCloseTo(10, 1); // a quarter of the value, half the radius
    expect(r[3]).toBe(3); // tiny values stop at the minimum
    expect(dots(container)[0]!.getAttribute("fill-opacity")).toBe("0.5");
  });

  it("draws the biggest bubbles first so small ones stay on top", () => {
    const { container } = render(<ScatterChart data={runs} index="cost" series={[{ key: "score", sizeKey: "tokens" }]} />);
    const radii = dots(container).map((p) => attr(p, "r"));
    expect(radii).toEqual([...radii].sort((a, b) => b - a));
  });

  it("honours pointSize and the palette", () => {
    const { container } = render(<ScatterChart data={runs} index="cost" series={[...one, { key: "speed", color: "info" }]} pointSize={7} />);
    expect(dots(container, "score")[0]!.getAttribute("r")).toBe("7");
    expect(dots(container, "score")[0]!.getAttribute("fill")).toContain("var(--chart-1");
    expect(dots(container, "speed")[0]!.getAttribute("fill")).toBe("var(--info)");
  });

  it("skips missing and invalid values and copes with a single point", () => {
    const { container } = render(
      <ScatterChart data={[{ x: 1, y: null }, { x: "a", y: 3 }, { x: 5, y: 4 }]} index="x" series={[{ key: "y" }]} />
    );
    expect(dots(container)).toHaveLength(1);
    expect(container.innerHTML).not.toContain("NaN");
  });

  it("shows a tooltip for the nearest point, with the size, and none far from any point", () => {
    const { container } = render(
      <ScatterChart
        data={runs}
        index="cost"
        series={[{ key: "score", label: "Score", sizeKey: "tokens", sizeLabel: "Tokens" }]}
        xAxis={{ label: "Cost" }}
        sizeFormatter={(v) => `${v} tok`}
      />
    );
    hover(container, dots(container)[0]!, 3, -2);
    expect(tip(container)).toContain("Cost: 10");
    expect(tip(container)).toContain("60");
    expect(tip(container)).toContain("100 tok");
    expect(container.querySelector('[data-slot="chart-active-point"]')).toBeTruthy();
    fireEvent.mouseMove(container.querySelector('[data-slot="chart-hit"]')!, { clientX: 590, clientY: 5 });
    expect(tip(container)).toBeUndefined();
    hover(container, dots(container)[1]!);
    fireEvent.mouseLeave(container.querySelector('[data-slot="chart-hit"]')!);
    expect(tip(container)).toBeUndefined();
  });

  it("respects tooltip={false}", () => {
    const { container } = render(<ScatterChart data={runs} index="cost" series={one} tooltip={false} />);
    hover(container, dots(container)[0]!);
    expect(tip(container)).toBeUndefined();
  });

  it("steps through the points in x order with the keyboard and announces them", () => {
    const seen: ({ seriesKey: string; index: number } | null)[] = [];
    const { container } = render(
      <ScatterChart data={runs} index="cost" series={[{ key: "score", label: "Score" }]} xAxis={{ label: "Cost" }} onActivePointChange={(p) => seen.push(p)} />
    );
    const el = chart(container);
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toBe("Cost 10: Score 60");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toBe("Cost 20: Score 70");
    fireEvent.keyDown(el, { key: "End" });
    expect(live(container)).toBe("Cost 40: Score 85");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toBe("Cost 10: Score 60");
    fireEvent.keyDown(el, { key: "ArrowLeft" });
    expect(live(container)).toBe("Cost 40: Score 85");
    fireEvent.keyDown(el, { key: "Home" });
    expect(seen[seen.length - 1]).toEqual({ seriesKey: "score", index: 0 });
    fireEvent.keyDown(el, { key: "Escape" });
    expect(tip(container)).toBeUndefined();
    expect(seen[seen.length - 1]).toBeNull();
  });

  it("includes the size in the announcement and orders several series by x", () => {
    const { container } = render(
      <ScatterChart
        data={[{ x: 1, a: 5, b: 9, n: 4 }, { x: 2, a: 6, b: 8, n: 9 }]}
        index="x"
        series={[{ key: "a", label: "A" }, { key: "b", label: "B", sizeKey: "n", sizeLabel: "Count" }]}
      />
    );
    const el = chart(container);
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toBe("x 1: A 5");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toBe("x 1: B 9, Count 4");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(live(container)).toBe("x 2: A 6");
  });

  it("toggles series from the legend (uncontrolled) and says when all are hidden", async () => {
    const user = userEvent.setup();
    const { container } = render(<ScatterChart data={runs} index="cost" series={[{ key: "score", label: "Score" }, { key: "speed", label: "Speed" }]} />);
    expect(dots(container)).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: "Speed" }));
    expect(dots(container)).toHaveLength(4);
    expect(dots(container, "speed")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Score" }));
    expect(screen.getByText("All series hidden")).toBeTruthy();
  });

  it("supports controlled hidden series and reports changes", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    const { container, rerender } = render(
      <ScatterChart
        data={runs}
        index="cost"
        series={[{ key: "score" }, { key: "speed" }]}
        hiddenSeries={["speed"]}
        onHiddenSeriesChange={(h) => changes.push(h)}
      />
    );
    expect(dots(container)).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "score" }));
    expect(changes[0]).toEqual(["speed", "score"]);
    expect(dots(container)).toHaveLength(4); // still controlled
    rerender(<ScatterChart data={runs} index="cost" series={[{ key: "score" }, { key: "speed" }]} hiddenSeries={[]} />);
    expect(dots(container)).toHaveLength(8);
  });

  it("shows no legend for one series unless asked, and a plain list when not interactive", () => {
    const { container, rerender } = render(<ScatterChart data={runs} index="cost" series={one} />);
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeNull();
    rerender(<ScatterChart data={runs} index="cost" series={one} legend legendInteractive={false} />);
    expect(container.querySelector('[data-slot="chart-legend"]')!.getAttribute("role")).toBe("list");
  });

  it("places points by time on a time axis", () => {
    const day = (n: number) => new Date(2026, 9, n).getTime();
    const { container } = render(
      <ScatterChart data={[{ t: day(1), y: 1 }, { t: day(2), y: 2 }, { t: day(9), y: 3 }]} index="t" series={[{ key: "y" }]} xAxis={{ type: "time" }} />
    );
    const xs = dots(container).map((p) => attr(p, "cx"));
    expect((xs[1]! - xs[0]!) / (xs[2]! - xs[0]!)).toBeCloseTo(1 / 8, 2);
    expect(texts(container).some((t) => /Oct|Mon|Tue|Wed|Thu|Fri|Sat|Sun/.test(t ?? ""))).toBe(true);
  });

  it("clips points outside a fixed x domain and a fixed y range", () => {
    const { container } = render(
      <ScatterChart data={runs} index="cost" series={one} xAxis={{ domain: [15, 35] }} yAxis={{ min: 0, max: 80 }} />
    );
    expect(dots(container)).toHaveLength(1); // cost 20 / score 70; cost 30 is above 80
  });

  it("draws horizontal and vertical reference lines", () => {
    const { container } = render(
      <ScatterChart data={runs} index="cost" series={one} referenceLines={[{ value: 80, label: "Goal" }, { axis: "x", value: 25, label: "Budget" }]} />
    );
    const lines = Array.from(container.querySelectorAll('[data-slot="chart-reference-line"]'));
    expect(lines.map((l) => l.textContent)).toEqual(["Goal", "Budget"]);
  });

  it("exposes the data in a screen-reader table inside div.sr-only, with size columns", () => {
    const { container } = render(
      <ScatterChart data={runs} index="cost" series={[{ key: "score", label: "Score", sizeKey: "tokens", sizeLabel: "Tokens" }]} xAxis={{ label: "Cost" }} />
    );
    const table = container.querySelector("div.sr-only > table")!;
    expect(Array.from(table.querySelectorAll("thead th")).map((t) => t.textContent)).toEqual(["Cost", "Score", "Tokens"]);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(table.querySelectorAll("tbody tr")[0]!.textContent).toBe("1060100");
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Score");
  });

  it("shows an empty state, and never while loading", () => {
    const { container, rerender } = render(<ScatterChart data={[]} index="x" series={one} />);
    expect(container.querySelector('[data-slot="chart-empty"]')?.textContent).toBe("No data");
    rerender(<ScatterChart data={[]} index="x" series={one} emptyState="No runs" />);
    expect(screen.getByText("No runs")).toBeTruthy();
    rerender(<ScatterChart data={[]} index="x" series={[...one, { key: "b" }]} loading emptyState="No runs" />);
    expect(container.querySelector('[data-slot="chart-empty"]')).toBeNull();
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="chart-legend-skeleton"] > span')).toHaveLength(2);
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading scatter chart…")).toBeTruthy();
  });

  it("keeps showing data while refreshing", () => {
    const { container } = render(<ScatterChart data={runs} index="cost" series={one} loading />);
    expect(dots(container)).toHaveLength(4);
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeNull();
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
  });

  it("handles a few hundred points", () => {
    const many = Array.from({ length: 400 }, (_, i) => ({ x: (i * 37) % 101, y: (i * 53) % 97, n: i % 9 }));
    const { container } = render(<ScatterChart data={many} index="x" series={[{ key: "y", sizeKey: "n" }]} />);
    expect(dots(container)).toHaveLength(400);
    expect(container.innerHTML).not.toContain("NaN");
  });

  it("takes className, ref and a label", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<ScatterChart ref={ref} data={runs} index="cost" series={one} className="mine" label="Cost vs score" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current!.className).toContain("mine");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Cost vs score");
  });

  it("has no axe violations (data, bubbles, empty, loading)", async () => {
    const a = render(<ScatterChart data={runs} index="cost" series={[...one, { key: "speed", sizeKey: "tokens" }]} />);
    expect(await axeViolations(a.container)).toEqual([]);
    const b = render(<ScatterChart data={[]} index="x" series={one} />);
    expect(await axeViolations(b.container)).toEqual([]);
    const c = render(<ScatterChart data={[]} index="x" series={one} loading />);
    expect(await axeViolations(c.container)).toEqual([]);
  });
});
