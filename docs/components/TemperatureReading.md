# TemperatureReading

> One temperature sensor: a bar or gauge coloured by thresholds, the value in °C or °F and an optional history sparkline.

- Import: `import { TemperatureReading } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/thermals` (kit `system`)
- `data-slot`: `temperature-reading`, `temperature-reading-status`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | "CPU", "GPU", "SSD", "Battery". |
| `value` (required) | `number \| null \| undefined` |  | Reading in °C; `null` shows "—". |
| `accent` | `Accent` | `"orange"` | Colour of a normal reading. Default "orange". |
| `caption` | `React.ReactNode` |  | Secondary line ("Apple M2 Max", "Throttling below 100 °C"). |
| `history` | `number[]` |  | Recent readings in °C, drawn as a sparkline. |
| `icon` | `React.ReactNode` |  | Replaces the kind icon (decorative). Pass `null` for none. |
| `kind` | `ThermalSensorKind \| (string & {})` |  | Sensor kind, for the default icon. |
| `locale` | `string` |  | BCP 47 locale used to format the number. |
| `max` | `number` | `110` | Scale top in °C. Default 110. |
| `min` | `number` | `20` | Scale bottom in °C. Default 20. |
| `statusLabels` | `ReadoutStatusLabels` |  | Status words when strained. Default "hot" / "critical". |
| `thresholds` | `ReadoutThresholds` | `defaultThermalThresholds` | In °C. Default warning 80, danger 95. |
| `unit` | `TemperatureUnit` | `"celsius"` | Display unit (inputs stay °C). Default `celsius`. |
| `variant` | `"meter" \| "gauge"` | `"meter"` | `meter`: a labelled bar row (default). `gauge`: a radial gauge. |
