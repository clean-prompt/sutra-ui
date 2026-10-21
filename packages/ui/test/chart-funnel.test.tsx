import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FunnelChart } from "../src/patterns/chart";
import { axeViolations } from "./helpers/a11y";

const stages = [
  { label: "Visited", value: 12000 },
  { label: "Signed up", value: 6000 },
  { label: "Activated", value: 3000 },
  { label: "Paid", value: 600 },
];

const paths = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-slot="chart-stage"]'));
const labels = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-slot="chart-stage-label"]')).map((l) => l.textContent);
const chart = (c: HTMLElement) => c.querySelector('[data-slot="chart"]') as HTMLElement;

describe("FunnelChart", () => {
  it("draws one stage per row, narrowing with the value", () => {
    const { container } = render(<FunnelChart data={stages} />);
    expect(paths(container)).toHaveLength(4);
    const widthOf = (p: Element) => {
      const nums = p.getAttribute("d")!.match(/-?[\d.]+/g)!.map(Number);
      return nums[2]! - nums[0]!; // top edge: x of the second corner minus the first
    };
    const [a, b, c, d] = paths(container).map(widthOf) as [number, number, number, number];
    expect(b).toBeCloseTo(a / 2, 0);
    expect(c).toBeCloseTo(a / 4, 0);
    expect(d).toBeLessThan(c);
  });

  it("shows the conversion rate of each stage after the first", () => {
    const { container } = render(<FunnelChart data={stages} />);
    expect(labels(container)).toEqual(["Visited12,000", "Signed up6,000 · 50%", "Activated3,000 · 50%", "Paid600 · 20%"]);
  });

  it("measures conversion against the first stage when asked, and can hide it", () => {
    const { container, rerender } = render(<FunnelChart data={stages} conversion="first" />);
    expect(labels(container)[3]).toBe("Paid600 · 5%");
    rerender(<FunnelChart data={stages} conversion={false} />);
    expect(labels(container)[3]).toBe("Paid600");
  });

  it("formats values and reads custom keys", () => {
    const { container } = render(
      <FunnelChart
        data={[{ step: "Leads", n: 40 }, { step: "Won", n: 4 }]}
        index="step"
        valueKey="n"
        valueFormatter={(v) => `$${v}k`}
      />
    );
    expect(labels(container)).toEqual(["Leads$40k", "Won$4k · 10%"]);
  });

  it("exposes an image role, a name and a screen-reader table inside div.sr-only", () => {
    const { container } = render(<FunnelChart data={stages} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("aria-label")).toContain("Visited 12,000");
    const table = container.querySelector("div.sr-only > table")!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(table.querySelectorAll("thead th")).toHaveLength(4);
    expect(table.querySelectorAll("tbody tr")[1]!.textContent).toBe("Signed up6,00050%50%");
  });

  it("walks the stages with the keyboard, announces them and shows the tooltip", () => {
    const seen: (number | null)[] = [];
    const { container } = render(<FunnelChart data={stages} onActiveIndexChange={(i) => seen.push(i)} />);
    const el = chart(container);
    fireEvent.keyDown(el, { key: "ArrowDown" });
    expect(container.querySelector('[data-slot="chart-tooltip"]')?.textContent).toContain("Visited");
    fireEvent.keyDown(el, { key: "ArrowDown" });
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe("Signed up: 6,000, 50% of previous, 50% of first");
    expect(container.querySelector('[data-slot="chart-tooltip"]')?.textContent).toContain("6,000 lost");
    fireEvent.keyDown(el, { key: "End" });
    expect(container.querySelector('[data-slot="chart-tooltip"]')?.textContent).toContain("Paid");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(container.querySelector('[data-slot="chart-tooltip"]')?.textContent).toContain("Visited");
    fireEvent.keyDown(el, { key: "Home" });
    fireEvent.keyDown(el, { key: "ArrowLeft" });
    expect(container.querySelector('[data-slot="chart-tooltip"]')?.textContent).toContain("Paid");
    fireEvent.keyDown(el, { key: "Escape" });
    expect(container.querySelector('[data-slot="chart-tooltip"]')).toBeNull();
    expect(seen[seen.length - 1]).toBeNull();
  });

  it("follows the mouse and respects tooltip={false}", () => {
    const { container, rerender } = render(<FunnelChart data={stages} />);
    fireEvent.mouseEnter(paths(container)[2]!);
    expect(container.querySelector('[data-slot="chart-tooltip"]')?.textContent).toContain("Activated");
    fireEvent.mouseLeave(container.querySelector("svg")!);
    expect(container.querySelector('[data-slot="chart-tooltip"]')).toBeNull();
    rerender(<FunnelChart data={stages} tooltip={false} />);
    fireEvent.mouseEnter(paths(container)[2]!);
    expect(container.querySelector('[data-slot="chart-tooltip"]')).toBeNull();
  });

  it("clamps negative and invalid values and tolerates a zero first stage", () => {
    const { container } = render(
      <FunnelChart data={[{ label: "A", value: 0 }, { label: "B", value: -5 }, { label: "C", value: "x" }]} />
    );
    expect(paths(container)).toHaveLength(3);
    expect(container.innerHTML).not.toContain("NaN");
    expect(screen.getAllByText("–").length).toBeGreaterThan(0);
  });

  it("colors: one shaded color by default, per-stage colors with colors or colorFor", () => {
    const { container, rerender } = render(<FunnelChart data={stages} color="success" />);
    expect(paths(container)[0]!.getAttribute("fill")).toBe("var(--success)");
    expect(Number(paths(container)[3]!.getAttribute("fill-opacity"))).toBeLessThan(1);
    rerender(<FunnelChart data={stages} colors={["info", "warning"]} />);
    expect(paths(container)[1]!.getAttribute("fill")).toBe("var(--warning)");
    expect(paths(container)[1]!.getAttribute("fill-opacity")).toBe("1");
    rerender(<FunnelChart data={stages} colorFor={(d) => (d.value === 600 ? "destructive" : undefined)} />);
    expect(paths(container)[3]!.getAttribute("fill")).toBe("var(--destructive)");
  });

  it("draws separate bars when connected is false", () => {
    const { container } = render(<FunnelChart data={stages} connected={false} />);
    expect(paths(container)[0]!.getAttribute("stroke-width")).toBe("0");
  });

  it("shows an empty state, and never while loading", () => {
    const { container, rerender } = render(<FunnelChart data={[]} />);
    expect(container.querySelector('[data-slot="chart-empty"]')?.textContent).toBe("No data");
    rerender(<FunnelChart data={[]} emptyState="No visits yet" />);
    expect(screen.getByText("No visits yet")).toBeTruthy();
    rerender(<FunnelChart data={[]} loading emptyState="No visits yet" />);
    expect(container.querySelector('[data-slot="chart-empty"]')).toBeNull();
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeTruthy();
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading funnel chart…")).toBeTruthy();
  });

  it("keeps showing data while refreshing", () => {
    const { container } = render(<FunnelChart data={stages} loading />);
    expect(paths(container)).toHaveLength(4);
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeNull();
    expect(container.firstElementChild!.getAttribute("aria-busy")).toBe("true");
  });

  it("takes className, ref and a label", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<FunnelChart ref={ref} data={stages} className="mine" label="Signup funnel" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current!.className).toContain("mine");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Signup funnel");
  });

  it("has no axe violations (data, empty, loading)", async () => {
    const a = render(<FunnelChart data={stages} />);
    expect(await axeViolations(a.container)).toEqual([]);
    const b = render(<FunnelChart data={[]} />);
    expect(await axeViolations(b.container)).toEqual([]);
    const c = render(<FunnelChart data={[]} loading />);
    expect(await axeViolations(c.container)).toEqual([]);
  });
});
