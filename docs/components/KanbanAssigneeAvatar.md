# KanbanAssigneeAvatar

> Human `Avatar` or procedural `AgentAvatar` for agent assignees. The ref points at the rendered `<span>` or `<svg>`.

- Import: `import { KanbanAssigneeAvatar } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/kanban-card` (kit `workspace`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `assignee` (required) | `KanbanAssignee` |  | The person or agent to show; agents render an `AgentAvatar`. |
| `className` | `string` |  | Extra classes for the avatar. |
| `size` | `number` | `20` | Pixel size. Default 20. |
