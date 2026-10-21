# DeviceBatteryList

> Bluetooth device batteries: a summary card (connected count, lowest battery, away devices, settings link) over a table of devices by kind, with nested rows for separately charged parts.

- Import: `import { DeviceBatteryList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/system`)
- Source: `packages/ui/src/kits/system/device-battery` (kit `system`)
- `data-slot`: `device-battery-list`, `device-battery-summary`, `device-battery-skeleton`, `device-battery-devices`, `device-battery-skeleton-row`, `device-battery-part`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `devices` (required) | `BatteryDevice[]` |  | Bluetooth devices with their battery level, charging state and connection. |
| `accent` | `Accent` | `"cyan"` | Categorical colour for the icon chips and the settings link. Default "cyan". |
| `emptyState` | `React.ReactNode` | `"No Bluetooth devices"` | Shown when `devices` is empty. Default "No Bluetooth devices". |
| `label` | `string` | `"Device batteries"` | Accessible name of the devices table. Default "Device batteries". |
| `loading` | `boolean` | `false` | Data is on its way. With no devices yet the summary and table show placeholders; with devices the root is only marked busy. |
| `loadingRows` | `number` | `3` | Placeholder device rows while loading. Default 3. |
| `locale` | `string` |  | BCP 47 locale used to format numbers. |
| `onOpenSettings` | `() => void` |  | Called when the settings action is used (renders a button when there is no `settingsHref`). |
| `settingsHref` | `string` |  | Link for the settings action in the header. |
| `settingsLabel` | `React.ReactNode` | `"Bluetooth Settings"` | Settings action text. Default "Bluetooth Settings". |
| `showAway` | `boolean` | `true` | List away (paired, not connected) devices too, dimmed. Default true. |
| `summary` | `React.ReactNode` |  | Replaces the computed summary sentence. |
| `title` | `React.ReactNode` |  | Header title. Default "{n} connected". |

## Example (live: `#/components/system/device-batteries` in the playground)

```tsx
import { DeviceBatteryList } from "@cleanprompt/sutra-ui/system";

<DeviceBatteryList className="w-full" devices={devices} settingsHref="#/components/system/device-batteries" />
```

Playground helpers in this snippet (not part of the library): devices.
