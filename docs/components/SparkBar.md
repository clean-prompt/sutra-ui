# SparkBar

> Tiny inline column chart. A left-to-right island like `Sparkline`: the first bar is always on the physical left.

- Import: `import { SparkBar } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/patterns/sparkline` (patterns)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` (required) | `number[]` |  | Values to plot, one bar each, in order. |
| `accent` | `Accent` |  | Categorical colour (`blue`, `amber`, …, a semantic token or any CSS colour). `tone` and `color` take precedence. |
| `color` | `SparklineColor` |  | Any CSS colour (token names still work; prefer `tone` for those). Default primary. |
| `gap` | `number` | `2` | Gap between bars in px (viewBox units). |
| `height` | `number` | `32` | Intrinsic height in px. |
| `highlightLast` | `boolean` |  | Draws the last bar in full colour and the others in `mutedColor`. |
| `label` | `string` |  | Accessible name of the chart (it is exposed as an image). |
| `max` | `number` |  | Fixed scale top (e.g. 100 for percentages). Defaults to the larger of 0 and the data maximum. |
| `min` | `number` |  | Fixed scale bottom (e.g. 0). Defaults to the smaller of 0 and the data minimum. |
| `mutedColor` | `string` |  | Color for non-highlighted bars when `highlightLast` is on. Defaults to a faded `color`. |
| `radius` | `number` | `1.5` | Corner radius of the bars in px (viewBox units). |
| `responsive` | `boolean` |  | Stretches to 100% of the container width. |
| `tone` | `ToneInput` |  | Semantic colour. Takes precedence over `color`. |
| `width` | `number` | `120` | Intrinsic width in px (or viewBox width when `responsive`). |
| `wrapperClassName` | `string` |  | Classes for the wrapper around the SVG. |

## Notes

**When to use:** A tiny inline trend with no axes, as a line, a filled area or bars, for a table cell, a stat tile or a list row. `SparkBar` is the bar form on its own; `type="bar"` hands over to it.

**Use instead when:**
- `LineChart`: a chart with axes, tooltip and a data table
- `StatCard`: a number with a built-in trend
- `Meter`: a level against a limit rather than a history
- `Progress`: completion of a task

### Keyboard

Not focusable: no keyboard interaction. There is no tooltip or point selection.

### Screen readers

- The SVG is `role="img"` with an `aria-label`: `label` when given, otherwise "Trend from 3 to 9" (first and last value; "No data" for an empty array). `SparkBar` defaults to "5 values, latest 9".
- That is all a screen reader gets: there is no data table. Pass a `label` that says what the numbers are ("Requests per minute, last hour") and show the current value as real text beside it.
- The `highlightLast` dot is `aria-hidden` decoration.

### Reduced motion

Line and area charts do not animate. `SparkBar` bars change height and position with a 300 ms transition when data changes, which the reduced-motion net ends within 1 ms.

### Server rendering

Server render: same markup as the client. Pure SVG computed from `data`, `width` and `height`, with an id from `useId` for the area gradient; the server and client markup are the same.

### Gotchas

- A line or area scales to the range of its data (`min` and `max` override), so a flat series fills the box and a tiny change looks large. `type="bar"` always includes 0 on its scale, so the same data looks different; set `min` and `max` on both to compare them.
- Colour precedence is `tone`, then `color`, then `accent`; `trend` (green when the last value is at least the first, red otherwise) only applies when none of the three is set. A token name such as `"success"` works in `color`.
- With `responsive` the SVG stretches to the container width (`preserveAspectRatio="none"`, strokes keep their width) and `width` only sets the viewBox; without it the box is `width` by `height` (default 120 by 32). Both charts are left-to-right islands (`dir="ltr"` on the wrapper, like the other charts): the series starts at the physical left and the `highlightLast` dot sits on the last point, also on an RTL page.
- `type="bar"` ignores `smooth`, `strokeWidth` and `gradient`; `mutedColor`, `gap` and `radius` are props of `SparkBar` only, so render it directly to set them. `highlightLast` is the dot on a line and the full-colour bar on bars.

## Example

```tsx
import { Sparkline } from "@sutra/ui";

export function Example() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Requests</span>
      <Sparkline
        data={[12, 18, 14, 22, 30, 27, 35]}
        type="area"
        trend
        highlightLast
        label="Requests per minute over the last 7 minutes, rising to 35"
      />
      <span className="text-sm font-medium tabular-nums">35/min</span>
    </div>
  );
}
```
