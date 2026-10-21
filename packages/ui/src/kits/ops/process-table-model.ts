import type * as React from "react";
import { formatBytes } from "../../lib/format";
import { sortProcessList, type ProcessColumn, type ProcessGroup, type ProcessSort } from "../../lib/process-groups";
import type { TimeInput } from "../../lib/time";
import { PROCESS_BYTES } from "./process-table-internal";

export type KillSignal = "SIGTERM" | "SIGKILL";

export interface ProcessInfo {
  pid: number;
  name: string;
  /** Full command line (shown truncated with a tooltip). */
  command?: string;
  user?: string;
  /** CPU percent. */
  cpu?: number | null;
  /** Resident memory, bytes. */
  memory?: number | null;
  /** GPU memory, bytes. */
  vram?: number | null;
  gpuIndex?: number;
  state?: "running" | "sleeping" | "idle" | "stopped" | "zombie" | (string & {});
  startedAt?: TimeInput;
  /** The owning app's name ("Google Chrome" for its helpers). `groupBy="app"` groups by it, falling back to `name`. */
  app?: string;
  /** App icon, shown on group rows. */
  icon?: React.ReactNode;
}

export type { ProcessColumn, ProcessSort };

/** An app group in a grouped `ProcessTable`: summed CPU and memory, process count and the processes. */
export type ProcessTableGroup = ProcessGroup<ProcessInfo>;

export interface ProcessQuitOptions {
  /** Force Quit (may lose unsaved work) rather than a normal Quit. */
  force: boolean;
}


/**
 * Human bytes: 1536 → "1.5 KB" (base 1024).
 * @deprecated Use `formatBytes(bytes, { decimals: 1, wholeAbove: 100 })`.
 */
export function formatProcessBytes(bytes: number | null | undefined): string {
  return formatBytes(bytes, PROCESS_BYTES);
}

/** Sort processes by a column (stable, nulls last for desc). */
export function sortProcesses(processes: ProcessInfo[], sort: ProcessSort | null): ProcessInfo[] {
  return sortProcessList(processes, sort);
}
