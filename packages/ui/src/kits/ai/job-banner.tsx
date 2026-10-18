import * as React from "react";
import { RiRefreshLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { TextShimmer } from "../../primitives/text-shimmer";
import { useNow } from "../../hooks/use-now";
import { formatClock } from "../../lib/duration";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";

/* ------------------------------------------------------------------ */
/* JobBanner                                                           */
/* ------------------------------------------------------------------ */

export interface JobBannerPhase {
  id: string;
  label: string;
  /** Present-tense line while active, e.g. "Reading 7 pages…". */
  activeLabel?: string;
}

export const defaultJobPhases: JobBannerPhase[] = [
  { id: "planning", label: "Planning", activeLabel: "Planning the research…" },
  { id: "searching", label: "Searching", activeLabel: "Searching the web…" },
  { id: "reading", label: "Reading", activeLabel: "Reading sources…" },
  { id: "writing", label: "Writing", activeLabel: "Writing the report…" },
];

export interface JobBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  phases?: JobBannerPhase[];
  /** Current phase id. */
  phase?: string;
  /** Lifecycle status (`running | succeeded | failed | canceled`; legacy `done` / `cancelled` still work). */
  status?: TaskStatusInput;
  /** Epoch ms the job started; elapsed time ticks itself. */
  startedAt?: number;
  /** Elapsed seconds (when not using startedAt). */
  elapsed?: number;
  /** Extra detail, e.g. the current query. */
  detail?: React.ReactNode;
  onCancel?: () => void;
  onAskAgain?: () => void;
  onOpenResult?: () => void;
}

/** Banner for a long-running background job with phase dots, elapsed time and done actions. */
export const JobBanner = React.forwardRef<HTMLDivElement, JobBannerProps>(
  (
    {
      title,
      phases = defaultJobPhases,
      phase,
      status = "running",
      startedAt,
      elapsed: elapsedProp,
      detail,
      onCancel,
      onAskAgain,
      onOpenResult,
      className,
      ...props
    },
    ref
  ) => {
    const lifecycle = normalizeTaskStatus(status, "running");
    const running = lifecycle === "running" || lifecycle === "pending";
    const succeeded = lifecycle === "succeeded";
    const failed = lifecycle === "failed";
    const [endedAt, setEndedAt] = React.useState<number | null>(null);
    React.useEffect(() => {
      setEndedAt(running ? null : Date.now());
    }, [running]);
    useNow({ active: running && startedAt != null });
    const elapsed = startedAt != null ? ((endedAt ?? Date.now()) - startedAt) / 1000 : elapsedProp ?? 0;
    const idx = Math.max(0, phases.findIndex((p) => p.id === phase));
    const current = phases[idx];
    const headline =
      succeeded
        ? "Done"
        : failed
          ? "Failed"
          : lifecycle === "canceled"
            ? "Canceled"
            : current?.activeLabel ?? `${current?.label ?? "Working"}…`;

    return (
      <div
        ref={ref}
        role="region"
        aria-label="Background job"
        data-status={status}
        className={cn(
          "flex flex-col gap-3 rounded-box border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center",
          failed && "border-destructive/40",
          className
        )}
        {...props}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">{title}</span>
            <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted-foreground" aria-label={`Elapsed ${formatClock(elapsed)}`}>
              {formatClock(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ol className="flex items-center gap-1" aria-label="Progress">
              {phases.map((p, i) => {
                const done = succeeded || i < idx;
                const active = running && i === idx;
                return (
                  <li key={p.id} aria-current={active ? "step" : undefined} className="flex items-center gap-1">
                    <span
                      data-slot="job-step"
                      data-state={done ? "complete" : active ? "active" : "pending"}
                      title={p.label}
                      className={cn(
                        "block size-2 rounded-full transition-colors",
                        done ? "bg-primary" : active ? "bg-primary ring-4 ring-primary/20 motion-safe:animate-pulse" : "bg-muted-foreground/30"
                      )}
                    />
                    <span className="sr-only">
                      {p.label}
                      {done ? " (complete)" : active ? " (in progress)" : ""}
                    </span>
                    {i < phases.length - 1 ? <span aria-hidden="true" className={cn("h-px w-3", done ? "bg-primary" : "bg-border")} /> : null}
                  </li>
                );
              })}
            </ol>
            <p className="min-w-0 truncate text-xs" aria-live="polite">
              {running ? <TextShimmer>{headline}</TextShimmer> : <span className={failed ? "text-destructive" : "text-muted-foreground"}>{headline}</span>}
            </p>
          </div>
          {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {running && onCancel ? (
            <Button size="xs" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          {!running && onAskAgain ? (
            <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onAskAgain}>
              Ask again
            </Button>
          ) : null}
          {succeeded && onOpenResult ? (
            <Button size="xs" variant="primary" onClick={onOpenResult}>
              Open result
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
);
JobBanner.displayName = "JobBanner";
