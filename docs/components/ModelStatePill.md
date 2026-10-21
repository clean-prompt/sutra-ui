# ModelStatePill

> Model lifecycle pill on `StatusBadge`: the state glyph, a label and optional detail text.

- Import: `import { ModelStatePill } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ai/model-state` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `ModelStateInput` |  | Model lifecycle state (for example ready, loading, cold or error); sets the pill text, glyph and tone. |
| `detail` | `React.ReactNode` |  | Secondary text, e.g. "idle 5m" or "42%". |
| `hideLabel` | `boolean` |  | Glyph only; the label stays available to screen readers. |
| `label` | `string` |  | Override the visible label. |
| `size` | `"sm" \| "md"` | `"md"` | Pill size. |
