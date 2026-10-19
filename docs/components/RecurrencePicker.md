# RecurrencePicker

> Repeat-rule editor: none / daily / weekly (weekday toggles) / monthly / yearly / custom interval, plus an end condition.

- Import: `import { RecurrencePicker } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/patterns/recurrence-picker` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `RecurrenceRule` | `{ freq: "none" }` | Initial rule when uncontrolled; the default is "does not repeat". |
| `legend` | `string` | `"Repeat"` | Caption of the fieldset, shown above the controls. |
| `onValueChange` | `(rule: RecurrenceRule) => void` |  | Called with the new rule after every edit. |
| `referenceDate` | `Date` |  | Reference date used for sensible defaults (weekday, day of month). Default today. |
| `showSummary` | `boolean` | `true` | Show the human-readable summary under the controls. Default true. |
| `value` | `RecurrenceRule` |  | Controlled recurrence rule (frequency, interval, weekdays, end). Use with `onValueChange`. |

## Example (live: `#/components/social/recurrence-picker` in the playground)

```tsx
import * as React from "react";
import { RecurrencePicker, describeRecurrence, toRRule } from "@sutra/ui/social";

function RecurrenceDemo() {
  const [rule, setRule] = React.useState<RecurrenceRule>({ freq: "weekly", byWeekday: ["MO", "WE"] });
  const rrule = toRRule(rule, { prefix: true });
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 w-full gap-6 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <RecurrencePicker value={rule} onValueChange={setRule} />
        <div className="space-y-3 rounded-box border border-border bg-subtle p-4">
          {/* describeRecurrence() */}
          <p className="text-sm font-medium">{describeRecurrence(rule)}</p>
          {/* toRRule() */}
          <code className="block break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{rrule || "(none)"}</code>
        </div>
      </div>
    </div>
  );
}
```
