/**
 * Canonical lifecycle vocabulary for tasks, jobs, runs, transfers and tool calls.
 *
 * Components accept legacy spellings through `TaskStatusInput` and compare via
 * `normalizeTaskStatus`, so "cancelled", "done", "completed", "error", "in_progress" and friends
 * all keep working. New code and docs use the canonical names (US spelling: "canceled").
 */

import type { Tone } from "./tone";

export const TASK_STATUSES = ["pending", "running", "succeeded", "failed", "canceled"] as const;

/** Canonical lifecycle status. */
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Deprecated spellings accepted for backward compatibility. Prefer `TaskStatus`. */
export type LegacyTaskStatus =
  | "queued"
  | "waiting"
  | "idle"
  | "in_progress"
  | "progress"
  | "active"
  | "done"
  | "complete"
  | "completed"
  | "success"
  | "error"
  | "failure"
  | "cancelled";

/** What status props accept: canonical names plus deprecated aliases. */
export type TaskStatusInput = TaskStatus | LegacyTaskStatus;

const ALIASES: Record<LegacyTaskStatus, TaskStatus> = {
  queued: "pending",
  waiting: "pending",
  idle: "pending",
  in_progress: "running",
  progress: "running",
  active: "running",
  done: "succeeded",
  complete: "succeeded",
  completed: "succeeded",
  success: "succeeded",
  error: "failed",
  failure: "failed",
  cancelled: "canceled",
};

/** Map any accepted status spelling to its canonical `TaskStatus` (unknown or missing → `fallback`). */
export function normalizeTaskStatus(
  status: TaskStatusInput | string | null | undefined,
  fallback: TaskStatus = "pending"
): TaskStatus {
  if (!status) return fallback;
  if ((TASK_STATUSES as readonly string[]).includes(status)) return status as TaskStatus;
  return Object.hasOwn(ALIASES, status) ? ALIASES[status as LegacyTaskStatus] : fallback;
}

/** True once a status can no longer change (succeeded, failed or canceled). */
export function isTerminalStatus(status: TaskStatusInput | string | null | undefined): boolean {
  const s = normalizeTaskStatus(status);
  return s === "succeeded" || s === "failed" || s === "canceled";
}

/** Default semantic tone for a lifecycle status. */
export const taskStatusTone: Record<TaskStatus, Tone> = {
  pending: "neutral",
  running: "primary",
  succeeded: "success",
  failed: "destructive",
  canceled: "neutral",
};
