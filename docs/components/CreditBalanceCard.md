# CreditBalanceCard

> Credit balance with burn rate, projected run-out date and a Buy credits dialog with preset amounts.

- Import: `import { CreditBalanceCard } from "@sutra/ui"` (or from `@sutra/ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-credits` (kit `billing`)
- `data-slot`: `credit-balance-card`, `credit-balance`, `run-out`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `balance` (required) | `number` |  | Credits left. |
| `currency` | `string` | `"USD"` | ISO 4217 code used to format prices. Default "USD". |
| `dailyBurn` | `number` | `0` | Average credits spent per day. |
| `locale` | `string` | `"en-US"` | BCP 47 locale used to format numbers and dates. Default "en-US". |
| `lowRunwayDays` | `number` | `7` | Days of runway below which the card warns. Default 7. |
| `now` | `Date` |  | "Now" for the projection (defaults to the current date). |
| `onBuy` | `(preset: CreditPreset) => void \| Promise<void>` |  | May return a promise; the dialog closes when it resolves. |
| `presets` | `CreditPreset[]` | `defaultPresets` | Top-up packs offered in the buy dialog, each with credits and a price; defaults to the built-in set. |
| `unitLabel` | `string` | `"credits"` | Name of the credit unit. Default "credits". |

## Example (live: `#/components/billing-marketing/credits` in the playground)

```tsx
import * as React from "react";
import { CreditAutoReload, CreditBalanceCard } from "@sutra/ui/billing";

function CreditsDemo() {
  const [balance, setBalance] = React.useState(1840);
  const [reload, setReload] = React.useState<AutoReloadSettings>({ enabled: true, threshold: 500, amount: 2000, monthlyCap: 10000 });
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 w-full gap-4 @2xl:grid-cols-2">
        <CreditBalanceCard
          balance={balance}
          dailyBurn={310}
          onBuy={(p) =>
            new Promise<void>((resolve) =>
              setTimeout(() => {
                setBalance((b) => b + p.credits);
                resolve();
              }, 700)
            )
          }
        />
        <CreditAutoReload value={reload} onValueChange={setReload} onSave={() => new Promise<void>((r) => setTimeout(r, 600))} />
      </div>
    </div>
  );
}
```
