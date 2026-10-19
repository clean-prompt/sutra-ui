# MemoryMapLegend

> Kind → color/glyph legend; doubles as a kind filter when `onToggleKind` is set.

- Import: `import { MemoryMapLegend } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/memory-map-legend` (kit `workspace`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `MemoryLegendItem[]` |  | Legend entries, each with a kind, label, glyph and colour. |
| `hiddenKinds` | `string[]` | `[]` | Kinds currently hidden on the map; their entries are shown dimmed. |
| `onToggleKind` | `(kind: string) => void` |  | Makes entries toggle buttons that filter by kind. |
