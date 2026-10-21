# KanbanCard

> Task card: labels, title, priority, assignee (human or agent), due date, subtasks, comments, run status.

- Import: `import { KanbanCard } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/kanban-card` (kit `workspace`)
- `data-slot`: `kanban-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `card` (required) | `KanbanCardData` |  | The card to show (title, priority, due date, label ids, subtask counts). |
| `actions` | `React.ReactNode` |  | Actions rendered top-right (e.g. a menu). |
| `activatorProps` | `React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>` |  | Props for the full-card activator button (drag listeners, aria). |
| `activatorRef` | `React.Ref<HTMLButtonElement>` |  | Ref to the full-card activator button (for drag sensors). |
| `assignee` | `KanbanAssignee` |  | Assignee resolved from the card's assignee id; shown as an avatar. |
| `done` | `boolean` |  | The card's column counts as done. |
| `labels` | `KanbanLabel[]` | `[]` | Labels resolved from the card's label ids; shown as chips. |
| `locale` | `string` |  | BCP 47 locale used to format the due date. |
| `now` | `Date \| number` |  | Reference time for the overdue check. |
| `onOpen` | `() => void` |  | Called when the user activates the card to open it. |
| `overlay` | `boolean` |  | Rendered in the drag overlay. |
| `placeholder` | `boolean` |  | Rendered as a drop placeholder. |

## Example (live: `#/components/kanban-memory/kanban-card` in the playground)

```tsx
import { KanbanCard } from "@sutra/ui/workspace";

function KanbanCardsDemo() {
  const cards = initialBoard.cards.filter((c) => ["SUT-104", "SUT-107", "SUT-108", "SUT-116"].includes(c.id));
  return (
    <div className="grid grid-cols-1 w-full gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <KanbanCard
          key={c.id}
          card={c}
          labels={initialBoard.labels}
          assignee={people.find((p) => p.id === c.assigneeId)}
          done={c.columnId === "done"}
          onOpen={() => {}}
        />
      ))}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): initialBoard, people.
