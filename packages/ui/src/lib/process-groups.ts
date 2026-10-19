import type * as React from "react";
import { toMs, type TimeInput } from "./time";

/** Sortable process-table columns. */
export type ProcessColumn = "pid" | "name" | "user" | "cpu" | "memory" | "vram" | "state" | "started";

/** Sort of a process table: the column and the direction. */
export interface ProcessSort {
  key: ProcessColumn;
  direction: "asc" | "desc";
}

/** The process fields that sorting and grouping read (`ProcessInfo` satisfies it). */
export interface GroupableProcess {
  pid: number;
  name: string;
  /** The owning app's name ("Google Chrome" for its helper processes). */
  app?: string;
  /** App icon, shown on group rows. */
  icon?: React.ReactNode;
  user?: string;
  cpu?: number | null;
  memory?: number | null;
  vram?: number | null;
  state?: string;
  startedAt?: TimeInput;
}

/** One group of processes: key, name and icon, with its processes and their summed CPU, memory and VRAM. */
export interface ProcessGroup<T extends GroupableProcess = GroupableProcess> {
  key: string;
  name: string;
  icon?: React.ReactNode;
  processes: T[];
  /** Summed CPU percent. */
  cpu: number;
  /** Summed resident memory, bytes. */
  memory: number;
  /** Summed GPU memory, bytes. */
  vram: number;
  count: number;
}

/** Options for `groupProcesses`: how to key and name the groups. */
export interface GroupProcessesOptions<T extends GroupableProcess> {
  /** Group key per process; `undefined` leaves the process ungrouped. Default `defaultProcessGroupKey`. */
  key?: (process: T) => string | undefined;
  /** Display name for a group. Default: the key. */
  name?: (key: string, processes: T[]) => string;
}

/** Result of `groupProcesses`: the groups and the processes that belong to none. */
export interface GroupedProcesses<T extends GroupableProcess> {
  groups: ProcessGroup<T>[];
  ungrouped: T[];
}

/** Groups by the owning app (`process.app`), falling back to the process's own name. */
export function defaultProcessGroupKey(process: GroupableProcess): string | undefined {
  const app = process.app?.trim();
  return app || process.name || undefined;
}

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Groups processes by a key (first-seen order), summing CPU and memory per group. */
export function groupProcesses<T extends GroupableProcess>(
  processes: readonly T[],
  options: GroupProcessesOptions<T> = {}
): GroupedProcesses<T> {
  const keyOf = options.key ?? defaultProcessGroupKey;
  const byKey = new Map<string, T[]>();
  const ungrouped: T[] = [];
  for (const p of processes) {
    const key = keyOf(p);
    if (key === undefined || key === "") {
      ungrouped.push(p);
      continue;
    }
    const list = byKey.get(key);
    if (list) list.push(p);
    else byKey.set(key, [p]);
  }
  const groups = [...byKey].map(([key, list]): ProcessGroup<T> => ({
    key,
    name: options.name?.(key, list) ?? key,
    icon: list.find((p) => p.icon != null)?.icon,
    processes: list,
    cpu: list.reduce((s, p) => s + num(p.cpu), 0),
    memory: list.reduce((s, p) => s + num(p.memory), 0),
    vram: list.reduce((s, p) => s + num(p.vram), 0),
    count: list.length,
  }));
  return { groups, ungrouped };
}

/** The value a process sorts by for a column (nulls sort as -1 / ""). */
export function processSortValue(p: GroupableProcess, key: ProcessColumn): number | string {
  switch (key) {
    case "pid":
      return p.pid;
    case "name":
      return p.name.toLowerCase();
    case "user":
      return (p.user ?? "").toLowerCase();
    case "cpu":
      return p.cpu ?? -1;
    case "memory":
      return p.memory ?? -1;
    case "vram":
      return p.vram ?? -1;
    case "state":
      return p.state ?? "";
    case "started":
      return toMs(p.startedAt) ?? 0;
  }
}

/** The user shared by every process in a group, or `undefined`. */
export function processGroupUser(group: ProcessGroup): string | undefined {
  const first = group.processes[0]?.user;
  return first !== undefined && group.processes.every((p) => p.user === first) ? first : undefined;
}

/** The earliest start time in a group (ms), or `undefined`. */
export function processGroupStartedAt(group: ProcessGroup): number | undefined {
  let min: number | undefined;
  for (const p of group.processes) {
    const ms = toMs(p.startedAt);
    if (ms !== undefined && (min === undefined || ms < min)) min = ms;
  }
  return min;
}

/** The value a group sorts by: sums for CPU/RAM/VRAM, lowest PID, earliest start, shared user. */
export function processGroupSortValue(group: ProcessGroup, key: ProcessColumn): number | string {
  switch (key) {
    case "pid":
      return group.processes.length ? Math.min(...group.processes.map((p) => p.pid)) : 0;
    case "name":
      return group.name.toLowerCase();
    case "user":
      return (processGroupUser(group) ?? "").toLowerCase();
    case "cpu":
      return group.cpu;
    case "memory":
      return group.memory;
    case "vram":
      return group.vram;
    case "state": {
      const first = group.processes[0]?.state ?? "";
      return group.processes.every((p) => (p.state ?? "") === first) ? first : "";
    }
    case "started":
      return processGroupStartedAt(group) ?? 0;
  }
}

/** Stable sort by a value function and a direction. */
function sortByValue<T>(items: readonly T[], value: (item: T) => number | string, direction: "asc" | "desc"): T[] {
  const dir = direction === "asc" ? 1 : -1;
  return items
    .map((item, i) => [item, value(item), i] as const)
    .sort(([, va, ia], [, vb, ib]) => (va < vb ? -1 : va > vb ? 1 : ia - ib) * (va === vb ? 1 : dir))
    .map(([item]) => item);
}

/** Sorts processes by a column (stable). `null` keeps the input order. */
export function sortProcessList<T extends GroupableProcess>(processes: readonly T[], sort: ProcessSort | null): T[] {
  if (!sort) return processes as T[];
  return sortByValue(processes, (p) => processSortValue(p, sort.key), sort.direction);
}

/** Sorts groups by a column, and each group's processes by the same column. */
export function sortProcessGroups<T extends GroupableProcess>(
  groups: readonly ProcessGroup<T>[],
  sort: ProcessSort | null
): ProcessGroup<T>[] {
  if (!sort) return groups as ProcessGroup<T>[];
  return sortByValue(groups, (g) => processGroupSortValue(g, sort.key), sort.direction).map((g) => ({
    ...g,
    processes: sortProcessList(g.processes, sort),
  }));
}

/** A top-level row of a grouped process list: an app group or an ungrouped process. */
export type ProcessTreeItem<T extends GroupableProcess = GroupableProcess> =
  | { type: "group"; key: string; group: ProcessGroup<T> }
  | { type: "process"; key: string; process: T };

/**
 * Groups and sorts in one step: groups and ungrouped processes are sorted together at the top level,
 * and each group's processes are sorted within it. Item keys are `g:<group key>` and `p:<pid>`.
 */
export function buildProcessTree<T extends GroupableProcess>(
  processes: readonly T[],
  options: GroupProcessesOptions<T> & { sort?: ProcessSort | null } = {}
): ProcessTreeItem<T>[] {
  const { groups, ungrouped } = groupProcesses(processes, options);
  const sort = options.sort ?? null;
  const items: ProcessTreeItem<T>[] = [
    ...sortProcessGroups(groups, sort).map((group) => ({ type: "group" as const, key: `g:${group.key}`, group })),
    ...ungrouped.map((process) => ({ type: "process" as const, key: `p:${process.pid}`, process })),
  ];
  if (!sort) return items;
  return sortByValue(
    items,
    (item) => (item.type === "group" ? processGroupSortValue(item.group, sort.key) : processSortValue(item.process, sort.key)),
    sort.direction
  );
}
