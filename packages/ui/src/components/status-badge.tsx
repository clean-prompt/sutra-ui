import * as React from "react";
import { cn } from "../lib/cn";

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

type Tone = "success" | "neutral" | "destructive" | "warning" | "info" | "brand";

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
  processing: { label: "Processing", tone: "brand" },
};

const dotTone: Record<Tone, string> = {
  success: "bg-success",
  neutral: "bg-muted-foreground",
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
  brand: "bg-primary",
};

const softTone: Record<Tone, string> = {
  success: "bg-success-soft text-success-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
  destructive: "bg-destructive-soft text-destructive-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  brand: "bg-primary-soft text-primary-soft-foreground",
};

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusBadgeStatus;
  /** Animated halo. Defaults to true for `processing`. */
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  /** Accessible label; defaults to the status name. Set to "" to hide from assistive tech. */
  label?: string;
}

/** Small colored dot indicating a status. */
export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ className, status, pulse, size = "md", label, ...props }, ref) => {
    const meta = statusMeta[status];
    const animate = pulse ?? status === "processing";
    const text = label ?? meta.label;
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
              dotTone[meta.tone]
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex size-full rounded-full", dotTone[meta.tone])} />
      </span>
    );
  }
);
StatusDot.displayName = "StatusDot";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusBadgeStatus;
  /** Custom text; defaults to the status name. */
  label?: React.ReactNode;
  pulse?: boolean;
  /** soft: tinted pill · outline: bordered pill · plain: dot + text only */
  variant?: "soft" | "outline" | "plain";
  size?: "sm" | "md" | "lg";
}

/** Status pill with a colored dot. */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, label, pulse, variant = "soft", size = "md", children, ...props }, ref) => {
    const meta = statusMeta[status];
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center whitespace-nowrap font-medium leading-none",
          variant !== "plain" && "rounded-control border",
          variant === "soft" && cn("border-transparent", softTone[meta.tone]),
          variant === "outline" && "border-border bg-background text-foreground shadow-xs",
          variant === "plain" && "text-foreground",
          size === "sm" && cn("gap-1.5 text-2xs", variant !== "plain" && "h-5 px-1.5"),
          size === "md" && cn("gap-1.5 text-xs", variant !== "plain" && "h-6 px-2"),
          size === "lg" && cn("gap-2 text-sm", variant !== "plain" && "h-7 px-2.5"),
          className
        )}
        {...props}
      >
        <StatusDot status={status} pulse={pulse} size={size === "lg" ? "md" : "sm"} label="" />
        {children ?? label ?? meta.label}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";
