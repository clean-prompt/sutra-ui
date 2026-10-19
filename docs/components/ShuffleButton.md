# ShuffleButton

> Shuffle on/off toggle.

- Import: `import { ShuffleButton } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls` (kit `media`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultPressed` | `boolean` | `false` | Initial state when `pressed` is not controlled. |
| `onPressedChange` | `(pressed: boolean) => void` |  | Called with the new state when the user presses the button. |
| `pressed` | `boolean` |  | Controlled shuffle state. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size: `sm`, `md` or `lg`. |
| `tone` | `MediaTone` | `"default"` | `default` follows the theme; `overlay` is for controls drawn over video or artwork. |

## Variants

- `tone`: `default`, `overlay` (default "default")
- `size`: `sm`, `md`, `lg` (default "md")
