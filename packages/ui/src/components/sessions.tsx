import * as React from "react";
import {
  RiArrowRightUpLine,
  RiComputerLine,
  RiGlobalLine,
  RiLogoutBoxRLine,
  RiMacbookLine,
  RiMapPinLine,
  RiServerLine,
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiTabletLine,
  RiTvLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { ConfirmDialog } from "./dialog";
import { EmptyState } from "./empty-state";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export type SessionDeviceType = "desktop" | "laptop" | "phone" | "tablet" | "tv" | "browser" | "server";

export interface Session {
  id: string;
  /** Device name, e.g. "Vyom's MacBook Pro". */
  name: string;
  device?: SessionDeviceType;
  browser?: string;
  os?: string;
  location?: string;
  ip?: string;
  lastActive?: Date | number | string;
  /** The session you are using right now. */
  current?: boolean;
}

const deviceIcons: Record<SessionDeviceType, RemixiconComponentType> = {
  desktop: RiComputerLine,
  laptop: RiMacbookLine,
  phone: RiSmartphoneLine,
  tablet: RiTabletLine,
  tv: RiTvLine,
  browser: RiGlobalLine,
  server: RiServerLine,
};

/** "Active now", "5 min ago", "3h ago", "Yesterday", "4 days ago" or a date. */
export function formatSessionLastActive(value: Date | number | string | undefined, now: number = Date.now()) {
  if (value == null) return "Unknown";
  const t = value instanceof Date ? value.getTime() : typeof value === "number" ? value : new Date(value).getTime();
  if (Number.isNaN(t)) return "Unknown";
  const mins = Math.floor((now - t) / 60000);
  if (mins < 2) return "Active now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* SessionRow                                                          */
/* ------------------------------------------------------------------ */

export interface SessionRowProps extends React.HTMLAttributes<HTMLLIElement> {
  session: Session;
  /** Sign this session out. May return a promise; the row shows a spinner until it settles. */
  onRevoke?: (id: string) => void | Promise<void>;
  /** Reference time for "last active" (handy for tests and SSR). */
  now?: number;
  revokeLabel?: string;
}

/** One device/session with icon, details, "This device" badge and an inline-confirmed sign out. */
export const SessionRow = React.forwardRef<HTMLLIElement, SessionRowProps>(
  ({ session, onRevoke, now, revokeLabel = "Sign out", className, ...props }, ref) => {
    const [confirming, setConfirming] = React.useState(false);
    const [revoking, setRevoking] = React.useState(false);
    const Icon = deviceIcons[session.device ?? "browser"] ?? RiGlobalLine;
    const last = formatSessionLastActive(session.lastActive, now);
    const meta = [session.browser, session.os].filter(Boolean).join(" · ");
    const place = [session.location, session.ip].filter(Boolean).join(" · ");
    const titleId = React.useId();

    const revoke = async () => {
      if (!onRevoke) return;
      setRevoking(true);
      try {
        await onRevoke(session.id);
        setConfirming(false);
      } finally {
        setRevoking(false);
      }
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
            session.current ? "bg-success-soft text-success-soft-foreground" : "bg-muted text-muted-foreground"
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
                className={cn("size-1.5 rounded-full", last === "Active now" ? "bg-success" : "bg-muted-foreground/50")}
              />
              {last}
            </span>
          </span>
        </div>
        {onRevoke && !session.current && (
          <div className="ml-13 flex shrink-0 items-center gap-2 sm:ml-0">
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
SessionRow.displayName = "SessionRow";

/* ------------------------------------------------------------------ */
/* SessionList                                                         */
/* ------------------------------------------------------------------ */

export interface SessionListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  sessions?: Session[] | null;
  /** Shows skeleton rows. `sessions == null` is treated as loading too. */
  loading?: boolean;
  onRevoke?: (id: string) => void | Promise<void>;
  /** Shows "Sign out all other sessions" (with a confirm dialog) when there are other sessions. */
  onRevokeOthers?: () => void | Promise<void>;
  title?: React.ReactNode;
  description?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  now?: number;
}

/** Devices & sessions manager: list, per-session sign out, and "sign out everywhere else". */
export const SessionList = React.forwardRef<HTMLDivElement, SessionListProps>(
  (
    {
      sessions,
      loading,
      onRevoke,
      onRevokeOthers,
      title = "Active sessions",
      description,
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
          <div className="min-w-0 flex-1">
            <h3 id={headingId} className="text-sm font-semibold text-foreground">
              {title}
              {!isLoading && <span className="ml-2 font-normal text-muted-foreground">{list.length}</span>}
            </h3>
            {description != null && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {onRevokeOthers && !isLoading && others > 0 && (
            <ConfirmDialog
              tone="destructive"
              icon={<RiShieldCheckLine />}
              title="Sign out all other sessions?"
              description={`${others} other ${others === 1 ? "session" : "sessions"} will be signed out and need to sign in again. You'll stay signed in on this device.`}
              confirmLabel="Sign out others"
              onConfirm={onRevokeOthers}
              trigger={
                <Button size="sm" variant="destructive-soft" leadingIcon={<RiLogoutBoxRLine />}>
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
                <span className="size-10 shrink-0 animate-pulse rounded-xl bg-muted" />
                <span className="flex flex-1 flex-col gap-2">
                  <span className="h-3 w-40 animate-pulse rounded bg-muted" />
                  <span className="h-2.5 w-24 animate-pulse rounded bg-muted" />
                </span>
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <EmptyState size="sm" icon={<RiComputerLine />} title={emptyTitle} description={emptyDescription} />
        ) : (
          <ul aria-labelledby={headingId} className="divide-y divide-border">
            {list.map((s) => (
              <SessionRow key={s.id} session={s} onRevoke={onRevoke} now={now} />
            ))}
          </ul>
        )}
      </div>
    );
  }
);
SessionList.displayName = "SessionList";

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
  name: string;
  /** Handle or email under the name. */
  handle?: string;
  avatarSrc?: string;
  /** Role badge, e.g. "Admin". */
  role?: React.ReactNode;
  apps?: AccountPanelApp[];
  onSignOut?: () => void | Promise<void>;
  /** Ends every session (with a confirm dialog). */
  onSignOutEverywhere?: () => void | Promise<void>;
}

/** Signed-in summary: avatar, name, role, app launch links, and sign out / sign out everywhere. */
export const AccountPanel = React.forwardRef<HTMLDivElement, AccountPanelProps>(
  ({ name, handle, avatarSrc, role, apps, onSignOut, onSignOutEverywhere, className, children, ...props }, ref) => {
    const [signingOut, setSigningOut] = React.useState(false);
    const signOut = async () => {
      if (!onSignOut) return;
      setSigningOut(true);
      try {
        await onSignOut();
      } finally {
        setSigningOut(false);
      }
    };
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
              <Button variant="primary" className="flex-1" leadingIcon={<RiLogoutBoxRLine />} loading={signingOut} onClick={signOut}>
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
                  <Button variant="destructive-soft" className="flex-1">
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
