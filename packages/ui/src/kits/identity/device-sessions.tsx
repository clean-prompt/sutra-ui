import * as React from "react";
import {
  RiArrowRightUpLine,
  RiComputerLine,
  RiLogoutBoxRLine,
  RiMapPinLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { deviceIcon } from "../../assets/device-icons";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { formatRelative, MINUTE_MS, toMs, type FormatRelativeOptions, type TimeInput } from "../../lib/time";
import { toneClasses } from "../../lib/tone";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Avatar } from "../../primitives/avatar";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { EmptyState } from "../../primitives/empty-state";
import { Skeleton } from "../../primitives/progress";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export type SessionDeviceType = "desktop" | "laptop" | "phone" | "tablet" | "tv" | "browser" | "server";

/** A signed-in device or browser (not an agent run; see `AgentSession`). */
export interface DeviceSession {
  id: string;
  /** Device name, e.g. "Vyom's MacBook Pro". */
  name: string;
  device?: SessionDeviceType;
  browser?: string;
  os?: string;
  location?: string;
  ip?: string;
  lastActive?: TimeInput;
  /** The session you are using right now. */
  current?: boolean;
}

/** Seen within the last two minutes (or in the future). */
function isActiveNow(value: TimeInput | undefined, now: number) {
  const t = toMs(value);
  return t !== undefined && now - t < 2 * MINUTE_MS;
}

/** Last active: "Active now", "5 min ago", "3h ago", "Yesterday", "4 days ago" or "Mar 5, 2026" (counts floored). */
const LAST_ACTIVE: FormatRelativeOptions = {
  style: "long",
  round: "floor",
  justNowMs: 2 * MINUTE_MS,
  justNow: "Active now",
  yesterday: "Yesterday",
  unitLabels: { hour: "h" },
  maxRelativeDays: 29,
  dateYear: "always",
  invalid: "Unknown",
};

/**
 * "Active now", "5 min ago", "3h ago", "Yesterday", "4 days ago" or a date.
 * @deprecated Use `formatRelative(value, { now, style: "long", round: "floor", justNowMs: 120_000, justNow: "Active now",
 * yesterday: "Yesterday", unitLabels: { hour: "h" }, maxRelativeDays: 29, dateYear: "always", invalid: "Unknown" })`.
 */
export function formatSessionLastActive(value: Date | number | string | undefined, now: number = Date.now()) {
  return formatRelative(value, { ...LAST_ACTIVE, now });
}

/* ------------------------------------------------------------------ */
/* DeviceSessionRow                                                    */
/* ------------------------------------------------------------------ */

export interface DeviceSessionRowProps extends React.HTMLAttributes<HTMLLIElement> {
  /** The session to show (device, location, last active, current flag). */
  session: DeviceSession;
  /** Sign this session out. May return a promise; the row shows a spinner until it settles. */
  onRevoke?: (id: string) => void | Promise<void>;
  /** Reference time for "last active" (handy for tests and SSR). */
  now?: number;
  /** Label of the sign-out button. Default "Sign out". */
  revokeLabel?: string;
}

/** One device/session with icon, details, "This device" badge and an inline-confirmed sign out. */
export const DeviceSessionRow = React.forwardRef<HTMLLIElement, DeviceSessionRowProps>(
  ({ session, onRevoke, now, revokeLabel = "Sign out", className, ...props }, ref) => {
    const [confirming, setConfirming] = React.useState(false);
    const { run: runRevoke, busy: revoking } = useAsyncAction((id: string) => onRevoke?.(id), {
      onSuccess: () => setConfirming(false),
    });
    const Icon = deviceIcon(session.device ?? "browser");
    const last = formatRelative(session.lastActive, { ...LAST_ACTIVE, now });
    const meta = [session.browser, session.os].filter(Boolean).join(" · ");
    const place = [session.location, session.ip].filter(Boolean).join(" · ");
    const titleId = React.useId();

    const revoke = () => {
      if (onRevoke) void runRevoke(session.id);
    };

    return (
      <li
        ref={ref}
        aria-labelledby={titleId}
        data-slot="session-row"
        data-current={session.current || undefined}
        className={cn("flex flex-wrap items-start gap-3 px-4 py-3.5 sm:flex-nowrap sm:items-center", className)}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
            session.current ? toneClasses.soft.success : toneClasses.soft.neutral
          )}
        >
          <Icon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span id={titleId} className="truncate text-sm font-medium text-foreground">
              {session.name}
            </span>
            {session.current && (
              <Badge color="success" size="sm" className="shrink-0">
                This device
              </Badge>
            )}
          </div>
          {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {place && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <RiMapPinLine aria-hidden className="size-3 shrink-0" />
                <span className="truncate">{place}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", isActiveNow(session.lastActive, now ?? Date.now()) ? toneClasses.dot.success : "bg-muted-foreground/50")}
              />
              {last}
            </span>
          </span>
        </div>
        {onRevoke && !session.current && (
          <div className="ms-13 flex shrink-0 items-center gap-2 sm:ms-0">
            {confirming ? (
              <>
                <span className="text-xs text-muted-foreground">Sign out this device?</span>
                <Button size="xs" variant="ghost" onClick={() => setConfirming(false)} disabled={revoking}>
                  Cancel
                </Button>
                <Button size="xs" variant="destructive" loading={revoking} onClick={revoke}>
                  {revokeLabel}
                </Button>
              </>
            ) : (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => setConfirming(true)}
                aria-label={`${revokeLabel} ${session.name}`}
              >
                {revokeLabel}
              </Button>
            )}
          </div>
        )}
      </li>
    );
  }
);
DeviceSessionRow.displayName = "DeviceSessionRow";

/** Alias of `DeviceSessionRow`. @deprecated Use `DeviceSessionRow`. */
export const SessionRow = DeviceSessionRow;
/** @deprecated Use `DeviceSessionRowProps`. */
export type SessionRowProps = DeviceSessionRowProps;

/* ------------------------------------------------------------------ */
/* DeviceSessionList                                                   */
/* ------------------------------------------------------------------ */

export interface DeviceSessionListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Signed-in sessions; the current one is listed first and cannot be revoked. `null` or unset counts as loading. */
  sessions?: DeviceSession[] | null;
  /** Shows skeleton rows. `sessions == null` is treated as loading too. */
  loading?: boolean;
  /**
   * Called with the session id when the user signs a session out; may return a promise, and the row shows a spinner
   * until it settles.
   */
  onRevoke?: (id: string) => void | Promise<void>;
  /** Shows "Sign out all other sessions" (with a confirm dialog) when there are other sessions. */
  onRevokeOthers?: () => void | Promise<void>;
  /** Heading of the list. Default "Active sessions". */
  title?: React.ReactNode;
  /** Helper text under the heading. */
  description?: React.ReactNode;
  /** Replaces the whole empty state (overrides `emptyTitle` / `emptyDescription`). */
  emptyState?: React.ReactNode;
  /** Title of the empty state. Default "No active sessions". */
  emptyTitle?: React.ReactNode;
  /** Text of the empty state. Default "Devices appear here after they sign in.". */
  emptyDescription?: React.ReactNode;
  /** Reference time for "last active" labels; set it in tests and SSR for stable output. */
  now?: number;
}

/** Devices & sessions manager: list, per-session sign out, and "sign out everywhere else". */
export const DeviceSessionList = React.forwardRef<HTMLDivElement, DeviceSessionListProps>(
  (
    {
      sessions,
      loading,
      onRevoke,
      onRevokeOthers,
      title = "Active sessions",
      description,
      emptyState,
      emptyTitle = "No active sessions",
      emptyDescription = "Devices appear here after they sign in.",
      now,
      className,
      ...props
    },
    ref
  ) => {
    const isLoading = loading || sessions == null;
    const list = React.useMemo(
      () => [...(sessions ?? [])].sort((a, b) => Number(Boolean(b.current)) - Number(Boolean(a.current))),
      [sessions]
    );
    const others = list.filter((s) => !s.current).length;
    const headingId = React.useId();

    return (
      <div
        ref={ref}
        data-slot="session-list"
        className={cn("overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1 basis-48">
            <h3 id={headingId} className="text-sm font-semibold text-foreground">
              {title}
              {!isLoading && <span className="ms-2 font-normal text-muted-foreground">{list.length}</span>}
            </h3>
            {description != null && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {onRevokeOthers && !isLoading && others > 0 && (
            <ConfirmDialog
              tone="destructive"
              icon={<RiShieldCheckLine aria-hidden />}
              title="Sign out all other sessions?"
              description={`${others} other ${pluralize(others, "session")} will be signed out and need to sign in again. You'll stay signed in on this device.`}
              confirmLabel="Sign out others"
              onConfirm={onRevokeOthers}
              trigger={
                <Button size="sm" variant="destructive-soft" leadingIcon={<RiLogoutBoxRLine className="rtl:-scale-x-100" aria-hidden />}>
                  Sign out all other sessions
                </Button>
              }
            />
          )}
        </div>
        {isLoading ? (
          <ul aria-busy="true" aria-labelledby={headingId} className="divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-40 rounded" />
                  <Skeleton className="h-2.5 w-24 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          (emptyState ?? <EmptyState size="sm" icon={<RiComputerLine aria-hidden />} title={emptyTitle} description={emptyDescription} />)
        ) : (
          <ul aria-labelledby={headingId} className="divide-y divide-border">
            {list.map((s) => (
              <DeviceSessionRow key={s.id} session={s} onRevoke={onRevoke} now={now} />
            ))}
          </ul>
        )}
      </div>
    );
  }
);
DeviceSessionList.displayName = "DeviceSessionList";

/** @deprecated Use `DeviceSession`. */
export type Session = DeviceSession;
/** Alias of `DeviceSessionList`. @deprecated Use `DeviceSessionList`. */
export const SessionList = DeviceSessionList;
/** @deprecated Use `DeviceSessionListProps`. */
export type SessionListProps = DeviceSessionListProps;

/* ------------------------------------------------------------------ */
/* AccountPanel                                                        */
/* ------------------------------------------------------------------ */

export interface AccountPanelApp {
  id: string;
  name: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface AccountPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  /** Account holder's name, shown as the heading and used for the avatar fallback. */
  name: string;
  /** Handle or email under the name. */
  handle?: string;
  /** Avatar image URL; initials are shown when unset. */
  avatarSrc?: string;
  /** Role badge, e.g. "Admin". */
  role?: React.ReactNode;
  /** Apps signed in on this account, listed in the panel. */
  apps?: AccountPanelApp[];
  /** Called when the user signs out of this session; the button is hidden when unset. */
  onSignOut?: () => void | Promise<void>;
  /** Ends every session (with a confirm dialog). */
  onSignOutEverywhere?: () => void | Promise<void>;
}

/** Signed-in summary: avatar, name, role, app launch links, and sign out / sign out everywhere. */
export const AccountPanel = React.forwardRef<HTMLDivElement, AccountPanelProps>(
  ({ name, handle, avatarSrc, role, apps, onSignOut, onSignOutEverywhere, className, children, ...props }, ref) => {
    const { run: signOut, busy: signingOut } = useAsyncAction(onSignOut);
    return (
      <div
        ref={ref}
        data-slot="account-panel"
        className={cn("flex w-full max-w-sm flex-col gap-5 rounded-box border border-border bg-card p-5 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-3">
          <Avatar size="lg" name={name} src={avatarSrc} />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold text-foreground">{name}</span>
              {role != null && (
                <Badge color="brand" size="sm" className="shrink-0">
                  {role}
                </Badge>
              )}
            </div>
            {handle && <span className="truncate text-sm text-muted-foreground">{handle}</span>}
          </div>
        </div>

        {apps && apps.length > 0 && (
          <nav aria-label="Apps">
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {apps.map((app) => (
                <li key={app.id}>
                  <a
                    href={app.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-control border border-border bg-background px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
                      focusRing
                    )}
                  >
                    {app.icon && <span className="flex size-6 shrink-0 items-center justify-center [&_svg]:size-4">{app.icon}</span>}
                    <span className="min-w-0 flex-1 truncate">{app.name}</span>
                    <RiArrowRightUpLine
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {children}

        {(onSignOut || onSignOutEverywhere) && (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            {onSignOut && (
              <Button variant="primary" className="sm:flex-1" leadingIcon={<RiLogoutBoxRLine className="rtl:-scale-x-100" aria-hidden />} loading={signingOut} onClick={() => void signOut()}>
                Sign out
              </Button>
            )}
            {onSignOutEverywhere && (
              <ConfirmDialog
                tone="destructive"
                title="Sign out everywhere?"
                description="Every device signed in to this account, including this one, will be signed out."
                confirmLabel="Sign out everywhere"
                onConfirm={onSignOutEverywhere}
                trigger={
                  <Button variant="destructive-soft" className="sm:flex-1">
                    Sign out everywhere
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>
    );
  }
);
AccountPanel.displayName = "AccountPanel";
