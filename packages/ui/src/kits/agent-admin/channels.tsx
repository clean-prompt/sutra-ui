/** Channels: the PlatformConnectorCard and PlatformConnectorList, plus re-exports of the platform model and icon, config form, QR pairing and setup steps, and access request queue (one module per family). */
import * as React from "react";
import { RiCheckLine, RiCloseLine, RiErrorWarningLine, RiSettings3Line } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { toneClasses } from "../../lib/tone";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Switch } from "../../primitives/switch";
import { StatusBadge, StatusDot, type StatusBadgeStatus } from "../../primitives/status-badge";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../primitives/dialog";
import { type ChannelPlatform, channelPlatforms } from "./channels-model";
import { PlatformIcon } from "./channels-icon";
import { type PlatformConfigField, type PlatformConfigValues, PlatformConfigForm } from "./channels-config-form";

export * from "./channels-model";
export * from "./channels-icon";
export * from "./channels-config-form";
export * from "./channels-pairing";
export * from "./channels-access";

/* ------------------------------------------------------------------ */
/* Connector card + list                                               */
/* ------------------------------------------------------------------ */

export type PlatformConnectorState = "connected" | "starting" | "stopped" | "not_configured" | "fatal" | "startup_failed";

const connectorStateMeta: Record<PlatformConnectorState, { status: StatusBadgeStatus; label: string }> = {
  connected: { status: "online", label: "Connected" },
  starting: { status: "processing", label: "Starting" },
  stopped: { status: "offline", label: "Stopped" },
  not_configured: { status: "draft", label: "Not configured" },
  fatal: { status: "error", label: "Fatal error" },
  startup_failed: { status: "error", label: "Startup failed" },
};

export interface PlatformConnector {
  id: string;
  platform: ChannelPlatform;
  /** Defaults to the platform name. */
  name?: string;
  /** Secondary line, e.g. the bot handle. */
  detail?: React.ReactNode;
  state: PlatformConnectorState;
  /** Shown for `fatal` and `startup_failed`. */
  error?: string;
  /** Public URL the platform calls (webhooks). Shown with a copy button. */
  ingressUrl?: string;
  enabled?: boolean;
  /** Current config, used as the form's defaults. */
  config?: PlatformConfigValues;
}

export interface ConnectorTestResult {
  ok: boolean;
  message?: React.ReactNode;
  latencyMs?: number;
}

export interface PlatformConnectorCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The connector to show (platform, status, enabled state, summary). */
  connector: PlatformConnector;
  /** Called with the new state when the user flips the enable switch. */
  onEnabledChange?: (enabled: boolean) => void;
  /** Runs a connectivity test. Shows a Test button when set. */
  onTest?: () => ConnectorTestResult | Promise<ConnectorTestResult>;
  /** Saves the config form. Shows a Configure button when set. Close happens after it resolves. */
  onSaveConfig?: (values: PlatformConfigValues) => void | Promise<void>;
  /** Override the form fields. */
  configFields?: PlatformConfigField[];
}

/** One messaging channel: state, error, ingress URL, enable switch, test and configure. */
export const PlatformConnectorCard = React.forwardRef<HTMLDivElement, PlatformConnectorCardProps>(
  ({ connector, onEnabledChange, onTest, onSaveConfig, configFields, className, ...props }, ref) => {
    const { platform, state } = connector;
    const name = connector.name ?? channelPlatforms[platform].label;
    const meta = connectorStateMeta[state];
    const [result, setResult] = React.useState<ConnectorTestResult | null>(null);
    const [open, setOpen] = React.useState(false);
    const failed = state === "fatal" || state === "startup_failed";
    const titleId = React.useId();

    const test = useAsyncAction(
      async () => {
        setResult(null);
        return onTest!();
      },
      {
        onSuccess: setResult,
        onError: (e) => setResult({ ok: false, message: errorMessage(e, "Test failed") }),
      }
    );
    const runTest = () => {
      if (onTest) void test.run();
    };

    return (
      <div
        ref={ref}
        data-slot="platform-connector-card"
        data-state={state}
        role="group"
        aria-labelledby={titleId}
        className={cn("flex min-w-0 flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <PlatformIcon platform={platform} decorative />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 id={titleId} className="min-w-0 max-w-full truncate text-sm font-semibold text-foreground">
                {name}
              </h3>
              <StatusBadge status={meta.status} label={meta.label} size="sm" />
            </div>
            {connector.detail != null && <p className="truncate text-xs text-muted-foreground">{connector.detail}</p>}
          </div>
          <Switch
            size="sm"
            aria-label={`Enable ${name}`}
            checked={Boolean(connector.enabled)}
            disabled={state === "not_configured" || !onEnabledChange}
            onCheckedChange={(v) => onEnabledChange?.(v)}
          />
        </div>

        {failed && (
          <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-xs", toneClasses.soft.destructive)}>
            <RiErrorWarningLine aria-hidden className="mt-px size-4 shrink-0" />
            <p className="min-w-0 break-words font-mono">{connector.error ?? "The connector stopped with an error."}</p>
          </div>
        )}

        {connector.ingressUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-subtle py-1 ps-3 pe-1">
            <span className="shrink-0 text-2xs font-medium uppercase tracking-wide text-muted-foreground">Ingress</span>
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{connector.ingressUrl}</code>
            <CopyButton value={connector.ingressUrl} label="Copy ingress URL" />
          </div>
        )}

        {(onTest || onSaveConfig) && (
          <div className="flex flex-wrap items-center gap-2">
            {onTest && (
              <Button size="xs" variant="secondary" loading={test.busy} onClick={runTest} disabled={state === "not_configured"}>
                Test
              </Button>
            )}
            {onSaveConfig && (
              <Button size="xs" variant="ghost" leadingIcon={<RiSettings3Line aria-hidden />} onClick={() => setOpen(true)}>
                {state === "not_configured" ? "Set up" : "Configure"}
              </Button>
            )}
            <span role="status" className="ms-auto min-w-0 text-xs">
              {result && (
                <span
                  data-result={result.ok ? "ok" : "fail"}
                  className={cn("inline-flex items-center gap-1", toneClasses.text[result.ok ? "success" : "destructive"])}
                >
                  {result.ok ? <RiCheckLine aria-hidden className="size-3.5" /> : <RiCloseLine aria-hidden className="size-3.5" />}
                  {result.message ?? (result.ok ? "Test passed" : "Test failed")}
                  {result.latencyMs != null && <span className="tabular-nums text-muted-foreground"> · {result.latencyMs} ms</span>}
                </span>
              )}
            </span>
          </div>
        )}

        {onSaveConfig && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader icon={<PlatformIcon platform={platform} decorative size="sm" className="border-0 bg-transparent" />}>
                <DialogTitle>Configure {name}</DialogTitle>
                <DialogDescription>Values are stored as environment variables for the gateway.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <PlatformConfigForm
                  platform={platform}
                  fields={configFields}
                  defaultValues={connector.config}
                  onCancel={() => setOpen(false)}
                  onSubmit={async (v) => {
                    await onSaveConfig(v);
                    setOpen(false);
                  }}
                />
              </DialogBody>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }
);
PlatformConnectorCard.displayName = "PlatformConnectorCard";

export type GatewayStatus = "running" | "starting" | "stopped" | "error";

const gatewayMeta: Record<GatewayStatus, { status: StatusBadgeStatus; text: string }> = {
  running: { status: "online", text: "Gateway running" },
  starting: { status: "processing", text: "Gateway starting…" },
  stopped: { status: "offline", text: "Gateway stopped. Channels won't receive messages until it starts." },
  error: { status: "error", text: "Gateway crashed. Check the logs." },
};

export interface PlatformConnectorListProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Connectors to list, one card each. */
  connectors: PlatformConnector[];
  /** Heading of the list. Default "Messaging channels". */
  title?: React.ReactNode;
  /** State of the message gateway; shows a status hint under the heading. */
  gatewayStatus?: GatewayStatus;
  /** Overrides the default gateway hint text. */
  gatewayHint?: React.ReactNode;
  /** Called with the connector id and new state when the user flips a connector's switch. */
  onEnabledChange?: (id: string, enabled: boolean) => void;
  /** Runs a connectivity test for the connector id; shows a Test button on each card when set. */
  onTest?: (id: string) => ConnectorTestResult | Promise<ConnectorTestResult>;
  /** Saves a connector's config form; shows a Configure button on each card when set. */
  onSaveConfig?: (id: string, values: PlatformConfigValues) => void | Promise<void>;
  /** Header actions (e.g. restart gateway). */
  actions?: React.ReactNode;
}

/** Grid of channel connectors with an "N of M configured" header and gateway status hint. */
export const PlatformConnectorList = React.forwardRef<HTMLElement, PlatformConnectorListProps>(
  (
    { connectors, title = "Messaging channels", gatewayStatus, gatewayHint, onEnabledChange, onTest, onSaveConfig, actions, className, ...props },
    ref
  ) => {
    const configured = connectors.filter((c) => c.state !== "not_configured").length;
    const gw = gatewayStatus ? gatewayMeta[gatewayStatus] : null;
    const headingId = React.useId();
    return (
      <section ref={ref} aria-labelledby={headingId} className={cn("flex flex-col gap-4", className)} {...props}>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id={headingId} className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground" data-slot="connector-count">
              <bdi dir="ltr">{configured} of {connectors.length} configured</bdi>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {gw && (
              <p className="flex max-w-xs items-center gap-2 text-xs text-muted-foreground" data-gateway={gatewayStatus}>
                <StatusDot status={gw.status} label="" />
                {gatewayHint ?? gw.text}
              </p>
            )}
            {actions}
          </div>
        </header>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3">
          {connectors.map((c) => (
            <PlatformConnectorCard
              key={c.id}
              connector={c}
              onEnabledChange={onEnabledChange ? (v) => onEnabledChange(c.id, v) : undefined}
              onTest={onTest ? () => onTest(c.id) : undefined}
              onSaveConfig={onSaveConfig ? (v) => onSaveConfig(c.id, v) : undefined}
            />
          ))}
        </div>
      </section>
    );
  }
);
PlatformConnectorList.displayName = "PlatformConnectorList";
