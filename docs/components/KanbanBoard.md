# KanbanBoard

> Drag-and-drop task board: sortable cards and columns, WIP limits, swimlanes, quick filters and screen-reader announcements.

- Import: `import { KanbanBoard } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/kanban-board` (kit `workspace`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `aria-label` | `string` | `"Kanban board"` | Accessible name of the board. Default "Kanban board". |
| `board` | `KanbanBoardModel` |  | Controlled board model: columns and their cards. |
| `boardSwitcher` | `React.ReactNode` |  | Slot at the start of the toolbar (e.g. a board switcher). |
| `collapsedColumns` | `string[]` |  | Controlled ids of the collapsed columns. |
| `defaultBoard` | `KanbanBoardModel` |  | Initial board when `board` is not controlled. |
| `defaultCollapsedColumns` | `string[]` |  | Initially collapsed column ids when `collapsedColumns` is not controlled. |
| `defaultFilters` | `KanbanFilters` |  | Initial filters when `filters` is not controlled. |
| `defaultSwimlanes` | `KanbanSwimlanes` |  | Initial grouping when `swimlanes` is not controlled. |
| `filters` | `KanbanFilters` |  | Controlled filters (search, assignees, labels, priorities). |
| `hideToolbar` | `boolean` |  | Hide the filter toolbar. |
| `locale` | `string` |  | BCP 47 locale used to format card dates. |
| `now` | `Date \| number` |  | Reference time for overdue checks. |
| `onAddCard` | `(request: KanbanAddCardRequest) => void` |  | Enables the per-column "Add card" composer. |
| `onBoardChange` | `(board: KanbanBoardModel) => void` |  | Called with the next board after any move (also in controlled mode). |
| `onCardOpen` | `(card: KanbanCardData) => void` |  | Called with the card when the user opens it. |
| `onCollapsedColumnsChange` | `(ids: string[]) => void` |  | Called with the collapsed column ids when the user collapses or expands a column. |
| `onColumnMove` | `(move: KanbanColumnMove) => void` |  | Called with the column id and its new index when a column is moved to another position. |
| `onFiltersChange` | `(filters: KanbanFilters) => void` |  | Called with the filters when the user changes any of them. |
| `onMove` | `(move: KanbanMove) => void` |  | Called when a card is dropped in a new place. `toIndex` is the index within the full (unfiltered) column. |
| `onSwimlanesChange` | `(mode: KanbanSwimlanes) => void` |  | Called with the grouping when the user picks another one. |
| `swimlanes` | `KanbanSwimlanes` |  | Controlled grouping into horizontal lanes: `none`, `assignee` or `priority`. |
| `toolbarExtra` | `React.ReactNode` |  | Extra toolbar content at the end. |

## Example (live: `#/components/kanban-memory/kanban-board` in the playground)

```tsx
import * as React from "react";
import { SimpleSelect } from "@sutra/ui/forms";
import { RiLayoutColumnLine } from "@sutra/ui/icons";
import { KanbanBoard } from "@sutra/ui/workspace";

function KanbanBoardDemo() {
  const [boardId, setBoardId] = React.useState("sutra");
  const [boards, setBoards] = React.useState<Record<string, KanbanBoardModel>>({ sutra: initialBoard, website: websiteBoard });
  const board = boards[boardId]!;
  const setBoard: React.Dispatch<React.SetStateAction<KanbanBoardModel>> = (next) =>
    setBoards((all) => ({ ...all, [boardId]: typeof next === "function" ? next(all[boardId]!) : next }));
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [lastMove, setLastMove] = React.useState("");
  const editing = useTaskEditing(setBoard);
  const task = board.cards.find((c) => c.id === openId) ?? null;
  return (
    <>
      <KanbanBoard
        board={board}
        onBoardChange={setBoard}
        onMove={(m) => setLastMove(`${m.cardId} → ${m.toColumn} #${m.toIndex + 1}`)}
        onColumnMove={(m) => setLastMove(`column ${m.columnId} → #${m.toIndex + 1}`)}
        onCardOpen={(c) => setOpenId(c.id)}
        onAddCard={({ columnId, title }) =>
          setBoard((b) => ({ ...b, cards: [...b.cards, { id: `SUT-${200 + b.cards.length}`, title, columnId }] }))
        }
        boardSwitcher={
          <SimpleSelect
            size="sm"
            aria-label="Board"
            className="w-36"
            leadingIcon={<RiLayoutColumnLine />}
            value={boardId}
            onValueChange={setBoardId}
            options={[
              { value: "sutra", label: "Sutra app" },
              { value: "website", label: "Website" },
            ]}
          />
        }
        toolbarExtra={lastMove && <span className="text-xs text-muted-foreground">Last move: {lastMove}</span>}
      />
      <TaskDialogFor task={task} board={board} onClose={() => setOpenId(null)} editing={editing} />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): TaskDialogFor, initialBoard, useTaskEditing, websiteBoard.
