# HeatmapLegend

> "Less ▢▢▢▢ More" scale legend, or labeled swatches for custom stops.

- Import: `import { HeatmapLegend } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/patterns/heatmap` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `colors` (required) | `string[]` |  | Swatch colours from the lowest to the highest step. |
| `highLabel` | `React.ReactNode` | `"More"` | Text after the swatches. |
| `lowLabel` | `React.ReactNode` | `"Less"` | Text before the swatches. |
| `stops` | `HeatmapColorStop[]` |  | Labelled colour stops to list instead of the plain gradient (for threshold scales). |
| `swatchSize` | `number` | `10` | Swatch size in px. |

## Notes

**When to use:** A grid of cells coloured by value, in square tiles or vertical fill bars (per-core CPU, per-GPU load, matrices), with a tooltip and keyboard navigation. `HeatmapLegend` is the "Less to More" key that the grid shows with `legend`.

**Use instead when:**
- `CalendarHeatmap`: one cell per day over a year or month
- `Treemap`: cells sized by value
- `BarChart`: values on an axis with exact heights
- `StatCard`: a single number

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | One cell holds the tab stop (the last focused); Tab then leaves the grid |
| ArrowLeft, ArrowRight | Previous or next cell in the row |
| ArrowUp, ArrowDown | The cell above or below; a missing cell is skipped, and at an edge nothing moves |
| Home, End | First or last cell of the row |
| Ctrl+Home, Ctrl+End (Cmd on Mac) | First or last cell of the grid |
| Enter, Space | Calls `onCellClick` (Space never scrolls the page) |
| Escape | Hides the tooltip |

The grid is a forced `dir="ltr"` island: columns run left to right and ArrowRight is always the next column, also in RTL.

### Screen readers

- A `grid` named by `label` (default "Heatmap") with `row`s and `gridcell`s. Each cell is named "Core 3: 15%": its label, a colon, then the formatted value, or "no data" for `null`.
- The default cell label is "Cell 0" (index from 0), so pass `cellLabel` or a `label` per cell. Colour carries the level visually only; the value is in the name.
- The tooltip appears on hover and focus and is `aria-hidden`; the legend is plain text with `aria-hidden` swatches. Cells also expose `data-level` (-1 no data, 0 empty, 1 to `steps`).

### Reduced motion

Cell colour and the focus ring fade over 300 ms and bar fills grow over 500 ms with transitions, which the global net ends within 1 ms.

### Server rendering

Server render: same markup as the client. Everything is computed from `data` and the props, and the default value text uses `toFixed` rather than `Intl`, so server and client markup are the same. The tooltip only exists after hover or focus.

### Gotchas

- The defaults assume percentages: `min` 0, `max` 100 and a `formatValue` that appends "%". For other units set `min`, `max` and `formatValue`.
- `null` is "no data" (transparent, a dashed outline on squares); a value at or below `min` is the muted "empty" step, a different thing.
- `scale` defaults to `primary` for squares and `thresholds` for `shape="bar"` (warn at 75 and danger at 90 percent of the range, or `thresholds`); `colorStops` (absolute values) override both. `steps` is the number of intensity steps above empty.
- `onCellClick` adds a pointer cursor and the Enter and Space handling, but cells stay `gridcell`s, not buttons. Pass `dir` only if you want to leave the LTR island: props are spread after it.

## Example

```tsx
import { HeatmapGrid } from "@sutra/ui";

const load = [12, 48, 91, 35, 77, 5, 62, 100];

export function Example() {
  return (
    <HeatmapGrid
      data={load}
      columns={4}
      label="CPU load per core"
      cellLabel={(index) => `Core ${index + 1}`}
      legend
    />
  );
}
```
