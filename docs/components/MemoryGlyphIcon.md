# MemoryGlyphIcon

> Small SVG swatch of a memory-map glyph.

- Import: `import { MemoryGlyphIcon } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/memory-map-legend` (kit `workspace`)
- `data-slot`: `memory-glyph-icon`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` (required) | `string` |  | Fill colour of the marker, any CSS colour. |
| `glyph` (required) | `MemoryGlyph` |  | Shape of the marker (for example circle, square, diamond); matches the node glyph on the map. |
| `size` | `number` | `12` | Pixel size. Default 12. |
