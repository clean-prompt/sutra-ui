import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PortBadge, PortBadgeList, portHref } from "../src/primitives/port-badge";
import {
  DevServerList,
  classifyDevServer,
  describeIdleSavings,
  summarizeIdleServers,
  type DevServerProject,
} from "../src/kits/system/dev-servers";
import { ContainerList, ContainerSummary, groupContainers, summarizeContainers, type ContainerInfo } from "../src/kits/system/containers";
import { formatMemory, formatRate, formatSpan } from "../src/lib/system-monitor";
import { axeViolations } from "./helpers/a11y";

const NOW = new Date("2026-10-19T12:00:00Z").getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MB = 1e6;

const projects: DevServerProject[] = [
  { id: "storefront", name: "storefront", processes: 9, memoryBytes: 1180 * MB, state: "working" },
  { id: "web", name: "storefront-web", runtime: "node", ports: [4322], memoryBytes: 458 * MB, state: "idle", startedAt: NOW - 3 * DAY },
  { id: "scraper", name: "scraper-api", runtime: "python", ports: [8000], memoryBytes: 412 * MB, state: "idle", startedAt: NOW - 4 * DAY },
  { id: "marketing", name: "marketing-site", runtime: "node", ports: [4321], memoryBytes: 296 * MB, state: "running", startedAt: NOW - 5 * HOUR, idleSince: NOW - 2 * HOUR },
  { id: "billing", name: "billing-api", runtime: "node", ports: [3000], memoryBytes: 204 * MB, state: "running", startedAt: NOW - 3 * HOUR, idleSince: NOW - 45 * MIN },
  { id: "docs", name: "docs", runtime: "node", ports: [5173], memoryBytes: 188 * MB, state: "running" },
  { id: "tokens", name: "design-tokens", runtime: "node", ports: [6006], memoryBytes: 121 * MB, state: "running", startedAt: NOW - 2 * HOUR, idleSince: NOW - 20 * MIN },
  { id: "infra", name: "infra", processes: 3, memoryBytes: 96 * MB, state: "running" },
];

const containers: ContainerInfo[] = [
  { id: "pg", name: "postgres", image: "postgres:16", group: "storefront", state: "running", startedAt: NOW - 5 * HOUR, ports: [5433], cpu: 1.6, memoryBytes: 312 * MB, network: { rxBps: 4000, txBps: 2000 } },
  { id: "redis", name: "redis", image: "redis:7-alpine", group: "storefront", state: "running", startedAt: NOW - 5 * HOUR, ports: [6379], cpu: 0.3, memoryBytes: 14 * MB },
  { id: "mq", name: "rabbitmq", image: "rabbitmq:3-management", group: "api", state: "running", startedAt: NOW - 3 * HOUR, ports: [5672, 15672], cpu: 0.9, memoryBytes: 206 * MB, memoryLimitBytes: 240 * MB, network: { rxBps: 2000, txBps: 1000 } },
  { id: "minio", name: "minio", image: "minio/minio", state: "running", startedAt: NOW - 1 * DAY, ports: [9000, 9001], cpu: 0.2, memoryBytes: 142 * MB, memoryLimitBytes: 1000 * MB },
];

describe("system-monitor helpers", () => {
  it("formats memory, rates and spans like a system monitor", () => {
    expect(formatMemory(458 * MB)).toBe("458 MB");
    expect(formatMemory(1180 * MB)).toBe("1.18 GB");
    expect(formatMemory(1370 * MB)).toBe("1.37 GB");
    expect(formatMemory(4.5 * MB)).toBe("4.5 MB");
    expect(formatMemory(NaN)).toBe("—");
    expect(formatRate(6000)).toBe("6 kB/s");
    expect(formatSpan(NOW - 3 * DAY, NOW)).toBe("3 days");
    expect(formatSpan(NOW - 45 * MIN, NOW)).toBe("45 min");
    expect(formatSpan(NOW - 2 * HOUR, NOW)).toBe("2 hours");
    expect(formatSpan("nope", NOW)).toBeUndefined();
  });
});

describe("PortBadge", () => {
  it("renders a mono chip, with an optional colon and localhost link", () => {
    const { rerender } = render(<PortBadge port={3000} />);
    const chip = screen.getByText("3000").closest('[data-slot="port-badge"]')!;
    expect(chip.tagName).toBe("SPAN");
    expect(chip.className).toMatch(/font-mono/);
    expect(chip.className).toMatch(/sutra-accent/);

    rerender(<PortBadge port={3000} colon href accent="orange" />);
    const link = screen.getByRole("link", { name: "Open localhost:3000" });
    expect(link).toHaveAttribute("href", "http://localhost:3000");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.style.getPropertyValue("--sutra-accent")).toBe("#ff6900");
    expect(within(link).getByText(":3000")).toBeInTheDocument();
    expect(portHref(":8080", "127.0.0.1")).toBe("http://127.0.0.1:8080");
  });

  it("drops unsafe hrefs and lets tone win over the accent", () => {
    render(<PortBadge port={22} href="javascript:alert(1)" tone="warning" />);
    expect(screen.queryByRole("link")).toBeNull();
    const chip = screen.getByText("22").closest('[data-slot="port-badge"]')!;
    expect(chip.className).toMatch(/bg-warning-soft/);
    expect(chip.className).not.toMatch(/sutra-accent/);
  });

  it("lists ports with a +N overflow that names the hidden ones", async () => {
    const { container } = render(<PortBadgeList ports={[5433, 5672, 6379, 9000, 9001, 15672]} max={4} label="Published ports" />);
    const list = screen.getByRole("list", { name: "Published ports" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.slice(0, 4).map((li) => li.textContent)).toEqual(["5433", "5672", "6379", "9000"]);
    const overflow = container.querySelector('[data-slot="port-badge-overflow"]')!;
    expect(overflow).toHaveAttribute("title", "9001, 15672");
    expect(overflow.textContent).toContain("+2");
    expect(overflow.textContent).toContain("2 more: 9001, 15672");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders nothing for no ports", () => {
    const { container } = render(<PortBadgeList ports={[]} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("DevServerList", () => {
  it("classifies idle servers with the threshold and summarises what stopping them frees", () => {
    const opts = { now: NOW };
    expect(classifyDevServer(projects[0]!, opts)).toMatchObject({ kind: "working", label: "working" });
    expect(classifyDevServer(projects[1]!, opts)).toMatchObject({ kind: "idle", label: "up 3 days, barely used", barelyUsed: true });
    expect(classifyDevServer(projects[3]!, opts)).toMatchObject({ kind: "idle", label: "idle 2 hours" });
    expect(classifyDevServer(projects[4]!, opts)).toMatchObject({ kind: "idle", label: "idle 45 min" });
    // Under the 30 min default: still shows how long it has been quiet, but is not "idle".
    expect(classifyDevServer(projects[6]!, opts)).toMatchObject({ kind: "running", label: "idle 20 min" });
    expect(classifyDevServer(projects[5]!, opts)).toMatchObject({ kind: "running", label: undefined });
    expect(classifyDevServer(projects[6]!, { now: NOW, idleAfterMs: 10 * MIN }).kind).toBe("idle");

    const summary = summarizeIdleServers(projects, opts);
    expect(summary.ids).toEqual(["web", "scraper", "marketing", "billing"]);
    expect(summary.ports).toEqual([3000, 4321, 4322, 8000]);
    expect(describeIdleSavings(summary)).toBe("Stopping them frees 1.37 GB and ports 3000, 4321, 4322, 8000.");
  });

  it("renders rows with subtitles, ports, activity pills and memory", async () => {
    const { container } = render(<DevServerList projects={projects} now={NOW} />);
    const list = screen.getByRole("list", { name: "Dev servers" });
    const rows = container.querySelectorAll('[data-slot="dev-server-row"]');
    expect(rows).toHaveLength(8);
    expect(list.parentElement!.style.getPropertyValue("--sutra-accent")).toBe("#ff6900");

    const storefront = rows[0] as HTMLElement;
    expect(within(storefront).getByText("9 processes")).toBeInTheDocument();
    expect(within(storefront).getByText("1.18 GB")).toBeInTheDocument();
    const working = storefront.querySelector('[data-slot="dev-server-activity"]')!;
    expect(working).toHaveTextContent("working");
    expect(working.className).toMatch(/success/);

    const billing = rows[4] as HTMLElement;
    expect(billing).toHaveAttribute("data-activity", "idle");
    expect(within(billing).getByRole("list", { name: "billing-api ports" })).toHaveTextContent("3000");
    expect(billing.querySelector('[data-slot="dev-server-activity"]')).toHaveTextContent("idle 45 min");
    expect(rows[1]!.querySelector('[data-slot="dev-server-activity"]')).toHaveTextContent("up 3 days, barely used");
    expect(rows[5]!.querySelector('[data-slot="dev-server-activity"]')).toBeNull();
    expect(within(rows[7] as HTMLElement).getByText("3 processes")).toBeInTheDocument();
    expect(within(rows[7] as HTMLElement).getByText("96 MB")).toBeInTheDocument();

    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows the idle banner and stops every idle server after confirming", async () => {
    const user = userEvent.setup();
    const onStopIdle = vi.fn();
    const { container } = render(<DevServerList projects={projects} now={NOW} onStopIdle={onStopIdle} onStop={() => {}} />);
    const banner = container.querySelector('[data-slot="dev-server-idle-banner"]') as HTMLElement;
    expect(banner).toHaveTextContent("4 dev servers are running but idle");
    expect(banner).toHaveTextContent("Stopping them frees 1.37 GB and ports 3000, 4321, 4322, 8000.");
    expect(await axeViolations(container)).toEqual([]);

    await user.click(within(banner).getByRole("button", { name: "Stop All…" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Stop 4 idle dev servers?");
    expect(dialog).toHaveTextContent("storefront-web, scraper-api, marketing-site, and billing-api");
    expect(onStopIdle).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Stop All" }));
    expect(onStopIdle).toHaveBeenCalledWith(["web", "scraper", "marketing", "billing"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("hides the banner without idle servers and shows the empty state", () => {
    const { container, rerender } = render(<DevServerList projects={[projects[0]!]} now={NOW} />);
    expect(container.querySelector('[data-slot="dev-server-idle-banner"]')).toBeNull();
    rerender(<DevServerList projects={[]} emptyState="Nothing running" />);
    expect(screen.getByText("Nothing running")).toBeInTheDocument();
  });

  it("stops one server after confirming, and cancel does nothing", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const onOpen = vi.fn();
    render(<DevServerList projects={projects} now={NOW} onStop={onStop} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "docs" }));
    expect(onOpen).toHaveBeenCalledWith("docs");

    await user.click(screen.getByRole("button", { name: "Stop docs" }));
    let dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Stop docs?");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onStop).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Stop docs" }));
    dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledWith("docs");
  });
});

describe("ContainerList", () => {
  it("groups by Compose project and keeps ungrouped containers in place", () => {
    const entries = groupContainers(containers);
    expect(entries.map((e) => (e.type === "group" ? `group:${e.name}:${e.containers.length}` : e.container.name))).toEqual([
      "group:storefront:2",
      "group:api:1",
      "minio",
    ]);
  });

  it("renders group headers, nested rows, limit warnings and ungrouped rows", async () => {
    const { container } = render(<ContainerList containers={containers} now={NOW} />);
    const groups = container.querySelectorAll('[data-slot="container-group"]');
    expect(groups).toHaveLength(2);
    const storefront = groups[0] as HTMLElement;
    const header = storefront.querySelector('[data-slot="container-group-header"]') as HTMLElement;
    expect(header).toHaveTextContent("storefront2 containers");
    expect(header).toHaveTextContent("Started together by Docker Compose · 2 ports · 2 running");
    expect(header).toHaveTextContent("1.9%");
    expect(header).toHaveTextContent("326 MB");
    const nested = within(storefront).getByRole("list", { name: "storefront containers" });
    expect(within(nested).getAllByRole("listitem").filter((li) => li.dataset.slot === "container-row")).toHaveLength(2);
    expect(nested).toHaveTextContent("postgrespostgres:16");
    expect(nested).toHaveTextContent("Up 5 hours");

    const api = groups[1] as HTMLElement;
    expect(api).toHaveTextContent("api1 container");
    const warning = api.querySelector('[data-slot="container-limit-warning"]')!;
    expect(warning).toHaveTextContent("86% of 240 MB");
    expect(warning.className).toMatch(/warning/);
    // minio is at 14% of its limit: no warning, and it renders ungrouped at the top level.
    const top = screen.getByRole("list", { name: "Containers" });
    const minio = Array.from(top.children).find((li) => li.textContent?.includes("minio")) as HTMLElement;
    expect(minio).toHaveAttribute("data-slot", "container-row");
    expect(minio.querySelector('[data-slot="container-limit-warning"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="container-limit-warning"]')).toHaveLength(1);

    expect(await axeViolations(container)).toEqual([]);
  });

  it("collapses groups (uncontrolled) and reports expanded groups", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(<ContainerList containers={containers} now={NOW} onExpandedChange={onExpandedChange} />);
    const toggle = screen.getByRole("button", { name: /storefront/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list", { name: "storefront containers" })).toBeNull();
    expect(onExpandedChange).toHaveBeenLastCalledWith(["api"]);
  });

  it("stops a container after confirming", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<ContainerList containers={containers} now={NOW} onStop={onStop} limitWarnAt={0.9} />);
    expect(document.querySelector('[data-slot="container-limit-warning"]')).toBeNull();
    await user.click(screen.getByRole("button", { name: "Stop redis" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Stop redis?");
    expect(onStop).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledWith("redis");
  });
});

describe("ContainerSummary", () => {
  it("summarises totals, the busiest container, the one closest to its limit, network and ports", () => {
    const s = summarizeContainers(containers);
    expect(s.count).toBe(4);
    expect(s.memoryBytes).toBe(674 * MB);
    expect(s.cpu).toBeCloseTo(3.0);
    expect(s.topCpu).toMatchObject({ name: "postgres" });
    expect(s.closestToLimit).toMatchObject({ name: "rabbitmq", limitBytes: 240 * MB });
    expect(s.closestToLimit!.ratio).toBeCloseTo(206 / 240);
    expect(s.network).toEqual({ rxBps: 6000, txBps: 3000, totalBps: 9000 });
    expect(s.ports).toEqual([5433, 5672, 6379, 9000, 9001, 15672]);
    expect(summarizeContainers([])).toMatchObject({ count: 0, topCpu: undefined, closestToLimit: undefined, network: undefined });
  });

  it("renders the header, breakdown and four tiles", async () => {
    const { container } = render(<ContainerSummary containers={containers} history={[592.3 * MB, 650 * MB, 674 * MB]} />);
    expect(screen.getByRole("heading", { name: "4 containers in Docker" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="container-summary-total"]')).toHaveTextContent("674MB");
    expect(screen.getByText("Lowest").nextElementSibling).toHaveTextContent("592 MB");
    expect(screen.getByText("Peak").nextElementSibling).toHaveTextContent("674 MB");
    expect(screen.getByText("By Container")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /postgres 312 MB, rabbitmq 206 MB, minio 142 MB, redis 14 MB/ })).toBeInTheDocument();

    const cpu = container.querySelector('[data-slot="container-summary-cpu"]')!;
    expect(cpu).toHaveTextContent("3.0%");
    expect(cpu).toHaveTextContent("most in postgres");
    const limit = container.querySelector('[data-slot="container-summary-limit"]')!;
    expect(limit).toHaveTextContent("rabbitmq");
    expect(limit).toHaveTextContent("86% of 240 MB");
    expect(within(limit as HTMLElement).getByRole("progressbar", { name: "rabbitmq memory of its limit" })).toBeInTheDocument();
    const network = container.querySelector('[data-slot="container-summary-network"]')!;
    expect(network).toHaveTextContent("9kB/s");
    expect(network).toHaveTextContent("Received 6 kB/s");
    expect(network).toHaveTextContent("Sent 3 kB/s");
    const ports = container.querySelector('[data-slot="container-summary-ports"]')!;
    expect(ports).toHaveTextContent("6");
    expect(within(ports as HTMLElement).getByRole("list", { name: "Published ports" })).toHaveTextContent("+2");

    expect(await axeViolations(container)).toEqual([]);
  });

  it("handles containers without limits or network data", () => {
    const { container } = render(<ContainerSummary containers={[{ id: "a", name: "a", state: "exited", cpu: 0, memoryBytes: 0 }]} />);
    expect(container.querySelector('[data-slot="container-summary-limit"]')).toHaveTextContent("No memory limits set");
    expect(container.querySelector('[data-slot="container-summary-network"]')).toHaveTextContent("—");
    expect(screen.queryByText("Lowest")).toBeNull();
  });
});
