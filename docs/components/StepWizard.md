# StepWizard

> A multi-step flow in one place: the steps slide in the direction you are going, the area grows or shrinks to the height of the current step, and a progress bar or `Steps` shows where you are. `canAdvance` validates before moving forward (it may be async), Back is free, focus moves to the new step's panel so a screen reader announces it, and Enter in a text field presses Next. Controlled with `value` or uncontrolled. Under reduced motion the steps swap with no slide and the height jumps.

- Import: `import { StepWizard } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/step-wizard` (patterns)
- `data-slot`: `step-wizard-progress`, `step-wizard-steps`, `step-wizard`, `step-wizard-viewport`, `step-wizard-panel`, `step-wizard-footer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` (required) | `readonly StepWizardStep[]` |  | Steps in order; each has an `id`, a `title` and the content to show. |
| `canAdvance` | `(step: StepWizardStep, index: number) => boolean \| Promise<boolean>` |  | Checked before leaving a step forward (Next, Finish, or a jump ahead); return false (or a promise of false) to stay. While a promise is pending the buttons wait. Going back is never checked. |
| `defaultValue` | `string` |  | Initially shown step id when uncontrolled. |
| `footer` | `React.ReactNode \| false` |  | Replace the Back / Next row, or pass false to hide it. |
| `indicator` | `"auto" \| "steps" \| "bar" \| "none"` | `"auto"` | `"auto"` shows `Steps` from a container width of 28rem up and a progress bar below; or force one. Default "auto". |
| `keepMounted` | `boolean` | `false` | Keep every step mounted (hidden) so typed values survive going back. Default false: only the current step is rendered. |
| `labels` | `StepWizardLabels` |  | Overrides for the button and progress texts (`back`, `next`, `finish`, `step`). |
| `onBlocked` | `(step: StepWizardStep, index: number) => void` |  | Called when `canAdvance` keeps the user on a step: show the error there. |
| `onComplete` | `() => void \| Promise<void>` |  | The Finish button was pressed on the last step (after `canAdvance`). It may return a promise; the button shows loading until it settles. |
| `onError` | `(error: unknown) => void` |  | `canAdvance` or `onComplete` threw or rejected: the wizard stays on the step. |
| `onValueChange` | `(id: string, meta: { index: number; direction: "forward" \| "back" }) => void` |  | Called with the new step id, its index and the direction when the user moves between steps. |
| `stepsProps` | `Partial<Omit<StepsProps, "steps" \| "current" \| "onStepClick">>` |  | Passed to `Steps` (variant, size, connector). |
| `value` | `string` |  | Id of the step in view. |

## Notes

**When to use:** A multi-step flow in one place (onboarding, checkout, setup): a progress bar or step indicator, the current step's content that slides in the direction of travel, validation before moving forward, and Back, Next and Finish buttons.

**Use instead when:**
- `Steps`: only the progress indicator, with you owning the content
- `Tabs`: sections the user may open in any order
- `Progress`: a bar without steps
- `Dialog`: a single focused task without stages

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Through the completed-step buttons of the indicator, the step content, then Back and Next |
| Enter | In a text input inside a step: presses Next, or Finish on the last step. Not in a textarea or a button-type input, and not while an IME is composing |
| Enter, Space | On Back, Next or Finish, and on a completed step in the indicator: activates it |

Back is disabled on the first step, and both buttons wait while a check or `onComplete` is pending (Next shows its spinner). Upcoming steps in the indicator are not buttons, so you cannot jump ahead. Nothing uses the arrow keys; in RTL the Back and Next arrows mirror and the slide-in comes from the other side.

### Screen readers

- Every step panel is a `group` named "Step 2 of 4" (`labels.step` changes it). When the step changes, focus moves to the new panel (not on first render), so it is announced. With `keepMounted`, the other panels are `hidden` and `inert`.
- The indicator is an ordered list named "Progress" with `aria-current="step"` on the current item and hidden "(completed)" text on finished ones. The progress bar is a `progressbar` named by the same "Step n of m" text, next to the step title.
- With `indicator="auto"` both exist, and the container width (28rem) hides one with `display: none`, so only one is exposed. The root is `aria-busy` while a check or completion is pending.
- Showing the error is yours: `onBlocked` and `onError` tell you where, and the wizard does not render a message.

### Reduced motion

A step change slides and fades in (`animate-in`, from the end side going forward and the start side going back) and the area animates its height. Under `prefers-reduced-motion` no slide class is added and the height transition ends in 1 ms. The preference is read when a step changes, not live.

### Server rendering

Server render: part of it fills in after mount. The first step renders in full on the server (the first render has no entrance animation). The viewport height is measured after mount and then set as an inline style, and the choice between the step indicator and the bar is a container query in CSS, so the markup does not mismatch.

### Slots

- `step-wizard`: the root (`data-direction` after a move)
- `step-wizard-steps`, `step-wizard-progress`: the indicator and the bar
- `step-wizard-viewport`: the clipped, height-animated area; `step-wizard-panel`: one step (`data-state` current or hidden)
- `step-wizard-footer`: the Back and Next row

### Gotchas

- `canAdvance(step, index)` runs before leaving a step forward (Next, Finish) and may be async; return `false` to stay, and `onBlocked` fires. Going back is never checked, and `onValueChange` and `onComplete` run only after the check passes.
- Only the current step is rendered, so local state of other steps is lost on the way back. Pass `keepMounted` to keep every step in the tree.
- `value` is the step id and a missing id shows the first step. A custom `footer` (or `footer={false}`) removes the built-in buttons: drive the wizard with a controlled `value`, which `canAdvance` does not guard (only the buttons, the indicator and Enter go through it).
- `onComplete` only reports Finish (and may return a promise: the button shows loading until it settles); it does not navigate. A throw or rejection from `canAdvance` or `onComplete` goes to `onError` and keeps the step.

## Example

```tsx
import * as React from "react";
import { Input, StepWizard } from "@sutra/ui";

export function Example({ onCreate }: { onCreate: () => Promise<void> }) {
  const [name, setName] = React.useState("");
  const steps = [
    {
      id: "workspace",
      title: "Workspace",
      content: <Input aria-label="Workspace name" value={name} onChange={(event) => setName(event.target.value)} />,
    },
    { id: "review", title: "Review", content: <p>Create the workspace “{name}”?</p> },
  ];
  return (
    <StepWizard
      steps={steps}
      canAdvance={(step) => step.id !== "workspace" || name.trim() !== ""}
      onComplete={onCreate}
      labels={{ finish: "Create workspace" }}
    />
  );
}
```
