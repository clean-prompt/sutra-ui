# KanbanPriorityIcon

> Linear-style priority glyph (bars, or an alert square for urgent).

- Import: `import { KanbanPriorityIcon } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/kanban-card` (kit `workspace`)
- `data-slot`: `kanban-priority-icon`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `priority` (required) | `KanbanPriority` |  | Priority level to draw (for example low, medium, high, urgent); sets the glyph and tone. |
