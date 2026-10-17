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
import { CloseButton } from "./close-button";

export type AlertBannerVariant =
  | "brand"
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
        brand: "bg-primary text-primary-foreground",
        neutral: "border-b border-border bg-subtle text-foreground",
        info: "bg-info text-info-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        inverse: "bg-inverse text-inverse-foreground",
      },
      sticky: { true: "sticky top-0", false: "" },
      align: { center: "justify-center", start: "justify-start" },
    },
    defaultVariants: { variant: "brand", sticky: false, align: "center" },
  }
);

const defaultIcons: Record<AlertBannerVariant, React.ComponentType<{ className?: string }>> = {
  brand: RiMegaphoneLine,
  neutral: RiInformationLine,
  info: RiInformationLine,
  success: RiCheckboxCircleLine,
  warning: RiAlertLine,
  destructive: RiErrorWarningLine,
  inverse: RiMegaphoneLine,
};

export interface AlertBannerAction {
  label: React.ReactNode;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  target?: string;
  rel?: string;
}

export interface AlertBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof alertBannerVariants> {
  /** Main message. Children are used when `message` is omitted. */
  message?: React.ReactNode;
  children?: React.ReactNode;
  /** Custom icon; `false`/`null` hides it. */
  icon?: React.ReactNode | false;
  /** Inline call to action, rendered as a link (with `href`) or a button. */
  action?: AlertBannerAction | React.ReactNode;
  /** Shows a close button. Controlled via `open`/`onOpenChange`, or uncontrolled. */
  dismissible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDismiss?: () => void;
  dismissLabel?: string;
}

function isActionObject(action: unknown): action is AlertBannerAction {
  return typeof action === "object" && action !== null && !React.isValidElement(action) && "label" in action;
}

/** Full-width announcement banner for the top of an app or page. */
export const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    {
      className,
      variant,
      sticky,
      align,
      message,
      children,
      icon,
      action,
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

    const v: AlertBannerVariant = variant ?? "brand";
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
        data-variant={v}
        data-state={closing ? "closed" : "open"}
        className={cn(
          alertBannerVariants({ variant: v, sticky, align }),
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
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
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
