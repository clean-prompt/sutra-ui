# PlaybackRateMenu

> Dropdown for playback speed (0.5× – 2×).

- Import: `import { PlaybackRateMenu } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls-menus` (kit `media`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onRateChange` (required) | `(rate: number) => void` |  | Called with the chosen speed when the user picks a rate. |
| `rate` (required) | `number` |  | Current playback speed, where 1 is normal. |
| `className` | `string` |  | Extra classes for the trigger chip. |
| `disabled` | `boolean` |  | Disables the trigger. |
| `rates` | `number[]` | `[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]` | Speeds offered in the menu. Default 0.5 to 2 in steps of 0.25. |
| `tone` | `MediaTone` | `"default"` | `default` follows the theme; `overlay` is for a chip drawn over video. |
