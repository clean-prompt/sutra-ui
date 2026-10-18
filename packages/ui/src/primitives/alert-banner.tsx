import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  RiAlertLine,
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiMegaphoneLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { normalizeTone, type Tone, type ToneInput } from "../lib/tone";
import { CloseButton } from "./close-button";

/** Canonical banner tone: a semantic `Tone` or the high-contrast `inverse`. */
export type AlertBannerTone = Tone | "inverse";

/** @deprecated Use `AlertBannerTone` with the `tone` prop (`brand` is now `primary`). */
export type AlertBannerVariant =
  | "brand"
  | "primary"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "inverse";

export const alertBannerVariants = cva(
  "relative z-40 flex w-full items-center gap-3 px-4 py-2.5 text-sm sm:px-6",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        brand: "bg-primary text-primary-foreground",
        neutral: "border-b border-border bg-subtle text-foreground",
        info: "bg-info text-info-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        inverse: "bg-inverse text-inverse-foreground",
      },
      appearance: { solid: "", soft: "" },
      sticky: { true: "sticky top-0", false: "" },
      align: { center: "justify-center", start: "justify-start" },
    },
    compoundVariants: [
      { appearance: "soft", variant: ["primary", "brand"], className: "border-b border-primary/20 bg-primary-soft text-primary-soft-foreground" },
      { appearance: "soft", variant: "info", className: "border-b border-info/25 bg-info-soft text-info-soft-foreground" },
      { appearance: "soft", variant: "success", className: "border-b border-success/25 bg-success-soft text-success-soft-foreground" },
      { appearance: "soft", variant: "warning", className: "border-b border-warning/30 bg-warning-soft text-warning-soft-foreground" },
      { appearance: "soft", variant: "destructive", className: "border-b border-destructive/25 bg-destructive-soft text-destructive-soft-foreground" },
    ],
    defaultVariants: { variant: "primary", appearance: "solid", sticky: false, align: "center" },
  }
);

const defaultIcons: Record<AlertBannerTone, React.ComponentType<{ className?: string }>> = {
  primary: RiMegaphoneLine,
  neutral: RiInformationLine,
  info: RiInformationLine,
  success: RiCheckboxCircleLine,
  warning: RiAlertLine,
  destructive: RiErrorWarningLine,
  inverse: RiMegaphoneLine,
};

/** Inline call to action of a banner: a link (with `href`) or a button. Shared by `AlertBanner` and `RotatingNoticeBar`. */
export interface BannerAction {
  label: React.ReactNode;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  target?: string;
  rel?: string;
}

/** @deprecated Use `BannerAction`. */
export type AlertBannerAction = BannerAction;

/** Fill style of a banner: `solid` (default, strong fill) or `soft` (tinted fill with a bottom border). `neutral` and `inverse` look the same in both. */
export type AlertBannerAppearance = "solid" | "soft";

export interface AlertBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    Omit<VariantProps<typeof alertBannerVariants>, "variant"> {
  /** Semantic colour (default `primary`); `inverse` gives a high-contrast dark banner. */
  tone?: ToneInput | "inverse";
  /** @deprecated Use `tone` (`brand` is now `primary`). */
  variant?: AlertBannerVariant | null;
  /** Main message. Children are used when `message` is omitted. */
  message?: React.ReactNode;
  children?: React.ReactNode;
  /** Custom icon; `false`/`null` hides it. */
  icon?: React.ReactNode | false;
  /** Inline call to action, rendered as a link (with `href`) or a button. */
  action?: BannerAction | React.ReactNode;
  /** Content before the message block (e.g. a "previous" control). */
  leading?: React.ReactNode;
  /** Content after the message block, before the close button (e.g. a pager). */
  trailing?: React.ReactNode;
  /** Props for the message block (icon, message, action). */
  contentProps?: React.HTMLAttributes<HTMLDivElement> & { [key: `data-${string}`]: string | number | boolean | undefined };
  /** Changing it remounts the message block, replaying its enter animation (e.g. when a rotator swaps messages). */
  contentKey?: React.Key;
  /** Shows a close button. Controlled via `open`/`onOpenChange`, or uncontrolled. */
  dismissible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDismiss?: () => void;
  dismissLabel?: string;
}

function isActionObject(action: unknown): action is BannerAction {
  return typeof action === "object" && action !== null && !React.isValidElement(action) && "label" in action;
}

/** Full-width announcement banner for the top of an app or page. */
export const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    {
      className,
      tone,
      variant,
      appearance,
      sticky,
      align,
      message,
      children,
      icon,
      action,
      leading,
      trailing,
      contentProps,
      contentKey,
      dismissible,
      open: openProp,
      defaultOpen = true,
      onOpenChange,
      onDismiss,
      dismissLabel = "Dismiss banner",
      role,
      onAnimationEnd,
      ...props
    },
    ref
  ) => {
    const [openState, setOpenState] = React.useState(defaultOpen);
    const open = openProp ?? openState;
    // Stay mounted while the exit animation plays.
    const [mounted, setMounted] = React.useState(open);
    if (open && !mounted) setMounted(true);
    const closing = !open && mounted;

    React.useEffect(() => {
      if (!closing) return;
      const timer = window.setTimeout(() => setMounted(false), 250);
      return () => window.clearTimeout(timer);
    }, [closing]);

    if (!open && !mounted) return null;

    const rawTone = tone ?? variant;
    const v: AlertBannerTone = rawTone === "inverse" ? "inverse" : normalizeTone(rawTone, "primary");
    const DefaultIcon = defaultIcons[v];
    const iconNode = icon === undefined ? <DefaultIcon /> : icon;
    const isNeutral = v === "neutral";

    const dismiss = () => {
      if (openProp === undefined) setOpenState(false);
      onOpenChange?.(false);
      onDismiss?.();
    };

    const actionClass = cn(
      "group/banner-action inline-flex shrink-0 items-center gap-1 rounded-xs font-semibold underline-offset-4 hover:underline",
      "[&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-150 hover:[&_svg]:translate-x-0.5",
      focusRing,
      isNeutral ? "text-primary" : "text-current focus-visible:ring-current/40"
    );

    let actionNode: React.ReactNode = null;
    if (isActionObject(action)) {
      const inner = (
        <>
          {action.label}
          <RiArrowRightLine aria-hidden />
        </>
      );
      actionNode = action.href ? (
        <a href={action.href} target={action.target} rel={action.rel} onClick={action.onClick} className={actionClass}>
          {inner}
        </a>
      ) : (
        <button type="button" onClick={action.onClick} className={actionClass}>
          {inner}
        </button>
      );
    } else if (action) {
      actionNode = action as React.ReactNode;
    }

    return (
      <div
        ref={ref}
        role={role ?? (v === "destructive" || v === "warning" ? "alert" : "region")}
        aria-label={role ? undefined : "Announcement"}
        data-tone={v}
        data-variant={v === "primary" ? "brand" : v}
        data-state={closing ? "closed" : "open"}
        className={cn(
          alertBannerVariants({ variant: v, appearance, sticky, align }),
          dismissible && "pr-12 sm:pr-14",
          closing && "pointer-events-none animate-out fade-out-0 slide-out-to-top-2 duration-200 [animation-fill-mode:forwards]",
          className
        )}
        onAnimationEnd={(event) => {
          onAnimationEnd?.(event);
          if (closing && event.target === event.currentTarget) setMounted(false);
        }}
        {...props}
      >
        {leading}
        <div
          key={contentKey}
          {...contentProps}
          className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1", contentProps?.className)}
        >
          {iconNode ? (
            <span
              aria-hidden
              className={cn("flex shrink-0 [&_svg]:size-[18px]", isNeutral ? "text-primary" : "opacity-90")}
            >
              {iconNode}
            </span>
          ) : null}
          <div className="min-w-0 font-medium [&_strong]:font-semibold">{message ?? children}</div>
          {actionNode}
        </div>
        {trailing}
        {dismissible ? (
          <CloseButton
            size="sm"
            aria-label={dismissLabel}
            onClick={dismiss}
            variant={isNeutral ? "ghost" : undefined}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 sm:right-3 active:scale-100",
              !isNeutral && "text-current/75 hover:bg-current/15 hover:text-current focus-visible:ring-current/40"
            )}
          />
        ) : null}
      </div>
    );
  }
);
AlertBanner.displayName = "AlertBanner";
