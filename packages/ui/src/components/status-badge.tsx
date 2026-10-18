import * as React from "react";
import { cn } from "../lib/cn";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";

export type StatusBadgeStatus =
  | "online"
  | "offline"
  | "busy"
  | "away"
  | "active"
  | "inactive"
  | "pending"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "draft"
  | "processing";

const statusMeta: Record<StatusBadgeStatus, { label: string; tone: Tone }> = {
  online: { label: "Online", tone: "success" },
  offline: { label: "Offline", tone: "neutral" },
  busy: { label: "Busy", tone: "destructive" },
  away: { label: "Away", tone: "warning" },
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  success: { label: "Success", tone: "success" },
  error: { label: "Error", tone: "destructive" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "info" },
  draft: { label: "Draft", tone: "neutral" },
  processing: { label: "Processing", tone: "primary" },
};

/** Resolve the colour for a dot/badge: an explicit `tone` wins over the preset `status`. */
function resolveTone(status: StatusBadgeStatus | undefined, tone: ToneInput | undefined): Tone {
  if (tone) return normalizeTone(tone);
  return status ? statusMeta[status].tone : "neutral";
}

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Preset status (sets colour and default label). Optional when `tone` is given. */
  status?: StatusBadgeStatus;
  /** Open semantic colour; overrides the preset status colour. */
  tone?: ToneInput;
  /** Animated halo. Defaults to true for `processing`. */
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  /** Accessible label; defaults to the status name. Set to "" to hide from assistive tech. */
  label?: string;
}

/** Small colored dot indicating a status. */
export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ className, status, tone, pulse, size = "md", label, ...props }, ref) => {
    const dot = toneClasses.dot[resolveTone(status, tone)];
    const animate = pulse ?? status === "processing";
    const text = label ?? (status ? statusMeta[status].label : "");
    return (
      <span
        ref={ref}
        role={text ? "img" : undefined}
        aria-label={text || undefined}
        aria-hidden={text ? undefined : true}
        className={cn(
          "relative inline-flex shrink-0 rounded-full",
          size === "sm" ? "size-1.5" : size === "md" ? "size-2" : "size-2.5",
          className
        )}
        {...props}
      >
        {animate ? (
          <span
            className={cn(
              "absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping",
              dot
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex size-full rounded-full", dot)} />
      </span>
    );
  }
);
StatusDot.displayName = "StatusDot";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Preset status (sets colour and default label). Optional when `tone` is given. */
  status?: StatusBadgeStatus;
  /** Open semantic colour; overrides the preset status colour. */
  tone?: ToneInput;
  /** Custom text; defaults to the status name. */
  label?: React.ReactNode;
  pulse?: boolean;
  /** soft: tinted pill · outline: bordered pill · plain: dot + text only */
  variant?: "soft" | "outline" | "plain";
  size?: "sm" | "md" | "lg";
}

/** Status pill with a colored dot. */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, tone, label, pulse, variant = "soft", size = "md", children, ...props }, ref) => {
    const resolved = resolveTone(status, tone);
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center whitespace-nowrap font-medium leading-none",
          variant !== "plain" && "rounded-control border",
          variant === "soft" && cn("border-transparent", toneClasses.soft[resolved]),
          variant === "outline" && "border-border bg-background text-foreground shadow-xs",
          variant === "plain" && "text-foreground",
          size === "sm" && cn("gap-1.5 text-2xs", variant !== "plain" && "h-5 px-1.5"),
          size === "md" && cn("gap-1.5 text-xs", variant !== "plain" && "h-6 px-2"),
          size === "lg" && cn("gap-2 text-sm", variant !== "plain" && "h-7 px-2.5"),
          className
        )}
        {...props}
      >
        <StatusDot status={status} tone={resolved} pulse={pulse} size={size === "lg" ? "md" : "sm"} label="" />
        {children ?? label ?? (status ? statusMeta[status].label : null)}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";
