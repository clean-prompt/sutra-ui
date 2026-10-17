import * as React from "react";
import { createPortal } from "react-dom";
import {
  RiAlertLine,
  RiArchiveLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiAttachment2,
  RiCheckLine,
  RiDeleteBinLine,
  RiFlashlightLine,
  RiFolderLine,
  RiFolderOpenLine,
  RiInboxUnarchiveLine,
  RiMore2Fill,
  RiPencilLine,
  RiPushpinLine,
  RiRefreshLine,
  RiSearchLine,
  RiUnpinLine,
  RiWifiOffLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button } from "./button";
import { Badge, type BadgeColor } from "./badge";
import { RingMeter } from "./gauge";
import { defaultMeterThresholds, meterLevel, StackedMeter, type MeterLevel, type MeterThresholds } from "./meter";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { TextShimmer } from "./text-shimmer";
import { RadioGroup, RadioCard } from "./radio";
import { CheckboxCard } from "./checkbox";
import { Kbd } from "./typography";
import { SegmentedControl } from "./segmented-control";
import { StatCard, StatGroup } from "./stat-card";
import { BarChart } from "./chart";
import { Spinner } from "./spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useControllableState } from "../hooks/use-controllable-state";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Compact token count: 950, 1.2K, 33K, 1.1M. */
export function formatTokenCount(n: number) {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${trimNum(n / 1_000_000)}M`;
  if (a >= 10_000) return `${Math.round(n / 1000)}K`;
  if (a >= 1000) return `${trimNum(n / 1000)}K`;
  return String(Math.round(n));
}
const trimNum = (n: number) => String(Math.round(n * 10) / 10);

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Re-render every `ms` while active. */
function useTicker(active: boolean, ms = 1000) {
  const [, setN] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [active, ms]);
}

/** Set a textarea/input value the way the browser does so React's onChange fires. */
function setNativeInputValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Replace `[start, end)` of a text field with `text`, keeping React in sync, and put the caret after it. */
export function replaceTextRange(el: HTMLTextAreaElement | HTMLInputElement, start: number, end: number, text: string) {
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  setNativeInputValue(el, next);
  const caret = start + text.length;
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    /* not focusable / detached */
  }
  el.focus();
}

const mirrorProps = [
  "boxSizing", "width", "height", "overflowX", "overflowY", "borderTopWidth", "borderRightWidth", "borderBottomWidth",
  "borderLeftWidth", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontStyle", "fontVariant",
  "fontWeight", "fontStretch", "fontSize", "lineHeight", "fontFamily", "textAlign", "textTransform", "textIndent",
  "letterSpacing", "wordSpacing", "tabSize", "direction",
] as const;

/**
 * Viewport rect of the caret at `position` in a textarea/input (mirror-div technique).
 * Falls back to the field's own top-left in environments without layout.
 */
export function getTextareaCaretRect(el: HTMLTextAreaElement | HTMLInputElement, position = el.selectionStart ?? 0) {
  const rect = el.getBoundingClientRect();
  if (typeof window === "undefined" || typeof document === "undefined") return { top: 0, left: 0, height: 16 };
  const cs = window.getComputedStyle(el);
  const div = document.createElement("div");
  const style = div.style as unknown as Record<string, string>;
  for (const p of mirrorProps) style[p] = (cs as unknown as Record<string, string>)[p] ?? "";
  style.position = "absolute";
  style.visibility = "hidden";
  style.top = "0";
  style.left = "-9999px";
  style.whiteSpace = el instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
  style.overflowWrap = "break-word";
  div.textContent = el.value.slice(0, position);
  const span = document.createElement("span");
  span.textContent = el.value.slice(position) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 16;
  const top = rect.top + span.offsetTop + (parseFloat(cs.borderTopWidth) || 0) - el.scrollTop;
  const left = rect.left + span.offsetLeft + (parseFloat(cs.borderLeftWidth) || 0) - el.scrollLeft;
  document.body.removeChild(div);
  return { top, left, height: lineHeight };
}

/** Position a fixed popup under (or above) the caret of a field, re-measured on scroll/resize. */
export function useCaretAnchor(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  position: number | null,
  open: boolean
) {
  const [pos, setPos] = React.useState<{ top: number; left: number; height: number } | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el || position == null) {
      setPos(null);
      return;
    }
    const measure = () => setPos(getTextareaCaretRect(el, position));
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [ref, position, open]);
  return pos;
}

/* ------------------------------------------------------------------ */
/* ContextMeter                                                        */
/* ------------------------------------------------------------------ */

export interface ContextMeterBreakdown {
  system?: number;
  history?: number;
  attachments?: number;
  /** Tokens reserved for the reply (counted against the window). */
  reserved?: number;
}

export interface ContextMeterProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Tokens currently in the prompt. Defaults to the sum of the breakdown. */
  used?: number;
  /** Model context size in tokens. */
  limit: number;
  breakdown?: ContextMeterBreakdown;
  /** Model name shown in the popover. */
  model?: string;
  /** Percent thresholds for warn/danger coloring. Default 75 / 90. */
  thresholds?: MeterThresholds;
  onCompress?: () => void;
  compressing?: boolean;
  /** Default: true when `onCompress` is set. */
  canCompress?: boolean;
  /** Ring diameter in px. Default 20. */
  size?: number;
  /** Extra content under the breakdown. */
  note?: React.ReactNode;
}

const levelWord: Record<MeterLevel, string> = { ok: "Plenty of room", warn: "Getting full", danger: "Almost full" };

/** Context-window usage ring with a token breakdown popover and a compress action. */
export const ContextMeter = React.forwardRef<HTMLButtonElement, ContextMeterProps>(
  (
    {
      used: usedProp,
      limit,
      breakdown = {},
      model,
      thresholds = defaultMeterThresholds,
      onCompress,
      compressing = false,
      canCompress,
      size = 20,
      note,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const { system = 0, history = 0, attachments = 0, reserved = 0 } = breakdown;
    const used = usedProp ?? system + history + attachments;
    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const level = meterLevel(pct, thresholds);
    const warnAt = thresholds.warn ?? defaultMeterThresholds.warn;
    const remaining = Math.max(0, limit - used - reserved);
    const pctText = `${Math.round(pct)}%`;
    const compressible = canCompress ?? !!onCompress;
    const rows: Array<[string, number]> = [
      ["System", system],
      ["History", history],
      ["Attachments", attachments],
    ];
    if (reserved > 0) rows.push(["Reserved for reply", reserved]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            data-level={level}
            aria-label={`Context window ${pctText} full`}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-control px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing,
              className
            )}
            {...props}
          >
            <span aria-hidden="true" className="inline-flex">
              <RingMeter value={pct} size={size} thresholds={thresholds} showValueAbove={warnAt} label="Context window" role="presentation" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent size="sm" align="end" side="top" className="w-64 space-y-3" aria-label="Context window details">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Context window</p>
            <span
              className={cn(
                "font-mono text-sm tabular-nums",
                level === "danger" ? "text-destructive" : level === "warn" ? "text-warning" : "text-muted-foreground"
              )}
            >
              {pctText}
            </span>
          </div>
          <StackedMeter
            size="sm"
            legend={false}
            max={limit}
            valueText={`${formatTokenCount(used)} / ${formatTokenCount(limit)}`}
            label={levelWord[level]}
            valueFormatter={formatTokenCount}
            parts={[
              { label: "System", value: system, color: "info" },
              { label: "History", value: history, color: "primary" },
              { label: "Attachments", value: attachments, color: "warning" },
              { label: "Reserved", value: reserved, color: "muted" },
            ]}
          />
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
            {rows.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-mono tabular-nums text-foreground">{formatTokenCount(v)}</dd>
              </React.Fragment>
            ))}
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="text-right font-mono tabular-nums text-foreground">{formatTokenCount(remaining)}</dd>
            <dt className="border-t border-border pt-1 text-muted-foreground">Model context</dt>
            <dd className="border-t border-border pt-1 text-right font-mono tabular-nums text-foreground">
              {formatTokenCount(limit)} tokens
            </dd>
          </dl>
          {model ? <p className="text-xs text-muted-foreground">Model: <span className="font-medium text-foreground">{model}</span></p> : null}
          {note ? <div className="text-xs text-muted-foreground">{note}</div> : null}
          {onCompress ? (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              loading={compressing}
              disabled={!compressible || compressing}
              onClick={() => {
                setOpen(false);
                onCompress();
              }}
            >
              {compressing ? "Compressing…" : "Compress conversation"}
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    );
  }
);
ContextMeter.displayName = "ContextMeter";

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
      /** Seconds until the next attempt, counted down from when this value arrives. */
      retryIn?: number;
      /** Epoch ms of the next attempt (overrides retryIn). */
      retryAt?: number;
      attempt?: number;
      maxAttempts?: number;
    })
  | (StatusBase & { kind: "offline" })
  | (StatusBase & { kind: "error"; title?: React.ReactNode });

export type StatusStripTone = "neutral" | "info" | "warning" | "destructive";

export interface StatusStripProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  status: StatusStripStatus | null | undefined;
  onRetry?: () => void;
  onCancel?: () => void;
  /** Override the tone derived from the status kind. */
  tone?: StatusStripTone;
}

const stripTone: Record<StatusStripTone, string> = {
  neutral: "border-border bg-subtle text-foreground",
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
  const [target, setTarget] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (retryAt != null) setTarget(retryAt);
    else if (retryIn != null) setTarget(Date.now() + retryIn * 1000);
    else setTarget(null);
  }, [retryIn, retryAt, status?.kind]);
  if (retryAt != null) return retryAt;
  if (target == null && retryIn != null) return Date.now() + retryIn * 1000;
  return target;
}

/** Live model-lifecycle status above the composer: warm-up, queue, retry countdown, rate limit, offline. */
export const StatusStrip = React.forwardRef<HTMLDivElement, StatusStripProps>(
  ({ status, onRetry, onCancel, tone: toneProp, className, ...props }, ref) => {
    const target = useCountdownTarget(status);
    const ticking =
      !!status &&
      (((status.kind === "cold-start" || status.kind === "waking") && status.startedAt != null) || target != null);
    useTicker(ticking);
    if (!status) return null;
    const tone = toneProp ?? kindTone[status.kind];
    let icon: React.ReactNode = <Spinner size="xs" variant="ring" aria-hidden="true" />;
    let line: React.ReactNode;
    let progress: number | null = null;
    let detail: React.ReactNode = status.message;
    let retryNow = false;

    switch (status.kind) {
      case "cold-start":
      case "waking": {
        const elapsed = status.startedAt != null ? (Date.now() - status.startedAt) / 1000 : status.elapsed ?? 0;
        const who = status.model ?? "the model";
        const verb = status.kind === "waking" ? "Waking" : "Starting";
        if (status.estimate) {
          const left = Math.max(0, Math.round(status.estimate - elapsed));
          progress = Math.min(96, (elapsed / status.estimate) * 100);
          line = (
            <>
              {verb} {who}… {left > 0 ? `~${left}s` : "almost there"}
            </>
          );
          if (elapsed > status.estimate * 1.5 && !detail) detail = "Taking longer than usual.";
        } else {
          line = (
            <>
              {verb} {who}… {Math.round(elapsed)}s
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
        if (status.kind === "rate-limited") {
          icon = <RiAlertLine aria-hidden="true" className="size-4" />;
          line = left != null && left > 0 ? `Rate limited. Try again in ${left}s` : "Rate limited";
        } else {
          line = left != null && left > 0 ? `Retrying in ${left}s${attempt}` : `Retrying…${attempt}`;
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
          <p data-slot="status-line" className="truncate font-medium tabular-nums">
            {line}
          </p>
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
  status?: "running" | "done" | "failed" | "cancelled";
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
    const running = status === "running";
    const [endedAt, setEndedAt] = React.useState<number | null>(null);
    React.useEffect(() => {
      setEndedAt(running ? null : Date.now());
    }, [running]);
    useTicker(running && startedAt != null);
    const elapsed = startedAt != null ? ((endedAt ?? Date.now()) - startedAt) / 1000 : elapsedProp ?? 0;
    const idx = Math.max(0, phases.findIndex((p) => p.id === phase));
    const current = phases[idx];
    const headline =
      status === "done"
        ? "Done"
        : status === "failed"
          ? "Failed"
          : status === "cancelled"
            ? "Cancelled"
            : current?.activeLabel ?? `${current?.label ?? "Working"}…`;

    return (
      <div
        ref={ref}
        role="region"
        aria-label="Background job"
        data-status={status}
        className={cn(
          "flex flex-col gap-3 rounded-box border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center",
          status === "failed" && "border-destructive/40",
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
                const done = status === "done" || i < idx;
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
              {running ? <TextShimmer>{headline}</TextShimmer> : <span className={status === "failed" ? "text-destructive" : "text-muted-foreground"}>{headline}</span>}
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
            <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine />} onClick={onAskAgain}>
              Ask again
            </Button>
          ) : null}
          {status === "done" && onOpenResult ? (
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

/* ------------------------------------------------------------------ */
/* QuestionCard                                                        */
/* ------------------------------------------------------------------ */

export interface QuestionOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface QuestionAnswer {
  /** Chosen option values (single/multi). */
  values: string[];
  /** Text typed into "Other…" or the free-text answer. */
  text?: string;
  files?: File[];
}

export interface QuestionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  question: React.ReactNode;
  description?: React.ReactNode;
  type?: "single" | "multi" | "text";
  options?: QuestionOption[];
  /** Adds an "Other…" option with a text field. */
  allowOther?: boolean;
  otherLabel?: string;
  /** Free-text: allow attaching files. */
  allowAttachments?: boolean;
  placeholder?: string;
  confirmLabel?: string;
  /** A prior answer: renders the card locked. */
  answer?: QuestionAnswer | null;
  onAnswer?: (answer: QuestionAnswer) => void;
}

const OTHER = "__other__";

/** A question asked by the model inside the transcript; locks once answered. */
export const QuestionCard = React.forwardRef<HTMLDivElement, QuestionCardProps>(
  (
    {
      question,
      description,
      type = "single",
      options = [],
      allowOther = false,
      otherLabel = "Other…",
      allowAttachments = false,
      placeholder = "Type your answer…",
      confirmLabel = "Confirm",
      answer: answerProp,
      onAnswer,
      className,
      ...props
    },
    ref
  ) => {
    const headingId = React.useId();
    const [localAnswer, setLocalAnswer] = React.useState<QuestionAnswer | null>(null);
    const answer = answerProp ?? localAnswer;
    const [single, setSingle] = React.useState("");
    const [multi, setMulti] = React.useState<string[]>([]);
    const [text, setText] = React.useState("");
    const [files, setFiles] = React.useState<File[]>([]);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const submit = (a: QuestionAnswer) => {
      setLocalAnswer(a);
      onAnswer?.(a);
    };

    const otherChosen = type === "single" ? single === OTHER : multi.includes(OTHER);
    const allOptions = allowOther ? [...options, { value: OTHER, label: otherLabel }] : options;

    const labelFor = (v: string) => {
      const o = options.find((x) => x.value === v);
      return o ? o.label : v;
    };

    let body: React.ReactNode;
    if (answer) {
      const parts: React.ReactNode[] = answer.values.filter((v) => v !== OTHER).map((v) => <span key={v}>{labelFor(v)}</span>);
      if (answer.text) parts.push(<span key="__text">{answer.text}</span>);
      body = (
        <div className="flex items-start gap-2 rounded-md bg-subtle px-3 py-2 text-sm" data-slot="question-answer">
          <RiCheckLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          <div className="min-w-0">
            <span className="sr-only">Your answer: </span>
            <span className="font-medium text-foreground">
              {parts.map((p, i) => (
                <React.Fragment key={i}>
                  {i > 0 ? ", " : null}
                  {p}
                </React.Fragment>
              ))}
            </span>
            {answer.files?.length ? (
              <span className="block text-xs text-muted-foreground">
                {answer.files.length} attachment{answer.files.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
      );
    } else if (type === "text") {
      const canSend = text.trim().length > 0 || files.length > 0;
      body = (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) submit({ values: [], text: text.trim(), files: files.length ? files : undefined });
          }}
        >
          <textarea
            aria-labelledby={headingId}
            value={text}
            placeholder={placeholder}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) submit({ values: [], text: text.trim(), files: files.length ? files : undefined });
              }
            }}
            className={cn(
              "w-full resize-none rounded-[min(var(--radius-control),var(--radius-box))] border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground",
              focusRing
            )}
          />
          {files.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Attachments">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <Badge variant="outline" size="md" onRemove={() => setFiles((fs) => fs.filter((_, j) => j !== i))} removeLabel={`Remove ${f.name}`}>
                    {f.name}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            {allowAttachments ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(e) => {
                    const list = Array.from(e.target.files ?? []);
                    if (list.length) setFiles((fs) => [...fs, ...list]);
                    e.target.value = "";
                  }}
                />
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Attach files" onClick={() => fileRef.current?.click()}>
                  <RiAttachment2 />
                </Button>
              </>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" disabled={!canSend}>
              Send answer
            </Button>
          </div>
        </form>
      );
    } else {
      const otherField = otherChosen ? (
        <input
          aria-label="Other answer"
          autoFocus
          value={text}
          placeholder="Describe…"
          onChange={(e) => setText(e.target.value)}
          className={cn("h-9 w-full rounded-control border border-input bg-background px-3 text-sm shadow-xs placeholder:text-muted-foreground", focusRing)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && type === "single" && text.trim()) {
              e.preventDefault();
              submit({ values: [OTHER], text: text.trim() });
            }
          }}
        />
      ) : null;
      if (type === "single") {
        body = (
          <div className="space-y-2">
            <RadioGroup
              aria-labelledby={headingId}
              value={single}
              onValueChange={(v) => {
                setSingle(v);
                if (v !== OTHER) submit({ values: [v] });
              }}
              className="grid gap-2"
            >
              {allOptions.map((o) => (
                <RadioCard key={o.value} value={o.value} label={o.label} description={"description" in o ? o.description : undefined} className="p-3" />
              ))}
            </RadioGroup>
            {otherField}
            {otherChosen ? (
              <div className="flex justify-end">
                <Button size="sm" disabled={!text.trim()} onClick={() => submit({ values: [OTHER], text: text.trim() })}>
                  {confirmLabel}
                </Button>
              </div>
            ) : null}
          </div>
        );
      } else {
        const valid = multi.some((v) => v !== OTHER) || (otherChosen && text.trim().length > 0);
        body = (
          <div className="space-y-2">
            <div role="group" aria-labelledby={headingId} className="grid gap-2">
              {allOptions.map((o) => (
                <CheckboxCard
                  key={o.value}
                  label={o.label}
                  description={"description" in o ? o.description : undefined}
                  checked={multi.includes(o.value)}
                  onCheckedChange={(c) => setMulti((m) => (c === true ? [...m, o.value] : m.filter((x) => x !== o.value)))}
                  className="p-3"
                />
              ))}
            </div>
            {otherField}
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!valid}
                onClick={() => {
                  const values = multi.filter((v) => v !== OTHER);
                  submit({ values: otherChosen && text.trim() ? [...values, OTHER] : values, text: otherChosen && text.trim() ? text.trim() : undefined });
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        );
      }
    }

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={headingId}
        data-answered={answer ? "" : undefined}
        className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", answer && "bg-subtle/50", className)}
        {...props}
      >
        <div className="space-y-1">
          <p id={headingId} className="text-sm font-semibold text-foreground">
            {question}
          </p>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {body}
      </div>
    );
  }
);
QuestionCard.displayName = "QuestionCard";

/* ------------------------------------------------------------------ */
/* useSlashTrigger + SlashMenu                                         */
/* ------------------------------------------------------------------ */

export interface SlashTriggerMatch {
  trigger: string;
  /** Text typed after the trigger, up to the caret. */
  query: string;
  /** Index of the trigger character. */
  start: number;
  /** Caret index (end of the query). */
  end: number;
}

/** Find a trigger token ("/cmd", "@name") ending at `caret`; it must start a word. */
export function detectSlashTrigger(value: string, caret: number, triggers: readonly string[] = ["/"]): SlashTriggerMatch | null {
  if (caret < 0 || caret > value.length) return null;
  let i = caret;
  while (i > 0 && !/\s/.test(value[i - 1]!)) i--;
  const token = value.slice(i, caret);
  if (!token) return null;
  const trigger = triggers.find((t) => token.startsWith(t));
  if (!trigger) return null;
  const query = token.slice(trigger.length);
  if (triggers.some((t) => query.includes(t))) return null;
  return { trigger, query, start: i, end: caret };
}

export interface SlashTriggerState {
  match: SlashTriggerMatch | null;
  /** Close until the caret leaves the current token. */
  dismiss: () => void;
  /** Replace the trigger token with `text`. */
  replace: (text: string) => void;
  /** Re-read the field (called automatically on input / caret moves). */
  sync: () => void;
}

/** Watch a textarea for a trigger character at the start of a word and report the query under the caret. */
export function useSlashTrigger(
  textareaRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  triggers: readonly string[] = ["/"]
): SlashTriggerState {
  const [match, setMatch] = React.useState<SlashTriggerMatch | null>(null);
  const dismissed = React.useRef<string | null>(null);
  const key = triggers.join("\u0000");

  const sync = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    const collapsed = el.selectionEnd == null || el.selectionEnd === caret;
    const m = collapsed ? detectSlashTrigger(el.value, caret, key.split("\u0000")) : null;
    const sig = m ? `${m.start}:${m.trigger}` : null;
    if (dismissed.current && dismissed.current !== sig) dismissed.current = null;
    const next = m && dismissed.current !== sig ? m : null;
    setMatch((prev) =>
      prev && next && prev.start === next.start && prev.end === next.end && prev.query === next.query && prev.trigger === next.trigger
        ? prev
        : next
    );
  }, [textareaRef, key]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = () => sync();
    const events = ["input", "change", "click", "keyup", "select", "focus"] as const;
    events.forEach((e) => el.addEventListener(e, handler));
    const blur = () => setMatch(null);
    el.addEventListener("blur", blur);
    return () => {
      events.forEach((e) => el.removeEventListener(e, handler));
      el.removeEventListener("blur", blur);
    };
  }, [textareaRef, sync]);

  const dismiss = React.useCallback(() => {
    setMatch((m) => {
      if (m) dismissed.current = `${m.start}:${m.trigger}`;
      return null;
    });
  }, []);

  const replace = React.useCallback(
    (text: string) => {
      const el = textareaRef.current;
      if (!el || !match) return;
      replaceTextRange(el, match.start, match.end, text);
      sync();
    },
    [textareaRef, match, sync]
  );

  return { match, dismiss, replace, sync };
}

export interface SlashCommand {
  id: string;
  name: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Extra search terms. */
  keywords?: string[];
  /** Text that replaces the trigger token on select. Default "" (token removed). */
  insertText?: string;
  disabled?: boolean;
}

export interface SlashMenuProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The composer textarea to attach to. */
  anchorRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  commands: SlashCommand[];
  /** Trigger character(s). Default "/". Use "@" for mentions. */
  trigger?: string | string[];
  onSelect?: (command: SlashCommand, match: SlashTriggerMatch) => void;
  /** Header label. Default "Commands" (or "Mentions" for "@"). */
  heading?: React.ReactNode;
  emptyText?: React.ReactNode;
  /** Max visible rows before scrolling. Default 8. */
  maxRows?: number;
  /** Custom filter; default matches name/keywords (prefix matches first). */
  filter?: (commands: SlashCommand[], query: string) => SlashCommand[];
}

function defaultCommandFilter(commands: SlashCommand[], query: string) {
  const q = query.toLowerCase();
  if (!q) return commands;
  const scored: Array<[number, SlashCommand]> = [];
  for (const c of commands) {
    const n = c.name.toLowerCase();
    if (n.startsWith(q)) scored.push([0, c]);
    else if (n.includes(q)) scored.push([1, c]);
    else if (c.keywords?.some((k) => k.toLowerCase().includes(q))) scored.push([2, c]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, c]) => c);
}

/** Wrap the first case-insensitive occurrence of `query` in a <mark>. */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark data-slot="match" className="rounded-[2px] bg-primary-soft px-0 text-primary-soft-foreground">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

/** Inline command / mention listbox anchored to the caret of a composer textarea. */
export const SlashMenu = React.forwardRef<HTMLDivElement, SlashMenuProps>(
  ({ anchorRef, commands, trigger = "/", onSelect, heading, emptyText = "No matching commands", maxRows = 8, filter = defaultCommandFilter, className, style, ...props }, ref) => {
    const triggers = React.useMemo(() => (Array.isArray(trigger) ? trigger : [trigger]), [trigger]);
    const { match, dismiss, replace } = useSlashTrigger(anchorRef, triggers);
    const items = React.useMemo(() => (match ? filter(commands, match.query) : []), [match, commands, filter]);
    const [active, setActive] = React.useState(0);
    const listId = React.useId();
    const optionId = (i: number) => `${listId}-opt-${i}`;
    const open = !!match;
    const caret = useCaretAnchor(anchorRef, match?.start ?? null, open);
    const listRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => setActive(0), [match?.query, match?.start]);

    const choose = React.useCallback(
      (cmd: SlashCommand | undefined) => {
        if (!cmd || cmd.disabled || !match) return;
        replace(cmd.insertText ?? "");
        onSelect?.(cmd, match);
      },
      [match, replace, onSelect]
    );

    React.useEffect(() => {
      const el = anchorRef.current;
      if (!el || !open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.isComposing) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          if (!items.length) return;
          e.preventDefault();
          setActive((i) => (e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length));
        } else if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
          if (!items.length) return;
          e.preventDefault();
          e.stopPropagation();
          choose(items[active]);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }
      };
      const node = el as HTMLElement;
      node.addEventListener("keydown", onKey, true);
      return () => node.removeEventListener("keydown", onKey, true);
    }, [anchorRef, open, items, active, choose, dismiss]);

    React.useEffect(() => {
      const el = anchorRef.current;
      if (!el) return;
      if (open) {
        el.setAttribute("aria-autocomplete", "list");
        el.setAttribute("aria-controls", listId);
        if (items[active]) el.setAttribute("aria-activedescendant", optionId(active));
        else el.removeAttribute("aria-activedescendant");
      } else {
        el.removeAttribute("aria-controls");
        el.removeAttribute("aria-activedescendant");
      }
    });

    React.useEffect(() => {
      if (!open) return;
      listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    if (!open || typeof document === "undefined") return null;
    const rect = anchorRef.current?.getBoundingClientRect();
    const top = caret?.top ?? rect?.top ?? 0;
    const below = top < (typeof window !== "undefined" ? window.innerHeight / 2 : 400);
    const positionStyle: React.CSSProperties = below
      ? { top: top + (caret?.height ?? 16) + 4, left: caret?.left ?? rect?.left ?? 0 }
      : { bottom: (typeof window !== "undefined" ? window.innerHeight : 800) - top + 4, left: caret?.left ?? rect?.left ?? 0 };
    const label = heading ?? (triggers[0] === "@" ? "Mentions" : "Commands");

    return createPortal(
      <div
        ref={ref}
        data-slot="slash-menu"
        data-side={below ? "bottom" : "top"}
        className={cn(
          "fixed z-50 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-box border border-border bg-popover text-popover-foreground shadow-lg",
          "animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={{ ...positionStyle, ...style }}
        onMouseDown={(e) => e.preventDefault()}
        {...props}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium">{label}</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <Kbd>↑↓</Kbd>
            <Kbd>↵</Kbd>
            <Kbd>esc</Kbd>
          </span>
        </div>
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={typeof label === "string" ? label : "Commands"}
          className="overflow-y-auto p-1 scrollbar-thin"
          style={{ maxHeight: maxRows * 44 + 8 }}
        >
          {items.length === 0 ? (
            <div role="option" aria-selected={false} aria-disabled="true" className="px-2 py-3 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            items.map((c, i) => (
              <div
                key={c.id}
                id={optionId(i)}
                role="option"
                data-index={i}
                aria-selected={i === active}
                aria-disabled={c.disabled || undefined}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(c)}
                className={cn(
                  "flex cursor-default items-start gap-2.5 rounded-sm px-2 py-1.5 text-sm",
                  i === active && "bg-accent text-accent-foreground",
                  c.disabled && "opacity-50"
                )}
              >
                {c.icon ? <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{c.icon}</span> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    <span className="text-muted-foreground">{match!.trigger}</span>
                    {highlightMatch(c.name, match!.query)}
                  </span>
                  {c.description ? <span className="block truncate text-xs text-muted-foreground">{c.description}</span> : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>,
      document.body
    );
  }
);
SlashMenu.displayName = "SlashMenu";

/* ------------------------------------------------------------------ */
/* ModelPicker                                                         */
/* ------------------------------------------------------------------ */

export type ModelLifecycleState = "ready" | "starting" | "asleep" | "stopped" | "failed";

export interface ModelPickerModel {
  id: string;
  name: string;
  state: ModelLifecycleState;
  group?: string;
  /** Untagged models are tucked behind a "Show N untagged" disclosure. */
  tags?: string[];
  /** Seconds to first token when ready. Default 3. */
  answerSeconds?: number;
  /** Seconds to wake / cold start. */
  warmSeconds?: number;
  cost?: "free" | "low" | "medium" | "high";
  quality?: "basic" | "good" | "best";
  /** Lower ranks first within the same lifecycle state. */
  rank?: number;
  /** Why this model can't be used right now. */
  blockedReason?: string;
  description?: React.ReactNode;
}

export const modelStateLabels: Record<ModelLifecycleState, string> = {
  ready: "Ready",
  starting: "Starting",
  asleep: "Asleep",
  stopped: "Stopped",
  failed: "Failed",
};

const stateRank: Record<ModelLifecycleState, number> = { ready: 0, starting: 1, asleep: 2, stopped: 3, failed: 4 };

export interface ModelStateGlyphProps extends React.SVGAttributes<SVGSVGElement> {
  state: ModelLifecycleState;
  size?: number;
}

/** Lifecycle mark: shape, not color, carries the state (filled, outline, moon, warning). */
export function ModelStateGlyph({ state, size = 14, className, ...props }: ModelStateGlyphProps) {
  const color = {
    ready: "text-success",
    starting: "text-info",
    asleep: "text-muted-foreground",
    stopped: "text-muted-foreground",
    failed: "text-destructive",
  }[state];
  return (
    <svg
      role="img"
      aria-label={modelStateLabels[state]}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      data-state={state}
      className={cn("shrink-0", color, state === "starting" && "motion-safe:animate-spin", className)}
      {...props}
    >
      <title>{modelStateLabels[state]}</title>
      {state === "ready" ? <circle cx="7" cy="7" r="4.5" fill="currentColor" /> : null}
      {state === "stopped" ? <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /> : null}
      {state === "starting" ? (
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="7 5" strokeLinecap="round" />
      ) : null}
      {state === "asleep" ? <path d="M9.6 9.1A4.2 4.2 0 0 1 5.2 3.6a4.5 4.5 0 1 0 5.3 5.9 4.2 4.2 0 0 1-.9-.4z" fill="currentColor" /> : null}
      {state === "failed" ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1.8 12.8 12H1.2z" />
          <path d="M7 6v2.4M7 10.3v.1" />
        </g>
      ) : null}
    </svg>
  );
}

/** "answers in ~3s" / "needs warm-up ~40s" for a model. */
export function modelWaitHint(m: Pick<ModelPickerModel, "state" | "answerSeconds" | "warmSeconds">) {
  switch (m.state) {
    case "ready":
      return `answers in ~${m.answerSeconds ?? 3}s`;
    case "starting":
      return "warming up…";
    case "asleep":
      return m.warmSeconds ? `wakes in ~${m.warmSeconds}s` : "wakes in a few seconds";
    case "stopped":
      return m.warmSeconds ? `needs warm-up ~${m.warmSeconds}s` : "needs warm-up";
    case "failed":
      return "failed to start";
  }
}

const costColor: Record<NonNullable<ModelPickerModel["cost"]>, BadgeColor> = { free: "success", low: "info", medium: "warning", high: "destructive" };
const qualityColor: Record<NonNullable<ModelPickerModel["quality"]>, BadgeColor> = { basic: "gray", good: "blue", best: "purple" };

/** Sort by lifecycle (ready first), then rank, then name. */
export function rankModels<T extends ModelPickerModel>(models: T[]) {
  return [...models].sort(
    (a, b) => stateRank[a.state] - stateRank[b.state] || (a.rank ?? 99) - (b.rank ?? 99) || a.name.localeCompare(b.name)
  );
}

export interface ModelPickerProps {
  models: ModelPickerModel[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Shows a "Warm up" button on models that aren't ready. */
  onWarmUp?: (id: string) => void;
  /** Ids currently warming (button shows a spinner). */
  warmingIds?: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Popover side. Default "top" (composer). */
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  "aria-label"?: string;
}

/** Model dropdown with lifecycle glyphs, wait hints, badges, search, grouping and per-model warm-up. */
export function ModelPicker({
  models,
  value: valueProp,
  defaultValue,
  onValueChange,
  onWarmUp,
  warmingIds = [],
  placeholder = "Choose a model",
  searchPlaceholder = "Search models…",
  disabled,
  className,
  side = "top",
  align = "start",
  "aria-label": ariaLabel = "Model",
}: ModelPickerProps) {
  const [value, setValue] = useControllableState<string>({ value: valueProp, defaultValue: defaultValue ?? "", onChange: onValueChange });
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [showUntagged, setShowUntagged] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const uid = React.useId();
  const selected = models.find((m) => m.id === value);
  const anyTagged = models.some((m) => m.tags?.length);

  const q = query.trim().toLowerCase();
  const matches = (m: ModelPickerModel) =>
    !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.tags?.some((t) => t.toLowerCase().includes(q));
  const filtered = rankModels(models.filter(matches));
  const isUntagged = (m: ModelPickerModel) => anyTagged && !m.tags?.length;
  const untagged = filtered.filter(isUntagged);
  const visible = q || showUntagged ? filtered : filtered.filter((m) => !isUntagged(m));
  const groups = new Map<string, ModelPickerModel[]>();
  for (const m of visible) {
    const g = m.group ?? "Models";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(m);
  }

  const moveFocus = (dir: 1 | -1 | "first" | "last") => {
    const opts = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-model-option]:not(:disabled)") ?? []);
    if (!opts.length) return;
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    const next = dir === "first" ? 0 : dir === "last" ? opts.length - 1 : i < 0 ? (dir === 1 ? 0 : opts.length - 1) : (i + dir + opts.length) % opts.length;
    opts[next]?.focus();
  };
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === "Home" && e.target !== e.currentTarget.querySelector("input")) {
      e.preventDefault();
      moveFocus("first");
    } else if (e.key === "End" && e.target !== e.currentTarget.querySelector("input")) {
      e.preventDefault();
      moveFocus("last");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={`${ariaLabel}: ${selected ? `${selected.name}, ${modelStateLabels[selected.state]}` : placeholder}`}
          className={cn("max-w-64 gap-1.5", className)}
          trailingIcon={<RiArrowDownSLine className="text-muted-foreground" />}
        >
          {selected ? <ModelStateGlyph state={selected.state} aria-hidden="true" role="presentation" /> : null}
          <span className="truncate">{selected?.name ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} padded={false} className="w-80" onKeyDown={onListKey} aria-label="Choose a model">
        <div className="border-b border-border p-2">
          <div className="relative">
            <RiSearchLine aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search models"
              value={query}
              placeholder={searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              className={cn("h-8 w-full rounded-control border border-input bg-background pl-8 pr-2 text-sm placeholder:text-muted-foreground", focusRing)}
            />
          </div>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1 scrollbar-thin">
          {visible.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">No models match “{query}”</p> : null}
          {[...groups].map(([group, list]) => {
            const gid = `${uid}-g-${group.replace(/\W+/g, "-")}`;
            return (
              <div key={group} role="group" aria-labelledby={gid} className="py-1">
                <p id={gid} className="px-2 pb-1 pt-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {list.map((m) => {
                    const blocked = !!m.blockedReason;
                    const warming = warmingIds.includes(m.id) || m.state === "starting";
                    const noteId = `${uid}-n-${m.id.replace(/\W+/g, "-")}`;
                    const isSel = m.id === value;
                    return (
                      <li key={m.id} className="group/model flex items-stretch gap-1 rounded-sm hover:bg-accent">
                        <button
                          type="button"
                          data-model-option=""
                          aria-current={isSel ? "true" : undefined}
                          disabled={blocked}
                          aria-describedby={noteId}
                          onClick={() => {
                            setValue(m.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/35",
                            "disabled:cursor-not-allowed disabled:opacity-60"
                          )}
                        >
                          <span className="mt-[3px]">
                            <ModelStateGlyph state={m.state} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-foreground">{m.name}</span>
                              {m.cost ? (
                                <Badge size="sm" color={costColor[m.cost]}>
                                  {m.cost}
                                </Badge>
                              ) : null}
                              {m.quality ? (
                                <Badge size="sm" variant="outline" color={qualityColor[m.quality]}>
                                  {m.quality}
                                </Badge>
                              ) : null}
                            </span>
                            <span id={noteId} className={cn("block truncate text-xs", blocked ? "text-destructive" : "text-muted-foreground")}>
                              {blocked ? `Unavailable: ${m.blockedReason}` : modelWaitHint(m)}
                            </span>
                          </span>
                          {isSel ? <RiCheckLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                        </button>
                        {onWarmUp && !blocked && m.state !== "ready" ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="my-auto mr-1 shrink-0"
                            loading={warming}
                            disabled={warming}
                            aria-label={`Warm up ${m.name}`}
                            leadingIcon={warming ? undefined : <RiFlashlightLine />}
                            onClick={() => onWarmUp(m.id)}
                          >
                            {warming ? "Warming" : "Warm up"}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {!q && untagged.length > 0 ? (
            <button
              type="button"
              aria-expanded={showUntagged}
              onClick={() => setShowUntagged((s) => !s)}
              className={cn("mt-1 flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
            >
              <RiArrowRightSLine aria-hidden="true" className={cn("size-4 transition-transform", showUntagged && "rotate-90")} />
              {showUntagged ? `Hide ${untagged.length} untagged` : `Show ${untagged.length} untagged`}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
ModelPicker.displayName = "ModelPicker";

/* ------------------------------------------------------------------ */
/* UsageSummary                                                        */
/* ------------------------------------------------------------------ */

export interface UsageDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  requests: number;
  tokens?: number;
  /** Total queue/warm-up wait in ms. */
  waitMs?: number;
  /** Total generation time in ms. */
  generateMs?: number;
  /** Requests per model id. */
  models?: Record<string, number>;
  /** Count per finish reason (stop, length, error, cancelled…). */
  finishReasons?: Record<string, number>;
}

export type UsageRange = "7" | "30" | "90";

export interface UsageSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Daily records, oldest first. */
  days: UsageDay[];
  range?: UsageRange;
  defaultRange?: UsageRange;
  onRangeChange?: (range: UsageRange) => void;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${trimNum(s)}s`;
  const m = s / 60;
  if (m < 60) return `${trimNum(m)}m`;
  return `${trimNum(m / 60)}h`;
}

const finishLabels: Record<string, string> = { stop: "Completed", length: "Hit length limit", error: "Errored", cancelled: "Cancelled", tool_calls: "Tool calls" };

/** Usage dashboard: range switch, KPI tiles, daily bars, per-model bars, wait vs generate and finish reasons. */
export const UsageSummary = React.forwardRef<HTMLDivElement, UsageSummaryProps>(
  ({ days, range: rangeProp, defaultRange = "7", onRangeChange, className, ...props }, ref) => {
    const uid = React.useId();
    const [range, setRange] = useControllableState<UsageRange>({ value: rangeProp, defaultValue: defaultRange, onChange: onRangeChange });
    const slice = days.slice(-Number(range));
    const totals = slice.reduce(
      (a, d) => {
        a.requests += d.requests;
        a.tokens += d.tokens ?? 0;
        a.wait += d.waitMs ?? 0;
        a.gen += d.generateMs ?? 0;
        for (const [k, v] of Object.entries(d.models ?? {})) a.models[k] = (a.models[k] ?? 0) + v;
        for (const [k, v] of Object.entries(d.finishReasons ?? {})) a.finish[k] = (a.finish[k] ?? 0) + v;
        return a;
      },
      { requests: 0, tokens: 0, wait: 0, gen: 0, models: {} as Record<string, number>, finish: {} as Record<string, number> }
    );
    const avgLatency = totals.requests ? (totals.wait + totals.gen) / totals.requests : 0;
    const perModel = Object.entries(totals.models).sort((a, b) => b[1] - a[1]);
    const modelMax = perModel[0]?.[1] ?? 0;
    const finishTotal = Object.values(totals.finish).reduce((a, b) => a + b, 0);
    const chartData = slice.map((d) => ({ day: d.date.slice(5), requests: d.requests }));

    return (
      <div ref={ref} data-range={range} className={cn("space-y-5", className)} {...props}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Usage</p>
          <SegmentedControl
            aria-label="Time range"
            size="sm"
            value={range}
            onValueChange={(v) => v && setRange(v as UsageRange)}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
        </div>
        <StatGroup columns={4}>
          <StatCard size="sm" label="Requests" value={totals.requests.toLocaleString("en-US")} data-stat="requests" />
          <StatCard size="sm" label="Tokens" value={formatTokenCount(totals.tokens)} data-stat="tokens" />
          <StatCard size="sm" label="Avg latency" value={formatDuration(avgLatency)} data-stat="latency" />
          <StatCard size="sm" label="Active days" value={String(slice.filter((d) => d.requests > 0).length)} data-stat="days" />
        </StatGroup>
        <section aria-label="Requests per day">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Requests per day</p>
          <BarChart data={chartData} index="day" series={[{ key: "requests", label: "Requests", color: "primary" }]} height={160} label="Requests per day" legend={false} />
        </section>
        <div className="grid gap-5 md:grid-cols-2">
          <section aria-labelledby={`${uid}-models`} className="space-y-2">
            <p id={`${uid}-models`} className="text-xs font-medium text-muted-foreground">
              By model
            </p>
            <ul className="space-y-2">
              {perModel.map(([name, n]) => (
                <li key={name} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{n.toLocaleString("en-US")}</span>
                  </div>
                  <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${modelMax ? (n / modelMax) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
              {perModel.length === 0 ? <li className="text-sm text-muted-foreground">No requests in this range.</li> : null}
            </ul>
          </section>
          <section className="space-y-4">
            <StackedMeter
              label="Wait vs. generate"
              valueText={formatDuration(totals.wait + totals.gen)}
              valueFormatter={formatDuration}
              showPercent
              parts={[
                { label: "Waiting", value: totals.wait, color: "warning" },
                { label: "Generating", value: totals.gen, color: "primary" },
              ]}
            />
            <div>
              <p id={`${uid}-finish`} className="mb-1.5 text-xs font-medium text-muted-foreground">
                Finish reasons
              </p>
              <ul aria-labelledby={`${uid}-finish`} className="divide-y divide-border rounded-box border border-border text-sm">
                {Object.entries(totals.finish)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between gap-2 px-3 py-1.5">
                      <span className="text-foreground">{finishLabels[k] ?? k}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {v} · {finishTotal ? Math.round((v / finishTotal) * 100) : 0}%
                      </span>
                    </li>
                  ))}
                {finishTotal === 0 ? <li className="px-3 py-1.5 text-muted-foreground">—</li> : null}
              </ul>
            </div>
          </section>
        </div>
      </div>
    );
  }
);
UsageSummary.displayName = "UsageSummary";

/* ------------------------------------------------------------------ */
/* ConversationSidebarList                                             */
/* ------------------------------------------------------------------ */

export interface SidebarConversation {
  id: string;
  title: string;
  pinned?: boolean;
  folderId?: string | null;
  archived?: boolean;
}

export interface SidebarFolder {
  id: string;
  name: string;
}

export interface ConversationSidebarListProps extends Omit<React.HTMLAttributes<HTMLElement>, "onSelect"> {
  conversations: SidebarConversation[];
  folders?: SidebarFolder[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onMove?: (id: string, folderId: string | null) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onDelete?: (id: string) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
  /** Folder ids expanded initially. Default all. */
  defaultExpandedFolders?: string[];
}

function InlineRename({ value, label, onCommit, onCancel }: { value: string; label: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = React.useState(value);
  const done = React.useRef(false);
  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    const v = text.trim();
    if (commit && v && v !== value) onCommit(v);
    else onCancel();
  };
  return (
    <input
      aria-label={label}
      autoFocus
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      className={cn("h-7 w-full min-w-0 rounded-sm border border-input bg-background px-2 text-sm", focusRing)}
    />
  );
}

/** Sidebar chat list with pinned, folders (inline rename), archived and a per-row action menu. */
export const ConversationSidebarList = React.forwardRef<HTMLElement, ConversationSidebarListProps>(
  (
    {
      conversations,
      folders = [],
      activeId,
      onSelect,
      onRename,
      onPin,
      onMove,
      onArchive,
      onDelete,
      onRenameFolder,
      defaultExpandedFolders,
      className,
      ...props
    },
    ref
  ) => {
    const uid = React.useId();
    const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(defaultExpandedFolders ?? folders.map((f) => f.id)));
    const [archivedOpen, setArchivedOpen] = React.useState(false);
    const [renaming, setRenaming] = React.useState<string | null>(null);
    const [renamingFolder, setRenamingFolder] = React.useState<string | null>(null);
    const renameNext = React.useRef<string | null>(null);

    const live = conversations.filter((c) => !c.archived);
    const pinned = live.filter((c) => c.pinned);
    const loose = live.filter((c) => !c.pinned && !(c.folderId && folders.some((f) => f.id === c.folderId)));
    const archived = conversations.filter((c) => c.archived);

    const toggleFolder = (id: string) =>
      setExpanded((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });

    const row = (c: SidebarConversation) => {
      const active = c.id === activeId;
      return (
        <li key={c.id} data-conversation={c.id} className={cn("group/row relative flex items-center rounded-control", active ? "bg-accent" : "hover:bg-accent/60")}>
          {renaming === c.id ? (
            <div className="flex-1 p-0.5">
              <InlineRename
                value={c.title}
                label="Conversation title"
                onCommit={(v) => {
                  onRename?.(c.id, v);
                  setRenaming(null);
                }}
                onCancel={() => setRenaming(null)}
              />
            </div>
          ) : (
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onSelect?.(c.id)}
              onDoubleClick={() => onRename && setRenaming(c.id)}
              className={cn("min-w-0 flex-1 truncate rounded-control px-2.5 py-1.5 text-left text-sm", active ? "font-medium text-foreground" : "text-foreground/90", focusRing)}
            >
              {c.title}
            </button>
          )}
          {renaming !== c.id ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${c.title}`}
                  className={cn(
                    "mr-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                    active && "opacity-100",
                    focusRing
                  )}
                >
                  <RiMore2Fill className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="right"
                className="w-48"
                onCloseAutoFocus={(e) => {
                  if (renameNext.current === c.id) {
                    e.preventDefault();
                    renameNext.current = null;
                    setRenaming(c.id);
                  }
                }}
              >
                {onRename ? (
                  <DropdownMenuItem icon={<RiPencilLine />} onSelect={() => {
                      renameNext.current = c.id;
                      setTimeout(() => {
                        if (renameNext.current === c.id) {
                          renameNext.current = null;
                          setRenaming(c.id);
                        }
                      }, 0);
                    }}>
                    Rename
                  </DropdownMenuItem>
                ) : null}
                {onPin ? (
                  <DropdownMenuItem icon={c.pinned ? <RiUnpinLine /> : <RiPushpinLine />} onSelect={() => onPin(c.id, !c.pinned)}>
                    {c.pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                ) : null}
                {onMove && folders.length ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger icon={<RiFolderLine />}>Move to</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44">
                      {folders.map((f) => (
                        <DropdownMenuItem key={f.id} icon={<RiFolderLine />} disabled={c.folderId === f.id} onSelect={() => onMove(c.id, f.id)}>
                          {f.name}
                        </DropdownMenuItem>
                      ))}
                      {c.folderId ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => onMove(c.id, null)}>Remove from folder</DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : null}
                {onArchive ? (
                  <DropdownMenuItem icon={c.archived ? <RiInboxUnarchiveLine /> : <RiArchiveLine />} onSelect={() => onArchive(c.id, !c.archived)}>
                    {c.archived ? "Unarchive" : "Archive"}
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" icon={<RiDeleteBinLine />} onSelect={() => onDelete(c.id)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </li>
      );
    };

    const sectionLabel = "px-2.5 pb-1 pt-3 text-2xs font-medium uppercase tracking-wide text-muted-foreground";

    return (
      <nav ref={ref} aria-label="Conversations" className={cn("flex flex-col text-sm", className)} {...props}>
        {pinned.length ? (
          <section aria-labelledby={`${uid}-pinned`}>
            <h3 id={`${uid}-pinned`} className={sectionLabel}>
              Pinned
            </h3>
            <ul className="space-y-0.5">{pinned.map(row)}</ul>
          </section>
        ) : null}
        {folders.length ? (
          <section aria-labelledby={`${uid}-folders`}>
            <h3 id={`${uid}-folders`} className={sectionLabel}>
              Folders
            </h3>
            <ul className="space-y-0.5">
              {folders.map((f) => {
                const items = live.filter((c) => !c.pinned && c.folderId === f.id);
                const isOpen = expanded.has(f.id);
                const contentId = `${uid}-folder-${f.id}`;
                return (
                  <li key={f.id} data-folder={f.id}>
                    <div className="group/folder flex items-center rounded-control hover:bg-accent/60">
                      {renamingFolder === f.id ? (
                        <div className="flex-1 p-0.5">
                          <InlineRename
                            value={f.name}
                            label="Folder name"
                            onCommit={(v) => {
                              onRenameFolder?.(f.id, v);
                              setRenamingFolder(null);
                            }}
                            onCancel={() => setRenamingFolder(null)}
                          />
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={contentId}
                            onClick={() => toggleFolder(f.id)}
                            onDoubleClick={() => onRenameFolder && setRenamingFolder(f.id)}
                            className={cn("flex min-w-0 flex-1 items-center gap-1.5 rounded-control px-2 py-1.5 text-left", focusRing)}
                          >
                            <RiArrowRightSLine aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                            {isOpen ? <RiFolderOpenLine aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : <RiFolderLine aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
                            <span className="truncate font-medium">{f.name}</span>
                            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{items.length}</span>
                          </button>
                          {onRenameFolder ? (
                            <button
                              type="button"
                              aria-label={`Rename folder ${f.name}`}
                              onClick={() => setRenamingFolder(f.id)}
                              className={cn(
                                "mr-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 hover:text-foreground group-hover/folder:opacity-100 focus-visible:opacity-100",
                                focusRing
                              )}
                            >
                              <RiPencilLine className="size-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                    {isOpen ? (
                      <ul id={contentId} className="ml-4 space-y-0.5 border-l border-border pl-1.5">
                        {items.map(row)}
                        {items.length === 0 ? <li className="px-2.5 py-1 text-xs text-muted-foreground">Empty</li> : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {loose.length ? (
          <section aria-labelledby={`${uid}-chats`}>
            <h3 id={`${uid}-chats`} className={sectionLabel}>
              Chats
            </h3>
            <ul className="space-y-0.5">{loose.map(row)}</ul>
          </section>
        ) : null}
        {archived.length ? (
          <section aria-label="Archived" className="mt-2 border-t border-border pt-1">
            <button
              type="button"
              aria-expanded={archivedOpen}
              onClick={() => setArchivedOpen((o) => !o)}
              className={cn("flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/60", focusRing)}
            >
              <RiArrowRightSLine aria-hidden="true" className={cn("size-4 transition-transform", archivedOpen && "rotate-90")} />
              <RiArchiveLine aria-hidden="true" className="size-4" />
              Archived
              <span className="ml-auto tabular-nums">{archived.length}</span>
            </button>
            {archivedOpen ? <ul className="space-y-0.5 opacity-80">{archived.map(row)}</ul> : null}
          </section>
        ) : null}
      </nav>
    );
  }
);
ConversationSidebarList.displayName = "ConversationSidebarList";
