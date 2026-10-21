# PaymentCard

> Card visual with brand detection, masked/revealable number, and a flip to the CVV side.

- Import: `import { PaymentCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/billing/payment-card` (kit `billing`)
- `data-slot`: `payment-card`, `payment-card-number`, `payment-card-cvv`
- Parts: [`PaymentCardInput`](PaymentCardInput.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `number` (required) | `string` |  | Full number, or just the last 4 digits. |
| `background` | `string` |  | Full CSS background override. |
| `brand` | `CardBrand` |  | Overrides detection. |
| `color` | `string` |  | Base color for a custom gradient. |
| `cvv` | `string` |  | Security code, shown on the back; setting it makes the card flippable. |
| `defaultFlipped` | `boolean` | `false` | Initial state when `flipped` is not controlled. |
| `defaultRevealed` | `boolean` | `false` | Initial reveal state when `revealed` is not controlled. |
| `expiry` | `string` |  | "MM/YY". |
| `flippable` | `boolean` |  | Allow flipping to the back (default true when `cvv` is set). |
| `flipped` | `boolean` |  | Controlled state of the card: true shows the back. |
| `holder` | `string` |  | Cardholder name, shown on the card face. |
| `issuer` | `React.ReactNode` |  | Issuer / bank name or card nickname shown top-left. |
| `onFlippedChange` | `(flipped: boolean) => void` |  | Called with the new state when the user flips the card. |
| `onRevealedChange` | `(revealed: boolean) => void` |  | Called with the new state when the user shows or hides the number. |
| `revealable` | `boolean` |  | Allow revealing the full number. Default true when the full number is known. |
| `revealed` | `boolean` |  | Controlled state of the full number: true shows it, false masks all but the last four digits. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Card size: `sm`, `md` or `lg`. |

## Part props

### PaymentCardInput

Card number / expiry / CVC fields with auto-formatting, brand mark, validation and auto-advance.

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

## Example (live: `#/components/security/payment-card` in the playground)

```tsx
import { PaymentCard } from "@cleanprompt/sutra-ui/security";

<PaymentCard number="4242424242424242" holder="Vyom Patel" expiry="08/29" cvv="123" issuer="Sutra Bank" />
<PaymentCard number="5555555555554444" holder="Vyom Patel" expiry="02/28" cvv="907" issuer="Travel" />
<PaymentCard number="378282246310005" holder="Vyom Patel" expiry="11/27" cvv="4410" size="sm" />
<PaymentCard number="6521500000000006" holder="Vyom Patel" expiry="05/30" size="sm" color="#7c3aed" issuer="Custom color" />
<PaymentCard number="1234" brand="jcb" holder="Vyom Patel" expiry="09/26" size="sm" issuer="Last 4 only" />
```
