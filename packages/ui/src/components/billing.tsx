import * as React from "react";
import {
  RiAlertLine,
  RiArrowRightLine,
  RiBankCardLine,
  RiCheckLine,
  RiCloseLine,
  RiCoinsLine,
  RiDownloadLine,
  RiErrorWarningLine,
  RiShieldCheckLine,
  RiSubtractLine,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Badge, type BadgeColor } from "./badge";
import { Button } from "./button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Meter } from "./meter";
import { NumberInput } from "./number-input";
import { CardBrandMark, PaymentCard, type CardBrand } from "./payment-card";
import { SegmentedControl } from "./segmented-control";
import { Spinner } from "./spinner";
import { Steps } from "./step-indicator";
import { Switch } from "./switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { isValidDate, safeISO, toValidDate } from "../lib/date";

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

function currencyDigits(currency: string, locale?: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Format an amount in minor units (cents) as currency. Whole amounts drop the decimals ("$20", "$19.99"). */
export function formatPrice(amountMinor: number, currency = "USD", locale = "en-US"): string {
  const digits = currencyDigits(currency, locale);
  const major = amountMinor / 10 ** digits;
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(major);
}

/** Percent saved by paying `yearly` once instead of `monthly` × 12 (rounded, never negative). */
export function yearlySavings(monthly: number, yearly: number): number {
  if (!(monthly > 0) || !(yearly >= 0)) return 0;
  return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
}

/** Date the balance reaches zero at `dailyBurn` per day, or null when nothing is being spent. */
export function projectRunOut(balance: number, dailyBurn: number, from: Date = new Date()): Date | null {
  if (!(dailyBurn > 0) || !Number.isFinite(balance) || !isValidDate(from)) return null;
  if (balance <= 0) return new Date(from.getTime());
  const out = new Date(from.getTime() + (balance / dailyBurn) * DAY_MS);
  return isValidDate(out) ? out : null;
}

const formatDay = (d: Date | string, locale = "en-US") => {
  const date = toValidDate(d);
  return date ? date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }) : "—";
};

const formatNumber = (n: number, locale = "en-US") => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);

/* ------------------------------------------------------------------ */
/* PlanPicker                                                          */
/* ------------------------------------------------------------------ */

export type BillingInterval = "monthly" | "yearly";
export type PlanFeatureState = "included" | "excluded" | "limited";

export interface PlanFeature {
  label: string;
  /** Default "included". */
  state?: PlanFeatureState;
  /** Shown after the label, e.g. "up to 3". */
  note?: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  description?: string;
  /** Price per month in minor units when billed monthly. */
  priceMonthly: number;
  /** Price per year in minor units when billed yearly. Defaults to 12 × monthly. */
  priceYearly?: number;
  /** Custom pricing: shows `priceLabel` and a "Contact sales" CTA. */
  contactSales?: boolean;
  priceLabel?: string;
  features: PlanFeature[];
  recommended?: boolean;
  /** Ordering used to decide upgrade vs downgrade. Defaults to the array index. */
  rank?: number;
  /** Extra line under the price, e.g. "per seat". */
  unitLabel?: string;
}

export type PlanAction = "current" | "upgrade" | "downgrade" | "contact" | "select";

/** Features the current plan grants that the target plan does not (excluded or missing). */
export function planFeatureLosses(current: BillingPlan, target: BillingPlan): PlanFeature[] {
  return current.features.filter((f) => {
    if ((f.state ?? "included") === "excluded") return false;
    const match = target.features.find((t) => t.label === f.label);
    if (!match || match.state === "excluded") return true;
    return (f.state ?? "included") === "included" && match.state === "limited";
  });
}

export interface PlanPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  plans: BillingPlan[];
  currentPlanId?: string;
  interval?: BillingInterval;
  defaultInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  /** Called on Upgrade / Contact / Select, and after confirming a downgrade. */
  onSelect?: (plan: BillingPlan, interval: BillingInterval) => void;
  currency?: string;
  locale?: string;
  /** Hide the monthly/yearly toggle. */
  hideIntervalToggle?: boolean;
}

const featureIcon: Record<PlanFeatureState, React.ReactNode> = {
  included: <RiCheckLine aria-hidden className="size-4 text-success" />,
  limited: <RiSubtractLine aria-hidden className="size-4 text-warning" />,
  excluded: <RiCloseLine aria-hidden className="size-4 text-muted-foreground/70" />,
};
const featureSr: Record<PlanFeatureState, string> = { included: "Included", limited: "Limited", excluded: "Not included" };

/** Tiered plan cards with a monthly/yearly toggle, feature checklists, per-plan CTAs and a downgrade preview. */
export const PlanPicker = React.forwardRef<HTMLDivElement, PlanPickerProps>(
  (
    {
      plans,
      currentPlanId,
      interval: intervalProp,
      defaultInterval = "monthly",
      onIntervalChange,
      onSelect,
      currency = "USD",
      locale = "en-US",
      hideIntervalToggle,
      className,
      ...props
    },
    ref
  ) => {
    const [interval, setInterval] = useControllableState<BillingInterval>({
      value: intervalProp,
      defaultValue: defaultInterval,
      onChange: onIntervalChange,
    });
    const [pending, setPending] = React.useState<BillingPlan | null>(null);
    const rankOf = (p: BillingPlan) => p.rank ?? plans.indexOf(p);
    const current = plans.find((p) => p.id === currentPlanId);
    const maxSavings = Math.max(
      0,
      ...plans.filter((p) => !p.contactSales && p.priceYearly != null).map((p) => yearlySavings(p.priceMonthly, p.priceYearly!))
    );

    const actionFor = (plan: BillingPlan): PlanAction => {
      if (plan.id === currentPlanId) return "current";
      if (plan.contactSales) return "contact";
      if (!current) return "select";
      return rankOf(plan) > rankOf(current) ? "upgrade" : "downgrade";
    };

    const choose = (plan: BillingPlan) => {
      const action = actionFor(plan);
      if (action === "current") return;
      if (action === "downgrade") setPending(plan);
      else onSelect?.(plan, interval);
    };

    const losses = pending && current ? planFeatureLosses(current, pending) : [];

    return (
      <div ref={ref} className={cn("flex flex-col gap-6", className)} {...props}>
        {!hideIntervalToggle && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SegmentedControl
              aria-label="Billing interval"
              value={interval}
              onValueChange={(v) => setInterval(v as BillingInterval)}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            {maxSavings > 0 && (
              <Badge color="success" variant="soft" data-slot="savings-badge">
                Save {maxSavings}%
              </Badge>
            )}
          </div>
        )}
        <ul className={cn("grid gap-4", plans.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : plans.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2")}>
          {plans.map((plan) => {
            const action = actionFor(plan);
            const yearly = plan.priceYearly ?? plan.priceMonthly * 12;
            const perMonth = interval === "yearly" ? Math.round(yearly / 12) : plan.priceMonthly;
            const titleId = `plan-${plan.id}-title`;
            return (
              <li
                key={plan.id}
                data-plan={plan.id}
                className={cn(
                  "relative flex flex-col gap-5 rounded-box border bg-card p-5 shadow-xs",
                  plan.recommended ? "border-primary ring-1 ring-primary" : "border-border",
                  action === "current" && "bg-subtle"
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id={titleId} className="text-base font-semibold text-foreground">
                      {plan.name}
                    </h3>
                    {action === "current" && <Badge size="sm">Current plan</Badge>}
                    {plan.recommended && action !== "current" && (
                      <Badge size="sm" color="brand" variant="solid">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                </div>
                <div data-slot="plan-price" className="flex flex-col gap-0.5">
                  {plan.contactSales ? (
                    <span className="text-display-xs font-semibold tracking-tight text-foreground">{plan.priceLabel ?? "Custom"}</span>
                  ) : (
                    <span className="flex items-baseline gap-1">
                      <span className="text-display-xs font-semibold tracking-tight text-foreground tabular-nums">
                        {formatPrice(perMonth, currency, locale)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {plan.contactSales
                      ? "Volume pricing and invoicing"
                      : plan.priceMonthly === 0
                        ? "Free forever"
                        : interval === "yearly"
                          ? `${formatPrice(yearly, currency, locale)} billed yearly`
                          : "Billed monthly"}
                    {plan.unitLabel ? ` · ${plan.unitLabel}` : ""}
                  </span>
                </div>
                <Button
                  variant={action === "upgrade" || (action === "select" && plan.recommended) ? "primary" : action === "current" ? "secondary" : "outline"}
                  disabled={action === "current"}
                  onClick={() => choose(plan)}
                  aria-label={action === "current" ? undefined : `${ctaLabel[action]}: ${plan.name}`}
                  className="w-full"
                >
                  {ctaLabel[action]}
                </Button>
                <ul className="flex flex-col gap-2 text-sm" aria-label={`${plan.name} features`}>
                  {plan.features.map((f) => {
                    const state = f.state ?? "included";
                    return (
                      <li key={f.label} data-state={state} className={cn("flex items-start gap-2", state === "excluded" && "text-muted-foreground")}>
                        <span className="mt-0.5 shrink-0">{featureIcon[state]}</span>
                        <span>
                          <span className="sr-only">{featureSr[state]}: </span>
                          <span className={cn(state === "excluded" && "line-through decoration-muted-foreground/40")}>{f.label}</span>
                          {f.note && <span className="text-muted-foreground"> · {f.note}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
        <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
          <DialogContent size="sm">
            <DialogHeader icon={<RiAlertLine />} tone="warning">
              <DialogTitle>Downgrade to {pending?.name}?</DialogTitle>
              <DialogDescription>
                {losses.length > 0 ? "You'll lose access to these at the end of your billing period:" : "Your plan changes at the end of your billing period."}
              </DialogDescription>
            </DialogHeader>
            {losses.length > 0 && (
              <DialogBody>
                <ul className="flex flex-col gap-2" aria-label="Features you'll lose">
                  {losses.map((f) => (
                    <li key={f.label} className="flex items-start gap-2">
                      <RiCloseLine aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </DialogBody>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPending(null)}>
                Keep {current?.name ?? "current plan"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pending) onSelect?.(pending, interval);
                  setPending(null);
                }}
              >
                Confirm downgrade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);
PlanPicker.displayName = "PlanPicker";

const ctaLabel: Record<PlanAction, string> = {
  current: "Current plan",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  contact: "Contact sales",
  select: "Choose plan",
};

/* ------------------------------------------------------------------ */
/* PlanComparisonTable                                                 */
/* ------------------------------------------------------------------ */

export type PlanComparisonValue = boolean | string | number | null | undefined;

export interface PlanComparisonRow {
  label: string;
  description?: string;
  /** Value per plan id: `true` check, `false`/`null` dash, string/number shown as text. */
  values: Record<string, PlanComparisonValue>;
}

export interface PlanComparisonSection {
  title?: string;
  rows: PlanComparisonRow[];
}

export interface PlanComparisonTableProps extends React.HTMLAttributes<HTMLTableElement> {
  plans: Pick<BillingPlan, "id" | "name" | "recommended">[];
  sections: PlanComparisonSection[];
  /** Max height of the scroll box; the header stays sticky. */
  maxHeight?: number | string;
  caption?: string;
}

function ComparisonValue({ value }: { value: PlanComparisonValue }) {
  if (value === true)
    return (
      <span data-value="yes" className="inline-flex text-success">
        <RiCheckLine aria-hidden className="size-4" />
        <span className="sr-only">Included</span>
      </span>
    );
  if (value === false || value == null || value === "")
    return (
      <span data-value="no" className="inline-flex text-muted-foreground/60">
        <RiSubtractLine aria-hidden className="size-4" />
        <span className="sr-only">Not included</span>
      </span>
    );
  return <span data-value="text" className="text-sm text-foreground">{value}</span>;
}

/** Feature × plan matrix with grouped sections, check/dash/value cells and a sticky header. */
export const PlanComparisonTable = React.forwardRef<HTMLTableElement, PlanComparisonTableProps>(
  ({ plans, sections, maxHeight = 560, caption = "Plan comparison", className, ...props }, ref) => (
    <Table ref={ref} stickyHeader maxHeight={maxHeight} className={className} {...props}>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-48 pl-4">Features</TableHead>
          {plans.map((p) => (
            <TableHead key={p.id} align="center" className={cn("min-w-28", p.recommended && "text-primary")}>
              {p.name}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections.map((section, si) => (
          <React.Fragment key={section.title ?? si}>
            {section.title && (
              <TableRow>
                <th
                  scope="colgroup"
                  colSpan={plans.length + 1}
                  className="border-b border-border bg-muted/50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {section.title}
                </th>
              </TableRow>
            )}
            {section.rows.map((row) => (
              <TableRow key={row.label}>
                <th scope="row" className="border-b border-border px-4 py-3 text-left align-middle font-normal">
                  <span className="block text-sm font-medium text-foreground">{row.label}</span>
                  {row.description && <span className="block text-xs text-muted-foreground">{row.description}</span>}
                </th>
                {plans.map((p) => (
                  <TableCell key={p.id} align="center" className={cn(p.recommended && "bg-primary-soft/30")}>
                    <ComparisonValue value={row.values[p.id]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  )
);
PlanComparisonTable.displayName = "PlanComparisonTable";

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

export interface CurrentPlanCardProps extends React.HTMLAttributes<HTMLElement> {
  planName: string;
  /** Price per interval in minor units. */
  price: number;
  interval?: BillingInterval;
  currency?: string;
  locale?: string;
  status?: SubscriptionStatus;
  renewsAt?: Date | string;
  seats?: { used: number; total: number };
  usage?: PlanUsageQuota[];
  paymentMethod?: BillingPaymentMethod;
  onManage?: () => void;
  onCancel?: () => void;
  onUpdatePayment?: () => void;
}

const statusBadge: Record<SubscriptionStatus, { label: string; color: BadgeColor }> = {
  active: { label: "Active", color: "success" },
  trialing: { label: "Trial", color: "info" },
  past_due: { label: "Past due", color: "destructive" },
  canceled: { label: "Canceled", color: "neutral" },
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
      status = "active",
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
    const s = statusBadge[status];
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
              <Badge size="sm" color={s.color}>
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
          <div className="grid gap-4 sm:grid-cols-2">
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
                  className="absolute left-0 top-0 origin-top-left scale-50"
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
              <Button size="sm" variant="outline" leadingIcon={<RiBankCardLine />} onClick={onUpdatePayment}>
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

const brandName = (b: CardBrand) =>
  ({ visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover", jcb: "JCB", unionpay: "UnionPay", rupay: "RuPay", unknown: "Card" })[b];

/* ------------------------------------------------------------------ */
/* CreditBalanceCard                                                   */
/* ------------------------------------------------------------------ */

export interface CreditPreset {
  credits: number;
  /** Price in minor units. */
  price: number;
  label?: string;
}

export interface CreditBalanceCardProps extends React.HTMLAttributes<HTMLElement> {
  balance: number;
  /** Average credits spent per day. */
  dailyBurn?: number;
  /** "Now" for the projection (defaults to the current date). */
  now?: Date;
  presets?: CreditPreset[];
  currency?: string;
  locale?: string;
  unitLabel?: string;
  /** Days of runway below which the card warns. Default 7. */
  lowRunwayDays?: number;
  /** May return a promise; the dialog closes when it resolves. */
  onBuy?: (preset: CreditPreset) => void | Promise<void>;
}

const defaultPresets: CreditPreset[] = [
  { credits: 1000, price: 1000 },
  { credits: 5000, price: 4500, label: "Save 10%" },
  { credits: 20000, price: 16000, label: "Save 20%" },
];

/** Credit balance with burn rate, projected run-out date and a Buy credits dialog with preset amounts. */
export const CreditBalanceCard = React.forwardRef<HTMLElement, CreditBalanceCardProps>(
  (
    {
      balance,
      dailyBurn = 0,
      now,
      presets = defaultPresets,
      currency = "USD",
      locale = "en-US",
      unitLabel = "credits",
      lowRunwayDays = 7,
      onBuy,
      className,
      ...props
    },
    ref
  ) => {
    const titleId = React.useId();
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState(0);
    const [busy, setBusy] = React.useState(false);
    const from = now ?? new Date();
    const runOut = projectRunOut(balance, dailyBurn, from);
    const runwayDays = dailyBurn > 0 ? balance / dailyBurn : Infinity;
    const low = runwayDays < lowRunwayDays;

    const buy = async () => {
      const preset = presets[selected];
      if (!preset) return;
      setBusy(true);
      try {
        await onBuy?.(preset);
        setOpen(false);
      } finally {
        setBusy(false);
      }
    };

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        data-low={low || undefined}
        className={cn("flex flex-col gap-4 rounded-box border border-border bg-card p-5 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={titleId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Credit balance
            </h3>
            <p className="flex items-baseline gap-1.5">
              <span data-slot="credit-balance" className="text-display-xs font-semibold tracking-tight text-foreground tabular-nums">
                {formatNumber(balance, locale)}
              </span>
              <span className="text-sm text-muted-foreground">{unitLabel}</span>
            </p>
          </div>
          <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-box bg-primary-soft text-primary-soft-foreground">
            <RiCoinsLine className="size-5" />
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Burn rate</dt>
            <dd className="font-medium text-foreground tabular-nums">{dailyBurn > 0 ? `~${formatNumber(dailyBurn, locale)} / day` : "No recent usage"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Projected run-out</dt>
            <dd data-slot="run-out" className={cn("font-medium tabular-nums", low ? "text-destructive" : "text-foreground")}>
              {runOut ? <time dateTime={safeISO(runOut)}>{formatDay(runOut, locale)}</time> : "Not projected"}
            </dd>
          </div>
        </dl>
        {low && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-destructive">
            <RiTimeLine aria-hidden className="size-3.5" />
            Less than {lowRunwayDays} days of credits left at the current rate.
          </p>
        )}
        <Button onClick={() => setOpen(true)} leadingIcon={<RiCoinsLine />}>
          Buy credits
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Buy credits</DialogTitle>
              <DialogDescription>Credits never expire and are used before overage billing.</DialogDescription>
            </DialogHeader>
            <div role="group" aria-label="Credit amount" className="flex flex-col gap-2">
              {presets.map((p, i) => (
                <button
                  key={p.credits}
                  type="button"
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-box border px-4 py-3 text-left text-sm transition-colors",
                    selected === i ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border hover:bg-accent",
                    focusRing
                  )}
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {formatNumber(p.credits, locale)} {unitLabel}
                    </span>
                    {p.label && <span className="text-xs text-success">{p.label}</span>}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{formatPrice(p.price, currency, locale)}</span>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button loading={busy} onClick={() => void buy()}>
                Buy for {presets[selected] ? formatPrice(presets[selected]!.price, currency, locale) : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    );
  }
);
CreditBalanceCard.displayName = "CreditBalanceCard";

/* ------------------------------------------------------------------ */
/* CreditAutoReload                                                    */
/* ------------------------------------------------------------------ */

export interface AutoReloadSettings {
  enabled: boolean;
  /** Reload when the balance falls below this. */
  threshold: number | null;
  /** Amount added per reload. */
  amount: number | null;
  /** Max total reloaded per month; null = no cap. */
  monthlyCap: number | null;
}

export interface AutoReloadErrors {
  threshold?: string;
  amount?: string;
  monthlyCap?: string;
}

/** Validate auto-reload settings; returns an empty object when valid (or disabled). */
export function validateAutoReload(v: AutoReloadSettings): AutoReloadErrors {
  const e: AutoReloadErrors = {};
  if (!v.enabled) return e;
  if (v.amount == null || !(v.amount > 0)) e.amount = "Reload amount must be greater than 0.";
  if (v.threshold == null || v.threshold < 0) e.threshold = "Enter a threshold of 0 or more.";
  if (v.monthlyCap != null) {
    if (!(v.monthlyCap > 0)) e.monthlyCap = "Monthly cap must be greater than 0.";
    else if (v.threshold != null && v.threshold >= v.monthlyCap) e.threshold = "Threshold must be below the monthly cap.";
    else if (v.amount != null && v.amount > v.monthlyCap) e.amount = "Reload amount can't exceed the monthly cap.";
  }
  return e;
}

export interface CreditAutoReloadProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue" | "onChange"> {
  value?: AutoReloadSettings;
  defaultValue?: AutoReloadSettings;
  onValueChange?: (value: AutoReloadSettings) => void;
  /** May return a promise; shows "Saved" when it resolves. */
  onSave?: (value: AutoReloadSettings) => void | Promise<void>;
  unitLabel?: string;
  locale?: string;
}

const defaultAutoReload: AutoReloadSettings = { enabled: false, threshold: 500, amount: 2000, monthlyCap: 10000 };

/** Auto top-up settings: switch, "below X add Y" inputs, optional monthly cap, validation and save. */
export const CreditAutoReload = React.forwardRef<HTMLElement, CreditAutoReloadProps>(
  (
    { value: valueProp, defaultValue = defaultAutoReload, onValueChange, onSave, unitLabel = "credits", locale, className, ...props },
    ref
  ) => {
    const [value, setValue] = useControllableState<AutoReloadSettings>({ value: valueProp, defaultValue, onChange: onValueChange });
    const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
    const errors = validateAutoReload(value);
    const invalid = Object.keys(errors).length > 0;
    const id = React.useId();
    const titleId = `${id}-title`;
    const patch = (p: Partial<AutoReloadSettings>) => {
      setValue({ ...value, ...p });
      setStatus("idle");
    };
    const capOn = value.monthlyCap != null;

    const save = async () => {
      if (invalid) return;
      setStatus("saving");
      try {
        await onSave?.(value);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    };

    const field = (key: keyof AutoReloadErrors, label: string, v: number | null, onChange: (n: number | null) => void) => (
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-${key}`} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <NumberInput
          id={`${id}-${key}`}
          value={v}
          onValueChange={onChange}
          min={0}
          step={100}
          locale={locale}
          disabled={!value.enabled}
          invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
          wrapperClassName="w-40"
        />
        {errors[key] && (
          <p id={`${id}-${key}-error`} className="text-xs text-destructive">
            {errors[key]}
          </p>
        )}
      </div>
    );

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        className={cn("flex flex-col gap-4 rounded-box border border-border bg-card p-5 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              Auto reload
            </h3>
            <p id={`${id}-desc`} className="text-sm text-muted-foreground">
              Top up automatically so agents never stop mid-task.
            </p>
          </div>
          <Switch
            checked={value.enabled}
            onCheckedChange={(enabled) => patch({ enabled })}
            aria-labelledby={titleId}
            aria-describedby={`${id}-desc`}
          />
        </div>
        <div className={cn("flex flex-wrap items-end gap-x-3 gap-y-3 text-sm", !value.enabled && "opacity-60")}>
          {field("threshold", `When balance falls below (${unitLabel})`, value.threshold, (n) => patch({ threshold: n }))}
          {field("amount", `Add (${unitLabel})`, value.amount, (n) => patch({ amount: n }))}
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={capOn}
              disabled={!value.enabled}
              onChange={(e) => patch({ monthlyCap: e.target.checked ? Math.max((value.amount ?? 0) * 5, 1000) : null })}
              className={cn("size-4 accent-[var(--color-primary)]", focusRing)}
            />
            Limit reloads per month
          </label>
          {capOn && field("monthlyCap", `Monthly cap (${unitLabel})`, value.monthlyCap, (n) => patch({ monthlyCap: n }))}
        </div>
        <div className="flex items-center justify-end gap-3">
          <span role="status" className="text-xs text-muted-foreground">
            {status === "saved" ? "Saved" : status === "error" ? "Couldn't save. Try again." : ""}
          </span>
          <Button size="sm" onClick={() => void save()} disabled={invalid} loading={status === "saving"}>
            Save
          </Button>
        </div>
      </section>
    );
  }
);
CreditAutoReload.displayName = "CreditAutoReload";

/* ------------------------------------------------------------------ */
/* UsageInvoiceTable                                                   */
/* ------------------------------------------------------------------ */

export type InvoiceStatus = "paid" | "due" | "failed" | "refunded";

export interface BillingInvoice {
  id: string;
  number?: string;
  date: Date | string;
  /** Minor units. */
  amount: number;
  currency?: string;
  status: InvoiceStatus;
  description?: string;
}

export interface UsageInvoiceTableProps extends React.HTMLAttributes<HTMLTableElement> {
  invoices: BillingInvoice[];
  locale?: string;
  onDownload?: (invoice: BillingInvoice) => void;
  onPay?: (invoice: BillingInvoice) => void;
  emptyLabel?: string;
}

const invoiceStatus: Record<InvoiceStatus, { label: string; color: BadgeColor }> = {
  paid: { label: "Paid", color: "success" },
  due: { label: "Due", color: "warning" },
  failed: { label: "Failed", color: "destructive" },
  refunded: { label: "Refunded", color: "neutral" },
};

/** Invoice history: date, description, amount, paid/due/failed status and download / pay actions. */
export const UsageInvoiceTable = React.forwardRef<HTMLTableElement, UsageInvoiceTableProps>(
  ({ invoices, locale = "en-US", onDownload, onPay, emptyLabel = "No invoices yet.", className, ...props }, ref) => (
    <Table ref={ref} className={className} {...props}>
      <caption className="sr-only">Invoices</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead align="right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead align="right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center" className="py-8 text-muted-foreground">
              {emptyLabel}
            </TableCell>
          </TableRow>
        ) : (
          invoices.map((inv) => {
            const st = invoiceStatus[inv.status];
            const label = inv.number ?? inv.id;
            return (
              <TableRow key={inv.id} data-status={inv.status}>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDay(inv.date, locale)}</TableCell>
                <TableCell>
                  <span className="block font-medium text-foreground">{label}</span>
                  {inv.description && <span className="block text-xs text-muted-foreground">{inv.description}</span>}
                </TableCell>
                <TableCell align="right" className="tabular-nums">
                  {formatPrice(inv.amount, inv.currency ?? "USD", locale)}
                </TableCell>
                <TableCell>
                  <Badge size="sm" color={st.color} variant="soft">
                    {st.label}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="flex justify-end gap-1">
                    {onPay && (inv.status === "due" || inv.status === "failed") && (
                      <Button size="xs" variant="outline" onClick={() => onPay(inv)} aria-label={`Pay invoice ${label}`}>
                        Pay now
                      </Button>
                    )}
                    {onDownload && (
                      <Button size="icon-xs" variant="ghost" onClick={() => onDownload(inv)} aria-label={`Download invoice ${label}`}>
                        <RiDownloadLine aria-hidden />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  )
);
UsageInvoiceTable.displayName = "UsageInvoiceTable";

/* ------------------------------------------------------------------ */
/* BillingBanner                                                       */
/* ------------------------------------------------------------------ */

export type BillingBannerTone = "trial" | "payment-failed" | "over-limit" | "info";

export interface BillingBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone: BillingBannerTone;
  /** Days left in the trial (tone "trial"). */
  daysLeft?: number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const bannerTone: Record<BillingBannerTone, { box: string; icon: React.ReactNode; action: string }> = {
  trial: { box: "border-info/30 bg-info-soft text-info-soft-foreground", icon: <RiTimeLine />, action: "Choose a plan" },
  "payment-failed": { box: "border-destructive/30 bg-destructive-soft text-destructive-soft-foreground", icon: <RiErrorWarningLine />, action: "Update payment" },
  "over-limit": { box: "border-warning/30 bg-warning-soft text-warning-soft-foreground", icon: <RiAlertLine />, action: "Upgrade" },
  info: { box: "border-border bg-subtle text-foreground", icon: <RiCoinsLine />, action: "View billing" },
};

function bannerTitle(tone: BillingBannerTone, daysLeft?: number) {
  switch (tone) {
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

const bannerDescription: Record<BillingBannerTone, string> = {
  trial: "Pick a plan to keep your agents, history and integrations.",
  "payment-failed": "Update your card to avoid interruptions. We'll retry automatically in 3 days.",
  "over-limit": "New runs are paused until you upgrade or the quota resets.",
  info: "",
};

/** Tone-based billing notice (trial ending, payment failed, over limit) with a CTA. */
export const BillingBanner = React.forwardRef<HTMLDivElement, BillingBannerProps>(
  ({ tone, daysLeft, title, description, actionLabel, onAction, onDismiss, className, ...props }, ref) => {
    const t = bannerTone[tone];
    const desc = description ?? bannerDescription[tone];
    return (
      <div
        ref={ref}
        role={tone === "payment-failed" || tone === "over-limit" ? "alert" : "status"}
        data-tone={tone}
        className={cn("flex flex-wrap items-center gap-3 rounded-box border px-4 py-3 text-sm", t.box, className)}
        {...props}
      >
        <span aria-hidden className="flex shrink-0 [&_svg]:size-5">
          {t.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title ?? bannerTitle(tone, daysLeft)}</p>
          {desc && <p className="opacity-90">{desc}</p>}
        </div>
        {onAction && (
          <Button size="sm" variant={tone === "payment-failed" ? "destructive" : tone === "info" ? "secondary" : "primary"} onClick={onAction} trailingIcon={<RiArrowRightLine />}>
            {actionLabel ?? t.action}
          </Button>
        )}
        {onDismiss && (
          <Button size="icon-sm" variant="ghost" onClick={onDismiss} aria-label="Dismiss">
            <RiCloseLine aria-hidden />
          </Button>
        )}
      </div>
    );
  }
);
BillingBanner.displayName = "BillingBanner";

/* ------------------------------------------------------------------ */
/* CheckoutSteps                                                       */
/* ------------------------------------------------------------------ */

export type CheckoutStep = "plan" | "payment" | "confirm" | "authenticate" | "success" | "failure";
export type CheckoutOutcome = "succeeded" | "requires_action" | { status: "failed"; message?: string };

export interface CheckoutPaymentOption {
  id: string;
  last4: string;
  brand?: CardBrand;
  expiry?: string;
}

export interface CheckoutStepsProps extends React.HTMLAttributes<HTMLDivElement> {
  plan: { name: string; price: number; interval?: BillingInterval; description?: string };
  currency?: string;
  locale?: string;
  paymentMethods?: CheckoutPaymentOption[];
  /** Custom new-card form shown under the saved methods. */
  newPaymentSlot?: React.ReactNode;
  /** Charge; return "requires_action" to step up to 3-D Secure. Default resolves "succeeded". */
  onConfirm?: (paymentMethodId: string | null) => Promise<CheckoutOutcome> | CheckoutOutcome;
  /** Complete the SCA challenge. Default resolves "succeeded". */
  onAuthenticate?: () => Promise<"succeeded" | "failed"> | "succeeded" | "failed";
  onDone?: () => void;
  onStepChange?: (step: CheckoutStep) => void;
  defaultStep?: CheckoutStep;
}

const stepIndex: Record<CheckoutStep, number> = { plan: 0, payment: 1, confirm: 2, authenticate: 2, success: 4, failure: 3 };

/** Multi-step checkout: plan → payment → confirm (with 3-D Secure step-up) → success or failure with retry. */
export const CheckoutSteps = React.forwardRef<HTMLDivElement, CheckoutStepsProps>(
  (
    {
      plan,
      currency = "USD",
      locale = "en-US",
      paymentMethods = [],
      newPaymentSlot,
      onConfirm,
      onAuthenticate,
      onDone,
      onStepChange,
      defaultStep = "plan",
      className,
      ...props
    },
    ref
  ) => {
    const [step, setStepState] = React.useState<CheckoutStep>(defaultStep);
    const [method, setMethod] = React.useState<string | null>(paymentMethods[0]?.id ?? null);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const headingRef = React.useRef<HTMLHeadingElement>(null);
    const shownStep = React.useRef(step);
    const setStep = (s: CheckoutStep) => {
      setStepState(s);
      onStepChange?.(s);
    };
    // Move focus to the new step's heading only when the step actually changes (not on mount,
    // and not when StrictMode re-runs the effect).
    React.useEffect(() => {
      if (shownStep.current === step) return;
      shownStep.current = step;
      headingRef.current?.focus();
    }, [step]);

    const price = formatPrice(plan.price, currency, locale);
    const per = plan.interval === "yearly" ? "year" : "month";
    const canPay = paymentMethods.length === 0 || method != null;

    const confirm = async () => {
      setBusy(true);
      setError(null);
      try {
        const outcome = onConfirm ? await onConfirm(method) : "succeeded";
        if (outcome === "succeeded") setStep("success");
        else if (outcome === "requires_action") setStep("authenticate");
        else {
          setError(outcome.message ?? "Your card was declined.");
          setStep("failure");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setStep("failure");
      } finally {
        setBusy(false);
      }
    };

    const authenticate = async () => {
      setBusy(true);
      try {
        const r = onAuthenticate ? await onAuthenticate() : "succeeded";
        if (r === "succeeded") setStep("success");
        else {
          setError("Authentication failed. Your bank didn't approve the payment.");
          setStep("failure");
        }
      } finally {
        setBusy(false);
      }
    };

    const titles: Record<CheckoutStep, string> = {
      plan: "Review your plan",
      payment: "Payment method",
      confirm: "Confirm and pay",
      authenticate: "Verify with your bank",
      success: "You're all set",
      failure: "Payment failed",
    };

    return (
      <div ref={ref} data-step={step} className={cn("flex w-full max-w-lg flex-col gap-6 rounded-box border border-border bg-card p-6 shadow-xs", className)} {...props}>
        <Steps
          aria-label="Checkout progress"
          current={stepIndex[step]}
          steps={[{ title: "Plan" }, { title: "Payment" }, { title: "Confirm" }, { title: "Done" }]}
        />
        <h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground outline-none">
          {titles[step]}
        </h3>

        {step === "plan" && (
          <>
            <div className="flex items-start justify-between gap-4 rounded-box border border-border bg-subtle p-4">
              <div>
                <p className="font-medium text-foreground">{plan.name}</p>
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
              </div>
              <p className="text-right text-sm">
                <span className="block font-semibold text-foreground tabular-nums">{price}</span>
                <span className="text-muted-foreground">per {per}</span>
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep("payment")} trailingIcon={<RiArrowRightLine />}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            {paymentMethods.length > 0 && (
              <div role="radiogroup" aria-label="Saved payment methods" className="flex flex-col gap-2">
                {paymentMethods.map((pm) => (
                  <label
                    key={pm.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-box border px-4 py-3 text-sm transition-colors",
                      method === pm.id ? "border-primary bg-primary-soft/40" : "border-border hover:bg-accent"
                    )}
                  >
                    <input type="radio" name="checkout-method" value={pm.id} checked={method === pm.id} onChange={() => setMethod(pm.id)} className="size-4 accent-[var(--color-primary)]" />
                    <CardBrandMark brand={pm.brand ?? "unknown"} />
                    <span className="flex-1 font-medium text-foreground">
                      {brandName(pm.brand ?? "unknown")} •••• {pm.last4}
                    </span>
                    {pm.expiry && <span className="text-muted-foreground">{pm.expiry}</span>}
                  </label>
                ))}
              </div>
            )}
            {newPaymentSlot}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("plan")}>
                Back
              </Button>
              <Button disabled={!canPay} onClick={() => setStep("confirm")} trailingIcon={<RiArrowRightLine />}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <dl className="flex flex-col gap-2 rounded-box border border-border p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium text-foreground">{plan.name}</dd>
              </div>
              {method && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd className="font-medium text-foreground">•••• {paymentMethods.find((m) => m.id === method)?.last4}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium text-foreground">Due today</dt>
                <dd className="font-semibold text-foreground tabular-nums">{price}</dd>
              </div>
            </dl>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("payment")} disabled={busy}>
                Back
              </Button>
              <Button onClick={() => void confirm()} loading={busy}>
                Pay {price}
              </Button>
            </div>
          </>
        )}

        {step === "authenticate" && (
          <>
            <div
              data-slot="sca-frame"
              className="flex flex-col items-center gap-3 rounded-box border border-dashed border-border-strong bg-subtle px-6 py-8 text-center"
            >
              <RiShieldCheckLine aria-hidden className="size-8 text-primary" />
              <p className="text-sm font-medium text-foreground">3-D Secure verification</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Your bank needs to confirm this payment. The issuer's challenge renders here; approve it in your banking app or enter the code it sends.
              </p>
              {busy && <Spinner size="sm" label="Waiting for your bank" />}
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setError("Authentication was canceled.");
                  setStep("failure");
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void authenticate()} loading={busy}>
                Complete authentication
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
            <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
              <RiCheckLine className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              You're now on {plan.name}. A receipt for {price} is on its way.
            </p>
            {onDone && <Button onClick={onDone}>Done</Button>}
          </div>
        )}

        {step === "failure" && (
          <div className="flex flex-col gap-4">
            <div role="alert" className="flex items-start gap-3 rounded-box border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">
              <RiErrorWarningLine aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p>{error ?? "Your payment couldn't be completed."}</p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("payment")}>
                Change payment method
              </Button>
              <Button onClick={() => setStep("confirm")}>Try again</Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
CheckoutSteps.displayName = "CheckoutSteps";
