/* Private helpers shared by the tool-timeline modules (status mapping, rail, nesting context, item registry). Not public. */

import * as React from "react";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";

/** Status values the timeline reports back (e.g. in `ToolGroupLabelInfo`). */
export type ToolTimelineStatus = "success" | "failure" | "progress" | "warning" | "pending";

/**
 * What status props accept: the timeline's own values plus the canonical lifecycle
 * `TaskStatus` (`succeeded`, `failed`, `running`, `canceled`) and its legacy spellings.
 */
export type ToolTimelineStatusInput = ToolTimelineStatus | TaskStatusInput;

/** Resolved display status: the timeline values plus `canceled` (a neutral, finished dot). */
export type DisplayStatus = ToolTimelineStatus | "canceled";

export const statusLabel: Record<DisplayStatus, string> = {
  success: "Succeeded",
  failure: "Failed",
  progress: "In progress",
  warning: "Warning",
  pending: "Pending",
  canceled: "Canceled",
};

const fromTaskStatus = { pending: "pending", running: "progress", succeeded: "success", failed: "failure", canceled: "canceled" } as const;

export function toDisplayStatus(status: ToolTimelineStatusInput): DisplayStatus;
export function toDisplayStatus(status: ToolTimelineStatusInput | undefined): DisplayStatus | undefined;
export function toDisplayStatus(status: ToolTimelineStatusInput | undefined): DisplayStatus | undefined {
  if (status === undefined) return undefined;
  if (status === "warning") return "warning";
  return fromTaskStatus[normalizeTaskStatus(status)];
}

export const NestedContext = React.createContext(false);

export function Rail() {
  return (
    <span
      aria-hidden
      data-slot="tool-timeline-rail"
      className="absolute bottom-0 start-[11px] top-0 w-px bg-border group-first/tl:top-[15px] group-last/tl:bottom-auto group-last/tl:h-[15px] group-only/tl:hidden"
    />
  );
}

export const itemTypes = new Set<unknown>();
