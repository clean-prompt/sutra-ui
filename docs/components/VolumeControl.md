# VolumeControl

> Mute toggle plus a volume slider that expands on hover/focus (or pops up vertically). A preset over `VolumeSlider`: media button style, 0–1 volume, arrow keys on the toggle, and the reveal / popover layout.

- Import: `import { VolumeControl } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls-volume` (kit `media`)
- `data-slot`: `volume-popover`, `volume-slider-reveal`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultMuted` | `boolean` | `false` | Initial mute state when `muted` is not controlled. |
| `defaultVolume` | `number` | `1` | Initial volume (0 to 1) when `volume` is not controlled. |
| `expand` | `"hover" \| "always"` | `"hover"` | Reveal the horizontal slider on hover/focus, or always show it. Default "hover". |
| `muted` | `boolean` |  | Controlled mute state. |
| `onMutedChange` | `(muted: boolean) => void` |  | Called with the new state when the user presses the mute button. |
| `onVolumeChange` | `(volume: number) => void` |  | Called with the volume (0 to 1) while the user moves the slider or presses an arrow key. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Horizontal slider beside the button, or a vertical slider in a popover above it. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size: `sm`, `md` or `lg`. |
| `step` | `number` | `0.05` | Volume change per arrow key. Default 0.05. |
| `tone` | `MediaTone` | `"default"` | `default` follows the theme; `overlay` is for controls drawn over video. |
| `volume` | `number` |  | 0–1. |
