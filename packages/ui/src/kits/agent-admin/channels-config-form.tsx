/** Channel platform config form: `platformConfigFields` and the PlatformConfigForm. */
import * as React from "react";
import { cn } from "../../lib/cn";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { Input, PasswordInput } from "../../primitives/input";
import { TagInput } from "../../primitives/tag-input";
import { Field, FieldError, FieldHint, FieldLabel } from "../../primitives/field";
import { type ChannelPlatform, channelPlatforms, validateChannelId } from "./channels-model";

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
  /** Messaging platform being configured; picks the default fields. */
  platform: ChannelPlatform;
  /** Defaults to `platformConfigFields(platform)`. */
  fields?: PlatformConfigField[];
  /** Initial field values keyed by field id. */
  defaultValues?: PlatformConfigValues;
  /** Called with valid values. May return a promise; the button shows a spinner until it settles. */
  onSubmit?: (values: PlatformConfigValues) => void | Promise<void>;
  /** Called when the user presses Cancel; the button is hidden when unset. */
  onCancel?: () => void;
  /** Label of the submit button. */
  submitLabel?: React.ReactNode;
}

/** Env-var style settings form for a channel, with per-platform ID validation and paste-splitting allowlists. */
export const PlatformConfigForm = React.forwardRef<HTMLFormElement, PlatformConfigFormProps>(
  ({ platform, fields: fieldsProp, defaultValues, onSubmit, onCancel, submitLabel = "Save", className, ...props }, ref) => {
    const fields = React.useMemo(() => fieldsProp ?? platformConfigFields(platform), [fieldsProp, platform]);
    const [values, setValues] = React.useState<PlatformConfigValues>(() => ({ ...defaultValues }));
    const [errors, setErrors] = React.useState<Record<string, string | null>>({});
    const [rejects, setRejects] = React.useState<Record<string, string | null>>({});
    const save = useAsyncAction(async (v: PlatformConfigValues) => onSubmit?.(v), { fallbackMessage: "Could not save the settings" });
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
      await save.run(values);
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
                {f.label} <code className="ms-1 font-mono text-2xs font-normal text-muted-foreground">{f.name}</code>
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
          {save.error && (
            <p role="alert" className="me-auto self-center text-sm text-destructive">
              {save.error}
            </p>
          )}
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={save.busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    );
  }
);
PlatformConfigForm.displayName = "PlatformConfigForm";
