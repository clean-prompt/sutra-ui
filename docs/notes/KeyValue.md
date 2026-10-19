---
component: KeyValue
module: primitives/key-value
covers: KeyValueList
use: A description list of facts, a name on one side and a value on the other, in rows, stacked or grid layouts, with an optional copy button per value.
instead: Table = several columns of records to compare or sort; Item = a row with media, title and actions; MetricReadout = one number with a label and a trend
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to the copy buttons (only on entries with `copyable`) |
| Enter, Space | Copies the value (native `<button>`) |

The list and its text are not focusable. No key depends on direction.

## Screen readers
- `KeyValueList` is a real `<dl>`; each `KeyValue` is a `<div>` holding a `<dt>` (the label) and a `<dd>` (the value), so assistive technology announces them as term and definition pairs. Do not put `KeyValue` outside a list.
- The copy button is named "Copy <label>" when `label` is a string, and "Copy value" when it is a node. `CopyButton` announces the copied state itself.
- A missing value shows the `empty` placeholder ("—" by default) as plain text.

## Reduced motion
Static: no animation. The copy button's own feedback follows `CopyButton`.

## Server rendering
Plain markup from the props, with no browser API, so server and client output match. The copy button renders a normal button on the server.

## Slots
- `key-value-list`: the `<dl>`, with `data-layout` set to `rows`, `stacked` or `grid`
- `key-value`: one entry

## Gotchas
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
