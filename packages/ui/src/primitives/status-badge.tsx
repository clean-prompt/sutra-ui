import * as React from "react";
import { cn } from "../lib/cn";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";
import { useChangeKey } from "../hooks/use-change-key";
import { Spinner } from "./spinner";

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

/**
 * What a status indicator shows: `"dot"` (default, the coloured dot), `"spinner"`, any icon node,
 * or nothing (`null` / `false`, StatusBadge only). Indicators are always decorative; the label carries the meaning.
 */
export type StatusIndicatorIcon = React.ReactNode | "spinner" | "dot";

/** solid: filled · hollow: ring (glyphs: no background) · dashed: dashed ring */
export type StatusDotVariant = "solid" | "hollow" | "dashed";

/** Ring colour for hollow / dashed dots (neutral uses the muted foreground so it stays visible). */
const ringBorder: Record<Tone, string> = { ...toneClasses.border, neutral: "border-muted-foreground" };

const dotSize = { sm: "size-1.5", md: "size-2", lg: "size-2.5" } as const;
const glyphSize = { sm: "size-3.5 [&_svg]:size-2.5", md: "size-4 [&_svg]:size-3", lg: "size-5 [&_svg]:size-3.5" } as const;
const iconSize = { sm: "size-2.5", md: "size-3", lg: "size-3.5" } as const;

function isDefaultIcon(icon: StatusIndicatorIcon) {
  return icon === "dot" || icon == null || typeof icon === "boolean";
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
  /** Fill style. Default `solid`. */
  variant?: StatusDotVariant;
  /** `"dot"` (default), or `"spinner"` / an icon to render a small round status glyph instead of a dot. */
  icon?: StatusIndicatorIcon;
}

/** Small colored dot (or round status glyph) indicating a status. */
export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ className, status, tone, pulse, size = "md", label, variant = "solid", icon = "dot", ...props }, ref) => {
    const resolved = resolveTone(status, tone);
    const dot = toneClasses.dot[resolved];
    const animate = pulse ?? status === "processing";
    const text = label ?? (status ? statusMeta[status].label : "");
    const a11y = {
      role: text ? ("img" as const) : undefined,
      "aria-label": text || undefined,
      "aria-hidden": text ? undefined : true,
    };
    const halo = animate ? (
      <span className={cn("absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping", dot)} />
    ) : null;

    if (isDefaultIcon(icon)) {
      return (
        <span
          ref={ref}
          {...a11y}
          className={cn("relative inline-flex shrink-0 rounded-full", dotSize[size], className)}
          {...props}
        >
          {halo}
          <span
            className={cn(
              "relative inline-flex size-full rounded-full transition-colors",
              variant === "solid" ? dot : cn("border-[1.5px] bg-transparent", ringBorder[resolved], variant === "dashed" && "border-dashed")
            )}
          />
        </span>
      );
    }

    return (
      <span
        ref={ref}
        {...a11y}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
          glyphSize[size],
          variant === "solid" && cn(toneClasses.soft[resolved], toneClasses.text[resolved]),
          variant === "hollow" && toneClasses.text[resolved],
          variant === "dashed" && cn("border border-dashed", ringBorder[resolved], toneClasses.text[resolved]),
          className
        )}
        {...props}
      >
        {halo}
        {icon === "spinner" ? <Spinner label="" className={cn("text-current", iconSize[size])} /> : icon}
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
  /** Leading indicator: `"dot"` (default), `"spinner"`, any icon node, or `null` for none. Always decorative. */
  icon?: StatusIndicatorIcon;
}

/** Status pill with a colored dot (or a spinner / icon). */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, tone, label, pulse, variant = "soft", size = "md", icon = "dot", children, ...props }, ref) => {
    const resolved = resolveTone(status, tone);
    const iconClass = size === "lg" ? iconSize.lg : iconSize.md;
    // The custom icon pops when the status changes, never on the first render.
    const changed = useChangeKey(`${status ?? ""}|${resolved}`);
    let indicator: React.ReactNode;
    if (icon === "dot") {
      indicator = <StatusDot status={status} tone={resolved} pulse={pulse} size={size === "lg" ? "md" : "sm"} label="" />;
    } else if (icon === "spinner") {
      indicator = <Spinner label="" className={cn("text-current", iconClass)} />;
    } else if (icon == null || typeof icon === "boolean") {
      indicator = null;
    } else {
      indicator = (
        <span
          key={changed}
          aria-hidden
          className={cn("inline-flex shrink-0", size === "lg" ? "[&_svg]:size-3.5" : "[&_svg]:size-3", changed > 0 && "animate-pop")}
        >
          {icon}
        </span>
      );
    }
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center whitespace-nowrap font-medium leading-none transition-colors",
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
        {indicator}
        {children ?? label ?? (status ? statusMeta[status].label : null)}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";
