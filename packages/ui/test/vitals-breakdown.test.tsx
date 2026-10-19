import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { breakdownValue, formatShare, topWithOther, withShares } from "../src/lib/breakdown";
import { BreakdownList, StackedMeter } from "../src/primitives/meter";
import { DonutChart } from "../src/patterns/chart";
import { axeViolations } from "./a11y";

interface App {
  name: string;
  gb: number;
}
const other = (rest: App[], total: number): App => ({ name: `Other (${rest.length})`, gb: total });
const top = (items: App[], limit: number) => topWithOther(items, { value: (a) => a.gb, limit, other });

describe("topWithOther", () => {
  const apps: App[] = [
    { name: "Terminal", gb: 3.86 },
    { name: "Chrome", gb: 21.23 },
    { name: "Safari", gb: 2.69 },
    { name: "VS Code", gb: 8.17 },
    { name: "Mail", gb: 1 },
    { name: "Notes", gb: 0.5 },
  ];

  it("keeps the largest items and folds the rest into Other", () => {
    expect(top(apps, 3)).toEqual([
      { name: "Chrome", gb: 21.23 },
      { name: "VS Code", gb: 8.17 },
      { name: "Terminal", gb: 3.86 },
      { name: "Other (3)", gb: expect.closeTo(4.19) },
    ]);
  });

  it("returns an empty array for no items and omits Other when nothing is left over", () => {
    const spy = vi.fn(other);
    expect(topWithOther([], { value: (a: App) => a.gb, limit: 3, other: spy })).toEqual([]);
    expect(top(apps, 6).map((a) => a.name)).toEqual(["Chrome", "VS Code", "Terminal", "Safari", "Mail", "Notes"]);
    expect(top(apps, 10)).toHaveLength(6);
    expect(top(apps, Infinity)).toHaveLength(6);
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps input order for ties and does not mutate the input", () => {
    const tied: App[] = [
      { name: "a", gb: 1 },
      { name: "b", gb: 2 },
      { name: "c", gb: 1 },
      { name: "d", gb: 2 },
    ];
    const copy = [...tied];
    expect(top(tied, 3).map((a) => a.name)).toEqual(["b", "d", "a", "Other (1)"]);
    expect(tied).toEqual(copy);
  });

  it("treats negative and NaN values as 0, in ranking and in the Other total", () => {
    const bad: App[] = [
      { name: "neg", gb: -5 },
      { name: "nan", gb: NaN },
      { name: "ok", gb: 2 },
      { name: "inf", gb: Infinity },
    ];
    const out = top(bad, 1);
    expect(out[0]!.name).toBe("ok");
    expect(out[1]).toEqual({ name: "Other (3)", gb: 0 });
  });

  it("limit 0 (or negative / NaN) folds everything into Other; fractional limits round down", () => {
    const all = top(apps, 0);
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe("Other (6)");
    expect(all[0]!.gb).toBeCloseTo(37.45);
    expect(top(apps, -2)).toHaveLength(1);
    expect(top(apps, NaN)).toHaveLength(1);
    expect(top(apps, 2.9)).toHaveLength(3);
  });
});

describe("withShares / formatShare", () => {
  it("adds each item's share of the total", () => {
    const out = withShares(
      [
        { k: "a", v: 3 },
        { k: "b", v: 1 },
      ],
      (x) => x.v
    );
    expect(out).toEqual([
      { k: "a", v: 3, share: 0.75 },
      { k: "b", v: 1, share: 0.25 },
    ]);
  });

  it("returns 0 shares when the total is 0, and ignores bad values", () => {
    expect(withShares([{ v: 0 }, { v: -1 }], (x) => x.v).map((x) => x.share)).toEqual([0, 0]);
    expect(withShares([{ v: NaN }, { v: 4 }], (x) => x.v).map((x) => x.share)).toEqual([0, 1]);
    expect(withShares([], (x: { v: number }) => x.v)).toEqual([]);
  });

  it("formats shares as whole percents", () => {
    expect(formatShare(0.4629)).toBe("46%");
    expect(formatShare(0)).toBe("0%");
    expect(formatShare(0.001)).toBe("<1%");
    expect(formatShare(NaN)).toBe("0%");
    expect(formatShare(1)).toBe("100%");
    expect(breakdownValue(-1)).toBe(0);
    expect(breakdownValue("3")).toBe(0);
  });
});

const containers = [
  { label: "postgres", value: 312, color: "#2b7fff" },
  { label: "rabbitmq", value: 206, color: "#ff6900" },
  { label: "minio", value: 142, color: "#00c950" },
  { label: "redis", value: 14, color: "#62748e" },
];
const mb = (v: number) => `${v} MB`;

describe("BreakdownList", () => {
  it("renders a static list with values, percent and icons", async () => {
    const { container } = render(
      <BreakdownList
        aria-label="By container"
        valueFormatter={mb}
        showPercent
        items={containers.map((c, i) => ({ ...c, icon: i === 0 ? <svg data-testid="pg-icon" /> : undefined }))}
      />
    );
    const list = screen.getByRole("list", { name: "By container" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(within(list).queryByRole("button")).toBeNull();
    expect(rows[0]).toHaveTextContent("postgres312 MB46%");
    expect(rows[3]).toHaveTextContent("redis14 MB2%");
    const value = rows[0]!.querySelector('[data-slot="breakdown-list-value"]')!;
    expect(value).toHaveClass("tabular-nums", "text-end");
    // The icon is decorative.
    expect(screen.getByTestId("pg-icon").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll('[data-slot="breakdown-list-icon"]')).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("uses explicit shares and valueText, and can hide the value column", () => {
    const { rerender } = render(
      <BreakdownList items={[{ label: "App", color: "primary", value: 22.15, valueText: "22.15 GB", share: 0.5 }]} showPercent />
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("App22.15 GB50%");
    rerender(<BreakdownList items={[{ label: "App", color: "primary", value: 22.15 }]} showValue={false} />);
    expect(screen.getByRole("listitem")).toHaveTextContent(/^App$/);
  });

  it("toggles rows with the keyboard when interactive", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [hidden, setHidden] = React.useState<string[]>([]);
      return (
        <BreakdownList
          aria-label="Legend"
          showPercent
          valueFormatter={mb}
          items={containers}
          hiddenSeries={hidden}
          onHiddenSeriesChange={(h) => {
            onChange(h);
            setHidden(h);
          }}
        />
      );
    }
    const { container } = render(<Harness />);
    expect(within(screen.getByRole("list", { name: "Legend" })).getAllByRole("listitem")).toHaveLength(4);
    const pg = screen.getByRole("button", { name: /postgres/ });
    expect(pg).toHaveAttribute("aria-pressed", "true");
    pg.focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["postgres"]);
    expect(pg).toHaveAttribute("aria-pressed", "false");
    expect(pg.closest("li")).toHaveAttribute("data-state", "hidden");
    // Hidden rows leave the default total: rabbitmq is now 206 / 362.
    expect(screen.getByRole("button", { name: /rabbitmq/ })).toHaveTextContent("57%");
    expect(pg).toHaveTextContent("—");
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith([]);
    // Alt+Enter isolates.
    await user.keyboard("{Alt>}{Enter}{/Alt}");
    expect(onChange).toHaveBeenLastCalledWith(["rabbitmq", "minio", "redis"]);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("is uncontrolled-interactive with `interactive`", async () => {
    const user = userEvent.setup();
    render(<BreakdownList interactive items={containers} />);
    const btn = screen.getByRole("button", { name: /minio/ });
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
});

describe("DonutChart breakdown legend", () => {
  const memory = [
    { app: "Google Chrome", value: 21.23 },
    { app: "VS Code", value: 8.17 },
    { app: "Terminal", value: 3.86 },
    { app: "Safari", value: 2.69 },
    { app: "Other", value: 23.3 },
  ];
  const gb = (v: number) => `${v.toFixed(2)} GB`;

  it("keeps the chip legend by default", () => {
    const { container } = render(<DonutChart data={memory} index="app" />);
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="breakdown-list"]')).toBeNull();
  });

  it("renders values and icons in a BreakdownList legend", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DonutChart
        data={memory}
        index="app"
        size={120}
        legend="right"
        legendValues
        valueFormatter={gb}
        centerValue="59.25 GB"
        centerLabel="all apps"
        iconFor={(d) => (d.app === "Other" ? null : <svg data-testid={`icon-${d.app}`} />)}
      />
    );
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeNull();
    const list = screen.getByRole("list", { name: "Legend" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("Google Chrome21.23 GB");
    expect(screen.getAllByTestId(/^icon-/)).toHaveLength(4);
    expect(screen.getByText("59.25 GB")).toHaveAttribute("data-slot", "chart-center-value");
    expect(screen.getByText("all apps")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="chart-segment"]')).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: /VS Code/ }));
    expect(container.querySelectorAll('[data-slot="chart-segment"]')).toHaveLength(4);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows percent or both, and can be static", async () => {
    const data = [
      { k: "a", value: 3 },
      { k: "b", value: 1 },
    ];
    const { container, rerender } = render(<DonutChart data={data} index="k" legendValues="percent" />);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(/^a75%$/);
    rerender(<DonutChart data={data} index="k" legendValues="both" legendInteractive={false} />);
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent(/^b125%$/);
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("StackedMeter list legend", () => {
  it("keeps the inline chip legend by default", () => {
    const { container } = render(<StackedMeter label="Disk" parts={[{ label: "A", value: 1 }]} />);
    expect(container.querySelector('[data-slot="breakdown-list"]')).toBeNull();
    expect(screen.getByRole("listitem")).toHaveTextContent("A1");
  });

  it('renders values right-aligned with a percent column with legend="list"', async () => {
    const { container } = render(
      <StackedMeter
        label="By Container"
        showValue={false}
        legend="list"
        valueFormatter={mb}
        parts={containers.map((c, i) => ({ ...c, icon: i === 0 ? <svg data-testid="pg" /> : undefined }))}
      />
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("postgres312 MB46%");
    expect(rows[1]).toHaveTextContent("rabbitmq206 MB31%");
    expect(rows[2]).toHaveTextContent("minio142 MB21%");
    expect(rows[3]).toHaveTextContent("redis14 MB2%");
    expect(screen.getByTestId("pg")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /postgres 312 MB/ })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("computes percent against max and can hide it", () => {
    const { rerender } = render(
      <StackedMeter legend="list" max={200} parts={[{ label: "Used", value: 50 }]} valueFormatter={mb} />
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Used50 MB25%");
    rerender(<StackedMeter legend="list" showPercent={false} parts={[{ label: "Used", value: 50 }]} valueFormatter={mb} />);
    expect(screen.getByRole("listitem")).toHaveTextContent(/^Used50 MB$/);
  });
});
