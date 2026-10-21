# KanbanRunBadge

> Badge for the status of an agent run (running shimmers, failed is red).

- Import: `import { KanbanRunBadge } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/kanban-card` (kit `workspace`)
- `data-slot`: `kanban-run-badge`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `KanbanRunStatusInput` |  | Run status; canonical `TaskStatus` names or legacy spellings (`queued`, `cancelled`). |
