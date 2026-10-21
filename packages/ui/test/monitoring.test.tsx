import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CalendarHeatmap, HeatmapGrid, calendarHeatmapLayout, heatmapColor, heatmapLevel } from "../src/patterns/heatmap";
import { TimelineBar, UptimeBar, formatTimelineDuration, timelinePosition, timelineTicks, uptimePercent } from "../src/patterns/timeline-bar";
import { GpuCard, NodeCard, NodeGrid, ResourceHero } from "../src/kits/ops/node-card";
import { ProcessTable, sortProcesses, formatProcessBytes, type ProcessInfo } from "../src/kits/ops/process-table";
import { AlertGroup, sortAlerts, summarizeAlerts, type AlertItem } from "../src/kits/ops/alert-group";
import { JsonInline, JsonViewer, formatJsonPath, safeJsonStringify } from "../src/patterns/json-viewer";
import {
  RequestInspector,
  RequestLogTable,
  describeRequestLog,
  filterRequestLogs,
  formatRequestLatency,
  type RequestLogRecord,
} from "../src/kits/ops/request-inspector";
import { DownloadBadge, ModelStatePill, ModelTable, modelActionsFor, modelFamily, type ModelInfo } from "../src/kits/ops/model-row";
import { Terminal, TerminalSessionPicker, getTerminalTheme, type TerminalHandle } from "../src/kits/terminal/terminal";
import { axeViolations } from "./helpers/a11y";

/* ------------------------------------------------------------------ */
/* xterm mock (the component imports it dynamically)                   */
/* ------------------------------------------------------------------ */

const xterm = vi.hoisted(() => ({
  instances: [] as {
    options: Record<string, unknown>;
    themeSets: unknown[];
    write: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
    loadAddon: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    emitData: (d: string) => void;
  }[],
  fits: [] as { fit: ReturnType<typeof vi.fn> }[],
}));

vi.mock("@xterm/xterm", () => {
  class Terminal {
    cols = 80;
    rows = 24;
    themeSets: unknown[] = [];
    options: Record<string, unknown>;
    write = vi.fn();
    writeln = vi.fn();
    clear = vi.fn();
    reset = vi.fn();
    focus = vi.fn();
    dispose = vi.fn();
    open = vi.fn();
    loadAddon = vi.fn();
    private dataCb: ((d: string) => void) | null = null;
    onData = vi.fn((cb: (d: string) => void) => {
      this.dataCb = cb;
      return { dispose: vi.fn() };
    });
    onResize = vi.fn(() => ({ dispose: vi.fn() }));
    emitData = (d: string) => this.dataCb?.(d);
    constructor(opts: Record<string, unknown>) {
      const sets = this.themeSets;
      this.options = new Proxy(
        { ...opts },
        {
          set(target, key, value) {
            (target as Record<string | symbol, unknown>)[key] = value;
            if (key === "theme") sets.push(value);
            return true;
          },
        }
      );
      xterm.instances.push(this as never);
    }
  }
  return { Terminal };
});

vi.mock("@xterm/addon-fit", () => {
  class FitAddon {
    fit = vi.fn();
    constructor() {
      xterm.fits.push(this as never);
    }
  }
  return { FitAddon };
});

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

/* ------------------------------------------------------------------ */
/* HeatmapGrid                                                         */
/* ------------------------------------------------------------------ */

describe("heatmap color scale", () => {
  it("maps values to discrete levels", () => {
    expect(heatmapLevel(null)).toBe(-1);
    expect(heatmapLevel(0)).toBe(0);
    expect(heatmapLevel(10)).toBe(1);
    expect(heatmapLevel(50)).toBe(2);
    expect(heatmapLevel(100)).toBe(4);
    expect(heatmapLevel(500, 0, 100)).toBe(4);
  });
  it("uses token color-mix steps, thresholds and custom stops", () => {
    expect(heatmapColor(0)).toBe("var(--muted)");
    expect(heatmapColor(100)).toBe("var(--primary)");
    expect(heatmapColor(10)).toContain("color-mix(in oklab, var(--primary) 30%");
    expect(heatmapColor(60, { scale: "success" })).toContain("var(--success)");
    expect(heatmapColor(95, { scale: "thresholds" })).toBe("var(--destructive)");
    expect(heatmapColor(80, { scale: "thresholds" })).toBe("var(--warning)");
    const stops = [
      { value: 0, color: "blue" },
      { value: 50, color: "orange" },
      { value: 90, color: "red" },
    ];
    expect(heatmapColor(49, { colorStops: stops })).toBe("blue");
    expect(heatmapColor(50, { colorStops: stops })).toBe("orange");
    expect(heatmapColor(99, { colorStops: stops })).toBe("red");
    expect(heatmapColor(null)).toBe("transparent");
  });
});

describe("HeatmapGrid", () => {
  const cores = Array.from({ length: 20 }, (_, i) => i * 5);

  it("lays cells out in rows of `columns` with levels", async () => {
    const { container } = render(<HeatmapGrid data={cores} columns={10} label="CPU cores" cellLabel={(i) => `Core ${i}`} legend />);
    const grid = screen.getByRole("grid", { name: "CPU cores" });
    expect(within(grid).getAllByRole("row")).toHaveLength(2);
    const cells = within(grid).getAllByRole("gridcell");
    expect(cells).toHaveLength(20);
    expect(cells[0]).toHaveAttribute("data-level", "0");
    expect(cells[19]).toHaveAttribute("data-level", "4");
    expect(cells[3]).toHaveAccessibleName("Core 3: 15%");
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("supports arrow / Home / End navigation with roving tabindex and tooltip", () => {
    const onCellClick = vi.fn();
    const { container } = render(<HeatmapGrid data={cores} columns={10} cellLabel={(i) => `Core ${i}`} onCellClick={onCellClick} />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells[0]).toHaveAttribute("tabindex", "0");
    expect(cells[1]).toHaveAttribute("tabindex", "-1");
    act(() => cells[0].focus());
    expect(container.querySelector("[data-heatmap-tooltip]")).toHaveTextContent("Core 0: 0%");
    fireEvent.keyDown(cells[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(cells[1]);
    fireEvent.keyDown(cells[1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(cells[11]);
    expect(cells[11]).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(cells[11], { key: "End" });
    expect(document.activeElement).toBe(cells[19]);
    fireEvent.keyDown(cells[19], { key: "Home" });
    expect(document.activeElement).toBe(cells[10]);
    fireEvent.keyDown(cells[10], { key: "ArrowUp" });
    expect(document.activeElement).toBe(cells[0]);
    fireEvent.keyDown(cells[0], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(cells[0]);
    fireEvent.keyDown(cells[0], { key: "Enter" });
    expect(onCellClick).toHaveBeenCalledWith({ value: 0 }, 0);
  });

  it("renders fill bars for the core-grid shape", () => {
    const { container } = render(<HeatmapGrid data={[50, 95, null]} shape="bar" columns={3} />);
    const fills = container.querySelectorAll("[role=gridcell] > span");
    expect((fills[0] as HTMLElement).style.height).toBe("50%");
    expect((fills[1] as HTMLElement).style.backgroundColor).toBe("var(--destructive)");
    expect(screen.getAllByRole("gridcell")[2]).toHaveAccessibleName("Cell 2: no data");
  });
});

/* ------------------------------------------------------------------ */
/* CalendarHeatmap                                                     */
/* ------------------------------------------------------------------ */

describe("CalendarHeatmap", () => {
  it("year mode: 53 week columns ending on endDate, with month labels and totals", async () => {
    const data = [
      { date: "2026-10-03", value: 12 },
      { date: "2026-10-03", value: 3 },
      { date: "2026-01-10", value: 4 },
      { date: "2020-01-01", value: 99 },
    ];
    const { container } = render(<CalendarHeatmap data={data} endDate="2026-10-17" locale="en-US" unit="sessions" />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(52 * 7 + 7);
    const dates = cells.map((c) => c.getAttribute("data-date")!).sort();
    expect(dates[0]).toBe("2025-10-12");
    expect(dates[dates.length - 1]).toBe("2026-10-17");
    const oct3 = cells.find((c) => c.getAttribute("data-date") === "2026-10-03")!;
    expect(oct3.getAttribute("aria-label")).toMatch(/^15 sessions on Oct 3/);
    expect(oct3).toHaveAttribute("data-level", "4");
    expect(container.querySelector("[data-calendar-total]")).toHaveTextContent("19 sessions in the last year");
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("layout helper aligns weeks to weekStartsOn", () => {
    const sun = calendarHeatmapLayout("month", new Date(2026, 9, 15), 0);
    expect(sun.weeks).toHaveLength(5);
    expect(sun.weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(sun.weeks[0][4]?.getDate()).toBe(1);
    const mon = calendarHeatmapLayout("month", new Date(2026, 9, 15), 1);
    expect(mon.weeks[0][3]?.getDate()).toBe(1);
  });

  it("month mode navigates between months and shows day numbers", async () => {
    const onMonthChange = vi.fn();
    const { container } = render(
      <CalendarHeatmap mode="month" defaultMonth={new Date(2026, 9, 1)} locale="en-US" data={[{ date: "2026-09-02", value: 5 }]} onMonthChange={onMonthChange} />
    );
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(31);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 8, 1));
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(30);
    const sep2 = screen.getAllByRole("gridcell").find((c) => c.getAttribute("data-date") === "2026-09-02")!;
    expect(sep2).toHaveTextContent("2");
    expect(sep2.getAttribute("aria-label")).toMatch(/^5 on Sep 2/);
    expect(container.querySelector("[data-calendar-total]")).toHaveTextContent("5 in September 2026");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* TimelineBar / UptimeBar                                             */
/* ------------------------------------------------------------------ */

describe("TimelineBar", () => {
  const from = new Date(2026, 9, 17, 8, 0).getTime();
  const to = from + 4 * 3600_000;
  const at = (min: number) => from + min * 60_000;

  it("computes percent positions, clipping and open spans", () => {
    expect(timelinePosition({ start: at(60), end: at(120) }, from, to)).toMatchObject({ left: 25, width: 25 });
    expect(timelinePosition({ start: at(-60), end: at(60) }, from, to)).toMatchObject({ left: 0, width: 25, clippedStart: true });
    expect(timelinePosition({ start: at(300), end: at(360) }, from, to)).toBeNull();
    expect(timelinePosition({ start: at(180), live: true }, from, to, at(216))).toMatchObject({ left: 75, width: 15 });
    expect(timelineTicks(0, 100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(formatTimelineDuration(150 * 60_000)).toBe("2h 30m");
    expect(formatTimelineDuration(45_000)).toBe("45s");
    expect(formatTimelineDuration(26 * 3600_000)).toBe("1d 2h");
  });

  it("renders lanes, a live span and a tick axis", async () => {
    const onSpanClick = vi.fn();
    const { container } = render(
      <TimelineBar
        from={from}
        to={to}
        now={at(216)}
        ticks={4}
        tickFormatter={(d) => `${d.getHours()}h`}
        lanes={[
          { id: "a", label: "node-a", spans: [{ id: "s1", start: at(60), end: at(120), label: "train", tone: "success" }] },
          { id: "b", label: "node-b", spans: [{ id: "s2", start: at(180), live: true, label: "jupyter" }] },
        ]}
      />
    );
    const items = container.querySelectorAll("[role=listitem]");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-left", "25.00");
    expect(items[0]).toHaveAttribute("data-width", "25.00");
    expect((items[0] as HTMLElement).style.left).toBe("25%");
    expect(items[1]).toHaveAttribute("data-live", "true");
    expect(items[1]).toHaveAttribute("data-width", "15.00");
    expect(screen.getByRole("img", { name: /train: .* \(1h\)/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /jupyter: .* – now \(36m, live\)/ })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "node-a" })).toBeInTheDocument();
    for (const h of ["8h", "9h", "10h", "11h", "12h"]) expect(screen.getByText(h)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    render(<TimelineBar from={from} to={to} spans={[{ start: at(0), end: at(30), label: "x" }]} onSpanClick={onSpanClick} />);
    fireEvent.click(screen.getByRole("button", { name: /x: / }));
    expect(onSpanClick).toHaveBeenCalledWith(expect.objectContaining({ label: "x" }), undefined);
  });
});

describe("UptimeBar", () => {
  it("computes uptime over known buckets (degraded counts as up)", () => {
    expect(uptimePercent(["up", "up", "down", "no-data", "degraded"])).toBe(75);
    expect(uptimePercent(["no-data"])).toBeNull();
  });

  it("renders buckets and a summary", async () => {
    const { container } = render(
      <UptimeBar label="Gateway" buckets={["up", "up", "down", "no-data", { status: "degraded", label: "Oct 3" }]} startLabel="5 days ago" endLabel="Today" />
    );
    expect(container.querySelector("[data-uptime-percent]")).toHaveTextContent("75% uptime");
    expect(container.querySelectorAll("[data-status]")).toHaveLength(5);
    expect(screen.getByRole("img", { name: "Gateway: 75% uptime over 5 periods, 1 down, 1 degraded" })).toBeInTheDocument();
    fireEvent.mouseEnter(container.querySelectorAll("[data-status]")[4]);
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* NodeCard / GpuCard / ResourceHero                                   */
/* ------------------------------------------------------------------ */

describe("NodeCard", () => {
  it("renders an online node with metric tiles, badges and a core grid", async () => {
    const { container } = render(
      <NodeGrid>
        <NodeCard
          name="dilab-01"
          description="10.0.0.11"
          badges={<span>Priority</span>}
          status="online"
          uptime="12d 4h"
          cpu={42}
          ram={{ used: 48, total: 64 }}
          gpu={91}
          vram={{ used: 20, total: 24 }}
          coreGrid={<HeatmapGrid data={[10, 20]} shape="bar" columns={2} label="Cores" />}
          footer={<button type="button">Details</button>}
        />
      </NodeGrid>
    );
    const card = screen.getByRole("group", { name: "dilab-01" });
    expect(card).toHaveAttribute("data-status", "online");
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "CPU" })).toHaveAttribute("aria-valuetext", "42%");
    expect(screen.getByRole("meter", { name: "RAM" })).toHaveAttribute("aria-valuetext", "48 / 64 GB");
    expect(screen.getByRole("meter", { name: "GPU" })).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("91%")).toHaveClass("text-destructive");
    expect(screen.getByRole("grid", { name: "Cores" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows a skeleton while connecting", () => {
    const { container } = render(<NodeCard name="n2" status="connecting" cpu={null} ram={null} />);
    expect(screen.getByRole("group", { name: "n2" })).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector("[data-node-skeleton]")).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });

  it("shows the error state with retry", async () => {
    const onRetry = vi.fn();
    const { container } = render(<NodeCard name="n3" status="error" error="ssh: timeout" onRetry={onRetry} cpu={1} />);
    expect(screen.getByRole("alert")).toHaveTextContent("ssh: timeout");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("replaces GPU tiles on a node without GPU", () => {
    render(<NodeCard name="cpu-box" status="offline" cpu={3} ram={20} gpu={5} vram={{ used: 1, total: 2 }} noGpu />);
    expect(screen.getByText("No GPU on this node")).toBeInTheDocument();
    expect(screen.queryByRole("meter", { name: "GPU" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(2);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});

describe("GpuCard & ResourceHero", () => {
  it("GpuCard shows VRAM, utilization, temperature and processes", async () => {
    const { container } = render(<GpuCard index={1} model="RTX A6000" memoryUsed={12} memoryTotal={48} utilization={64} temperature={88} processes={3} power={250} powerLimit={300} />);
    expect(screen.getByRole("group", { name: "GPU 1" })).toBeInTheDocument();
    expect(screen.getByText("RTX A6000")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "VRAM" })).toHaveAttribute("aria-valuetext", "12 / 48 GB");
    expect(screen.getByRole("meter", { name: "Utilization" })).toHaveAttribute("aria-valuenow", "64");
    expect(screen.getByRole("meter", { name: "Temp" })).toHaveAttribute("aria-valuetext", "88 °C");
    expect(container.querySelector("[data-gpu-processes]")).toHaveTextContent("3 processes");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ResourceHero copies the endpoint and shows readiness", async () => {
    const writeText = mockClipboard();
    const { container } = render(
      <ResourceHero name="model-gateway" endpoint="http://gpu-01:8000/v1" uptime="3d 2h" ready={{ ready: 2, total: 3, noun: "models ready" }} chips={[{ label: "TP", value: "2" }]} />
    );
    expect(screen.getByRole("heading", { name: "model-gateway" })).toBeInTheDocument();
    expect(container.querySelector("[data-ready]")).toHaveTextContent("2 of 3models ready");
    fireEvent.click(screen.getByRole("button", { name: "Copy endpoint" }));
    expect(writeText).toHaveBeenCalledWith("http://gpu-01:8000/v1");
    await screen.findByRole("button", { name: "Endpoint copied" });
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ProcessTable                                                        */
/* ------------------------------------------------------------------ */

const procs: ProcessInfo[] = [
  { pid: 1234, name: "python", command: "python train.py --epochs 100 --lr 3e-4", user: "alice", cpu: 87.5, memory: 4 * 1024 ** 3, vram: 10 * 1024 ** 3, gpuIndex: 0, state: "running" },
  { pid: 99, name: "sshd", user: "root", cpu: 0.2, memory: 8 * 1024 ** 2, state: "sleeping" },
  { pid: 5678, name: "jupyter", user: "bob", cpu: 12.3, memory: 1024 ** 3, state: "sleeping" },
];

describe("ProcessTable", () => {
  const pidsInOrder = (container: HTMLElement) =>
    [...container.querySelectorAll("tbody tr[data-pid]")].map((r) => Number(r.getAttribute("data-pid")));

  it("sorts by CPU desc by default and toggles column sorting", () => {
    const { container } = render(<ProcessTable processes={procs} />);
    expect(pidsInOrder(container)).toEqual([1234, 5678, 99]);
    fireEvent.click(screen.getByRole("button", { name: "PID" }));
    expect(pidsInOrder(container)).toEqual([5678, 1234, 99]);
    fireEvent.click(screen.getByRole("button", { name: "PID" }));
    expect(pidsInOrder(container)).toEqual([99, 1234, 5678]);
    fireEvent.click(screen.getByRole("button", { name: "User" }));
    expect(pidsInOrder(container)).toEqual([1234, 5678, 99]);
    expect(sortProcesses(procs, { key: "memory", direction: "desc" }).map((p) => p.pid)).toEqual([1234, 5678, 99]);
  });

  it("renders a totals row and formatted values", () => {
    const { container } = render(<ProcessTable processes={procs} />);
    const totals = container.querySelector("tfoot tr[data-totals]")!;
    expect(totals).toHaveTextContent("3 processes");
    expect(totals).toHaveTextContent("100.0%");
    expect(totals).toHaveTextContent("5 GB");
    expect(totals).toHaveTextContent("10 GB");
    expect(formatProcessBytes(1536)).toBe("1.5 KB");
    expect(screen.getAllByText("python train.py --epochs 100 --lr 3e-4").length).toBeGreaterThan(0);
  });

  it("kill flow: SIGTERM and SIGKILL with inline confirm and cancel", async () => {
    const onKill = vi.fn();
    const { container } = render(<ProcessTable processes={procs} onKill={onKill} />);
    fireEvent.click(screen.getByRole("button", { name: "Terminate python (1234) (SIGTERM)" }));
    const confirm = screen.getByRole("group", { name: "Confirm kill python (1234)" });
    expect(confirm).toHaveTextContent("Kill 1234?");
    expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: "Confirm" }));
    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(onKill).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Terminate python (1234) (SIGTERM)" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onKill).toHaveBeenLastCalledWith(procs[0], "SIGTERM");

    fireEvent.click(screen.getByRole("button", { name: "Force kill jupyter (5678) (SIGKILL)" }));
    expect(screen.getByText("Force kill 5678?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onKill).toHaveBeenLastCalledWith(procs[2], "SIGKILL");
    expect(onKill).toHaveBeenCalledTimes(2);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows per-row pending state and animates removed rows out", async () => {
    let resolve!: () => void;
    const onKill = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { container, rerender } = render(<ProcessTable processes={procs} onKill={onKill} exitDuration={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Force kill sshd (99) (SIGKILL)" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByText("Killing…")).toBeInTheDocument();
    await act(async () => resolve());
    expect(screen.queryByText("Killing…")).not.toBeInTheDocument();

    rerender(<ProcessTable processes={procs.filter((p) => p.pid !== 99)} onKill={onKill} exitDuration={30} />);
    await waitFor(() => expect(container.querySelector('tr[data-pid="99"]')).toHaveAttribute("data-state", "exit"));
    await waitFor(() => expect(container.querySelector('tr[data-pid="99"]')).not.toBeInTheDocument());

    rerender(<ProcessTable processes={[...procs, { pid: 7, name: "new", cpu: 50 }]} onKill={onKill} exitDuration={30} />);
    expect(container.querySelector('tr[data-pid="7"]')).toHaveAttribute("data-state", "enter");
    rerender(<ProcessTable processes={[...procs]} pendingPids={[1234]} onKill={onKill} />);
    expect(within(container.querySelector('tr[data-pid="1234"]') as HTMLElement).getByText("Killing…")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* AlertGroup                                                          */
/* ------------------------------------------------------------------ */

const alerts: AlertItem[] = [
  { id: "w1", severity: "warning", message: "Disk 85% full", category: "storage", source: "node-a", time: 1000 },
  { id: "c1", severity: "critical", message: "GPU 3 at 92°C", category: "thermal", source: "node-b", time: 500, postRepair: true },
  { id: "w2", severity: "warning", message: "RAM 80%", category: "memory", time: 3000 },
  { id: "c2", severity: "critical", message: "Unexpected port 4444", category: "security", time: 2000 },
  { id: "w3", severity: "warning", message: "Backup 14 days old", category: "operational" },
];

describe("AlertGroup", () => {
  it("summarizes, sorts by severity and shows badges", async () => {
    expect(summarizeAlerts(alerts)).toBe("2 critical · 3 warnings");
    expect(sortAlerts(alerts).map((a) => a.id)).toEqual(["c2", "c1", "w2", "w1", "w3"]);
    const { container } = render(<AlertGroup alerts={alerts} now={10_000} />);
    expect(container.querySelector("[data-alert-summary]")).toHaveTextContent("2 critical · 3 warnings");
    expect(screen.getByRole("region", { name: "Alerts" })).toHaveAttribute("data-tone", "critical");
    const items = container.querySelectorAll("li[data-severity]");
    expect([...items].map((li) => li.getAttribute("data-severity"))).toEqual(["critical", "critical", "warning", "warning", "warning"]);
    expect(items[0]).toHaveTextContent("Unexpected port 4444");
    expect(screen.getByText("Post-repair")).toBeInTheDocument();
    expect(screen.getByText("node-b")).toBeInTheDocument();
    expect(container.querySelector('[class*="animate-ping"]')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("dismisses single alerts and all, reporting ids", () => {
    const onDismissedChange = vi.fn();
    const { container } = render(<AlertGroup alerts={alerts} onDismissedChange={onDismissedChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss alert: GPU 3 at 92°C" }));
    expect(onDismissedChange).toHaveBeenLastCalledWith(["c1"]);
    expect(container.querySelector("[data-alert-summary]")).toHaveTextContent("1 critical · 3 warnings");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss all" }));
    expect(onDismissedChange).toHaveBeenLastCalledWith(expect.arrayContaining(["c1", "c2", "w1", "w2", "w3"]));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("respects controlled dismissed ids and collapses", () => {
    render(<AlertGroup alerts={alerts} dismissedIds={["c1", "c2"]} />);
    expect(screen.getByRole("region")).toHaveAttribute("data-tone", "warning");
    const trigger = screen.getByRole("button", { name: /3 warnings/ });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});

/* ------------------------------------------------------------------ */
/* JsonViewer                                                          */
/* ------------------------------------------------------------------ */

const doc = { id: 7, user: { name: "alice", roles: ["admin", "ops"], active: true }, meta: null, "odd key": 1.5 };

describe("JsonViewer", () => {
  it("formats paths and stringifies safely", () => {
    expect(formatJsonPath(["user", 0, "odd key"])).toBe('$.user[0]["odd key"]');
    const a: Record<string, unknown> = { n: 1n };
    a.self = a;
    expect(safeJsonStringify(a, 0)).toBe('{"n":"1n","self":"[Circular]"}');
  });

  it("expands to the default depth and toggles nodes", async () => {
    const { container } = render(<JsonViewer data={doc} />);
    expect(screen.getByText('"id"')).toBeInTheDocument();
    expect(screen.queryByText('"name"')).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Expand $.user" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Collapse $.user" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText('"alice"')).toHaveAttribute("data-kind", "string");
    expect(screen.getByText("null")).toHaveAttribute("data-kind", "null");
    expect(screen.getByText("3 keys")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("expand all / collapse all", () => {
    render(<JsonViewer data={doc} />);
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByText('"ops"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText('"id"')).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand $" })).toBeInTheDocument();
  });

  it("copies values and paths", async () => {
    const writeText = mockClipboard();
    const onCopy = vi.fn();
    render(<JsonViewer data={doc} defaultExpandDepth={2} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy path $.user.name" }));
    expect(writeText).toHaveBeenLastCalledWith("$.user.name");
    expect(onCopy).toHaveBeenLastCalledWith("$.user.name", "path", "$.user.name");
    fireEvent.click(screen.getByRole("button", { name: "Copy value of $.user.roles" }));
    expect(writeText).toHaveBeenLastCalledWith(JSON.stringify(["admin", "ops"], null, 2));
    fireEvent.click(screen.getByRole("button", { name: 'Copy path $["odd key"]' }));
    expect(writeText).toHaveBeenLastCalledWith('$["odd key"]');
  });

  it("search highlights matches and auto-expands ancestors", () => {
    const { container } = render(<JsonViewer data={doc} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search JSON" }), { target: { value: "ALI" } });
    expect(container.querySelector("[data-match-count]")).toHaveTextContent("1 match");
    const mark = container.querySelector("mark")!;
    expect(mark).toHaveTextContent("ali");
    expect(screen.getByRole("button", { name: "Collapse $.user" })).toBeInTheDocument();
  });

  it("chunks large arrays", () => {
    const { container } = render(<JsonViewer data={{ rows: Array.from({ length: 250 }, (_, i) => i) }} defaultExpandDepth={2} />);
    const values = () => [...container.querySelectorAll('[data-kind="number"]')].map((n) => n.textContent);
    expect(values()).toHaveLength(100);
    expect(values()[99]).toBe("99");
    fireEvent.click(screen.getByRole("button", { name: "Show 100 more" }));
    expect(values()).toHaveLength(200);
    fireEvent.click(screen.getByRole("button", { name: "Show all (50 remaining)" }));
    expect(values()).toHaveLength(250);
    expect(values()[249]).toBe("249");
    expect(screen.queryByRole("button", { name: /Show .* more/ })).not.toBeInTheDocument();
  });

  it("handles circular data, invalid JSON and raw mode", () => {
    const circ: Record<string, unknown> = { a: 1 };
    circ.self = circ;
    const { unmount } = render(<JsonViewer data={circ} />);
    expect(screen.getByText("[Circular → $]")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Raw" }));
    expect(screen.getByRole("button", { name: "Raw" })).toHaveAttribute("aria-pressed", "true");
    expect(document.body.textContent).toContain('"[Circular]"');
    unmount();

    render(<JsonViewer json="{ bad json" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid JSON");
    expect(document.body.textContent).toContain("{ bad json");
  });

  it("JsonInline renders a truncated one-line preview", () => {
    const { container } = render(<JsonInline value={{ id: 1, name: "x", tags: ["a", "b"], deep: { a: { b: 1 } } }} />);
    expect(container.textContent).toBe('{ id: 1, name: "x", tags: ["a", "b"], deep: { a: {…} } }');
    const { container: c2 } = render(<JsonInline value={{ long: "y".repeat(100) }} maxLength={20} />);
    expect(c2.textContent).toHaveLength(21);
    expect(c2.textContent!.endsWith("…")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* RequestInspector / RequestLogTable                                  */
/* ------------------------------------------------------------------ */

const record: RequestLogRecord = {
  id: "req_abc123",
  timestamp: new Date(2026, 9, 17, 10, 30).getTime(),
  method: "POST",
  path: "/v1/chat/completions",
  model: "qwen3-8b",
  status: 200,
  latencyMs: 1240,
  identity: "alice",
  request: {
    model: "qwen3-8b",
    temperature: 0.7,
    max_tokens: 512,
    stream: true,
    messages: [
      { role: "system", content: "You are terse." },
      { role: "user", content: [{ type: "text", text: "Hi there" }, { type: "image_url", image_url: { url: "x" } }] },
    ],
  },
  response: {
    choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Hello!", reasoning_content: "User greets; reply." } }],
    usage: { prompt_tokens: 21, completion_tokens: 3 },
  },
};

describe("RequestInspector", () => {
  it("derives params, tokens and messages", () => {
    const d = describeRequestLog(record);
    expect(d.params).toEqual({ temperature: 0.7, max_tokens: 512, stream: true });
    expect(d.finishReason).toBe("stop");
    expect([d.tokensIn, d.tokensOut]).toEqual([21, 3]);
    expect(d.messages.map((m) => m.role)).toEqual(["system", "user", "assistant"]);
    expect(formatRequestLatency(850)).toBe("850 ms");
    expect(formatRequestLatency(1240)).toBe("1.24 s");
    expect(formatRequestLatency(65000)).toBe("1m 5s");
  });

  it("renders header, chips, messages by role and switches tabs", async () => {
    const { container } = render(<RequestInspector record={record} />);
    expect(container.querySelector("[data-latency]")).toHaveTextContent("1.24 s");
    const chips = screen.getByRole("list", { name: "Parameters" });
    expect(chips).toHaveTextContent("temperature0.7");
    expect(chips).toHaveTextContent("max_tokens512");
    expect(chips).toHaveTextContent("stream");
    expect(chips).toHaveTextContent("finish_reasonstop");
    expect(chips).toHaveTextContent("tokens21 → 3");
    expect(container.querySelectorAll("[data-role]")).toHaveLength(3);
    expect(screen.getByText(/Hi there\s+\[image\]/)).toBeInTheDocument();
    expect(screen.getByText("User greets; reply.").closest("details")).not.toHaveAttribute("open");
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Request" }));
    expect(screen.getByRole("tab", { name: "Request" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("group", { name: "Request body" })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Raw" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent('"req_abc123"');
  });

  it("copies the request id", async () => {
    const writeText = mockClipboard();
    render(<RequestInspector record={record} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy request id req_abc123" }));
    expect(writeText).toHaveBeenCalledWith("req_abc123");
    await screen.findByRole("button", { name: "Request id req_abc123 copied" });
  });

  it("shows an error block", () => {
    render(<RequestInspector record={{ ...record, id: "e1", status: 502, response: undefined, error: { type: "upstream", message: "timed out" } }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("upstream: timed out");
  });
});

describe("RequestLogTable", () => {
  const records: RequestLogRecord[] = Array.from({ length: 25 }, (_, i) => ({
    id: `r${i}`,
    timestamp: 1_700_000_000_000 + i * 1000,
    model: i % 2 ? "llama" : "qwen",
    status: i % 5 === 0 ? 500 : 200,
    latencyMs: i * 500,
    error: i % 5 === 0 ? "upstream exploded with a very long message" : undefined,
  }));

  it("filters by status, model and latency", () => {
    expect(filterRequestLogs(records, { status: "error", model: "all", latency: "all" })).toHaveLength(5);
    expect(filterRequestLogs(records, { status: "all", model: "llama", latency: "all" })).toHaveLength(12);
    expect(filterRequestLogs(records, { status: "200", model: "all", latency: "5000" }).map((r) => r.id)).toEqual(
      records.filter((r) => r.status === 200 && r.latencyMs! >= 5000).map((r) => r.id)
    );
  });

  it("paginates and expands rows into an inspector", async () => {
    const { container } = render(<RequestLogTable records={records} pageSize={10} showIdentity={false} />);
    expect(container.querySelector("[data-record-count]")).toHaveTextContent("25 records");
    expect(container.querySelectorAll("tbody > tr")).toHaveLength(10);
    expect(screen.getAllByText("upstream exploded with a very long message")[0]).toHaveAttribute("data-error-cell");
    const expand = screen.getByRole("button", { name: "Expand request r1" });
    fireEvent.click(expand);
    expect(screen.getByRole("button", { name: "Collapse request r1" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Collapse request r1" }));
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByText("1–10 of 25")).toBeInTheDocument();
  });

  it("applies default filters", () => {
    const { container } = render(<RequestLogTable records={records} defaultFilters={{ status: "error" }} />);
    expect(container.querySelector("[data-record-count]")).toHaveTextContent("5 records");
  });
});

/* ------------------------------------------------------------------ */
/* Model rows                                                          */
/* ------------------------------------------------------------------ */

describe("ModelStatePill & DownloadBadge", () => {
  it("uses distinct glyphs with accessible labels", async () => {
    const { container } = render(
      <div>
        {(["ready", "stopped", "sleeping", "failed", "loading", "downloading"] as const).map((s) => (
          <ModelStatePill key={s} state={s} />
        ))}
        <ModelStatePill state="sleeping" hideLabel />
        <DownloadBadge status="downloading" progress={42} />
        <DownloadBadge status="cached" size="16 GB" />
        <DownloadBadge status="partial" />
        <DownloadBadge status="failed" />
      </div>
    );
    const glyphs = [...container.querySelectorAll("[data-glyph]")].map((g) => g.getAttribute("data-glyph"));
    expect(glyphs.slice(0, 6)).toEqual(["filled-dot", "outline-dot", "moon", "warning", "spinner", "download"]);
    const pills = container.querySelectorAll("[data-state]");
    expect(pills[0]).toHaveTextContent("Model state: Ready");
    expect(pills[2]).toHaveTextContent("Model state: Sleeping");
    expect(pills[6]).toHaveTextContent("Model state: Sleeping");
    expect(pills[6].querySelector(".sr-only:last-of-type")).toBeTruthy();
    expect(screen.getByText("Downloading 42%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Download progress" })).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("Cached")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Download failed")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ModelTable", () => {
  const models: ModelInfo[] = [
    { name: "qwen3-8b", state: "ready", download: { status: "cached" }, vram: 18.2, gpus: [0], coldStartMs: 42000, wakeMs: 2100, idleSeconds: 30 },
    { name: "qwen3-32b", state: "sleeping", download: { status: "cached" }, pinned: true },
    { name: "llama3.1-70b", state: "stopped", download: { status: "cached" }, blocked: "Needs 140 GB, 96 GB free" },
    { name: "llama3.1-8b", state: "stopped", download: { status: "missing" } },
    { name: "gemma4-e4b", state: "downloading", download: { status: "downloading", progress: 42 } },
    { name: "mistral-7b", state: "failed", download: { status: "cached" }, error: "CUDA OOM" },
  ];

  it("computes actions per state", () => {
    expect(modelActionsFor(models[0])).toEqual(["test", "sleep", "stop", "pin"]);
    expect(modelActionsFor(models[1])).toEqual(["wake", "stop", "unpin"]);
    expect(modelActionsFor(models[2])).toEqual(["start", "pin"]);
    expect(modelActionsFor(models[3])).toEqual(["download"]);
    expect(modelActionsFor(models[4])).toEqual(["cancel"]);
    expect(modelActionsFor({ state: "loading" })).toEqual(["stop"]);
    expect(modelFamily("qwen3.6-27b-fp8")).toBe("qwen3.6");
    expect(modelFamily("gpt-oss-120b")).toBe("gpt-oss");
  });

  it("renders groups, state-dependent actions, blocked tag and test results", async () => {
    const onAction = vi.fn();
    const { container } = render(
      <ModelTable
        models={models}
        onAction={onAction}
        pendingActions={{ "qwen3-32b": "wake" }}
        testResults={{ "qwen3-8b": { ok: true, latencyMs: 820, tokensPerSecond: 54.32, reply: "Hello there" } }}
      />
    );
    expect([...container.querySelectorAll("tr[data-group]")].map((r) => r.getAttribute("data-group"))).toEqual([
      "qwen3",
      "llama3.1",
      "gemma4",
      "mistral",
    ]);
    const row = (name: string) => container.querySelector(`tr[data-model="${name}"]`) as HTMLElement;
    expect(within(row("qwen3-8b")).getAllByRole("button").map((b) => b.textContent)).toEqual(["Test", "Sleep", "Stop", "Pin"]);
    expect(within(row("llama3.1-8b")).getByRole("button", { name: "Download llama3.1-8b" })).toBeEnabled();
    expect(within(row("gemma4-e4b")).getByRole("button", { name: "Cancel gemma4-e4b" })).toBeInTheDocument();
    expect(within(row("llama3.1-70b")).getByRole("button", { name: "Start llama3.1-70b" })).toBeDisabled();
    expect(within(row("llama3.1-70b")).getByText("won't fit")).toHaveAttribute("title", "Needs 140 GB, 96 GB free");
    expect(within(row("qwen3-32b")).getByRole("button", { name: "Stop qwen3-32b" })).toBeDisabled();
    expect(within(row("mistral-7b")).getByText("CUDA OOM")).toBeInTheDocument();
    expect(within(row("qwen3-8b")).getByText("idle 30s")).toBeInTheDocument();
    expect(within(row("qwen3-8b")).getByText("42 s")).toBeInTheDocument();

    fireEvent.click(within(row("qwen3-8b")).getByRole("button", { name: "Sleep qwen3-8b" }));
    expect(onAction).toHaveBeenCalledWith(models[0], "sleep");

    const result = container.querySelector("tr[data-test-result]") as HTMLElement;
    expect(result).toHaveTextContent("Smoke test passed");
    expect(result).toHaveTextContent("820 ms");
    expect(result).toHaveTextContent("54.3 tok/s");
    expect(result).toHaveTextContent("Hello there");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("filters by serving / not downloaded", () => {
    const { container } = render(<ModelTable models={models} grouped={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Serving/ }));
    expect([...container.querySelectorAll("tr[data-model]")].map((r) => r.getAttribute("data-model"))).toEqual(["qwen3-8b", "qwen3-32b"]);
    fireEvent.click(screen.getByRole("button", { name: /Not downloaded/ }));
    expect([...container.querySelectorAll("tr[data-model]")].map((r) => r.getAttribute("data-model"))).toEqual(["llama3.1-8b", "gemma4-e4b"]);
  });
});

/* ------------------------------------------------------------------ */
/* Terminal                                                            */
/* ------------------------------------------------------------------ */

describe("Terminal", () => {
  beforeEach(() => {
    xterm.instances.length = 0;
    xterm.fits.length = 0;
    document.documentElement.classList.remove("dark");
  });

  it("lazy-loads xterm, fits, flushes queued writes and forwards input", async () => {
    const onData = vi.fn();
    const onReady = vi.fn();
    const ref = React.createRef<TerminalHandle>();
    const { container } = render(<Terminal ref={ref} onData={onData} onReady={onReady} title="dilab-01" />);
    ref.current!.write("queued\r\n");
    expect(container.querySelector("[data-terminal-overlay]")).toHaveAttribute("data-terminal-overlay", "loading");
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    const term = xterm.instances[0];
    expect(term.open).toHaveBeenCalledWith(container.querySelector("[data-terminal-host]"));
    expect(term.loadAddon).toHaveBeenCalledWith(xterm.fits[0]);
    expect(xterm.fits[0].fit).toHaveBeenCalled();
    expect(term.write).toHaveBeenCalledWith("queued\r\n");
    expect((term.options.theme as { background: string }).background).toBe("#ffffff");
    expect(term.options.fontSize).toBe(13);
    ref.current!.write("hello");
    expect(term.write).toHaveBeenLastCalledWith("hello");
    term.emitData("ls\r");
    expect(onData).toHaveBeenCalledWith("ls\r");
    expect(container.querySelector("[data-terminal-overlay]")).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("re-themes when the document theme class changes", async () => {
    const onReady = vi.fn();
    render(<Terminal onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    const term = xterm.instances[0];
    const before = term.themeSets.length;
    document.documentElement.classList.add("dark");
    await waitFor(() => expect(term.themeSets.length).toBeGreaterThan(before));
    expect((term.themeSets[term.themeSets.length - 1] as { background: string }).background).toBe("#09090b");
    expect(getTerminalTheme(document.documentElement).foreground).toBe("#fafafa");
  });

  it("refits on container resize", async () => {
    const callbacks: ResizeObserverCallback[] = [];
    const Original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    try {
      const onReady = vi.fn();
      render(<Terminal onReady={onReady} />);
      await waitFor(() => expect(onReady).toHaveBeenCalled());
      const fit = xterm.fits[0].fit;
      const calls = fit.mock.calls.length;
      act(() => callbacks.forEach((cb) => cb([], {} as ResizeObserver)));
      await waitFor(() => expect(fit.mock.calls.length).toBeGreaterThan(calls));
    } finally {
      globalThis.ResizeObserver = Original;
    }
  });

  it("shows connection overlays with reconnect and toggles fullscreen", async () => {
    const onReconnect = vi.fn();
    const onReady = vi.fn();
    const { container, rerender } = render(<Terminal onReady={onReady} connection="connecting" onReconnect={onReconnect} />);
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");
    rerender(<Terminal onReady={onReady} connection="disconnected" connectionMessage="Socket closed (1006)" onReconnect={onReconnect} />);
    expect(screen.getByRole("status")).toHaveTextContent("DisconnectedSocket closed (1006)");
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onReconnect).toHaveBeenCalled();
    rerender(<Terminal onReady={onReady} connection="error" onReconnect={onReconnect} />);
    expect(screen.getByRole("status")).toHaveTextContent("Connection error");
    expect(await axeViolations(container)).toEqual([]);

    const fs = screen.getByRole("button", { name: "Enter fullscreen" });
    fireEvent.click(fs);
    expect(screen.getByRole("group", { name: "Terminal" })).toHaveAttribute("data-fullscreen", "true");
    expect(screen.getByRole("button", { name: "Exit fullscreen" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("TerminalSessionPicker", () => {
  it("lists sessions with badges, keyboard selection and new session", async () => {
    const onValueChange = vi.fn();
    const onCreate = vi.fn();
    const { container } = render(
      <TerminalSessionPicker
        sessions={[
          { id: "main", name: "main", windows: 3, attached: true },
          { id: "train", name: "train", windows: 1 },
        ]}
        defaultValue="main"
        onValueChange={onValueChange}
        onCreate={onCreate}
      />
    );
    const listbox = screen.getByRole("listbox", { name: "Terminal sessions" });
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveTextContent("3 windows");
    expect(options[0]).toHaveTextContent("attached");
    expect(options[0]).toHaveTextContent("active");
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox).toHaveAttribute("aria-activedescendant", options[1].id);
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(onValueChange).toHaveBeenCalledWith("train");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "New session" }));
    expect(onCreate).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});
