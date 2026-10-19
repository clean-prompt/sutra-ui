# FilterBar

> Toolbar row for lists and tables: search, filter chips and actions.

- Import: `import { FilterBar } from "@sutra/ui"`
- Source: `packages/ui/src/patterns/filter-bar` (patterns)
- Parts: [`FilterBarActive`](FilterBarActive.md), [`FilterBarChip`](FilterBarChip.md), [`FilterBarClear`](FilterBarClear.md), [`FilterBarSearch`](FilterBarSearch.md), [`FilterBarToken`](FilterBarToken.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Part props

### FilterBarActive

Row of applied filter tokens. Pass `filters` or `FilterBarToken` children.

| Prop | Type | Default | Description |
|---|---|---|---|
| `filters` | `FilterBarActiveFilter[]` |  | Active filters to show as removable tokens, each with a `label` and a remove handler. |
| `removeLabel` | `string \| ((filter: FilterBarActiveFilter) => string)` | `"Remove filter"` | Accessible name of the remove buttons of `filters`: a string for all of them, or a function of the filter, e.g. `(f) => "Remove " + f.id`. A filter's own `removeLabel` wins. |

### FilterBarChip

Dashed "+ Filter" button that opens a multi-select checklist.

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

### FilterBarSearch

Compact search input with a clear button.

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `""` | Initial search text when uncontrolled. |
| `onValueChange` | `(value: string) => void` |  | Called with the search text as it changes. |
| `size` | `"sm" \| "md"` | `"sm"` | Field height and text size. |
| `value` | `string` |  | Controlled search text. Use with `onValueChange`. |

### FilterBarToken

A single applied filter: "Status: Active ×".

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `React.ReactNode` |  | Token text, e.g. "Status: Open". |
| `onRemove` | `() => void` |  | Called when the remove button is clicked; setting it shows the button. |
| `removeLabel` | `string` | `"Remove filter"` | Accessible name of the remove button. |

## Notes

**When to use:** The toolbar above a list or table: a search field, dashed "+ Filter" chips that open a multi-select checklist, a row of removable tokens for the applied filters, and a "Clear all" button. The parts hold no shared state, so you wire them to your own filter state.

**Use instead when:**
- `Combobox`: pick one or more values for a form field
- `Select`: one value from a short list
- `SegmentedControl`: switch between a few views
- `CommandDialog`: a global search and command palette
- `SearchTrigger`: a field-shaped button that opens it

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Each control is its own tab stop: the search field, its clear button, each chip, each token's remove button, "Clear all" |
| Escape | In the search field with text: clears it (not during IME composition). In an open chip popover: closes it |
| Enter, Space | On a chip: opens the checklist. On an option: toggles it (the list stays open) |
| ArrowDown | In the chip's search input: moves to the first option. In the list: next option, wrapping to the first |
| ArrowUp | Previous option, wrapping to the last |
| Home, End | First or last option |

The chip checklist opens with the first option focused, or the search input when `searchable` (default above 7 options). The checklist is vertical, so RTL changes nothing; icons and padding use logical sides.

### Screen readers

- `FilterBar` is `role="toolbar"` with no label of its own: pass `aria-label`. It does not implement roving arrow keys, so it is a plain row of tab stops.
- A chip is a button named by its label plus the selected values as text ("Status Active Paused", or "Status 3 selected" past `maxDisplay`). It opens a popover with a `listbox` named by the label and `aria-multiselectable`; each option has `aria-selected`; the check box is `aria-hidden`. The search input is named "Search <label>". "No results" is plain text, not a live region.
- `FilterBarSearch` is an `<input type="search">` (role `searchbox`) with a "Clear search" button once it has text; give it an `aria-label`, since the placeholder ("Search…") is its only other name.
- `FilterBarActive` is a `group` named "Active filters"; each token reads "Status: Active" followed by its remove button.

### Reduced motion

The chip popover fades and zooms in with `animate-in` and the check mark scales in over 150 ms; new tokens fade in. The global net removes the movement and ends the transitions within 1 ms.

### Server rendering

Server render: same markup as the client. Plain markup from props (`useId` for the list id). The chip popover is portalled and closed on first render, so nothing is missing on either side.

### Gotchas

- All filter state is yours: `FilterBarChip` takes `value` (string array) with `onValueChange`, `FilterBarSearch` takes `value` with `onValueChange`. Chips do not create tokens: map your state to `FilterBarActive filters`, or render `FilterBarToken`s yourself.
- Every token built from `filters` has the remove button name "Remove filter" unless you name them: `removeLabel` on `FilterBarActive` (a string, or a function of the filter such as `(f) => "Remove " + f.id`) or `removeLabel` on a single filter (which wins); `FilterBarToken` children take `removeLabel` too. Setting `onRemove` is what shows the button.
- Chip options are strings or `{ value, label, icon, count, textValue }`. Search and the summary use `textValue`, else the label when it is a string or number, else the raw `value`: set `textValue` when `label` is a node.
- `FilterPill` is a deprecated alias of `FilterBarChip`. Chip `align` sets the popover alignment (default `start`); `disabled` on the chip prevents opening.

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
