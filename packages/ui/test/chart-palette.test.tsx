import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveCssColor } from "../src/lib/css-color";
import { AreaChart } from "../src/patterns/chart-cartesian";
import { DonutChart } from "../src/patterns/chart-donut";
import { StackedMeter } from "../src/primitives/meter";

afterEach(cleanup);

const style = (vars: Record<string, string>) => ({ getPropertyValue: (n: string) => vars[n] ?? "" });

describe("resolveCssColor", () => {
  it("looks a variable up, falls back to the var() fallback, and resolves nested references", () => {
    expect(resolveCssColor("var(--chart-1, #615fff)", style({ "--chart-1": " #1c1915 " }))).toBe("#1c1915");
    expect(resolveCssColor("var(--chart-1, #615fff)", style({}))).toBe("#615fff");
    expect(resolveCssColor("var(--a, var(--b, red))", style({ "--b": "blue" }))).toBe("blue");
    expect(resolveCssColor("var(--a)", style({ "--a": "var(--b)", "--b": "#123456" }))).toBe("#123456");
    expect(resolveCssColor("var(--a, color-mix(in oklab, red 50%, blue))", style({}))).toBe("color-mix(in oklab, red 50%, blue)");
  });

  it("leaves concrete colours, unresolved variables and loops alone", () => {
    expect(resolveCssColor("#abc", style({}))).toBe("#abc");
    expect(resolveCssColor("rgb(1 2 3)", style({}))).toBe("rgb(1 2 3)");
    expect(resolveCssColor("var(--missing)", style({}))).toBe("var(--missing)");
    expect(resolveCssColor("var(--a)", style({ "--a": "var(--a)" }))).toBe("var(--a)");
  });
});

describe("charts read the themeable palette", () => {
  const days = [
    { day: "Mon", a: 3, b: 1 },
    { day: "Tue", a: 5, b: 2 },
  ];

  it("AreaChart series default to var(--chart-N, hex)", () => {
    const { container } = render(<AreaChart data={days} index="day" series={[{ key: "a" }, { key: "b" }]} />);
    const html = container.innerHTML;
    expect(html).toContain("var(--chart-1, #615fff)");
    expect(html).toContain("var(--chart-2, #00b8db)");
  });

  it("DonutChart and StackedMeter default to the same variables", () => {
    const donut = render(<DonutChart data={[{ user: "A", gb: 4 }, { user: "B", gb: 2 }]} index="user" centerLabel="GB" />);
    expect(donut.container.innerHTML).toContain("var(--chart-1, #615fff)");
    donut.unmount();
    const meter = render(<StackedMeter label="Disk" parts={[{ label: "A", value: 1 }, { label: "B", value: 2 }]} />);
    expect(meter.container.innerHTML).toContain("var(--chart-2, #00b8db)");
  });

  it("an explicit colour still wins", () => {
    const { container } = render(<AreaChart data={days} index="day" series={[{ key: "a", color: "#ff0000" }]} />);
    expect(container.innerHTML).toContain("#ff0000");
    expect(container.innerHTML).not.toContain("var(--chart-1");
  });
});
