import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VolumeMixer, type VolumeMixerApp } from "../src/kits/system/volume-mixer";
import { DeviceBatteryList, type BatteryDevice } from "../src/kits/system/device-battery";
import { DevServerList } from "../src/kits/system/dev-servers";
import { ContainerList, ContainerSummary, type ContainerInfo } from "../src/kits/system/containers";
import { FanControl, HeatByApp, ThermalSensors, type FanControlFan, type ThermalSensor } from "../src/kits/system/thermals";
import { AlertRuleList } from "../src/kits/system/alert-rules";
import { createAlertRule } from "../src/lib/alert-rules";
import type { DevServerProject } from "../src/lib/system-monitor";
import { axeViolations } from "./a11y";

const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

const apps: VolumeMixerApp[] = [{ id: "music", name: "Music", volume: 60, playing: true }];
const devices: BatteryDevice[] = [{ id: "kb", name: "Magic Keyboard", kind: "keyboard", battery: 80 }];
const projects: DevServerProject[] = [
  { id: "web", name: "web-app", runtime: "node", ports: [3000], memoryBytes: 450e6, state: "running", idleSince: NOW - 3 * 3600_000 },
];
const containers: ContainerInfo[] = [
  { id: "db", name: "postgres", image: "postgres:16", group: "shop", state: "running", startedAt: NOW - 3600_000, ports: [5432], cpu: 2, memoryBytes: 120e6 },
];
const sensors: ThermalSensor[] = [{ id: "cpu", label: "CPU", kind: "cpu", value: 60 }];
const fans: FanControlFan[] = [{ id: "left", name: "Left fan", rpm: 2400, minRpm: 1200, maxRpm: 6000, mode: "auto" }];
const heat = [{ id: "chrome", name: "Chrome", impact: 42 }];
const rule = { ...createAlertRule("cpu"), id: "r1", label: "Busy CPU" };

interface Case {
  name: string;
  slot: string;
  loadingText: string;
  /** Text only the empty state shows. */
  emptyText: string;
  /** Text only the loaded state shows. */
  dataText: string;
  empty: (loading?: boolean) => React.ReactElement;
  data: (loading?: boolean) => React.ReactElement;
  /** Focusable controls allowed in the skeleton state (a radio group counts once: the °C/°F switch). */
  allowedControls?: number;
}

const cases: Case[] = [
  {
    name: "VolumeMixer",
    slot: "volume-mixer",
    loadingText: "Loading audio…",
    emptyText: "No apps using audio",
    dataText: "Music",
    empty: (loading) => <VolumeMixer apps={[]} loading={loading} />,
    data: (loading) => <VolumeMixer apps={apps} devices={[{ id: "mbp", name: "MacBook Speakers" }]} loading={loading} />,
  },
  {
    name: "DeviceBatteryList",
    slot: "device-battery-list",
    loadingText: "Loading devices…",
    emptyText: "No Bluetooth devices",
    dataText: "Magic Keyboard",
    empty: (loading) => <DeviceBatteryList devices={[]} loading={loading} />,
    data: (loading) => <DeviceBatteryList devices={devices} loading={loading} />,
  },
  {
    name: "DevServerList",
    slot: "dev-server-list",
    loadingText: "Loading dev servers…",
    emptyText: "No dev servers running",
    dataText: "web-app",
    empty: (loading) => <DevServerList projects={[]} now={NOW} onStop={() => {}} onStopIdle={() => {}} loading={loading} />,
    data: (loading) => <DevServerList projects={projects} now={NOW} onStop={() => {}} onStopIdle={() => {}} loading={loading} />,
  },
  {
    name: "ContainerList",
    slot: "container-list",
    loadingText: "Loading containers…",
    emptyText: "No containers",
    dataText: "postgres",
    empty: (loading) => <ContainerList containers={[]} now={NOW} onStop={() => {}} loading={loading} />,
    data: (loading) => <ContainerList containers={containers} now={NOW} onStop={() => {}} loading={loading} />,
  },
  {
    name: "ContainerSummary",
    slot: "container-summary",
    loadingText: "Loading containers…",
    emptyText: "0 containers in Docker",
    dataText: "1 container in Docker",
    empty: (loading) => <ContainerSummary containers={[]} loading={loading} />,
    data: (loading) => <ContainerSummary containers={containers} loading={loading} />,
  },
  {
    name: "ThermalSensors",
    slot: "thermal-sensors",
    loadingText: "Loading temperatures…",
    emptyText: "No temperature sensors",
    dataText: "CPU",
    empty: (loading) => <ThermalSensors sensors={[]} onUnitChange={() => {}} loading={loading} />,
    data: (loading) => <ThermalSensors sensors={sensors} onUnitChange={() => {}} loading={loading} />,
    allowedControls: 1,
  },
  {
    name: "FanControl",
    slot: "fan-control",
    loadingText: "Loading fans…",
    emptyText: "No controllable fans",
    dataText: "Left fan",
    empty: (loading) => <FanControl fans={[]} loading={loading} />,
    data: (loading) => <FanControl fans={fans} loading={loading} />,
  },
  {
    name: "HeatByApp",
    slot: "heat-by-app",
    loadingText: "Loading Heat by app…",
    emptyText: "No apps adding heat",
    dataText: "Chrome",
    empty: (loading) => <HeatByApp apps={[]} loading={loading} />,
    data: (loading) => <HeatByApp apps={heat} loading={loading} />,
  },
  {
    name: "AlertRuleList",
    slot: "alert-rule-list",
    loadingText: "Loading alerts…",
    emptyText: "No alerts yet",
    dataText: "Busy CPU",
    empty: (loading) => <AlertRuleList rules={[]} loading={loading} />,
    data: (loading) => <AlertRuleList rules={[rule]} loading={loading} />,
  },
];

const root = (container: HTMLElement, slot: string) => container.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
/** Strip generated ids so two renders can be compared. */
const normalize = (html: string) => html.replace(/\s(id|for|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g, "");
const controls = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('button, a[href], input, select, textarea, [role="slider"], [role="switch"], [tabindex="0"]')).filter(
    (n) => !n.parentElement?.closest('[role="radiogroup"]')
  ).length;

describe.each(cases)("$name loading", (c) => {
  it("shows skeletons, aria-busy and hidden loading text when loading with no data", () => {
    const { container } = render(c.empty(true));
    const el = root(container, c.slot);
    expect(el).toHaveAttribute("aria-busy", "true");
    const text = screen.getByText(c.loadingText);
    expect(text).toHaveClass("sr-only");
    expect(text.closest("[aria-live]")).toBeNull();
    expect(el.querySelectorAll(".animate-shimmer").length).toBeGreaterThan(0);
    expect(controls(el)).toBe(c.allowedControls ?? 0);
  });

  it("never shows the empty state while loading", () => {
    render(c.empty(true));
    expect(screen.queryByText(c.emptyText)).toBeNull();
  });

  it("keeps the data and only marks the root busy when loading with data", () => {
    const { container } = render(c.data(true));
    const el = root(container, c.slot);
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByText(c.dataText).length).toBeGreaterThan(0);
    expect(screen.queryByText(c.loadingText)).toBeNull();
    expect(el.querySelectorAll(".animate-shimmer")).toHaveLength(0);
  });

  it("renders the same without `loading` as with loading={false}", () => {
    const a = render(c.data());
    const b = render(c.data(false));
    expect(root(a.container, c.slot)).not.toHaveAttribute("aria-busy");
    expect(normalize(a.container.innerHTML)).toBe(normalize(b.container.innerHTML));
    const e1 = render(c.empty());
    const e2 = render(c.empty(false));
    expect(normalize(e1.container.innerHTML)).toBe(normalize(e2.container.innerHTML));
    expect(screen.getAllByText(c.emptyText).length).toBeGreaterThan(0);
  });

  it("passes axe in the loading state", async () => {
    const { container } = render(c.empty(true));
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("component specifics", () => {
  it("VolumeMixer keeps the Output label and column headers real", () => {
    const { container } = render(<VolumeMixer apps={[]} loading loadingRows={2} />);
    expect(screen.getByText("Output")).toBeInTheDocument();
    for (const h of ["App", "Status", "Volume", "Level"]) expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="volume-mixer-skeleton-row"]')).toHaveLength(2);
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("DevServerList shows port-chip and pill placeholders and no idle banner", () => {
    const { container } = render(<DevServerList projects={[]} loading loadingRows={4} />);
    expect(container.querySelectorAll('[data-slot="dev-server-skeleton-row"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-slot="dev-server-skeleton-port"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-slot="dev-server-skeleton-pill"]')).toHaveLength(4);
    expect(container.querySelector('[data-slot="dev-server-idle-banner"]')).toBeNull();
  });

  it("ContainerList shows a group header and container row placeholders", () => {
    const { container } = render(<ContainerList containers={[]} loading />);
    expect(container.querySelectorAll('[data-slot="container-skeleton-group"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="container-skeleton-row"]')).toHaveLength(3);
  });

  it("ContainerSummary renders the four tiles as loading StatCards", () => {
    const { container } = render(<ContainerSummary containers={[]} loading />);
    expect(container.querySelector('[data-slot="container-summary-skeleton"]')).not.toBeNull();
    const tiles = container.querySelectorAll('[data-slot^="container-summary-"][aria-busy="true"]');
    expect(tiles).toHaveLength(4);
    expect(screen.getByText("Closest to Its Limit")).toBeInTheDocument();
  });

  it("ThermalSensors keeps the unit toggle and draws gauge placeholders in the gauge variant", () => {
    const { container } = render(<ThermalSensors sensors={[]} variant="gauge" onUnitChange={() => {}} loading loadingRows={2} />);
    expect(screen.getByRole("radiogroup", { name: "Temperature unit" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="thermal-sensors-skeleton"]')).toHaveLength(2);
  });

  it("FanControl shows rpm placeholders and no mode control or slider", () => {
    const { container } = render(<FanControl fans={[]} loading disabled disabledReason="Install the helper" />);
    expect(container.querySelectorAll('[data-slot="fan-control-skeleton-rpm"]')).toHaveLength(2);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByText("Install the helper")).toBeInTheDocument();
  });

  it("HeatByApp passes loadingRows to BarList", () => {
    const { container } = render(<HeatByApp apps={[]} loading loadingRows={2} />);
    expect(container.querySelector('[data-slot="bar-list"]')).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll('[data-slot="bar-list-skeleton"] > div')).toHaveLength(2);
  });

  it("AlertRuleList hides the presets and the add button while loading", () => {
    const { container } = render(<AlertRuleList rules={[]} loading />);
    expect(screen.queryByRole("list", { name: "Suggested alerts" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Add alert/ })).toBeNull();
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="alert-rule-skeleton-row"]')).toHaveLength(3);
  });

  it("DeviceBatteryList shows a summary placeholder and device rows", () => {
    const { container } = render(<DeviceBatteryList devices={[]} loading />);
    expect(screen.queryByText("0 connected")).toBeNull();
    expect(screen.queryByText("No devices connected.")).toBeNull();
    expect(container.querySelectorAll('[data-slot="device-battery-skeleton"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-slot="device-battery-skeleton-row"]')).toHaveLength(3);
  });
});
