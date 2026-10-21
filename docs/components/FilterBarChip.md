# FilterBarChip

> Dashed "+ Filter" button that opens a multi-select checklist.

- Import: `import { FilterBarChip } from "@sutra/ui"`
- Source: `packages/ui/src/patterns/filter-bar` (patterns)
- `data-slot`: `filter-bar-chip`
- Part of [`FilterBar`](FilterBar.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | Filter name shown on the chip (e.g. "Status"). |
| `options` (required) | `Array<FilterBarOption \| string>` |  | Choices in the popover; each is a string or `{ value, label }`. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the popover against the chip. |
| `defaultValue` | `string[]` | `[]` | Initially selected values when uncontrolled. |
| `icon` | `React.ReactNode` |  | Icon shown before the label. |
| `maxDisplay` | `number` | `2` | How many selected values to list before collapsing to "N selected". |
| `onValueChange` | `(value: string[]) => void` |  | Called with the selected values after every change. |
| `searchable` | `boolean` |  | Show a search input inside the popover. Defaults to true when there are more than 7 options. |
| `value` | `string[]` |  | Controlled selected values. Use with `onValueChange`. |

## Notes

See the notes in [`FilterBar`](FilterBar.md#notes).

## Example

```tsx
import * as React from "react";
import { FilterBar, FilterBarActive, FilterBarChip, FilterBarClear, FilterBarSearch } from "@sutra/ui";

export function Example() {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string[]>([]);
  return (
    <div className="space-y-2">
      <FilterBar aria-label="Filter projects">
        <FilterBarSearch aria-label="Search projects" value={query} onValueChange={setQuery} />
        <FilterBarChip label="Status" options={["Active", "Paused", "Archived"]} value={status} onValueChange={setStatus} />
        {status.length > 0 ? <FilterBarClear onClick={() => setStatus([])} /> : null}
      </FilterBar>
      <FilterBarActive
        filters={status.length ? [{ id: "status", label: "Status", value: status.join(", "), onRemove: () => setStatus([]) }] : []}
      />
    </div>
  );
}
```
