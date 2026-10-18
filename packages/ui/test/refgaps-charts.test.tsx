import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AreaChart, BarChart, LineChart, formatTimeTick, timeTicks } from "../src/patterns/chart";
import { formatClockTime, formatDateTime, formatShortDate, HOUR_MS, MINUTE_MS, DAY_MS } from "../src/lib/time";
import { axeViolations } from "./a11y";

// jsdom: the chart is 600px wide; the plot spans x 40 … 592 (552px).
const LEFT = 40;
const WIDTH = 552;
const xAt = (frac: number) => LEFT + frac * WIDTH;

const base = new Date(2026, 9, 14, 0, 0).getTime(); // local midnight, Wed Oct 14 2026
const h = (n: number) => base + n * HOUR_MS;

// Unevenly spaced samples: 0h, 1h, 2h, then a long quiet stretch until 10h.
const samples = [
  { t: h(0), cpu: 10 },
  { t: h(1), cpu: 20 },
  { t: h(2), cpu: 30 },
  { t: h(10), cpu: 40 },
];
const series = [{ key: "cpu", label: "CPU" }];

const slots = (c: HTMLElement, slot: string) => Array.from(c.querySelectorAll(`[data-slot="${slot}"]`));
const pathXs = (d: string) => (d.match(/[ML]-?[\d.]+,-?[\d.]+/g) ?? []).map((m) => Number(m.slice(1).split(",")[0]));
const moveCount = (d: string) => (d.match(/M/g) ?? []).length;
const tickLabels = (c: HTMLElement) =>
  Array.from(c.querySelectorAll("svg text")).filter((t) => t.getAttribute("y") === String(8 + (240 - 8 - 22) + 16));

describe("time x axis: placement", () => {
  it("places points proportionally to time, not by index", () => {
    const { container } = render(
      <LineChart data={samples} index="t" series={series} curve="linear" xAxis={{ type: "time" }} />
    );
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs).toHaveLength(4);
    expect(xs[0]).toBeCloseTo(xAt(0), 1);
    expect(xs[1]).toBeCloseTo(xAt(0.1), 1);
    expect(xs[2]).toBeCloseTo(xAt(0.2), 1);
    expect(xs[3]).toBeCloseTo(xAt(1), 1);
  });

  it("accepts Dates and ISO strings for the index value and sorts by time", () => {
    const data = [
      { t: new Date(h(10)).toISOString(), cpu: 40 },
      { t: new Date(h(0)), cpu: 10 },
      { t: h(2), cpu: 30 },
    ];
    const { container } = render(<LineChart data={data} index="t" series={series} curve="linear" xAxis={{ type: "time" }} />);
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs.map((x) => Math.round(x))).toEqual([xAt(0), xAt(0.2), xAt(1)].map(Math.round));
  });

  it("places area chart points proportionally too", () => {
    const { container } = render(<AreaChart data={samples} index="t" series={series} curve="linear" xAxis={{ type: "time" }} />);
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs[2]).toBeCloseTo(xAt(0.2), 1);
  });

  it("supports a linear numeric axis", () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 9, y: 3 },
      { x: 10, y: 4 },
    ];
    const { container } = render(
      <LineChart data={data} index="x" series={[{ key: "y" }]} curve="linear" xAxis={{ type: "linear" }} />
    );
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs[2]).toBeCloseTo(xAt(0.9), 1);
    expect(tickLabels(container).map((t) => t.textContent)).toEqual(["0", "2", "4", "6", "8", "10"]);
  });

  it("keeps the category default unchanged (evenly spaced by index)", () => {
    const { container } = render(<LineChart data={samples} index="t" series={series} curve="linear" />);
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs[1]).toBeCloseTo(xAt(1 / 3), 1);
    expect(xs[2]).toBeCloseTo(xAt(2 / 3), 1);
    expect(container.querySelector('[data-slot="chart-marks"]')).toBeNull();
  });

  it("leaves bar charts on the band scale", () => {
    const { container } = render(<BarChart data={samples} index="t" series={series} xAxis={{ type: "time" }} />);
    expect(slots(container, "chart-bar")).toHaveLength(4);
  });
});

describe("time x axis: domain", () => {
  it("uses a fixed domain wider than the data", () => {
    const { container } = render(
      <LineChart data={samples} index="t" series={series} curve="linear" xAxis={{ type: "time", domain: [h(-10), h(10)] }} />
    );
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs[0]).toBeCloseTo(xAt(0.5), 1);
    expect(xs[3]).toBeCloseTo(xAt(1), 1);
  });

  it("allows one auto end", () => {
    const { container } = render(
      <LineChart data={samples} index="t" series={series} curve="linear" xAxis={{ type: "time", domain: [h(-10), "auto"] }} />
    );
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs[0]).toBeCloseTo(xAt(0.5), 1);
  });

  it("clips points outside the domain and keeps them out of hover and keyboard navigation", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn();
    const { container } = render(
      <LineChart
        data={samples}
        index="t"
        series={series}
        curve="linear"
        xAxis={{ type: "time", domain: [h(1), h(10)] }}
        onActiveIndexChange={onActive}
      />
    );
    const marks = container.querySelector('[data-slot="chart-marks"]')!;
    expect(marks.getAttribute("clip-path")).toMatch(/^url\(#.+-clip\)$/);
    // The line still enters from the clipped point (drawn left of the plot).
    const xs = pathXs(slots(container, "chart-line")[0]!.getAttribute("d")!);
    expect(xs[0]).toBeLessThan(LEFT);
    expect(xs[1]).toBeCloseTo(xAt(0), 1);
    // Hovering the left edge picks the first visible point (1h), not the clipped one.
    fireEvent.mouseMove(container.querySelector('[data-slot="chart-hit"]')!, { clientX: LEFT, clientY: 50 });
    expect(onActive).toHaveBeenLastCalledWith(1);
    fireEvent.mouseLeave(container.querySelector('[data-slot="chart-hit"]')!);
    screen.getByRole("img", { name: /Line chart/ }).focus();
    await user.keyboard("{Home}");
    expect(onActive).toHaveBeenLastCalledWith(1);
    await user.keyboard("{ArrowLeft}");
    expect(onActive).toHaveBeenLastCalledWith(1);
  });

  it("fits the value axis to the visible window, not to far-away samples", () => {
    const data = [{ t: h(-48), cpu: 1000 }, { t: h(-30), cpu: 90 }, ...samples];
    const { container } = render(
      <LineChart data={data} index="t" series={series} xAxis={{ type: "time", domain: [h(0), h(10)] }} />
    );
    const labels = Array.from(container.querySelectorAll("svg text")).map((t) => t.textContent);
    // The neighbour the line enters from (90) counts; the sample two days back (1000) does not.
    expect(labels).toContain("100");
    expect(labels).not.toContain("1K");
    expect(labels).not.toContain("1,000");
  });
});

describe("timeTicks", () => {
  it("uses minute ticks aligned to whole minutes for short spans", () => {
    const start = base + 9 * HOUR_MS + 2 * MINUTE_MS + 13_000; // 09:02:13
    const r = timeTicks(start, start + 28 * MINUTE_MS, 6);
    expect(r.unit).toBe("minute");
    expect(r.step).toBe(5);
    expect(r.ticks.map((t) => new Date(t).getMinutes())).toEqual([5, 10, 15, 20, 25, 30]);
    expect(r.ticks.every((t) => new Date(t).getSeconds() === 0)).toBe(true);
  });

  it("uses hour ticks aligned to local hours for a day", () => {
    const r = timeTicks(h(0) + 7 * MINUTE_MS, h(24), 6);
    expect(r.unit).toBe("hour");
    expect(r.step).toBe(6);
    expect(r.ticks.map((t) => new Date(t).getHours())).toEqual([6, 12, 18, 0]);
  });

  it("uses day ticks at local midnight for a week", () => {
    const r = timeTicks(h(5), h(5) + 7 * DAY_MS, 8);
    expect(r.unit).toBe("day");
    expect(r.ticks).toHaveLength(7);
    expect(r.ticks.every((t) => new Date(t).getHours() === 0 && new Date(t).getMinutes() === 0)).toBe(true);
  });

  it("uses week ticks on Mondays for about a month", () => {
    const r = timeTicks(base, base + 35 * DAY_MS, 6);
    expect(r.unit).toBe("week");
    expect(r.ticks.length).toBeGreaterThanOrEqual(4);
    expect(r.ticks.every((t) => new Date(t).getDay() === 1)).toBe(true);
  });

  it("uses months and years for long spans", () => {
    expect(timeTicks(base, base + 200 * DAY_MS, 6).unit).toBe("month");
    const years = timeTicks(new Date(2000, 0, 1).getTime(), new Date(2026, 0, 1).getTime(), 6);
    expect(years.unit).toBe("year");
    expect(years.ticks.every((t) => new Date(t).getMonth() === 0 && new Date(t).getDate() === 1)).toBe(true);
  });

  it("never throws on bad input", () => {
    expect(timeTicks(NaN, 5).ticks).toEqual([]);
  });
});

describe("default time formatters", () => {
  const wedDay = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" }).format(new Date(base));

  it("formats ticks by unit", () => {
    expect(formatTimeTick(h(10.5), "minute")).toBe(formatClockTime(h(10.5)));
    expect(formatTimeTick(h(10.5), "hour")).toBe(formatClockTime(h(10.5)));
    expect(formatTimeTick(base, "hour")).toBe(wedDay); // midnight shows the day
    expect(formatTimeTick(base, "day")).toBe(wedDay);
    expect(formatTimeTick(new Date(2026, 10, 1), "day")).toBe(formatShortDate(new Date(2026, 10, 1), { year: "never" }));
    expect(formatTimeTick(base, "week")).toBe(formatShortDate(base, { year: "never" }));
    expect(formatTimeTick(new Date(2027, 0, 1), "month")).toContain("2027");
    expect(formatTimeTick(new Date(2027, 0, 1), "year")).toContain("2027");
    expect(formatTimeTick("nope", "hour")).toBe("");
  });

  it("labels the axis with clock times for an hours span and full date-times in the tooltip and table", () => {
    const { container } = render(<LineChart data={samples} index="t" series={series} xAxis={{ type: "time" }} />);
    const labels = tickLabels(container).map((t) => t.textContent);
    expect(labels.length).toBeGreaterThan(1);
    expect(labels).toContain(formatClockTime(h(3)));
    // Screen-reader table: data order, formatted x values.
    const rows = Array.from(container.querySelectorAll("table tbody th")).map((th) => th.textContent);
    expect(rows).toEqual(samples.map((s) => formatDateTime(s.t)));
  });

  it("labels a weeks span with dates and shows date-only values for daily data", () => {
    const daily = Array.from({ length: 30 }, (_, i) => ({ t: base + i * DAY_MS, cpu: i }));
    const { container } = render(<LineChart data={daily} index="t" series={series} xAxis={{ type: "time" }} />);
    const labels = tickLabels(container).map((t) => t.textContent);
    expect(labels.length).toBeGreaterThan(1);
    expect(labels.every((l) => !/:\d\d/.test(l ?? ""))).toBe(true);
    expect(container.querySelector("table tbody th")!.textContent).toBe(formatShortDate(base));
  });

  it("lets xAxis.formatter override ticks (index -1, a Date) and points (a Date with its index)", () => {
    const formatter = vi.fn((v: unknown, i: number) => `${i}:${v instanceof Date ? v.getHours() : "?"}`);
    const { container } = render(<LineChart data={samples} index="t" series={series} xAxis={{ type: "time", formatter }} />);
    const labels = tickLabels(container).map((t) => t.textContent);
    expect(labels.every((l) => l!.startsWith("-1:"))).toBe(true);
    const rows = Array.from(container.querySelectorAll("table tbody th")).map((th) => th.textContent);
    expect(rows).toEqual(["0:0", "1:1", "2:2", "3:10"]);
  });
});

describe("time x axis: interaction", () => {
  it("shows the tooltip for the nearest point by time", () => {
    const { container } = render(<LineChart data={samples} index="t" series={series} xAxis={{ type: "time" }} />);
    // 7h is nearer to the 10h sample than to 2h; index spacing would have picked 2h.
    fireEvent.mouseMove(container.querySelector('[data-slot="chart-hit"]')!, { clientX: xAt(0.7), clientY: 50 });
    const tip = container.querySelector('[data-slot="chart-tooltip"]')!;
    expect(tip.textContent).toContain(formatDateTime(h(10)));
    expect(tip.textContent).toContain("40");
    const cross = container.querySelector('[data-slot="chart-crosshair"]')!;
    expect(Number(cross.getAttribute("x1"))).toBeCloseTo(xAt(1), 1);
    fireEvent.mouseMove(container.querySelector('[data-slot="chart-hit"]')!, { clientX: xAt(0.14), clientY: 50 });
    expect(container.querySelector('[data-slot="chart-tooltip"]')!.textContent).toContain(formatDateTime(h(1)));
  });

  it("steps through points in time order with the keyboard", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn();
    const shuffled = [samples[2]!, samples[0]!, samples[3]!, samples[1]!];
    render(<LineChart data={shuffled} index="t" series={series} xAxis={{ type: "time" }} onActiveIndexChange={onActive} />);
    screen.getByRole("img", { name: /Line chart/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onActive).toHaveBeenLastCalledWith(1); // 0h
    await user.keyboard("{ArrowRight}");
    expect(onActive).toHaveBeenLastCalledWith(3); // 1h
    await user.keyboard("{End}");
    expect(onActive).toHaveBeenLastCalledWith(2); // 10h
    await user.keyboard("{ArrowLeft}");
    expect(onActive).toHaveBeenLastCalledWith(0); // 2h
  });
});

describe("time x axis: gaps", () => {
  const withQuiet = [...samples, { t: h(11), cpu: 50 }];

  it("draws one line without maxGap", () => {
    const { container } = render(<LineChart data={withQuiet} index="t" series={series} xAxis={{ type: "time" }} />);
    expect(moveCount(slots(container, "chart-line")[0]!.getAttribute("d")!)).toBe(1);
  });

  it("breaks the line and area when samples are further apart than maxGap", () => {
    const { container } = render(
      <AreaChart data={withQuiet} index="t" series={series} xAxis={{ type: "time", maxGap: 3 * HOUR_MS }} />
    );
    expect(moveCount(slots(container, "chart-line")[0]!.getAttribute("d")!)).toBe(2);
    expect(moveCount(slots(container, "chart-area")[0]!.getAttribute("d")!)).toBe(2);
  });

  it("breaks stacked areas at maxGap too", () => {
    const data = withQuiet.map((d) => ({ ...d, mem: 5 }));
    const { container } = render(
      <AreaChart
        stacked
        data={data}
        index="t"
        series={[...series, { key: "mem" }]}
        xAxis={{ type: "time", maxGap: 3 * HOUR_MS }}
      />
    );
    for (const p of slots(container, "chart-area")) expect(moveCount(p.getAttribute("d")!)).toBe(2);
  });

  it("keeps breaking at null values", () => {
    const data = samples.map((d, i) => (i === 1 ? { ...d, cpu: null } : d));
    const { container } = render(<LineChart data={data} index="t" series={series} xAxis={{ type: "time" }} />);
    expect(moveCount(slots(container, "chart-line")[0]!.getAttribute("d")!)).toBe(2);
  });
});

describe("time x axis: reference lines", () => {
  it("draws a vertical line at a time value", () => {
    const { container } = render(
      <LineChart
        data={samples}
        index="t"
        series={series}
        xAxis={{ type: "time" }}
        referenceLines={[
          { axis: "x", value: new Date(h(5)), label: "Deploy" },
          { axis: "x", value: h(50), label: "Outside" },
          { value: 35, label: "Limit" },
        ]}
      />
    );
    const refs = slots(container, "chart-reference-line");
    expect(refs).toHaveLength(2);
    const line = refs[0]!.querySelector("line")!;
    expect(Number(line.getAttribute("x1"))).toBeCloseTo(xAt(0.5), 1);
    expect(line.getAttribute("x1")).toBe(line.getAttribute("x2"));
    expect(refs[0]!.textContent).toBe("Deploy");
    expect(refs[1]!.textContent).toBe("Limit");
  });
});

describe("time x axis: accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <AreaChart
        data={samples}
        index="t"
        series={series}
        xAxis={{ type: "time", domain: [h(1), h(12)], maxGap: 3 * HOUR_MS }}
        referenceLines={[{ axis: "x", value: h(5), label: "Deploy" }]}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("connectNulls", () => {
  const rows = [
    { day: "Mon", a: 10, b: 1 },
    { day: "Tue", a: null, b: null },
    { day: "Wed", a: 30, b: 3 },
    { day: "Thu", a: 40, b: 4 },
  ];
  const lineD = (c: HTMLElement, n = 0) => slots(c, "chart-line")[n]!.getAttribute("d")!;

  it("breaks at nulls by default (unchanged)", () => {
    const { container } = render(<LineChart data={rows} index="day" series={[{ key: "a" }]} curve="linear" />);
    const off = render(<LineChart data={rows} index="day" series={[{ key: "a" }]} curve="linear" connectNulls={false} />);
    expect(moveCount(lineD(container))).toBe(2);
    expect(lineD(off.container)).toBe(lineD(container));
  });

  it("bridges nulls from the previous to the next valid point on a category axis", () => {
    const { container } = render(<LineChart data={rows} index="day" series={[{ key: "a" }]} curve="linear" connectNulls />);
    const d = lineD(container);
    expect(moveCount(d)).toBe(1);
    expect(pathXs(d).map(Math.round)).toEqual([xAt(0), xAt(2 / 3), xAt(1)].map(Math.round));
  });

  it("bridges area fills too", () => {
    const { container } = render(<AreaChart data={rows} index="day" series={[{ key: "a" }]} connectNulls />);
    expect(moveCount(slots(container, "chart-area")[0]!.getAttribute("d")!)).toBe(1);
    expect(moveCount(lineD(container))).toBe(1);
  });

  it("works with the step curve", () => {
    const { container } = render(<LineChart data={rows} index="day" series={[{ key: "a" }]} curve="step" connectNulls />);
    const d = lineD(container);
    expect(moveCount(d)).toBe(1);
    const hs = (d.match(/H-?[\d.]+/g) ?? []).map((m) => Number(m.slice(1)));
    expect(hs.map(Math.round)).toEqual([xAt(2 / 3), xAt(1)].map(Math.round));
  });

  it("bridges on time and linear axes, and maxGap still breaks", () => {
    const timed = [
      { t: h(0), cpu: 10 },
      { t: h(1), cpu: null },
      { t: h(2), cpu: 30 },
      { t: h(10), cpu: 40 },
      { t: h(11), cpu: 50 },
    ];
    const bridged = render(<LineChart data={timed} index="t" series={series} xAxis={{ type: "time" }} connectNulls />);
    expect(moveCount(lineD(bridged.container))).toBe(1);
    const gapped = render(
      <LineChart data={timed} index="t" series={series} xAxis={{ type: "time", maxGap: 3 * HOUR_MS }} connectNulls />
    );
    const d = lineD(gapped.container);
    expect(moveCount(d)).toBe(2);
    // The null at 1h is bridged: the first run goes 0h → 2h.
    expect(pathXs(d.split("M")[1]!.replace(/^/, "M")).map(Math.round)).toEqual([xAt(0), xAt(2 / 11)].map(Math.round));
    const lin = render(
      <LineChart
        data={[{ x: 0, y: 1 }, { x: 1, y: null }, { x: 5, y: 2 }]}
        index="x"
        series={[{ key: "y" }]}
        xAxis={{ type: "linear" }}
        connectNulls
      />
    );
    expect(moveCount(lineD(lin.container))).toBe(1);
  });

  it("lets a series override the chart setting", () => {
    const { container } = render(
      <LineChart data={rows} index="day" series={[{ key: "a" }, { key: "b", connectNulls: false }]} connectNulls />
    );
    expect(moveCount(lineD(container, 0))).toBe(1);
    expect(moveCount(lineD(container, 1))).toBe(2);
    const flipped = render(<LineChart data={rows} index="day" series={[{ key: "a" }, { key: "b", connectNulls: true }]} />);
    expect(moveCount(lineD(flipped.container, 0))).toBe(2);
    expect(moveCount(lineD(flipped.container, 1))).toBe(1);
  });

  it("keeps null rows out of hover and keyboard stops but lists them in the table", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn();
    const { container } = render(
      <LineChart data={rows} index="day" series={[{ key: "a" }, { key: "b" }]} connectNulls onActiveIndexChange={onActive} />
    );
    fireEvent.mouseMove(container.querySelector('[data-slot="chart-hit"]')!, { clientX: xAt(1 / 3), clientY: 50 });
    expect(container.querySelector('[data-slot="chart-tooltip"]')!.textContent).not.toContain("Tue");
    expect(onActive).not.toHaveBeenLastCalledWith(1);
    fireEvent.mouseLeave(container.querySelector('[data-slot="chart-hit"]')!);
    screen.getByRole("img", { name: /Line chart/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onActive).toHaveBeenLastCalledWith(0);
    await user.keyboard("{ArrowRight}");
    expect(onActive).toHaveBeenLastCalledWith(2);
    await user.keyboard("{ArrowLeft}");
    expect(onActive).toHaveBeenLastCalledWith(0);
    const tue = Array.from(container.querySelectorAll("table tbody tr")).find((tr) => tr.textContent!.startsWith("Tue"))!;
    expect(Array.from(tue.querySelectorAll("td")).map((td) => td.textContent)).toEqual(["–", "–"]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<LineChart data={rows} index="day" series={[{ key: "a" }]} curve="step" connectNulls />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("yAxis.domain", () => {
  it("matches yAxis min/max, and explicit min/max win", () => {
    const data = [{ x: "a", v: 10 }, { x: "b", v: 20 }];
    const series = [{ key: "v", label: "V" }];
    const a = render(<LineChart data={data} index="x" series={series} yAxis={{ min: 0, max: 100 }} label="A" />);
    const b = render(<LineChart data={data} index="x" series={series} yAxis={{ domain: [0, 100] }} label="B" />);
    const pathOf = (c: HTMLElement) => c.querySelector("path[data-series], path[stroke]:not([stroke='none'])")?.getAttribute("d");
    expect(pathOf(b.container)).toBe(pathOf(a.container));
    const c = render(<LineChart data={data} index="x" series={series} yAxis={{ domain: [0, 100], max: 50 }} label="C" />);
    expect(pathOf(c.container)).not.toBe(pathOf(a.container));
  });
});
