import * as React from "react";
import { RiCheckLine, RiCloseCircleLine, RiErrorWarningLine, RiLoader4Line } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import type { Tone } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Progress } from "../../primitives/progress";
import {
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogTone,
} from "../../primitives/dialog";
import { LogViewer, type LogLine } from "../../patterns/log-viewer";

/* ------------------------------------------------------------------ */
/* useStreamingTask                                                    */
/* ------------------------------------------------------------------ */

export type StreamingTaskState = "idle" | "running" | "succeeded" | "failed" | "canceled";

/** Map any lifecycle spelling (`pending`, `cancelled`, `done`, `error`…) to a `StreamingTaskState`. "pending" → "idle". */
export function toStreamingTaskState(state: StreamingTaskState | TaskStatusInput | null | undefined): StreamingTaskState {
  if (state === "idle") return "idle";
  const s = normalizeTaskStatus(state);
  return s === "pending" ? "idle" : s;
}

export interface StreamingTaskEvent {
  /** 0–100, or `null` for indeterminate. */
  progress?: number | null;
  /** Current phase label, e.g. "Downloading…". */
  phase?: string;
  /** One or more log lines to append. */
  log?: LogLine | LogLine[];
  /** Ends the task successfully. */
  done?: boolean;
  /** Ends the task as failed. */
  error?: string | Error;
}

/** Minimal EventSource-like emitter: `message` events carry JSON (or objects) shaped like `StreamingTaskEvent`. */
export interface StreamingTaskEmitter {
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
  close?: () => void;
}

export type StreamingTaskSource = AsyncIterable<StreamingTaskEvent> | StreamingTaskEmitter;
export type StreamingTaskStarter =
  | StreamingTaskSource
  | ((signal: AbortSignal) => StreamingTaskSource | Promise<StreamingTaskSource>);

export interface UseStreamingTaskOptions {
  /** Default starter used by `start()` / `retry()` when none is passed. */
  task?: StreamingTaskStarter;
  /** Cap on retained log lines. Default 2000. */
  maxLogLines?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface UseStreamingTaskResult {
  state: StreamingTaskState;
  progress: number | null;
  phase?: string;
  logs: LogLine[];
  error?: string;
  start: (starter?: StreamingTaskStarter) => Promise<void>;
  /** Restart with the last starter. */
  retry: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

interface TaskSnapshot {
  state: StreamingTaskState;
  progress: number | null;
  phase?: string;
  logs: LogLine[];
  error?: string;
}

const initialSnapshot: TaskSnapshot = { state: "idle", progress: 0, logs: [] };

const isAsyncIterable = (v: unknown): v is AsyncIterable<StreamingTaskEvent> =>
  v != null && typeof (v as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function";

const errorText = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === "string" ? e : e == null ? "Something went wrong" : String(e);

function parseMessage(event: unknown): StreamingTaskEvent | null {
  const data = event && typeof event === "object" && "data" in event ? (event as { data: unknown }).data : event;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === "object" ? parsed : { log: data };
    } catch {
      return { log: data };
    }
  }
  return data && typeof data === "object" ? (data as StreamingTaskEvent) : null;
}

/** Consume an async iterator or EventSource-like emitter of `{ progress, phase, log }` events into state. */
export function useStreamingTask(options: UseStreamingTaskOptions = {}): UseStreamingTaskResult {
  const [snap, setSnap] = React.useState<TaskSnapshot>(initialSnapshot);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  const runRef = React.useRef<{ id: number; controller: AbortController; cleanup?: () => void } | null>(null);
  const lastStarter = React.useRef<StreamingTaskStarter | undefined>(undefined);
  const counter = React.useRef(0);

  React.useEffect(
    () => () => {
      runRef.current?.controller.abort();
      runRef.current?.cleanup?.();
    },
    []
  );

  const start = React.useCallback(async (starter?: StreamingTaskStarter) => {
    const chosen = starter ?? optionsRef.current.task;
    if (!chosen) return;
    lastStarter.current = chosen;
    runRef.current?.controller.abort();
    runRef.current?.cleanup?.();
    const id = ++counter.current;
    const controller = new AbortController();
    const run: { id: number; controller: AbortController; cleanup?: () => void } = { id, controller };
    runRef.current = run;
    const live = () => runRef.current?.id === id && !controller.signal.aborted;
    const max = optionsRef.current.maxLogLines ?? 2000;

    setSnap({ state: "running", progress: 0, logs: [], phase: undefined, error: undefined });

    let finished = false;
    const finish = (state: "succeeded" | "failed", error?: string) => {
      if (finished || !live()) return;
      finished = true;
      run.cleanup?.();
      setSnap((s) => ({
        ...s,
        state,
        error,
        progress: state === "succeeded" ? 100 : s.progress,
      }));
      if (state === "succeeded") optionsRef.current.onSuccess?.();
      else optionsRef.current.onError?.(error ?? "Something went wrong");
    };
    const apply = (event: StreamingTaskEvent | null) => {
      if (!event || !live()) return;
      setSnap((s) => {
        const next = { ...s };
        if (event.progress !== undefined) next.progress = event.progress;
        if (event.phase !== undefined) next.phase = event.phase;
        if (event.log !== undefined) {
          const add = Array.isArray(event.log) ? event.log : [event.log];
          const logs = s.logs.concat(add);
          next.logs = logs.length > max ? logs.slice(logs.length - max) : logs;
        }
        return next;
      });
      if (event.error) finish("failed", errorText(event.error));
      else if (event.done) finish("succeeded");
    };

    try {
      const source = typeof chosen === "function" ? await chosen(controller.signal) : chosen;
      if (!live()) return;
      if (isAsyncIterable(source)) {
        for await (const event of source) {
          if (!live()) break;
          apply(event);
          if (finished) break;
        }
        if (live()) finish("succeeded");
      } else {
        await new Promise<void>((resolve) => {
          const onMessage = (e: unknown) => {
            apply(parseMessage(e));
            if (finished) resolve();
          };
          const onDone = () => {
            finish("succeeded");
            resolve();
          };
          const onError = (e: unknown) => {
            const data = parseMessage(e);
            finish("failed", data?.error ? errorText(data.error) : "Connection lost");
            resolve();
          };
          source.addEventListener("message", onMessage);
          source.addEventListener("done", onDone);
          source.addEventListener("complete", onDone);
          source.addEventListener("error", onError);
          run.cleanup = () => {
            source.removeEventListener("message", onMessage);
            source.removeEventListener("done", onDone);
            source.removeEventListener("complete", onDone);
            source.removeEventListener("error", onError);
            source.close?.();
            resolve();
          };
          controller.signal.addEventListener("abort", () => run.cleanup?.());
        });
      }
    } catch (e) {
      if (live()) finish("failed", errorText(e));
    }
  }, []);

  const cancel = React.useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    runRef.current = null;
    run.controller.abort();
    run.cleanup?.();
    setSnap((s) => (s.state === "running" ? { ...s, state: "canceled" } : s));
  }, []);

  const retry = React.useCallback(() => start(lastStarter.current), [start]);

  const reset = React.useCallback(() => {
    const run = runRef.current;
    runRef.current = null;
    run?.controller.abort();
    run?.cleanup?.();
    setSnap(initialSnapshot);
  }, []);

  return { ...snap, start, retry, cancel, reset };
}

/* ------------------------------------------------------------------ */
/* ProgressDialog                                                      */
/* ------------------------------------------------------------------ */

const stateLabel: Record<StreamingTaskState, string> = {
  idle: "Ready",
  running: "Working…",
  succeeded: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

const stateColor: Record<StreamingTaskState, Tone> = {
  idle: "primary",
  running: "primary",
  succeeded: "success",
  failed: "destructive",
  canceled: "neutral",
};

const stateTone: Partial<Record<StreamingTaskState, { tone: DialogTone; icon: React.ReactNode }>> = {
  succeeded: { tone: "success", icon: <RiCheckLine aria-hidden /> },
  failed: { tone: "destructive", icon: <RiErrorWarningLine aria-hidden /> },
  canceled: { tone: "default", icon: <RiCloseCircleLine aria-hidden /> },
};

export interface ProgressDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Pull state, progress, phase, logs, error, cancel and retry from `useStreamingTask`. Explicit props win. */
  task?: UseStreamingTaskResult;
  /** Lifecycle state. Accepts canonical `TaskStatus` spellings too ("pending" = idle, "cancelled", "done", "error"…). */
  state?: StreamingTaskState | TaskStatusInput;
  /** 0–100, or `null` for indeterminate. */
  progress?: number | null;
  /** Current phase, e.g. "Downloading…". */
  phase?: React.ReactNode;
  /** Streamed log lines; shows an embedded LogViewer. */
  logs?: readonly LogLine[];
  /** Show the log panel (defaults to true when logs exist). */
  showLogs?: boolean;
  logHeight?: number | string;
  error?: React.ReactNode;
  /** Shown when succeeded. */
  successMessage?: React.ReactNode;
  /** Content shown before start (e.g. a target selector). Visible only while idle. */
  children?: React.ReactNode;
  /** Shows a Start button while idle. */
  onStart?: () => void;
  startLabel?: React.ReactNode;
  startDisabled?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  /** Ask before closing while running. Default true. */
  confirmClose?: boolean;
  confirmTitle?: React.ReactNode;
  confirmDescription?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/** Modal for long-running or streaming operations: phase, progress, live log, cancel/retry, guarded close. */
export function ProgressDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  task,
  state: stateProp,
  progress: progressProp,
  phase: phaseProp,
  logs: logsProp,
  showLogs,
  logHeight = 200,
  error: errorProp,
  successMessage,
  children,
  onStart,
  startLabel = "Start",
  startDisabled,
  onCancel: onCancelProp,
  onRetry: onRetryProp,
  confirmClose = true,
  confirmTitle = "Stop this operation?",
  confirmDescription = "It is still running. Closing will cancel it.",
  size = "md",
  className,
}: ProgressDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [confirming, setConfirming] = React.useState(false);

  const state = toStreamingTaskState(stateProp ?? task?.state ?? "idle");
  const progress = progressProp !== undefined ? progressProp : (task?.progress ?? 0);
  const phase = phaseProp ?? task?.phase;
  const logs = logsProp ?? task?.logs;
  const error = errorProp ?? task?.error;
  const onCancel = onCancelProp ?? task?.cancel;
  const onRetry = onRetryProp ?? (task ? () => void task.retry() : undefined);
  const running = state === "running";

  const requestOpenChange = (next: boolean) => {
    if (!next && running) {
      if (confirmClose) setConfirming(true);
      else {
        onCancel?.();
        setOpen(false);
      }
      return;
    }
    setOpen(next);
  };

  const confirmStop = () => {
    onCancel?.();
    setConfirming(false);
    setOpen(false);
  };

  const indeterminate = running && progress === null;
  const pct = progress == null ? null : Math.round(clamp(progress, 0, 100));
  const phaseText = phase ?? stateLabel[state];
  const logsVisible = showLogs ?? (logs != null && logs.length > 0);
  const tone = stateTone[state];

  return (
    <>
      <Dialog open={open} onOpenChange={requestOpenChange}>
        <DialogContent size={size} className={className} data-state-task={state}>
          <DialogHeader icon={tone?.icon} tone={tone?.tone}>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <DialogBody className="space-y-4">
            {state === "idle" && children}
            {state !== "idle" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground" aria-live="polite">
                    {running && <RiLoader4Line aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                    <span className="truncate" data-progress-phase="">
                      {phaseText}
                    </span>
                  </span>
                  {pct !== null && <span className="shrink-0 tabular-nums text-muted-foreground">{pct}%</span>}
                </div>
                <Progress
                  aria-label="Progress"
                  value={indeterminate ? null : (pct ?? 0)}
                  indeterminate={indeterminate}
                  tone={stateColor[state]}
                />
              </div>
            )}
            {state === "succeeded" && successMessage && <p className="text-sm text-muted-foreground">{successMessage}</p>}
            {state === "failed" && error && (
              <p
                role="alert"
                className="rounded-box border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground"
              >
                {error}
              </p>
            )}
            {logsVisible && state !== "idle" && (
              <LogViewer lines={logs ?? []} hideToolbar height={logHeight} aria-label="Operation log" className={cn("shadow-none")} />
            )}
          </DialogBody>
          <DialogFooter>
            {state === "idle" && (
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                {onStart && (
                  <Button onClick={onStart} disabled={startDisabled}>
                    {startLabel}
                  </Button>
                )}
              </>
            )}
            {running && onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {(state === "failed" || state === "canceled" || state === "succeeded") && (
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Close
                </Button>
                {state !== "succeeded" && onRetry && <Button onClick={onRetry}>Retry</Button>}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Stop and close"
        cancelLabel="Keep running"
        tone="destructive"
        onConfirm={confirmStop}
      />
    </>
  );
}
ProgressDialog.displayName = "ProgressDialog";
