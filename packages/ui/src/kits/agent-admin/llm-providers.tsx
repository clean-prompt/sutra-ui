import * as React from "react";
import {
  RiAddLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiKey2Line,
  RiLinkM,
  RiPlugLine,
  RiRefreshLine,
  RiServerLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatCountdown, formatDuration } from "../../lib/duration";
import { pluralize } from "../../lib/format";
import { clamp } from "../../lib/math";
import { capitalize } from "../../lib/text";
import { DAY_MS, HOUR_MS, toMs, type TimeInput } from "../../lib/time";
import { isHttpUrl, isSafeHref } from "../../lib/validate";
import { toneClasses, type Tone } from "../../lib/tone";
import { errorMessage, useAsyncAction, useMountedRef } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useCountdown } from "../../hooks/use-now";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { CopyButton } from "../../primitives/copy-button";
import { Monogram, monogramInitials } from "../../primitives/monogram";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { StatusBadge, type StatusBadgeStatus } from "../../primitives/status-badge";
import { meterLevel, type MeterThresholds, type MeterLevel } from "../../primitives/meter";
import { SimpleTooltip } from "../../primitives/tooltip";
import { formatResetCaption } from "../ai/agent-usage";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../primitives/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { Input, PasswordInput } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { SimpleSelect } from "../../primitives/select";
import { SecretField } from "../identity/secret";
import { SecretRow } from "./secret-row";
import { Spinner } from "../../primitives/spinner";
import { InlineAlert } from "../../primitives/inline-alert";

/* ------------------------------------------------------------------ */
/* Shared types + helpers                                              */
/* ------------------------------------------------------------------ */

type TimeValue = TimeInput;

export type ProviderAuthMethod = "oauth" | "api-key" | "local" | "custom";
export type ProviderStatus = "connected" | "expired" | "error" | "not-configured";

export const providerAuthLabels: Record<ProviderAuthMethod, string> = {
  oauth: "OAuth",
  "api-key": "API key",
  local: "Local",
  custom: "Custom endpoint",
};

export const providerStatusLabels: Record<ProviderStatus, string> = {
  connected: "Connected",
  expired: "Expired",
  error: "Error",
  "not-configured": "Not configured",
};

const statusBadge: Record<ProviderStatus, StatusBadgeStatus> = {
  connected: "success",
  expired: "warning",
  error: "error",
  "not-configured": "inactive",
};

const authIcon: Record<ProviderAuthMethod, React.ComponentType<{ className?: string; "aria-hidden"?: React.AriaAttributes["aria-hidden"] }>> = {
  oauth: RiShieldKeyholeLine,
  "api-key": RiKey2Line,
  local: RiServerLine,
  custom: RiLinkM,
};

/** Short duration such as `12d`, `3h`, `25m`, `40s`. */
function shortDuration(ms: number) {
  return formatDuration(ms, { units: 1, maxUnit: ms < 48 * HOUR_MS ? "h" : "d" });
}

/** "expires in 12d", "expired 3h ago", or "" when there is no expiry. */
export function formatTokenExpiry(expiresAt: TimeValue | undefined, now: number = Date.now()) {
  const t = toMs(expiresAt);
  if (t == null) return "";
  const diff = t - now;
  return diff > 0 ? `expires in ${shortDuration(diff)}` : `expired ${shortDuration(-diff)} ago`;
}

/** Up to two monogram letters for a provider name: "Nimbus AI" → "NA". Same as `monogramInitials`. */
export function providerMonogram(name: string) {
  return monogramInitials(name);
}

/* ------------------------------------------------------------------ */
/* ProviderLogo                                                        */
/* ------------------------------------------------------------------ */

export interface ProviderLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Provider name; used for the accessible name and, without `monogram`, to derive the letter. */
  name: string;
  /** Override the generated monogram (1–2 characters). */
  monogram?: string;
  /** Tile color; defaults to a stable color derived from the name. */
  color?: string;
  /** Tile size: `sm`, `md` or `lg`. */
  size?: "sm" | "md" | "lg";
}

/** Local monogram tile for a provider (never fetches a remote logo). A `Monogram` preset (solid seed colour). */
export const ProviderLogo = React.forwardRef<HTMLSpanElement, ProviderLogoProps>(
  ({ name, monogram, color, size = "md", ...props }, ref) => (
    <Monogram ref={ref} data-slot="provider-logo" name={name} letters={monogram} color={color} size={size} variant="solid" {...props} />
  )
);
ProviderLogo.displayName = "ProviderLogo";

/* ------------------------------------------------------------------ */
/* ProviderQuotaChip                                                   */
/* ------------------------------------------------------------------ */

export interface ProviderQuotaChipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Percent of the quota already used, 0–100. */
  used: number;
  /** When the quota window resets (timestamp or date); drives the "Resets in 3h" text. */
  resetsAt?: TimeValue;
  /** Overrides the computed "Resets in 3h" text. */
  resetLabel?: string;
  /** Used-percent thresholds for warning / danger. Default 75 / 90. */
  thresholds?: MeterThresholds;
  /** Name of the quota window, e.g. "Weekly". */
  label?: string;
  /** Reference time for the reset text; set it in tests and SSR for stable output. */
  now?: number;
}

const quotaTone: Record<MeterLevel, Tone> = { ok: "success", warn: "warning", danger: "destructive" };
const quotaFill = (level: MeterLevel) => toneClasses.dot[quotaTone[level]];
const quotaText = (level: MeterLevel) => (level === "ok" ? "text-foreground" : toneClasses.text[quotaTone[level]]);

/** Compact remaining-quota bar with threshold colors and a reset-time tooltip. */
export const ProviderQuotaChip = React.forwardRef<HTMLSpanElement, ProviderQuotaChipProps>(
  ({ used, resetsAt, resetLabel, thresholds = { warn: 75, danger: 90 }, label = "Quota", now, className, ...props }, ref) => {
    const pct = clamp(used, 0, 100);
    const remaining = Math.round(100 - pct);
    const level = meterLevel(pct, thresholds);
    const ms = toMs(resetsAt);
    const reset = resetLabel ?? (ms != null ? formatResetCaption(ms, now ?? Date.now()) : "");
    const valueText = `${remaining}% left${reset ? `, ${reset.charAt(0).toLowerCase()}${reset.slice(1)}` : ""}`;
    const chip = (
      <span
        ref={ref}
        role="meter"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={remaining}
        aria-valuetext={valueText}
        data-level={level}
        data-slot="provider-quota-chip"
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-control border border-border bg-background px-2 text-2xs font-medium shadow-xs",
          focusRing,
          className
        )}
        {...props}
      >
        <span aria-hidden className="relative h-1.5 w-10 overflow-hidden rounded-full bg-muted">
          <span className={cn("absolute inset-y-0 start-0 rounded-full", quotaFill(level))} style={{ width: `${remaining}%` }} />
        </span>
        <span className={cn("font-mono tabular-nums", quotaText(level))}>{remaining}%</span>
      </span>
    );
    return reset ? <SimpleTooltip content={`${label}: ${remaining}% left · ${reset}`}>{chip}</SimpleTooltip> : chip;
  }
);
ProviderQuotaChip.displayName = "ProviderQuotaChip";

/* ------------------------------------------------------------------ */
/* ProviderRow / ProviderList                                          */
/* ------------------------------------------------------------------ */

export interface ProviderEntry {
  id: string;
  name: string;
  monogram?: string;
  color?: string;
  auth: ProviderAuthMethod;
  status: ProviderStatus;
  description?: React.ReactNode;
  /** Signed-in account or key hint, e.g. "you@example.com" or "sk-…a91f". */
  account?: string;
  tokenExpiresAt?: TimeValue;
  modelCount?: number;
  quota?: { used: number; resetsAt?: TimeValue; label?: string };
  /** Reason shown for `error` status. */
  error?: string;
}

export interface ProviderRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The provider to show (name, status, auth method, quotas). */
  provider: ProviderEntry;
  /** Called with the provider when the user presses Connect on an unconfigured provider. */
  onConnect?: (provider: ProviderEntry) => void;
  /** Called with the provider when the user disconnects a connected provider. */
  onDisconnect?: (provider: ProviderEntry) => void;
  /** Called with the provider when the user presses Manage on a connected provider. */
  onManage?: (provider: ProviderEntry) => void;
  /** Reference time for relative quota labels; set it in tests and SSR for stable output. */
  now?: number;
}

/** One provider: monogram logo, auth method, status, token expiry, model count, quota and actions. */
export const ProviderRow = React.forwardRef<HTMLDivElement, ProviderRowProps>(
  ({ provider: p, onConnect, onDisconnect, onManage, now, className, ...props }, ref) => {
    const AuthIcon = authIcon[p.auth];
    const configured = p.status !== "not-configured";
    const expiry = configured ? formatTokenExpiry(p.tokenExpiresAt, now) : "";
    const expiringSoon = (() => {
      const t = toMs(p.tokenExpiresAt);
      return t != null && t - (now ?? Date.now()) < 3 * DAY_MS;
    })();
    return (
      <div
        ref={ref}
        data-slot="provider-row"
        data-status={p.status}
        className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3", className)}
        {...props}
      >
        <ProviderLogo name={p.name} monogram={p.monogram} color={p.color} />
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
            <Badge size="sm" variant="outline" color="neutral" data-slot="provider-auth" leadingIcon={<AuthIcon aria-hidden className="text-muted-foreground" />}>
              {providerAuthLabels[p.auth]}
            </Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {p.status === "error" && p.error ? (
              <span className="text-destructive">{p.error}</span>
            ) : p.account && configured ? (
              <span className="truncate">{p.account}</span>
            ) : p.description ? (
              <span className="truncate">{p.description}</span>
            ) : null}
            {expiry && (
              <span data-slot="provider-expiry" className={cn((p.status === "expired" || expiringSoon) && "text-warning-soft-foreground")}>
                {capitalize(expiry)}
              </span>
            )}
            {p.modelCount != null && (
              <span data-slot="provider-model-count">
                {p.modelCount} {pluralize(p.modelCount, "model")}
              </span>
            )}
          </div>
        </div>
        <div className="ms-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          {p.quota && configured && (
            <ProviderQuotaChip used={p.quota.used} resetsAt={p.quota.resetsAt} label={p.quota.label ? `${p.name} ${p.quota.label}` : `${p.name} quota`} now={now} />
          )}
          <StatusBadge size="sm" status={statusBadge[p.status]} label={providerStatusLabels[p.status]} />
          {!configured ? (
            <Button size="sm" variant="secondary" leadingIcon={<RiPlugLine aria-hidden />} onClick={() => onConnect?.(p)} aria-label={`Connect ${p.name}`}>
              Connect
            </Button>
          ) : (
            <>
              {(p.status === "expired" || p.status === "error") && (
                <Button size="sm" variant="primary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={() => onConnect?.(p)} aria-label={`Reconnect ${p.name}`}>
                  Reconnect
                </Button>
              )}
              {onManage && (
                <Button size="sm" variant="ghost" onClick={() => onManage(p)} aria-label={`Manage ${p.name}`}>
                  Manage
                </Button>
              )}
              {onDisconnect && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDisconnect(p)} aria-label={`Disconnect ${p.name}`}>
                  Disconnect
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);
ProviderRow.displayName = "ProviderRow";

export interface ProviderListProps extends Omit<ProviderRowProps, "provider" | "title"> {
  /** Providers to list, grouped into connected and available. */
  providers: ProviderEntry[];
  /** Heading of the group of configured providers. */
  connectedLabel?: string;
  /** Heading of the group of providers that are not configured. */
  availableLabel?: string;
}

/** Providers grouped into "Connected" and "Available" sections. */
export const ProviderList = React.forwardRef<HTMLDivElement, ProviderListProps>(
  ({ providers, onConnect, onDisconnect, onManage, now, connectedLabel = "Connected", availableLabel = "Available", className, ...props }, ref) => {
    const id = React.useId();
    const groups = [
      { key: "connected", label: connectedLabel, items: providers.filter((p) => p.status !== "not-configured") },
      { key: "available", label: availableLabel, items: providers.filter((p) => p.status === "not-configured") },
    ].filter((g) => g.items.length > 0);
    return (
      <div ref={ref} data-slot="provider-list" className={cn("w-full space-y-5", className)} {...props}>
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`${id}-${g.key}`} data-group={g.key}>
            <h3 id={`${id}-${g.key}`} className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium tabular-nums">{g.items.length}</span>
            </h3>
            <ul className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
              {g.items.map((p) => (
                <li key={p.id}>
                  <ProviderRow provider={p} onConnect={onConnect} onDisconnect={onDisconnect} onManage={onManage} now={now} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }
);
ProviderList.displayName = "ProviderList";

/* ------------------------------------------------------------------ */
/* ProviderConnectDialog                                               */
/* ------------------------------------------------------------------ */

export type ProviderConnectMethod = "device" | "pkce" | "api-key";

export interface DeviceCodeGrant {
  userCode: string;
  verificationUrl: string;
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds between polls. Default 5. */
  interval?: number;
}

export type DeviceCodePollResult = "pending" | "approved" | "denied";

export interface ApiKeyValidation {
  ok: boolean;
  message?: string;
}

export interface ProviderConnectDialogProps {
  /** Controlled open state of the dialog. */
  open?: boolean;
  /** Initial open state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Provider being connected (name, monogram, colour), shown in the dialog header. */
  provider: Pick<ProviderEntry, "name" | "monogram" | "color">;
  /** Tabs to show, in order. Default all three. */
  methods?: ProviderConnectMethod[];
  /** Tab shown first; defaults to the first of `methods`. */
  defaultMethod?: ProviderConnectMethod;
  /** Device flow: request a user code. */
  onStartDeviceFlow?: () => Promise<DeviceCodeGrant>;
  /** Device flow: called every `interval` seconds until approved, denied or expired. */
  onPollDeviceFlow?: () => Promise<DeviceCodePollResult>;
  /** PKCE: sign-in page URL the user opens to obtain a code. */
  authorizeUrl?: string;
  /** PKCE: exchange the pasted code. Throw to show an error. */
  onSubmitCode?: (code: string) => Promise<void> | void;
  /** API key: "Get a key" link. */
  getKeyUrl?: string;
  /** API key flow: checks the typed key before saving; resolve `true`, `false` or a result with a message. */
  onValidateKey?: (key: string) => Promise<ApiKeyValidation | boolean>;
  /** API key flow: called with the key when the user saves it. */
  onSaveKey?: (key: string) => void;
  /** Called once any flow completes. */
  onConnected?: (method: ProviderConnectMethod) => void;
}

const methodLabels: Record<ProviderConnectMethod, string> = { device: "Device code", pkce: "Paste code", "api-key": "API key" };

type DeviceState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting"; grant: DeviceCodeGrant; deadline: number }
  | { phase: "approved" }
  | { phase: "expired" }
  | { phase: "error"; message: string };

function DeviceFlowPanel({
  providerName,
  onStart,
  onPoll,
  onDone,
}: {
  providerName: string;
  onStart?: () => Promise<DeviceCodeGrant>;
  onPoll?: () => Promise<DeviceCodePollResult>;
  onDone: () => void;
}) {
  const [state, setState] = React.useState<DeviceState>({ phase: "idle" });
  const mounted = useMountedRef();
  const onDoneRef = useLatestRef(onDone);
  // Held in a ref so an inline `onPoll` (new identity every parent render) doesn't restart the interval.
  const onPollRef = useLatestRef(onPoll);

  const start = async () => {
    if (!onStart) return;
    setState({ phase: "starting" });
    try {
      const grant = await onStart();
      if (mounted.current) setState({ phase: "waiting", grant, deadline: Date.now() + grant.expiresIn * 1000 });
    } catch (e) {
      if (mounted.current) setState({ phase: "error", message: errorMessage(e, "Couldn't start sign-in.") });
    }
  };

  const waiting = state.phase === "waiting";
  const grant = waiting ? state.grant : null;
  const { remainingMs } = useCountdown(waiting ? state.deadline : undefined, {
    onExpire: () => setState((s) => (s.phase === "waiting" ? { phase: "expired" } : s)),
  });

  React.useEffect(() => {
    if (!grant) return;
    let inFlight = false;
    const poll = setInterval(async () => {
      const fn = onPollRef.current;
      if (inFlight || !fn) return;
      inFlight = true;
      try {
        const result = await fn();
        if (!mounted.current) return;
        if (result === "approved") {
          setState((s) => (s.phase === "waiting" ? { phase: "approved" } : s));
          onDoneRef.current();
        } else if (result === "denied") {
          setState((s) => (s.phase === "waiting" ? { phase: "error", message: "Access was denied." } : s));
        }
      } catch {
        /* transient: keep polling */
      } finally {
        inFlight = false;
      }
    }, (grant.interval ?? 5) * 1000);
    return () => clearInterval(poll);
  }, [grant, onPollRef, mounted]);

  if (state.phase === "idle" || state.phase === "starting") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Get a one-time code, open the verification page on any device and approve access to {providerName}.
        </p>
        <Button onClick={start} loading={state.phase === "starting"} disabled={!onStart}>
          Get sign-in code
        </Button>
      </div>
    );
  }
  if (state.phase === "approved") {
    return (
      <InlineAlert variant="success" data-slot="device-approved">
        Connected to {providerName}.
      </InlineAlert>
    );
  }
  if (state.phase === "expired" || state.phase === "error") {
    return (
      <div className="space-y-3">
        <InlineAlert variant={state.phase === "expired" ? "warning" : "destructive"}>
          {state.phase === "expired" ? "The code expired before it was approved." : state.message}
        </InlineAlert>
        <Button variant="secondary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={start}>
          Start over
        </Button>
      </div>
    );
  }
  const g = state.grant;
  return (
    <div className="space-y-4" data-slot="device-waiting">
      <div className="rounded-box border border-border bg-subtle p-4 text-center">
        <p className="text-xs text-muted-foreground">Your code</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span data-slot="device-user-code" className="font-mono text-2xl font-semibold tracking-[0.2em] text-foreground">
            {g.userCode}
          </span>
          <CopyButton value={g.userCode} label="Copy code" copiedLabel="Copied" timeout={1500} />
        </div>
        <a
          href={isSafeHref(g.verificationUrl) ? g.verificationUrl : undefined}
          target="_blank"
          rel="noreferrer noopener"
          className={cn("mt-2 inline-flex items-center gap-1 rounded-xs text-sm font-medium text-primary hover:underline", focusRing)}
        >
          {g.verificationUrl.replace(/^https?:\/\//, "")}
          <RiExternalLinkLine aria-hidden className="size-3.5" />
        </a>
      </div>
      {/* Only the state text is live; the ticking countdown sits outside the region so it isn't re-announced every second. */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner size="xs" label="" aria-hidden />
        <span role="status">Waiting for approval…</span>
        <span className="font-mono tabular-nums" data-slot="device-countdown">
          {formatCountdown(remainingMs)}
        </span>
      </div>
    </div>
  );
}

function PkcePanel({
  authorizeUrl,
  onSubmit,
  onDone,
}: {
  authorizeUrl?: string;
  onSubmit?: (code: string) => Promise<void> | void;
  onDone: () => void;
}) {
  const id = React.useId();
  const [code, setCode] = React.useState("");
  const [done, setDone] = React.useState(false);
  const { run, busy, error } = useAsyncAction(
    async (value: string) => {
      await onSubmit?.(value);
    },
    {
      fallbackMessage: "That code didn't work.",
      onSuccess: () => {
        setDone(true);
        onDone();
      },
    }
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    void run(code.trim());
  };
  if (done) return <InlineAlert variant="success">Signed in.</InlineAlert>;
  return (
    <form className="space-y-3" onSubmit={submit}>
      <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
        <li>
          Open the{" "}
          {authorizeUrl && isSafeHref(authorizeUrl) ? (
            <a href={authorizeUrl} target="_blank" rel="noreferrer noopener" className={cn("rounded-xs font-medium text-primary hover:underline", focusRing)}>
              sign-in page
            </a>
          ) : (
            "sign-in page"
          )}{" "}
          and approve access.
        </li>
        <li>Copy the code it shows and paste it below.</li>
      </ol>
      <div className="grid grid-cols-1 gap-1.5">
        <Label htmlFor={`${id}-code`}>Authorization code</Label>
        <Input
          id={`${id}-code`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste code"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {error && (
          <p id={`${id}-err`} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" loading={busy} disabled={!code.trim()}>
        Submit code
      </Button>
    </form>
  );
}

function ApiKeyPanel({
  providerName,
  getKeyUrl,
  onValidate,
  onSave,
  onDone,
}: {
  providerName: string;
  getKeyUrl?: string;
  onValidate?: (key: string) => Promise<ApiKeyValidation | boolean>;
  onSave?: (key: string) => void;
  onDone: () => void;
}) {
  const id = React.useId();
  const [key, setKey] = React.useState("");
  const [result, setResult] = React.useState<ApiKeyValidation | null>(null);
  const [saved, setSaved] = React.useState(false);
  const { run, busy, reset } = useAsyncAction((value: string) => onValidate?.(value), {
    onSuccess: (r) => setResult(typeof r === "boolean" ? { ok: r } : (r ?? { ok: true })),
    onError: (e) => setResult({ ok: false, message: e instanceof Error ? e.message : undefined }),
  });

  const validate = () => {
    if (!key.trim()) return;
    if (!onValidate) {
      setResult({ ok: true });
      return;
    }
    void run(key.trim());
  };

  if (saved) {
    return (
      <div className="space-y-3">
        <InlineAlert variant="success">Key saved for {providerName}.</InlineAlert>
        <SecretField label="Saved key" value={key.trim()} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-key`}>{providerName} API key</Label>
          {getKeyUrl && isSafeHref(getKeyUrl) && (
            <a
              href={getKeyUrl}
              target="_blank"
              rel="noreferrer noopener"
              className={cn("inline-flex items-center gap-1 rounded-xs text-xs font-medium text-primary hover:underline", focusRing)}
            >
              Get a key
              <RiExternalLinkLine aria-hidden className="size-3" />
            </a>
          )}
        </div>
        <PasswordInput
          id={`${id}-key`}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setResult(null);
            reset();
          }}
          placeholder="Paste your key"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          invalid={result?.ok === false}
        />
      </div>
      {result && (
        <InlineAlert variant={result.ok ? "success" : "destructive"} data-slot="api-key-result">
          {result.message ?? (result.ok ? "Key works." : "That key was rejected.")}
        </InlineAlert>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={validate} loading={busy} disabled={!key.trim()}>
          Validate
        </Button>
        <Button
          disabled={!result?.ok}
          onClick={() => {
            onSave?.(key.trim());
            setSaved(true);
            onDone();
          }}
        >
          Save key
        </Button>
      </div>
    </div>
  );
}

/** Connect a provider via OAuth device code, PKCE paste-code or an API key. */
export function ProviderConnectDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  provider,
  methods = ["device", "pkce", "api-key"],
  defaultMethod,
  onStartDeviceFlow,
  onPollDeviceFlow,
  authorizeUrl,
  onSubmitCode,
  getKeyUrl,
  onValidateKey,
  onSaveKey,
  onConnected,
}: ProviderConnectDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [method, setMethod] = React.useState<string>(defaultMethod ?? methods[0] ?? "device");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ProviderLogo name={provider.name} monogram={provider.monogram} color={provider.color} />
            <DialogTitle>Connect {provider.name}</DialogTitle>
          </div>
          <DialogDescription>Choose how to sign in. Credentials stay on this device.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Tabs value={method} onValueChange={setMethod} size="sm">
            {methods.length > 1 && (
              <TabsList fullWidth>
                {methods.map((m) => (
                  <TabsTrigger key={m} value={m}>
                    {methodLabels[m]}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
            {methods.includes("device") && (
              <TabsContent value="device">
                <DeviceFlowPanel providerName={provider.name} onStart={onStartDeviceFlow} onPoll={onPollDeviceFlow} onDone={() => onConnected?.("device")} />
              </TabsContent>
            )}
            {methods.includes("pkce") && (
              <TabsContent value="pkce">
                <PkcePanel authorizeUrl={authorizeUrl} onSubmit={onSubmitCode} onDone={() => onConnected?.("pkce")} />
              </TabsContent>
            )}
            {methods.includes("api-key") && (
              <TabsContent value="api-key">
                <ApiKeyPanel
                  providerName={provider.name}
                  getKeyUrl={getKeyUrl}
                  onValidate={onValidateKey}
                  onSave={onSaveKey}
                  onDone={() => onConnected?.("api-key")}
                />
              </TabsContent>
            )}
          </Tabs>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
ProviderConnectDialog.displayName = "ProviderConnectDialog";

/* ------------------------------------------------------------------ */
/* CustomEndpointForm                                                  */
/* ------------------------------------------------------------------ */

export type CustomEndpointApiMode = "openai" | "anthropic" | "other";

export interface CustomEndpointHeader {
  key: string;
  value: string;
}

export interface CustomEndpointValues {
  name: string;
  baseUrl: string;
  apiMode: CustomEndpointApiMode;
  headers: CustomEndpointHeader[];
  apiKey: string;
}

export interface CustomEndpointTestResult {
  ok: boolean;
  latencyMs?: number;
  models?: string[];
  error?: string;
}

export interface CustomEndpointFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  /** Initial field values (base URL, key, model id and so on). */
  defaultValues?: Partial<CustomEndpointValues>;
  /** Tests the endpoint with the current values and resolves with the result; shows a Test button when set. */
  onTest?: (values: CustomEndpointValues) => Promise<CustomEndpointTestResult>;
  /** Called with the valid values when the user submits the form. */
  onSave?: (values: CustomEndpointValues) => void;
  /** Called when the user presses Cancel; the button is hidden when unset. */
  onCancel?: () => void;
  /** Label of the submit button. */
  submitLabel?: string;
}

export const customEndpointApiModes: { value: CustomEndpointApiMode; label: string }[] = [
  { value: "openai", label: "OpenAI-compatible" },
  { value: "anthropic", label: "Anthropic Messages" },
  { value: "other", label: "Other" },
];

/** Form for an OpenAI/Anthropic-compatible endpoint with headers, key and a "Test connection" probe. */
export const CustomEndpointForm = React.forwardRef<HTMLFormElement, CustomEndpointFormProps>(
  ({ defaultValues, onTest, onSave, onCancel, submitLabel = "Save endpoint", className, ...props }, ref) => {
    const id = React.useId();
    const [values, setValues] = React.useState<CustomEndpointValues>({
      name: defaultValues?.name ?? "",
      baseUrl: defaultValues?.baseUrl ?? "",
      apiMode: defaultValues?.apiMode ?? "openai",
      headers: defaultValues?.headers ?? [],
      apiKey: defaultValues?.apiKey ?? "",
    });
    const [result, setResult] = React.useState<CustomEndpointTestResult | null>(null);
    const [touched, setTouched] = React.useState(false);
    const set = <K extends keyof CustomEndpointValues>(k: K, v: CustomEndpointValues[K]) => {
      setValues((s) => ({ ...s, [k]: v }));
      setResult(null);
      resetTest();
    };
    const urlInvalid = values.baseUrl.trim() !== "" && !isHttpUrl(values.baseUrl.trim());
    const canSubmit = values.name.trim() !== "" && isHttpUrl(values.baseUrl.trim());
    const clean = (): CustomEndpointValues => ({
      ...values,
      name: values.name.trim(),
      baseUrl: values.baseUrl.trim().replace(/\/+$/, ""),
      headers: values.headers.filter((h) => h.key.trim()),
    });

    const { run: runTest, busy: testing, reset: resetTest } = useAsyncAction((v: CustomEndpointValues) => onTest?.(v), {
      onSuccess: (r) => {
        if (r) setResult(r);
      },
      onError: (e) => setResult({ ok: false, error: e instanceof Error ? e.message : "Connection failed" }),
    });

    const test = () => {
      if (!onTest || !isHttpUrl(values.baseUrl.trim())) return;
      setResult(null);
      void runTest(clean());
    };

    return (
      <form
        ref={ref}
        noValidate
        data-slot="custom-endpoint-form"
        className={cn("grid w-full grid-cols-1 gap-4", className)}
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (canSubmit) onSave?.(clean());
        }}
        {...props}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-1 gap-1.5">
            <Label htmlFor={`${id}-name`} required>
              Name
            </Label>
            <Input
              id={`${id}-name`}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My gateway"
              invalid={touched && !values.name.trim()}
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <Label id={`${id}-mode-label`}>API mode</Label>
            <SimpleSelect
              aria-labelledby={`${id}-mode-label`}
              value={values.apiMode}
              onValueChange={(v) => set("apiMode", v as CustomEndpointApiMode)}
              options={customEndpointApiModes}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Label htmlFor={`${id}-url`} required>
            Base URL
          </Label>
          <Input
            id={`${id}-url`}
            type="url"
            value={values.baseUrl}
            onChange={(e) => set("baseUrl", e.target.value)}
            placeholder="https://llm.example.internal/v1"
            className="font-mono"
            invalid={urlInvalid || (touched && !values.baseUrl.trim())}
            aria-describedby={urlInvalid ? `${id}-url-err` : undefined}
          />
          {urlInvalid && (
            <p id={`${id}-url-err`} className="text-xs text-destructive">
              Enter an http(s) URL.
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Label htmlFor={`${id}-key`}>API key</Label>
          <PasswordInput
            id={`${id}-key`}
            value={values.apiKey}
            onChange={(e) => set("apiKey", e.target.value)}
            placeholder="Optional"
            autoComplete="off"
            className="font-mono"
          />
        </div>
        <fieldset className="grid grid-cols-1 gap-2">
          <legend className="mb-1.5 text-sm font-medium text-foreground">Headers</legend>
          {values.headers.length === 0 && <p className="text-xs text-muted-foreground">No extra headers</p>}
          {values.headers.map((h, i) => (
            <div key={i} className="flex items-center gap-2" data-slot="endpoint-header-row">
              <Input
                aria-label={`Header ${i + 1} name`}
                value={h.key}
                placeholder="X-Header"
                size="sm"
                className="font-mono"
                onChange={(e) => set("headers", values.headers.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
              />
              <Input
                aria-label={`Header ${i + 1} value`}
                value={h.value}
                placeholder="value"
                size="sm"
                className="font-mono"
                onChange={(e) => set("headers", values.headers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove header ${i + 1}`}
                onClick={() => set("headers", values.headers.filter((_, j) => j !== i))}
              >
                <RiCloseLine aria-hidden />
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="ghost" size="sm" leadingIcon={<RiAddLine aria-hidden />} onClick={() => set("headers", [...values.headers, { key: "", value: "" }])}>
              Add header
            </Button>
          </div>
        </fieldset>
        {result && (
          <InlineAlert variant={result.ok ? "success" : "destructive"} data-slot="endpoint-test-result">
            {result.ok ? (
              <div className="space-y-1.5">
                <p>
                  Connected
                  {result.latencyMs != null && <> · {Math.round(result.latencyMs)} ms</>}
                  {result.models && (
                    <>
                      {" "}
                      · {result.models.length} {pluralize(result.models.length, "model")} found
                    </>
                  )}
                </p>
                {result.models && result.models.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.models.slice(0, 8).map((m) => (
                      <Badge key={m} size="sm" variant="outline" className="font-mono">
                        {m}
                      </Badge>
                    ))}
                    {result.models.length > 8 && <span className="text-xs">+{result.models.length - 8} more</span>}
                  </div>
                )}
              </div>
            ) : (
              <p>{result.error ?? "Connection failed."}</p>
            )}
          </InlineAlert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="secondary" onClick={test} loading={testing} disabled={!onTest || !isHttpUrl(values.baseUrl.trim())}>
            Test connection
          </Button>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit">{submitLabel}</Button>
          </div>
        </div>
      </form>
    );
  }
);
CustomEndpointForm.displayName = "CustomEndpointForm";

/* ------------------------------------------------------------------ */
/* ProviderKeysGroups                                                  */
/* ------------------------------------------------------------------ */

export interface ProviderEnvKey {
  /** Environment variable name, e.g. `NIMBUS_API_KEY`. */
  name: string;
  /** Current value; empty or undefined means unset. */
  value?: string;
  description?: React.ReactNode;
}

export interface ProviderKeyGroup {
  id: string;
  name: string;
  monogram?: string;
  color?: string;
  /** Lower comes first. */
  priority?: number;
  docsUrl?: string;
  keys: ProviderEnvKey[];
}

export interface ProviderKeysGroupsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Provider groups, each with the environment keys it needs and whether they are set. */
  groups: ProviderKeyGroup[];
  /** User-added environment keys listed in the custom section. */
  customKeys?: ProviderEnvKey[];
  /** Store a key. May return a promise; a rejection is shown under the input. */
  onSetKey?: (name: string, value: string) => void | Promise<void>;
  /** Called with the key name when the user clears a stored key. */
  onClearKey?: (name: string) => void;
  /** Called with the name and value when the user adds a custom key. */
  onAddCustomKey?: (name: string, value: string) => void;
  /** Hide the custom keys section. */
  hideCustom?: boolean;
}

function EnvKeyRow({ k, onSet, onClear }: { k: ProviderEnvKey; onSet?: (name: string, value: string) => void | Promise<void>; onClear?: (name: string) => void }) {
  return (
    <SecretRow
      layout="inline"
      name={k.name}
      isSet={!!k.value}
      value={k.value}
      description={k.description}
      onSave={onSet ? (value) => onSet(k.name, value) : undefined}
      onClear={onClear ? () => onClear(k.name) : undefined}
    />
  );
}

const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

/** Environment keys grouped into provider cards (sorted by priority) plus a custom keys section. */
export const ProviderKeysGroups = React.forwardRef<HTMLDivElement, ProviderKeysGroupsProps>(
  ({ groups, customKeys = [], onSetKey, onClearKey, onAddCustomKey, hideCustom, className, ...props }, ref) => {
    const id = React.useId();
    const [name, setName] = React.useState("");
    const [value, setValue] = React.useState("");
    const sorted = React.useMemo(
      () => groups.map((g, i) => ({ g, i })).sort((a, b) => (a.g.priority ?? 1e9) - (b.g.priority ?? 1e9) || a.i - b.i).map((x) => x.g),
      [groups]
    );
    const nameInvalid = name !== "" && !ENV_NAME.test(name);
    return (
      <div ref={ref} data-slot="provider-keys-groups" className={cn("grid w-full grid-cols-1 gap-4", className)} {...props}>
        {sorted.map((g) => {
          const setCount = g.keys.filter((k) => k.value).length;
          return (
            <section key={g.id} aria-labelledby={`${id}-${g.id}`} data-slot="provider-key-group" className="overflow-hidden rounded-box border border-border bg-card shadow-xs">
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <ProviderLogo name={g.name} monogram={g.monogram} color={g.color} size="sm" />
                <h3 id={`${id}-${g.id}`} className="flex-1 text-sm font-semibold text-foreground">
                  {g.name}
                </h3>
                <Badge size="sm" color={setCount > 0 ? "success" : "neutral"}>
                  {setCount}/{g.keys.length} set
                </Badge>
                {g.docsUrl && isSafeHref(g.docsUrl) && (
                  <a href={g.docsUrl} target="_blank" rel="noreferrer noopener" className={cn("inline-flex items-center gap-1 rounded-xs text-xs font-medium text-primary hover:underline", focusRing)}>
                    Get a key
                    <RiExternalLinkLine aria-hidden className="size-3" />
                  </a>
                )}
              </header>
              <ul className="divide-y divide-border">
                {g.keys.map((k) => (
                  <EnvKeyRow key={k.name} k={k} onSet={onSetKey} onClear={onClearKey} />
                ))}
              </ul>
            </section>
          );
        })}
        {!hideCustom && (
          <section aria-labelledby={`${id}-custom`} className="overflow-hidden rounded-box border border-dashed border-border-strong bg-card">
            <header className="border-b border-border px-4 py-3">
              <h3 id={`${id}-custom`} className="text-sm font-semibold text-foreground">
                Custom keys
              </h3>
              <p className="text-xs text-muted-foreground">Extra environment variables passed to the agent.</p>
            </header>
            {customKeys.length > 0 && (
              <ul className="divide-y divide-border">
                {customKeys.map((k) => (
                  <EnvKeyRow key={k.name} k={k} onSet={onSetKey} onClear={onClearKey} />
                ))}
              </ul>
            )}
            {onAddCustomKey && (
              <form
                className="flex flex-wrap items-start gap-2 border-t border-border px-4 py-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!ENV_NAME.test(name) || !value) return;
                  onAddCustomKey(name, value);
                  setName("");
                  setValue("");
                }}
              >
                <div className="grid min-w-40 flex-1 gap-1">
                  <Input
                    size="sm"
                    aria-label="Variable name"
                    placeholder="MY_VARIABLE"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="font-mono"
                    invalid={nameInvalid}
                  />
                  {nameInvalid && <p className="text-xs text-destructive">Use A–Z, 0–9 and _.</p>}
                </div>
                <PasswordInput size="sm" aria-label="Variable value" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} wrapperClassName="min-w-40 flex-1" className="font-mono" />
                <Button type="submit" size="sm" variant="secondary" leadingIcon={<RiAddLine aria-hidden />} disabled={!ENV_NAME.test(name) || !value}>
                  Add
                </Button>
              </form>
            )}
          </section>
        )}
      </div>
    );
  }
);
ProviderKeysGroups.displayName = "ProviderKeysGroups";
