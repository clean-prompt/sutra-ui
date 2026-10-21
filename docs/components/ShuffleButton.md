# ShuffleButton

> Shuffle on/off toggle.

- Import: `import { ShuffleButton } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/kits/media/media-controls-playback` (kit `media`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultPressed` | `boolean` | `false` | Initial state when `pressed` is not controlled. |
| `onPressedChange` | `(pressed: boolean) => void` |  | Called with the new state when the user presses the button. |
| `pressed` | `boolean` |  | Controlled shuffle state. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size: `sm`, `md` or `lg`. |
| `tone` | `MediaTone` |  | `default` follows the theme; `overlay` is for controls drawn over video or artwork. |

## Variants

- `size`: `sm`, `md`, `lg`, `xl` (default "md")
