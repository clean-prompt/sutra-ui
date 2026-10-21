# MetricHero

> Header of a metric detail view: caption, big value, status and facts on the left; a history chart on the right.

- Import: `import { MetricHero } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/dataviz`)
- Source: `packages/ui/src/patterns/metric-hero` (patterns)
- `data-slot`: `metric-hero-chart-skeleton`, `metric-hero`, `metric-hero-summary`, `metric-hero-value-skeleton`, `metric-hero-details-skeleton`, `metric-hero-chart`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `React.ReactNode` |  | The big number or text to show. |
| `accent` | `Accent` |  | Categorical colour of the chart. |
| `caption` | `React.ReactNode` |  | Small text above the value ("Now", "Apple M2 Max"). |
| `chart` | `React.ReactNode` |  | Any chart for the right side. Takes precedence over `series`. |
| `chartHeight` | `number` | `200` | Chart height in px. Default 200. |
| `chartLabel` | `string` |  | Accessible name of the series chart. Default "<caption> history" or "History". |
| `details` | `MetricHeroDetail[]` |  | Label/value rows at the bottom of the left column ("Average today 37%"). |
| `loading` | `boolean` |  | Data is on its way. With no value yet, placeholders stand in for the value, the detail values and the chart (the caption and detail labels stay); with a value, the root is just marked busy. |
| `max` | `number` |  | Fixed upper bound of the series scale (e.g. 100). |
| `min` | `number` |  | Fixed lower bound of the series scale. Default fits the data (from 0). |
| `series` | `number[]` |  | Values drawn as an area chart in the accent colour. |
| `status` | `React.ReactNode` |  | Under the value, e.g. a `StatusBadge`. |
| `unit` | `React.ReactNode` |  | Unit shown after the value (e.g. "ms"). |
| `valueFont` | `"mono" \| "sans"` |  | Number face for the value: monospaced (default) or the UI sans with tabular figures. |
| `valueFormatter` | `(value: number) => string` |  | Formats values in the chart tooltip and its screen-reader table. |
