import * as React from "react";
import {
  RiAlarmWarningLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeviceLine,
  RiFingerprintLine,
  RiKey2Line,
  RiLockPasswordLine,
  RiLoginBoxLine,
  RiLogoutBoxRLine,
  RiRefreshLine,
  RiRobot2Line,
  RiShieldCheckLine,
  RiShieldKeyholeLine,
  RiSmartphoneLine,
  RiUserForbidLine,
} from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../../lib/cn";
import { normalizeTone, toneClasses, type Tone } from "../../lib/tone";
import { pluralize } from "../../lib/format";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "../../primitives/drawer";
import { Favicon } from "../../primitives/favicon";
import { KeyValueList, type KeyValueItem } from "../../primitives/key-value";
import { Switch } from "../../primitives/switch";
import { ScopeList, type ScopeDefinition, type ScopeInput } from "./consent";
import { formatRelativeDate } from "./api-keys";
import { calendarDayDiff, dateKey, safeISO, toMs as toMsOrUndefined, toValidDate, type TimeInput as DateInput } from "../../lib/time";

const toMs = (v: DateInput) => toMsOrUndefined(v) ?? NaN;

/* ------------------------------------------------------------------ */
/* SecurityActivityFeed                                                */
/* ------------------------------------------------------------------ */

export type SecurityEventType =
  | "sign_in"
  | "sign_out"
  | "sign_in_failed"
  | "approved"
  | "denied"
  | "revoked"
  | "key_created"
  | "key_rotated"
  | "password_changed"
  | "mfa_enabled"
  | "credential_presented"
  | "device_added"
  | "agent_action"
  | "alert";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType | (string & {});
  description: React.ReactNode;
  at: DateInput;
  device?: string;
  ip?: string;
  location?: string;
  app?: string;
  /** Extra detail rows shown when the event is expanded. */
  details?: KeyValueItem[];
  /** Highlight as suspicious. `danger` is a deprecated alias of `destructive`. */
  risk?: "normal" | "warning" | "destructive" | "danger";
}

type IconType = React.ComponentType<{ className?: string; "aria-hidden"?: React.AriaAttributes["aria-hidden"] }>;

const eventIcon: Record<string, { icon: IconType; tone: Tone }> = {
  sign_in: { icon: RiLoginBoxLine, tone: "info" },
  sign_out: { icon: RiLogoutBoxRLine, tone: "neutral" },
  sign_in_failed: { icon: RiUserForbidLine, tone: "destructive" },
  approved: { icon: RiCheckboxCircleLine, tone: "success" },
  denied: { icon: RiCloseCircleLine, tone: "neutral" },
  revoked: { icon: RiCloseCircleLine, tone: "destructive" },
  key_created: { icon: RiKey2Line, tone: "primary" },
  key_rotated: { icon: RiRefreshLine, tone: "primary" },
  password_changed: { icon: RiLockPasswordLine, tone: "warning" },
  mfa_enabled: { icon: RiShieldKeyholeLine, tone: "success" },
  credential_presented: { icon: RiShieldCheckLine, tone: "info" },
  device_added: { icon: RiSmartphoneLine, tone: "info" },
  agent_action: { icon: RiRobot2Line, tone: "primary" },
  alert: { icon: RiAlarmWarningLine, tone: "destructive" },
};

function dayLabel(t: number, now: number) {
  const d = toValidDate(t);
  const diff = calendarDayDiff(now, t);
  if (!d || diff === undefined) return "Unknown date";
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: diff < 7 ? "long" : undefined,
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined,
  });
}

/** Group events by local day, newest first. */
export function groupEventsByDay<T extends { at: DateInput }>(events: T[], now: number = Date.now()) {
  const sorted = [...events].sort((a, b) => toMs(b.at) - toMs(a.at));
  const groups: { key: string; label: string; events: T[] }[] = [];
  for (const e of sorted) {
    const key = dateKey(e.at);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: dayLabel(toMs(e.at), now), events: [] };
      groups.push(g);
    }
    g.events.push(e);
  }
  return groups;
}

export interface SecurityActivityFeedProps extends React.HTMLAttributes<HTMLDivElement> {
  events: SecurityEvent[];
  /** Group under day headings. Default true. */
  groupByDay?: boolean;
  /** Click handler; without it, rows expand inline to show details. */
  onEventClick?: (event: SecurityEvent) => void;
  now?: number;
  /** Shown when there are no events. Default "No activity yet". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
  /** Row spacing; `compact` is used inside drawers. */
  density?: Density;
  /** @deprecated Use `density="compact"`. */
  compact?: boolean;
}

/** Security event timeline: typed icons, device/IP/location, relative time, grouped by day, expandable detail. */
export const SecurityActivityFeed = React.forwardRef<HTMLDivElement, SecurityActivityFeedProps>(
  ({ events, groupByDay = true, onEventClick, now: nowProp, emptyState, empty, density: densityProp, compact: compactProp, className, ...props }, ref) => {
    const now = nowProp ?? Date.now();
    const compact = normalizeDensity(densityProp ?? compactProp) === "compact";
    const [open, setOpen] = React.useState<string | null>(null);
    const groups = groupByDay
      ? groupEventsByDay(events, now)
      : [{ key: "all", label: "", events: [...events].sort((a, b) => toMs(b.at) - toMs(a.at)) }];
    const headingBase = React.useId();

    if (events.length === 0) {
      return (
        <div ref={ref} data-slot="activity-feed" className={cn("py-6 text-center text-sm text-muted-foreground", className)} {...props}>
          {emptyState ?? empty ?? "No activity yet"}
        </div>
      );
    }

    return (
      <div ref={ref} data-slot="activity-feed" className={cn("flex flex-col gap-4", className)} {...props}>
        {groups.map((g, gi) => {
          const headingId = `${headingBase}-${gi}`;
          return (
            <section key={g.key} aria-labelledby={g.label ? headingId : undefined} data-day={g.key}>
              {g.label && (
                <h3 id={headingId} className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </h3>
              )}
              <ul className="flex flex-col">
                {g.events.map((e) => {
                  const meta = eventIcon[e.type] ?? { icon: RiShieldCheckLine, tone: "neutral" as Tone };
                  const risk = e.risk && e.risk !== "normal" ? normalizeTone(e.risk) : undefined;
                  const Icon = meta.icon;
                  const expanded = open === e.id;
                  const sub = [e.app, e.device, [e.location, e.ip].filter(Boolean).join(" · ")].filter(Boolean).join(" · ");
                  const detailItems: KeyValueItem[] = [
                    ...(e.app ? [{ key: "app", label: "App", value: e.app }] : []),
                    ...(e.device ? [{ key: "device", label: "Device", value: e.device }] : []),
                    ...(e.ip ? [{ key: "ip", label: "IP address", value: e.ip, mono: true, copyable: true }] : []),
                    ...(e.location ? [{ key: "loc", label: "Location", value: e.location }] : []),
                    { key: "time", label: "Time", value: toValidDate(toMs(e.at))?.toLocaleString() ?? "—" },
                    ...(e.details ?? []),
                  ];
                  return (
                    <li key={e.id} data-event={e.id} data-type={e.type}>
                      <button
                        type="button"
                        aria-expanded={onEventClick ? undefined : expanded}
                        onClick={() => (onEventClick ? onEventClick(e) : setOpen(expanded ? null : e.id))}
                        className={cn(
                          "-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-md px-2 text-left transition-colors hover:bg-accent",
                          compact ? "py-1.5" : "py-2.5",
                          risk === "destructive" && "bg-destructive-soft/40",
                          risk === "warning" && "bg-warning-soft/40",
                          focusRing
                        )}
                      >
                        <span className={cn("mt-0.5 flex shrink-0 items-center justify-center rounded-full", compact ? "size-6 [&_svg]:size-3.5" : "size-8 [&_svg]:size-4", toneClasses.soft[meta.tone])}>
                          <Icon aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-foreground">{e.description}</span>
                          {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
                        </span>
                        <time dateTime={safeISO(toMs(e.at))} className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-muted-foreground">
                          {Number.isFinite(toMs(e.at)) ? formatRelativeDate(e.at, now) : "—"}
                        </time>
                        {!onEventClick && (
                          <RiArrowDownSLine aria-hidden className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                        )}
                      </button>
                      {expanded && !onEventClick && (
                        <div className="mb-2 ml-11 rounded-md border border-border bg-subtle px-3 animate-in fade-in-0 slide-in-from-top-1">
                          <KeyValueList items={detailItems} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }
);
SecurityActivityFeed.displayName = "SecurityActivityFeed";

/** @deprecated Use `SecurityActivityFeed`. */
export const ActivityFeed = SecurityActivityFeed;
/** @deprecated Use `SecurityActivityFeedProps`. */
export type ActivityFeedProps = SecurityActivityFeedProps;

/* ------------------------------------------------------------------ */
/* ConnectedAppRow / ConnectedAppList                                  */
/* ------------------------------------------------------------------ */

export interface ConnectedAppDevice {
  id: string;
  name: string;
  push: boolean;
}

export interface ConnectedApp {
  id: string;
  name: string;
  kind?: "app" | "agent";
  domain?: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  scopes: ScopeInput[];
  connectedAt?: DateInput;
  lastActiveAt?: DateInput;
  expiresAt?: DateInput | null;
  /** Holder key fingerprint (agents). */
  holderKey?: string;
  devices?: ConnectedAppDevice[];
  activity?: SecurityEvent[];
}

export interface ConnectedAppRowProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  app: ConnectedApp;
  onOpen?: (app: ConnectedApp) => void;
  now?: number;
}

function expiryText(expiresAt: DateInput | null | undefined, now: number) {
  if (expiresAt == null) return undefined;
  const t = toMs(expiresAt);
  return t <= now ? "Expired" : `Expires ${formatRelativeDate(t, now)}`;
}

/** One connected app/agent: icon, granted scope count, last activity and expiry. */
export const ConnectedAppRow = React.forwardRef<HTMLButtonElement, ConnectedAppRowProps>(
  ({ app, onOpen, now: nowProp, className, ...props }, ref) => {
    const now = nowProp ?? Date.now();
    const expired = app.expiresAt != null && toMs(app.expiresAt) <= now;
    const meta = [
      `${app.scopes.length} ${pluralize(app.scopes.length, "permission")}`,
      app.lastActiveAt != null ? `Active ${formatRelativeDate(app.lastActiveAt, now)}` : undefined,
      expiryText(app.expiresAt, now),
    ].filter(Boolean);
    return (
      <button
        ref={ref}
        type="button"
        data-slot="connected-app-row"
        data-app={app.id}
        onClick={() => onOpen?.(app)}
        className={cn("flex w-full items-center gap-3 rounded-box px-3 py-3 text-left transition-colors hover:bg-accent", focusRing, className)}
        {...props}
      >
        {app.icon ?? <Favicon domain={app.domain ?? app.name} shape="square" className="size-9 rounded-md" />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{app.name}</span>
            {app.kind === "agent" && (
              <Badge size="sm" color="purple" leadingIcon={<RiRobot2Line aria-hidden />}>
                Agent
              </Badge>
            )}
            {expired && (
              <Badge size="sm" color="warning">
                Expired
              </Badge>
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{meta.join(" · ")}</span>
        </span>
        <RiArrowRightSLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }
);
ConnectedAppRow.displayName = "ConnectedAppRow";

export interface ConnectedAppListProps extends React.HTMLAttributes<HTMLDivElement> {
  apps: ConnectedApp[];
  /** May return a promise; the confirm dialog waits for it. */
  onRevoke?: (app: ConnectedApp) => void | Promise<void>;
  onPushChange?: (app: ConnectedApp, deviceId: string, enabled: boolean) => void;
  definitions?: Record<string, ScopeDefinition>;
  now?: number;
  /** Shown when there are no apps. Default "No connected apps". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

/** Connected apps and agents with a detail drawer (scopes, holder key, push per device, activity) and revoke. */
export const ConnectedAppList = React.forwardRef<HTMLDivElement, ConnectedAppListProps>(
  ({ apps, onRevoke, onPushChange, definitions, now: nowProp, emptyState, empty, className, ...props }, ref) => {
    const now = nowProp ?? Date.now();
    const [openId, setOpenId] = React.useState<string | null>(null);
    const [confirming, setConfirming] = React.useState(false);
    const app = apps.find((a) => a.id === openId) ?? null;
    const lastApp = React.useRef<ConnectedApp | null>(null);
    if (app) lastApp.current = app;
    const shown = app ?? lastApp.current;

    const info: KeyValueItem[] = shown
      ? [
          ...(shown.domain ? [{ key: "domain", label: "Domain", value: shown.domain, mono: true }] : []),
          ...(shown.connectedAt != null ? [{ key: "connected", label: "Connected", value: formatRelativeDate(shown.connectedAt, now) }] : []),
          ...(shown.lastActiveAt != null ? [{ key: "active", label: "Last active", value: formatRelativeDate(shown.lastActiveAt, now) }] : []),
          { key: "expires", label: "Expires", value: shown.expiresAt != null ? expiryText(shown.expiresAt, now)!.replace(/^Expires /, "") : "Never" },
          ...(shown.holderKey
            ? [
                {
                  key: "holder",
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <RiFingerprintLine aria-hidden className="size-3.5" />
                      Holder key
                    </span>
                  ),
                  value: shown.holderKey,
                  mono: true,
                  copyable: shown.holderKey,
                },
              ]
            : []),
        ]
      : [];

    return (
      <div ref={ref} data-slot="connected-app-list" className={cn("flex flex-col", className)} {...props}>
        {apps.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyState ?? empty ?? "No connected apps"}</p>
        ) : (
          <ul className="flex flex-col">
            {apps.map((a) => (
              <li key={a.id}>
                <ConnectedAppRow app={a} now={now} onOpen={(x) => setOpenId(x.id)} />
              </li>
            ))}
          </ul>
        )}
        <Drawer open={!!app} onOpenChange={(o) => !o && setOpenId(null)}>
          {shown && (
            <DrawerContent aria-describedby={undefined}>
              <DrawerHeader className="flex flex-row items-center gap-3 text-left">
                {shown.icon ?? <Favicon domain={shown.domain ?? shown.name} shape="square" className="size-10 rounded-lg" />}
                <div className="min-w-0">
                  <DrawerTitle className="truncate">{shown.name}</DrawerTitle>
                  <DrawerDescription className="truncate">
                    {shown.description ?? (shown.kind === "agent" ? "AI agent with a scoped capability" : "Connected app")}
                  </DrawerDescription>
                </div>
              </DrawerHeader>
              <DrawerBody className="grid gap-6">
                <section className="grid gap-1">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capability scope</h3>
                  <ScopeList scopes={shown.scopes} definitions={definitions} showRisk aria-label={`${shown.name} permissions`} />
                </section>
                <KeyValueList items={info} />
                {shown.devices && shown.devices.length > 0 && (
                  <section className="grid gap-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Push notifications</h3>
                    <ul className="flex flex-col divide-y divide-border rounded-box border border-border">
                      {shown.devices.map((d) => {
                        const lid = `push-${shown.id}-${d.id}`.replace(/[^a-z0-9_-]/gi, "_");
                        return (
                          <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                            <RiDeviceLine aria-hidden className="size-4 text-muted-foreground" />
                            <span id={lid} className="flex-1 text-sm">
                              {d.name}
                            </span>
                            <Switch size="sm" checked={d.push} aria-labelledby={lid} onCheckedChange={(v) => onPushChange?.(shown, d.id, v)} />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
                {shown.activity && shown.activity.length > 0 && (
                  <section className="grid gap-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent activity</h3>
                    <SecurityActivityFeed events={shown.activity.slice(0, 6)} groupByDay={false} density="compact" now={now} />
                  </section>
                )}
              </DrawerBody>
              {onRevoke && (
                <DrawerFooter>
                  <Button variant="destructive-soft" fullWidth onClick={() => setConfirming(true)}>
                    Revoke access
                  </Button>
                </DrawerFooter>
              )}
            </DrawerContent>
          )}
        </Drawer>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          tone="destructive"
          title={`Revoke ${shown?.name ?? "this app"}?`}
          description={
            shown?.kind === "agent"
              ? "The agent's capability stops working immediately. It will need a new approval."
              : "The app loses access immediately. You can reconnect later."
          }
          confirmLabel="Revoke"
          onConfirm={async () => {
            if (shown) await onRevoke?.(shown);
            setOpenId(null);
          }}
        />
      </div>
    );
  }
);
ConnectedAppList.displayName = "ConnectedAppList";
