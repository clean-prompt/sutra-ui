# BillingBanner

> Billing notice (trial ending, payment failed, over limit) with a CTA. A preset over `InlineAlert`.

- Import: `import { BillingBanner } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-banner` (kit `billing`)
- `data-slot`: `billing-banner`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actionLabel` | `string` |  | Label of the action button; defaults to a label chosen from the `kind`. |
| `daysLeft` | `number` |  | Days left in the trial (kind "trial"). |
| `description` | `React.ReactNode` |  | Replaces the default text of the `kind`. |
| `kind` | `BillingBannerKind` |  | What the banner is about. Default "info". |
| `onAction` | `() => void` |  | Called when the user presses the action button; the button is hidden when unset. |
| `onDismiss` | `() => void` |  | Called when the user dismisses the banner; the close button is hidden when unset. |
| `title` | `React.ReactNode` |  | Replaces the default heading of the `kind`. |
| `tone` | `ToneInput \| BillingBannerKind` |  | Semantic colour override when `kind` is set. Without `kind`, a kind value here (`trial`, `payment-failed`, `over-limit`, `info`) is the deprecated way to pass the kind. |

## Example (live: `#/components/billing-marketing/billing-banners` in the playground)

```tsx
import * as React from "react";
import { BillingBanner } from "@cleanprompt/sutra-ui/billing";

function BannersDemo() {
  const [dismissed, setDismissed] = React.useState(false);
  return (
    <div className="flex w-full flex-col gap-3">
      <BillingBanner kind="trial" daysLeft={3} onAction={() => {}} />
      {!dismissed && <BillingBanner kind="payment-failed" onAction={() => {}} onDismiss={() => setDismissed(true)} />}
      <BillingBanner kind="over-limit" onAction={() => {}} description="You've used 5,000 of 5,000 runs this month. Runs reset on Nov 1." />
      <BillingBanner kind="info" title="Yearly billing saves 20%" description="Switch at any time; we prorate the difference." onAction={() => {}} actionLabel="Switch to yearly" />
    </div>
  );
}
```
