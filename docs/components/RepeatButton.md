# RepeatButton

> Tri-state repeat toggle cycling off → all → one.

- Import: `import { RepeatButton } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls-playback` (kit `media`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `RepeatMode` | `"off"` | Initial mode when `value` is not controlled. Default "off". |
| `onValueChange` | `(mode: RepeatMode) => void` |  | Called with the next mode when the user presses the button, which cycles off, all and one. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size: `sm`, `md` or `lg`. |
| `tone` | `MediaTone` |  | `default` follows the theme; `overlay` is for controls drawn over video or artwork. |
| `value` | `RepeatMode` |  | Controlled repeat mode: `off`, `all` or `one`. |

## Variants

- `size`: `sm`, `md`, `lg`, `xl` (default "md")
