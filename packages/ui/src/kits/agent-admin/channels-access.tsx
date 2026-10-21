/** Channel access control: the AccessRequestQueue and `formatChannelAgo`. */
import * as React from "react";
import { RiShieldUserLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { toneClasses } from "../../lib/tone";
import { formatRelative } from "../../lib/time";
import { Button } from "../../primitives/button";
import { Avatar } from "../../primitives/avatar";
import { EmptyState } from "../../primitives/empty-state";
import { ConfirmDialog } from "../../primitives/dialog";
import { type ChannelPlatform, channelPlatforms } from "./channels-model";
import { PlatformIcon } from "./channels-icon";

/* ------------------------------------------------------------------ */
/* AccessRequestQueue                                                  */
/* ------------------------------------------------------------------ */

export interface AccessRequest {
  id: string;
  handle: string;
  name?: string;
  avatarUrl?: string;
  platform: ChannelPlatform;
  /** Pairing code the user received from the bot. */
  code: string;
  requestedAt: Date | number | string;
}

export interface ApprovedChannelUser {
  id: string;
  handle: string;
  name?: string;
  avatarUrl?: string;
  platform: ChannelPlatform;
  approvedAt?: Date | number | string;
}

/**
 * Compact relative time ("just now", "5m ago", "3h ago", "2d ago").
 * @deprecated Use `formatRelative(at, { now })`.
 */
export function formatChannelAgo(at: Date | number | string, now: number = Date.now()): string {
  return formatRelative(at, { now });
}

export interface AccessRequestQueueProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pending pairing requests awaiting approval or denial. */
  requests: AccessRequest[];
  /** Users already approved; listed with a confirm-to-revoke action. */
  approved?: ApprovedChannelUser[];
  /** Called with the request id when the user approves it; may return a promise. */
  onApprove?: (id: string) => void | Promise<void>;
  /** Called with the request id when the user denies it; may return a promise. */
  onDeny?: (id: string) => void | Promise<void>;
  /** Called with the approved user's id after the user confirms revoking access; may return a promise. */
  onRevoke?: (id: string) => void | Promise<void>;
  /** Reference time for relative stamps (tests / SSR). */
  now?: number;
  /** Text shown when there are no pending requests; defaults to a hint about pairing codes. */
  emptyState?: React.ReactNode;
  /** Text shown when there are no pending requests. @deprecated Use `emptyState`. */
  emptyHint?: React.ReactNode;
}

/** Pending pairing requests with approve / deny, plus approved users with confirm-to-revoke. */
export const AccessRequestQueue = React.forwardRef<HTMLDivElement, AccessRequestQueueProps>(
  ({ requests, approved = [], onApprove, onDeny, onRevoke, now, emptyState, emptyHint, className, ...props }, ref) => {
    const pendingId = React.useId();
    const approvedId = React.useId();
    const ref0 = now ?? Date.now();
    return (
      <div ref={ref} data-slot="access-request-queue" className={cn("flex flex-col gap-5", className)} {...props}>
        <section aria-labelledby={pendingId} className="flex flex-col gap-2">
          <h3 id={pendingId} className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Pending requests
            {requests.length > 0 && (
              <span className={cn("rounded-full px-1.5 text-2xs font-semibold tabular-nums", toneClasses.soft.warning)}>
                {requests.length}
              </span>
            )}
          </h3>
          {requests.length === 0 ? (
            <EmptyState
              size="sm"
              variant="dashed"
              icon={<RiShieldUserLine aria-hidden />}
              title="No pending requests"
              description={emptyState ?? emptyHint ?? "When someone messages your agent, they get a pairing code that shows up here."}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5" aria-label={`${r.name ?? r.handle} on ${channelPlatforms[r.platform].label}`}>
                  <span className="relative">
                    <Avatar size="sm" src={r.avatarUrl} name={r.name ?? r.handle} />
                    <PlatformIcon platform={r.platform} size="sm" className="absolute -bottom-1 -end-1 size-4 rounded-sm bg-background [&_svg]:size-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.name ?? r.handle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.name ? `${r.handle} · ` : ""}
                      {formatRelative(r.requestedAt, { now: ref0 })}
                    </p>
                  </div>
                  <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold tracking-widest text-foreground" aria-label={`Code ${r.code}`}>
                    {r.code}
                  </code>
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="ghost" onClick={() => onDeny?.(r.id)} aria-label={`Deny ${r.name ?? r.handle}`}>
                      Deny
                    </Button>
                    <Button size="xs" onClick={() => onApprove?.(r.id)} aria-label={`Approve ${r.name ?? r.handle}`}>
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        {approved.length > 0 && (
          <section aria-labelledby={approvedId} className="flex flex-col gap-2">
            <h3 id={approvedId} className="text-sm font-semibold text-foreground">
              Approved users
            </h3>
            <ul className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
              {approved.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar size="xs" src={u.avatarUrl} name={u.name ?? u.handle} />
                  <PlatformIcon platform={u.platform} size="sm" className="size-5 [&_svg]:size-3.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{u.name ?? u.handle}</p>
                    {u.approvedAt != null && <p className="text-xs text-muted-foreground">Approved {formatRelative(u.approvedAt, { now: ref0 })}</p>}
                  </div>
                  <ConfirmDialog
                    tone="destructive"
                    title={`Revoke ${u.name ?? u.handle}?`}
                    description="They will have to pair again before the agent answers them."
                    confirmLabel="Revoke"
                    onConfirm={() => onRevoke?.(u.id)}
                    trigger={
                      <Button size="xs" variant="destructive-soft" aria-label={`Revoke ${u.name ?? u.handle}`}>
                        Revoke
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }
);
AccessRequestQueue.displayName = "AccessRequestQueue";
