# SkipButton

> Circular-arrow button that skips back or forward a number of seconds.

- Import: `import { SkipButton } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls` (kit `media`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `direction` | `"back" \| "forward"` | `"forward"` | `back` skips backwards, `forward` skips ahead. Default "forward". |
| `onSkip` | `(delta: number) => void` |  | Called with the signed delta, e.g. `-10`. |
| `seconds` | `number` | `10` | Seconds to skip (drawn inside the glyph). Default 10. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size: `sm`, `md` or `lg`. |
| `tone` | `MediaTone` | `"default"` | `default` follows the theme; `overlay` is for controls drawn over video or artwork. |

## Variants

- `tone`: `default`, `overlay` (default "default")
- `size`: `sm`, `md`, `lg` (default "md")
