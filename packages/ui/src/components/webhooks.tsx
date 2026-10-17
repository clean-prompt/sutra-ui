import * as React from "react";
import { RiAddLine, RiCheckLine, RiFileCopyLine, RiKey2Line, RiRefreshLine, RiReplyLine, RiSendPlaneLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useCopy } from "../hooks/use-copy";
import { Button } from "./button";
import { Badge } from "./badge";
import { Input } from "./input";
import { Switch, SwitchField } from "./switch";
import { ConfirmDialog } from "./dialog";
import { SecretRevealOnce } from "./secret";
import { Field, FieldError, FieldLabel } from "./field";
import { formatTimelineDuration } from "./timeline-bar";
import { formatScheduleRelative } from "./cron";
import {
  DeliveryTargetPicker,
  NameCheckboxPicker,
  formatDeliveryTarget,
  type DeliveryPlatform,
  type DeliveryPlatformStatus,
  type DeliveryTarget,
  type NameCheckboxOption,
} from "./agent-jobs";

type TimeLike = Date | number | string;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface WebhookDelivery {
  id: string;
  event?: string;
  /** HTTP status; `null` for a network error / timeout. */
  statusCode: number | null;
  at: TimeLike;
  durationMs?: number;
  error?: string;
}

export interface WebhookRoute {
  id: string;
  name: string;
  /** Public endpoint senders POST to. */
  url: string;
  events: string[];
  delivery: DeliveryTarget;
  enabled: boolean;
  /** Last characters of the signing secret, for the masked display. */
  secretHint?: string;
  deliveries?: WebhookDelivery[];
}

export interface WebhookRouteDraft {
  id?: string;
  name: string;
  events: string[];
  delivery: DeliveryTarget;
  enabled: boolean;
}

export interface WebhookTestResult {
  ok: boolean;
  statusCode?: number | null;
  durationMs?: number;
  message?: string;
}

function statusTone(code: number | null): "success" | "warning" | "destructive" {
  if (code == null || code >= 500) return "destructive";
  if (code >= 400) return "warning";
  return "success";
}

/* ------------------------------------------------------------------ */
/* WebhookUrlCopy                                                      */
/* ------------------------------------------------------------------ */

export interface WebhookUrlCopyProps extends React.HTMLAttributes<HTMLDivElement> {
  url: string;
  /** Accessible label of the copy button. Default "Copy URL". */
  copyLabel?: string;
}

/** Read-only monospace value with a copy button (endpoint URLs). */
export const WebhookUrlCopy = React.forwardRef<HTMLDivElement, WebhookUrlCopyProps>(({ url, copyLabel = "Copy URL", className, ...props }, ref) => {
  const { copied, copy } = useCopy();
  return (
    <div ref={ref} className={cn("flex min-w-0 items-center gap-1 rounded-control border border-input bg-subtle py-0.5 pl-2.5 pr-0.5", className)} {...props}>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={url}>
        {url}
      </code>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={copied ? "Copied" : copyLabel} onClick={() => copy(url)}>
        {copied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
});
WebhookUrlCopy.displayName = "WebhookUrlCopy";

/* ------------------------------------------------------------------ */
/* WebhookRouteList                                                    */
/* ------------------------------------------------------------------ */

export interface WebhookRouteListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  routes: WebhookRoute[];
  selectedId?: string | null;
  onSelect?: (route: WebhookRoute) => void;
  onToggleEnabled?: (route: WebhookRoute, enabled: boolean) => void;
  /** Shows a "New route" button. */
  onCreate?: () => void;
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  empty?: React.ReactNode;
}

/** Webhook routes: name, copyable URL, events, delivery target, last delivery and an enabled switch. */
export const WebhookRouteList = React.forwardRef<HTMLDivElement, WebhookRouteListProps>(
  ({ routes, selectedId, onSelect, onToggleEnabled, onCreate, deliveryStatus, empty = "No webhook routes yet.", className, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      {onCreate ? (
        <Button type="button" size="sm" variant="secondary" leadingIcon={<RiAddLine />} className="self-end" onClick={onCreate}>
          New route
        </Button>
      ) : null}
      {routes.length ? (
        <ul aria-label="Webhook routes" className="flex flex-col gap-2">
          {routes.map((r) => {
            const last = r.deliveries?.[0];
            const selected = selectedId === r.id;
            return (
              <li
                key={r.id}
                data-selected={selected || undefined}
                className={cn("flex flex-col gap-2 rounded-box border p-3 transition-colors", selected ? "border-primary bg-accent" : "border-border bg-card")}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={onSelect ? selected : undefined}
                    onClick={() => onSelect?.(r)}
                    className={cn("min-w-0 flex-1 truncate rounded-md text-left text-sm font-medium", focusRing)}
                  >
                    {r.name}
                  </button>
                  {last ? (
                    <Badge size="sm" color={statusTone(last.statusCode)}>
                      {last.statusCode ?? "ERR"}
                    </Badge>
                  ) : null}
                  <Switch size="sm" checked={r.enabled} aria-label={`Enable ${r.name}`} onCheckedChange={(c) => onToggleEnabled?.(r, c)} disabled={!onToggleEnabled} />
                </div>
                <WebhookUrlCopy url={r.url} copyLabel={`Copy URL for ${r.name}`} />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {r.events.length} {r.events.length === 1 ? "event" : "events"}
                  </span>
                  <span>→ {formatDeliveryTarget(r.delivery, deliveryStatus)}</span>
                  {last ? <span>last {formatScheduleRelative(last.at)}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-box border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
);
WebhookRouteList.displayName = "WebhookRouteList";

/* ------------------------------------------------------------------ */
/* WebhookRouteEditor                                                  */
/* ------------------------------------------------------------------ */

export interface WebhookRouteEditorProps extends Omit<React.HTMLAttributes<HTMLFormElement>, "onSubmit"> {
  /** Existing route; omit to create one. */
  route?: WebhookRoute;
  /** Events a sender can subscribe to. */
  events: (string | NameCheckboxOption)[];
  /** Freshly issued signing secret: shown once, then masked. */
  newSecret?: string | null;
  onSave?: (draft: WebhookRouteDraft) => void | Promise<void>;
  onCancel?: () => void;
  /** Issue a new secret (after confirmation); the result is shown once. */
  onRegenerateSecret?: () => string | Promise<string>;
  onTestSend?: () => WebhookTestResult | Promise<WebhookTestResult>;
  onRedeliver?: (delivery: WebhookDelivery) => void;
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  deliveryPlatforms?: DeliveryPlatform[];
  onConfigureChannels?: () => void;
}

/** Create or edit a webhook route: name, URL, show-once signing secret with regenerate, events, delivery, test send and recent deliveries. */
export const WebhookRouteEditor = React.forwardRef<HTMLFormElement, WebhookRouteEditorProps>(
  (
    {
      route,
      events,
      newSecret,
      onSave,
      onCancel,
      onRegenerateSecret,
      onTestSend,
      onRedeliver,
      deliveryStatus,
      deliveryPlatforms,
      onConfigureChannels,
      className,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = React.useState<WebhookRouteDraft>(() => ({
      id: route?.id,
      name: route?.name ?? "",
      events: route?.events ?? [],
      delivery: route?.delivery ?? { platform: "local" },
      enabled: route?.enabled ?? true,
    }));
    const [secret, setSecret] = React.useState<string | null>(newSecret ?? null);
    const [submitted, setSubmitted] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [testing, setTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<WebhookTestResult | null>(null);
    const nameRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (newSecret) setSecret(newSecret);
    }, [newSecret]);

    const errors: { name?: string; events?: string } = {};
    if (!draft.name.trim()) errors.name = "Give the route a name";
    if (!draft.events.length) errors.events = "Subscribe to at least one event";

    const patch = (p: Partial<WebhookRouteDraft>) => setDraft((d) => ({ ...d, ...p }));

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      if (errors.name || errors.events) {
        if (errors.name) nameRef.current?.focus();
        return;
      }
      try {
        setSaving(true);
        await onSave?.({ ...draft, name: draft.name.trim() });
      } finally {
        setSaving(false);
      }
    };

    const runTest = async () => {
      if (!onTestSend) return;
      setTesting(true);
      setTestResult(null);
      try {
        setTestResult(await onTestSend());
      } catch (err) {
        setTestResult({ ok: false, message: err instanceof Error ? err.message : "Test failed" });
      } finally {
        setTesting(false);
      }
    };

    const deliveries = route?.deliveries ?? [];

    return (
      <form ref={ref} noValidate onSubmit={submit} className={cn("flex min-w-0 flex-col gap-5", className)} {...props}>
        <Field invalid={submitted && !!errors.name} required>
          <FieldLabel>Name</FieldLabel>
          <Input ref={nameRef} value={draft.name} placeholder="GitHub pushes" onChange={(e) => patch({ name: e.target.value })} />
          <FieldError>{submitted ? errors.name : undefined}</FieldError>
        </Field>

        {route ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Endpoint URL</span>
            <WebhookUrlCopy url={route.url} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The endpoint URL and signing secret are issued when you save.</p>
        )}

        {secret ? (
          <SecretRevealOnce
            secret={secret}
            title="Copy this signing secret now"
            description="Senders sign payloads with it. Only a hash is stored — you won't see it again."
            acknowledgeLabel="I've stored this secret somewhere safe"
            fileName={false}
            onDone={() => setSecret(null)}
          />
        ) : route ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Signing secret</span>
            <div className="flex items-center gap-2">
              <code data-slot="webhook-secret-masked" className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-control border border-input bg-subtle px-2.5 font-mono text-xs text-muted-foreground">
                <RiKey2Line aria-hidden className="size-3.5 shrink-0" />
                <span aria-hidden>whsec_••••••••{route.secretHint ?? ""}</span>
                <span className="sr-only">Secret hidden{route.secretHint ? `, ending in ${route.secretHint}` : ""}</span>
              </code>
              {onRegenerateSecret ? (
                <ConfirmDialog
                  tone="destructive"
                  title="Regenerate signing secret?"
                  description="The current secret stops working immediately. Update every sender with the new one."
                  confirmLabel="Regenerate"
                  onConfirm={async () => {
                    const s = await onRegenerateSecret();
                    setSecret(s);
                  }}
                  trigger={
                    <Button type="button" size="sm" variant="outline" leadingIcon={<RiRefreshLine />}>
                      Regenerate
                    </Button>
                  }
                />
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <NameCheckboxPicker label="Events" options={events} value={draft.events} onValueChange={(v) => patch({ events: v })} />
          {submitted && errors.events ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.events}
            </p>
          ) : null}
        </div>

        <DeliveryTargetPicker
          legend="Send results to"
          value={draft.delivery}
          onValueChange={(v) => patch({ delivery: v })}
          status={deliveryStatus}
          platforms={deliveryPlatforms}
          onConfigureChannels={onConfigureChannels}
        />

        <SwitchField label="Enabled" description="Disabled routes answer 404 and run nothing." checked={draft.enabled} onCheckedChange={(c) => patch({ enabled: c })} />

        {route && onTestSend ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" leadingIcon={<RiSendPlaneLine />} loading={testing} onClick={runTest}>
              Send test
            </Button>
            <p role="status" className={cn("text-sm", testResult ? (testResult.ok ? "text-success" : "text-destructive") : "sr-only")}>
              {testResult
                ? [
                    testResult.ok ? "Test delivered" : "Test failed",
                    testResult.statusCode != null ? String(testResult.statusCode) : null,
                    testResult.durationMs != null ? `${Math.round(testResult.durationMs)}ms` : null,
                    testResult.message ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : ""}
            </p>
          </div>
        ) : null}

        {route ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Recent deliveries</h3>
            {deliveries.length ? (
              <ol aria-label="Recent deliveries" className="flex flex-col divide-y divide-border rounded-box border border-border">
                {deliveries.map((d) => {
                  const when = formatScheduleRelative(d.at);
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                      <Badge size="sm" color={statusTone(d.statusCode)} className="tabular-nums">
                        {d.statusCode ?? "ERR"}
                      </Badge>
                      {d.event ? <code className="font-mono text-xs">{d.event}</code> : null}
                      <time dateTime={new Date(d.at).toISOString()} className="text-xs text-muted-foreground">
                        {when}
                      </time>
                      {d.durationMs != null ? <span className="text-xs text-muted-foreground tabular-nums">{d.durationMs < 1000 ? `${Math.round(d.durationMs)}ms` : formatTimelineDuration(d.durationMs)}</span> : null}
                      {d.error ? <span className="min-w-0 flex-1 truncate text-xs text-destructive">{d.error}</span> : null}
                      {onRedeliver ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          className="ml-auto"
                          leadingIcon={<RiReplyLine />}
                          aria-label={`Redeliver ${d.event ?? "delivery"} from ${when}`}
                          onClick={() => onRedeliver(d)}
                        >
                          Redeliver
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" loading={saving}>
            {route ? "Save route" : "Create route"}
          </Button>
        </div>
      </form>
    );
  }
);
WebhookRouteEditor.displayName = "WebhookRouteEditor";
