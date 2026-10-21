import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuotaBars, QuotaRing, QuotaStrip, type UsageQuota } from "../src/kits/ai/usage-quota";
import { AgentProcessCard, AgentProcessList, type AgentProcessSession } from "../src/kits/agent/agent-processes";
import { ProcessTable, type ProcessInfo } from "../src/kits/ops/process-table";
import { MetricReadout, MetricReadoutGroup } from "../src/primitives/metric-readout";
import { BatteryLevel } from "../src/primitives/battery-level";
import { Meter, StackedMeter } from "../src/primitives/meter";
import { axeViolations } from "./helpers/a11y";

const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

/** Markup with React's generated ids blanked, so two separate renders can be compared. */
function markup(ui: React.ReactElement): string {
  const { container, unmount } = render(ui);
  const html = container.innerHTML.replace(/«[^»]*»|_r_[0-9a-z]+_|:r[0-9a-z]+:/g, "ID");
  unmount();
  return html;
}

/** Without `loading` (omitted or false) the output is unchanged and never busy. */
function expectUnchanged(withoutProp: React.ReactElement, withFalse: React.ReactElement) {
  const a = markup(withoutProp);
  expect(markup(withFalse)).toBe(a);
  expect(a).not.toContain("aria-busy");
  expect(a).not.toContain("Loading");
}

const skeletons = (el: Element) => el.querySelectorAll(".animate-shimmer");

/* ------------------------------------------------------------------ */
/* Quotas                                                              */
/* ------------------------------------------------------------------ */

const claude: UsageQuota = { id: "claude", provider: "Claude", label: "This week", percent: 28 };
const codex: UsageQuota = { id: "codex", provider: "Codex", label: "5-hour session", percent: 60 };

describe("QuotaRing loading", () => {
  it("shows a ring placeholder with the provider and window real when there is no reading", async () => {
    const { container } = render(<QuotaRing provider="Claude" label="This week" loading now={NOW} />);
    const root = container.querySelector('[data-slot="quota-ring"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading Claude quota…")).toHaveClass("sr-only");
    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(root.querySelector('[data-slot="quota-ring-skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("meter")).toBeNull();
    expect(root.querySelector('[data-slot="quota-ring-value"]')).toBeNull();
    expect(skeletons(root).length).toBeGreaterThan(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows placeholders for an unknown provider", () => {
    render(<QuotaRing provider="" label="" loading />);
    expect(screen.getByText("Loading quota…")).toBeInTheDocument();
  });

  it("keeps the reading while refreshing", () => {
    const { container } = render(<QuotaRing provider="Claude" label="This week" percent={28} loading now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "72% left");
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(
      <QuotaRing provider="Claude" label="This week" percent={28} now={NOW} />,
      <QuotaRing provider="Claude" label="This week" percent={28} now={NOW} loading={false} />
    );
  });
});

describe("QuotaStrip loading", () => {
  it("shows loadingRows placeholder rings instead of the empty state", async () => {
    const { container } = render(<QuotaStrip quotas={[]} loading now={NOW} />);
    const root = container.querySelector('[data-slot="quota-strip"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading quotas…")).toHaveClass("sr-only");
    expect(screen.queryByText("No quotas")).toBeNull();
    expect(root.querySelectorAll('[data-slot="quota-strip-skeleton"]')).toHaveLength(4);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("honours loadingRows", () => {
    const { container } = render(<QuotaStrip quotas={[]} loading loadingRows={2} />);
    expect(container.querySelectorAll('[data-slot="quota-strip-skeleton"]')).toHaveLength(2);
  });

  it("keeps the rings while refreshing", () => {
    const { container } = render(<QuotaStrip quotas={[codex]} loading now={NOW} />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Codex")).toBeInTheDocument();
    expect(screen.getByRole("meter")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="quota-strip-skeleton"]')).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<QuotaStrip quotas={[codex]} now={NOW} />, <QuotaStrip quotas={[codex]} now={NOW} loading={false} />);
    expectUnchanged(<QuotaStrip quotas={[]} />, <QuotaStrip quotas={[]} loading={false} />);
  });
});

describe("QuotaBars loading", () => {
  it("shows placeholder bars with no quotas yet", async () => {
    const { container } = render(<QuotaBars quotas={[]} loading />);
    const root = container.querySelector('[data-slot="quota-bars"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading quotas…")).toHaveClass("sr-only");
    expect(root.querySelectorAll('[data-slot="quota-bars-skeleton"]')).toHaveLength(3);
    expect(screen.queryByRole("meter")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows an empty track for a known provider without a reading, and keeps readings", () => {
    const pending: UsageQuota = { id: "copilot", provider: "GitHub Copilot", label: "Premium requests" };
    const { container } = render(<QuotaBars quotas={[codex, pending]} loading />);
    expect(screen.getByRole("meter", { name: "Codex" })).toHaveAttribute("aria-valuetext", "40% left");
    expect(screen.getAllByRole("meter")).toHaveLength(1);
    expect(screen.getByText("Loading GitHub Copilot…")).toBeInTheDocument();
    expect(container.querySelector('[data-quota="copilot"] [data-slot="meter-track"]')).toBeInTheDocument();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<QuotaBars quotas={[claude, codex]} />, <QuotaBars quotas={[claude, codex]} loading={false} />);
  });
});

/* ------------------------------------------------------------------ */
/* Agent processes                                                     */
/* ------------------------------------------------------------------ */

const session: AgentProcessSession = {
  id: "s1",
  agent: "Claude Code",
  title: "Checkout flow tests",
  project: "storefront",
  status: "working",
  startedAt: NOW - 30 * 60_000,
  processes: [
    { pid: 101, name: "vitest", kind: "command", memoryBytes: 500_000_000 },
    { pid: 102, name: "node", kind: "server", port: 3001 },
  ],
};

describe("AgentProcessList loading", () => {
  it("shows placeholder sessions instead of the empty state", async () => {
    const { container } = render(<AgentProcessList sessions={[]} loading now={NOW} onQuit={() => {}} />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading agent sessions…")).toHaveClass("sr-only");
    expect(screen.queryByText("No agent sessions")).toBeNull();
    expect(root.querySelectorAll('[data-slot="agent-process-list-skeleton"]')).toHaveLength(3);
    expect(skeletons(root).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("honours loadingRows", () => {
    const { container } = render(<AgentProcessList sessions={[]} loading loadingRows={1} now={NOW} />);
    expect(container.querySelectorAll('[data-slot="agent-process-list-skeleton"]')).toHaveLength(1);
  });

  it("keeps sessions while refreshing", () => {
    const { container } = render(<AgentProcessList sessions={[session]} loading now={NOW} onQuit={() => {}} />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Checkout flow tests")).toBeInTheDocument();
    expect(screen.getByText("vitest")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quit Session…" })).toBeInTheDocument();
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(
      <AgentProcessList sessions={[session]} now={NOW} />,
      <AgentProcessList sessions={[session]} now={NOW} loading={false} />
    );
    expectUnchanged(<AgentProcessList sessions={[]} now={NOW} />, <AgentProcessList sessions={[]} now={NOW} loading={false} />);
  });
});

describe("AgentProcessCard loading", () => {
  it("is a whole placeholder with no session", async () => {
    const { container } = render(<AgentProcessCard loading now={NOW} />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading agent session…")).toHaveClass("sr-only");
    expect(root.querySelectorAll('[data-slot="agent-process-skeleton"] li')).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders nothing with no session and no loading", () => {
    const { container } = render(<AgentProcessCard now={NOW} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the header and shows process placeholders when processes are not known yet", async () => {
    const pending: AgentProcessSession = { ...session, processes: undefined };
    const { container } = render(<AgentProcessCard session={pending} loading loadingRows={2} now={NOW} onQuit={() => {}} />);
    const root = screen.getByRole("article", { name: "Checkout flow tests" });
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading processes…")).toHaveClass("sr-only");
    expect(screen.queryByText(/Nothing started/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Quit/ })).toBeNull();
    expect(root.querySelectorAll('[data-slot="agent-process-skeleton"] li')).toHaveLength(2);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps the processes while refreshing", () => {
    render(<AgentProcessCard session={session} loading now={NOW} />);
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("node")).toBeInTheDocument();
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<AgentProcessCard session={session} now={NOW} />, <AgentProcessCard session={session} now={NOW} loading={false} />);
  });
});

/* ------------------------------------------------------------------ */
/* ProcessTable                                                        */
/* ------------------------------------------------------------------ */

const procs: ProcessInfo[] = [
  { pid: 1, name: "node", user: "dev", cpu: 12.5, memory: 300_000_000, state: "running", startedAt: NOW - 60_000 },
  { pid: 2, name: "postgres", user: "pg", cpu: 3, memory: 120_000_000, state: "sleeping", startedAt: NOW - 3_600_000 },
];

describe("ProcessTable loading", () => {
  it("keeps the header and shows placeholder rows across the columns, without totals or the empty state", async () => {
    const columns = ["pid", "name", "cpu", "memory"] as const;
    const { container } = render(<ProcessTable processes={[]} columns={[...columns]} loading onKill={() => {}} now={NOW} />);
    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading processes…")).toHaveClass("sr-only");
    expect(screen.queryByText("No processes")).toBeNull();
    expect(screen.getByRole("columnheader", { name: "PID" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "RAM" })).toBeInTheDocument();
    const body = container.querySelector('[data-slot="process-table-skeleton"]')!;
    const rows = body.querySelectorAll("tr");
    expect(rows).toHaveLength(5);
    expect(rows[0]!.querySelectorAll("td")).toHaveLength(columns.length + 1);
    expect(skeletons(rows[0]!)).toHaveLength(columns.length);
    expect(container.querySelector("tfoot")).toBeNull();
    expect(screen.queryByRole("button", { name: /Terminate/ })).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("honours loadingRows and grouping", () => {
    const { container } = render(<ProcessTable processes={[]} loading loadingRows={2} groupBy="app" />);
    expect(container.querySelectorAll('[data-slot="process-table-skeleton"] tr')).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });

  it("keeps rows and totals while refreshing", () => {
    const { container } = render(<ProcessTable processes={procs} loading now={NOW} />);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("postgres")).toBeInTheDocument();
    expect(container.querySelector("[data-totals]")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="process-table-skeleton"]')).toBeNull();
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<ProcessTable processes={procs} now={NOW} />, <ProcessTable processes={procs} now={NOW} loading={false} />);
    expectUnchanged(<ProcessTable processes={[]} now={NOW} />, <ProcessTable processes={[]} now={NOW} loading={false} />);
  });

  it("keeps the KillButton's own loading prop", () => {
    render(<ProcessTable processes={procs} onKill={() => {}} pendingPids={[1]} now={NOW} />);
    expect(screen.getByRole("status")).toHaveTextContent("Killing…");
  });
});

/* ------------------------------------------------------------------ */
/* MetricReadout                                                       */
/* ------------------------------------------------------------------ */

describe("MetricReadout loading", () => {
  it("keeps the label and shows a short value placeholder with no strain colour", async () => {
    const { container } = render(
      <MetricReadoutGroup label="System readings">
        <MetricReadout label="CPU" value={null} unit="%" tone="destructive" loading />
      </MetricReadoutGroup>
    );
    const root = container.querySelector('[data-slot="metric-readout"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("data-tone", "neutral");
    expect(root).toHaveAttribute("data-level", "normal");
    expect(screen.getByText("Loading CPU…")).toHaveClass("sr-only");
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.queryByText("—")).toBeNull();
    expect(root.querySelector('[data-slot="metric-readout-value"]')).toBeNull();
    expect(skeletons(root)).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps the reading while refreshing", () => {
    const { container } = render(<MetricReadout label="CPU" value={92} unit="%" thresholds={{ warning: 70, danger: 90 }} loading />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("data-level", "danger");
    expect(screen.getByText("CPU 92%, critical")).toBeInTheDocument();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<MetricReadout label="CPU" value={null} />, <MetricReadout label="CPU" value={null} loading={false} />);
    expectUnchanged(<MetricReadout label="CPU" value={42} unit="%" />, <MetricReadout label="CPU" value={42} unit="%" loading={false} />);
  });
});

/* ------------------------------------------------------------------ */
/* BatteryLevel                                                        */
/* ------------------------------------------------------------------ */

describe("BatteryLevel loading", () => {
  it.each(["icon", "bar", "text"] as const)("shows a %s placeholder with no value", async (variant) => {
    const { container } = render(<BatteryLevel loading variant={variant} />);
    const root = container.querySelector('[data-slot="battery-level"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("data-state", "loading");
    expect(screen.getByText("Loading battery level…")).toHaveClass("sr-only");
    expect(screen.queryByText("—")).toBeNull();
    expect(root.querySelector('[data-slot="battery-level-fill"]')).toBeNull();
    expect(skeletons(root)).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps the reading while refreshing", () => {
    render(<BatteryLevel value={42} loading />);
    const img = screen.getByRole("img", { name: "42% battery" });
    expect(img).toHaveAttribute("aria-busy", "true");
    expect(within(img).getByText("42%")).toBeInTheDocument();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<BatteryLevel value={null} />, <BatteryLevel value={null} loading={false} />);
    expectUnchanged(<BatteryLevel value={8} variant="bar" />, <BatteryLevel value={8} variant="bar" loading={false} />);
  });
});

/* ------------------------------------------------------------------ */
/* Meter / StackedMeter                                                */
/* ------------------------------------------------------------------ */

describe("Meter loading", () => {
  it("shows a muted track with no fill and a value placeholder", async () => {
    const { container } = render(<Meter label="CPU" value={null} loading />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading CPU…")).toHaveClass("sr-only");
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.queryByText("—")).toBeNull();
    expect(screen.queryByRole("meter")).toBeNull();
    expect(root.querySelector('[data-slot="meter-fill"]')).toBeNull();
    expect(root.querySelector('[data-slot="meter-track"]')).toBeInTheDocument();
    expect(skeletons(root)).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("draws empty segments", () => {
    const { container } = render(<Meter value={null} segments={6} loading />);
    expect(container.querySelectorAll('[data-slot="meter-track"] > span')).toHaveLength(6);
    expect(container.querySelector('[data-slot="meter-segment"]')).toBeNull();
    expect(screen.getByText("Loading usage…")).toBeInTheDocument();
  });

  it("keeps the reading while refreshing", () => {
    const { container } = render(<Meter label="CPU" value={62} loading />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("meter", { name: "CPU" })).toHaveAttribute("aria-valuenow", "62");
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<Meter label="CPU" value={null} />, <Meter label="CPU" value={null} loading={false} />);
    expectUnchanged(<Meter label="RAM" value={62} max={80} unit="GB" />, <Meter label="RAM" value={62} max={80} unit="GB" loading={false} />);
  });
});

describe("StackedMeter loading", () => {
  const parts = [
    { label: "Apps", value: 120 },
    { label: "System", value: 40 },
  ];

  it("shows a muted track and inline legend placeholders", async () => {
    const { container } = render(<StackedMeter label="Storage" parts={[]} max={500} loading />);
    const root = screen.getByRole("group", { name: "Storage" });
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading Storage…")).toHaveClass("sr-only");
    expect(screen.queryByRole("img")).toBeNull();
    expect(root.querySelector('[data-slot="stacked-meter-track"]')).toBeInTheDocument();
    expect(root.querySelectorAll('[data-slot="stacked-meter-legend-skeleton"] li')).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows list legend placeholders, and none when the legend is off", () => {
    const { container, rerender } = render(<StackedMeter parts={[]} legend="list" loading />);
    expect(container.querySelectorAll('[data-slot="stacked-meter-legend-skeleton"] li')).toHaveLength(3);
    expect(screen.getByText("Loading breakdown…")).toBeInTheDocument();
    rerender(<StackedMeter parts={[]} legend={false} loading />);
    expect(container.querySelector('[data-slot="stacked-meter-legend-skeleton"]')).toBeNull();
  });

  it("keeps the parts while refreshing", () => {
    render(<StackedMeter label="Storage" parts={parts} loading />);
    expect(screen.getByRole("group", { name: "Storage" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Apps 120, System 40");
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it("is unchanged without loading", () => {
    expectUnchanged(<StackedMeter label="Storage" parts={parts} />, <StackedMeter label="Storage" parts={parts} loading={false} />);
    expectUnchanged(<StackedMeter parts={[]} />, <StackedMeter parts={[]} loading={false} />);
  });
});
