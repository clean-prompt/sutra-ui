import * as React from "react";
import { render, screen } from "@testing-library/react";
import {
  AreaChart,
  BarChart,
  DonutChart,
  FunnelChart,
  LineChart,
  RadarChart,
  ScatterChart,
  WaterfallChart,
} from "../src/patterns/chart";
import { CalendarHeatmap, HeatmapGrid } from "../src/patterns/heatmap";
import { Treemap } from "../src/patterns/treemap";
import { tickFormatter, valueFormatterFor } from "../src/patterns/chart-internal";

const DE = "1.234,5";
const EN = "1,234.5";

const rows = [
  { k: "a", v: 1234.5, w: 2000.25 },
  { k: "b", v: 2468, w: 3000 },
];
const one = [{ key: "v", label: "Value" }];
const texts = (c: HTMLElement) => Array.from(c.querySelectorAll("svg text")).map((t) => t.textContent ?? "");

describe("chart number formatting: default", () => {
  it("valueFormatterFor() matches the runtime-default Intl output", () => {
    const expected = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    expect(valueFormatterFor()(1234.5678)).toBe(expected.format(1234.5678));
    expect(valueFormatterFor(undefined)(0.5)).toBe(expected.format(0.5));
  });

  it("tickFormatter() without a locale matches the runtime-default compact format", () => {
    const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
    expect(tickFormatter([0, 1000, 2000, 3000])(2000)).toBe(compact.format(2000));
  });

  it("caches one formatter function per locale", () => {
    expect(valueFormatterFor("de")).toBe(valueFormatterFor("de"));
    expect(valueFormatterFor("de")).not.toBe(valueFormatterFor("en"));
    expect(valueFormatterFor()).toBe(valueFormatterFor(undefined));
  });

  it("charts without a locale render the runtime-default separators", () => {
    const expected = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(1234.5);
    const { container } = render(<BarChart data={rows} index="k" series={one} />);
    expect(container.textContent).toContain(expected);
  });
});

describe("chart number formatting: locale", () => {
  it("formats the value axis ticks with the locale", () => {
    const data = [
      { k: "a", v: 0 },
      { k: "b", v: 2 },
    ];
    const de = render(<LineChart data={data} index="k" series={one} locale="de" />);
    expect(texts(de.container)).toContain("0,5");
    expect(texts(de.container)).not.toContain("0.5");
    de.unmount();
    const en = render(<LineChart data={data} index="k" series={one} locale="en" />);
    expect(texts(en.container)).toContain("0.5");
  });

  it.each([
    ["AreaChart", AreaChart],
    ["LineChart", LineChart],
    ["BarChart", BarChart],
  ] as const)("%s formats the table and tooltip text with `de`", (_n, Chart) => {
    const { container } = render(<Chart data={rows} index="k" series={one} locale="de" />);
    expect(container.textContent).toContain(DE);
    expect(container.textContent).not.toContain(EN);
  });

  it("a cartesian chart does not leak `locale` to the DOM", () => {
    const { container } = render(<BarChart data={rows} index="k" series={one} locale="de" />);
    expect(container.querySelector("[locale]")).toBeNull();
  });

  it("an explicit valueFormatter wins over the locale", () => {
    const { container } = render(<BarChart data={rows} index="k" series={one} locale="de" valueFormatter={(v) => `#${v}`} />);
    expect(container.textContent).toContain("#1234.5");
    expect(container.textContent).not.toContain(DE);
  });

  it("formats a linear x axis with the locale", () => {
    const data = [
      { x: 0, v: 100 },
      { x: 1, v: 200 },
    ];
    const de = render(<LineChart data={data} index="x" series={[{ key: "v", label: "V" }]} xAxis={{ type: "linear" }} locale="de" />);
    expect(texts(de.container)).toContain("0,2");
    expect(texts(de.container).some((t) => t.includes("."))).toBe(false);
  });

  it("ScatterChart formats values and x with `de`", () => {
    const data = [
      { x: 1234.5, y: 2000.25 },
      { x: 2468, y: 3000 },
    ];
    const { container } = render(<ScatterChart data={data} index="x" series={[{ key: "y", label: "Y" }]} locale="de" />);
    expect(container.textContent).toContain(DE);
    expect(container.textContent).not.toContain(EN);
  });

  it("RadarChart formats values with `de`", () => {
    const data = [
      { s: "a", v: 1234.5 },
      { s: "b", v: 2468 },
      { s: "c", v: 100 },
    ];
    const { container } = render(<RadarChart data={data} index="s" series={one} locale="de" />);
    expect(container.textContent).toContain(DE);
    expect(container.textContent).not.toContain(EN);
  });

  it("WaterfallChart formats magnitudes with `de`", () => {
    const { container } = render(
      <WaterfallChart
        data={[
          { label: "Start", value: 1234.5, type: "total" },
          { label: "Up", value: 1000.5 },
        ]}
        locale="de"
      />
    );
    expect(container.textContent).toContain(DE);
    expect(container.textContent).toContain("+1.000,5");
    expect(container.textContent).not.toContain(EN);
  });

  it("DonutChart formats the centre total and values with `de`", () => {
    const { container } = render(<DonutChart data={[{ user: "a", value: 1000.25 }, { user: "b", value: 234.25 }]} index="user" locale="de" />);
    expect(container.textContent).toContain("1.234,5");
    expect(container.textContent).not.toContain(EN);
  });

  it("FunnelChart formats stage values with `de`", () => {
    const { container } = render(<FunnelChart data={[{ label: "A", value: 1234.5 }, { label: "B", value: 600 }]} locale="de" />);
    expect(container.textContent).toContain(DE);
    expect(container.textContent).not.toContain(EN);
  });

  it("Treemap formats tile values with `de`", () => {
    render(<Treemap data={{ id: "root", name: "Root", children: [{ id: "a", name: "A", value: 1234.5 }, { id: "b", name: "B", value: 500 }] }} defaultWidth={500} height={200} locale="de" />);
    expect(screen.getByRole("button", { name: /^A, 1\.234,5/ })).toBeInTheDocument();
  });

  it("HeatmapGrid formats the default value text with the locale, and keeps plain digits without one", () => {
    const { rerender } = render(<HeatmapGrid data={[1234.56, 2]} max={5000} />);
    expect(screen.getByLabelText("Cell 0: 1234.6%")).toBeInTheDocument();
    rerender(<HeatmapGrid data={[1234.56, 2]} max={5000} locale="de" />);
    expect(screen.getByLabelText("Cell 0: 1.234,6%")).toBeInTheDocument();
  });

  it("CalendarHeatmap keeps forwarding its locale to the value text", () => {
    const { container } = render(<CalendarHeatmap data={[{ date: "2026-10-01", value: 1234.5 }]} month={new Date(2026, 9, 15)} mode="month" locale="de" />);
    expect(container.innerHTML).toContain("1.234,5");
  });
});
