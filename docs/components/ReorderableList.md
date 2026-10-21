# ReorderableList

> Accessible reorderable list: drag handle with placeholder, Space-to-lift keyboard moves, optional arrow buttons, live announcements. A generic plain function (React 19 `ref` prop) rather than `forwardRef`, which would erase the item type `T`.

- Import: `import { ReorderableList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/patterns/reorderable-list` (patterns)
- `data-slot`: `reorderable-list`, `reorderable-list-item`, `reorderable-list-handle`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `getKey` (required) | `(item: T) => string` |  | Returns a stable unique key for an item. |
| `items` (required) | `T[]` |  | Items to render, in the current order. |
| `onReorder` (required) | `(items: T[], move: ReorderMove) => void` |  | Called with the new order and a description of the move after every reorder. |
| `renderItem` (required) | `(item: T, context: ReorderableListRenderContext) => React.ReactNode` |  | Renders the row content for an item; the context carries drag and position state. |
| `disabled` | `boolean` |  | Disables dragging, the handles and the move buttons. |
| `flip` | `boolean \| UseFlipOptions` | `true` | Rows glide to their new place when the order changes (while dragging, with the keyboard or the buttons), and a dropped row settles from where it was let go (`useFlip`; pass options to tune it). Off under reduced motion. Default true. |
| `getLabel` | `(item: T) => string` | `(item) => String(item)` | Text used in announcements and button labels. Defaults to `String(item)`. |
| `handle` | `boolean` | `true` | Show the drag handle (pointer drag + keyboard pick-up). Default true. |
| `itemClassName` | `string` |  | Classes for every row. |
| `label` | `string` | `"Reorderable list"` | Accessible name of the list. |
| `labels` | `ReorderableListLabels` |  | Button names and screen-reader announcements (English by default); pass them to translate the list. |
| `moveButtons` | `boolean` |  | Show up / down buttons on each row. |
| `ref` | `React.Ref<HTMLUListElement>` |  | Ref to the `<ul>` element (the component is generic, so `ref` is a plain prop). |

## Notes

**When to use:** A list whose rows the user can reorder by dragging a handle, by picking a row up with the keyboard, or with optional up and down buttons, with live announcements. You render each row; the list reports the new order after every move. `Checklist` builds a subtask list on it.

**Use instead when:**
- `AnimatedList`: items that appear and disappear but are not reordered by the user
- `Table`: sortable columns rather than a manual order
- `KanbanBoard`: reorder across columns
- `useReorder`: the move helpers without the list UI

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Each row's handle is a tab stop (the handle is a button) |
| Space, Enter | On a handle: pick the row up. While it is picked up: drop it where it is |
| ArrowUp, ArrowDown | While picked up: move the row one place; it stops at the ends |
| Escape | While picked up: cancel and put the row back |
| Enter, Space | On a move button ("Move X up" or "down", with `moveButtons`): move one place at once |

Leaving the handle (blur) while a row is picked up drops it where it is. The arrows are vertical, so nothing changes in RTL. Move buttons are disabled at the ends, while another row is picked up, and with `disabled`.

### Screen readers

- The list is a `ul` named by `label` (default "Reorderable list"). Each handle is a button named "Reorder <label of the item>" with `aria-pressed` while picked up and `aria-describedby` pointing at hidden instructions ("Press Space to pick up. Use the up and down arrow keys to move, Space to drop, Escape to cancel.").
- An assertive `role="status"` region announces each step: "Picked up Bravo. Position 2 of 5. ...", "Moved Bravo to position 3 of 5.", "Dropped Bravo at position 3 of 5." or "Reorder canceled. Bravo returned to position 2 of 5." Buttons announce their move too.
- The names come from `getLabel`; the default `String(item)` reads "[object Object]" for objects, so pass `getLabel`. The floating copy shown while dragging with a pointer is `aria-hidden`.

### Reduced motion

With `flip` (default true) rows glide to their new place when the order changes and a dropped row settles from where it was released; under `prefers-reduced-motion` that is off and rows jump. The drag copy fades in with a short `animate-in` that the global net strips of movement.

### Server rendering

Server render: same markup as the client. The list renders from `items` with plain markup (no browser API at render), so the server HTML is the full list. Drag and keyboard state only exist after interaction.

### Gotchas

- `items` is the source of truth: `onReorder(next, { from, to })` is called once, on drop (or per button press), and only if the position changed. Keep `items` in your state and set it from `next`. While a row is picked up the list shows its own working order.
- `getKey` must return a stable unique string per item. It is the React key and what the focus and the announcements follow.
- `handle={false}` removes the only drag and keyboard control, so combine it with `moveButtons`. `moveButtons` is off by default.
- It is a generic function component: `ref` is a plain prop (it reaches the `ul`), not a `forwardRef`. `reorderArray`, `reorderBy` and `useReorder` are exported from the same module for the data side.

## Example

```tsx
import * as React from "react";
import { ReorderableList } from "@cleanprompt/sutra-ui";

export function Example() {
  const [items, setItems] = React.useState(["Design review", "Write tests", "Ship release"]);
  return (
    <ReorderableList
      label="Priorities"
      items={items}
      getKey={(item) => item}
      moveButtons
      onReorder={(next) => setItems(next)}
      renderItem={(item) => <span className="text-sm">{item}</span>}
    />
  );
}
```
