---
component: UndoAction
module: primitives/undo-action
use: A destructive button that, once pressed, turns into a counted "Undo" for a few seconds and only then commits. The countdown follows the wall clock, shows a ring and a number, and the focus stays on the same button.
instead: ConfirmDialog = the action needs an explicit yes or no first; SlideToConfirm = the action is deliberate and cannot be undone; Button = nothing to undo; Toaster = show the undo as a toast (pair it through `onArm` and a controlled `armed`)
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the button. A `disabled` button is skipped |
| Enter, Space | Idle: starts the countdown (`onArm`). During it: undoes (`onUndo`). The focus never leaves the button |

It is a single native button, so there are no arrow keys and nothing changes in RTL. Once committed it is `aria-disabled` and presses do nothing, but it stays focusable. `pauseOnFocus` holds the countdown while the button has keyboard focus (focus from a click does not count).

## Screen readers
- The name is the visible label of the current phase: `label` ("Delete"), then `undoLabel` ("Undo"), then `committedLabel` ("Deleted"). The other two labels are `aria-hidden`, and so are the ring and its number, so the changing digit is not read.
- A sibling visually hidden `role="status"` announces the transitions, nothing on first render: "Undo available for N seconds" when armed, "Undone" after an undo, "Done" after the commit. `messages` replaces any of the three (`armed` is a function of the seconds).
- `aria-busy` is on the button while a promise from `onCommit` runs (it is a `Button` with `loading`).

## Reduced motion
The label cross-fade and the ring's progress are short transitions, which the reduced-motion net ends within 1 ms, so the ring steps instead of gliding. The countdown is wall-clock time, not an animation, so it runs the same.

## Server rendering
No browser API at render: the deadline starts in a layout effect after mount, and before that the ring shows the full window. A `defaultArmed` button renders armed and begins counting after hydration.

## Slots
- `undo-action`: the button
- `undo-action-ring`: the ring with the seconds left

## Gotchas
- Unmounting during the window drops the action: `onCommit` never runs (the test pins it). Keep it mounted until the countdown ends, or commit on unmount yourself.
- After the commit the button stays on `committedLabel` and is inert; it does not reset on its own. Re-arm it from outside with a controlled `armed`, or remount it. A promise from `onCommit` shows a spinner, and a rejection brings the button back to idle.
- With a controlled `armed`, setting it to `false` from outside cancels silently (no `onUndo`), and setting it to `true` starts the countdown. `onArmedChange(false)` fires at the commit too, not only on undo.
- `pauseOnHover` ignores touch pointers. `seconds` is at least 1 (default 8). `variant` is the idle look (default `destructive-soft`) and `armedVariant` the counting one (default `secondary`); `onClick`, `children`, `asChild` and `loading` are not accepted.

## Example
```tsx
import { UndoAction } from "@sutra/ui";
import { RiDeleteBinLine } from "@sutra/ui/icons";

export function Example({ deleteProject }: { deleteProject: () => Promise<unknown> }) {
  return (
    <UndoAction
      icon={<RiDeleteBinLine aria-hidden />}
      label="Delete project"
      undoLabel="Undo"
      committedLabel="Project deleted"
      seconds={6}
      onCommit={deleteProject}
    />
  );
}
```
