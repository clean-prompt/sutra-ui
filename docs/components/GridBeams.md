# GridBeams

> A faint grid with light beams traveling along its lines. Content renders above it.

- Import: `import { GridBeams } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/backgrounds` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `beams` | `number` | `6` | Number of animated beams. |
| `cellSize` | `number` | `40` | Grid cell size in px. |
| `duration` | `number` | `6` | Seconds for a beam to cross. |
| `fade` | `BackgroundFade` | `"radial"` | Where the grid fades out: `radial`, `top`, `bottom`, `edges` or `none`. |
