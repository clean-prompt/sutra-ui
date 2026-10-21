# NodeGrid

> Responsive auto-fill grid for node / GPU cards.

- Import: `import { NodeGrid } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ops/node-card` (kit `ops`)
- `data-slot`: `node-grid`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `gap` | `"sm" \| "md" \| "lg"` | `"md"` | Space between cards: `sm`, `md` or `lg`. Default "md". |
| `minCardWidth` | `number` | `300` | Minimum card width in px before wrapping. Default 300. |
