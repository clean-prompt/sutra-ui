import * as React from "react";
import { RiAddLine, RiKey2Line, RiRefreshLine, RiReplyLine, RiSendPlaneLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { safeISO, toValidDate, type TimeInput } from "../../lib/time";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { CopyButton } from "../../primitives/copy-button";
import { Badge } from "../../primitives/badge";
import { Input } from "../../primitives/input";
import { Switch, SwitchField } from "../../primitives/switch";
import { ConfirmDialog } from "../../primitives/dialog";
import { SecretRevealOnce } from "../identity/secret";
import { Field, FieldError, FieldLabel } from "../../primitives/field";
import { formatTimelineDuration } from "../../patterns/timeline-bar";
import { formatScheduleRelative } from "../../patterns/cron";
import { DeliveryTargetPicker, formatDeliveryTarget } from "./agent-jobs-delivery";
import { NameCheckboxPicker, type NameCheckboxOption } from "./agent-jobs-form";
import type { DeliveryPlatform, DeliveryPlatformStatus, DeliveryTarget } from "./agent-jobs-model";
import { FlowArrow } from "../../primitives/flow-arrow-internal";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface WebhookDelivery {
  id: string;
  event?: string;
  /** HTTP status; `null` for a network error / timeout. */
  statusCode: number | null;
  at: TimeInput;
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
  /** Webhook endpoint URL, shown in mono with a copy button. */
  url: string;
  /** Accessible label of the copy button. Default "Copy URL". */
  copyLabel?: string;
}

/** Read-only monospace value with a copy button (endpoint URLs). */
export const WebhookUrlCopy = React.forwardRef<HTMLDivElement, WebhookUrlCopyProps>(({ url, copyLabel = "Copy URL", className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("flex min-w-0 items-center gap-1 rounded-control border border-input bg-subtle py-0.5 ps-2.5 pe-0.5", className)} {...props}>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={url}>
        {url}
      </code>
      <CopyButton value={url} label={copyLabel} />
    </div>
  );
});
WebhookUrlCopy.displayName = "WebhookUrlCopy";

/* ------------------------------------------------------------------ */
/* WebhookRouteList                                                    */
/* ------------------------------------------------------------------ */

export interface WebhookRouteListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Webhook routes to list, one row each. */
  routes: WebhookRoute[];
  /** Id of the selected route; `null` or unset selects none. */
  selectedId?: string | null;
  /** Called with the route when its row is pressed. */
  onSelect?: (route: WebhookRoute) => void;
  /** Called with the route and its new state when the user flips a row's switch; the switch is hidden when unset. */
  onToggleEnabled?: (route: WebhookRoute, enabled: boolean) => void;
  /** Shows a "New route" button. */
  onCreate?: () => void;
  /** Delivery state per platform, shown beside each route's delivery target. */
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  /** Shown when there are no routes. Default "No webhook routes yet". */
  emptyState?: React.ReactNode;
  /** Content shown when there is nothing to list. @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

/** Webhook routes: name, copyable URL, events, delivery target, last delivery and an enabled switch. */
export const WebhookRouteList = React.forwardRef<HTMLDivElement, WebhookRouteListProps>(
  ({ routes, selectedId, onSelect, onToggleEnabled, onCreate, deliveryStatus, emptyState, empty, className, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      {onCreate ? (
        <Button type="button" size="sm" variant="secondary" leadingIcon={<RiAddLine aria-hidden />} className="self-end" onClick={onCreate}>
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
                    className={cn("-my-0.5 min-w-0 flex-1 truncate rounded-md py-0.5 text-start text-sm font-medium", focusRing)}
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
                  <span><FlowArrow /> {formatDeliveryTarget(r.delivery, deliveryStatus)}</span>
                  {last && toValidDate(last.at) ? <span>last {formatScheduleRelative(last.at)}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-box border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyState ?? empty ?? "No webhook routes yet"}</p>
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
  /**
   * Called with the validated route draft; may return a promise, and the save button shows a spinner until it
   * settles.
   */
  onSave?: (draft: WebhookRouteDraft) => void | Promise<void>;
  /** Called when the user presses Cancel; the button is hidden when unset. */
  onCancel?: () => void;
  /** Issue a new secret (after confirmation); the result is shown once. */
  onRegenerateSecret?: () => string | Promise<string>;
  /** Sends a test event and resolves with its result; shows a "Send test" button when set. */
  onTestSend?: () => WebhookTestResult | Promise<WebhookTestResult>;
  /** Called with a past delivery when the user presses Redeliver on it; the action is hidden when unset. */
  onRedeliver?: (delivery: WebhookDelivery) => void;
  /** Delivery state per platform, shown beside the delivery targets. */
  deliveryStatus?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  /** Delivery targets to offer; defaults to the built-in platforms. */
  deliveryPlatforms?: DeliveryPlatform[];
  /** Called when the user presses Channels in the home-channel warning; the button is hidden when unset. */
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
    const draftFor = (r: WebhookRoute | undefined): WebhookRouteDraft => ({
      id: r?.id,
      name: r?.name ?? "",
      events: r?.events ?? [],
      delivery: r?.delivery ?? { platform: "local" },
      enabled: r?.enabled ?? true,
    });
    const [draft, setDraft] = React.useState<WebhookRouteDraft>(() => draftFor(route));
    const [secret, setSecret] = React.useState<string | null>(newSecret ?? null);
    const [submitted, setSubmitted] = React.useState(false);
    const [testResult, setTestResult] = React.useState<WebhookTestResult | null>(null);
    // Selecting another route (master/detail) starts a fresh draft for it.
    const [draftRouteId, setDraftRouteId] = React.useState(route?.id);
    if (draftRouteId !== route?.id) {
      setDraftRouteId(route?.id);
      setDraft(draftFor(route));
      setSecret(newSecret ?? null);
      setSubmitted(false);
      setTestResult(null);
    }
    const saveAction = useAsyncAction((next: WebhookRouteDraft) => onSave?.(next), {
      fallbackMessage: "Could not save the route",
    });
    const testAction = useAsyncAction(() => onTestSend?.(), {
      onSuccess: (result) => setTestResult(result ?? null),
      onError: (err) => setTestResult({ ok: false, message: errorMessage(err, "Test failed") }),
    });
    const saving = saveAction.busy;
    const testing = testAction.busy;
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
      await saveAction.run({ ...draft, name: draft.name.trim() });
    };

    const runTest = () => {
      if (!onTestSend) return;
      setTestResult(null);
      void testAction.run();
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
            <div className="flex flex-wrap items-center gap-2">
              <code data-slot="webhook-secret-masked" className="flex h-8 min-w-0 flex-1 basis-48 items-center gap-2 rounded-control border border-input bg-subtle px-2.5 font-mono text-xs text-muted-foreground">
                <RiKey2Line aria-hidden className="size-3.5 shrink-0" />
                <span aria-hidden className="min-w-0 truncate">whsec_••••••••{route.secretHint ?? ""}</span>
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
                    <Button type="button" size="sm" variant="outline" leadingIcon={<RiRefreshLine aria-hidden />}>
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
            <Button type="button" size="sm" variant="outline" leadingIcon={<RiSendPlaneLine aria-hidden />} loading={testing} onClick={runTest}>
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
                  const when = toValidDate(d.at) ? formatScheduleRelative(d.at) : "—";
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                      <Badge size="sm" color={statusTone(d.statusCode)} className="tabular-nums">
                        {d.statusCode ?? "ERR"}
                      </Badge>
                      {d.event ? <code className="font-mono text-xs">{d.event}</code> : null}
                      <time dateTime={safeISO(d.at)} className="text-xs text-muted-foreground">
                        {when}
                      </time>
                      {d.durationMs != null ? <span className="text-xs text-muted-foreground tabular-nums">{d.durationMs < 1000 ? `${Math.round(d.durationMs)}ms` : formatTimelineDuration(d.durationMs)}</span> : null}
                      {d.error ? <span className="min-w-0 flex-1 truncate text-xs text-destructive">{d.error}</span> : null}
                      {onRedeliver ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          className="ms-auto"
                          leadingIcon={<RiReplyLine className="rtl:-scale-x-100" aria-hidden />}
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
              <p className="text-sm text-muted-foreground">No deliveries yet</p>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          {saveAction.error ? (
            <p role="alert" className="me-auto self-center text-sm text-destructive">
              {saveAction.error}
            </p>
          ) : null}
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
