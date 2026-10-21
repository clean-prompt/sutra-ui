import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AreaChart,
  BarChart,
  ChartLegend,
  DonutChart,
  LineChart,
  monotonePath,
  niceTicks,
  stackSeries,
} from "../src/patterns/chart";
import { StatCard, StatGroup, statDeltaDirection } from "../src/patterns/stat-card";
import { Meter, MeterGroup, StackedMeter, meterLevel } from "../src/primitives/meter";
import { Gauge, RingMeter } from "../src/patterns/gauge";
import { axeViolations } from "./helpers/a11y";

const days = [
  { day: "Mon", prompt: 120, completion: 40, errors: 2 },
  { day: "Tue", prompt: 180, completion: 60, errors: 5 },
  { day: "Wed", prompt: 90, completion: 30, errors: 1 },
  { day: "Thu", prompt: 220, completion: 80, errors: 9 },
  { day: "Fri", prompt: 160, completion: 50, errors: 3 },
];
const series = [
  { key: "prompt", label: "Prompt" },
  { key: "completion", label: "Completion" },
];

const slots = (c: HTMLElement, slot: string) => c.querySelectorAll(`[data-slot="${slot}"]`);

describe("chart helpers", () => {
  it("niceTicks produces round steps covering the range", () => {
    expect(niceTicks(0, 95, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(-3, 7, 5)).toEqual([-4, -2, 0, 2, 4, 6, 8]);
    const t = niceTicks(13, 13, 5);
    expect(t[0]).toBeLessThanOrEqual(13);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(13);
    expect(niceTicks(NaN, 3)).toEqual([]);
  });

  it("stackSeries accumulates values per datum and stacks negatives downward", () => {
    const st = stackSeries(
      [
        { a: 1, b: 2 },
        { a: 3, b: null },
        { a: -1, b: -2 },
      ],
      ["a", "b"]
    );
    expect(st[0]).toEqual({ key: "a", values: [[0, 1], [0, 3], [0, -1]] });
    expect(st[1]).toEqual({ key: "b", values: [[1, 3], [3, 3], [-1, -3]] });
  });

  it("monotonePath draws cubic segments through every point", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([[0, 0]])).toBe("M0,0");
    const d = monotonePath([
      [0, 10],
      [10, 0],
      [20, 5],
    ]);
    expect(d.startsWith("M0,10")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    expect(d.endsWith("20,5")).toBe(true);
  });
});

describe("AreaChart", () => {
  it("renders one area + one line per series and a hidden data table", () => {
    const { container } = render(<AreaChart data={days} index="day" series={series} />);
    expect(slots(container, "chart-area")).toHaveLength(2);
    expect(slots(container, "chart-line")).toHaveLength(2);
    expect(screen.getByRole("img", { name: /Area chart of Prompt, Completion by day/ })).toBeInTheDocument();
    const table = container.querySelector(".sr-only table")!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(table.textContent).toContain("Completion");
  });

  it("stacked areas sit on top of each other", () => {
    const { container } = render(<AreaChart data={days} index="day" series={series} stacked curve="linear" />);
    const [prompt, completion] = Array.from(slots(container, "chart-line")).map((p) => p.getAttribute("d")!);
    const firstY = (d: string) => Number(d.split(",")[1]!.split("L")[0]);
    // higher stack = smaller y
    expect(firstY(completion!)).toBeLessThan(firstY(prompt!));
  });

  it("shows the empty state without data", () => {
    render(<AreaChart data={[]} index="day" series={series} emptyState="Nothing yet" />);
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  it("shows a tooltip with every series on hover and hides it on leave", () => {
    const { container } = render(<AreaChart data={days} index="day" series={series} />);
    const hit = container.querySelector('[data-slot="chart-hit"]')!;
    fireEvent.mouseMove(hit, { clientX: 590, clientY: 50 });
    const tip = container.querySelector('[data-slot="chart-tooltip"]')!;
    expect(tip).toBeInTheDocument();
    expect(tip.textContent).toContain("Fri");
    expect(tip.textContent).toContain("160");
    expect(tip.textContent).toContain("50");
    expect(slots(container, "chart-crosshair")).toHaveLength(1);
    fireEvent.mouseLeave(hit);
    expect(container.querySelector('[data-slot="chart-tooltip"]')).toBeNull();
  });

  it("moves the active point with arrow keys when focused", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn();
    const { container } = render(<AreaChart data={days} index="day" series={series} onActiveIndexChange={onActive} />);
    const chart = screen.getByRole("img", { name: /Area chart/ });
    chart.focus();
    await user.keyboard("{ArrowRight}");
    expect(container.querySelector('[data-slot="chart-tooltip"]')!.textContent).toContain("Mon");
    await user.keyboard("{ArrowRight}");
    expect(container.querySelector('[data-slot="chart-tooltip"]')!.textContent).toContain("Tue");
    expect(onActive).toHaveBeenLastCalledWith(1);
    await user.keyboard("{End}");
    expect(container.querySelector('[data-slot="chart-tooltip"]')!.textContent).toContain("Fri");
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toContain("Prompt 160");
    await user.keyboard("{Escape}");
    expect(container.querySelector('[data-slot="chart-tooltip"]')).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<AreaChart data={days} index="day" series={series} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ChartLegend / series toggling", () => {
  it("click toggles a series, Alt-click isolates, Alt-click again restores", async () => {
    const user = userEvent.setup();
    const three = [...series, { key: "errors", label: "Errors" }];
    const { container } = render(<LineChart data={days} index="day" series={three} />);
    const lines = () => slots(container, "chart-line").length;
    expect(lines()).toBe(3);

    const prompt = screen.getByRole("button", { name: "Prompt" });
    expect(prompt).toHaveAttribute("aria-pressed", "true");
    await user.click(prompt);
    expect(prompt).toHaveAttribute("aria-pressed", "false");
    expect(lines()).toBe(2);
    await user.click(prompt);
    expect(lines()).toBe(3);

    fireEvent.click(screen.getByRole("button", { name: "Errors" }), { altKey: true });
    expect(lines()).toBe(1);
    expect(screen.getByRole("button", { name: "Errors" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Prompt" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Errors" }), { altKey: true });
    expect(lines()).toBe(3);
  });

  it("double-click isolates a series; Alt+Enter isolates from the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<AreaChart data={days} index="day" series={series} />);
    await user.dblClick(screen.getByRole("button", { name: "Completion" }));
    expect(slots(container, "chart-area")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Completion" })).toHaveAttribute("aria-pressed", "true");

    screen.getByRole("button", { name: "Prompt" }).focus();
    await user.keyboard("{Alt>}{Enter}{/Alt}");
    expect(screen.getByRole("button", { name: "Prompt" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Completion" })).toHaveAttribute("aria-pressed", "false");
  });

  it("supports controlled hidden series", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <LineChart data={days} index="day" series={series} hiddenSeries={["prompt"]} onHiddenSeriesChange={onChange} />
    );
    expect(slots(container, "chart-line")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Prompt" }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(slots(container, "chart-line")).toHaveLength(1);
  });

  it("static legend renders a list without buttons", async () => {
    const { container } = render(<ChartLegend items={[{ key: "a", label: "A", color: "red" }]} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("listitem")).toHaveTextContent("A");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("single-series charts have no legend by default", () => {
    render(<AreaChart data={days} index="day" series={[{ key: "prompt" }]} />);
    expect(screen.queryByRole("group", { name: "Toggle series" })).toBeNull();
  });
});

describe("LineChart", () => {
  it("draws dots and reference lines", async () => {
    const { container } = render(
      <LineChart
        data={days}
        index="day"
        series={series}
        dots
        referenceLines={[{ value: 200, label: "Limit" }]}
      />
    );
    expect(slots(container, "chart-dot")).toHaveLength(10);
    expect(slots(container, "chart-reference-line")).toHaveLength(1);
    expect(container.textContent).toContain("Limit");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("breaks the line at null values", () => {
    const { container } = render(
      <LineChart data={[{ x: 1, v: 1 }, { x: 2, v: null }, { x: 3, v: 3 }, { x: 4, v: 2 }]} index="x" series={[{ key: "v" }]} curve="linear" />
    );
    const d = slots(container, "chart-line")[0]!.getAttribute("d")!;
    expect(d.match(/M/g)).toHaveLength(2);
  });
});

describe("BarChart", () => {
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, requests: h * 3 + 1 }));

  it("renders one bar per datum and applies colorFor", () => {
    const { container } = render(
      <BarChart
        data={hours}
        index="hour"
        series={[{ key: "requests" }]}
        colorFor={(d) => ((d.hour as number) >= 20 ? "#ff0000" : undefined)}
      />
    );
    const bars = slots(container, "chart-bar");
    expect(bars).toHaveLength(24);
    expect(Array.from(bars).filter((b) => b.getAttribute("fill") === "#ff0000")).toHaveLength(4);
  });

  it("grouped and stacked bars render series × data bars", () => {
    const grouped = render(<BarChart data={days} index="day" series={series} />);
    expect(slots(grouped.container, "chart-bar")).toHaveLength(10);
    grouped.unmount();
    const stacked = render(<BarChart data={days} index="day" series={series} stacked />);
    expect(slots(stacked.container, "chart-bar")).toHaveLength(10);
  });

  it("horizontal layout renders and reports its type", async () => {
    const { container } = render(
      <BarChart data={days} index="day" series={[{ key: "prompt", label: "Prompt" }]} layout="horizontal" />
    );
    expect(slots(container, "chart-bar")).toHaveLength(5);
    expect(screen.getByRole("img", { name: /Horizontal bar chart/ })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("hover highlights a band and shows the tooltip", () => {
    const { container } = render(<BarChart data={days} index="day" series={series} />);
    fireEvent.mouseMove(container.querySelector('[data-slot="chart-hit"]')!, { clientX: 50, clientY: 50 });
    const tip = container.querySelector('[data-slot="chart-tooltip"]')!;
    expect(tip.textContent).toContain("Mon");
    expect(tip.textContent).toContain("120");
  });
});

describe("DonutChart", () => {
  const storage = [
    { user: "alice", value: 40 },
    { user: "bob", value: 35 },
    { user: "carol", value: 25 },
  ];

  it("renders a segment per datum with total in the center", async () => {
    const { container } = render(<DonutChart data={storage} index="user" centerLabel="GB used" />);
    expect(slots(container, "chart-segment")).toHaveLength(3);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("GB used")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("legend hides a segment, keyboard shows a tooltip", async () => {
    const user = userEvent.setup();
    const { container } = render(<DonutChart data={storage} index="user" />);
    await user.click(screen.getByRole("button", { name: "bob" }));
    expect(slots(container, "chart-segment")).toHaveLength(2);
    screen.getByRole("img", { name: /Donut chart/ }).focus();
    await user.keyboard("{ArrowRight}");
    const tip = container.querySelector('[data-slot="chart-tooltip"]')!;
    expect(tip.textContent).toContain("alice");
    expect(tip.textContent).toContain("62%");
  });
});

describe("Meter", () => {
  it("exposes meter semantics and formatted value text", async () => {
    const { container } = render(<Meter label="VRAM" value={62.1} max={80} unit="GB" caption="resets in 2h" />);
    const m = screen.getByRole("meter", { name: "VRAM" });
    expect(m).toHaveAttribute("aria-valuenow", "62.1");
    expect(m).toHaveAttribute("aria-valuemax", "80");
    expect(m).toHaveAttribute("aria-valuetext", "62.1 / 80 GB");
    expect(screen.getByText("resets in 2h")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("colors by threshold", () => {
    expect(meterLevel(50)).toBe("ok");
    expect(meterLevel(75)).toBe("warn");
    expect(meterLevel(95)).toBe("danger");
    expect(meterLevel(60, { warn: 50, danger: 70 })).toBe("warn");
    const { container, rerender } = render(<Meter label="CPU" value={40} />);
    const fill = () => container.querySelector('[data-slot="meter-fill"]')!;
    const val = () => container.querySelector('[data-slot="meter-value"]')!;
    expect(fill()).toHaveClass("bg-primary");
    rerender(<Meter label="CPU" value={80} />);
    expect(fill()).toHaveClass("bg-warning");
    expect(val()).toHaveClass("text-warning");
    rerender(<Meter label="CPU" value={93} />);
    expect(fill()).toHaveClass("bg-destructive");
    expect(val()).toHaveTextContent("93%");
    rerender(<Meter label="CPU" value={93} thresholds={false} color="info" />);
    expect(fill()).toHaveClass("bg-info");
  });

  it("segments mode fills the right number of blocks; null shows no data", () => {
    const { container, rerender } = render(<Meter label="Disk" value={50} segments={10} />);
    expect(container.querySelectorAll('[data-slot="meter-segment"][data-state="on"]')).toHaveLength(5);
    rerender(<Meter label="Disk" value={null} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "No data");
  });

  it("MeterGroup and StackedMeter are accessible", async () => {
    const { container } = render(
      <>
        <MeterGroup aria-label="Node">
          <Meter label="CPU" value={20} />
          <Meter label="RAM" value={80} />
        </MeterGroup>
        <StackedMeter
          label="Storage"
          max={100}
          valueFormatter={(v) => `${v} GB`}
          parts={[
            { label: "Models", value: 50 },
            { label: "Datasets", value: 20 },
          ]}
        />
      </>
    );
    expect(screen.getAllByRole("meter")).toHaveLength(2);
    expect(container.querySelectorAll('[data-slot="stacked-meter-part"]')).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Models 50 GB, Datasets 20 GB of 100 GB" })).toBeInTheDocument();
    expect(screen.getByText("70 GB / 100 GB")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Gauge & RingMeter", () => {
  it("Gauge has meter semantics and threshold levels", async () => {
    const { container, rerender } = render(<Gauge label="GPU 0" value={62} unit="°C" />);
    const g = screen.getByRole("meter", { name: "GPU 0" });
    expect(g).toHaveAttribute("aria-valuenow", "62");
    expect(g).toHaveAttribute("aria-valuetext", "62 °C");
    expect(g).toHaveAttribute("data-level", "ok");
    expect(await axeViolations(container)).toEqual([]);
    rerender(<Gauge label="GPU 0" value={85} unit="°C" />);
    expect(screen.getByRole("meter")).toHaveAttribute("data-level", "warn");
    rerender(<Gauge label="GPU 0" value={92} unit="°C" />);
    expect(screen.getByRole("meter")).toHaveAttribute("data-level", "danger");
    expect(container.querySelector('[data-slot="gauge-fill"]')).toHaveAttribute("stroke", "var(--destructive)");
  });

  it("Gauge colorStops override thresholds", () => {
    const { container } = render(
      <Gauge label="Temp" value={65} colorStops={[{ value: 0, color: "success" }, { value: 60, color: "#ea580c" }, { value: 85, color: "destructive" }]} />
    );
    expect(container.querySelector('[data-slot="gauge-fill"]')).toHaveAttribute("stroke", "#ea580c");
  });

  it("RingMeter shows the percent only above showValueAbove", async () => {
    const { container, rerender } = render(<RingMeter value={30} label="Context window" />);
    expect(screen.getByRole("meter", { name: "Context window" })).toHaveAttribute("aria-valuenow", "30");
    expect(container.querySelector('[data-slot="ring-value"]')).toBeNull();
    rerender(<RingMeter value={92} label="Context window" />);
    expect(container.querySelector('[data-slot="ring-value"]')).toHaveTextContent("92%");
    expect(screen.getByRole("meter")).toHaveAttribute("data-level", "danger");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("StatCard", () => {
  it("derives delta direction and color from intent", () => {
    expect(statDeltaDirection(-3)).toBe("down");
    expect(statDeltaDirection("+12%")).toBe("up");
    expect(statDeltaDirection("−0.6 pts")).toBe("down");
    expect(statDeltaDirection("0%")).toBe("flat");

    const { container, rerender } = render(<StatCard label="Requests" value="12,480" delta={12.4} />);
    const delta = () => container.querySelector('[data-slot="stat-delta"]')!;
    expect(delta()).toHaveTextContent("+12.4%");
    expect(delta()).toHaveAttribute("data-quality", "good");
    expect(delta()).toHaveClass("text-success");
    rerender(<StatCard label="p95 latency" value="310" unit="ms" delta={24} deltaIntent="negative-is-good" />);
    expect(delta()).toHaveAttribute("data-quality", "bad");
    expect(delta()).toHaveClass("text-destructive");
    rerender(<StatCard label="Errors" value="3" delta="-2" deltaSuffix="" deltaIntent="negative-is-good" />);
    expect(delta()).toHaveAttribute("data-direction", "down");
    expect(delta()).toHaveAttribute("data-quality", "good");
  });

  it("loading shows a skeleton; trend renders a sparkline; group is accessible", async () => {
    const { container } = render(
      <StatGroup variant="divided">
        <StatCard label="Tokens" value="1.2M" loading />
        <StatCard label="Cost" value="$42" trend={[1, 3, 2, 5]} hint="This month" />
      </StatGroup>
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText("1.2M")).toBeNull();
    expect(screen.getByRole("img", { name: "Cost trend" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
