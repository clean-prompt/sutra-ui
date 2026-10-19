---
component: LineChart
module: patterns/chart-cartesian
covers: AreaChart, BarChart
use: Cartesian charts over rows of data. `LineChart` draws lines, `AreaChart` filled (optionally stacked) areas, `BarChart` grouped, stacked or horizontal bars; all three take `data`, `index` and `series`, and share axes, legend, tooltip, time axis and reference lines.
instead: Sparkline = a tiny trend inside a row or card, no axes; DonutChart = parts of a whole; StatCard = one number with a small trend; BarList = a ranked list with proportional bars; ChartContainer = build a chart type that does not exist yet
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab | Focuses the chart frame; leaving it clears the active point |
| ArrowRight, ArrowDown | Next point (the first one when none is active); stops at the last |
| ArrowLeft, ArrowUp | Previous point (the last one when none is active); stops at the first |
| Home, End | First or last point |
| Escape | Clears the active point and its tooltip |
| Enter, Space | On a legend button: hide or show the series. With Alt: show only that series, or restore all |

The frame is a forced `dir="ltr"` island, so ArrowRight always goes toward later points, also on an RTL page; nothing swaps. The legend sits outside the island and follows the page direction.

## Screen readers
- The frame is `role="img"` (focusable) named by `label`, by default "Line chart of Revenue, Cost by day" (also "Area chart", "Stacked area chart", "Bar chart", "Horizontal bar chart"). The SVG is `aria-hidden`; pass your own `label` for a useful name.
- The data is a visually hidden `<table>` after the chart: caption is the label, one row per datum, the index as row header, a missing value as "–". Hidden series drop out of the table and the tooltip.
- Stepping with the keyboard writes "Fri: Prompt 160, Completion 50" into a polite live region. Hover shows the tooltip but does not announce.
- The legend is a `group` named "Toggle series" of buttons with `aria-pressed` (a plain `list` when `legendInteractive={false}`). With `loading`, the root has `aria-busy` and one hidden "Loading line chart…" text.

## Reduced motion
Lines, areas, bars and dots animate data changes with `motion-safe:transition-all duration-500` (the `animate` prop, default true), so with `prefers-reduced-motion` no transition class applies and the chart updates in place. Bar dimming uses `transition-opacity`, which the global net ends in 1 ms. `animate={false}` turns the transitions off for everyone.

## Server rendering
The full SVG renders on the server, but at the fixed fallback width of 600 px: the real width is measured after mount (layout effect plus `ResizeObserver`) and the plot is redrawn then. Tick labels and tooltip text use `Intl` with the runtime locale (and time zone on a time axis), so a server with another locale can differ from the browser: pass `valueFormatter`, `yAxis.formatter` or `xAxis.formatter` to pin them.

## Slots
- `chart-line`: the stroke path of a series (`LineChart` and `AreaChart`)
- `chart-area`: the filled area of a series
- `chart-bar`: one bar
- `chart-dot`: a point marker (`LineChart dots`)
- `chart-active-dot`: the marker on the hovered or focused point
- `chart-crosshair`: the vertical guide on line and area charts
- `chart-hit`: the transparent rectangle that receives pointer and touch events
- `chart-reference-line`: a `referenceLines` entry
- `chart-empty`: the empty placeholder
- `chart-skeleton`: the loading placeholder

## Gotchas
- `loading` shows the placeholder only while `data` is empty; with rows it keeps the chart and just sets `aria-busy`. `emptyState` (default "No data") is never shown while loading.
- `connectNulls` and `xAxis.type="time" | "linear"` have no effect on `BarChart` (bars are always categories), and `connectNulls` is ignored on stacked areas, where a null counts as 0. `referenceLines` with `axis: "x"` need a time or linear axis.
- The legend shows by default only for two or more series. The value axis includes 0 unless you pass `yAxis.min="auto"`.
- Series without a `color` take `var(--chart-N, hex)` in order, so a theme can recolour them; a token name or any CSS colour also works.

## Example
```tsx
import { LineChart } from "@sutra/ui";

const latency = [
  { day: "Mon", median: 90, p95: 210 },
  { day: "Tue", median: 95, p95: 240 },
  { day: "Wed", median: 85, p95: 180 },
  { day: "Thu", median: 110, p95: 290 },
];

export function Example() {
  return (
    <LineChart
      data={latency}
      index="day"
      series={[
        { key: "median", label: "Median" },
        { key: "p95", label: "p95" },
      ]}
      label="Response time by day"
      valueFormatter={(ms) => `${ms} ms`}
      referenceLines={[{ value: 250, label: "Budget" }]}
      emptyState="No data yet"
    />
  );
}
```
