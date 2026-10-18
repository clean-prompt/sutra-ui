import * as React from "react";
import {
  RiBankCardLine,
  RiCalendarLine,
  RiChat3Line,
  RiCheckboxCircleFill,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeLine,
  RiKey2Line,
  RiLock2Line,
  RiLoginBoxLine,
  RiMailLine,
  RiMapPinLine,
  RiRefreshLine,
  RiRobot2Line,
  RiSettings3Line,
  RiShieldCheckLine,
  RiShieldLine,
  RiSparkling2Line,
  RiTimeLine,
  RiUserLine,
  RiVerifiedBadgeFill,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { formatCountdown } from "../../lib/duration";
import { capitalize } from "../../lib/text";
import { useCountdown } from "../../hooks/use-now";
import { useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Checkbox, CheckboxField } from "../../primitives/checkbox";
import { Favicon } from "../../primitives/favicon";
import { RadioGroup, RadioCard } from "../../primitives/radio";
import { SimpleSelect } from "../../primitives/select";
import { Switch } from "../../primitives/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../primitives/table";

/* ------------------------------------------------------------------ */
/* formatScope                                                         */
/* ------------------------------------------------------------------ */

export type ScopeRisk = "low" | "medium" | "high";
type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: React.AriaAttributes["aria-hidden"] }>;

/** A scope string ("read:orders") or an object with constraints ({ id: "pay", max: "50USD" }). */
export type ScopeInput = string | ({ id: string } & Record<string, string | number | boolean | undefined>);

export interface ScopeDefinition {
  /** Label, or a function receiving the resource part ("orders" for "read:orders"). */
  label: string | ((resource?: string) => string);
  description?: string | ((resource?: string) => string);
  icon?: IconComponent;
  risk?: ScopeRisk;
  /** Always granted; can't be toggled off (e.g. `login`). */
  locked?: boolean;
}

export interface FormattedScope {
  id: string;
  action: string;
  resource?: string;
  label: string;
  description?: string;
  /** Constraint prose, e.g. "up to $50 · 3 uses". */
  constraints: string;
  icon: IconComponent;
  risk: ScopeRisk;
  locked: boolean;
}

const humanize = (s?: string) => (s ?? "").replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Built-in scope vocabulary. Keys are exact ids ("login") or action wildcards ("read:*").
 * Extend by passing `definitions` to `formatScope` / the scope components.
 */
export const defaultScopeDefinitions: Record<string, ScopeDefinition> = {
  login: { label: "Sign in as you", description: "Always included", icon: RiLoginBoxLine, risk: "low", locked: true },
  openid: { label: "Sign in as you", icon: RiLoginBoxLine, risk: "low", locked: true },
  profile: { label: "Your profile", description: "Name and avatar", icon: RiUserLine, risk: "low" },
  email: { label: "Your email address", icon: RiMailLine, risk: "low" },
  offline_access: {
    label: "Act without re-approval",
    description: "Keeps access until it expires",
    icon: RiRefreshLine,
    risk: "medium",
  },
  location: { label: "Your location", icon: RiMapPinLine, risk: "medium" },
  "read:*": { label: (r) => `View your ${humanize(r) || "data"}`, icon: RiEyeLine, risk: "low" },
  "write:*": { label: (r) => `Create and edit ${humanize(r) || "data"}`, icon: RiEditLine, risk: "medium" },
  "delete:*": { label: (r) => `Delete ${humanize(r) || "data"}`, icon: RiDeleteBinLine, risk: "high" },
  "admin:*": { label: (r) => `Manage ${humanize(r) || "everything"}`, icon: RiSettings3Line, risk: "high" },
  "manage:*": { label: (r) => `Manage ${humanize(r) || "settings"}`, icon: RiSettings3Line, risk: "high" },
  "pay:*": { label: (r) => (r ? `Make payments for ${humanize(r)}` : "Make payments"), icon: RiBankCardLine, risk: "high" },
  pay: { label: "Make payments on your behalf", icon: RiBankCardLine, risk: "high" },
  "send:*": { label: (r) => `Send ${humanize(r) || "messages"} as you`, icon: RiChat3Line, risk: "medium" },
  "calendar:*": { label: (r) => `${humanize(r) || "Use"} your calendar`, icon: RiCalendarLine, risk: "medium" },
  "agent:*": { label: (r) => `Run agent tasks${r ? `: ${humanize(r)}` : ""}`, icon: RiRobot2Line, risk: "medium" },
  "vc:*": { label: (r) => `Prove a verified credential${r ? ` (${humanize(r)})` : ""}`, icon: RiShieldCheckLine, risk: "medium" },
  "keys:*": { label: (r) => `Use API keys${r ? ` for ${humanize(r)}` : ""}`, icon: RiKey2Line, risk: "high" },
};

const CCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CAD: "CA$", AUD: "A$" };

function formatAmount(v: unknown) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([A-Za-z]{0,8})\s*$/.exec(String(v));
  if (!m) return String(v);
  const n = parseFloat(m[1]);
  const ccy = m[2].toUpperCase();
  if (!ccy) return `${n}`;
  return CCY_SYMBOL[ccy] ? `${CCY_SYMBOL[ccy]}${n}` : `${n} ${ccy}`;
}

/** One scope constraint → prose ("max", "50USD" → "up to $50"). */
export function formatScopeConstraint(key: string, value: unknown) {
  switch (key) {
    case "max":
      return `up to ${formatAmount(value)}`;
    case "resource":
      return `resource ${value}`;
    case "maxUses": {
      const n = Number(value);
      return Number.isFinite(n) ? `${n} ${pluralize(n, "use")}` : `max uses ${value}`;
    }
    case "rateBudget":
      return `rate ${value}`;
    default:
      return `${key} ${value}`;
  }
}

export interface FormatScopeOptions {
  /** Extra or overriding definitions merged over `defaultScopeDefinitions`. */
  definitions?: Record<string, ScopeDefinition>;
  /** Untrusted, app-supplied labels by scope id (used only when no definition matches). */
  labels?: Record<string, string>;
}

/** Own-property lookup, so ids like "constructor" or "__proto__" don't hit Object.prototype. */
function own<T>(record: Record<string, T> | undefined, key: string): T | undefined {
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** Scope id from a string or object scope. */
export function scopeIdOf(scope: ScopeInput) {
  return typeof scope === "string" ? scope : scope.id;
}

/** Turn a scope string/object into a human label, icon, risk level and constraint prose. */
export function formatScope(scope: ScopeInput, options: FormatScopeOptions = {}): FormattedScope {
  const id = scopeIdOf(scope);
  const defs = options.definitions ? { ...defaultScopeDefinitions, ...options.definitions } : defaultScopeDefinitions;
  const sep = id.indexOf(":");
  const action = sep >= 0 ? id.slice(0, sep) : id;
  const resource = sep >= 0 ? id.slice(sep + 1) : undefined;
  const def = own(defs, id) ?? (sep >= 0 ? own(defs, `${action}:*`) : undefined);
  const constraints =
    typeof scope === "object"
      ? Object.entries(scope)
          .filter(([k, v]) => k !== "id" && v !== undefined)
          .map(([k, v]) => formatScopeConstraint(k, v))
          .join(" · ")
      : "";
  const pick = (v: ScopeDefinition["label"] | undefined) => (typeof v === "function" ? v(resource) : v);
  const custom = own(options.labels, id);
  const fallback = (typeof custom === "string" ? custom : undefined) ?? (humanize(resource ? `${action} ${resource}` : id) || id);
  const label = pick(def?.label) ?? fallback;
  return {
    id,
    action,
    resource,
    label: capitalize(label),
    description: pick(def?.description),
    constraints,
    icon: def?.icon ?? RiShieldLine,
    risk: def?.risk ?? "medium",
    locked: def?.locked ?? false,
  };
}

const riskTile: Record<ScopeRisk, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning-soft text-warning-soft-foreground",
  high: "bg-destructive-soft text-destructive-soft-foreground",
};
const riskBadge: Record<ScopeRisk, BadgeColor> = { low: "neutral", medium: "warning", high: "destructive" };
const riskLabel: Record<ScopeRisk, string> = { low: "Low risk", medium: "Medium risk", high: "High risk" };

/* ------------------------------------------------------------------ */
/* ScopeList                                                           */
/* ------------------------------------------------------------------ */

export interface ScopeListProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "defaultValue"> {
  scopes: ScopeInput[];
  /** Ids the user may toggle. Others are required (always granted). */
  optional?: string[];
  /** Granted optional scope ids (controlled). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Ids already granted earlier; shown with an "Already granted" tag. */
  held?: string[];
  definitions?: Record<string, ScopeDefinition>;
  labels?: Record<string, string>;
  /** Show the risk badge on medium/high scopes. Default true. */
  showRisk?: boolean;
  /** Show the raw scope id under each label. Default true. */
  showId?: boolean;
  disabled?: boolean;
}

/** Requested permissions as readable rows with icons, risk and optional toggles. */
export const ScopeList = React.forwardRef<HTMLUListElement, ScopeListProps>(
  (
    {
      scopes,
      optional = [],
      value,
      defaultValue = [],
      onValueChange,
      held = [],
      definitions,
      labels,
      showRisk = true,
      showId = true,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [granted, setGranted] = useControllableState({ value, defaultValue, onChange: onValueChange });
    const baseId = React.useId();
    return (
      <ul ref={ref} data-slot="scope-list" className={cn("flex flex-col divide-y divide-border", className)} {...props}>
        {scopes.map((scope, index) => {
          const f = formatScope(scope, { definitions, labels });
          const Icon = f.icon;
          const isOptional = !f.locked && optional.includes(f.id);
          const on = isOptional ? granted.includes(f.id) : true;
          const labelId = `${baseId}-scope-${index}`;
          return (
            <li key={f.id} data-scope={f.id} data-risk={f.risk} className="flex items-center gap-3 py-3">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", riskTile[f.risk])}>
                <Icon aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span id={labelId} className="text-sm font-medium text-foreground">
                    {f.label}
                  </span>
                  {showRisk && f.risk !== "low" && (
                    <Badge size="sm" color={riskBadge[f.risk]}>
                      {riskLabel[f.risk]}
                    </Badge>
                  )}
                  {held.includes(f.id) && (
                    <Badge size="sm" color="success">
                      Already granted
                    </Badge>
                  )}
                </div>
                {(f.description || f.constraints || showId) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {[f.description, f.constraints].filter(Boolean).join(" · ")}
                    {showId && (
                      <span className={cn("font-mono", (f.description || f.constraints) && "ml-1.5 opacity-70")}>{f.id}</span>
                    )}
                  </p>
                )}
              </div>
              {isOptional ? (
                <Switch
                  size="sm"
                  checked={on}
                  disabled={disabled}
                  aria-labelledby={labelId}
                  onCheckedChange={(next) =>
                    setGranted(next ? [...granted.filter((g) => g !== f.id), f.id] : granted.filter((g) => g !== f.id))
                  }
                />
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <RiLock2Line aria-hidden className="size-3.5" />
                  {f.locked ? "Included" : "Required"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
);
ScopeList.displayName = "ScopeList";

/* ------------------------------------------------------------------ */
/* ConsentScreen                                                       */
/* ------------------------------------------------------------------ */

export interface ConsentApp {
  name: string;
  /** The verified origin, shown as the headline. */
  domain: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  /** The domain was verified (e.g. callback bound to it). */
  verified?: boolean;
  /** First time this app connects. */
  firstTime?: boolean;
  description?: React.ReactNode;
}

export interface ConsentCredentialOption {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

export interface ConsentProfile {
  name: string;
  avatar?: React.ReactNode;
  detail?: React.ReactNode;
}

export interface ConsentSelection {
  /** Every granted scope id (required + opted-in optional). */
  scopes: string[];
  shareProfile: boolean;
  credentialId?: string;
}

export interface ConsentScreenProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  app: ConsentApp;
  scopes: ScopeInput[];
  /** Scope ids the user may decline. Default-deny: none are pre-granted unless in `defaultOptionalGranted`. */
  optionalScopes?: string[];
  defaultOptionalGranted?: string[];
  heldScopes?: string[];
  definitions?: Record<string, ScopeDefinition>;
  scopeLabels?: Record<string, string>;
  /** Offer to share this profile (off by default). */
  profile?: ConsentProfile;
  defaultShareProfile?: boolean;
  /** Credentials the user can present (radio list; none preselected). */
  credentials?: ConsentCredentialOption[];
  /** Require a credential choice before Approve. Default true when credentials are given. */
  credentialRequired?: boolean;
  credentialLabel?: React.ReactNode;
  /** When the request expires (ms or Date). */
  expiresAt?: number | Date;
  onExpire?: () => void;
  title?: React.ReactNode;
  approveLabel?: React.ReactNode;
  denyLabel?: React.ReactNode;
  /** May return a promise; buttons show progress until it settles. */
  onApprove?: (selection: ConsentSelection) => void | Promise<void>;
  onDeny?: () => void | Promise<void>;
}

/** Authorization/approval screen: who is asking, what they want, and an expiring Approve. */
export const ConsentScreen = React.forwardRef<HTMLDivElement, ConsentScreenProps>(
  (
    {
      app,
      scopes,
      optionalScopes = [],
      defaultOptionalGranted = [],
      heldScopes,
      definitions,
      scopeLabels,
      profile,
      defaultShareProfile = false,
      credentials,
      credentialRequired,
      credentialLabel = "Choose a credential to present",
      expiresAt,
      onExpire,
      title,
      approveLabel = "Approve",
      denyLabel = "Deny",
      onApprove,
      onDeny,
      className,
      ...props
    },
    ref
  ) => {
    const [granted, setGranted] = React.useState<string[]>(defaultOptionalGranted);
    const [shareProfile, setShareProfile] = React.useState(defaultShareProfile);
    const [credentialId, setCredentialId] = React.useState<string>("");
    const [busyKind, setBusyKind] = React.useState<"approve" | "deny" | null>(null);
    const countdown = useCountdown(expiresAt, { onExpire });
    const left = expiresAt == null ? undefined : Math.ceil(countdown.remainingMs / 1000);
    const expired = countdown.expired;
    const titleId = React.useId();

    const needsCredential = !!credentials?.length && (credentialRequired ?? true);

    const action = useAsyncAction(async (kind: "approve" | "deny") => {
      if (kind === "approve") {
        const ids = scopes
          .map((s) => formatScope(s, { definitions }))
          .filter((f) => f.locked || !optionalScopes.includes(f.id) || granted.includes(f.id))
          .map((f) => f.id);
        await onApprove?.({ scopes: ids, shareProfile: !!profile && shareProfile, credentialId: credentialId || undefined });
      } else {
        await onDeny?.();
      }
    });
    const busy = action.busy ? busyKind : null;
    const run = (kind: "approve" | "deny") => {
      setBusyKind(kind);
      void action.run(kind);
    };
    const canApprove = !expired && !busy && (!needsCredential || !!credentialId);

    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        data-slot="consent-screen"
        data-expired={expired || undefined}
        className={cn("flex w-full max-w-md flex-col gap-5 rounded-box border border-border bg-card p-6 text-card-foreground shadow-sm", className)}
        {...props}
      >
        <div className="flex items-center gap-3.5">
          {app.icon ?? <Favicon domain={app.domain} src={app.iconUrl} shape="square" className="size-12 rounded-xl" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-mono text-base font-semibold text-foreground">{app.domain}</p>
              {app.verified ? (
                <Badge size="sm" color="success" leadingIcon={<RiVerifiedBadgeFill aria-hidden />}>
                  Verified
                </Badge>
              ) : (
                <Badge size="sm" color="warning">
                  Unverified
                </Badge>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              <span className="opacity-80">claims to be</span> {app.name}
            </p>
          </div>
        </div>

        <div className="grid gap-1">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
            {title ?? (
              <>
                <span className="font-mono">{app.name}</span> wants access to your account
              </>
            )}
          </h2>
          {app.description && <p className="text-sm text-muted-foreground">{app.description}</p>}
          {app.firstTime && (
            <p className="flex items-center gap-1.5 text-xs text-info">
              <RiSparkling2Line aria-hidden className="size-3.5" />
              First time connecting to this app
            </p>
          )}
        </div>

        <div className="rounded-box border border-border px-3">
          <ScopeList
            scopes={scopes}
            optional={optionalScopes}
            value={granted}
            onValueChange={setGranted}
            held={heldScopes}
            definitions={definitions}
            labels={scopeLabels}
            disabled={expired}
            aria-label="Requested permissions"
          />
        </div>

        {profile && (
          <div className="flex items-center gap-3 rounded-box border border-border p-3">
            {profile.avatar ?? (
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <RiUserLine aria-hidden className="size-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p id={`${titleId}-profile`} className="text-sm font-medium text-foreground">
                Share your profile
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {shareProfile ? profile.name : "The app sees a private pseudonym"}
                {shareProfile && profile.detail ? <> · {profile.detail}</> : null}
              </p>
            </div>
            <Switch
              size="sm"
              checked={shareProfile}
              onCheckedChange={setShareProfile}
              disabled={expired}
              aria-labelledby={`${titleId}-profile`}
            />
          </div>
        )}

        {credentials && credentials.length > 0 && (
          <div className="grid gap-2">
            <p id={`${titleId}-cred`} className="text-sm font-medium text-foreground">
              {credentialLabel}
            </p>
            <RadioGroup
              value={credentialId}
              onValueChange={setCredentialId}
              aria-labelledby={`${titleId}-cred`}
              disabled={expired}
              className="gap-2"
            >
              {credentials.map((c) => (
                <RadioCard key={c.id} value={c.id} label={c.title} description={c.description} icon={c.icon} className="p-3" />
              ))}
            </RadioGroup>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {left !== undefined && (
            <p
              role="timer"
              aria-live={expired ? "assertive" : "off"}
              className={cn(
                "flex items-center gap-1.5 text-xs tabular-nums",
                expired ? "font-medium text-destructive" : left <= 10 ? "text-warning-soft-foreground" : "text-muted-foreground"
              )}
            >
              <RiTimeLine aria-hidden className="size-3.5" />
              {expired ? "Request expired" : `Expires in ${formatCountdown(countdown.remainingMs)}`}
            </p>
          )}
          {needsCredential && !credentialId && !expired && (
            <p className="text-xs text-muted-foreground">Select a credential to continue.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => run("deny")} loading={busy === "deny"} disabled={!!busy}>
              {denyLabel}
            </Button>
            <Button onClick={() => run("approve")} loading={busy === "approve"} disabled={!canApprove}>
              {approveLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);
ConsentScreen.displayName = "ConsentScreen";

/* ------------------------------------------------------------------ */
/* ScopeMatrix                                                         */
/* ------------------------------------------------------------------ */

export interface ScopeMatrixApp {
  id: string;
  name: string;
  domain?: string;
  icon?: React.ReactNode;
  /** Scopes this app can request; other cells are disabled. Omit for all. */
  available?: string[];
}

export interface ScopeMatrixTTLOption {
  label: string;
  /** Seconds. */
  value: number;
}

export const defaultScopeTTLOptions: ScopeMatrixTTLOption[] = [
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
];

export interface ScopeMatrixProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  apps: ScopeMatrixApp[];
  /** Column scope ids. */
  scopes: string[];
  /** Granted scope ids per app id. */
  value?: Record<string, string[]>;
  defaultValue?: Record<string, string[]>;
  onValueChange?: (value: Record<string, string[]>) => void;
  /** Scopes each app already holds; pre-ticked and tagged. */
  held?: Record<string, string[]>;
  ttlOptions?: ScopeMatrixTTLOption[];
  /** TTL seconds per app id. */
  ttl?: Record<string, number>;
  defaultTtl?: Record<string, number>;
  onTtlChange?: (ttl: Record<string, number>) => void;
  /** Show the "Replace prior grant" option (defaults to on when any app holds scopes). */
  showReplacePrior?: boolean;
  replacePrior?: boolean;
  defaultReplacePrior?: boolean;
  onReplacePriorChange?: (replace: boolean) => void;
  definitions?: Record<string, ScopeDefinition>;
}

/** Apps × scopes grant grid with a TTL per row and a "replace prior grant" option. */
export const ScopeMatrix = React.forwardRef<HTMLDivElement, ScopeMatrixProps>(
  (
    {
      apps,
      scopes,
      value,
      defaultValue,
      onValueChange,
      held = {},
      ttlOptions = defaultScopeTTLOptions,
      ttl,
      defaultTtl,
      onTtlChange,
      showReplacePrior,
      replacePrior,
      defaultReplacePrior = false,
      onReplacePriorChange,
      definitions,
      className,
      ...props
    },
    ref
  ) => {
    const formatted = React.useMemo(() => scopes.map((s) => formatScope(s, { definitions })), [scopes, definitions]);
    const [grants, setGrants] = useControllableState<Record<string, string[]>>({
      value,
      defaultValue: defaultValue ?? Object.fromEntries(apps.map((a) => [a.id, [...(held[a.id] ?? [])]])),
      onChange: onValueChange,
    });
    const [ttls, setTtls] = useControllableState<Record<string, number>>({
      value: ttl,
      defaultValue: defaultTtl ?? Object.fromEntries(apps.map((a) => [a.id, ttlOptions[0]?.value ?? 3600])),
      onChange: onTtlChange,
    });
    const [replace, setReplace] = useControllableState({
      value: replacePrior,
      defaultValue: defaultReplacePrior,
      onChange: onReplacePriorChange,
    });
    const anyHeld = Object.values(held).some((h) => h.length > 0);

    const toggle = (appId: string, scopeId: string, on: boolean) => {
      const current = grants[appId] ?? [];
      setGrants({ ...grants, [appId]: on ? [...current.filter((s) => s !== scopeId), scopeId] : current.filter((s) => s !== scopeId) });
    };

    return (
      <div ref={ref} data-slot="scope-matrix" className={cn("flex flex-col gap-3", className)} {...props}>
        <Table density="compact">
          <TableHeader>
            <TableRow>
              <TableHead>App</TableHead>
              {formatted.map((f) => {
                const Icon = f.icon;
                return (
                  <TableHead key={f.id} className="text-center" title={f.id}>
                    <span className="inline-flex flex-col items-center gap-0.5">
                      <Icon aria-hidden className="size-3.5" />
                      <span className="whitespace-nowrap text-2xs">{f.label}</span>
                    </span>
                  </TableHead>
                );
              })}
              <TableHead>Expires after</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.id} data-app={app.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    {app.icon ?? <Favicon domain={app.domain ?? app.name} shape="square" className="size-5 rounded" />}
                    <span className="truncate font-medium">{app.name}</span>
                  </span>
                </TableCell>
                {formatted.map((f) => {
                  const available = !app.available || app.available.includes(f.id);
                  const isHeld = held[app.id]?.includes(f.id);
                  const checked = f.locked ? available : (grants[app.id] ?? []).includes(f.id);
                  return (
                    <TableCell key={f.id} className="text-center">
                      {available ? (
                        <span className="relative inline-flex items-center justify-center">
                          <Checkbox
                            size="sm"
                            checked={checked}
                            disabled={f.locked}
                            aria-label={`${app.name}: ${f.label}${isHeld ? " (already granted)" : ""}`}
                            onCheckedChange={(v) => toggle(app.id, f.id, v === true)}
                          />
                          {isHeld && <span aria-hidden className="absolute -right-1.5 -top-1 size-1.5 rounded-full bg-success" />}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          <span aria-hidden>—</span>
                          <span className="sr-only">Not available</span>
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell>
                  <SimpleSelect
                    size="sm"
                    aria-label={`${app.name} expiry`}
                    value={String(ttls[app.id] ?? ttlOptions[0]?.value)}
                    onValueChange={(v) => setTtls({ ...ttls, [app.id]: Number(v) })}
                    options={ttlOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                    className="w-28"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(showReplacePrior ?? anyHeld) && (
          <CheckboxField
            label="Replace prior grant"
            description="Revoke the access each app holds now and issue one new grant with these scopes."
            checked={replace}
            onCheckedChange={(v) => setReplace(v === true)}
          />
        )}
        {anyHeld && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RiCheckboxCircleFill aria-hidden className="size-3.5 text-success" />
            Green dot: already granted
          </p>
        )}
      </div>
    );
  }
);
ScopeMatrix.displayName = "ScopeMatrix";

export interface ScopeIconProps {
  scope: ScopeInput;
  className?: string;
  definitions?: Record<string, ScopeDefinition>;
}

/** Icon for a scope as a ready-to-render node. */
export const ScopeIcon = React.forwardRef<SVGSVGElement, ScopeIconProps>(({ scope, className, definitions }, ref) => {
  const Icon = formatScope(scope, { definitions }).icon as React.ComponentType<
    React.ComponentProps<IconComponent> & { ref?: React.Ref<SVGSVGElement> }
  >;
  return <Icon ref={ref} aria-hidden className={cn("size-4", className)} />;
});
ScopeIcon.displayName = "ScopeIcon";
