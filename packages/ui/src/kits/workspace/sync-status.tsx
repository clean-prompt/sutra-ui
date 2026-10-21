import * as React from "react";
import {
  type RemixiconComponentType,
  RiCheckboxCircleLine,
  RiCloudOffLine,
  RiErrorWarningLine,
  RiGitMergeLine,
  RiRefreshLine,
  RiWifiOffLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatRelativeTime } from "../../lib/relative-time";
import { useChangeKey } from "../../hooks/use-change-key";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { useNow } from "../../hooks/use-now";
import { Button } from "../../primitives/button";
import { InlineAlert } from "../../primitives/inline-alert";
import { SimpleTooltip } from "../../primitives/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../primitives/dialog";

export type SyncState = "synced" | "syncing" | "offline" | "error" | "conflict";
export { useOnlineStatus } from "../../hooks/use-online-status";

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
  /** Sync state (`synced`, `syncing`, `offline`, `error` or `conflict`); sets the icon, label and tone. */
  status: SyncState;
  /** Time of the last successful sync; shown as a relative label. */
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
    // The check pops in when a sync finishes, never on the first render.
    const iconKey = useChangeKey(status);
    const showsLast = lastSyncedAt != null && status !== "conflict" && !(status === "error" && onRetry);
    const current = useNow({ active: showsLast && now === undefined, interval: 30_000, fixed: now });
    const pending = pendingChanges > 0 ? `${pendingChanges} ${pendingChanges === 1 ? "change" : "changes"}` : undefined;
    // The state part is stable between clock ticks; the relative time is kept out of the live region's text
    // (it goes in the description), so a ticking "N min ago" is never re-announced.
    const summary = {
      synced: "All changes saved",
      syncing: pending ? `Uploading ${pending}` : "Syncing changes",
      offline: pending ? `${pending} saved locally, will sync when you reconnect` : "Changes are saved on this device",
      error: onRetry ? "Couldn’t reach the server · Click to retry" : "Couldn’t reach the server",
      conflict: onResolve ? "This item changed on another device · Click to resolve" : "This item changed on another device",
    }[status];
    const timeText = showsLast && lastSyncedAt != null ? `Last synced ${formatRelativeTime(lastSyncedAt, current)}` : undefined;
    const detail = [summary, timeText].filter(Boolean).join(" · ");
    const descId = React.useId();
    const action = status === "conflict" ? onResolve : status === "error" || status === "offline" ? onRetry : undefined;

    return (
      <>
        <span role="status" className="inline-flex">
          <SimpleTooltip content={detail}>
            <button
              ref={ref}
              type="button"
              data-status={status}
              aria-label={showLabel ? undefined : `${label}. ${summary}`}
              aria-describedby={timeText ? descId : undefined}
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
              data-slot="sync-status"
              {...props}
            >
              {status === "synced" || status === "syncing" ? (
                <Icon
                  key={iconKey}
                  aria-hidden
                  className={cn("size-4", status === "syncing" && "animate-spin", status === "synced" && cn("text-success", iconKey > 0 && "animate-pop"))}
                />
              ) : (
                <Icon aria-hidden className="size-4" />
              )}
              {showLabel && <span>{label}</span>}
              {showLabel && pendingChanges > 0 && status !== "synced" && (
                <span className="rounded-full bg-muted px-1.5 text-2xs tabular-nums text-muted-foreground">{pendingChanges}</span>
              )}
              <span aria-hidden className={cn("size-1.5 rounded-full transition-colors", stateStyle[status].dot, showLabel && "hidden")} />
            </button>
          </SimpleTooltip>
        </span>
        {timeText && (
          <span id={descId} hidden>
            {timeText}
          </span>
        )}
      </>
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
  /** Local changes waiting to upload, shown in the message. */
  pendingChanges?: number;
  /** Called when the user presses Retry; the button is hidden when unset. */
  onRetry?: () => void;
  /** Shows a dismiss button. */
  dismissible?: boolean;
  /** Called when the user dismisses the banner (with `dismissible`). */
  onDismiss?: () => void;
}

/** Banner shown while offline: reassures that changes are saved locally. A preset over `InlineAlert layout="strip"`. */
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
      <InlineAlert
        ref={ref}
        tone="warning"
        layout="strip"
        role="status"
        icon={<RiWifiOffLine />}
        action={
          onRetry && (
            <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry} className="text-current">
              Retry
            </Button>
          )
        }
        onDismiss={
          dismissible
            ? () => {
                setDismissed(true);
                onDismiss?.();
              }
            : undefined
        }
        className={className}
        data-slot="offline-banner"
        {...props}
      >
        <p className="min-w-0">
          {children ?? (
            <>
              <span className="font-medium">You’re offline.</span> Changes are saved on this device and will sync when you
              reconnect.
              {pendingChanges > 0 && (
                <span className="ms-1 opacity-80">
                  ({pendingChanges} pending {pendingChanges === 1 ? "change" : "changes"})
                </span>
              )}
            </>
          )}
        </p>
      </InlineAlert>
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
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Dialog heading. */
  title?: React.ReactNode;
  /** Helper text under the heading. */
  description?: React.ReactNode;
  /** Your local version of the content, with its source and update time. */
  yours: ConflictVersion;
  /** The other version of the content, with its source and update time. */
  theirs: ConflictVersion;
  /** Called when the user keeps your version. */
  onKeepMine?: () => void;
  /** Called when the user keeps the other version. */
  onKeepTheirs?: () => void;
  /** Shows a "Merge both" action. */
  onMerge?: () => void;
  /** Reference time for relative update labels; set it in tests and SSR for stable output. */
  now?: Date;
  /** Class name for the dialog content. */
  className?: string;
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
  const current = useNow({ active: version.updatedAt != null && now === undefined, interval: 30_000, fixed: now });
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
          {[version.source, version.updatedAt != null ? formatRelativeTime(version.updatedAt, current) : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </header>
      <div className="max-h-72 overflow-auto p-2 scrollbar-thin">{content}</div>
    </section>
  );
}

/** Side-by-side "Yours / Theirs" dialog for resolving a sync conflict. */
export const ConflictResolver = React.forwardRef<HTMLDivElement, ConflictResolverProps>(function ConflictResolver({
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
  className,
}, ref) {
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
      <DialogContent ref={ref} size="xl" data-slot="conflict-resolver" className={className}>
        <DialogHeader icon={<RiGitMergeLine aria-hidden />} tone="warning">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <VersionPane label="Yours" version={yours} compareTo={theirs} tone="mine" now={now} />
          <VersionPane label="Theirs" version={theirs} compareTo={yours} tone="theirs" now={now} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={choose(onKeepTheirs)}>
            Keep theirs
          </Button>
          {onMerge && (
            <Button variant="outline" leadingIcon={<RiGitMergeLine aria-hidden />} onClick={choose(onMerge)}>
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
});
ConflictResolver.displayName = "ConflictResolver";
