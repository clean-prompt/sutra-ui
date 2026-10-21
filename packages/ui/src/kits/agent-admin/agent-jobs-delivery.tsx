/** Delivery targets for agent jobs: platform metadata, icon, issue checks and the target picker. */
import * as React from "react";
import {
  type RemixiconComponentType,
  RiDiscordFill,
  RiErrorWarningLine,
  RiGithubFill,
  RiInboxLine,
  RiMailLine,
  RiSlackFill,
  RiTelegramFill,
  RiWebhookLine,
  RiWhatsappFill,
} from "@remixicon/react";
import { accentClasses } from "../../lib/accent";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import type { DeliveryPlatform, DeliveryPlatformStatus, DeliveryTarget } from "./agent-jobs-model";

/* ------------------------------------------------------------------ */
/* Delivery targets                                                    */
/* ------------------------------------------------------------------ */

interface PlatformMeta {
  label: string;
  icon: RemixiconComponentType;
  tint: string;
  field?: { label: string; placeholder: string; type?: string };
  /** Has a "home channel" fallback. */
  home: boolean;
}

export const deliveryPlatformMeta: Record<DeliveryPlatform, PlatformMeta> = {
  local: { label: "Inbox", icon: RiInboxLine, tint: "bg-muted text-foreground", home: false },
  telegram: { label: "Telegram", icon: RiTelegramFill, tint: `${accentClasses.chip} [--sutra-accent:var(--chart-2)]`, field: { label: "Chat ID", placeholder: "-1001234567890" }, home: true },
  discord: { label: "Discord", icon: RiDiscordFill, tint: `${accentClasses.chip} [--sutra-accent:var(--chart-1)]`, field: { label: "Channel ID", placeholder: "112233445566778899" }, home: true },
  slack: { label: "Slack", icon: RiSlackFill, tint: `${accentClasses.chip} [--sutra-accent:var(--chart-6)]`, field: { label: "Channel", placeholder: "#general" }, home: true },
  whatsapp: { label: "WhatsApp", icon: RiWhatsappFill, tint: `${accentClasses.chip} [--sutra-accent:var(--chart-5)]`, field: { label: "Phone number", placeholder: "+15551234567", type: "tel" }, home: true },
  email: { label: "Email", icon: RiMailLine, tint: `${accentClasses.chip} [--sutra-accent:var(--chart-3)]`, field: { label: "Email address", placeholder: "me@example.com", type: "email" }, home: true },
  github: { label: "GitHub comment", icon: RiGithubFill, tint: "bg-muted text-foreground", field: { label: "Issue or PR", placeholder: "owner/repo#123" }, home: true },
  webhook: { label: "Webhook", icon: RiWebhookLine, tint: `${accentClasses.chip} [--sutra-accent:var(--chart-4)]`, field: { label: "URL", placeholder: "https://example.com/hook", type: "url" }, home: false },
};

const ALL_PLATFORMS: DeliveryPlatform[] = ["local", "telegram", "discord", "slack", "whatsapp", "email", "github", "webhook"];

export interface DeliveryPlatformIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Delivery platform whose logo to draw. */
  platform: DeliveryPlatform;
  /** Icon box size of the logo. */
  size?: "sm" | "md";
}

/** Tinted platform glyph (decorative). */
export const DeliveryPlatformIcon = React.forwardRef<HTMLSpanElement, DeliveryPlatformIconProps>(function DeliveryPlatformIcon(
  { platform, size = "md", className, ...props },
  ref
) {
  const meta = deliveryPlatformMeta[platform];
  const Icon = meta.icon;
  return (
    <span
      ref={ref}
      data-slot="delivery-platform-icon"
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md", size === "sm" ? "size-5 [&_svg]:size-3" : "size-7 [&_svg]:size-4", meta.tint, className)}
      {...props}
    >
      <Icon />
    </span>
  );
});
DeliveryPlatformIcon.displayName = "DeliveryPlatformIcon";

/** Why a target can't deliver yet, or `null`. */
export function deliveryTargetIssue(target: DeliveryTarget, status?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>): string | null {
  const meta = deliveryPlatformMeta[target.platform];
  const s = status?.[target.platform];
  if (s?.disabledReason) return s.disabledReason;
  if (s?.configured === false) return `${meta.label} is not connected`;
  if (!meta.field || target.destination?.trim()) return null;
  if (meta.home && !s?.homeChannel) return "Needs a home channel — set one in Channels";
  if (!meta.home) return `Enter a ${meta.field.label.toLowerCase()}`;
  return null;
}

/** Human label for a target, e.g. "Slack · #ops" or "Telegram (home channel)". */
export function formatDeliveryTarget(target: DeliveryTarget, status?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>) {
  const meta = deliveryPlatformMeta[target.platform];
  if (!meta.field) return meta.label;
  const dest = target.destination?.trim() || status?.[target.platform]?.homeChannel;
  return dest ? `${meta.label} · ${dest}` : `${meta.label} (home channel)`;
}

export interface DeliveryTargetPickerProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  /** Controlled delivery target (platform and optional channel). */
  value?: DeliveryTarget;
  /** Initial target when `value` is not controlled. */
  defaultValue?: DeliveryTarget;
  /** Called with the new target when the user changes the platform or channel. */
  onValueChange?: (value: DeliveryTarget) => void;
  /** Platforms offered, in order. */
  platforms?: DeliveryPlatform[];
  /** Per-platform connection state and home channel. */
  status?: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>;
  /** Shows a "Channels" button in the home-channel warning. */
  onConfigureChannels?: () => void;
  /** Legend of the field set. */
  legend?: React.ReactNode;
  /** Disables every option. */
  disabled?: boolean;
}

/** Where a job's results go: the local inbox, a messaging platform, an email, a GitHub comment or a webhook. */
export const DeliveryTargetPicker = React.forwardRef<HTMLFieldSetElement, DeliveryTargetPickerProps>(
  (
    { value: valueProp, defaultValue = { platform: "local" }, onValueChange, platforms = ALL_PLATFORMS, status, onConfigureChannels, legend = "Deliver to", disabled, className, ...props },
    ref
  ) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const id = React.useId();
    const meta = deliveryPlatformMeta[value.platform];
    const s = status?.[value.platform];
    const issue = deliveryTargetIssue(value, status);
    const destId = `${id}-dest`;
    const warnId = `${id}-warn`;

    return (
      <fieldset ref={ref} data-slot="delivery-target-picker" disabled={disabled} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
        <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {platforms.map((p) => {
            const pm = deliveryPlatformMeta[p];
            const ps = status?.[p];
            const reason = ps?.disabledReason ?? (ps?.configured === false ? "Not connected" : undefined);
            const checked = value.platform === p;
            return (
              <label
                key={p}
                className={cn(
                  "relative flex min-w-0 cursor-pointer items-center gap-2 rounded-box border bg-background p-2 text-sm transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background",
                  checked ? "border-primary bg-primary-soft/40" : "border-border hover:bg-accent",
                  reason && "cursor-not-allowed opacity-60 hover:bg-background"
                )}
              >
                <input
                  type="radio"
                  name={`${id}-platform`}
                  value={p}
                  checked={checked}
                  disabled={!!reason || disabled}
                  aria-describedby={reason ? `${id}-${p}-reason` : undefined}
                  onChange={() => setValue({ platform: p, destination: p === value.platform ? value.destination : "" })}
                  className="sr-only"
                />
                <DeliveryPlatformIcon platform={p} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{pm.label}</span>
                  {reason ? (
                    <span id={`${id}-${p}-reason`} className="truncate text-2xs text-muted-foreground">
                      {reason}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        {meta.field ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={destId} className="text-sm font-medium">
              {meta.field.label}
              {meta.home ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
            </label>
            <Input
              id={destId}
              size="sm"
              type={meta.field.type ?? "text"}
              value={value.destination ?? ""}
              placeholder={s?.homeChannel ? `Home channel: ${s.homeChannel}` : meta.field.placeholder}
              aria-describedby={issue ? warnId : undefined}
              onChange={(e) => setValue({ ...value, destination: e.target.value })}
            />
          </div>
        ) : null}
        {issue ? (
          <div id={warnId} role="status" className="flex items-start gap-2 rounded-box bg-warning-soft p-2.5 text-sm text-warning-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{issue}</span>
            {onConfigureChannels && issue.includes("Channels") ? (
              <Button type="button" size="xs" variant="outline" onClick={onConfigureChannels}>
                Channels
              </Button>
            ) : null}
          </div>
        ) : null}
      </fieldset>
    );
  }
);
DeliveryTargetPicker.displayName = "DeliveryTargetPicker";
