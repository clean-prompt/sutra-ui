import * as React from "react";
import {
  type RemixiconComponentType,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiCloudOffLine,
  RiErrorWarningLine,
  RiGitMergeLine,
  RiRefreshLine,
  RiWifiOffLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatRelative } from "../lib/time";
import { Button } from "./button";
import { SimpleTooltip } from "./tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

export type SyncState = "synced" | "syncing" | "offline" | "error" | "conflict";

/** Short relative time: "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago" ("—" for unparseable input). */
export function formatRelativeTime(value: Date | number | string, now: Date | number = Date.now()) {
  return formatRelative(value, { now, style: "long", maxRelativeDays: 29 }).replace(/^(\d+) hours? ago$/, "$1 h ago");
}

/** Tracks `navigator.onLine` with online/offline events. */
export function useOnlineStatus() {
  const [online, setOnline] = React.useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export const syncStateLabels: Record<SyncState, string> = {
  synced: "Synced",
  syncing: "Syncing…",
  offline: "Offline",
  error: "Sync failed",
  conflict: "Conflict",
};

const stateStyle: Record<SyncState, { dot: string; text: string }> = {
  synced: { dot: "bg-success", text: "text-muted-foreground" },
  syncing: { dot: "bg-info animate-pulse", text: "text-muted-foreground" },
  offline: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  error: { dot: "bg-destructive", text: "text-destructive" },
  conflict: { dot: "bg-warning", text: "text-warning-soft-foreground" },
};

const stateIcon: Record<SyncState, RemixiconComponentType> = {
  synced: RiCheckboxCircleLine,
  syncing: RiRefreshLine,
  offline: RiCloudOffLine,
  error: RiErrorWarningLine,
  conflict: RiGitMergeLine,
};

export interface SyncStatusProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  status: SyncState;
  lastSyncedAt?: Date | number;
  /** Local changes waiting to upload. */
  pendingChanges?: number;
  /** Show the text label (otherwise icon only, label in the tooltip). Default true. */
  showLabel?: boolean;
  /** Reference time for the relative label. */
  now?: Date;
  /** Called on click in the error / offline state. */
  onRetry?: () => void;
  /** Called on click in the conflict state. */
  onResolve?: () => void;
}

/** Local-first sync indicator with a tooltip explaining the state and last sync time. */
export const SyncStatus = React.forwardRef<HTMLButtonElement, SyncStatusProps>(
  (
    { status, lastSyncedAt, pendingChanges = 0, showLabel = true, now, onRetry, onResolve, onClick, className, ...props },
    ref
  ) => {
    const label = syncStateLabels[status];
    const Icon = stateIcon[status];
    const last = lastSyncedAt != null ? `Last synced ${formatRelativeTime(lastSyncedAt, now ?? Date.now())}` : undefined;
    const pending = pendingChanges > 0 ? `${pendingChanges} ${pendingChanges === 1 ? "change" : "changes"}` : undefined;
    const detail = {
      synced: ["All changes saved", last],
      syncing: [pending ? `Uploading ${pending}` : "Syncing changes", last],
      offline: [pending ? `${pending} saved locally, will sync when you reconnect` : "Changes are saved on this device", last],
      error: ["Couldn’t reach the server", onRetry ? "Click to retry" : last],
      conflict: ["This item changed on another device", onResolve ? "Click to resolve" : undefined],
    }[status]
      .filter(Boolean)
      .join(" · ");
    const action = status === "conflict" ? onResolve : status === "error" || status === "offline" ? onRetry : undefined;

    return (
      <span role="status" className="inline-flex">
        <SimpleTooltip content={detail}>
          <button
            ref={ref}
            type="button"
            data-status={status}
            aria-label={showLabel ? undefined : `${label}. ${detail}`}
            onClick={(e) => {
              onClick?.(e);
              action?.();
            }}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-xs font-medium transition-colors hover:bg-accent",
              stateStyle[status].text,
              focusRing,
              className
            )}
            {...props}
          >
            {status === "synced" || status === "syncing" ? (
              <Icon aria-hidden className={cn("size-4", status === "syncing" && "animate-spin", status === "synced" && "text-success")} />
            ) : (
              <Icon aria-hidden className="size-4" />
            )}
            {showLabel && <span>{label}</span>}
            {showLabel && pendingChanges > 0 && status !== "synced" && (
              <span className="rounded-full bg-muted px-1.5 text-2xs tabular-nums text-muted-foreground">{pendingChanges}</span>
            )}
            <span aria-hidden className={cn("size-1.5 rounded-full", stateStyle[status].dot, showLabel && "hidden")} />
          </button>
        </SimpleTooltip>
      </span>
    );
  }
);
SyncStatus.displayName = "SyncStatus";

/* ------------------------------------------------------------------ */
/* OfflineBanner                                                       */
/* ------------------------------------------------------------------ */

export interface OfflineBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Force the offline state; defaults to `navigator.onLine`. */
  offline?: boolean;
  pendingChanges?: number;
  onRetry?: () => void;
  /** Shows a dismiss button. */
  dismissible?: boolean;
  onDismiss?: () => void;
}

/** Banner shown while offline: reassures that changes are saved locally. */
export const OfflineBanner = React.forwardRef<HTMLDivElement, OfflineBannerProps>(
  ({ offline: offlineProp, pendingChanges = 0, onRetry, dismissible, onDismiss, className, children, ...props }, ref) => {
    const online = useOnlineStatus();
    const offline = offlineProp ?? !online;
    const [dismissed, setDismissed] = React.useState(false);
    React.useEffect(() => {
      if (!offline) setDismissed(false);
    }, [offline]);
    if (!offline || dismissed) return null;
    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          "flex items-center gap-3 border-b border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning-soft-foreground",
          className
        )}
        {...props}
      >
        <RiWifiOffLine aria-hidden className="size-4 shrink-0" />
        <p className="min-w-0 flex-1">
          {children ?? (
            <>
              <span className="font-medium">You’re offline.</span> Changes are saved on this device and will sync when you
              reconnect.
              {pendingChanges > 0 && (
                <span className="ml-1 opacity-80">
                  ({pendingChanges} pending {pendingChanges === 1 ? "change" : "changes"})
                </span>
              )}
            </>
          )}
        </p>
        {onRetry && (
          <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine />} onClick={onRetry} className="text-current">
            Retry
          </Button>
        )}
        {dismissible && (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Dismiss"
            className="text-current"
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
          >
            <RiCloseLine />
          </Button>
        )}
      </div>
    );
  }
);
OfflineBanner.displayName = "OfflineBanner";

/* ------------------------------------------------------------------ */
/* ConflictResolver                                                    */
/* ------------------------------------------------------------------ */

export interface ConflictVersion {
  content: React.ReactNode;
  updatedAt?: Date | number;
  /** e.g. "This Mac", "iPhone", or a person's name. */
  source?: string;
}

export interface ConflictResolverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  yours: ConflictVersion;
  theirs: ConflictVersion;
  onKeepMine?: () => void;
  onKeepTheirs?: () => void;
  /** Shows a "Merge both" action. */
  onMerge?: () => void;
  now?: Date;
}

function diffLines(a: string, b: string) {
  const other = new Set(b.split("\n"));
  return a.split("\n").map((line) => ({ line, changed: !other.has(line) }));
}

function VersionPane({
  label,
  version,
  compareTo,
  tone,
  now,
}: {
  label: string;
  version: ConflictVersion;
  compareTo: ConflictVersion;
  tone: "mine" | "theirs";
  now?: Date;
}) {
  const content =
    typeof version.content === "string" && typeof compareTo.content === "string" ? (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm">
        {diffLines(version.content, compareTo.content).map(({ line, changed }, i) => (
          <span
            key={i}
            className={cn(
              "block rounded-xs px-1",
              changed && (tone === "mine" ? "bg-primary-soft text-primary-soft-foreground" : "bg-warning-soft text-warning-soft-foreground")
            )}
          >
            {line || " "}
          </span>
        ))}
      </pre>
    ) : (
      <div className="text-sm">{version.content}</div>
    );
  return (
    <section aria-label={label} className="flex min-w-0 flex-col overflow-hidden rounded-box border border-border">
      <header className="flex items-baseline justify-between gap-2 border-b border-border bg-subtle px-3 py-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="truncate text-xs text-muted-foreground">
          {[version.source, version.updatedAt != null ? formatRelativeTime(version.updatedAt, now ?? Date.now()) : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </header>
      <div className="max-h-72 overflow-auto p-2 scrollbar-thin">{content}</div>
    </section>
  );
}

/** Side-by-side "Yours / Theirs" dialog for resolving a sync conflict. */
export function ConflictResolver({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  title = "Resolve conflict",
  description = "This item was edited on two devices before they synced. Choose which version to keep.",
  yours,
  theirs,
  onKeepMine,
  onKeepTheirs,
  onMerge,
  now,
}: ConflictResolverProps) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const choose = (fn?: () => void) => () => {
    fn?.();
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="xl">
        <DialogHeader icon={<RiGitMergeLine />} tone="warning">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <VersionPane label="Yours" version={yours} compareTo={theirs} tone="mine" now={now} />
          <VersionPane label="Theirs" version={theirs} compareTo={yours} tone="theirs" now={now} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={choose(onKeepTheirs)}>
            Keep theirs
          </Button>
          {onMerge && (
            <Button variant="outline" leadingIcon={<RiGitMergeLine />} onClick={choose(onMerge)}>
              Merge both
            </Button>
          )}
          <Button variant="primary" onClick={choose(onKeepMine)}>
            Keep mine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
ConflictResolver.displayName = "ConflictResolver";
