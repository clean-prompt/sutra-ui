# LayoutThumbnail

> Mini SVG preview of a layout tree.

- Import: `import { LayoutThumbnail } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/workspace`)
- Source: `packages/ui/src/patterns/tiling-layout-presets` (patterns)
- `data-slot`: `layout-thumbnail`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `layout` (required) | `LayoutNode` |  | The layout to draw as a small thumbnail. |
| `gap` | `number` | `3` | Gap between tiles in viewBox units (viewBox is 100×64). Default 3. |
