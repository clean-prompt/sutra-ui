import * as React from "react";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiCpuLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiErrorWarningFill,
  RiExternalLinkLine,
  RiFolderTransferLine,
  RiForbidLine,
  RiPauseLine,
  RiPlayLine,
  RiRestartLine,
  RiUploadLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { FileFormatIcon } from "../assets/file-format";
import { formatBytes } from "./file-upload";
import { Button } from "./button";
import { Progress, type ProgressColor } from "./progress";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Seconds remaining as a short string: `45s`, `2m 5s`, `1h 2m`, `—` when unknown. */
export function formatEta(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.round(seconds);
  if (s < 1) return "<1s";
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m}m ${r}s` : `${m}m`;
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** Bytes per second as a short string, e.g. `12.4 MB/s`. */
export function formatSpeed(bytesPerSecond: number | null | undefined): string {
  if (bytesPerSecond == null || !Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "0 B/s";
  return `${formatBytes(bytesPerSecond)}/s`;
}

export type TransferStatus = "queued" | "active" | "paused" | "completed" | "failed" | "canceled";
export type TransferDirection = "upload" | "download" | "move" | "process";

export interface TransferSample {
  /** Epoch ms. */
  t: number;
  /** Bytes transferred at `t`. */
  bytes: number;
}

export interface TransferItemData {
  id: string;
  name: string;
  status: TransferStatus;
  direction?: TransferDirection;
  /** 0–100. Derived from `bytes / total` when omitted. */
  progress?: number;
  /** Bytes transferred so far. */
  bytes?: number;
  /** Total bytes. */
  total?: number;
  /** Bytes per second; computed from `samples` or `startedAt` when omitted. */
  speed?: number;
  /** Seconds remaining; computed from speed when omitted. */
  eta?: number;
  /** Epoch ms when the transfer started. */
  startedAt?: number;
  /** Recent `{ t, bytes }` samples for a smoothed speed. */
  samples?: TransferSample[];
  /** Error shown for failed transfers (kept verbatim, e.g. upstream error text). */
  error?: string;
  /** Custom icon instead of the file-format icon. */
  icon?: React.ReactNode;
  /** Extension override for the file-format icon. */
  ext?: string;
  /** Secondary text, e.g. a destination path. */
  detail?: React.ReactNode;
}

export interface TransferStats {
  percent: number | null;
  speed: number | null;
  eta: number | null;
}

const SPEED_WINDOW_MS = 5000;

/** Percent, speed (bytes/s) and ETA (s) for a transfer, from explicit values or samples. */
export function getTransferStats(item: TransferItemData, now: number = Date.now()): TransferStats {
  const { bytes, total } = item;
  const percent =
    item.status === "completed"
      ? 100
      : item.progress != null
        ? Math.max(0, Math.min(100, item.progress))
        : bytes != null && total
          ? Math.max(0, Math.min(100, (bytes / total) * 100))
          : null;
  let speed: number | null = item.speed ?? null;
  if (speed == null && item.samples && item.samples.length >= 2) {
    const last = item.samples[item.samples.length - 1];
    const window = item.samples.filter((s) => last.t - s.t <= SPEED_WINDOW_MS);
    const first = window.length >= 2 ? window[0] : item.samples[item.samples.length - 2];
    const dt = (last.t - first.t) / 1000;
    if (dt > 0) speed = Math.max(0, (last.bytes - first.bytes) / dt);
  }
  if (speed == null && item.startedAt != null && bytes != null) {
    const dt = (now - item.startedAt) / 1000;
    if (dt > 0) speed = bytes / dt;
  }
  if (item.status !== "active") speed = item.status === "paused" ? 0 : speed;
  let eta: number | null = item.eta ?? null;
  if (eta == null && speed && speed > 0 && bytes != null && total != null) eta = Math.max(0, (total - bytes) / speed);
  return { percent, speed, eta };
}

export interface TransferSummary {
  counts: Record<TransferStatus, number>;
  /** Sum of active transfer speeds, bytes/s. */
  speed: number;
  /** Combined percent across items with a known size, or null. */
  percent: number | null;
  text: string;
}

/** Counts per status, combined speed and a "3 active · 1 failed · 12.4 MB/s" line. */
export function summarizeTransfers(items: TransferItemData[], now: number = Date.now()): TransferSummary {
  const counts: Record<TransferStatus, number> = { queued: 0, active: 0, paused: 0, completed: 0, failed: 0, canceled: 0 };
  let speed = 0;
  let done = 0;
  let total = 0;
  let pctSum = 0;
  let pctN = 0;
  for (const item of items) {
    counts[item.status]++;
    const stats = getTransferStats(item, now);
    if (item.status === "active" && stats.speed) speed += stats.speed;
    if (item.status === "canceled") continue;
    if (item.total) {
      total += item.total;
      done += item.status === "completed" ? item.total : (item.bytes ?? ((stats.percent ?? 0) / 100) * item.total);
    } else if (stats.percent != null) {
      pctSum += stats.percent;
      pctN++;
    }
  }
  const percent = total > 0 ? (done / total) * 100 : pctN > 0 ? pctSum / pctN : null;
  const parts: string[] = [];
  if (counts.active) parts.push(`${counts.active} active`);
  if (counts.queued) parts.push(`${counts.queued} queued`);
  if (counts.paused) parts.push(`${counts.paused} paused`);
  if (counts.failed) parts.push(`${counts.failed} failed`);
  if (counts.completed) parts.push(`${counts.completed} done`);
  if (counts.canceled) parts.push(`${counts.canceled} canceled`);
  if (speed > 0) parts.push(formatSpeed(speed));
  return { counts, speed, percent, text: parts.join(" · ") || "No transfers" };
}

/* ------------------------------------------------------------------ */
/* TransferItem                                                        */
/* ------------------------------------------------------------------ */

const statusMeta: Record<TransferStatus, { label: string; text: string; color: ProgressColor }> = {
  queued: { label: "Queued", text: "text-muted-foreground", color: "neutral" },
  active: { label: "In progress", text: "text-primary", color: "primary" },
  paused: { label: "Paused", text: "text-warning-soft-foreground", color: "warning" },
  completed: { label: "Completed", text: "text-success", color: "success" },
  failed: { label: "Failed", text: "text-destructive", color: "destructive" },
  canceled: { label: "Canceled", text: "text-muted-foreground", color: "neutral" },
};

const directionMeta: Record<TransferDirection, { label: string; Icon: typeof RiUploadLine }> = {
  upload: { label: "Upload", Icon: RiUploadLine },
  download: { label: "Download", Icon: RiDownloadLine },
  move: { label: "Move", Icon: RiFolderTransferLine },
  process: { label: "Process", Icon: RiCpuLine },
};

export interface TransferItemActions {
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  onOpen?: () => void;
}

export interface TransferItemProps
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "id" | "onPause">,
    Omit<TransferItemData, "id">,
    TransferItemActions {
  id?: string;
  /** Override "now" (epoch ms) for speed computed from `startedAt`. */
  now?: number;
  /** Denser row for trays. */
  compact?: boolean;
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label.split(" ")[0]}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  );
}

/** One upload/download/job row: icon, name, progress, bytes, speed, ETA, status and actions. */
export const TransferItem = React.forwardRef<HTMLLIElement, TransferItemProps>(
  (
    {
      id,
      name,
      status,
      direction,
      progress,
      bytes,
      total,
      speed: speedProp,
      eta: etaProp,
      startedAt,
      samples,
      error,
      icon,
      ext,
      detail,
      now,
      compact,
      onPause,
      onResume,
      onCancel,
      onRetry,
      onRemove,
      onOpen,
      className,
      ...props
    },
    ref
  ) => {
    const stats = getTransferStats(
      { id: id ?? name, name, status, progress, bytes, total, speed: speedProp, eta: etaProp, startedAt, samples },
      now
    );
    const meta = statusMeta[status];
    const dir = direction ? directionMeta[direction] : null;
    const showBar = status === "active" || status === "paused" || (status === "queued" && stats.percent != null && stats.percent > 0);

    const metaParts: React.ReactNode[] = [];
    if (status === "completed") {
      metaParts.push(total != null ? formatBytes(total) : null);
    } else if (status === "failed" || status === "canceled") {
      if (bytes != null && total != null) metaParts.push(`${formatBytes(bytes)} of ${formatBytes(total)}`);
    } else {
      if (bytes != null && total != null) metaParts.push(`${formatBytes(bytes)} of ${formatBytes(total)}`);
      else if (total != null) metaParts.push(formatBytes(total));
      if (status === "active") {
        if (stats.speed != null) metaParts.push(formatSpeed(stats.speed));
        if (stats.eta != null) metaParts.push(`${formatEta(stats.eta)} left`);
      }
    }
    const metaText = metaParts.filter(Boolean);

    const actions: React.ReactNode[] = [];
    if (status === "active" && onPause)
      actions.push(<ActionButton key="pause" label={`Pause ${name}`} onClick={onPause}><RiPauseLine /></ActionButton>);
    if (status === "paused" && onResume)
      actions.push(<ActionButton key="resume" label={`Resume ${name}`} onClick={onResume}><RiPlayLine /></ActionButton>);
    if ((status === "failed" || status === "canceled") && onRetry)
      actions.push(<ActionButton key="retry" label={`Retry ${name}`} onClick={onRetry}><RiRestartLine /></ActionButton>);
    if (status === "completed" && onOpen)
      actions.push(<ActionButton key="open" label={`Open ${name}`} onClick={onOpen}><RiExternalLinkLine /></ActionButton>);
    if ((status === "queued" || status === "active" || status === "paused") && onCancel)
      actions.push(<ActionButton key="cancel" label={`Cancel ${name}`} onClick={onCancel}><RiCloseLine /></ActionButton>);
    if ((status === "completed" || status === "failed" || status === "canceled") && onRemove)
      actions.push(<ActionButton key="remove" label={`Remove ${name}`} onClick={onRemove}><RiDeleteBinLine /></ActionButton>);

    const StatusIcon =
      status === "completed" ? RiCheckboxCircleFill : status === "failed" ? RiErrorWarningFill : status === "canceled" ? RiForbidLine : null;

    return (
      <li
        ref={ref}
        data-status={status}
        data-direction={direction}
        className={cn("group/transfer flex items-start gap-3", compact ? "px-3 py-2.5" : "px-4 py-3", className)}
        {...props}
      >
        <span className="relative mt-0.5 shrink-0">
          {icon ? (
            <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
          ) : (
            <FileFormatIcon ext={ext ?? name} size="sm" />
          )}
          {dir && (
            <span
              role="img"
              aria-label={dir.label}
              title={dir.label}
              className="absolute -bottom-1 -right-1.5 flex size-4 items-center justify-center rounded-full border border-background bg-foreground text-background [&_svg]:size-2.5"
            >
              <dir.Icon aria-hidden />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={name}>
              {name}
            </p>
            {stats.percent != null && (status === "active" || status === "paused") && (
              <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">{Math.round(stats.percent)}%</span>
            )}
          </div>
          {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
          {showBar && (
            <Progress
              aria-label={`${name} progress`}
              value={status === "active" && stats.percent == null ? null : (stats.percent ?? 0)}
              size="xs"
              color={meta.color}
              className="my-1.5"
            />
          )}
          <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span className={cn("inline-flex items-center gap-1 font-medium", meta.text)}>
              {StatusIcon && <StatusIcon aria-hidden className="size-3.5" />}
              {meta.label}
            </span>
            {metaText.map((part, i) => (
              <React.Fragment key={i}>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{part}</span>
              </React.Fragment>
            ))}
          </p>
          {status === "failed" && error && (
            <p role="alert" className="mt-1 break-words text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        {actions.length > 0 && <div className="-mr-1 flex shrink-0 items-center gap-0.5">{actions}</div>}
      </li>
    );
  }
);
TransferItem.displayName = "TransferItem";

/* ------------------------------------------------------------------ */
/* TransferList                                                        */
/* ------------------------------------------------------------------ */

export interface TransferListActions {
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  onOpen?: (id: string) => void;
  /** Shows "Clear completed" when there are finished rows. */
  onClearCompleted?: () => void;
}

export interface TransferListProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onPause">,
    TransferListActions {
  items: TransferItemData[];
  /** Group header title. Pass `null` to hide the header. Default "Transfers". */
  title?: React.ReactNode | null;
  /** Override "now" (epoch ms) for computed speeds. */
  now?: number;
  compact?: boolean;
  emptyMessage?: React.ReactNode;
  /** Max height of the scrolling list. */
  maxHeight?: number | string;
}

function bind(fn: ((id: string) => void) | undefined, id: string) {
  return fn ? () => fn(id) : undefined;
}

/** Queue of transfers with a summary header ("3 active · 1 failed · 12.4 MB/s") and "Clear completed". */
export const TransferList = React.forwardRef<HTMLDivElement, TransferListProps>(
  (
    {
      items,
      title = "Transfers",
      now,
      compact,
      emptyMessage = "No transfers",
      maxHeight,
      onPause,
      onResume,
      onCancel,
      onRetry,
      onRemove,
      onOpen,
      onClearCompleted,
      className,
      ...props
    },
    ref
  ) => {
    const summary = summarizeTransfers(items, now);
    const finished = summary.counts.completed + summary.counts.canceled;
    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col", className)} {...props}>
        {title !== null && (
          <div className={cn("flex items-center gap-3 border-b border-border", compact ? "px-3 py-2" : "px-4 py-2.5")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{title}</p>
              <p className="truncate text-xs tabular-nums text-muted-foreground" data-transfer-summary="">
                {summary.text}
              </p>
            </div>
            {onClearCompleted && finished > 0 && (
              <Button type="button" variant="ghost" size="xs" onClick={onClearCompleted}>
                Clear completed
              </Button>
            )}
          </div>
        )}
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul
            role="list"
            aria-label={typeof title === "string" ? title : "Transfers"}
            className="scrollbar-thin divide-y divide-border overflow-y-auto"
            style={maxHeight != null ? { maxHeight } : undefined}
          >
            {items.map((item) => (
              <TransferItem
                key={item.id}
                {...item}
                now={now}
                compact={compact}
                onPause={bind(onPause, item.id)}
                onResume={bind(onResume, item.id)}
                onCancel={bind(onCancel, item.id)}
                onRetry={bind(onRetry, item.id)}
                onRemove={bind(onRemove, item.id)}
                onOpen={bind(onOpen, item.id)}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }
);
TransferList.displayName = "TransferList";

/* ------------------------------------------------------------------ */
/* TransferTray                                                        */
/* ------------------------------------------------------------------ */

export interface TransferTrayProps extends Omit<TransferListProps, "title" | "compact"> {
  /** Header title; defaults to e.g. "Uploading 3 items" / "2 transfers complete". */
  title?: React.ReactNode;
  minimized?: boolean;
  defaultMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  /** Shows a close button. */
  onClose?: () => void;
  position?: "bottom-right" | "bottom-left";
  /** Render in place instead of fixed to the viewport (for previews). */
  inline?: boolean;
}

function trayTitle(items: TransferItemData[], counts: Record<TransferStatus, number>) {
  const running = counts.active + counts.queued + counts.paused;
  if (running > 0) {
    const dirs = new Set(items.filter((i) => i.status === "active" || i.status === "queued").map((i) => i.direction));
    const verb = dirs.size === 1 ? ({ upload: "Uploading", download: "Downloading", move: "Moving", process: "Processing" } as const)[[...dirs][0] ?? "upload"] ?? "Transferring" : "Transferring";
    return `${verb} ${running} ${running === 1 ? "item" : "items"}`;
  }
  if (counts.failed > 0) return `${counts.failed} ${counts.failed === 1 ? "transfer" : "transfers"} failed`;
  const done = counts.completed;
  return `${done} ${done === 1 ? "transfer" : "transfers"} complete`;
}

/** Floating, collapsible uploads/downloads panel pinned to a corner (Google Drive style). */
export const TransferTray = React.forwardRef<HTMLDivElement, TransferTrayProps>(
  (
    {
      items,
      title,
      minimized: minimizedProp,
      defaultMinimized = false,
      onMinimizedChange,
      onClose,
      position = "bottom-right",
      inline,
      now,
      maxHeight = 320,
      className,
      ...listProps
    },
    ref
  ) => {
    const [minimized, setMinimized] = useControllableState({
      value: minimizedProp,
      defaultValue: defaultMinimized,
      onChange: onMinimizedChange,
    });
    const summary = summarizeTransfers(items, now);
    const heading = title ?? trayTitle(items, summary.counts);
    const headingId = React.useId();
    const bodyId = React.useId();
    const running = summary.counts.active + summary.counts.queued + summary.counts.paused > 0;
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={headingId}
        className={cn(
          "z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-box border border-border bg-popover text-foreground shadow-2xl",
          !inline && "fixed bottom-4",
          !inline && (position === "bottom-right" ? "right-4" : "left-4"),
          className
        )}
      >
        <div className="flex items-center gap-2 bg-subtle py-2 pl-4 pr-2">
          <div className="min-w-0 flex-1">
            <p id={headingId} className="truncate text-sm font-semibold">
              {heading}
            </p>
            <p className="truncate text-xs tabular-nums text-muted-foreground">{summary.text}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={minimized ? "Expand transfers" : "Minimize transfers"}
            aria-expanded={!minimized}
            aria-controls={bodyId}
            onClick={() => setMinimized(!minimized)}
          >
            {minimized ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
          </Button>
          {onClose && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close transfers" onClick={onClose}>
              <RiCloseLine />
            </Button>
          )}
        </div>
        {running && summary.percent != null && (
          <Progress aria-label="Overall progress" value={summary.percent} size="xs" className="rounded-none" />
        )}
        <div id={bodyId} hidden={minimized}>
          <TransferList items={items} title={null} now={now} compact maxHeight={maxHeight} {...listProps} />
          {listProps.onClearCompleted && summary.counts.completed + summary.counts.canceled > 0 && (
            <div className="flex justify-end border-t border-border px-2 py-1.5">
              <Button type="button" variant="ghost" size="xs" onClick={listProps.onClearCompleted}>
                Clear completed
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
TransferTray.displayName = "TransferTray";
