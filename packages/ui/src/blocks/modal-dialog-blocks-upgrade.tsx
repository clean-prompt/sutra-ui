/** UpgradeDialog: plan comparison with a monthly/yearly toggle. */
import * as React from "react";
import { RiCheckLine, RiSparkling2Line } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useAsyncAction as useSharedAsyncAction } from "../hooks/use-async-action";
import { Button } from "../primitives/button";
import { Badge } from "../primitives/badge";
import { SegmentedControl } from "../primitives/segmented-control";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../primitives/dialog";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";

/* ------------------------------------------------------------------ */
/* UpgradeDialog                                                       */
/* ------------------------------------------------------------------ */

export interface UpgradePlan {
  id: string;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  /** Suffix after the price, e.g. "/ user / mo". */
  unit?: string;
  features: string[];
  popular?: boolean;
  cta?: string;
}

export interface UpgradeDialogProps extends BlockDialogBaseProps {
  plans?: UpgradePlan[];
  currentPlan?: string;
  billing?: "monthly" | "yearly";
  defaultBilling?: "monthly" | "yearly";
  onBillingChange?: (billing: "monthly" | "yearly") => void;
  onSelectPlan?: (planId: string, billing: "monthly" | "yearly") => unknown;
  currency?: string;
}

const defaultPlans: UpgradePlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For getting organized.",
    monthly: 0,
    yearly: 0,
    features: ["Notes, Tasks & Calendar", "2 GB storage", "Sync across 2 devices", "7-day history"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "The full suite for one.",
    monthly: 10,
    yearly: 8,
    popular: true,
    cta: "Upgrade to Pro",
    features: ["All 8 Sutra apps", "100 GB storage", "Unlimited devices", "Unlimited history", "AI summaries & search"],
  },
  {
    id: "team",
    name: "Team",
    description: "Shared workspaces for teams.",
    monthly: 16,
    yearly: 13,
    unit: "/ user / mo",
    cta: "Upgrade to Team",
    features: ["Everything in Pro", "1 TB pooled storage", "Shared calendars & projects", "Admin controls & SSO", "Priority support"],
  },
];

/** Plan comparison dialog with a monthly/yearly toggle and feature checklists. */
export function UpgradeDialog({
  plans = defaultPlans,
  currentPlan = "free",
  billing,
  defaultBilling = "yearly",
  onBillingChange,
  onSelectPlan,
  currency = "$",
  trigger,
  className,
  ...openProps
}: UpgradeDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [cycle, setCycle] = useControllableState<"monthly" | "yearly">({
    value: billing,
    defaultValue: defaultBilling,
    onChange: onBillingChange,
  });
  const [chosen, setChosen] = React.useState<string | null>(null);
  // Stays open if `onSelectPlan` throws.
  const choose = useSharedAsyncAction((id: string) => onSelectPlan?.(id, cycle), { onSuccess: () => setOpen(false) });
  const pending = choose.busy ? chosen : null;

  const select = async (id: string) => {
    setChosen(id);
    await choose.run(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="xl" className={cn("gap-6", className)}>
        <DialogHeader align="center" icon={<RiSparkling2Line aria-hidden />} tone="primary">
          <DialogTitle className="text-xl sm:text-2xl">Upgrade your Sutra plan</DialogTitle>
          <DialogDescription>Unlock every app, more storage and AI features. Cancel anytime.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <SegmentedControl
            aria-label="Billing period"
            value={cycle}
            onValueChange={(v) => v && setCycle(v as "monthly" | "yearly")}
            options={[
              { value: "monthly", label: "Monthly" },
              {
                value: "yearly",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    Yearly
                    <Badge color="success" size="sm">
                      Save 20%
                    </Badge>
                  </span>
                ),
              },
            ]}
          />
        </div>
        <DialogBody>
          <div className="grid grid-cols-1 gap-4 pb-1 md:grid-cols-3">
            {plans.map((plan) => {
              const price = cycle === "yearly" ? plan.yearly : plan.monthly;
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col gap-5 rounded-box border bg-card p-5",
                    plan.popular ? "border-primary shadow-md ring-1 ring-primary" : "border-border shadow-xs"
                  )}
                >
                  {plan.popular ? (
                    <Badge color="brand" variant="solid" size="sm" className="absolute -top-2.5 start-5">
                      Most popular
                    </Badge>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-display-sm font-semibold tracking-tight text-foreground tabular-nums">
                      {currency}
                      {price}
                    </span>
                    <span className="text-sm text-muted-foreground">{price === 0 ? "forever" : plan.unit ?? "/ mo"}</span>
                  </div>
                  {isCurrent ? (
                    <Button variant="secondary" disabled fullWidth>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? "primary" : "secondary"}
                      fullWidth
                      loading={pending === plan.id}
                      disabled={pending != null && pending !== plan.id}
                      onClick={() => void select(plan.id)}
                    >
                      {plan.cta ?? `Choose ${plan.name}`}
                    </Button>
                  )}
                  <ul className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-foreground">
                        <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                          <RiCheckLine aria-hidden className="size-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </DialogBody>
        <p className="text-center text-xs text-muted-foreground">
          Prices in USD. {cycle === "yearly" ? "Billed annually." : "Billed monthly."} Taxes may apply.
        </p>
      </DialogContent>
    </Dialog>
  );
}
UpgradeDialog.displayName = "UpgradeDialog";
