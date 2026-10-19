/** Agent job views: JobStatePill, JobNextRun, JobRow, JobList, RunHistory and JobDetail. */
import * as React from "react";
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiDeleteBinLine,
  RiEditLine,
  RiFileTextLine,
  RiPauseLine,
  RiPlayLine,
  RiSkipForwardLine,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatCost } from "../../lib/format";
import { formatDateTime, safeISO } from "../../lib/time";
import { toneClasses, type Tone } from "../../lib/tone";
import { normalizeTaskStatus, taskStatusTone, type TaskStatus } from "../../lib/status";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Badge } from "../../primitives/badge";
import { StatusBadge } from "../../primitives/status-badge";
import { ConfirmDialog } from "../../primitives/dialog";
import { KeyValueList, type KeyValueItem } from "../../primitives/key-value";
import { TimelineBar, formatTimelineDuration, type TimelineSpan } from "../../patterns/timeline-bar";
import { formatTokenCount } from "../../lib/token-count";
import { useElementWidth } from "../../hooks/use-resize-observer";
import {
  describeSchedule,
  formatCountdownClock,
  formatScheduleRelative,
  nextScheduleRuns,
  toScheduleString,
  useScheduleNow,
} from "../../patterns/cron";
import { toMs, type TimeLike } from "./agent-jobs-internal";
import {
  agentJobState,
  type AgentJob,
  type AgentJobRun,
  type AgentJobRunStatusInput,
  type AgentJobState,
  type DeliveryPlatform,
  type DeliveryPlatformStatus,
} from "./agent-jobs-model";
import { formatDeliveryTarget } from "./agent-jobs-delivery";

/* ------------------------------------------------------------------ */
/* JobStatePill                                                        */
/* ------------------------------------------------------------------ */

const stateMeta: Record<AgentJobState, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  running: { label: "Running", tone: "primary" },
  paused: { label: "Paused", tone: "warning" },
  error: { label: "Error", tone: "destructive" },
  completed: { label: "Completed", tone: "success" },
  disabled: { label: "Disabled", tone: "neutral" },
};

export interface JobStatePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: AgentJobState;
  label?: React.ReactNode;
  size?: "sm" | "md";
}

/** Pill for a scheduled job's state (a StatusBadge preset); `running` shows a spinner. */
export const JobStatePill = React.forwardRef<HTMLSpanElement, JobStatePillProps>(
  ({ state, label, size = "md", ...props }, ref) => {
    const meta = stateMeta[state];
    return (
      <StatusBadge
        ref={ref}
        data-state={state}
        tone={meta.tone}
        icon={state === "running" ? "spinner" : "dot"}
        size={size}
        label={label ?? meta.label}
        {...props}
      />
    );
  }
);
JobStatePill.displayName = "JobStatePill";

/* ------------------------------------------------------------------ */
/* JobRow / JobList                                                    */
/* ------------------------------------------------------------------ */

const runStatusLabel: Record<TaskStatus, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
};

const runStatusOf = (status: AgentJobRunStatusInput) => normalizeTaskStatus(status);

function RunStatusGlyph({ status: statusInput }: { status: AgentJobRunStatusInput }) {
  const status = runStatusOf(statusInput);
  const label = runStatusLabel[status];
  const className = toneClasses.text[taskStatusTone[status]];
  if (status === "running") return <Spinner size="xs" label={label} className={className} />;
  const Icon = status === "succeeded" ? RiCheckboxCircleFill : RiCloseCircleFill;
  return (
    <span className={cn("inline-flex", className)}>
      <Icon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface JobNextRunProps extends Omit<React.TimeHTMLAttributes<HTMLTimeElement>, "children"> {
  at: TimeLike;
}

/** "in 12:34" under an hour (live), otherwise "in 3h". */
export const JobNextRun = React.forwardRef<HTMLTimeElement, JobNextRunProps>(function JobNextRun({ at, className, ...props }, ref) {
  const target = toMs(at);
  const soon = target - Date.now() < 3_600_000;
  const now = useScheduleNow(true, soon ? 1000 : 30_000);
  const diff = target - now;
  const text = diff <= 0 ? "due now" : diff < 3_600_000 ? `in ${formatCountdownClock(diff)}` : formatScheduleRelative(target, now);
  return (
    <time ref={ref} dateTime={safeISO(target)} data-slot="job-next-run" className={cn("tabular-nums", className)} {...props}>
      {text}
    </time>
  );
});
JobNextRun.displayName = "JobNextRun";

export interface JobRowActions {
  onPause?: (job: AgentJob) => void;
  onResume?: (job: AgentJob) => void;
  onRunNow?: (job: AgentJob) => void;
  onEdit?: (job: AgentJob) => void;
  /** Called after the user confirms. */
  onDelete?: (job: AgentJob) => void | Promise<void>;
}

export interface JobRowProps extends Omit<React.HTMLAttributes<HTMLLIElement>, "onSelect" | "onPause">, JobRowActions {
  job: AgentJob;
  selected?: boolean;
  onSelect?: (job: AgentJob) => void;
  /** Label for the model id. */
  modelLabel?: React.ReactNode;
}

function JobActionButtons({ job, onPause, onResume, onRunNow, onEdit, onDelete, compact }: JobRowActions & { job: AgentJob; compact?: boolean }) {
  const state = agentJobState(job);
  const paused = state === "paused" || state === "disabled";
  const size = compact ? "icon-sm" : "sm";
  const btn = (label: string, icon: React.ReactNode, onClick: () => void, text: string) =>
    compact ? (
      <Button type="button" variant="ghost" size={size} aria-label={label} title={text} onClick={onClick}>
        {icon}
      </Button>
    ) : (
      <Button type="button" variant="outline" size={size} leadingIcon={icon} aria-label={label} onClick={onClick}>
        {text}
      </Button>
    );
  return (
    <div className="ml-auto flex max-w-full flex-wrap items-center gap-1">
      {paused && onResume ? btn(`Resume ${job.name}`, <RiPlayLine aria-hidden />, () => onResume(job), "Resume") : null}
      {!paused && onPause ? btn(`Pause ${job.name}`, <RiPauseLine aria-hidden />, () => onPause(job), "Pause") : null}
      {onRunNow ? btn(`Run ${job.name} now`, <RiSkipForwardLine aria-hidden />, () => onRunNow(job), "Run now") : null}
      {onEdit ? btn(`Edit ${job.name}`, <RiEditLine aria-hidden />, () => onEdit(job), "Edit") : null}
      {onDelete ? (
        <ConfirmDialog
          tone="destructive"
          title={`Delete “${job.name}”?`}
          description="The job and its schedule are removed. Past run history is kept."
          confirmLabel="Delete job"
          onConfirm={() => onDelete(job)}
          trigger={
            compact ? (
              <Button type="button" variant="ghost" size={size} aria-label={`Delete ${job.name}`} title="Delete">
                <RiDeleteBinLine aria-hidden />
              </Button>
            ) : (
              <Button type="button" variant="destructive-soft" size={size} leadingIcon={<RiDeleteBinLine aria-hidden />} aria-label={`Delete ${job.name}`}>
                Delete
              </Button>
            )
          }
        />
      ) : null}
    </div>
  );
}

/** One scheduled job: name, schedule, state, next/last run, model and mode, with row actions. */
export const JobRow = React.forwardRef<HTMLLIElement, JobRowProps>(
  ({ job, selected, onSelect, modelLabel, onPause, onResume, onRunNow, onEdit, onDelete, className, ...props }, ref) => {
    const state = agentJobState(job);
    const showNext = job.nextRunAt != null && (state === "scheduled" || state === "running" || state === "error");
    return (
      <li
        ref={ref}
        data-selected={selected || undefined}
        className={cn(
          "group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-box border border-transparent px-3 py-2.5 transition-colors",
          selected ? "border-border bg-accent" : "hover:bg-accent/60",
          className
        )}
        {...props}
      >
        <button
          type="button"
          aria-pressed={onSelect ? !!selected : undefined}
          onClick={() => onSelect?.(job)}
          className={cn("flex min-w-0 flex-1 basis-48 flex-col items-start gap-1 rounded-md text-left", focusRing)}
        >
          <span className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="max-w-full truncate text-sm font-medium text-foreground">{job.name}</span>
            <JobStatePill state={state} size="sm" />
            {job.mode === "script" ? (
              <Badge size="sm" color="gray">
                Script
              </Badge>
            ) : null}
          </span>
          <span className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <RiTimeLine aria-hidden className="size-3.5" />
              {describeSchedule(job.schedule)}
            </span>
            {showNext ? (
              <span>
                Next <JobNextRun at={job.nextRunAt!} />
              </span>
            ) : null}
            {job.lastRunAt != null ? (
              <span className="inline-flex items-center gap-1">
                {job.lastStatus ? <RunStatusGlyph status={job.lastStatus} /> : null}
                Last {formatScheduleRelative(job.lastRunAt)}
              </span>
            ) : null}
            {job.mode === "agent" && (modelLabel ?? job.model) ? <span className="truncate">{modelLabel ?? job.model}</span> : null}
          </span>
        </button>
        <JobActionButtons compact job={job} onPause={onPause} onResume={onResume} onRunNow={onRunNow} onEdit={onEdit} onDelete={onDelete} />
      </li>
    );
  }
);
JobRow.displayName = "JobRow";

export interface JobListProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect" | "onPause">, JobRowActions {
  jobs: AgentJob[];
  selectedId?: string | null;
  onSelect?: (job: AgentJob) => void;
  /** Map model ids to labels. */
  modelLabels?: Record<string, React.ReactNode>;
  /** Shown when there are no jobs. Default "No scheduled jobs yet". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

/** Master list of scheduled jobs. */
export const JobList = React.forwardRef<HTMLUListElement, JobListProps>(
  ({ jobs, selectedId, onSelect, modelLabels, emptyState, empty, onPause, onResume, onRunNow, onEdit, onDelete, className, ...props }, ref) => {
    if (!jobs.length) {
      return <div className="rounded-box border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyState ?? empty ?? "No scheduled jobs yet"}</div>;
    }
    return (
      <ul ref={ref} aria-label="Scheduled jobs" className={cn("flex flex-col gap-1", className)} {...props}>
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            selected={selectedId === job.id}
            onSelect={onSelect}
            modelLabel={job.model ? modelLabels?.[job.model] : undefined}
            onPause={onPause}
            onResume={onResume}
            onRunNow={onRunNow}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    );
  }
);
JobList.displayName = "JobList";

/* ------------------------------------------------------------------ */
/* RunHistory                                                          */
/* ------------------------------------------------------------------ */

const usd = (n: number) => formatCost(n, { locale: "en-US" });

export interface RunHistoryProps extends React.HTMLAttributes<HTMLDivElement> {
  runs: AgentJobRun[];
  /** Runs revealed per "Load more". Default 5. */
  pageSize?: number;
  /** More runs exist on the server; "Load more" calls `onLoadMore` once local runs are exhausted. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  onOpenTranscript?: (run: AgentJobRun) => void;
  locale?: string;
  /** Shown when there are no runs. Default "No runs yet". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

/** Past runs of a job: start, duration, status, cost/tokens, trigger, error snippet and a transcript link. */
export const RunHistory = React.forwardRef<HTMLDivElement, RunHistoryProps>(
  ({ runs, pageSize = 5, hasMore, onLoadMore, loadingMore, onOpenTranscript, locale, emptyState, empty, className, ...props }, ref) => {
    const [shown, setShown] = React.useState(pageSize);
    const visible = runs.slice(0, shown);
    const localMore = runs.length > shown;
    const formatStart = (t: number) => formatDateTime(t, { locale: locale ?? "en-US", year: "never" });
    const loadMore = () => {
      if (localMore) setShown((s) => s + pageSize);
      else {
        setShown((s) => s + pageSize);
        onLoadMore?.();
      }
    };
    return (
      <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
        {!runs.length ? <p className="py-4 text-center text-sm text-muted-foreground">{emptyState ?? empty ?? "No runs yet"}</p> : null}
        {runs.length ? (
          <ol aria-label="Run history" className="flex flex-col divide-y divide-border rounded-box border border-border">
            {visible.map((run) => {
              const started = toMs(run.startedAt);
              return (
                <li key={run.id} className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      <RunStatusGlyph status={run.status} />
                      <time dateTime={safeISO(started)} className="font-medium tabular-nums">
                        {formatStart(started)}
                      </time>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{run.durationMs != null ? formatTimelineDuration(run.durationMs) : runStatusOf(run.status) === "running" ? "running…" : "—"}</span>
                    {run.trigger ? (
                      <Badge size="sm" color={run.trigger === "manual" ? "purple" : run.trigger === "webhook" ? "orange" : "gray"}>
                        {run.trigger === "schedule" ? "Scheduled" : run.trigger === "manual" ? "Manual" : "Webhook"}
                      </Badge>
                    ) : null}
                    {run.costUsd != null || run.tokens != null ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {[run.costUsd != null ? usd(run.costUsd) : null, run.tokens != null ? `${formatTokenCount(run.tokens)} tokens` : null].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    {onOpenTranscript ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="ml-auto"
                        leadingIcon={<RiFileTextLine aria-hidden />}
                        aria-label={`Open transcript for run at ${formatStart(started)}`}
                        onClick={() => onOpenTranscript(run)}
                      >
                        Transcript
                      </Button>
                    ) : null}
                  </div>
                  {run.error ? <p className="line-clamp-2 rounded-md bg-destructive-soft px-2 py-1 font-mono text-xs text-destructive-soft-foreground">{run.error}</p> : null}
                </li>
              );
            })}
          </ol>
        ) : null}
        {localMore || hasMore ? (
          <Button type="button" variant="ghost" size="sm" className="self-center" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        ) : null}
      </div>
    );
  }
);
RunHistory.displayName = "RunHistory";

/* ------------------------------------------------------------------ */
/* JobDetail                                                           */
/* ------------------------------------------------------------------ */

export interface JobDetailProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onPause">, JobRowActions {
  job: AgentJob;
  runs?: AgentJobRun[];
  hasMoreRuns?: boolean;
  onLoadMoreRuns?: () => void;
  loadingMoreRuns?: boolean;
  onOpenTranscript?: (run: AgentJobRun) => void;
  /** Show a timeline of recent runs. */
  showTimeline?: boolean;
  timeZone?: string;
  now?: Date | number;
  modelLabel?: React.ReactNode;
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  runsPageSize?: number;
}

/** Detail pane for one job: actions, schedule and next runs, configuration and run history. */
export const JobDetail = React.forwardRef<HTMLDivElement, JobDetailProps>(
  (
    {
      job,
      runs = [],
      hasMoreRuns,
      onLoadMoreRuns,
      loadingMoreRuns,
      onOpenTranscript,
      showTimeline,
      timeZone,
      now,
      modelLabel,
      deliveryStatus,
      runsPageSize,
      onPause,
      onResume,
      onRunNow,
      onEdit,
      onDelete,
      className,
      ...props
    },
    ref
  ) => {
    const state = agentJobState(job);
    const headingId = React.useId();
    const ref0 = now ?? Date.now();
    // The run timeline labels its axis with clock times (about 70px each): show fewer ticks in a narrow pane so they never overlap.
    const timelineRef = React.useRef<HTMLDivElement>(null);
    const timelineWidth = useElementWidth(timelineRef);
    const timelineTicks = timelineWidth > 0 ? Math.min(6, Math.max(1, Math.floor(timelineWidth / 72) - 1)) : 6;
    const upcoming = state === "paused" || state === "disabled" || state === "completed" ? [] : nextScheduleRuns(job.schedule, ref0, 3, { timeZone });
    const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });

    const items: KeyValueItem[] = [
      { label: "Mode", value: job.mode === "script" ? "Script (no agent)" : "Agent" },
      ...(job.mode === "agent"
        ? [
            { label: "Model", value: modelLabel ?? job.model },
            { label: "Profile", value: job.profile },
            { label: "Skills", value: job.skills.length ? job.skills.join(", ") : undefined },
            { label: "Toolsets", value: job.toolsets.length ? job.toolsets.join(", ") : undefined },
          ]
        : [{ label: "Script", value: job.script, mono: true, copyable: true }]),
      { label: "Schedule", value: toScheduleString(job.schedule), mono: true, copyable: true },
      { label: "Repeat", value: job.repeat == null ? "Forever" : `${job.runCount ?? 0} of ${job.repeat} runs` },
      { label: "Delivers to", value: formatDeliveryTarget(job.delivery, deliveryStatus) },
      { label: "Enabled", value: job.enabled ? "Yes" : "No" },
    ];

    const spans: TimelineSpan[] = runs.slice(0, 30).map((r) => ({
      id: r.id,
      start: r.startedAt,
      end: r.durationMs != null ? toMs(r.startedAt) + r.durationMs : null,
      live: runStatusOf(r.status) === "running",
      tone: taskStatusTone[runStatusOf(r.status)],
      label: runStatusLabel[runStatusOf(r.status)],
    }));
    const windowStart = spans.length ? Math.min(...spans.map((s) => toMs(s.start))) : toMs(ref0) - 86_400_000;

    return (
      <section ref={ref} aria-labelledby={headingId} className={cn("flex min-w-0 flex-col gap-6", className)} {...props}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id={headingId} className="truncate text-lg font-semibold text-foreground">
                {job.name}
              </h2>
              <JobStatePill state={state} />
            </div>
            {job.mode === "agent" && job.prompt ? <p className="line-clamp-2 text-sm text-muted-foreground">{job.prompt}</p> : null}
          </div>
          <JobActionButtons job={job} onPause={onPause} onResume={onResume} onRunNow={onRunNow} onEdit={onEdit} onDelete={onDelete} />
        </header>

        <div className="flex flex-col gap-2 rounded-box border border-border bg-subtle p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <RiTimeLine aria-hidden className="size-4 text-muted-foreground" />
            {describeSchedule(job.schedule)}
          </p>
          {upcoming.length ? (
            <ol aria-label="Next runs" className="flex flex-col gap-0.5 text-sm">
              {upcoming.map((d) => (
                <li key={d.getTime()} className="flex justify-between gap-2 tabular-nums">
                  <time dateTime={d.toISOString()}>{fmt.format(d)}</time>
                  <span className="text-xs text-muted-foreground">{formatScheduleRelative(d, ref0)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">{state === "paused" ? "Paused — no upcoming runs" : "No upcoming runs"}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Configuration</h3>
          <KeyValueList items={items} />
        </div>

        {showTimeline && spans.length ? (
          <div ref={timelineRef} className="flex min-w-0 flex-col gap-2">
            <h3 className="text-sm font-semibold">Recent runs</h3>
            <TimelineBar from={windowStart} to={ref0} now={ref0} spans={spans} ticks={timelineTicks} label={`Recent runs of ${job.name}`} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Run history</h3>
          <RunHistory runs={runs} pageSize={runsPageSize} hasMore={hasMoreRuns} onLoadMore={onLoadMoreRuns} loadingMore={loadingMoreRuns} onOpenTranscript={onOpenTranscript} />
        </div>
      </section>
    );
  }
);
JobDetail.displayName = "JobDetail";
