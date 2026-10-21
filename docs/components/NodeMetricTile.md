# NodeMetricTile

> Compact metric tile: label, value and a threshold-colored Meter.

- Import: `import { NodeMetricTile } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ops/node-card` (kit `ops`)
- `data-slot`: `node-metric-tile`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | Name of the metric, shown above the value. |
| `value` (required) | `number \| null` |  | Current value; `null` = no sample. |
| `caption` | `React.ReactNode` |  | Small line under the meter, for example the process using it. |
| `icon` | `React.ReactNode` |  | Icon beside the label. |
| `max` | `number` | `100` | Default 100 (percent). For memory pass the total. |
| `thresholds` | `MeterThresholds \| false` |  | Percent levels at which the meter turns warning and danger; `false` keeps one colour. |
| `unit` | `string` |  | Unit appended to the value (for example "GB" or "°C"); the default text shows a percent. |
| `valueText` | `React.ReactNode` |  | Text next to the label, defaults to "42%" or "12.3 / 64 GB". |
