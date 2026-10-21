import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { WaterfallChart } from "../src/patterns/chart";
import { axeViolations } from "./helpers/a11y";

const steps = [
  { label: "Start", value: 120, type: "total" },
  { label: "New", value: 40 },
  { label: "Churn", value: -30 },
  { label: "Expansion", value: 20 },
  { label: "End", type: "total" },
];

const bars = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-slot="chart-bar"]'));
const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
const chart = (c: HTMLElement) => c.querySelector('[data-slot="chart"]') as HTMLElement;
const tip = (c: HTMLElement) => c.querySelector('[data-slot="chart-tooltip"]')?.textContent;
const values = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-slot="chart-value"]')).map((t) => t.textContent);

describe("WaterfallChart", () => {
  it("builds a running total: totals rise from zero, changes float on the previous level", () => {
    const { container } = render(<WaterfallChart data={steps} />);
    const b = bars(container);
    expect(b.map((x) => x.getAttribute("data-kind"))).toEqual(["total", "increase", "decrease", "increase", "total"]);
    // Pixel geometry: start and end totals (120 and 150) differ by 30; the first bar sits on the baseline.
    const bottom = (x: Element) => num(x, "y") + num(x, "height");
    expect(bottom(b[0]!)).toBeCloseTo(bottom(b[4]!), 1);
    expect(num(b[4]!, "height")).toBeGreaterThan(num(b[0]!, "height"));
    expect(bottom(b[1]!)).toBeCloseTo(num(b[0]!, "y"), 1); // "New" starts at the first total's top
    expect(num(b[1]!, "y") + 0).toBeLessThan(num(b[0]!, "y"));
    expect(num(b[2]!, "y")).toBeCloseTo(num(b[1]!, "y"), 1); // "Churn" falls from the level New reached
  });

  it("labels changes with a sign and totals as they are", () => {
    const { container } = render(<WaterfallChart data={steps} />);
    expect(values(container)).toEqual(["120", "+40", "−30", "+20", "150"]);
  });

  it("formats magnitudes and keeps the sign outside the formatter", () => {
    const { container } = render(<WaterfallChart data={steps} valueFormatter={(v) => `$${v}k`} />);
    expect(values(container)).toEqual(["$120k", "+$40k", "−$30k", "+$20k", "$150k"]);
  });

  it("reads custom keys, treats 'subtotal' like a total and an explicit total resets the level", () => {
    const { container } = render(
      <WaterfallChart
        data={[
          { step: "A", amount: 50 },
          { step: "Sub", amount: 80, kind: "subtotal" },
          { step: "B", amount: -10 },
        ]}
        index="step"
        valueKey="amount"
        typeKey="kind"
      />
    );
    expect(bars(container).map((x) => x.getAttribute("data-kind"))).toEqual(["increase", "total", "decrease"]);
    fireEvent.keyDown(chart(container), { key: "End" });
    expect(tip(container)).toContain("70"); // 80 - 10
  });

  it("handles running totals that cross below zero", () => {
    const { container } = render(
      <WaterfallChart data={[{ label: "A", value: 10 }, { label: "B", value: -40 }, { label: "C", value: 5 }]} />
    );
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.querySelector("line.stroke-border-strong")).toBeTruthy(); // zero line drawn
    fireEvent.keyDown(chart(container), { key: "End" });
    expect(tip(container)).toContain("-25");
  });

  it("draws connectors unless turned off", () => {
    const { container, rerender } = render(<WaterfallChart data={steps} />);
    expect(container.querySelectorAll('[data-slot="chart-connector"]')).toHaveLength(4);
    rerender(<WaterfallChart data={steps} connectors={false} />);
    expect(container.querySelectorAll('[data-slot="chart-connector"]')).toHaveLength(0);
  });

  it("showValues: auto hides labels that do not fit, true and false force them", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ label: `W${i}`, value: i % 2 ? -3 : 5 }));
    const { container, rerender } = render(<WaterfallChart data={many} />);
    expect(values(container)).toHaveLength(0);
    rerender(<WaterfallChart data={many} showValues />);
    expect(values(container)).toHaveLength(60);
    rerender(<WaterfallChart data={steps} showValues={false} />);
    expect(values(container)).toHaveLength(0);
  });

  it("thins out category labels for many steps", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ label: `Week ${i + 1}`, value: 2 }));
    const { container } = render(<WaterfallChart data={many} />);
    const ticks = Array.from(container.querySelectorAll("svg text.text-2xs")).filter((t) => (t.textContent ?? "").startsWith("Week"));
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.length).toBeLessThan(40);
  });

  it("shows a legend with the kinds present, and hides it for a single kind", () => {
    const { container, rerender } = render(<WaterfallChart data={steps} />);
    expect(container.querySelector('[data-slot="chart-legend"]')!.textContent).toBe("IncreaseDecreaseTotal");
    rerender(<WaterfallChart data={steps} kindLabels={{ increase: "Gain" }} legend="top" />);
    expect(container.querySelector('[data-slot="chart-legend"]')!.textContent).toBe("GainDecreaseTotal");
    rerender(<WaterfallChart data={[{ label: "a", value: 1 }]} />);
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeNull();
  });

  it("applies colors per kind and exposes a typed, signed screen-reader table in div.sr-only", () => {
    const { container } = render(<WaterfallChart data={steps} colors={{ decrease: "warning" }} />);
    expect(bars(container)[2]!.getAttribute("fill")).toBe("var(--warning)");
    expect(bars(container)[1]!.getAttribute("fill")).toBe("var(--success)");
    const rows = Array.from(container.querySelectorAll("div.sr-only > table tbody tr")).map((r) => r.textContent);
    expect(rows).toEqual(["StartTotal–120", "NewIncrease+40160", "ChurnDecrease−30130", "ExpansionIncrease+20150", "EndTotal–150"].map((r) => r));
  });

  it("walks the steps with the keyboard, announces them and shows a tooltip with the running total", () => {
    const { container } = render(<WaterfallChart data={steps} />);
    const el = chart(container);
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(tip(container)).toContain("Start");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe("Churn: −30, total 130");
    expect(tip(container)).toContain("Decrease");
    fireEvent.keyDown(el, { key: "Escape" });
    expect(tip(container)).toBeUndefined();
  });

  it("follows the pointer and respects tooltip={false}", () => {
    const { container, rerender } = render(<WaterfallChart data={steps} />);
    const hit = container.querySelector('[data-slot="chart-hit"]')!;
    fireEvent.mouseMove(hit, { clientX: 40 + 552 * 0.5 }); // jsdom has no layout: rect.left is 0 and width 0
    expect(tip(container)).toBeTruthy();
    fireEvent.mouseLeave(hit);
    expect(tip(container)).toBeUndefined();
    rerender(<WaterfallChart data={steps} tooltip={false} />);
    fireEvent.mouseMove(container.querySelector('[data-slot="chart-hit"]')!, { clientX: 100 });
    expect(tip(container)).toBeUndefined();
  });

  it("draws reference lines and takes yAxis options", () => {
    const { container } = render(
      <WaterfallChart data={steps} referenceLines={[{ value: 200, label: "Target" }]} yAxis={{ formatter: (v) => `${v}u`, max: 250 }} />
    );
    expect(container.querySelector('[data-slot="chart-reference-line"]')!.textContent).toBe("Target");
    expect(Array.from(container.querySelectorAll("svg text")).some((t) => t.textContent === "250u")).toBe(true);
  });

  it("shows an empty state, and never while loading", () => {
    const { container, rerender } = render(<WaterfallChart data={[]} />);
    expect(container.querySelector('[data-slot="chart-empty"]')?.textContent).toBe("No data");
    rerender(<WaterfallChart data={[]} emptyState="No changes" />);
    expect(screen.getByText("No changes")).toBeTruthy();
    rerender(<WaterfallChart data={[]} loading emptyState="No changes" />);
    expect(container.querySelector('[data-slot="chart-empty"]')).toBeNull();
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="chart-legend-skeleton"]')).toBeTruthy();
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading waterfall chart…")).toBeTruthy();
  });

  it("keeps showing data while refreshing", () => {
    const { container } = render(<WaterfallChart data={steps} loading />);
    expect(bars(container)).toHaveLength(5);
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeNull();
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
  });

  it("reports the active step and takes ref, className and a label", () => {
    const seen: (number | null)[] = [];
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <WaterfallChart ref={ref} data={steps} className="mine" label="Revenue bridge" onActiveIndexChange={(i) => seen.push(i)} />
    );
    expect(ref.current!.className).toContain("mine");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Revenue bridge");
    fireEvent.keyDown(chart(container), { key: "Home" });
    expect(seen[seen.length - 1]).toBe(0);
  });

  it("has no axe violations (data, empty, loading)", async () => {
    const a = render(<WaterfallChart data={steps} />);
    expect(await axeViolations(a.container)).toEqual([]);
    const b = render(<WaterfallChart data={[]} />);
    expect(await axeViolations(b.container)).toEqual([]);
    const c = render(<WaterfallChart data={[]} loading />);
    expect(await axeViolations(c.container)).toEqual([]);
  });
});
