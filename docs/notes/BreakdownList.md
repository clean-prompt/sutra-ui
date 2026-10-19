---
component: BreakdownList
module: primitives/meter
use: Legend rows for a breakdown: colour marker, optional icon, label, right-aligned value and optional percent. Rows can become toggle buttons that hide or isolate series.
instead: StackedMeter = the bar and legend together (use `legend="list"`); Item = a general row with media, title and actions; KeyValue = facts without colour markers; Table = several columns per row
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between the rows (only when rows are buttons, see `interactive`) |
| Enter, Space | Toggles the focused row's series hidden or shown |
| Alt+Enter, Alt+Space | Isolates the row: hides all the others, or shows everything if it is already isolated |

Alt-click and a double-click on a row isolate it too. The rows are a vertical list with no arrow keys, so RTL changes nothing.

## Screen readers
- A `ul` of `li` rows: pass `aria-label` ("By container"), since the list has no name of its own.
- Interactive rows are `<button aria-pressed>`: pressed means the series is shown. Hidden rows are also struck through and dimmed, and their percent reads a dash.
- The colour marker and the icon are `aria-hidden`; the label names the row. Colour is never the only cue, because the label and value are text.
- The row `title` is "Click to toggle · Alt-click or double-click to isolate".

## Reduced motion
Static; the hover background is a colour transition, which the reduced-motion net ends within 1 ms.

## Server rendering
Plain markup computed from the props with no browser API, so server and client output match.

## Slots
- `breakdown-list`: the `ul`
- `breakdown-list-item`: each `li`, with `data-state` `visible` or `hidden`
- `breakdown-list-marker`: the colour dot or square
- `breakdown-list-icon`: the optional icon box
- `breakdown-list-label`: the label
- `breakdown-list-value`: the value column
- `breakdown-list-percent`: the percent column

## Gotchas
- Rows are plain text unless `interactive` is true, which it is by default only when `onHiddenSeriesChange` is passed. `hiddenSeries` controls the hidden keys; `defaultHiddenSeries` starts them uncontrolled.
- `key` defaults to the label when it is a string, otherwise the row index, and hidden state is stored by key.
- Percent is `share` when given, else `value / total`, where `total` defaults to the sum of the visible rows: hiding a series changes the other rows' percentages. `valueText` replaces the formatted value.
- `color` is a token name (`primary`, `success`, `warning`, `destructive`, `info`, `muted`) or any CSS colour.

## Example
```tsx
import * as React from "react";
import { BreakdownList } from "@sutra/ui";

const items = [
  { label: "Chrome", value: 21.2, color: "primary" },
  { label: "Slack", value: 4.8, color: "info" },
  { label: "Postgres", value: 0.3, color: "warning" },
];

export function Example() {
  const [hidden, setHidden] = React.useState<string[]>([]);
  return (
    <BreakdownList
      className="max-w-xs"
      items={items}
      valueFormatter={(value) => `${value} GB`}
      showPercent
      hiddenSeries={hidden}
      onHiddenSeriesChange={setHidden}
    />
  );
}
```
