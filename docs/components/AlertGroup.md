# AlertGroup

> Collapsible grouped alert banner: severity summary, sorted list, per-item and bulk dismiss.

- Import: `import { AlertGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ops/alert-group` (kit `ops`)
- `data-slot`: `alert-group`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `alerts` (required) | `AlertItem[]` |  | Alerts to show, grouped by category and sorted by severity. |
| `categoryIcons` | `Record<string, React.ReactNode>` |  | Icons per category. |
| `defaultDismissedIds` | `string[]` |  | Initially dismissed alert ids when `dismissedIds` is not controlled. |
| `defaultExpanded` | `boolean` | `true` | Initial expanded state when `expanded` is not controlled. |
| `dismissedIds` | `string[]` |  | Controlled dismissed ids (persist them via `onDismissedChange`). |
| `dismissible` | `boolean` | `true` | Shows a dismiss button on each alert. Default true. |
| `expanded` | `boolean` |  | Controlled expanded state of the full list; collapsed shows the top alert. |
| `formatTime` | `(time: Date) => string` |  | Custom formatter for each alert's time. |
| `hideWhenEmpty` | `boolean` | `true` | Render nothing when no alert is visible. Default true. |
| `label` | `string` | `"Alerts"` | Accessible region label. Default "Alerts". |
| `now` | `number` |  | Reference time for relative labels; set it in tests and SSR for stable output. |
| `onDismissedChange` | `(ids: string[]) => void` |  | Called with the dismissed ids when the user dismisses an alert. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the list. |

## Example (live: `#/components/monitoring/alert-group` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiRefreshLine } from "@cleanprompt/sutra-ui/icons";
import { AlertGroup } from "@cleanprompt/sutra-ui/ops";

function AlertGroupDemo() {
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  return (
    <div className="flex w-full flex-col gap-3">
      <AlertGroup alerts={alertsData} dismissedIds={dismissed} onDismissedChange={setDismissed} />
      {dismissed.length ? (
        <Button size="sm" variant="outline" className="self-start" leadingIcon={<RiRefreshLine />} onClick={() => setDismissed([])}>
          Restore {dismissed.length} dismissed
        </Button>
      ) : null}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): alertsData.
