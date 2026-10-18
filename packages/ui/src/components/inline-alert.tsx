import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { normalizeTone, type Tone, type ToneInput } from "../lib/tone";
import { CloseButton } from "./close-button";

/** @deprecated Use `Tone` via the `tone` prop (`brand` is now `primary`). Kept as the `inlineAlertVariants` key set. */
export type InlineAlertVariant = "info" | "success" | "warning" | "destructive" | "neutral" | "brand";

/** Semantic tone of an `InlineAlert`: the canonical `Tone`, plus deprecated aliases. */
export type InlineAlertTone = ToneInput;

const variantForTone: Record<Tone, InlineAlertVariant> = {
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "destructive",
  neutral: "neutral",
  primary: "brand",
};

export const inlineAlertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-box px-4 py-3 text-sm [&>[data-slot=inline-alert-icon]]:mt-px",
  {
    variants: {
      variant: {
        info: "[&>[data-slot=inline-alert-icon]]:text-info",
        success: "[&>[data-slot=inline-alert-icon]]:text-success",
        warning: "[&>[data-slot=inline-alert-icon]]:text-warning",
        destructive: "[&>[data-slot=inline-alert-icon]]:text-destructive",
        neutral: "[&>[data-slot=inline-alert-icon]]:text-muted-foreground",
        brand: "[&>[data-slot=inline-alert-icon]]:text-primary",
      },
      appearance: {
        soft: "border border-transparent",
        outline: "border bg-background text-foreground shadow-xs",
        accent: "rounded-l-xs border-l-[3px]",
      },
    },
    compoundVariants: [
      { variant: "info", appearance: "soft", className: "border-info/15 bg-info-soft text-info-soft-foreground" },
      { variant: "success", appearance: "soft", className: "border-success/15 bg-success-soft text-success-soft-foreground" },
      { variant: "warning", appearance: "soft", className: "border-warning/25 bg-warning-soft text-warning-soft-foreground" },
      { variant: "destructive", appearance: "soft", className: "border-destructive/15 bg-destructive-soft text-destructive-soft-foreground" },
      { variant: "neutral", appearance: "soft", className: "border-border bg-subtle text-foreground" },
      { variant: "brand", appearance: "soft", className: "border-primary/15 bg-primary-soft text-primary-soft-foreground" },

      { variant: "info", appearance: "outline", className: "border-info/40" },
      { variant: "success", appearance: "outline", className: "border-success/40" },
      { variant: "warning", appearance: "outline", className: "border-warning/50" },
      { variant: "destructive", appearance: "outline", className: "border-destructive/40" },
      { variant: "neutral", appearance: "outline", className: "border-border" },
      { variant: "brand", appearance: "outline", className: "border-primary/40" },

      { variant: "info", appearance: "accent", className: "border-info bg-info-soft text-info-soft-foreground" },
      { variant: "success", appearance: "accent", className: "border-success bg-success-soft text-success-soft-foreground" },
      { variant: "warning", appearance: "accent", className: "border-warning bg-warning-soft text-warning-soft-foreground" },
      { variant: "destructive", appearance: "accent", className: "border-destructive bg-destructive-soft text-destructive-soft-foreground" },
      { variant: "neutral", appearance: "accent", className: "border-border-strong bg-subtle text-foreground" },
      { variant: "brand", appearance: "accent", className: "border-primary bg-primary-soft text-primary-soft-foreground" },
    ],
    defaultVariants: { variant: "info", appearance: "soft" },
  }
);

const defaultIcons: Record<InlineAlertVariant, React.ComponentType<{ className?: string }>> = {
  info: RiInformationLine,
  success: RiCheckboxCircleLine,
  warning: RiAlertLine,
  destructive: RiErrorWarningLine,
  neutral: RiInformationLine,
  brand: RiInformationLine,
};

export interface InlineAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof inlineAlertVariants>, "variant"> {
  /** Semantic colour. Default `info`. */
  tone?: InlineAlertTone | null;
  /** @deprecated Use `tone` (`brand` → `primary`). */
  variant?: InlineAlertVariant | InlineAlertTone | null;
  /** Custom icon; pass `false` or `null` to hide the default per-variant icon. */
  icon?: React.ReactNode | false;
  /** Shows a close button that calls this handler. */
  onDismiss?: () => void;
  dismissLabel?: string;
}

/** Contextual message placed inline with content (forms, panels, settings). */
export const InlineAlert = React.forwardRef<HTMLDivElement, InlineAlertProps>(
  ({ className, tone, variant, appearance, icon, onDismiss, dismissLabel = "Dismiss", role, children, ...props }, ref) => {
    const t = normalizeTone(tone ?? variant, "info");
    const v = variantForTone[t];
    const DefaultIcon = defaultIcons[v];
    const iconNode = icon === undefined ? <DefaultIcon /> : icon;
    return (
      <div
        ref={ref}
        role={role ?? (v === "destructive" || v === "warning" ? "alert" : "status")}
        data-tone={t}
        data-variant={v}
        className={cn(inlineAlertVariants({ variant: v, appearance }), className)}
        {...props}
      >
        {iconNode ? (
          <span data-slot="inline-alert-icon" aria-hidden className="flex shrink-0 [&_svg]:size-[18px]">
            {iconNode}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
        {onDismiss ? (
          <CloseButton
            size="xs"
            aria-label={dismissLabel}
            onClick={onDismiss}
            className="-mr-1.5 -mt-0.5 text-current/60 hover:bg-current/10 hover:text-current"
          />
        ) : null}
      </div>
    );
  }
);
InlineAlert.displayName = "InlineAlert";

/** Bold first line of an `InlineAlert`. */
export const InlineAlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("font-medium leading-5", className)} {...props} />
  )
);
InlineAlertTitle.displayName = "InlineAlertTitle";

/** Supporting text of an `InlineAlert`. */
export const InlineAlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("leading-5 opacity-90 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4", className)}
      {...props}
    />
  )
);
InlineAlertDescription.displayName = "InlineAlertDescription";

/** Row of buttons/links under the description. */
export const InlineAlertActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mt-2 flex flex-wrap items-center gap-2", className)} {...props} />
  )
);
InlineAlertActions.displayName = "InlineAlertActions";
