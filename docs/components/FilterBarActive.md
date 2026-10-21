# FilterBarActive

> Row of applied filter tokens. Pass `filters` or `FilterBarToken` children.

- Import: `import { FilterBarActive } from "@sutra/ui"`
- Source: `packages/ui/src/patterns/filter-bar` (patterns)
- `data-slot`: `filter-bar-active`
- Part of [`FilterBar`](FilterBar.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `filters` | `FilterBarActiveFilter[]` |  | Active filters to show as removable tokens, each with a `label` and a remove handler. |
| `removeLabel` | `string \| ((filter: FilterBarActiveFilter) => string)` | `"Remove filter"` | Accessible name of the remove buttons of `filters`: a string for all of them, or a function of the filter, e.g. `(f) => "Remove " + f.id`. A filter's own `removeLabel` wins. |

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
