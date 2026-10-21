# PaymentCardInput

> Card number / expiry / CVC fields with auto-formatting, brand mark, validation and auto-advance.

- Import: `import { PaymentCardInput } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/billing/payment-card` (kit `billing`)
- `data-slot`: `payment-card-input`
- Part of [`PaymentCard`](PaymentCard.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `PaymentCardValue` | `emptyCard` | Initial card details when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables every field. |
| `labels` | `{ number?: string; expiry?: string; cvc?: string }` | `{}` | Accessible labels of the number, expiry and security code fields. |
| `now` | `Date` |  | Reference date for expiry validation. |
| `onComplete` | `(value: PaymentCardValue, brand: CardBrand) => void` |  | Called when every field is complete and valid. |
| `onValueChange` | `(value: PaymentCardValue, meta: { brand: CardBrand; valid: boolean }) => void` |  | Called with the card details and the detected brand and validity on every edit. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Field size: `sm`, `md` or `lg`. |
| `value` | `PaymentCardValue` |  | Controlled card details (number, expiry and security code). |

## Example (live: `#/components/security/payment-card-input` in the playground)

```tsx
import * as React from "react";
import { PaymentCard, PaymentCardInput, validateCardNumber } from "@cleanprompt/sutra-ui/security";

function PaymentCardInputDemo() {
  const [value, setValue] = React.useState<PaymentCardValue>({ number: "", expiry: "", cvc: "" });
  const brand = validateCardNumber(value.number).brand;
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 items-center gap-6 @xl:grid-cols-2">
        <PaymentCardInput value={value} onValueChange={setValue} className="max-w-sm" />
        <PaymentCard
          number={value.number || "0000"}
          brand={value.number ? undefined : "unknown"}
          holder="Vyom Patel"
          expiry={value.expiry || "MM/YY"}
          cvv={value.cvc || undefined}
          revealable={false}
          defaultRevealed
          issuer={brand === "unknown" ? "Live preview" : undefined}
        />
      </div>
    </div>
  );
}
```
