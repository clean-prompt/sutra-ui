# ScatterChart

> Scatter (and bubble) chart: nearest-point hover, keyboard stepping in x order, toggleable series and reference lines.

- Import: `import { ScatterChart } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/patterns/chart-scatter` (patterns)
- `data-slot`: `chart-skeleton`, `chart-marks`, `chart-point`, `chart-reference-line`, `chart-active-point`, `chart-hit`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` (required) | `ChartDatum[]` |  | One row per observation: an x value plus a y value for each series (and a size when `sizeKey` is set). |
| `index` (required) | `string` |  | Key of the x value in each datum. |
| `series` (required) | `ScatterSeries[]` |  | Series to draw; each has a `key`, a `label` and an optional colour and size field. |
| `animate` | `boolean` | `true` | CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. |
| `bubbleSize` | `[number, number]` |  | Radius in px of the smallest and the largest bubble. Default: 4 up to 22 on a wide chart, a smaller maximum as it narrows. |
| `defaultHiddenSeries` | `string[]` |  | Initially hidden series keys when uncontrolled. |
| `emptyState` | `React.ReactNode` |  | Content shown instead of the plot when there is no data. |
| `grid` | `boolean \| "horizontal" \| "vertical" \| "both"` | `"both"` | Gridlines. Default both. |
| `height` | `number` | `280` | Plot height in px (legend excluded). Default 280. |
| `hiddenSeries` | `string[]` |  | Controlled list of hidden series keys (toggled from the legend). Use with `onHiddenSeriesChange`. |
| `label` | `string` |  | Accessible name. Defaults to a description built from the series. |
| `legend` | `boolean \| "top" \| "bottom"` |  | Default: shown below for 2+ series. |
| `legendInteractive` | `boolean` | `true` | Allow toggling/isolating series from the legend. Default true. |
| `loading` | `boolean` |  | Data is on its way: with no data, a placeholder plot (and legend) of the same size; with data, the root is marked busy. |
| `locale` | `string` |  | BCP 47 locale for the default number and date formatting. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. |
| `onActivePointChange` | `(point: { seriesKey: string; index: number } \| null) => void` |  | The point under the pointer or keyboard focus: its series key and index in `data`, or null. |
| `onHiddenSeriesChange` | `(hidden: string[]) => void` |  | Called with the hidden series keys when a legend entry is toggled. |
| `pointSize` | `number` | `4.5` | Radius in px of points that have no `sizeKey`. Default 4.5. |
| `referenceLines` | `ChartReferenceLine[]` | `[]` | Threshold lines: horizontal at a value, or vertical (`axis: "x"`) at an x value. |
| `sizeFormatter` | `(value: number, seriesKey: string) => string` | `valueFormatterFor(locale)` | Formats bubble sizes (tooltip and table). |
| `tooltip` | `boolean` | `true` | Shows a tooltip with the hovered point. |
| `valueFormatter` | `(value: number, seriesKey: string) => string` | `valueFormatterFor(locale)` | Formats y values. |
| `xAxis` | `ScatterXAxisOptions` | `{}` | X-axis options (hide, domain, tick count, formatter). |
| `yAxis` | `ChartYAxisOptions` | `{}` | Value axis. Unlike bar and area charts it fits the data: it only includes 0 when `min` says so. |
