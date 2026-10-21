# Spotlight

> A soft radial glow for heroes and cards.

- Import: `import { Spotlight } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/backgrounds` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `animated` | `boolean` | `false` | Slowly drift the glow. |
| `color` | `string` | `"var(--b-500)"` | Glow color (any CSS color). Defaults to the brand color. |
| `intensity` | `number` | `0.35` | Glow strength, 0 to 1. |
| `size` | `number` | `560` | Diameter in pixels. |
| `x` | `string` | `"50%"` | Center position, as CSS lengths/percentages. |
| `y` | `string` | `"0%"` | Vertical centre position, as a CSS length or percentage. |
