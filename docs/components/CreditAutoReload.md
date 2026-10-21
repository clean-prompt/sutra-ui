# CreditAutoReload

> Auto top-up settings: switch, "below X add Y" inputs, optional monthly cap, validation and save.

- Import: `import { CreditAutoReload } from "@sutra/ui"` (or from `@sutra/ui/billing`)
- Source: `packages/ui/src/kits/billing/billing-credits` (kit `billing`)
- `data-slot`: `credit-auto-reload`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `AutoReloadSettings` | `defaultAutoReload` | Initial settings when `value` is not controlled. |
| `locale` | `string` |  | BCP 47 locale used to format numbers. |
| `onSave` | `(value: AutoReloadSettings) => void \| Promise<void>` |  | May return a promise; shows "Saved" when it resolves. |
| `onValueChange` | `(value: AutoReloadSettings) => void` |  | Called with the settings on every edit, before saving. |
| `unitLabel` | `string` | `"credits"` | Name of the credit unit. Default "credits". |
| `value` | `AutoReloadSettings` |  | Controlled auto-reload settings (enabled, threshold and top-up amount). |

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
