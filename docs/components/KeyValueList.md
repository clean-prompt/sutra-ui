# KeyValueList

> Semantic description list of facts: name on one side, value on the other.

- Import: `import { KeyValueList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/primitives/key-value` (primitives)
- `data-slot`: `key-value-list`
- Part of [`KeyValue`](KeyValue.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `2 \| 3 \| 4` | `2` | Columns for the `grid` layout. |
| `dividers` | `boolean` | `true` | Hairlines between rows (rows/stacked layouts). Default true. |
| `empty` | `React.ReactNode` | `"—"` | Placeholder for missing values. |
| `items` | `KeyValueItem[]` |  | Data-driven alternative to `KeyValue` children. |
| `layout` | `KeyValueLayout` | `"rows"` | `rows` label left / value right, `stacked` label above value, `grid` stacked cells in columns. |
| `mono` | `boolean` | `false` | Render every value in the mono face. |

## Notes

See the notes in [`KeyValue`](KeyValue.md#notes).

## Example

```tsx
import { KeyValue, KeyValueList } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <KeyValueList className="max-w-sm">
      <KeyValue label="Plan" value="Team" />
      <KeyValue label="Seats" value="12 of 15 used" />
      <KeyValue label="API key" value="sk_live_9f3a…c21b" copyable="sk_live_9f3a7d2e41c21b" mono />
      <KeyValue label="Renews" value="1 Nov 2026" />
    </KeyValueList>
  );
}
```
