/** Plan types, PlanPicker and PlanComparisonTable. */
import * as React from "react";
import { RiAlertLine, RiCheckLine, RiCloseLine, RiSubtractLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useChangeKey } from "../../hooks/use-change-key";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { SegmentedControl } from "../../primitives/segmented-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../primitives/table";
import { formatPrice, yearlySavings } from "./billing-format";

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

/** The per-month price. It slides up when the shown amount changes (the billing interval), never on the first render. */
function PlanPriceAmount({ text }: { text: string }) {
  const n = useChangeKey(text);
  return (
    <span key={n} className={cn("text-display-xs font-semibold tracking-tight text-foreground tabular-nums", n > 0 && "animate-tick")}>
      {text}
    </span>
  );
}

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
                      <PlanPriceAmount text={formatPrice(perMonth, currency, locale)} />
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
            <DialogHeader icon={<RiAlertLine aria-hidden />} tone="warning">
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
