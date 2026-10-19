# UndoAction

> A destructive button that turns into a counted "Undo" for N seconds and only then commits (`onCommit`). The deadline is the wall clock, so a throttled tab still commits on time; the ring and the number follow it. The focus stays on the same button, so Enter or Space undoes. Pair it with a `Toast` through `onArm` and a controlled `armed`. The three labels sit in one grid cell, so the width never jumps. A polite live region announces the countdown, the undo and the commit.

- Import: `import { UndoAction } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/undo-action` (primitives)
- `data-slot`: `undo-action`, `undo-action-ring`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onCommit` (required) | `() => void \| Promise<unknown>` |  | Runs once the countdown ends (not before). A returned promise shows a spinner; a rejection brings the button back. |
| `armed` | `boolean` |  | The countdown is running. Set it from outside (a toast's Undo button sets it to false). |
| `armedVariant` | `ButtonProps["variant"]` | `"secondary"` | Variant while the countdown runs. Default "secondary". |
| `committedLabel` | `React.ReactNode` | `"Deleted"` | Text shown once the action went through (after the window closes). |
| `defaultArmed` | `boolean` | `false` | Initial armed state when uncontrolled. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `icon` | `React.ReactNode` |  | Icon before the idle label. |
| `label` | `React.ReactNode` | `"Delete"` | Label of the idle button. Default "Delete". |
| `messages` | `{ armed?: (seconds: number) => string; undone?: string; committed?: string }` |  | Screen reader messages (a polite live region). |
| `onArm` | `() => void` |  | Runs when the user presses the button and the countdown starts (start a `Toast` here). |
| `onArmedChange` | `(armed: boolean) => void` |  | Called when the countdown starts or stops (including when undone). |
| `onUndo` | `() => void` |  | Runs when the user presses "Undo". Setting a controlled `armed` to false from outside cancels silently. |
| `pauseOnFocus` | `boolean` | `false` | Hold the countdown while the button has keyboard focus (focus that came from a click does not count). |
| `pauseOnHover` | `boolean` | `false` | Hold the countdown while the pointer is over the button. |
| `seconds` | `number` | `8` | Seconds the user has to undo. Default 8. |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `undoLabel` | `React.ReactNode` | `"Undo"` | Label of the button while the undo window is open. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

## Notes

**When to use:** A destructive button that, once pressed, turns into a counted "Undo" for a few seconds and only then commits. The countdown follows the wall clock, shows a ring and a number, and the focus stays on the same button.

**Use instead when:**
- `ConfirmDialog`: the action needs an explicit yes or no first
- `SlideToConfirm`: the action is deliberate and cannot be undone
- `Button`: nothing to undo
- `Toaster`: show the undo as a toast (pair it through `onArm` and a controlled `armed`)

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the button. A `disabled` button is skipped |
| Enter, Space | Idle: starts the countdown (`onArm`). During it: undoes (`onUndo`). The focus never leaves the button |

It is a single native button, so there are no arrow keys and nothing changes in RTL. Once committed it is `aria-disabled` and presses do nothing, but it stays focusable. `pauseOnFocus` holds the countdown while the button has keyboard focus (focus from a click does not count).

### Screen readers

- The name is the visible label of the current phase: `label` ("Delete"), then `undoLabel` ("Undo"), then `committedLabel` ("Deleted"). The other two labels are `aria-hidden`, and so are the ring and its number, so the changing digit is not read.
- A sibling visually hidden `role="status"` announces the transitions, nothing on first render: "Undo available for N seconds" when armed, "Undone" after an undo, "Done" after the commit. `messages` replaces any of the three (`armed` is a function of the seconds).
- `aria-busy` is on the button while a promise from `onCommit` runs (it is a `Button` with `loading`).

### Reduced motion

The label cross-fade and the ring's progress are short transitions, which the reduced-motion net ends within 1 ms, so the ring steps instead of gliding. The countdown is wall-clock time, not an animation, so it runs the same.

### Server rendering

Server render: same markup as the client. No browser API at render: the deadline starts in a layout effect after mount, and before that the ring shows the full window. A `defaultArmed` button renders armed and begins counting after hydration.

### Slots

- `undo-action`: the button
- `undo-action-ring`: the ring with the seconds left

### Gotchas

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
