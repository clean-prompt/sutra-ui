import * as React from "react";
import { RiAlertLine, RiRefreshLine, RiWifiOffLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { useNow } from "../../hooks/use-now";
import { formatDuration } from "../../lib/duration";
import { normalizeTone, type Tone, type ToneInput } from "../../lib/tone";

/* ------------------------------------------------------------------ */
/* StatusStrip                                                         */
/* ------------------------------------------------------------------ */

interface StatusBase {
  /** Secondary detail line. */
  message?: React.ReactNode;
}
export type StatusStripStatus =
  | (StatusBase & {
      kind: "cold-start" | "waking";
      model?: string;
      /** Seconds elapsed (ignored when `startedAt` is set). */
      elapsed?: number;
      /** Epoch ms when the wait began; the strip ticks itself. */
      startedAt?: number;
      /** Expected total seconds. */
      estimate?: number;
    })
  | (StatusBase & { kind: "queued"; position: number; model?: string })
  | (StatusBase & {
      kind: "retrying" | "rate-limited";
      /** Seconds until the next attempt, counted down from when this value (or a new `attempt`) arrives. */
      retryIn?: number;
      /** Epoch ms of the next attempt (overrides retryIn). */
      retryAt?: number;
      attempt?: number;
      maxAttempts?: number;
    })
  | (StatusBase & { kind: "offline" })
  | (StatusBase & { kind: "error"; title?: React.ReactNode });

/** Tones a status kind maps to by default. The `tone` prop accepts any `ToneInput`. */
export type StatusStripTone = "neutral" | "info" | "warning" | "destructive";

export interface StatusStripProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  status: StatusStripStatus | null | undefined;
  onRetry?: () => void;
  onCancel?: () => void;
  /** Override the tone derived from the status kind. */
  tone?: ToneInput;
}

const stripTone: Record<Tone, string> = {
  neutral: "border-border bg-subtle text-foreground",
  primary: "border-primary/30 bg-primary-soft text-primary-soft-foreground",
  success: "border-success/30 bg-success-soft text-success-soft-foreground",
  info: "border-info/30 bg-info-soft text-info-soft-foreground",
  warning: "border-warning/30 bg-warning-soft text-warning-soft-foreground",
  destructive: "border-destructive/30 bg-destructive-soft text-destructive-soft-foreground",
};
const kindTone: Record<StatusStripStatus["kind"], StatusStripTone> = {
  "cold-start": "info",
  waking: "info",
  queued: "neutral",
  retrying: "warning",
  "rate-limited": "warning",
  offline: "destructive",
  error: "destructive",
};

function useCountdownTarget(status: StatusStripStatus | null | undefined) {
  const retryIn = status && "retryIn" in status ? status.retryIn : undefined;
  const retryAt = status && "retryAt" in status ? status.retryAt : undefined;
  const attempt = status && "attempt" in status ? status.attempt : undefined;
  const [target, setTarget] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (retryAt != null) setTarget(retryAt);
    else if (retryIn != null) setTarget(Date.now() + retryIn * 1000);
    else setTarget(null);
  }, [retryIn, retryAt, attempt, status?.kind]);
  if (retryAt != null) return retryAt;
  if (target == null && retryIn != null) return Date.now() + retryIn * 1000;
  return target;
}

/** Seconds as a compact duration: "7s", "1m 30s" (shared by the warm-up ETA and the retry countdown). */
const seconds = (s: number) => formatDuration(s * 1000);

/**
 * Live infrastructure status above the composer: model warm-up, queue position, retry / rate-limit
 * countdown, offline and errors. Live region: `role="status"` (polite); ticking clocks and countdowns are
 * hidden from screen readers so only state changes are announced.
 *
 * This covers the platform, not the agent: for what the agent itself is doing (thinking, running a tool,
 * waiting for permission) use `AgentStatusLine`, which sits in the same slot. Show one at a time.
 */
export const StatusStrip = React.forwardRef<HTMLDivElement, StatusStripProps>(
  ({ status, onRetry, onCancel, tone: toneProp, className, ...props }, ref) => {
    const target = useCountdownTarget(status);
    const ticking =
      !!status &&
      (((status.kind === "cold-start" || status.kind === "waking") && status.startedAt != null) || target != null);
    useNow({ active: ticking });
    if (!status) return null;
    const tone = toneProp ? normalizeTone(toneProp) : kindTone[status.kind];
    let icon: React.ReactNode = <Spinner size="xs" variant="ring" aria-hidden="true" />;
    let line: React.ReactNode;
    /** Non-ticking text for screen readers when `line` contains a live clock. */
    let spoken: string | null = null;
    let progress: number | null = null;
    let detail: React.ReactNode = status.message;
    let retryNow = false;

    switch (status.kind) {
      case "cold-start":
      case "waking": {
        const elapsed = status.startedAt != null ? (Date.now() - status.startedAt) / 1000 : status.elapsed ?? 0;
        const who = status.model ?? "the model";
        const verb = status.kind === "waking" ? "Waking" : "Starting";
        spoken = `${verb} ${who}…`;
        if (status.estimate) {
          const left = Math.max(0, Math.round(status.estimate - elapsed));
          progress = Math.min(96, (elapsed / status.estimate) * 100);
          line = (
            <>
              {verb} {who}… {left > 0 ? `~${seconds(left)}` : "almost there"}
            </>
          );
          if (elapsed > status.estimate * 1.5 && !detail) detail = "Taking longer than usual.";
        } else {
          line = (
            <>
              {verb} {who}… {seconds(Math.round(elapsed))}
            </>
          );
        }
        break;
      }
      case "queued":
        line = (
          <>
            Queued{status.model ? <> for {status.model}</> : null} · position {status.position}
          </>
        );
        break;
      case "retrying":
      case "rate-limited": {
        const left = target != null ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : null;
        icon = <RiRefreshLine aria-hidden="true" className="size-4" />;
        const attempt = status.attempt ? ` (attempt ${status.attempt}${status.maxAttempts ? ` of ${status.maxAttempts}` : ""})` : "";
        if (target != null) spoken = status.kind === "rate-limited" ? "Rate limited" : `Retrying${attempt}`;
        if (status.kind === "rate-limited") {
          icon = <RiAlertLine aria-hidden="true" className="size-4" />;
          line = left != null && left > 0 ? `Rate limited. Try again in ${seconds(left)}` : "Rate limited";
        } else {
          line = left != null && left > 0 ? `Retrying in ${seconds(left)}${attempt}` : `Retrying…${attempt}`;
        }
        retryNow = !!onRetry;
        break;
      }
      case "offline":
        icon = <RiWifiOffLine aria-hidden="true" className="size-4" />;
        line = "You're offline. Waiting for a connection…";
        retryNow = !!onRetry;
        break;
      case "error":
        icon = <RiAlertLine aria-hidden="true" className="size-4" />;
        line = status.title ?? "Something went wrong";
        retryNow = !!onRetry;
        break;
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-kind={status.kind}
        data-tone={tone}
        className={cn("flex items-center gap-3 rounded-box border px-3 py-2 text-sm", stripTone[tone], className)}
        {...props}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
        <div className="min-w-0 flex-1">
          <p data-slot="status-line" aria-hidden={spoken != null || undefined} className="truncate font-medium tabular-nums">
            {line}
          </p>
          {spoken != null ? <span className="sr-only">{spoken}</span> : null}
          {detail ? <p className="truncate text-xs opacity-80">{detail}</p> : null}
          {progress != null ? (
            <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-current/15">
              <div
                data-slot="status-progress"
                className="h-full rounded-full bg-current transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
        {retryNow ? (
          <Button size="xs" variant="secondary" onClick={onRetry}>
            Retry now
          </Button>
        ) : null}
        {onCancel ? (
          <Button size="xs" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    );
  }
);
StatusStrip.displayName = "StatusStrip";
