# ThermalSensors

> CPU / GPU / SSD / battery temperatures in a card, coloured by thresholds, with an optional °C / °F switch.

- Import: `import { ThermalSensors } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/system`)
- Source: `packages/ui/src/kits/system/thermals` (kit `system`)
- `data-slot`: `thermal-sensors`, `thermal-sensors-skeleton`, `thermal-sensors-empty`, `thermal-sensors-item`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sensors` (required) | `ThermalSensor[]` |  | Sensors to list, each with a label, a reading in °C and optional history. |
| `accent` | `Accent` | `"orange"` | Default "orange". |
| `defaultUnit` | `TemperatureUnit` | `"celsius"` | Initial display unit when `unit` is not controlled. |
| `emptyState` | `React.ReactNode` | `"No temperature sensors"` | Shown when `sensors` is empty. Default "No temperature sensors". |
| `label` | `string` | `"Temperature sensors"` | Accessible name of the list. Default "Temperature sensors". |
| `loading` | `boolean` | `false` | Data is on its way. With no sensors yet the card shows placeholder rows; with sensors the root is only marked busy. |
| `loadingRows` | `number` | `4` | Placeholder sensors while loading. Default 4. |
| `locale` | `string` |  | BCP 47 locale used to format numbers. |
| `max` | `number` |  | Scale top in °C. Default 110. |
| `min` | `number` |  | Scale bottom and top in °C. Default 20–110. |
| `onUnitChange` | `(unit: TemperatureUnit) => void` |  | Called with the unit when the user flips the °C / °F switch. |
| `showUnitToggle` | `boolean` | `onUnitChange !== undefined` | Show the °C / °F switch in the header. Default true when `onUnitChange` is set. |
| `statusLabels` | `ReadoutStatusLabels` |  | Words shown when a sensor is strained. Default "hot" / "critical". |
| `thresholds` | `ReadoutThresholds` | `defaultThermalThresholds` | Default thresholds in °C for sensors without their own. |
| `title` | `React.ReactNode` | `"Temperatures"` | Header title. Default "Temperatures"; `null` hides the header (unless the unit switch is shown). |
| `unit` | `TemperatureUnit` |  | Display unit (readings stay °C). |
| `variant` | `"meter" \| "gauge"` | `"meter"` | `meter` rows (default) or a grid of `gauge`s. |
