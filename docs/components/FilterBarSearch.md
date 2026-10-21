# FilterBarSearch

> Compact search input with a clear button.

- Import: `import { FilterBarSearch } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/patterns/filter-bar` (patterns)
- Part of [`FilterBar`](FilterBar.md)
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `""` | Initial search text when uncontrolled. |
| `onValueChange` | `(value: string) => void` |  | Called with the search text as it changes. |
| `size` | `"sm" \| "md"` | `"sm"` | Field height and text size. |
| `value` | `string` |  | Controlled search text. Use with `onValueChange`. |

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
