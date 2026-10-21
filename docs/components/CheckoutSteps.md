# CheckoutSteps

> Multi-step checkout: plan → payment → confirm (with 3-D Secure step-up) → success or failure with retry.

- Import: `import { CheckoutSteps } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-checkout` (kit `billing`)
- `data-slot`: `checkout-steps`, `sca-frame`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `plan` (required) | `{ name: string; price: number; interval?: BillingInterval; description?: string }` |  | Plan being bought: name, price in minor units, interval and description. |
| `currency` | `string` | `"USD"` | ISO 4217 code used to format the price. Default "USD". |
| `defaultStep` | `CheckoutStep` | `"plan"` | Step shown first. Default "plan". |
| `locale` | `string` | `"en-US"` | BCP 47 locale used to format the price. Default "en-US". |
| `newPaymentSlot` | `React.ReactNode` |  | Custom new-card form shown under the saved methods. |
| `onAuthenticate` | `() => Promise<"succeeded" \| "failed"> \| "succeeded" \| "failed"` |  | Complete the SCA challenge. Default resolves "succeeded". |
| `onConfirm` | `(paymentMethodId: string \| null) => Promise<CheckoutOutcome> \| CheckoutOutcome` |  | Charge; return "requires_action" to step up to 3-D Secure. Default resolves "succeeded". |
| `onDone` | `() => void` |  | Called when the user presses Done on the success step. |
| `onStepChange` | `(step: CheckoutStep) => void` |  | Called with the step (`plan`, `payment`, `confirm`, `authenticate`, `success` or `failure`) when the flow moves on. |
| `paymentMethods` | `CheckoutPaymentOption[]` | `[]` | Saved payment methods the user can choose from. |

## Example (live: `#/components/billing-marketing/checkout-steps` in the playground)

```tsx
import * as React from "react";
import { CheckoutSteps } from "@cleanprompt/sutra-ui/billing";
import { Button } from "@cleanprompt/sutra-ui/core";

function CheckoutDemo() {
  const [mode, setMode] = React.useState<"success" | "sca" | "decline">("sca");
  const [key, setKey] = React.useState(0);
  const onConfirm = (): Promise<CheckoutOutcome> =>
    new Promise((resolve) =>
      setTimeout(
        () => resolve(mode === "success" ? "succeeded" : mode === "sca" ? "requires_action" : { status: "failed", message: "Your card was declined (insufficient funds)." }),
        800
      )
    );
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div role="group" aria-label="Simulated outcome" className="flex flex-wrap justify-center gap-2">
        {(["success", "sca", "decline"] as const).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "primary" : "secondary"}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setKey((k) => k + 1);
            }}
          >
            {m === "success" ? "Succeeds" : m === "sca" ? "Needs 3-D Secure" : "Declined"}
          </Button>
        ))}
      </div>
      <CheckoutSteps
        key={key}
        plan={{ name: "Sutra Pro", price: 19200, interval: "yearly", description: "5 agents · 5,000 runs / month · billed yearly" }}
        paymentMethods={[
          { id: "pm_visa", last4: "4242", brand: "visa", expiry: "08/28" },
          { id: "pm_mc", last4: "4444", brand: "mastercard", expiry: "02/27" },
        ]}
        onConfirm={onConfirm}
        onAuthenticate={() => new Promise((r) => setTimeout(() => r("succeeded"), 900))}
        onDone={() => setKey((k) => k + 1)}
      />
    </div>
  );
}
```
