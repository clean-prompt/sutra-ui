/** BillingBanner: trial / payment / limit notice over InlineAlert. */
import * as React from "react";
import { RiAlertLine, RiArrowRightLine, RiCoinsLine, RiErrorWarningLine, RiTimeLine } from "@remixicon/react";
import { normalizeTone, type Tone, type ToneInput } from "../../lib/tone";
import { Button } from "../../primitives/button";
import { InlineAlert, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";

/* ------------------------------------------------------------------ */
/* BillingBanner                                                       */
/* ------------------------------------------------------------------ */

/** What a billing banner is about. Sets the default copy, icon, CTA and tone. */
export type BillingBannerKind = "trial" | "payment-failed" | "over-limit" | "info";
/** @deprecated Use `BillingBannerKind` with the `kind` prop. */
export type BillingBannerTone = BillingBannerKind;

const BANNER_KINDS: readonly string[] = ["trial", "payment-failed", "over-limit", "info"];

export interface BillingBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** What the banner is about. Default "info". */
  kind?: BillingBannerKind;
  /**
   * Semantic colour override when `kind` is set. Without `kind`, a kind value here
   * (`trial`, `payment-failed`, `over-limit`, `info`) is the deprecated way to pass the kind.
   */
  tone?: ToneInput | BillingBannerKind;
  /** Days left in the trial (kind "trial"). */
  daysLeft?: number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const bannerKind: Record<BillingBannerKind, { tone: Tone; icon: React.ReactNode; action: string }> = {
  trial: { tone: "info", icon: <RiTimeLine aria-hidden />, action: "Choose a plan" },
  "payment-failed": { tone: "destructive", icon: <RiErrorWarningLine aria-hidden />, action: "Update payment" },
  "over-limit": { tone: "warning", icon: <RiAlertLine aria-hidden />, action: "Upgrade" },
  info: { tone: "neutral", icon: <RiCoinsLine aria-hidden />, action: "View billing" },
};

function bannerTitle(kind: BillingBannerKind, daysLeft?: number) {
  switch (kind) {
    case "trial":
      return daysLeft == null ? "Your trial is ending soon" : daysLeft <= 0 ? "Your trial ends today" : `Your trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
    case "payment-failed":
      return "Your last payment failed";
    case "over-limit":
      return "You're over your plan limit";
    default:
      return "Billing update";
  }
}

const bannerDescription: Record<BillingBannerKind, string> = {
  trial: "Pick a plan to keep your agents, history and integrations.",
  "payment-failed": "Update your card to avoid interruptions. We'll retry automatically in 3 days.",
  "over-limit": "New runs are paused until you upgrade or the quota resets.",
  info: "",
};

/** Billing notice (trial ending, payment failed, over limit) with a CTA. A preset over `InlineAlert`. */
export const BillingBanner = React.forwardRef<HTMLDivElement, BillingBannerProps>(
  ({ kind: kindProp, tone: toneProp, daysLeft, title, description, actionLabel, onAction, onDismiss, className, ...props }, ref) => {
    const legacyKind = !kindProp && toneProp && BANNER_KINDS.includes(toneProp) ? (toneProp as BillingBannerKind) : undefined;
    const kind: BillingBannerKind = kindProp ?? legacyKind ?? "info";
    const t = bannerKind[kind];
    const tone: Tone = legacyKind || !toneProp ? t.tone : normalizeTone(toneProp, t.tone);
    const desc = description ?? bannerDescription[kind];
    return (
      <InlineAlert
        ref={ref}
        tone={tone}
        role={kind === "payment-failed" || kind === "over-limit" ? "alert" : "status"}
        data-kind={kind}
        icon={t.icon}
        onDismiss={onDismiss}
        action={
          onAction && (
            <Button size="sm" variant={kind === "payment-failed" ? "destructive" : kind === "info" ? "secondary" : "primary"} onClick={onAction} trailingIcon={<RiArrowRightLine aria-hidden />}>
              {actionLabel ?? t.action}
            </Button>
          )
        }
        className={className}
        {...props}
      >
        <InlineAlertTitle className="font-semibold">{title ?? bannerTitle(kind, daysLeft)}</InlineAlertTitle>
        {desc && <InlineAlertDescription>{desc}</InlineAlertDescription>}
      </InlineAlert>
    );
  }
);
BillingBanner.displayName = "BillingBanner";
