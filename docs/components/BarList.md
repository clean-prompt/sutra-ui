# BarList

> Ranked rows with a proportional bar under each value: top apps by CPU, pages by views, …

- Import: `import { BarList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/dataviz`)
- Source: `packages/ui/src/patterns/bar-list` (patterns)
- `data-slot`: `bar-list`, `bar-list-header`, `bar-list-skeleton`, `bar-list-empty`, `bar-list-value`, `bar-list-track`, `bar-list-bar`, `bar-list-item`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `BarListItem[]` |  | Rows to show; each has a `label` and a `value`, plus optional icon, colour and href. |
| `accent` | `Accent` |  | Bar colour. Default primary. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when uncontrolled. |
| `emptyState` | `React.ReactNode` |  | Content shown when there are no items. |
| `expanded` | `boolean` |  | Controlled expanded state when `limit` hides rows. Use with `onExpandedChange`. |
| `header` | `{ label?: React.ReactNode; value?: React.ReactNode }` |  | Column headers above the list ("App" / "CPU"). |
| `highlightFirst` | `boolean` |  | Subtle background on the first row (the leader). |
| `label` | `string` |  | Accessible name of the list. |
| `limit` | `number` |  | Show only the first `limit` rows until expanded. |
| `loading` | `boolean` |  | Data is on its way: with no items, placeholder rows stand in (header labels stay); with items, the root is marked busy. |
| `loadingRows` | `number` | `5` | Placeholder rows shown while loading with no items. Default 5. |
| `max` | `number` |  | Value of a full bar. Default: the largest value. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called when the "Show all" toggle expands or collapses the list. |
| `showAllLabel` | `(total: number) => React.ReactNode` | `(total) => `Show all (${total})`` | Toggle text; receives the number of rows in total. |
| `showAllToggle` | `boolean` | `true` | Show a "Show all" / "Show less" toggle when rows are hidden. Default true. |
| `showLessLabel` | `React.ReactNode` | `"Show less"` | Text of the toggle while expanded. |
| `sort` | `"desc" \| "none"` | `"desc"` | "desc" ranks by value (default); "none" keeps the given order. |
| `valueFormatter` | `(value: number) => React.ReactNode` | `defaultValueFormatter` | Formats the value shown at the end of each row. Default is the localized number. |

## Example (live: `#/components/metrics/bar-list` in the playground)

```tsx
import { Monogram } from "@cleanprompt/sutra-ui/agent-admin";
import { BarList } from "@cleanprompt/sutra-ui/dataviz";

<BarList
  className="w-full max-w-xl"
  accent="green"
  header={{ label: "App", value: "Downloading" }}
  highlightFirst
  limit={3}
  label="Apps by download speed"
  items={[
    { id: "safari", name: "Safari", description: "16 processes", value: 4.6, valueLabel: "4.6 MB/s" },
    { id: "chrome", name: "Google Chrome", description: "96 processes", value: 1.0, valueLabel: "1.0 MB/s" },
    { id: "slack", name: "Slack", description: "13 processes", value: 0.4, valueLabel: "403 kB/s" },
    { id: "mail", name: "Mail", description: "4 processes", value: 0.1, valueLabel: "96 kB/s" },
  ].map((item) => ({ ...item, icon: <Monogram name={item.name} size="sm" /> }))}
/>
```
