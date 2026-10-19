# NodeMiniChart

> Compact labelled area sparkline for node history (CPU, network …).

- Import: `import { NodeMiniChart } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/node-card` (kit `ops`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` (required) | `number[]` |  | Samples, oldest first. |
| `label` (required) | `string` |  | Name of the series, shown above the chart and used as its accessible name. |
| `color` | `SparklineColor` | `"primary"` | Colour of the line and fill. |
| `height` | `number` | `36` | Chart height in px. Default 36. |
| `max` | `number` |  | Upper bound of the value axis; defaults to the largest sample. |
| `min` | `number` | `0` | Lower bound of the value axis. Default 0. |
| `value` | `React.ReactNode` |  | Current value shown beside the label. |
