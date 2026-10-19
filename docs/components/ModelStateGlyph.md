# ModelStateGlyph

> Lifecycle mark: shape, not colour, carries the state (filled, outline, spinning ring, moon, warning, download).

- Import: `import { ModelStateGlyph } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ai/model-state` (kit `ai`)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `ModelStateInput` |  | Model lifecycle state (for example ready, loading, cold or error); picks the glyph and its tone. |
| `size` | `number` | `14` | Glyph width and height in px. |
