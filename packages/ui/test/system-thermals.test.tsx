import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RiCpuLine } from "@remixicon/react";
import { MetricReadout, MetricReadoutGroup, readoutLevel, joinReadoutUnit } from "../src/primitives/metric-readout";
import {
  FanControl,
  HeatByApp,
  TemperatureReading,
  ThermalSensors,
  celsiusToFahrenheit,
  formatRpm,
  formatTemperature,
  type FanControlFan,
  type ThermalSensor,
} from "../src/kits/system/thermals";
import { Gauge } from "../src/patterns/gauge";
import { axeViolations } from "./helpers/a11y";

/* ------------------------------------------------------------------ */
/* MetricReadout                                                       */
/* ------------------------------------------------------------------ */

describe("readoutLevel", () => {
  it("classifies higher-is-worse and lower-is-worse thresholds", () => {
    const cpu = { warning: 70, danger: 90 };
    expect(readoutLevel(40, cpu)).toBe("normal");
    expect(readoutLevel(70, cpu)).toBe("warning");
    expect(readoutLevel(92, cpu)).toBe("danger");
    const battery = { warning: 20, danger: 10 };
    expect(readoutLevel(50, battery)).toBe("normal");
    expect(readoutLevel(18, battery)).toBe("warning");
    expect(readoutLevel(8, battery)).toBe("danger");
    expect(readoutLevel(NaN, cpu)).toBe("normal");
    expect(readoutLevel(99, false)).toBe("normal");
  });

  it("joins units", () => {
    expect(joinReadoutUnit("92", "%")).toBe("92%");
    expect(joinReadoutUnit("72", "°C")).toBe("72 °C");
    expect(joinReadoutUnit("4.9", undefined)).toBe("4.9");
  });
});

describe("MetricReadout", () => {
  const thresholds = { warning: 70, danger: 90 };

  it("tones by thresholds and writes the accessible text", () => {
    const { container, rerender } = render(<MetricReadout label="CPU" value={42} unit="%" thresholds={thresholds} />);
    const root = container.querySelector('[data-slot="metric-readout"]')!;
    expect(root).toHaveAttribute("data-level", "normal");
    expect(root).toHaveClass("text-foreground");
    expect(screen.getByText("CPU 42%")).toHaveClass("sr-only");

    rerender(<MetricReadout label="CPU" value={75} unit="%" thresholds={thresholds} />);
    expect(root).toHaveAttribute("data-tone", "warning");
    expect(screen.getByText("CPU 75%, high")).toBeInTheDocument();

    rerender(<MetricReadout label="CPU" value={92} unit="%" thresholds={thresholds} statusLabels={{ danger: "high" }} />);
    expect(root).toHaveAttribute("data-level", "danger");
    expect(root).toHaveClass("text-destructive");
    expect(screen.getByText("CPU 92%, high")).toBeInTheDocument();
  });

  it("hides the visual parts from assistive tech and formats numbers", () => {
    const { container } = render(<MetricReadout icon={<RiCpuLine />} label="Fan" value={2400} unit="rpm" locale="en-US" />);
    expect(container.querySelector('[data-slot="metric-readout-value"]')).toHaveTextContent("2,400rpm");
    expect(container.querySelector('[data-slot="metric-readout-icon"]')!.closest("[aria-hidden]")).not.toBeNull();
    expect(screen.getByText("Fan 2,400 rpm")).toBeInTheDocument();
  });

  it("explicit tone wins, pill variant uses soft tone colours, and empty values read as no data", () => {
    const { container, rerender } = render(<MetricReadout variant="pill" label="GPU" value={10} unit="%" thresholds={thresholds} tone="destructive" />);
    const root = container.querySelector('[data-slot="metric-readout"]')!;
    expect(root).toHaveClass("bg-destructive-soft");
    expect(screen.getByText("GPU 10%, critical")).toBeInTheDocument();

    rerender(<MetricReadout variant="pill" label="GPU" value={null} unit="%" />);
    expect(root).toHaveClass("bg-muted");
    expect(container.querySelector('[data-slot="metric-readout-value"]')).toHaveTextContent("—");
    expect(screen.getByText("GPU no data")).toBeInTheDocument();

    rerender(<MetricReadout label="GPU" value={95} unit="%" thresholds={thresholds} statusText="throttling" />);
    expect(screen.getByText("GPU 95%, throttling")).toBeInTheDocument();
  });

  it("renders the trend slot", () => {
    const { container } = render(<MetricReadout label="CPU" value={30} unit="%" trend={<svg data-testid="spark" />} />);
    expect(within(container.querySelector('[data-slot="metric-readout-trend"]') as HTMLElement).getByTestId("spark")).toBeInTheDocument();
  });

  it("groups readouts with separators between them", async () => {
    const { container } = render(
      <MetricReadoutGroup label="System readings">
        <MetricReadout label="CPU" value={92} unit="%" thresholds={thresholds} />
        <MetricReadout label="GPU" value={30} unit="%" />
        {null}
        <MetricReadout label="Fan" value={2400} unit="rpm" />
      </MetricReadoutGroup>
    );
    const group = screen.getByRole("group", { name: "System readings" });
    expect(group.querySelectorAll('[data-slot="metric-readout"]')).toHaveLength(3);
    expect(group.querySelectorAll('[data-slot="metric-readout-separator"]')).toHaveLength(2);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Temperatures                                                        */
/* ------------------------------------------------------------------ */

describe("temperature helpers", () => {
  it("converts and formats", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(formatTemperature(72)).toBe("72 °C");
    expect(formatTemperature(72, { unit: "fahrenheit" })).toBe("162 °F");
    expect(formatTemperature(71.6, { decimals: 1 })).toBe("71.6 °C");
    expect(formatTemperature(null)).toBe("—");
    expect(formatRpm(2400, "en-US")).toBe("2,400 rpm");
    expect(formatRpm(undefined)).toBe("—");
  });
});

describe("TemperatureReading", () => {
  it("colours a meter by thresholds in °C", () => {
    const { container, rerender } = render(<TemperatureReading label="CPU" value={62} />);
    const meter = screen.getByRole("meter", { name: "CPU" });
    expect(meter).toHaveAttribute("aria-valuetext", "62 °C");
    expect(container.querySelector('[data-slot="temperature-reading"]')).toHaveAttribute("data-level", "normal");

    rerender(<TemperatureReading label="CPU" value={86} />);
    expect(meter).toHaveAttribute("aria-valuetext", "86 °C, hot");
    expect(container.querySelector('[data-slot="meter-fill"]')).toHaveClass("bg-warning");

    rerender(<TemperatureReading label="CPU" value={97} />);
    expect(meter).toHaveAttribute("aria-valuetext", "97 °C, critical");
    expect(container.querySelector('[data-slot="meter-fill"]')).toHaveClass("bg-destructive");

    rerender(<TemperatureReading label="CPU" value={86} thresholds={{ warning: 90, danger: 100 }} />);
    expect(container.querySelector('[data-slot="temperature-reading"]')).toHaveAttribute("data-level", "normal");
  });

  it("converts to fahrenheit for display while thresholds stay in °C", () => {
    render(<TemperatureReading label="GPU" value={86} unit="fahrenheit" />);
    const meter = screen.getByRole("meter", { name: "GPU" });
    expect(meter).toHaveAttribute("aria-valuetext", "187 °F, hot");
    expect(Number(meter.getAttribute("aria-valuemin"))).toBe(68);
    expect(Number(meter.getAttribute("aria-valuemax"))).toBe(230);
    expect(screen.getByText("187 °F")).toBeInTheDocument();
  });

  it("draws a gauge variant and a history sparkline", () => {
    render(<TemperatureReading variant="gauge" label="SSD" value={97} history={[60, 70, 80, 97]} />);
    expect(screen.getByRole("meter", { name: "SSD" })).toHaveAttribute("aria-valuetext", "97 °C, critical");
    expect(document.querySelector('[data-slot="gauge-fill"]')).toHaveAttribute("stroke", "var(--destructive)");
    expect(screen.getByRole("img", { name: "SSD temperature history, 97 °C now" })).toBeInTheDocument();
  });
});

describe("ThermalSensors", () => {
  const sensors: ThermalSensor[] = [
    { id: "cpu", label: "CPU", kind: "cpu", value: 72, history: [60, 66, 72] },
    { id: "gpu", label: "GPU", kind: "gpu", value: 88 },
    { id: "ssd", label: "SSD", kind: "ssd", value: 61, thresholds: { warning: 60, danger: 70 } },
    { id: "bat", label: "Battery", kind: "battery", value: null },
  ];

  it("lists sensors with per-sensor thresholds and switches units", async () => {
    const user = userEvent.setup();
    const onUnitChange = vi.fn();
    const { container } = render(<ThermalSensors sensors={sensors} onUnitChange={onUnitChange} />);
    expect(screen.getByRole("heading", { name: "Temperatures" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Temperature sensors" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("meter", { name: "GPU" })).toHaveAttribute("aria-valuetext", "88 °C, hot");
    expect(screen.getByRole("meter", { name: "SSD" })).toHaveAttribute("aria-valuetext", "61 °C, hot");
    expect(screen.getByRole("meter", { name: "Battery" })).toHaveAttribute("aria-valuetext", "No data");

    await user.click(screen.getByRole("radio", { name: "Fahrenheit" }));
    expect(onUnitChange).toHaveBeenCalledWith("fahrenheit");
    expect(screen.getByRole("meter", { name: "CPU" })).toHaveAttribute("aria-valuetext", "162 °F");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows the empty state and the gauge grid", async () => {
    const { rerender, container } = render(<ThermalSensors sensors={[]} />);
    expect(screen.getByText("No temperature sensors")).toBeInTheDocument();
    rerender(<ThermalSensors sensors={sensors} variant="gauge" unit="fahrenheit" />);
    expect(screen.getAllByRole("meter")).toHaveLength(4);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* FanControl                                                          */
/* ------------------------------------------------------------------ */

function ControlledFans({ initial, ...rest }: { initial: FanControlFan[] } & Partial<React.ComponentProps<typeof FanControl>>) {
  const [fans, setFans] = React.useState(initial);
  return (
    <FanControl
      fans={fans}
      locale="en-US"
      onModeChange={(id, mode) => {
        rest.onModeChange?.(id, mode);
        setFans((fs) => fs.map((f) => (f.id === id ? { ...f, mode } : f)));
      }}
      onTargetChange={(id, rpm) => {
        rest.onTargetChange?.(id, rpm);
        setFans((fs) => fs.map((f) => (f.id === id ? { ...f, targetRpm: rpm } : f)));
      }}
      onTargetCommit={rest.onTargetCommit}
      disabled={rest.disabled}
      disabledReason={rest.disabledReason}
    />
  );
}

describe("FanControl", () => {
  const fans: FanControlFan[] = [
    { id: "left", name: "Left fan", rpm: 2380, minRpm: 1200, maxRpm: 5800, mode: "auto" },
    { id: "right", name: "Right fan", rpm: 2420, minRpm: 1200, maxRpm: 5800, mode: "fixed", targetRpm: 3000 },
  ];

  it("shows current speeds and the slider only for fixed fans", () => {
    render(<FanControl fans={fans} locale="en-US" />);
    const list = screen.getByRole("list", { name: "Fans" });
    const [left, right] = within(list).getAllByRole("listitem");
    expect(left).toHaveAccessibleName("Left fan");
    expect(within(left!).getByText("2,380 rpm")).toBeInTheDocument();
    expect(within(left!).queryByRole("slider")).toBeNull();
    const slider = within(right!).getByRole("slider", { name: "Right fan target speed" });
    expect(slider).toHaveAttribute("aria-valuetext", "3,000 rpm");
    expect(within(right!).getByText("Returns to automatic when the app quits")).toBeInTheDocument();
  });

  it("switches mode and reports target changes in steps of 100", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const onTargetChange = vi.fn();
    const onTargetCommit = vi.fn();
    const { container } = render(
      <ControlledFans initial={fans} onModeChange={onModeChange} onTargetChange={onTargetChange} onTargetCommit={onTargetCommit} />
    );
    const leftMode = screen.getByRole("radiogroup", { name: "Left fan mode" });
    await user.click(within(leftMode).getByRole("radio", { name: "Fixed" }));
    expect(onModeChange).toHaveBeenCalledWith("left", "fixed");
    const leftSlider = screen.getByRole("slider", { name: "Left fan target speed" });
    expect(leftSlider).toHaveAttribute("aria-valuetext", "2,400 rpm");

    leftSlider.focus();
    await user.keyboard("{ArrowRight}");
    expect(onTargetChange).toHaveBeenLastCalledWith("left", 2500);
    expect(onTargetCommit).toHaveBeenLastCalledWith("left", 2500);
    expect(leftSlider).toHaveAttribute("aria-valuetext", "2,500 rpm");

    await user.click(within(screen.getByRole("radiogroup", { name: "Right fan mode" })).getByRole("radio", { name: "Automatic" }));
    expect(onModeChange).toHaveBeenLastCalledWith("right", "auto");
    expect(screen.queryByRole("slider", { name: "Right fan target speed" })).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("warns when the target is below the system's need", () => {
    const { rerender } = render(<FanControl locale="en-US" fans={[{ ...fans[1]!, targetRpm: 1500, needRpm: 2400 }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("1,500 rpm is below the 2,400 rpm the system needs right now");
    rerender(<FanControl locale="en-US" fans={[{ ...fans[1]!, targetRpm: 3000, needRpm: 2400 }]} />);
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<FanControl locale="en-US" fans={[{ ...fans[1]!, warning: "Custom warning" }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Custom warning");
  });

  it("disables every control and explains why", async () => {
    const onModeChange = vi.fn();
    const { container } = render(
      <FanControl fans={fans} disabled disabledReason="Install the helper to control fan speeds." onModeChange={onModeChange} />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Install the helper to control fan speeds.");
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.getByRole("slider")).toHaveAttribute("data-disabled");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows the empty state", () => {
    render(<FanControl fans={[]} />);
    expect(screen.getByText("No controllable fans")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* HeatByApp                                                           */
/* ------------------------------------------------------------------ */

describe("HeatByApp", () => {
  it("ranks apps by impact with a header and explanation", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <HeatByApp
        apps={[
          { id: "slack", name: "Slack", impact: 4.2 },
          { id: "chrome", name: "Google Chrome", impact: 38.5, description: "96 processes", onClick },
        ]}
      />
    );
    const items = within(screen.getByRole("list", { name: "Heat by app" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Google Chrome");
    expect(items[0]).toHaveTextContent("38.5");
    expect(screen.getByText("Energy impact")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="heat-by-app-explanation"]')).toHaveTextContent(/Energy impact estimates/);
    await user.click(screen.getByRole("button", { name: /Google Chrome/ }));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: "chrome" }), expect.anything());
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Gauge accent                                                        */
/* ------------------------------------------------------------------ */

describe("Gauge accent", () => {
  const fill = (c: HTMLElement) => c.querySelector('[data-slot="gauge-fill"]')!.getAttribute("stroke");
  const root = (c: HTMLElement) => c.querySelector('[role="meter"]') as HTMLElement;

  it("colours the arc with the accent and sets --sutra-accent on the root", () => {
    const { container } = render(<Gauge value={40} label="CPU" accent="orange" />);
    expect(fill(container)).toBe("var(--sutra-accent, var(--primary))");
    expect(root(container).style.getPropertyValue("--sutra-accent")).toBe("#ff6900");
    expect(root(container).style.width).toBe("112px");
  });

  it("keeps the colour order: colour stops, thresholds, tone, then accent", () => {
    const { container, rerender } = render(<Gauge value={95} label="CPU" accent="orange" />);
    expect(fill(container)).toBe("var(--destructive)");
    rerender(<Gauge value={40} label="CPU" accent="orange" tone="success" />);
    expect(fill(container)).toBe("var(--success)");
    rerender(<Gauge value={40} label="CPU" accent="orange" color="info" />);
    expect(fill(container)).toBe("var(--info)");
    rerender(<Gauge value={95} label="CPU" accent="orange" colorStops={[{ value: 0, color: "#123456" }]} />);
    expect(fill(container)).toBe("#123456");
  });

  it("renders exactly as before without an accent", () => {
    const { container } = render(<Gauge value={40} label="CPU" style={{ opacity: 0.5 }} />);
    expect(fill(container)).toBe("var(--primary)");
    const el = root(container);
    expect(el.style.getPropertyValue("--sutra-accent")).toBe("");
    expect(el.getAttribute("style")).toBe("width: 112px; height: 112px; opacity: 0.5;");
  });

  it("TemperatureReading's gauge uses the accent when normal and colours the value when strained", () => {
    const { container, rerender } = render(<TemperatureReading variant="gauge" label="CPU" value={60} accent="rose" />);
    expect(fill(container)).toBe("var(--sutra-accent, var(--primary))");
    expect(root(container).style.getPropertyValue("--sutra-accent")).toBe("#ff2056");
    rerender(<TemperatureReading variant="gauge" label="CPU" value={86} unit="fahrenheit" accent="rose" />);
    expect(fill(container)).toBe("var(--warning)");
    expect(root(container)).toHaveAttribute("data-level", "warn");
    expect(container.querySelector('[data-slot="gauge-value"]')).toHaveClass("text-warning");
  });
});
