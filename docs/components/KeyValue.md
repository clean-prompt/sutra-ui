# KeyValue

> One fact in a `KeyValueList`, optionally copyable.

- Import: `import { KeyValue } from "@sutra/ui"` (or from `@sutra/ui/identity`)
- Source: `packages/ui/src/primitives/key-value` (primitives)
- `data-slot`: `key-value`
- Parts: [`KeyValueList`](KeyValueList.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `React.ReactNode` |  | Name of the entry, shown as the row's label. |
| `children` | `React.ReactNode` |  | The value, when `value` is not set. |
| `copyable` | `boolean \| string` |  | Adds a copy button; `true` copies the value text, a string copies that text instead. |
| `mono` | `boolean` |  | Shows this value in the monospace face. |
| `truncate` | `boolean` |  | Single-line with ellipsis; the full text is in the `title` tooltip. Default true in `rows`. |
| `value` | `React.ReactNode` |  | The value; `children` work too. Empty values render the list's placeholder. |

## Part props

### KeyValueList

Semantic description list of facts: name on one side, value on the other.

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `2 \| 3 \| 4` | `2` | Columns for the `grid` layout. |
| `dividers` | `boolean` | `true` | Hairlines between rows (rows/stacked layouts). Default true. |
| `empty` | `React.ReactNode` | `"—"` | Placeholder for missing values. |
| `items` | `KeyValueItem[]` |  | Data-driven alternative to `KeyValue` children. |
| `layout` | `KeyValueLayout` | `"rows"` | `rows` label left / value right, `stacked` label above value, `grid` stacked cells in columns. |
| `mono` | `boolean` | `false` | Render every value in the mono face. |

## Notes

**When to use:** A description list of facts, a name on one side and a value on the other, in rows, stacked or grid layouts, with an optional copy button per value.

**Use instead when:**
- `Table`: several columns of records to compare or sort
- `Item`: a row with media, title and actions
- `MetricReadout`: one number with a label and a trend

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to the copy buttons (only on entries with `copyable`) |
| Enter, Space | Copies the value (native `<button>`) |

The list and its text are not focusable. No key depends on direction.

### Screen readers

- `KeyValueList` is a real `<dl>`; each `KeyValue` is a `<div>` holding a `<dt>` (the label) and a `<dd>` (the value), so assistive technology announces them as term and definition pairs. Do not put `KeyValue` outside a list.
- The copy button is named "Copy <label>" when `label` is a string, and "Copy value" when it is a node. `CopyButton` announces the copied state itself.
- A missing value shows the `empty` placeholder ("—" by default) as plain text.

### Reduced motion

Static: no animation. The copy button's own feedback follows `CopyButton`.

### Server rendering

Server render: same markup as the client. Plain markup from the props, with no browser API, so server and client output match. The copy button renders a normal button on the server.

### Slots

- `key-value-list`: the `<dl>`, with `data-layout` set to `rows`, `stacked` or `grid`
- `key-value`: one entry

### Gotchas

- `layout="rows"` (default) truncates the value on one line with the full text in `title`; `stacked` and `grid` wrap instead. `truncate` on a single `KeyValue` overrides either way. The `title` is only set for string or number values.
- `copyable` copies the value only when it is a string or number: with a node value, pass a string (`copyable="sk_live_123_full"`) to say what to copy. An empty value shows no copy button.
- Use either `items` (data) or `KeyValue` children: when `items` is set the children are ignored. `columns` only applies to `layout="grid"` and `dividers` only to `rows` and `stacked`.
- `mono` on the list sets the monospace face for every value; an entry's own `mono` wins, including `mono={false}`.

## Example

```tsx
import { KeyValue, KeyValueList } from "@sutra/ui";

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
