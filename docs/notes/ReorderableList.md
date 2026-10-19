---
component: ReorderableList
module: patterns/reorderable-list
use: A list whose rows the user can reorder by dragging a handle, by picking a row up with the keyboard, or with optional up and down buttons, with live announcements. You render each row; the list reports the new order after every move. `Checklist` builds a subtask list on it.
instead: AnimatedList = items that appear and disappear but are not reordered by the user; Table = sortable columns rather than a manual order; KanbanBoard = reorder across columns; useReorder = the move helpers without the list UI
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Each row's handle is a tab stop (the handle is a button) |
| Space, Enter | On a handle: pick the row up. While it is picked up: drop it where it is |
| ArrowUp, ArrowDown | While picked up: move the row one place; it stops at the ends |
| Escape | While picked up: cancel and put the row back |
| Enter, Space | On a move button ("Move X up" or "down", with `moveButtons`): move one place at once |

Leaving the handle (blur) while a row is picked up drops it where it is. The arrows are vertical, so nothing changes in RTL. Move buttons are disabled at the ends, while another row is picked up, and with `disabled`.

## Screen readers
- The list is a `ul` named by `label` (default "Reorderable list"). Each handle is a button named "Reorder <label of the item>" with `aria-pressed` while picked up and `aria-describedby` pointing at hidden instructions ("Press Space to pick up. Use the up and down arrow keys to move, Space to drop, Escape to cancel.").
- An assertive `role="status"` region announces each step: "Picked up Bravo. Position 2 of 5. ...", "Moved Bravo to position 3 of 5.", "Dropped Bravo at position 3 of 5." or "Reorder canceled. Bravo returned to position 2 of 5." Buttons announce their move too.
- The names come from `getLabel`; the default `String(item)` reads "[object Object]" for objects, so pass `getLabel`. The floating copy shown while dragging with a pointer is `aria-hidden`.

## Reduced motion
With `flip` (default true) rows glide to their new place when the order changes and a dropped row settles from where it was released; under `prefers-reduced-motion` that is off and rows jump. The drag copy fades in with a short `animate-in` that the global net strips of movement.

## Server rendering
The list renders from `items` with plain markup (no browser API at render), so the server HTML is the full list. Drag and keyboard state only exist after interaction.

## Gotchas
- `items` is the source of truth: `onReorder(next, { from, to })` is called once, on drop (or per button press), and only if the position changed. Keep `items` in your state and set it from `next`. While a row is picked up the list shows its own working order.
- `getKey` must return a stable unique string per item. It is the React key and what the focus and the announcements follow.
- `handle={false}` removes the only drag and keyboard control, so combine it with `moveButtons`. `moveButtons` is off by default.
- It is a generic function component: `ref` is a plain prop (it reaches the `ul`), not a `forwardRef`. `reorderArray`, `reorderBy` and `useReorder` are exported from the same module for the data side.

## Example
```tsx
import * as React from "react";
import { ReorderableList } from "@sutra/ui";

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
