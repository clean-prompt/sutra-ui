# SwipeRow

> A list row that follows the finger: drag it to reveal buttons at its start or end, or swipe all the way to run the outermost one. It builds on `useDrag` (the offset lives in `--sutra-drag-x`, no render per move), rubber-bands past the end, releases with a spring and opens at 40% of the actions' width. The actions are real buttons: Tab reaches them (a focused button opens its side), Arrow keys on the row open and close it, Escape closes it, and `onAction` runs for buttons and swipes alike. Use `Item` rows as the content; inside an `ItemGroup` the row itself is the list item.

- Import: `import { SwipeRow } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/patterns/swipe-row` (patterns)
- `data-slot`: `swipe-row-actions`, `swipe-row`, `swipe-row-content`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actionsLabel` | `string` | `"Actions"` | Accessible name of the action groups. Default "Actions". |
| `actionWidth` | `number` | `72` | Width of one action button in px, so the reveal distance is known without measuring. Default 72. |
| `commit` | `boolean` | `true` | A full swipe runs the outermost action. Default true; false stops at the revealed actions. |
| `contentClassName` | `string` |  | Classes of the sliding content layer (it must stay opaque to hide the actions). Default `bg-background`. |
| `defaultValue` | `SwipeSide \| null` | `null` | Initially open side when uncontrolled; `null` is closed. |
| `disabled` | `boolean` | `false` | Disables swiping. |
| `endActions` | `SwipeAction[]` | `[]` | Actions revealed by dragging toward the inline start (left in left-to-right text). |
| `onAction` | `(action: SwipeAction, side: SwipeSide) => void` |  | Runs for a button press, a key press and a full swipe alike. |
| `onValueChange` | `(side: SwipeSide \| null) => void` |  | Called with the open side (`null` when closed) after a swipe. |
| `startActions` | `SwipeAction[]` | `[]` | Actions revealed by dragging toward the inline end (right in left-to-right text). |
| `value` | `SwipeSide \| null` |  | Which side's actions are open (`null` closed). |

## Notes

**When to use:** A list row you drag sideways to reveal action buttons at its start or end, or swipe all the way to run the outermost one. The actions are real buttons that Tab reaches, with arrow and Escape keys on the row as a keyboard path.

**Use instead when:**
- `DropdownMenu`: the actions fit a menu button on every device
- `ReorderableList`: rows the user reorders by dragging
- `Item`: the row content you put inside it (inside an `ItemGroup` the SwipeRow becomes the list item)

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | The action buttons are always in the tab order: focusing one opens its side, and leaving the group closes it |
| ArrowRight | On the row in left-to-right text: opens the `startActions` and moves focus to their first enabled button |
| ArrowLeft | In left-to-right text: opens the `endActions` the same way |
| The arrow of the other side | While a side is open: closes it and returns focus to where it was |
| Escape | Closes an open row and returns focus to where it was |
| Enter, Space | Press the focused action button |

The row itself is not focusable, so the arrows work from a control inside it (a link or button in the content) or from an action. They are ignored in text fields and with Alt, Ctrl or Meta held. In RTL the arrows swap with the drag direction, so ArrowLeft opens the `startActions` and ArrowRight the `endActions`; this follows from the source (`direction.test.tsx` does not cover SwipeRow).

### Screen readers

- Each side is a `role="group"` named "Actions" (`actionsLabel`), with plain `<button>`s named by their `label`; icons are `aria-hidden`. The actions are in the accessibility tree even while the row is closed, and both sides share one name when both are given.
- Inside an `ItemGroup` the row has `role="listitem"`, and the `Item` inside it is not a second list item. Outside one the row has no role.
- There is no live announcement when the row opens or an action runs: put the result in your own live region or a toast.

### Reduced motion

The drag follows the finger with no animation. The settle after a release (open, close, or the fly-out of a full swipe) is a spring that `useDrag` skips under `prefers-reduced-motion`: the row jumps to its place and a committed swipe does not visibly fly out. The button colour fade ends in 1 ms.

### Server rendering

Server render: part of it fills in after mount. The server renders the row and both action groups at rest with a left-to-right direction. The widths are measured and the position is applied after mount, so `defaultValue` or `value` set to a side starts open only after hydration, and in RTL the signs settle after mount.

### Slots

- `swipe-row`: the root
- `swipe-row-content`: the sliding layer that holds your content
- `swipe-row-actions`: one side's group of buttons (`data-side` is `start` or `end`)

### Gotchas

- `commit` defaults to true: a swipe past half the row (or a fast flick) runs the outermost action, which is the one marked `commit: true` or the one at the row's edge. Pass `commit={false}` for destructive actions you only want revealed, otherwise one long swipe deletes.
- `startActions` and `endActions` are logical: `startActions` are revealed by dragging toward the inline end (right in LTR, left in RTL). `onAction` runs for a button, a key and a swipe alike, after the action's own `onSelect`, and never for a `disabled` action.
- The content layer must stay opaque (`bg-background` by default) or the buttons show through; set `contentClassName` when the row sits on another surface. Taps on an open row close it instead of activating the content, and so does a press outside.
- `actionWidth` (default 72) fixes the reveal distance without measuring: wider labels truncate rather than widen. Drags that start on inputs, textareas, selects, sliders or `data-swipe-no-drag` elements are ignored.

## Example

```tsx
import { SwipeRow } from "@sutra/ui";
import { RiArchiveLine, RiDeleteBinLine, RiMailLine } from "@sutra/ui/icons";

export function Example({ onArchive, onDelete }: { onArchive: () => void; onDelete: () => void }) {
  return (
    <SwipeRow
      commit={false}
      startActions={[{ id: "unread", label: "Unread", icon: <RiMailLine aria-hidden />, tone: "primary" }]}
      endActions={[
        { id: "archive", label: "Archive", icon: <RiArchiveLine aria-hidden />, onSelect: onArchive },
        { id: "delete", label: "Delete", icon: <RiDeleteBinLine aria-hidden />, tone: "destructive", onSelect: onDelete },
      ]}
    >
      <div className="px-4 py-3">
        <p className="text-sm font-medium">Quarterly planning</p>
        <p className="text-sm text-muted-foreground">Maya: Agenda is attached, see you at 10.</p>
      </div>
    </SwipeRow>
  );
}
```
