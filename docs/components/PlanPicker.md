# PlanPicker

> Tiered plan cards with a monthly/yearly toggle, feature checklists, per-plan CTAs and a downgrade preview.

- Import: `import { PlanPicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-plans` (kit `billing`)
- `data-slot`: `plan-picker`, `savings-badge`, `plan-price`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `plans` (required) | `BillingPlan[]` |  | Plans to compare, each with a name, price per interval, features and call to action. |
| `currency` | `string` | `"USD"` | ISO 4217 code used to format prices. Default "USD". |
| `currentPlanId` | `string` |  | Id of the plan the user is on; that card shows "Current plan" and plans below it ask to confirm a downgrade. |
| `defaultInterval` | `BillingInterval` | `"monthly"` | Initial interval when `interval` is not controlled. |
| `hideIntervalToggle` | `boolean` |  | Hide the monthly/yearly toggle. |
| `interval` | `BillingInterval` |  | Controlled billing interval: `monthly` or `yearly`. |
| `locale` | `string` | `"en-US"` | BCP 47 locale used to format prices. |
| `onIntervalChange` | `(interval: BillingInterval) => void` |  | Called with the interval when the user flips the toggle. |
| `onSelect` | `(plan: BillingPlan, interval: BillingInterval) => void` |  | Called on Upgrade / Contact / Select, and after confirming a downgrade. |

## Example (live: `#/components/billing-marketing/plan-picker` in the playground)

```tsx
import * as React from "react";
import { PlanPicker } from "@cleanprompt/sutra-ui/billing";

function PlanPickerDemo() {
  const [current, setCurrent] = React.useState("pro");
  const [interval, setInterval] = React.useState<BillingInterval>("monthly");
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="flex w-full flex-col gap-3">
      <PlanPicker
        plans={plans}
        currentPlanId={current}
        interval={interval}
        onIntervalChange={setInterval}
        onSelect={(plan, iv) => {
          if (!plan.contactSales) setCurrent(plan.id);
          setLast(`${plan.contactSales ? "Contact sales for" : "Switched to"} ${plan.name} (${iv})`);
        }}
      />
      <p role="status" className="text-center text-xs text-muted-foreground">
        {last ?? "Try Upgrade on Team, or Downgrade to Free to see what you'd lose."}
      </p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): plans.
