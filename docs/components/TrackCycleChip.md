# TrackCycleChip

> Chip showing the current subtitle/audio track; click cycles to the next one or opens a picker.

- Import: `import { TrackCycleChip } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls-menus` (kit `media`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` (required) | `"subtitles" \| "audio"` |  | Which track set this chip switches: `subtitles` or `audio`; sets the icon and labels. |
| `tracks` (required) | `MediaTrackOption[]` |  | Tracks to choose from, each with an id and label. |
| `allowOff` | `boolean` | `kind === "subtitles"` | Include an "Off" option. Default true for subtitles. |
| `className` | `string` |  | Extra classes for the chip. |
| `defaultValue` | `string \| null` | `null` | Initial track id when uncontrolled. Default null (off). |
| `disabled` | `boolean` |  | Disables the chip. |
| `mode` | `"cycle" \| "menu"` |  | Click cycles through the options, or opens a menu. Default: cycle up to 3 options, menu beyond. |
| `offLabel` | `string` | `"Off"` | Label of the "off" option. Default "Off". |
| `onValueChange` | `(id: string \| null) => void` |  | Called with the chosen track id, or `null` for off. |
| `tone` | `MediaTone` | `"default"` | `default` follows the theme; `overlay` is for a chip drawn over video. |
| `value` | `string \| null` |  | Selected track id, or null for off (subtitles). Controlled. |
