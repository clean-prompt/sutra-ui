# UsageInvoiceTable

> Invoice history: date, description, amount, paid/due/failed status and download / pay actions.

- Import: `import { UsageInvoiceTable } from "@sutra/ui"` (or from `@sutra/ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-invoices` (kit `billing`)
- `data-slot`: `usage-invoice-table`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `invoices` (required) | `BillingInvoice[]` |  | Invoices to list, each with a number, date, amount and status. |
| `emptyLabel` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no invoices. Default "No invoices yet". |
| `locale` | `string` | `"en-US"` | BCP 47 locale used to format amounts and dates. Default "en-US". |
| `onDownload` | `(invoice: BillingInvoice) => void` |  | Called with the invoice when the user presses Download; the action is hidden when unset. |
| `onPay` | `(invoice: BillingInvoice) => void` |  | Called with the invoice when the user presses Pay on an open one; the action is hidden when unset. |

## Example (live: `#/components/billing-marketing/invoices` in the playground)

```tsx
import { UsageInvoiceTable } from "@sutra/ui/billing";

<UsageInvoiceTable invoices={invoices} onDownload={() => {}} onPay={() => {}} />
```

Playground helpers in this snippet (not part of the library): invoices.
