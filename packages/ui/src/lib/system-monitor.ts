/* Pure helpers for the system-monitor kit (dev servers, containers): memory and rate text, "up 3 days" spans,
 * idle classification and container summaries. Never throw on bad input. */
import { formatBytes } from "./format";
import { formatRelative, MINUTE_MS, toMs, type TimeInput } from "./time";

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

function finite(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Memory as a system monitor shows it (decimal units): `"458 MB"`, `"1.18 GB"`, `"4.5 MB"`.
 * Whole numbers from 10 units up, two decimals for GB and above.
 */
export function formatMemory(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return "—";
  const abs = Math.abs(bytes);
  return abs >= 1e9 ? formatBytes(bytes, { base: 1000, decimals: 2 }) : formatBytes(bytes, { base: 1000, decimals: 1, wholeAbove: 10 });
}

const SI_RATE_UNITS = ["B", "kB", "MB", "GB", "TB", "PB", "EB"];

/** A transfer rate in decimal units: `"6 kB/s"`, `"1.2 MB/s"`. */
export function formatRate(bytesPerSecond: number | null | undefined): string {
  if (typeof bytesPerSecond !== "number" || !Number.isFinite(bytesPerSecond)) return "—";
  return `${formatBytes(bytesPerSecond, { base: 1000, decimals: 1, wholeAbove: 10, units: SI_RATE_UNITS })}/s`;
}

/** Split formatted text such as `"674 MB"` into its number and unit (for a big value with a muted unit). */
export function splitValueUnit(text: string): { value: string; unit: string } {
  const i = text.lastIndexOf(" ");
  return i > 0 ? { value: text.slice(0, i), unit: text.slice(i + 1) } : { value: text, unit: "" };
}

/** A CPU percentage with one decimal: `"1.6%"`. */
export function formatCpu(percent: number | null | undefined): string {
  return typeof percent === "number" && Number.isFinite(percent) ? `${Math.max(0, percent).toFixed(1)}%` : "—";
}

/** The time between `from` and `now` as words without "ago": `"3 days"`, `"2 hours"`, `"45 min"` (`undefined` when unparseable). */
export function formatSpan(from: TimeInput | null | undefined, now: TimeInput = Date.now()): string | undefined {
  return formatRelative(from, { now, style: "long", yesterday: false, suffix: false, justNowMs: MINUTE_MS / 2, justNow: "under a minute", invalid: "" }) || undefined;
}

/* ------------------------------------------------------------------ */
/* Dev servers                                                         */
/* ------------------------------------------------------------------ */

export type DevServerState = "working" | "idle" | "running";

export interface DevServerProject {
  id: string;
  name: string;
  /** Runtime shown under the name ("node", "python"). */
  runtime?: string;
  /** Process count, shown as "9 processes" when there is no runtime. */
  processes?: number;
  ports?: number[];
  memoryBytes: number;
  /** `working`: busy now. `idle`: reported idle. `running`: up; idle once `idleSince` is older than the threshold. */
  state: DevServerState;
  /** When it last did work. */
  idleSince?: TimeInput;
  /** When it started. An idle server that never worked since then reads "up 3 days, barely used". */
  startedAt?: TimeInput;
  /** CPU percent (not shown by `DevServerList`; available for sorting and custom rows). */
  cpu?: number;
}

export interface DevServerActivity {
  /** `idle` counts toward "running but idle"; `running` servers may still show an "idle 20 min" pill. */
  kind: DevServerState;
  /** Pill text ("working", "idle 2 hours", "up 3 days, barely used"); undefined when there is nothing to say. */
  label?: string;
  idleForMs?: number;
  upForMs?: number;
  /** Idle since it started. */
  barelyUsed: boolean;
}

export interface DevServerClassifyOptions {
  now?: TimeInput;
  /** A `running` server idle at least this long counts as idle. Default 30 minutes. */
  idleAfterMs?: number;
}

/** Default idle threshold for dev servers (30 minutes). */
export const DEFAULT_IDLE_AFTER_MS = 30 * MINUTE_MS;

/** Classify one dev server and build its activity pill text. */
export function classifyDevServer(project: DevServerProject, options: DevServerClassifyOptions = {}): DevServerActivity {
  const now = toMs(options.now ?? Date.now()) ?? Date.now();
  const threshold = Number.isFinite(options.idleAfterMs) ? Math.max(0, options.idleAfterMs!) : DEFAULT_IDLE_AFTER_MS;
  if (project.state === "working") return { kind: "working", label: "working", barelyUsed: false };

  const idleAt = project.idleSince === undefined ? undefined : toMs(project.idleSince);
  const startAt = project.startedAt === undefined ? undefined : toMs(project.startedAt);
  const idleForMs = idleAt === undefined ? undefined : Math.max(0, now - idleAt);
  const upForMs = startAt === undefined ? undefined : Math.max(0, now - startAt);
  const barelyUsed = startAt !== undefined && (idleAt === undefined ? project.state === "idle" : idleAt <= startAt);
  const idle = project.state === "idle" || (idleForMs !== undefined && idleForMs >= threshold);

  let label: string | undefined;
  if (barelyUsed) label = `up ${formatSpan(startAt, now)}, barely used`;
  else if (idleAt !== undefined) label = `idle ${formatSpan(idleAt, now)}`;
  else if (idle) label = "idle";

  return { kind: idle ? "idle" : "running", label, idleForMs, upForMs, barelyUsed };
}

export interface IdleServerSummary {
  ids: string[];
  names: string[];
  count: number;
  /** Memory freed by stopping them. */
  memoryBytes: number;
  /** Their ports, unique and ascending. */
  ports: number[];
}

/** The idle dev servers: what stopping them frees. */
export function summarizeIdleServers(projects: readonly DevServerProject[], options: DevServerClassifyOptions = {}): IdleServerSummary {
  const idle = projects.filter((p) => classifyDevServer(p, options).kind === "idle");
  return {
    ids: idle.map((p) => p.id),
    names: idle.map((p) => p.name),
    count: idle.length,
    memoryBytes: idle.reduce((sum, p) => sum + Math.max(0, finite(p.memoryBytes)), 0),
    ports: uniquePorts(idle.flatMap((p) => p.ports ?? [])),
  };
}

/** Ports, unique and ascending (non-numbers dropped). */
export function uniquePorts(ports: readonly number[]): number[] {
  return [...new Set(ports.filter((p) => typeof p === "number" && Number.isFinite(p)))].sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/* Containers                                                          */
/* ------------------------------------------------------------------ */

export type ContainerState = "running" | "exited" | "paused" | "restarting";

export interface ContainerInfo {
  id: string;
  name: string;
  /** Image reference ("postgres:16"). */
  image?: string;
  /** Docker Compose project. Containers without one render ungrouped. */
  group?: string;
  state: ContainerState;
  startedAt?: TimeInput;
  ports?: number[];
  /** CPU percent. */
  cpu: number;
  memoryBytes: number;
  memoryLimitBytes?: number;
  network?: { rxBps: number; txBps: number };
}

export type ContainerListEntry<T extends ContainerInfo = ContainerInfo> =
  | { type: "group"; name: string; containers: T[] }
  | { type: "container"; container: T };

/** Containers grouped by Compose project, in order of first appearance; ungrouped containers stay where they are. */
export function groupContainers<T extends ContainerInfo>(containers: readonly T[]): ContainerListEntry<T>[] {
  const out: ContainerListEntry<T>[] = [];
  const groups = new Map<string, T[]>();
  for (const c of containers) {
    if (!c.group) {
      out.push({ type: "container", container: c });
      continue;
    }
    let list = groups.get(c.group);
    if (!list) {
      list = [];
      groups.set(c.group, list);
      out.push({ type: "group", name: c.group, containers: list });
    }
    list.push(c);
  }
  return out;
}

export interface ContainerTotals {
  count: number;
  running: number;
  cpu: number;
  memoryBytes: number;
  ports: number[];
}

/** Totals for a set of containers (a Compose group or everything). */
export function containerTotals(containers: readonly ContainerInfo[]): ContainerTotals {
  return {
    count: containers.length,
    running: containers.filter((c) => c.state === "running").length,
    cpu: containers.reduce((s, c) => s + Math.max(0, finite(c.cpu)), 0),
    memoryBytes: containers.reduce((s, c) => s + Math.max(0, finite(c.memoryBytes)), 0),
    ports: uniquePorts(containers.flatMap((c) => c.ports ?? [])),
  };
}

/** Memory use as a share of the container's limit (0–1+), or undefined without a limit. */
export function containerLimitRatio(container: ContainerInfo): number | undefined {
  const limit = finite(container.memoryLimitBytes);
  return limit > 0 ? Math.max(0, finite(container.memoryBytes)) / limit : undefined;
}

export interface ContainerSummaryData extends ContainerTotals {
  /** The container using the most CPU. */
  topCpu?: { id: string; name: string; cpu: number };
  /** The container closest to its memory limit. */
  closestToLimit?: { id: string; name: string; ratio: number; memoryBytes: number; limitBytes: number };
  /** Summed network rates; undefined when no container reports any. */
  network?: { rxBps: number; txBps: number; totalBps: number };
}

/** Everything the container summary shows: totals, the busiest container, the one closest to its limit, network. */
export function summarizeContainers(containers: readonly ContainerInfo[]): ContainerSummaryData {
  const totals = containerTotals(containers);
  let topCpu: ContainerSummaryData["topCpu"];
  let closest: ContainerSummaryData["closestToLimit"];
  let rx = 0;
  let tx = 0;
  let hasNetwork = false;
  for (const c of containers) {
    const cpu = finite(c.cpu);
    if (cpu > 0 && (!topCpu || cpu > topCpu.cpu)) topCpu = { id: c.id, name: c.name, cpu };
    const ratio = containerLimitRatio(c);
    if (ratio !== undefined && (!closest || ratio > closest.ratio)) {
      closest = { id: c.id, name: c.name, ratio, memoryBytes: Math.max(0, finite(c.memoryBytes)), limitBytes: finite(c.memoryLimitBytes) };
    }
    if (c.network) {
      hasNetwork = true;
      rx += Math.max(0, finite(c.network.rxBps));
      tx += Math.max(0, finite(c.network.txBps));
    }
  }
  return {
    ...totals,
    topCpu,
    closestToLimit: closest,
    network: hasNetwork ? { rxBps: rx, txBps: tx, totalBps: rx + tx } : undefined,
  };
}

/** "Up 5 hours", "Exited", "Paused", "Restarting". */
export function describeContainerState(container: ContainerInfo, now: TimeInput = Date.now()): string {
  switch (container.state) {
    case "running": {
      const span = formatSpan(container.startedAt, now);
      return span ? `Up ${span}` : "Running";
    }
    case "exited":
      return "Exited";
    case "paused":
      return "Paused";
    case "restarting":
      return "Restarting";
    default:
      return "";
  }
}
