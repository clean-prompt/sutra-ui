# KanbanToolbar

> Quick filters for a board: search, assignee toggles, labels and swimlane grouping.

- Import: `import { KanbanToolbar } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/kanban-toolbar` (kit `workspace`)
- `data-slot`: `kanban-toolbar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `board` (required) | `KanbanBoardModel` |  | Board model; supplies the assignees, labels and priorities offered by the filters. |
| `filters` (required) | `KanbanFilters` |  | Current filters (search, assignees, labels, priorities). |
| `onFiltersChange` (required) | `(filters: KanbanFilters) => void` |  | Called with the new filters when the user changes any of them. |
| `boardSwitcher` | `React.ReactNode` |  | Slot at the start of the toolbar (for example a board switcher). |
| `extra` | `React.ReactNode` |  | Extra toolbar content, pushed to the end. |
| `onSwimlanesChange` | `(mode: KanbanSwimlanes) => void` |  | Called with the grouping when the user picks one; the control is hidden when unset. |
| `swimlanes` | `KanbanSwimlanes` | `"none"` | Current grouping into lanes: `none`, `assignee` or `priority`. Default "none". |
