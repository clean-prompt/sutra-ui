import * as React from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiSettings3Line,
  RiShieldUserLine,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useCopy } from "../hooks/use-copy";
import { Button } from "./button";
import { Spinner } from "./spinner";
import { Switch } from "./switch";
import { StatusBadge, StatusDot, type StatusBadgeStatus } from "./status-badge";
import { Input, PasswordInput } from "./input";
import { TagInput } from "./tag-input";
import { Field, FieldError, FieldHint, FieldLabel } from "./field";
import { Checkbox } from "./checkbox";
import { Avatar } from "./avatar";
import { EmptyState } from "./empty-state";
import { QRCode } from "./qr-code";
import { ConfirmDialog, Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";

/* ------------------------------------------------------------------ */
/* Platforms                                                           */
/* ------------------------------------------------------------------ */

export type ChannelPlatform =
  | "telegram"
  | "whatsapp"
  | "slack"
  | "discord"
  | "signal"
  | "matrix"
  | "email"
  | "sms"
  | "imessage"
  | "webhook";

export interface ChannelIdRule {
  /** Pattern a single user / chat id must match. */
  pattern: RegExp;
  /** Human description used in errors, e.g. "numeric chat ID". */
  description: string;
  example: string;
}

export interface ChannelPlatformInfo {
  label: string;
  idRule: ChannelIdRule;
}

const PHONE: ChannelIdRule = { pattern: /^\+?[1-9]\d{6,14}$/, description: "phone number in international format", example: "+14155550123" };
const EMAIL: ChannelIdRule = { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, description: "email address", example: "ada@example.com" };

/** Display names and per-platform user / chat id rules. */
export const channelPlatforms: Record<ChannelPlatform, ChannelPlatformInfo> = {
  telegram: {
    label: "Telegram",
    idRule: { pattern: /^-?\d{5,16}$/, description: "numeric chat ID", example: "123456789 or -1001234567890" },
  },
  whatsapp: { label: "WhatsApp", idRule: PHONE },
  slack: {
    label: "Slack",
    idRule: { pattern: /^[UWCGD][A-Z0-9]{6,12}$/, description: "Slack ID (U…, C…, G… or D…)", example: "U024BE7LH" },
  },
  discord: {
    label: "Discord",
    idRule: { pattern: /^\d{17,20}$/, description: "17–20 digit Discord ID", example: "80351110224678912" },
  },
  signal: { label: "Signal", idRule: PHONE },
  matrix: {
    label: "Matrix",
    idRule: { pattern: /^[@!#][^:\s]+:[^\s]+$/, description: "Matrix ID (@user:server)", example: "@ada:matrix.org" },
  },
  email: { label: "Email", idRule: EMAIL },
  sms: { label: "SMS", idRule: PHONE },
  imessage: {
    label: "iMessage",
    idRule: {
      pattern: new RegExp(`(${PHONE.pattern.source})|(${EMAIL.pattern.source})`),
      description: "phone number or Apple ID email",
      example: "+14155550123",
    },
  },
  webhook: { label: "Webhook", idRule: { pattern: /^\S+$/, description: "caller ID", example: "ci-bot" } },
};

/** Whether `id` is a valid user / chat id for `platform`. */
export function validateChannelId(platform: ChannelPlatform, id: string): boolean {
  return channelPlatforms[platform].idRule.pattern.test(id.trim());
}

function Glyph({ platform }: { platform: ChannelPlatform }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (platform) {
    case "telegram":
      return <path {...common} d="M5 11.5 18.5 6l-2.5 12-4.5-3.5L9 17v-4l6-5" />;
    case "whatsapp":
      return (
        <>
          <path {...common} d="M6.2 17.8 7 15a6.5 6.5 0 1 1 2.4 2.3Z" />
          <path {...common} d="M10 10.5c.4 1.5 1.6 2.7 3.2 3.2" />
        </>
      );
    case "slack":
      return <path {...common} d="M9.5 5v14M14.5 5v14M5 9.5h14M5 14.5h14" />;
    case "discord":
      return (
        <>
          <path {...common} d="M6 8.5c4-2.5 8-2.5 12 0l1 7c-1.2 1.3-2.7 2-4.5 2l-.8-1.5h-3.4l-.8 1.5c-1.8 0-3.3-.7-4.5-2Z" />
          <circle cx="9.8" cy="12.5" r="1.1" fill="currentColor" />
          <circle cx="14.2" cy="12.5" r="1.1" fill="currentColor" />
        </>
      );
    case "signal":
      return (
        <>
          <circle {...common} cx="12" cy="12" r="6.5" strokeDasharray="2.6 2" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
      );
    case "matrix":
      return (
        <>
          <path {...common} d="M7.5 5.5h-2v13h2M16.5 5.5h2v13h-2" />
          <path {...common} d="M9 15v-5m0 1.5c0-1 .7-1.5 1.5-1.5S12 10.5 12 11.5V15m0-3.5c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.5V15" strokeWidth={1.5} />
        </>
      );
    case "email":
      return (
        <>
          <rect {...common} x="4.5" y="6.5" width="15" height="11" rx="2" />
          <path {...common} d="m5 7.5 7 5.5 7-5.5" />
        </>
      );
    case "sms":
      return (
        <>
          <path {...common} d="M5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H7a2 2 0 0 1-2-2Z" />
          <path {...common} d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" strokeWidth={2.4} />
        </>
      );
    case "imessage":
      return (
        <>
          <ellipse {...common} cx="12" cy="11.5" rx="7" ry="5.5" />
          <path {...common} d="M7.5 15.5 6 19l4-2" />
        </>
      );
    case "webhook":
      return (
        <>
          <circle {...common} cx="12" cy="6.5" r="2" />
          <circle {...common} cx="6.5" cy="16.5" r="2" />
          <circle {...common} cx="17.5" cy="16.5" r="2" />
          <path {...common} d="M11 8.3 7.5 14.6M13 8.3l3.5 6.3M8.5 16.5h7" />
        </>
      );
  }
}

const iconSizes = { sm: "size-6 rounded-md [&_svg]:size-4", md: "size-8 rounded-lg [&_svg]:size-5", lg: "size-10 rounded-xl [&_svg]:size-6" };

export interface PlatformIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  platform: ChannelPlatform;
  size?: "sm" | "md" | "lg";
  /** Accessible name. Defaults to the platform name. */
  label?: string;
  /** Hide from assistive tech when the name is already next to it. */
  decorative?: boolean;
}

/** Monochrome glyph tile for a messaging platform (original shapes, not brand logos). */
export const PlatformIcon = React.forwardRef<HTMLSpanElement, PlatformIconProps>(
  ({ platform, size = "md", label, decorative, className, ...props }, ref) => (
    <span
      ref={ref}
      data-platform={platform}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (label ?? channelPlatforms[platform].label)}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-border bg-muted text-foreground",
        iconSizes[size],
        className
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <Glyph platform={platform} />
      </svg>
    </span>
  )
);
PlatformIcon.displayName = "PlatformIcon";

/* ------------------------------------------------------------------ */
/* Config form                                                         */
/* ------------------------------------------------------------------ */

export type PlatformConfigFieldType = "text" | "secret" | "url" | "id" | "allowlist";

export interface PlatformConfigField {
  /** Env-var style key, e.g. `TELEGRAM_BOT_TOKEN`. */
  name: string;
  label: React.ReactNode;
  type?: PlatformConfigFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: React.ReactNode;
  /** Extra pattern for text / secret fields. `id` and `allowlist` use the platform id rule. */
  pattern?: RegExp;
  patternMessage?: string;
}

export type PlatformConfigValues = Record<string, string | string[]>;

/** Default env-var fields for a platform. */
export function platformConfigFields(platform: ChannelPlatform): PlatformConfigField[] {
  const P = platform.toUpperCase();
  const allow: PlatformConfigField = {
    name: `${P}_ALLOWED_USERS`,
    label: "Allowed users",
    type: "allowlist",
    hint: `Paste several at once; commas, spaces and new lines split them. Use ${channelPlatforms[platform].idRule.description}s.`,
  };
  switch (platform) {
    case "telegram":
      return [
        { name: "TELEGRAM_BOT_TOKEN", label: "Bot token", type: "secret", required: true, placeholder: "123456789:AA…", pattern: /^\d{5,}:[\w-]{20,}$/, patternMessage: "Bot tokens look like 123456789:AAE…" },
        { name: "TELEGRAM_HOME_CHANNEL", label: "Home chat ID", type: "id", placeholder: "-1001234567890", hint: "Where the agent posts unprompted messages." },
        allow,
      ];
    case "slack":
      return [
        { name: "SLACK_BOT_TOKEN", label: "Bot token", type: "secret", required: true, placeholder: "xoxb-…", pattern: /^xoxb-/, patternMessage: "Bot tokens start with xoxb-" },
        { name: "SLACK_APP_TOKEN", label: "App token", type: "secret", required: true, placeholder: "xapp-…", pattern: /^xapp-/, patternMessage: "App-level tokens start with xapp-" },
        { name: "SLACK_HOME_CHANNEL", label: "Home channel ID", type: "id", placeholder: "C024BE91L" },
        allow,
      ];
    case "discord":
      return [
        { name: "DISCORD_BOT_TOKEN", label: "Bot token", type: "secret", required: true },
        { name: "DISCORD_HOME_CHANNEL", label: "Home channel ID", type: "id", placeholder: "80351110224678912" },
        allow,
      ];
    case "signal":
      return [
        { name: "SIGNAL_ACCOUNT", label: "Signal number", type: "id", required: true, placeholder: "+14155550123" },
        { name: "SIGNAL_HTTP_URL", label: "signal-cli REST URL", type: "url", placeholder: "http://127.0.0.1:8080" },
        allow,
      ];
    case "matrix":
      return [
        { name: "MATRIX_HOMESERVER", label: "Homeserver", type: "url", required: true, placeholder: "https://matrix.org" },
        { name: "MATRIX_USER_ID", label: "Bot user ID", type: "id", required: true, placeholder: "@sutra:matrix.org" },
        { name: "MATRIX_ACCESS_TOKEN", label: "Access token", type: "secret", required: true },
        allow,
      ];
    case "email":
      return [
        { name: "EMAIL_ADDRESS", label: "Address", type: "id", required: true, placeholder: "agent@example.com" },
        { name: "EMAIL_PASSWORD", label: "App password", type: "secret", required: true },
        { name: "EMAIL_IMAP_HOST", label: "IMAP host", type: "text", placeholder: "imap.example.com" },
        allow,
      ];
    case "sms":
      return [
        { name: "TWILIO_ACCOUNT_SID", label: "Account SID", type: "text", required: true, placeholder: "AC…", pattern: /^AC[0-9a-fA-F]{32}$/, patternMessage: "Account SIDs are AC followed by 32 hex characters" },
        { name: "TWILIO_AUTH_TOKEN", label: "Auth token", type: "secret", required: true },
        { name: "SMS_FROM_NUMBER", label: "From number", type: "id", required: true, placeholder: "+14155550123" },
        allow,
      ];
    case "webhook":
      return [{ name: "WEBHOOK_SECRET", label: "Signing secret", type: "secret", required: true, hint: "Requests must carry an HMAC signature made with this secret." }];
    default:
      return [allow];
  }
}

function fieldError(platform: ChannelPlatform, field: PlatformConfigField, value: string | string[] | undefined): string | null {
  const type = field.type ?? "text";
  if (type === "allowlist") {
    const list = Array.isArray(value) ? value : [];
    if (field.required && list.length === 0) return "Add at least one user.";
    const bad = list.find((v) => !validateChannelId(platform, v));
    return bad ? `"${bad}" isn't a valid ${channelPlatforms[platform].idRule.description}.` : null;
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return field.required ? "Required." : null;
  if (type === "id" && !validateChannelId(platform, text)) {
    const rule = channelPlatforms[platform].idRule;
    return `Enter a ${rule.description}, e.g. ${rule.example}.`;
  }
  if (type === "url" && !/^https?:\/\/\S+$/.test(text)) return "Enter a URL starting with http:// or https://.";
  if (field.pattern && !field.pattern.test(text)) return field.patternMessage ?? "Invalid format.";
  return null;
}

export interface PlatformConfigFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  platform: ChannelPlatform;
  /** Defaults to `platformConfigFields(platform)`. */
  fields?: PlatformConfigField[];
  defaultValues?: PlatformConfigValues;
  /** Called with valid values. May return a promise; the button shows a spinner until it settles. */
  onSubmit?: (values: PlatformConfigValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: React.ReactNode;
}

/** Env-var style settings form for a channel, with per-platform ID validation and paste-splitting allowlists. */
export const PlatformConfigForm = React.forwardRef<HTMLFormElement, PlatformConfigFormProps>(
  ({ platform, fields: fieldsProp, defaultValues, onSubmit, onCancel, submitLabel = "Save", className, ...props }, ref) => {
    const fields = React.useMemo(() => fieldsProp ?? platformConfigFields(platform), [fieldsProp, platform]);
    const [values, setValues] = React.useState<PlatformConfigValues>(() => ({ ...defaultValues }));
    const [errors, setErrors] = React.useState<Record<string, string | null>>({});
    const [rejects, setRejects] = React.useState<Record<string, string | null>>({});
    const [saving, setSaving] = React.useState(false);
    const rejectRef = React.useRef<Record<string, string | null>>({});

    const set =(name: string, v: string | string[]) => {
      setValues((prev) => ({ ...prev, [name]: v }));
      if (errors[name]) setErrors((e) => ({ ...e, [name]: null }));
    };
    const check = (f: PlatformConfigField) => setErrors((e) => ({ ...e, [f.name]: fieldError(platform, f, values[f.name]) }));

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const next: Record<string, string | null> = {};
      for (const f of fields) next[f.name] = fieldError(platform, f, values[f.name]);
      setErrors(next);
      if (Object.values(next).some(Boolean)) return;
      try {
        setSaving(true);
        await onSubmit?.(values);
      } finally {
        setSaving(false);
      }
    };

    return (
      <form ref={ref} noValidate onSubmit={submit} className={cn("flex flex-col gap-4", className)} {...props}>
        {fields.map((f) => {
          const type = f.type ?? "text";
          const err = errors[f.name] ?? rejects[f.name] ?? null;
          const strVal = typeof values[f.name] === "string" ? (values[f.name] as string) : "";
          return (
            <Field key={f.name} invalid={Boolean(err)} required={f.required}>
              <FieldLabel>
                {f.label} <code className="ml-1 font-mono text-2xs font-normal text-muted-foreground">{f.name}</code>
              </FieldLabel>
              {type === "allowlist" ? (
                <TagInput
                  value={Array.isArray(values[f.name]) ? (values[f.name] as string[]) : []}
                  onValueChange={(v) => {
                    set(f.name, v);
                    setRejects((r) => ({ ...r, [f.name]: rejectRef.current[f.name] ?? null }));
                  }}
                  separators={[",", " ", ";"]}
                  addOnBlur
                  validate={(t) => validateChannelId(platform, t)}
                  onReject={(t, reason) => {
                    const msg =
                      reason === "duplicate"
                        ? `"${t}" is already in the list.`
                        : `"${t}" isn't a valid ${channelPlatforms[platform].idRule.description}.`;
                    rejectRef.current[f.name] = msg;
                    queueMicrotask(() => {
                      rejectRef.current[f.name] = null;
                    });
                    setRejects((r) => ({ ...r, [f.name]: msg }));
                  }}
                  placeholder={f.placeholder ?? channelPlatforms[platform].idRule.example}
                />
              ) : type === "secret" ? (
                <PasswordInput
                  autoComplete="off"
                  value={strVal}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                  onBlur={() => check(f)}
                />
              ) : (
                <Input
                  value={strVal}
                  inputMode={type === "id" && platform === "telegram" ? "numeric" : undefined}
                  type={type === "url" ? "url" : "text"}
                  className={type === "id" ? "font-mono" : undefined}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                  onBlur={() => check(f)}
                />
              )}
              {f.hint && !err && <FieldHint>{f.hint}</FieldHint>}
              <FieldError>{err}</FieldError>
            </Field>
          );
        })}
        <div className="flex justify-end gap-2 pt-1">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    );
  }
);
PlatformConfigForm.displayName = "PlatformConfigForm";

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
  connector: PlatformConnector;
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
    const [testing, setTesting] = React.useState(false);
    const [result, setResult] = React.useState<ConnectorTestResult | null>(null);
    const [open, setOpen] = React.useState(false);
    const { copied, copy } = useCopy();
    const failed = state === "fatal" || state === "startup_failed";
    const titleId = React.useId();

    const runTest = async () => {
      if (!onTest) return;
      setTesting(true);
      setResult(null);
      try {
        setResult(await onTest());
      } catch (e) {
        setResult({ ok: false, message: e instanceof Error ? e.message : "Test failed" });
      } finally {
        setTesting(false);
      }
    };

    return (
      <div
        ref={ref}
        data-slot="platform-connector-card"
        data-state={state}
        role="group"
        aria-labelledby={titleId}
        className={cn("flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <PlatformIcon platform={platform} decorative />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={titleId} className="text-sm font-semibold text-foreground">
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
          <div className="flex items-start gap-2 rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-px size-4 shrink-0" />
            <p className="min-w-0 break-words font-mono">{connector.error ?? "The connector stopped with an error."}</p>
          </div>
        )}

        {connector.ingressUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-subtle py-1 pl-3 pr-1">
            <span className="shrink-0 text-2xs font-medium uppercase tracking-wide text-muted-foreground">Ingress</span>
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{connector.ingressUrl}</code>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={copied ? "Copied" : "Copy ingress URL"}
              onClick={() => copy(connector.ingressUrl!)}
            >
              {copied ? <RiCheckLine /> : <RiFileCopyLine />}
            </Button>
          </div>
        )}

        {(onTest || onSaveConfig) && (
          <div className="flex flex-wrap items-center gap-2">
            {onTest && (
              <Button size="xs" variant="secondary" loading={testing} onClick={runTest} disabled={state === "not_configured"}>
                Test
              </Button>
            )}
            {onSaveConfig && (
              <Button size="xs" variant="ghost" leadingIcon={<RiSettings3Line />} onClick={() => setOpen(true)}>
                {state === "not_configured" ? "Set up" : "Configure"}
              </Button>
            )}
            <span role="status" className="ml-auto min-w-0 text-xs">
              {result && (
                <span
                  data-result={result.ok ? "ok" : "fail"}
                  className={cn("inline-flex items-center gap-1", result.ok ? "text-success" : "text-destructive")}
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
  connectors: PlatformConnector[];
  title?: React.ReactNode;
  gatewayStatus?: GatewayStatus;
  /** Overrides the default gateway hint text. */
  gatewayHint?: React.ReactNode;
  onEnabledChange?: (id: string, enabled: boolean) => void;
  onTest?: (id: string) => ConnectorTestResult | Promise<ConnectorTestResult>;
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
              {configured} of {connectors.length} configured
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
        <div className="grid gap-3 sm:grid-cols-2">
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

/* ------------------------------------------------------------------ */
/* RotatingQRPairing                                                   */
/* ------------------------------------------------------------------ */

export type QRPairingPhase = "installing" | "waiting" | "connected" | "expired" | "error";

export interface RotatingQRPayload {
  value: string;
  /** New deadline for this code (ms epoch). */
  expiresAt?: number;
  /** The device finished pairing. */
  connected?: boolean;
}

export type RotatingQRPollResult = string | RotatingQRPayload | null | undefined;

function fmtCountdown(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface RotatingQRPairingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Polled while waiting for a scan. Return the current pairing payload (or `{ connected: true }`). */
  getPayload: () => RotatingQRPollResult | Promise<RotatingQRPollResult>;
  /** Poll interval in ms. Default 2000. */
  pollInterval?: number;
  phase?: QRPairingPhase;
  defaultPhase?: QRPairingPhase;
  onPhaseChange?: (phase: QRPairingPhase) => void;
  /** Absolute deadline (ms epoch) for the whole pairing session. */
  expiresAt?: number;
  /** Session lifetime in seconds, restarted on refresh. Ignored when `expiresAt` is set. */
  ttl?: number;
  /** Called by the Refresh / Retry button, after the phase returns to waiting. */
  onRefresh?: () => void;
  onConnected?: () => void;
  error?: React.ReactNode;
  title?: React.ReactNode;
  caption?: React.ReactNode;
  installingLabel?: React.ReactNode;
  connectedLabel?: React.ReactNode;
  size?: number;
}

/** Live pairing QR: polls a rotating payload, crossfades on change, counts down and walks through pairing phases. */
export const RotatingQRPairing = React.forwardRef<HTMLDivElement, RotatingQRPairingProps>(
  (
    {
      getPayload,
      pollInterval = 2000,
      phase: phaseProp,
      defaultPhase = "waiting",
      onPhaseChange,
      expiresAt,
      ttl,
      onRefresh,
      onConnected,
      error,
      title = "Scan to link",
      caption,
      installingLabel = "Installing the bridge…",
      connectedLabel = "Device linked",
      size = 192,
      className,
      ...props
    },
    ref
  ) => {
    const [phase, setPhase] = useControllableState<QRPairingPhase>({ value: phaseProp, defaultValue: defaultPhase, onChange: onPhaseChange });
    const [layers, setLayers] = React.useState<{ key: number; value: string }[]>([]);
    const [deadline, setDeadline] = React.useState<number | null>(() =>
      expiresAt ?? (ttl != null ? Date.now() + ttl * 1000 : null)
    );
    const [now, setNow] = React.useState(() => Date.now());
    const keyRef = React.useRef(0);
    const currentRef = React.useRef<string | null>(null);
    const getRef = React.useRef(getPayload);
    getRef.current = getPayload;
    const connectedRef = React.useRef(onConnected);
    connectedRef.current = onConnected;

    React.useEffect(() => {
      if (expiresAt != null) setDeadline(expiresAt);
    }, [expiresAt]);

    const apply = React.useCallback(
      (r: RotatingQRPollResult) => {
        if (r == null) return;
        const p: RotatingQRPayload = typeof r === "string" ? { value: r } : r;
        if (p.connected) {
          setPhase("connected");
          connectedRef.current?.();
          return;
        }
        if (p.expiresAt != null) setDeadline(p.expiresAt);
        if (p.value && p.value !== currentRef.current) {
          currentRef.current = p.value;
          const key = ++keyRef.current;
          setLayers((ls) => [...ls.slice(-1), { key, value: p.value }]);
        }
      },
      [setPhase]
    );

    React.useEffect(() => {
      if (phase !== "waiting") return;
      let alive = true;
      const poll = () => {
        let r: RotatingQRPollResult | Promise<RotatingQRPollResult>;
        try {
          r = getRef.current();
        } catch {
          return;
        }
        if (r && typeof (r as Promise<RotatingQRPollResult>).then === "function") {
          (r as Promise<RotatingQRPollResult>).then((v) => alive && apply(v)).catch(() => {});
        } else apply(r as RotatingQRPollResult);
      };
      poll();
      const id = setInterval(poll, pollInterval);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [phase, pollInterval, apply]);

    React.useEffect(() => {
      if (layers.length < 2) return;
      const t = setTimeout(() => setLayers((ls) => ls.slice(-1)), 500);
      return () => clearTimeout(t);
    }, [layers]);

    React.useEffect(() => {
      if (deadline == null || phase !== "waiting") return;
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, [deadline, phase]);

    const remaining = deadline != null ? (deadline - now) / 1000 : null;
    React.useEffect(() => {
      if (phase === "waiting" && remaining != null && remaining <= 0) setPhase("expired");
    }, [phase, remaining, setPhase]);

    const refresh = () => {
      currentRef.current = null;
      setLayers([]);
      if (expiresAt == null && ttl != null) setDeadline(Date.now() + ttl * 1000);
      setNow(Date.now());
      setPhase("waiting");
      onRefresh?.();
    };

    const showQR = phase === "waiting" || phase === "expired";

    return (
      <div
        ref={ref}
        data-slot="rotating-qr-pairing"
        data-phase={phase}
        className={cn(
          "flex w-full max-w-xs flex-col items-center gap-4 rounded-box border border-border bg-card p-5 text-center shadow-xs",
          className
        )}
        {...props}
      >
        {title != null && <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>}
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-black/5"
          style={{ width: size + 8, height: size + 8 }}
        >
          {showQR &&
            layers.map((l, i) => (
              <span
                key={l.key}
                data-payload={i === layers.length - 1 ? l.value : undefined}
                aria-hidden={i !== layers.length - 1 || undefined}
                className={cn(
                  "absolute inset-1 transition-[filter,opacity] duration-300",
                  i === layers.length - 1 && layers.length > 1 && "animate-in fade-in-0 duration-500",
                  phase === "expired" && "opacity-40 blur-[3px]"
                )}
              >
                <QRCode value={l.value} size={size} quietZone={2} title="Pairing QR code" />
              </span>
            ))}
          {phase === "waiting" && layers.length === 0 && <Spinner label="Generating code" className="text-muted-foreground" />}
          {phase === "installing" && (
            <div className="flex flex-col items-center gap-3 p-4 text-sm text-neutral-600">
              <Spinner label="" />
              <span>{installingLabel}</span>
            </div>
          )}
          {phase === "connected" && (
            <div className="flex flex-col items-center gap-2 p-4 text-neutral-900">
              <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
                <RiCheckLine aria-hidden className="size-7" />
              </span>
              <span className="text-sm font-semibold">{connectedLabel}</span>
            </div>
          )}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-2 p-4 text-neutral-900">
              <RiErrorWarningLine aria-hidden className="size-8 text-destructive" />
              <span className="text-sm font-semibold">Pairing failed</span>
            </div>
          )}
          {phase === "expired" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 p-4">
              <p className="text-sm font-semibold text-neutral-900">Code expired</p>
              <Button size="sm" leadingIcon={<RiRefreshLine />} onClick={refresh}>
                Refresh code
              </Button>
            </div>
          )}
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {phase === "installing" ? "Installing" : phase === "waiting" ? "Waiting for scan" : phase === "connected" ? "Connected" : phase === "expired" ? "Pairing code expired" : "Pairing failed"}
        </div>
        {phase === "error" ? (
          <div className="flex flex-col items-center gap-2">
            {error != null && <p className="text-sm text-destructive">{error}</p>}
            <Button size="sm" variant="secondary" leadingIcon={<RiRefreshLine />} onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : phase === "waiting" ? (
          <>
            {caption != null && <p className="text-sm text-muted-foreground">{caption}</p>}
            {remaining != null && (
              <p
                role="timer"
                aria-live="off"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium tabular-nums",
                  remaining <= 30 ? "text-warning" : "text-muted-foreground"
                )}
              >
                <RiTimeLine aria-hidden className="size-3.5" />
                Expires in {fmtCountdown(remaining)}
              </p>
            )}
          </>
        ) : null}
      </div>
    );
  }
);
RotatingQRPairing.displayName = "RotatingQRPairing";

/* ------------------------------------------------------------------ */
/* GuidedSetupSteps                                                    */
/* ------------------------------------------------------------------ */

export interface GuidedSetupStep {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A value to copy (command, bot name, URL). */
  copyValue?: string;
  copyLabel?: string;
  /** External link for this step. Opens in a new tab. */
  href?: string;
  linkLabel?: React.ReactNode;
  /** Extra content (e.g. an input). */
  content?: React.ReactNode;
  /** Label for the completion check. Default "I did this". */
  confirmLabel?: React.ReactNode;
}

export interface GuidedSetupStepsProps extends Omit<React.HTMLAttributes<HTMLOListElement>, "defaultValue"> {
  steps: GuidedSetupStep[];
  /** Ids of completed steps. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (ids: string[]) => void;
  /** Fired once every step is checked. */
  onComplete?: () => void;
}

function StepCopy({ value, label }: { value: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex max-w-full items-center gap-1 rounded-lg border border-border bg-subtle py-1 pl-2.5 pr-1">
      <code className="min-w-0 truncate font-mono text-xs text-foreground">{value}</code>
      <Button variant="ghost" size="icon-xs" aria-label={copied ? "Copied" : (label ?? `Copy ${value}`)} onClick={() => copy(value)}>
        {copied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  );
}

/** Numbered onboarding checklist with copyable values, external links and "I did this" checks. */
export const GuidedSetupSteps = React.forwardRef<HTMLOListElement, GuidedSetupStepsProps>(
  ({ steps, value, defaultValue = [], onValueChange, onComplete, className, ...props }, ref) => {
    const [done, setDone] = useControllableState<string[]>({ value, defaultValue, onChange: onValueChange });
    const currentIdx = steps.findIndex((s) => !done.includes(s.id));
    const completeRef = React.useRef(onComplete);
    completeRef.current = onComplete;

    const toggle = (id: string, on: boolean) => {
      const next = on ? [...done.filter((d) => d !== id), id] : done.filter((d) => d !== id);
      setDone(next);
      if (on && steps.every((s) => next.includes(s.id))) completeRef.current?.();
    };

    return (
      <ol ref={ref} data-slot="guided-setup-steps" className={cn("flex flex-col", className)} {...props}>
        {steps.map((s, i) => {
          const isDone = done.includes(s.id);
          const isCurrent = i === currentIdx;
          const last = i === steps.length - 1;
          return (
            <li
              key={s.id}
              data-done={isDone || undefined}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {!last && (
                <span aria-hidden className={cn("absolute left-3.5 top-8 bottom-1 w-px -translate-x-1/2", isDone ? "bg-primary" : "bg-border")} />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors",
                  isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary-soft text-primary-soft-foreground"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {isDone ? <RiCheckLine className="size-4" /> : i + 1}
              </span>
              <div className={cn("flex min-w-0 flex-1 flex-col gap-2 pt-0.5", !isDone && !isCurrent && "opacity-75")}>
                <div>
                  <p className={cn("text-sm font-medium text-foreground", isDone && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </p>
                  {s.description != null && <p className="text-sm text-muted-foreground">{s.description}</p>}
                </div>
                {(s.copyValue || s.href) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {s.copyValue && <StepCopy value={s.copyValue} label={s.copyLabel} />}
                    {s.href && (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={cn("inline-flex items-center gap-1 rounded-xs text-sm font-medium text-primary hover:underline", focusRing)}
                      >
                        {s.linkLabel ?? "Open"}
                        <RiExternalLinkLine aria-hidden className="size-3.5" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                )}
                {s.content}
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox size="sm" checked={isDone} onCheckedChange={(v) => toggle(s.id, v === true)} />
                  {s.confirmLabel ?? "I did this"}
                </label>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }
);
GuidedSetupSteps.displayName = "GuidedSetupSteps";

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

/** Compact relative time ("just now", "5m ago", "3h ago", "2d ago"). */
export function formatChannelAgo(at: Date | number | string, now: number = Date.now()): string {
  const t = at instanceof Date ? at.getTime() : typeof at === "number" ? at : new Date(at).getTime();
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export interface AccessRequestQueueProps extends React.HTMLAttributes<HTMLDivElement> {
  requests: AccessRequest[];
  approved?: ApprovedChannelUser[];
  onApprove?: (id: string) => void | Promise<void>;
  onDeny?: (id: string) => void | Promise<void>;
  onRevoke?: (id: string) => void | Promise<void>;
  /** Reference time for relative stamps (tests / SSR). */
  now?: number;
  emptyHint?: React.ReactNode;
}

/** Pending pairing requests with approve / deny, plus approved users with confirm-to-revoke. */
export const AccessRequestQueue = React.forwardRef<HTMLDivElement, AccessRequestQueueProps>(
  ({ requests, approved = [], onApprove, onDeny, onRevoke, now, emptyHint, className, ...props }, ref) => {
    const pendingId = React.useId();
    const approvedId = React.useId();
    const ref0 = now ?? Date.now();
    return (
      <div ref={ref} data-slot="access-request-queue" className={cn("flex flex-col gap-5", className)} {...props}>
        <section aria-labelledby={pendingId} className="flex flex-col gap-2">
          <h3 id={pendingId} className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Pending requests
            {requests.length > 0 && (
              <span className="rounded-full bg-warning-soft px-1.5 text-2xs font-semibold tabular-nums text-warning-soft-foreground">
                {requests.length}
              </span>
            )}
          </h3>
          {requests.length === 0 ? (
            <EmptyState
              size="sm"
              variant="dashed"
              icon={<RiShieldUserLine />}
              title="No pending requests"
              description={emptyHint ?? "When someone messages your agent, they get a pairing code that shows up here."}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5" aria-label={`${r.name ?? r.handle} on ${channelPlatforms[r.platform].label}`}>
                  <span className="relative">
                    <Avatar size="sm" src={r.avatarUrl} name={r.name ?? r.handle} />
                    <PlatformIcon platform={r.platform} size="sm" className="absolute -bottom-1 -right-1 size-4 rounded-sm bg-background [&_svg]:size-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.name ?? r.handle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.name ? `${r.handle} · ` : ""}
                      {formatChannelAgo(r.requestedAt, ref0)}
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
                    {u.approvedAt != null && <p className="text-xs text-muted-foreground">Approved {formatChannelAgo(u.approvedAt, ref0)}</p>}
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
