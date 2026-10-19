# CastDeviceList

> The device rows used inside `CastPicker` (usable on its own, e.g. in a settings page).

- Import: `import { CastDeviceList } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/cast-picker` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `devices` (required) | `CastDevice[]` |  | Devices to list, each with a name, kind and connection state. |
| `emptyMessage` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there is nothing to list. Default "No other devices are available right now". |
| `error` | `React.ReactNode` |  | Message shown in place of the list when discovery fails. |
| `label` | `string` | `"Devices"` | Accessible list name. Default "Devices". |
| `loading` | `boolean` |  | Shows placeholder rows while devices are being discovered. |
| `onDisconnect` | `(device: CastDevice) => void` |  | Called with the device when the user disconnects the connected one. |
| `onRetry` | `() => void` |  | Called when the user presses Retry on the error message; the button is hidden when unset. |
| `onSelect` | `(device: CastDevice) => void` |  | Called with the device when the user picks one to connect to. |
