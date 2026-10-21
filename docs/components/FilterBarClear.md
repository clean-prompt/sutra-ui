# FilterBarClear

> "Clear all" text button for resetting filters.

- Import: `import { FilterBarClear } from "@sutra/ui"`
- Source: `packages/ui/src/patterns/filter-bar` (patterns)
- `data-slot`: `filter-bar-clear`
- Part of [`FilterBar`](FilterBar.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

No props of its own.

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
