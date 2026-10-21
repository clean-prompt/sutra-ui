# RadarChart

> Radar (spider) chart: polygon rings, labelled spokes, toggleable series, spoke-by-spoke keyboard and a tooltip per spoke.

- Import: `import { RadarChart } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/dataviz`)
- Source: `packages/ui/src/patterns/chart-radar` (patterns)
- `data-slot`: `chart-skeleton`, `chart-ring`, `chart-spoke`, `chart-level`, `chart-axis-label`, `chart-series`, `chart-area`, `chart-dot`, `chart-hit`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` (required) | `ChartDatum[]` |  | One row per spoke (a measure), with a value for each series. |
| `index` (required) | `string` |  | Key of the spoke name in each datum. |
| `series` (required) | `RadarSeries[]` |  | One polygon per series. |
| `animate` | `boolean` | `true` | CSS transitions on data changes (disabled under prefers-reduced-motion). Default true. |
| `defaultHiddenSeries` | `string[]` |  | Initially hidden series keys when uncontrolled. |
| `domain` | `[number \| "auto", number \| "auto"]` |  | Value range from the center to the rim: `[min, max]`, either end may be `"auto"` (fit the data). Default: from 0 (or the lowest value, when negative) up to a round number above the highest. |
| `dots` | `boolean` | `true` | Mark each value on its spoke. Default true. |
| `emptyState` | `React.ReactNode` |  | Content shown instead of the plot when there is no data. |
| `fill` | `boolean` | `true` | Tint the inside of each polygon. Default true. |
| `height` | `number` | `320` | Plot height in px (legend excluded). Default 320. |
| `hiddenSeries` | `string[]` |  | Controlled list of hidden series keys (toggled from the legend). Use with `onHiddenSeriesChange`. |
| `label` | `string` |  | Accessible name. Defaults to a description built from the series. |
| `legend` | `boolean \| "top" \| "bottom"` |  | Default: shown below for 2+ series. |
| `legendInteractive` | `boolean` | `true` | Allow toggling/isolating series from the legend. Default true. |
| `levelLabels` | `boolean` | `true` | Print the ring values between the first two spokes. Default true. |
| `levels` | `number` | `4` | Approximate number of grid rings. Default 4. |
| `loading` | `boolean` |  | Data is on its way: with no data, a placeholder radar (and legend) of the same size; with data, the root is marked busy. |
| `locale` | `string` |  | BCP 47 locale for the default number formatting. Pass one explicitly when the server and the browser must agree (SSR). Defaults to the runtime locale. |
| `onActiveIndexChange` | `(index: number \| null) => void` |  | The spoke under the pointer or keyboard focus (index in `data`), or null. |
| `onHiddenSeriesChange` | `(hidden: string[]) => void` |  | Called with the hidden series keys when a legend entry is toggled. |
| `shape` | `"polygon" \| "circle"` | `"polygon"` | Grid rings as polygons (default) or circles. Fewer than three spokes always use circles. |
| `tooltip` | `boolean` | `true` | Shows a tooltip with every series at the hovered axis. |
| `valueFormatter` | `(value: number, seriesKey: string) => string` | `valueFormatterFor(locale)` | Formats values in the tooltip and on the axis. Receives the value and the series key. Default is the localized number. |
