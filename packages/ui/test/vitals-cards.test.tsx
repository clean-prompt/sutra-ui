import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RiCpuLine } from "@remixicon/react";
import { StatCard, StatValue, TopItemCard } from "../src/patterns/stat-card";
import { BarList, type BarListItem } from "../src/patterns/bar-list";
import { MetricHero } from "../src/patterns/metric-hero";
import { StatusBadge } from "../src/primitives/status-badge";
import { axeViolations } from "./a11y";

describe("StatCard (vitals props)", () => {
  it("links the whole card through the label, with a decorative chevron and accent", async () => {
    const { container } = render(
      <StatCard
        label="CPU"
        icon={<RiCpuLine />}
        accent="blue"
        href="/cpu"
        caption="Now"
        value="25"
        unit="%"
        status={<StatusBadge tone="success" label="Normal" />}
        stats={[
          { label: "User", value: "18%" },
          { label: "System", value: "8%" },
          { label: "Average Today", value: "39%", color: "purple" },
        ]}
        trend={[10, 20, 30, 25]}
        trendType="bar"
        trendPlacement="footer"
        trendMin={0}
        trendMax={100}
      />
    );
    const root = container.querySelector('[data-slot="stat-card"]') as HTMLElement;
    expect(root.style.getPropertyValue("--sutra-accent")).toBe("#2b7fff");
    expect(root).toHaveAttribute("data-interactive", "true");

    const link = screen.getByRole("link", { name: "CPU" });
    expect(link).toHaveAttribute("href", "/cpu");
    expect(link.className).toMatch(/after:absolute/);
    expect(link).toHaveAccessibleDescription(/Now\s*25\s*%/);
    expect(within(link).getByText("CPU").className).toMatch(/sutra-accent/);
    const chevron = container.querySelector('[data-slot="stat-chevron"]')!;
    expect(chevron).toHaveAttribute("aria-hidden", "true");
    expect(link).toContainElement(chevron as HTMLElement);
    // Only one interactive element in the card.
    expect(container.querySelectorAll("a, button")).toHaveLength(1);

    // Icon chip uses the accent soft style and sits before the label.
    const chip = container.querySelector('[data-slot="stat-card"] > div > span[aria-hidden]')!;
    expect(chip.className).toMatch(/color-mix/);

    expect(screen.getByText("Now")).toHaveAttribute("data-slot", "stat-caption");
    expect(screen.getByText("Normal").closest('[data-slot="stat-status"]')).not.toBeNull();

    const stats = container.querySelector('[data-slot="stat-stats"]')!;
    expect(stats.tagName).toBe("DL");
    expect(within(stats as HTMLElement).getAllByRole("term").map((t) => t.textContent)).toEqual(["User", "System", "Average Today"]);
    expect(within(stats as HTMLElement).getByText("39%")).toBeInTheDocument();
    expect(stats.querySelector("span[aria-hidden]")).toHaveStyle({ backgroundColor: "#ad46ff" });

    const strip = container.querySelector('[data-slot="stat-trend"]')!;
    expect(strip.className).toMatch(/_8%/);
    expect(within(strip as HTMLElement).getByRole("img", { name: "CPU trend" })).toBeInTheDocument();

    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders a button for onClick and keeps tone when no accent is set", async () => {
    const onClick = vi.fn();
    const { container } = render(<StatCard label="Memory" value="49.96" unit="GB" onClick={onClick} progress={40} />);
    const button = screen.getByRole("button", { name: "Memory" });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("progressbar", { name: "Memory" })).toBeInTheDocument();
    const root = container.querySelector('[data-slot="stat-card"]') as HTMLElement;
    expect(root.style.getPropertyValue("--sutra-accent")).toBe("");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps the old layout without the new props", () => {
    const { container } = render(<StatCard label="Errors" value={3} tone="danger" icon={<span data-testid="i" />} />);
    expect(container.querySelector("a, button")).toBeNull();
    expect(container.querySelector('[data-slot="stat-chevron"]')).toBeNull();
    // Icon stays at the end (top-right) and uses the tone.
    const header = container.querySelector('[data-slot="stat-card"] > div')!;
    expect(header.lastElementChild).toContainElement(screen.getByTestId("i"));
    expect(screen.getByTestId("i").parentElement?.className).toMatch(/destructive/);
    expect(screen.getByText("Errors").className).toMatch(/text-muted-foreground/);
  });

  it("StatValue renders value and unit", () => {
    render(<StatValue value="34" unit="%" size="xl" />);
    expect(screen.getByText("34").closest('[data-slot="stat-value"]')).toHaveClass("text-display-md");
    expect(screen.getByText("%")).toBeInTheDocument();
  });
});

describe("TopItemCard", () => {
  it("shows the item and its value, linked through the label", async () => {
    const { container } = render(
      <TopItemCard accent="blue" icon={<RiCpuLine />} item="Google Chrome" itemIcon={<RiCpuLine />} value="37.0%" href="/apps/chrome" />
    );
    const link = screen.getByRole("link", { name: "Top App" });
    expect(link).toHaveAttribute("href", "/apps/chrome");
    expect(link).toHaveAccessibleDescription(/Google Chrome/);
    expect(screen.getByText("37.0%")).toBeInTheDocument();
    expect(screen.getByText("Top App").className).toMatch(/text-muted-foreground/);
    expect(container.querySelectorAll('[data-slot="stat-chevron"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="stat-chevron"]')).toHaveAttribute("aria-hidden", "true");
    expect(await axeViolations(container)).toEqual([]);
  });
});

const apps: BarListItem[] = [
  { id: "t", name: "Terminal", description: "49 processes", value: 14.6, valueLabel: "14.6%" },
  { id: "c", name: "Google Chrome", description: "96 processes", value: 37, valueLabel: "37.0%" },
  { id: "s", name: "Safari", description: "16 processes", value: 5.9, valueLabel: "5.9%" },
  { id: "x", name: "Xcode", value: 1 },
];

const rowNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-slot="bar-list-item"]')).map((li) => li.querySelector(".truncate")?.textContent);

describe("BarList", () => {
  it("ranks rows, scales bars to the largest value and highlights the first row", async () => {
    const { container } = render(
      <BarList items={apps} accent="blue" header={{ label: "App", value: "CPU" }} highlightFirst label="Apps by CPU" />
    );
    expect(screen.getByRole("list", { name: "Apps by CPU" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(rowNames(container)).toEqual(["Google Chrome", "Terminal", "Safari", "Xcode"]);
    const bars = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="bar-list-bar"]')).map((b) => b.style.width);
    expect(bars[0]).toBe("100%");
    expect(parseFloat(bars[1]!)).toBeCloseTo((14.6 / 37) * 100, 3);
    expect(container.querySelector('[data-slot="bar-list-track"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("37.0%")).toBeVisible();
    expect(screen.getByText("1")).toBeInTheDocument();
    const items = container.querySelectorAll('[data-slot="bar-list-item"]');
    expect(items[0]).toHaveAttribute("data-highlighted", "true");
    expect(items[1]).not.toHaveAttribute("data-highlighted");
    expect(screen.getByText("App")).toBeInTheDocument();
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--sutra-accent")).toBe("#2b7fff");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("honours max, sort=none and valueFormatter", () => {
    const { container } = render(
      <BarList items={[{ id: 1, name: "A", value: 25 }, { id: 2, name: "B", value: 50 }]} max={100} sort="none" valueFormatter={(v) => `${v} MB`} />
    );
    expect(rowNames(container)).toEqual(["A", "B"]);
    const bars = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="bar-list-bar"]')).map((b) => b.style.width);
    expect(bars).toEqual(["25%", "50%"]);
    expect(screen.getByText("50 MB")).toBeInTheDocument();
  });

  it("limits rows with a show-all toggle", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const { container } = render(<BarList items={apps} limit={2} onExpandedChange={onExpandedChange} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    const toggle = screen.getByRole("button", { name: "Show all (4)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", screen.getByRole("list").id);
    await user.click(toggle);
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders links and buttons for interactive rows, reachable by keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <BarList
        items={[
          { id: "a", name: "Chrome", value: 3, href: "/chrome" },
          { id: "b", name: "Safari", value: 2, onClick },
          { id: "c", name: "Mail", value: 1 },
        ]}
      />
    );
    expect(screen.getByRole("link", { name: /Chrome/ })).toHaveAttribute("href", "/chrome");
    const button = screen.getByRole("button", { name: /Safari/ });
    await user.tab();
    expect(screen.getByRole("link", { name: /Chrome/ })).toHaveFocus();
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![0]).toMatchObject({ id: "b" });
    expect(screen.queryByRole("button", { name: /Mail/ })).toBeNull();
  });

  it("shows the empty state", () => {
    render(<BarList items={[]} emptyState="No apps" header={{ label: "App", value: "CPU" }} />);
    expect(screen.getByText("No apps")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("MetricHero", () => {
  it("draws a series as an accent area chart with details", async () => {
    const { container } = render(
      <MetricHero
        accent="blue"
        caption="Now"
        value="34"
        unit="%"
        status={<StatusBadge tone="success" label="Normal" />}
        details={[
          { label: "Average today", value: "37%" },
          { label: "Load", value: "6.75" },
        ]}
        series={[30, 35, 40, 34]}
        min={0}
        max={100}
        valueFormatter={(v) => `${v}%`}
      />
    );
    const root = container.querySelector('[data-slot="metric-hero"]') as HTMLElement;
    expect(root.style.getPropertyValue("--sutra-accent")).toBe("#2b7fff");
    expect(screen.getByText("34").closest('[data-slot="stat-value"]')).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    const terms = screen.getAllByRole("term").map((t) => t.textContent);
    expect(terms).toEqual(["Average today", "Load"]);
    expect(screen.getByText("6.75")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Now history" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart-line"]')).toHaveAttribute("stroke", "var(--sutra-accent, var(--primary))");
    expect(screen.getByRole("table", { hidden: true })).toHaveTextContent("40%");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("accepts a custom chart", async () => {
    const { container } = render(
      <MetricHero caption="Downloading" value="6.7" unit="MB/s" chart={<div role="img" aria-label="Custom chart" />} series={[1, 2]} />
    );
    expect(screen.getByRole("img", { name: "Custom chart" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="chart-line"]')).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("StatCard body slot and value font", () => {
  it("renders a header-only card whose body is children, without an empty value", async () => {
    const { container } = render(
      <StatCard accent="violet" icon={<RiCpuLine />} label="Memory by app">
        <p>Donut goes here</p>
      </StatCard>
    );
    expect(container.querySelector("[data-slot=stat-value]")).toBeNull();
    expect(container.querySelector("[data-slot=stat-body]")).toBeNull();
    expect(container.querySelector("[data-slot=stat-content]")).toHaveTextContent("Donut goes here");
    expect(screen.getByText("Memory by app")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("switches the number face with valueFont", () => {
    const { container, rerender } = render(<StatCard label="CPU" value={25} unit="%" />);
    expect(container.querySelector("[data-slot=stat-value]")).toHaveClass("font-mono");
    rerender(<StatCard label="CPU" value={25} unit="%" valueFont="sans" />);
    expect(container.querySelector("[data-slot=stat-value]")).toHaveClass("font-sans");
    expect(container.querySelector("[data-slot=stat-value]")).not.toHaveClass("font-mono");
    render(<StatValue value="12" font="sans" data-testid="v" />);
    expect(screen.getByTestId("v")).toHaveClass("font-sans");
  });

  it("keeps stat values and labels on one line, truncating instead of overlapping", () => {
    const { container } = render(
      <StatCard label="Memory" value="49.96" stats={[{ label: "Compressed", value: "22.10 GB", color: "green" }]} />
    );
    const list = container.querySelector("[data-slot=stat-stats]")!;
    expect(list.className).toContain("[&_dd]:truncate");
    expect(list.className).toContain("[&_dt]:truncate");
    expect(within(list as HTMLElement).getByText("Compressed")).toHaveClass("truncate");
  });
});
