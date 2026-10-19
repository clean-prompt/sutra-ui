# ChartLegend

> Series legend; interactive entries toggle and isolate series.

- Import: `import { ChartLegend } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/patterns/chart-container` (patterns)
- `data-slot`: `chart-legend`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `ChartLegendItem[]` |  | Legend entries: each has a `key`, a `label` and a colour. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the entries within the legend row. |
| `hidden` | `string[]` | `[]` | Keys currently hidden. |
| `marker` | `"square" \| "line" \| "dot"` | `"square"` | Swatch shape: "square" for bars/areas, "line" for line charts. |
| `onHiddenChange` | `(hidden: string[]) => void` |  | Makes entries toggle buttons. Alt/⌥-click, Alt+Enter or double-click isolates a series. |

## Notes

**When to use:** The frame every Sutra chart is built on, and the parts to build a chart of your own. `ChartContainer` measures its width, gives the drawing an accessible name and a hidden data table; `ChartTooltip` and `ChartLegend` are the readout card and the series toggle.

**Use instead when:**
- `LineChart`: a standard line, area or bar chart (they already use this frame)
- `DonutChart`: parts of a whole
- `Sparkline`: a tiny trend without axes

### Keyboard

| Key | Action |
|---|---|
| Enter, Space | On an interactive `ChartLegend` entry: hide or show that series |
| Alt+Enter, Alt+Space | On a legend entry: show only that series, or restore all if it is already the only one |
| Tab / Shift+Tab | Moves between legend entries |

`ChartContainer` handles no keys itself: pass `tabIndex` and `onKeyDown` to step through points (the cartesian charts do exactly that). The frame has `dir="ltr"`, so keys you map to arrows keep their physical meaning on an RTL page. `ChartLegend` is outside the island and follows the page direction. `ChartTooltip` is not focusable.

### Screen readers

- The frame is `role="img"` named by the required `label`; everything drawn inside is inside an image, so put data in the `table` prop: a visually hidden `<table>` after the frame (caption is the label, first column becomes row headers).
- Mark the SVG you draw `aria-hidden`, as the built-in charts do.
- An interactive legend is a `group` named "Toggle series" of buttons with `aria-pressed`; without `onHiddenChange` it is a `list` named "Legend" of `listitem`s. Swatches are `aria-hidden`.
- `ChartTooltip` has no role and is not announced; add your own live region for keyboard use.

### Reduced motion

No motion of its own. The legend colours fade with a transition that the global net ends in 1 ms. Motion in your own marks is your choice (use `motion-safe:`).

### Server rendering

Server render: part of it fills in after mount. The first render, on the server and before hydration, passes `defaultWidth` (600) to a `children` function; the real width is measured after mount with a layout effect and `ResizeObserver` and the children re-render. A plain node as `children` is unaffected. The sr-only table and the legend render on the server.

### Slots

- `chart`: the frame (`role="img"`, `dir="ltr"`, `relative`, full width)
- `chart-tooltip`: the floating readout card
- `chart-legend`: the legend row

### Gotchas

- Props are spread after the defaults, so a `dir`, `role` or `aria-label` you pass replaces the island's `dir="ltr"`, `role="img"` or the label: do not pass `dir` unless the chart really should mirror.
- `ChartTooltip` is absolutely positioned inside the nearest positioned ancestor and does not use a portal; you place it with `style`. It is `pointer-events-none`, so it cannot be hovered or clicked.
- `ChartLegend` is controlled: keep the `hidden` keys in state and update them in `onHiddenChange`. Its `marker` is `square`, `line` or `dot`.
- `height` sizes the frame (default 240), not the legend; a `table` row's first cell is rendered as a `th scope="row"`.

## Example

```tsx
import { ChartContainer } from "@sutra/ui";

const visits = [
  { day: "Mon", count: 120 },
  { day: "Tue", count: 180 },
  { day: "Wed", count: 90 },
];

export function Example() {
  return (
    <ChartContainer
      label="Visits per day"
      height={160}
      table={{ columns: ["Day", "Visits"], rows: visits.map((v) => [v.day, String(v.count)]) }}
    >
      {({ width, height }) => (
        <svg width={width} height={height} aria-hidden="true" className="block">
          {visits.map((v, i) => {
            const slot = width / visits.length;
            const barHeight = (v.count / 200) * height;
            return <rect key={v.day} x={i * slot + 8} y={height - barHeight} width={slot - 16} height={barHeight} className="fill-primary" />;
          })}
        </svg>
      )}
    </ChartContainer>
  );
}
```
