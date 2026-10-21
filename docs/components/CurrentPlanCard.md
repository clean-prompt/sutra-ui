# CurrentPlanCard

> Summary of the active subscription: price, renewal, seats, quota meters, payment method and actions.

- Import: `import { CurrentPlanCard } from "@sutra/ui"` (or from `@sutra/ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-current-plan` (kit `billing`)
- `data-slot`: `current-plan-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `planName` (required) | `string` |  | Name of the plan, shown as the heading. |
| `price` (required) | `number` |  | Price per interval in minor units. |
| `currency` | `string` | `"USD"` | ISO 4217 code used to format the price. Default "USD". |
| `interval` | `BillingInterval` | `"monthly"` | Billing interval the price is for. Default "monthly". |
| `locale` | `string` | `"en-US"` | BCP 47 locale used to format the price and dates. Default "en-US". |
| `onCancel` | `() => void` |  | Called when the user presses Cancel plan; the button is hidden when unset. |
| `onManage` | `() => void` |  | Called when the user presses Manage; the button is hidden when unset. |
| `onUpdatePayment` | `() => void` |  | Called when the user presses Update payment method; the button is hidden when unset. |
| `paymentMethod` | `BillingPaymentMethod` |  | Payment method on file, shown as a brand and last four digits. |
| `renewsAt` | `Date \| string` |  | Date the plan renews or ends; shown beside the status. |
| `seats` | `{ used: number; total: number }` |  | Seats in use and total; shown as a seat meter. |
| `status` | `SubscriptionStatusInput` | `"active"` | Subscription status (for example active, trialing, past due or canceled); sets the status badge. |
| `usage` | `PlanUsageQuota[]` | `[]` | Usage quotas of the plan, each drawn as a labelled meter. |

## Example (live: `#/components/billing-marketing/current-plan` in the playground)

```tsx
import { CurrentPlanCard } from "@sutra/ui/billing";

<CurrentPlanCard
  planName="Pro"
  price={2000}
  renewsAt="2026-11-01"
  seats={{ used: 4, total: 5 }}
  usage={[
    { id: "runs", label: "Agent runs", used: 4620, limit: 5000 },
    { id: "storage", label: "Storage", used: 6.2, limit: 20, unit: "GB" },
    { id: "voice", label: "Voice minutes", used: 312, limit: 400, unit: "min" },
  ]}
  paymentMethod={{ last4: "4242", brand: "visa", expiry: "08/28", holder: "Maya Patel" }}
  onManage={() => {}}
  onCancel={() => {}}
  onUpdatePayment={() => {}}
/>
```
