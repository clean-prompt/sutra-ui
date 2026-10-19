/** CurrentPlanCard: summary of the active subscription. */
import * as React from "react";
import { RiBankCardLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Badge } from "../../primitives/badge";
import { type Tone } from "../../lib/tone";
import { Button } from "../../primitives/button";
import { Meter } from "../../primitives/meter";
import { PaymentCard, type CardBrand } from "./payment-card";
import { safeISO } from "../../lib/time";
import { formatPrice } from "./billing-format";
import { formatDay, formatNumber, brandName } from "./billing-internal";
import type { BillingInterval } from "./billing-plans";

/* ------------------------------------------------------------------ */
/* CurrentPlanCard                                                     */
/* ------------------------------------------------------------------ */

export interface PlanUsageQuota {
  id: string;
  label: string;
  used: number;
  limit: number;
  unit?: string;
}

export interface BillingPaymentMethod {
  /** Last 4 digits. */
  last4: string;
  brand?: CardBrand;
  expiry?: string;
  holder?: string;
}

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";
/** Accepted subscription statuses, including the deprecated British spelling `cancelled`. */
export type SubscriptionStatusInput = SubscriptionStatus | "cancelled";

export interface CurrentPlanCardProps extends React.HTMLAttributes<HTMLElement> {
  /** Name of the plan, shown as the heading. */
  planName: string;
  /** Price per interval in minor units. */
  price: number;
  /** Billing interval the price is for. Default "monthly". */
  interval?: BillingInterval;
  /** ISO 4217 code used to format the price. Default "USD". */
  currency?: string;
  /** BCP 47 locale used to format the price and dates. Default "en-US". */
  locale?: string;
  /** Subscription status (for example active, trialing, past due or canceled); sets the status badge. */
  status?: SubscriptionStatusInput;
  /** Date the plan renews or ends; shown beside the status. */
  renewsAt?: Date | string;
  /** Seats in use and total; shown as a seat meter. */
  seats?: { used: number; total: number };
  /** Usage quotas of the plan, each drawn as a labelled meter. */
  usage?: PlanUsageQuota[];
  /** Payment method on file, shown as a brand and last four digits. */
  paymentMethod?: BillingPaymentMethod;
  /** Called when the user presses Manage; the button is hidden when unset. */
  onManage?: () => void;
  /** Called when the user presses Cancel plan; the button is hidden when unset. */
  onCancel?: () => void;
  /** Called when the user presses Update payment method; the button is hidden when unset. */
  onUpdatePayment?: () => void;
}

const statusBadge: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  trialing: { label: "Trial", tone: "info" },
  past_due: { label: "Past due", tone: "destructive" },
  canceled: { label: "Canceled", tone: "neutral" },
};

/** Summary of the active subscription: price, renewal, seats, quota meters, payment method and actions. */
export const CurrentPlanCard = React.forwardRef<HTMLElement, CurrentPlanCardProps>(
  (
    {
      planName,
      price,
      interval = "monthly",
      currency = "USD",
      locale = "en-US",
      status: statusProp = "active",
      renewsAt,
      seats,
      usage = [],
      paymentMethod,
      onManage,
      onCancel,
      onUpdatePayment,
      className,
      ...props
    },
    ref
  ) => {
    const titleId = React.useId();
    const status: SubscriptionStatus = statusProp === "cancelled" ? "canceled" : statusProp;
    const s = statusBadge[status] ?? statusBadge.active;
    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        className={cn("flex flex-col gap-5 rounded-box border border-border bg-card p-5 shadow-xs", className)}
        {...props}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
            <div className="flex items-center gap-2">
              <h3 id={titleId} className="text-lg font-semibold text-foreground">
                {planName}
              </h3>
              <Badge size="sm" tone={s.tone}>
                {s.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">{formatPrice(price, currency, locale)}</span>
              {interval === "yearly" ? " / year" : " / month"}
              {renewsAt && (
                <>
                  {" · "}
                  {status === "canceled" ? "Ends" : "Renews"} on <time dateTime={safeISO(renewsAt)}>{formatDay(renewsAt, locale)}</time>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {onManage && (
              <Button size="sm" variant="secondary" onClick={onManage}>
                Manage plan
              </Button>
            )}
            {onCancel && status !== "canceled" && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel plan
              </Button>
            )}
          </div>
        </div>
        {(seats || usage.length > 0) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {seats && <Meter label="Seats" value={seats.used} max={seats.total} valueText={`${seats.used} of ${seats.total}`} size="sm" />}
            {usage.map((q) => (
              <Meter
                key={q.id}
                label={q.label}
                value={q.used}
                max={q.limit}
                size="sm"
                valueText={`${formatNumber(q.used, locale)} / ${formatNumber(q.limit, locale)}${q.unit ? ` ${q.unit}` : ""}`}
              />
            ))}
          </div>
        )}
        {paymentMethod && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <div aria-hidden className="relative hidden h-[81px] w-32 shrink-0 overflow-hidden sm:block">
                <PaymentCard
                  number={paymentMethod.last4}
                  brand={paymentMethod.brand}
                  expiry={paymentMethod.expiry}
                  holder={paymentMethod.holder}
                  size="sm"
                  revealable={false}
                  flippable={false}
                  className="absolute start-0 top-0 max-w-none origin-top-left rtl:origin-top-right scale-50"
                />
              </div>
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {paymentMethod.brand ? brandName(paymentMethod.brand) : "Card"} ending in {paymentMethod.last4}
                </p>
                {paymentMethod.expiry && <p className="text-muted-foreground">Expires {paymentMethod.expiry}</p>}
              </div>
            </div>
            {onUpdatePayment && (
              <Button size="sm" variant="outline" leadingIcon={<RiBankCardLine aria-hidden />} onClick={onUpdatePayment}>
                Update payment method
              </Button>
            )}
          </div>
        )}
      </section>
    );
  }
);
CurrentPlanCard.displayName = "CurrentPlanCard";
