import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiChromeLine } from "@remixicon/react";
import { BarList, type BarListItem } from "../src/patterns/bar-list";
import { MetricHero } from "../src/patterns/metric-hero";
import { StatCard, TopItemCard } from "../src/patterns/stat-card";
import { StorageMap, Treemap, type StorageMapItem, type TreemapNode } from "../src/patterns/treemap";
import { AreaChart, BarChart, DonutChart, LineChart } from "../src/patterns/chart";
import { Gauge, RingMeter } from "../src/patterns/gauge";
import { axeViolations } from "./helpers/a11y";

const busy = (c: HTMLElement) => c.querySelector('[aria-busy="true"]');
const skeletons = (c: HTMLElement) => c.querySelectorAll(".bg-muted[aria-hidden], [aria-hidden] .bg-muted");

/** Rendering with `loading={false}` must match rendering without the prop (same root, so ids match). */
function expectUnchangedWithoutLoading(element: React.ReactElement) {
  const { container, rerender, unmount } = render(element);
  const before = container.innerHTML;
  expect(busy(container)).toBeNull();
  rerender(React.cloneElement(element as React.ReactElement<{ loading?: boolean }>, { loading: false }));
  expect(container.innerHTML).toBe(before);
  unmount();
}

/* ------------------------------------------------------------------------------------------------ */

const apps: BarListItem[] = [
  { id: 1, name: "Chrome", description: "12 processes", value: 40, icon: <RiChromeLine /> },
  { id: 2, name: "Code", value: 20 },
];

describe("BarList loading", () => {
  it("shows placeholder rows with real header labels, no empty state, no toggle", async () => {
    const { container } = render(
      <BarList items={[]} loading loadingRows={3} label="Top apps" header={{ label: "App", value: "CPU" }} limit={1} emptyState="Nothing running" />
    );
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading Top apps…")).toHaveClass("sr-only");
    expect(screen.getByText("App")).toBeInTheDocument();
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.queryByText("Nothing running")).toBeNull();
    expect(container.querySelector('[data-slot="bar-list-skeleton"]')!.children).toHaveLength(3);
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps the rows while refreshing", () => {
    const { container } = render(<BarList items={apps} loading label="Top apps" />);
    expect(busy(container)).not.toBeNull();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="bar-list-skeleton"]')).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchangedWithoutLoading(<BarList items={apps} label="Top apps" header={{ label: "App" }} />);
    expectUnchangedWithoutLoading(<BarList items={[]} emptyState="None" />);
  });
});

/* ------------------------------------------------------------------------------------------------ */

describe("MetricHero loading", () => {
  it("keeps the caption and detail labels and draws placeholders for the value, details and chart", async () => {
    const { container } = render(
      <MetricHero caption="CPU" value={null} loading details={[{ label: "Average today", value: undefined }]} chartHeight={180} />
    );
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading CPU…")).toHaveClass("sr-only");
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("Average today")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="metric-hero-value-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="stat-value"]')).toBeNull();
    const chart = container.querySelector<HTMLElement>('[data-slot="metric-hero-chart-skeleton"]')!;
    expect(chart.style.height).toBe("180px");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps the value and chart while refreshing", () => {
    const { container } = render(<MetricHero caption="CPU" value="37" unit="%" series={[1, 2, 3]} loading />);
    expect(busy(container)).not.toBeNull();
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "CPU history" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="metric-hero-value-skeleton"]')).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchangedWithoutLoading(<MetricHero caption="CPU" value="37" series={[1, 2]} details={[{ label: "Avg", value: "3" }]} />);
  });
});

/* ------------------------------------------------------------------------------------------------ */

describe("StatCard / TopItemCard loading", () => {
  it("StatCard keeps label, caption and stat labels; placeholders for value, stats, body and footer trend", async () => {
    const { container } = render(
      <StatCard
        label="CPU"
        caption="Now"
        value="37"
        loading
        stats={[{ label: "User", value: "18%" }, { label: "System", value: "8%" }]}
        progress={37}
        trend={[1, 2]}
        trendPlacement="footer"
      />
    );
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading CPU…")).toHaveClass("sr-only");
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.queryByText("18%")).toBeNull();
    expect(screen.queryByText("37")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector('[data-slot="stat-trend-skeleton"]')).not.toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("StatCard with a children body shows a body placeholder instead of the children", () => {
    const { container } = render(
      <StatCard label="Memory" loading>
        <div>Breakdown</div>
      </StatCard>
    );
    expect(screen.queryByText("Breakdown")).toBeNull();
    expect(container.querySelector('[data-slot="stat-content-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="stat-skeleton"]')).toBeNull();
  });

  it("TopItemCard forwards loading and draws an item-row placeholder", async () => {
    const { container } = render(
      <TopItemCard item="Google Chrome" itemIcon={<RiChromeLine />} value="37.0%" href="/apps" loading />
    );
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading Top App…")).toHaveClass("sr-only");
    expect(screen.queryByText("Google Chrome")).toBeNull();
    expect(screen.queryByText("37.0%")).toBeNull();
    expect(container.querySelector('[data-slot="top-item-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="stat-skeleton"]')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("is unchanged without loading", () => {
    expectUnchangedWithoutLoading(<StatCard label="CPU" value="37" stats={[{ label: "User", value: "1" }]} trend={[1, 2]} />);
    expectUnchangedWithoutLoading(<TopItemCard item="Chrome" value="3%" href="/x" />);
  });
});

/* ------------------------------------------------------------------------------------------------ */

const tree: TreemapNode = {
  id: "root",
  name: "Disk",
  children: [
    { id: "a", name: "Apps", value: 30 },
    { id: "b", name: "Docs", value: 10 },
  ],
};
const disk: StorageMapItem[] = [{ id: "apps", name: "Applications", size: 4e9, category: "macos" }];

describe("Treemap / StorageMap loading", () => {
  it("Treemap shows placeholder tiles and legend rows, no empty state", async () => {
    const { container } = render(
      <Treemap data={{ id: "root", name: "Disk" }} label="Disk usage" loading legend height={200} emptyState="Nothing here" />
    );
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading Disk usage…")).toHaveClass("sr-only");
    expect(screen.queryByText("Nothing here")).toBeNull();
    const map = container.querySelector<HTMLElement>('[data-slot="treemap-skeleton"]')!;
    expect(map.style.height).toBe("200px");
    expect(map.children.length).toBeGreaterThan(2);
    expect(container.querySelector('[data-slot="treemap-legend-skeleton"]')).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("Treemap keeps tiles while refreshing", () => {
    const { container } = render(<Treemap data={tree} loading />);
    expect(busy(container)).not.toBeNull();
    expect(screen.getAllByRole("button").length).toBe(2);
    expect(container.querySelector('[data-slot="treemap-skeleton"]')).toBeNull();
  });

  it("StorageMap shows used/free placeholders and the map placeholder", async () => {
    const { container } = render(<StorageMap items={[]} capacity={1e12} loading />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading Storage…")).toHaveClass("sr-only");
    expect(screen.getByText(/In use of/)).toBeInTheDocument();
    expect(container.querySelector('[data-slot="storage-map-used-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="storage-map-used"]')).toBeNull();
    expect(container.querySelector('[data-slot="storage-map-free"]')).toBeNull();
    expect(container.querySelector('[data-slot="treemap-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="treemap-legend-skeleton"]')).not.toBeNull();
    expect(screen.queryByText("No data")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("StorageMap keeps data while refreshing", () => {
    const { container } = render(<StorageMap items={disk} capacity={1e12} loading />);
    expect(busy(container)).not.toBeNull();
    expect(container.querySelector('[data-slot="storage-map-used"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="treemap-skeleton"]')).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchangedWithoutLoading(<Treemap data={tree} legend />);
    expectUnchangedWithoutLoading(<StorageMap items={disk} capacity={1e12} />);
    expectUnchangedWithoutLoading(<StorageMap items={[]} />);
  });
});

/* ------------------------------------------------------------------------------------------------ */

const series = [
  { key: "user", label: "User" },
  { key: "system", label: "System" },
];
const rows = [
  { t: "a", user: 1, system: 2 },
  { t: "b", user: 3, system: 1 },
];

describe.each([
  ["AreaChart", AreaChart, "area chart"],
  ["LineChart", LineChart, "line chart"],
  ["BarChart", BarChart, "bar chart"],
] as const)("%s loading", (_name, Chart, kind) => {
  it("shows a plot placeholder of the same height and legend placeholders", async () => {
    const { container } = render(<Chart data={[]} index="t" series={series} height={180} loading emptyState="Nothing yet" />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(`Loading ${kind}…`)).toHaveClass("sr-only");
    expect(screen.queryByText("Nothing yet")).toBeNull();
    expect(container.querySelector<HTMLElement>('[data-slot="chart-skeleton"]')!.style.height).toBe("180px");
    expect(container.querySelector('[data-slot="chart-legend-skeleton"]')!.children).toHaveLength(2);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("uses the label in the loading text and skips the legend for one series", () => {
    const { container } = render(<Chart data={[]} index="t" series={[series[0]!]} label="CPU history" loading />);
    expect(screen.getByText("Loading CPU history…")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart-legend-skeleton"]')).toBeNull();
  });

  it("keeps the chart while refreshing", () => {
    const { container } = render(<Chart data={rows} index="t" series={series} loading />);
    expect(busy(container)).not.toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchangedWithoutLoading(<Chart data={rows} index="t" series={series} />);
    expectUnchangedWithoutLoading(<Chart data={[]} index="t" series={series} />);
  });
});

describe("DonutChart loading", () => {
  const slices = [
    { name: "Apps", value: 3 },
    { name: "System", value: 1 },
  ];

  it("shows a placeholder ring of the same size and legend placeholders", async () => {
    const { container } = render(<DonutChart data={[]} index="name" size={160} centerLabel="Used" loading emptyState="Nothing yet" />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading donut chart…")).toHaveClass("sr-only");
    expect(screen.queryByText("Nothing yet")).toBeNull();
    const ring = container.querySelector<HTMLElement>('[data-slot="chart-skeleton"]')!;
    expect(ring.style.width).toBe("160px");
    expect(ring.style.height).toBe("160px");
    expect(screen.getByText("Used")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart-legend-skeleton"]')).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("uses list-style legend placeholders with legendValues and none without a legend", () => {
    const { container, rerender } = render(<DonutChart data={[]} index="name" legendValues loading />);
    expect(container.querySelector('[data-slot="chart-legend-skeleton"]')).toHaveClass("flex-col");
    rerender(<DonutChart data={[]} index="name" legend={false} loading />);
    expect(container.querySelector('[data-slot="chart-legend-skeleton"]')).toBeNull();
  });

  it("keeps the ring while refreshing", () => {
    const { container } = render(<DonutChart data={slices} index="name" loading />);
    expect(busy(container)).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="chart-segment"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="chart-skeleton"]')).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchangedWithoutLoading(<DonutChart data={slices} index="name" legendValues />);
    expectUnchangedWithoutLoading(<DonutChart data={[]} index="name" />);
  });
});

/* ------------------------------------------------------------------------------------------------ */

describe("Gauge / RingMeter loading", () => {
  it("Gauge shows an empty track and a value placeholder", async () => {
    const { container } = render(<Gauge value={null} label="CPU" unit="%" loading />);
    const meter = screen.getByRole("meter", { name: "CPU" });
    expect(meter).toHaveAttribute("aria-busy", "true");
    expect(meter).toHaveAttribute("aria-valuetext", "Loading");
    expect(screen.getByText("Loading CPU…")).toHaveClass("sr-only");
    expect(screen.queryByText("—")).toBeNull();
    expect(container.querySelector('[data-slot="gauge-fill"]')).toBeNull();
    expect(skeletons(container).length).toBeGreaterThan(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("Gauge keeps the value while refreshing", () => {
    render(<Gauge value={42} label="CPU" loading />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-busy", "true");
    expect(meter).toHaveAttribute("aria-valuetext", "42");
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("RingMeter shows an empty track and a value placeholder", async () => {
    const { container } = render(<RingMeter value={null} label="Context window" loading />);
    const meter = screen.getByRole("meter", { name: "Context window" });
    expect(meter).toHaveAttribute("aria-busy", "true");
    expect(meter).toHaveAttribute("aria-valuetext", "Loading");
    expect(screen.getByText("Loading Context window…")).toHaveClass("sr-only");
    expect(container.querySelector('[data-slot="ring-value"] .bg-muted')).not.toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("RingMeter keeps the value while refreshing; null without loading reads as no data", () => {
    const { rerender } = render(<RingMeter value={80} loading />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("80%")).toBeInTheDocument();
    rerender(<RingMeter value={null} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "No data");
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchangedWithoutLoading(<Gauge value={42} label="CPU" />);
    expectUnchangedWithoutLoading(<Gauge value={null} />);
    expectUnchangedWithoutLoading(<RingMeter value={60} />);
  });
});
