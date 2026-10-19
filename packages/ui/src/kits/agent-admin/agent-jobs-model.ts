/** Agent job data model: job, draft, run and delivery types plus `agentJobState`. */
import type { TaskStatusInput } from "../../lib/status";
import type { CronScheduleValue } from "../../patterns/cron";
import type { TimeLike } from "./agent-jobs-internal";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AgentJobState = "scheduled" | "running" | "paused" | "error" | "completed" | "disabled";
export type AgentJobMode = "agent" | "script";
export type AgentJobRunStatus = "success" | "error" | "running" | "cancelled";
/** Run statuses accepted on input: the legacy `AgentJobRunStatus` values plus canonical `TaskStatus` names. */
export type AgentJobRunStatusInput = AgentJobRunStatus | TaskStatusInput;
export type AgentJobTrigger = "schedule" | "manual" | "webhook";

export type DeliveryPlatform = "local" | "telegram" | "discord" | "slack" | "whatsapp" | "email" | "github" | "webhook";

export interface DeliveryTarget {
  platform: DeliveryPlatform;
  /** Channel id, chat id, address, issue ref or URL. Empty means "the platform's home channel". */
  destination?: string;
}

export interface DeliveryPlatformStatus {
  /** `false` disables the option ("Not connected"). Default true. */
  configured?: boolean;
  /** Default destination used when none is entered. */
  homeChannel?: string;
  /** Disable the option with this reason. */
  disabledReason?: string;
}

/** Everything the job form edits. */
export interface AgentJobDraft {
  id?: string;
  name: string;
  prompt: string;
  /** Script mode: the command whose stdout is delivered as-is. */
  script?: string;
  schedule: CronScheduleValue;
  model?: string;
  profile?: string;
  skills: string[];
  toolsets: string[];
  mode: AgentJobMode;
  /** Stop after this many runs; `null` = forever. */
  repeat: number | null;
  delivery: DeliveryTarget;
  enabled: boolean;
}

export interface AgentJob extends AgentJobDraft {
  id: string;
  state?: AgentJobState;
  nextRunAt?: TimeLike | null;
  lastRunAt?: TimeLike | null;
  lastStatus?: AgentJobRunStatusInput;
  /** Runs completed so far (shown against `repeat`). */
  runCount?: number;
}

export interface AgentJobRun {
  id: string;
  startedAt: TimeLike;
  durationMs?: number;
  status: AgentJobRunStatusInput;
  trigger?: AgentJobTrigger;
  costUsd?: number;
  tokens?: number;
  error?: string;
}

/** Effective state: explicit `state`, otherwise inferred from `enabled`. */
export function agentJobState(job: Pick<AgentJob, "state" | "enabled">): AgentJobState {
  return job.state ?? (job.enabled === false ? "disabled" : "scheduled");
}
