# UsageSummary

> Usage dashboard: range switch, KPI tiles, daily bars, per-model bars, wait vs generate and finish reasons.

- Import: `import { UsageSummary } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/usage-summary` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `days` (required) | `UsageDay[]` |  | Daily records, oldest first. |
| `defaultRange` | `UsageRange` | `"7"` | Initial range when `range` is not controlled. Default "7". |
| `onRangeChange` | `(range: UsageRange) => void` |  | Called with the range when the user picks another one. |
| `range` | `UsageRange` |  | Controlled range in days: `"7"`, `"30"` or `"90"`. |

## Example (live: `#/components/ai-extras/usage-summary` in the playground)

```tsx
import * as React from "react";
import { UsageSummary } from "@sutra/ui/ai";

function UsageSummaryDemo() {
  const days = React.useMemo(makeUsage, []);
  return (
    <>
      <UsageSummary days={days} />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): makeUsage.
