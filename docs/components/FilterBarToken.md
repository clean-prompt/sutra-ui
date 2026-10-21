# FilterBarToken

> A single applied filter: "Status: Active ×".

- Import: `import { FilterBarToken } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/patterns/filter-bar` (patterns)
- `data-slot`: `filter-bar-token`
- Part of [`FilterBar`](FilterBar.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `React.ReactNode` |  | Token text, e.g. "Status: Open". |
| `onRemove` | `() => void` |  | Called when the remove button is clicked; setting it shows the button. |
| `removeLabel` | `string` | `"Remove filter"` | Accessible name of the remove button. |

## Notes

See the notes in [`FilterBar`](FilterBar.md#notes).

## Example

```tsx
import * as React from "react";
import { FilterBar, FilterBarActive, FilterBarChip, FilterBarClear, FilterBarSearch } from "@cleanprompt/sutra-ui";

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
