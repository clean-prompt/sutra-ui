---
component: Checklist
module: patterns/reorderable-list
use: A subtask list with checkboxes, inline editing, add and delete, drag or keyboard reordering, an "n/m" count with a thin progress bar and a hide-completed toggle. It is the ready-made use of `ReorderableList`.
instead: ReorderableList = your own rows with a manual order; OnboardingChecklist = guided setup steps with status and actions; Steps = ordered stages with a current one; CheckboxGroup = a few options for a form; Progress = only the bar
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Through each row: drag handle, checkbox, the item text (a button), delete button; then the hide toggle and the add field |
| Space | On a checkbox: toggle done |
| Enter, Space | On the item text: edit it in place. On a handle: pick the row up (then arrows move it, Space or Enter drops, Escape cancels) |
| Enter | In the edit field: save (empty text deletes the item). In the add field: add the item |
| Escape | In the edit field: discard the change. While a row is picked up: cancel |

Leaving the edit field saves it. Up and down are the only arrows, so RTL changes nothing.

## Screen readers
- A `group` named by `label` (default "Checklist") with the "2/5" count next to it. The bar is a `progressbar` named "2 of 5 done".
- Each checkbox is named by the item text; the text button is "Edit <text>", the delete button "Delete <text>", the editing input "Edit <text>"; the add field is named by `addPlaceholder` ("Add an item"). Reordering is announced by the `ReorderableList` live region ("Picked up Pack. Position 3 of 5...").
- "Hide completed" is a toggle button with `aria-pressed`; it becomes "Show completed (3)". With everything hidden, "All done." is plain text.

## Reduced motion
Rows glide when reordered (`flip`) and hover fades are transitions; under `prefers-reduced-motion` the glide is off and the global net ends the rest in 1 ms.

## Server rendering
Plain markup from `items` or `defaultItems`. New ids come from `createId` only when an item is added, so rendering is deterministic.

## Gotchas
- Each entry is `{ id, text, done }`. Control it with `items` and `onItemsChange`, which receives the whole new list after an add, edit, toggle, delete or reorder; ids for new entries come from `createId` (time based by default).
- The delete button is hidden until the row is hovered or focused, so on a touch screen it is invisible (it still works when tapped). Set `editable={false}` to drop add, edit and delete; `reorderable={false}` drops the handles and renders a plain list.
- With "hide completed" on, reordering only rearranges the unfinished slots: completed items keep their positions.
- `hideCompleted` can be controlled with `onHideCompletedChange` (or start hidden with `defaultHideCompleted`); the toggle only appears once at least one item is done.

## Example
```tsx
import * as React from "react";
import { Checklist, type ChecklistEntry } from "@sutra/ui";

export function Example() {
  const [items, setItems] = React.useState<ChecklistEntry[]>([
    { id: "flights", text: "Book flights", done: true },
    { id: "hotel", text: "Reserve hotel", done: false },
    { id: "visa", text: "Check visa rules", done: false },
  ]);
  return <Checklist label="Trip tasks" items={items} onItemsChange={setItems} addPlaceholder="Add a task" />;
}
```
