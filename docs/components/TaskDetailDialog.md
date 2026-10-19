# TaskDetailDialog

> Linear-style task modal: inline title, Markdown description, property sidebar, dependencies and Comments / Activity / Runs tabs.

- Import: `import { TaskDetailDialog } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/kanban-task-dialog` (kit `workspace`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `board` (required) | `KanbanBoardModel` |  | Columns, assignees, labels and the other tasks (for dependencies). |
| `task` (required) | `KanbanCardData \| null` |  | The task to edit; the dialog stays closed while it is `null`. |
| `activity` | `KanbanTaskActivity[]` | `[]` | Activity log entries for the Activity tab. |
| `commentHandlers` | `CommentHandlers` |  | Reply, edit, delete and react handlers for the comment thread. |
| `comments` | `CommentThreadData` |  | Existing comments on the task. |
| `currentUserId` | `string` |  | Id of the signed-in user; their comments get edit and delete actions. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. Default false. |
| `defaultTab` | `"comments" \| "activity" \| "runs"` | `"comments"` | Tab shown first: `comments`, `activity` or `runs`. Default "comments". |
| `locale` | `string` |  | BCP 47 locale used to format dates. |
| `models` | `KanbanModelOption[]` |  | Model override choices; the empty option means "inherit". |
| `now` | `Date \| number` |  | Reference time for relative labels; set it in tests and SSR for stable output. |
| `onAddDependency` | `(kind: KanbanDependencyKind, taskId: string) => void` |  | Called with the dependency kind (`blockedBy` or `blocks`) and the task id when the user adds a dependency. |
| `onChange` | `(patch: Partial<KanbanCardData>) => void` |  | Called with the changed fields. Status changes arrive as `{ columnId }`. |
| `onComment` | `(body: string) => void` |  | Adds a new top-level comment. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onRemoveDependency` | `(kind: KanbanDependencyKind, taskId: string) => void` |  | Called with the dependency kind and the task id when the user removes a dependency. |
| `open` | `boolean` |  | Controlled open state. |
| `runs` | `KanbanTaskRun[]` | `[]` | Agent runs for the Runs tab. |
| `sidebarExtra` | `React.ReactNode` |  | Extra content at the end of the property sidebar (e.g. an OrchestrationPanel). |
| `taskKey` | `string` |  | Task key shown above the title, e.g. "SUT-42". Defaults to the id. |

## Example (live: `#/components/kanban-memory/task-detail-dialog` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";

function TaskDetailDemo() {
  const [board, setBoard] = React.useState(initialBoard);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const editing = useTaskEditing(setBoard);
  return (
    <>
      <Button onClick={() => setOpenId("SUT-107")}>Open “Memory map time scrubber”</Button>
      <Button variant="secondary" onClick={() => setOpenId("SUT-104")}>
        Open an overdue human task
      </Button>
      <TaskDialogFor task={board.cards.find((c) => c.id === openId) ?? null} board={board} onClose={() => setOpenId(null)} editing={editing} />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): TaskDialogFor, initialBoard, useTaskEditing.
