# StepIndicator

> Alias of `Steps`.

**Deprecated:** Use `Steps` (this is a plain alias).

- Import: `import { StepIndicator } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/step-indicator` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `current` (required) | `number` |  | Zero-based index of the current step. Use `steps.length` to mark all complete. |
| `steps` (required) | `StepIndicatorStep[]` |  | Steps in order; each has a `label` and optional description. |
| `connector` | `boolean` |  | Draw the line between markers (circles/dots). Default true. |
| `onStepClick` | `(index: number) => void` |  | Makes steps clickable. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Lays the steps out in a row or a column. |
| `restrictToCompleted` | `boolean` |  | Only allow clicking completed steps (and the current one). Default true. |
| `size` | `"sm" \| "md"` |  | Marker size for circles: `md` (32px, default) or `sm` (24px, tighter spacing). |
| `variant` | `"circles" \| "bars" \| "dots"` | `"circles"` | Marker style: numbered `circles`, thin progress `bars` or small `dots`. |

## Notes

**When to use:** Shows progress through a multi-step flow as numbered circles, thin bars or dots, horizontal or vertical. Optional clickable steps, per-step `status`, `description`, `content` and (vertical) `action`.

**Use instead when:**
- `Progress`: a single percentage bar
- `Breadcrumbs`: where the user is in a site hierarchy
- `Tabs`: switching between panels of equal rank
- `StepWizard`: the whole wizard with panels, navigation and validation

### Keyboard

Not focusable by default: no keyboard interaction. With `onStepClick`, each completed and current step is a native `<button type="button">` and its own tab stop; Enter and Space activate it. Upcoming steps stay plain `div`s (not focusable) unless `restrictToCompleted={false}`. There are no arrow keys, so nothing swaps in RTL.

### Screen readers

The root is an `<ol>` named "Progress" unless you pass `aria-label` or `aria-labelledby`. The current step's `<li>` has `aria-current="step"`; completed steps get an sr-only "(completed)" after the title (English text, not translatable through a prop); upcoming steps carry no extra text. The marker number is real text, so a step reads like "2 Profile", while the check icon and the connector lines are `aria-hidden`. The `bars` variant adds a visible "Step N" line. `data-status` on each `<li>` reflects `complete`, `current` or `upcoming`.

### Reduced motion

The marker colours, connector fill and bar fill are transitions that end in 1 ms under reduced motion. The check mark that replaces a number on completion pops in with `animate-in zoom-in-50 fade-in-0`, and the reduced-motion net removes the scale and keeps the fade.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API or measuring, so the server and the client render the same list.

### Gotchas

- `current` is the zero-based index of the current step; `steps.length` marks every step complete. A step's own `status` overrides what `current` implies, including `aria-current` and the "(completed)" text, which suits checklists finished out of order.
- The step label field is `title`. The `steps` prop description in the generated reference says `label`, but only `title`, `description`, `icon`, `status`, `content`, `action` and `itemProps` exist.
- `content` renders under the step but outside the clickable area, so inputs and links inside it are not nested in the step button; `action` shows only for the vertical `circles` and `dots`. The `bars` variant ignores `icon`, `action`, `size` and `connector`.
- `StepIndicator` is a deprecated plain alias of `Steps` (and `StepIndicatorProps` of `StepsProps`); use `Steps`.

## Example

```tsx
import * as React from "react";
import { Button, Steps } from "@sutra/ui";

const steps = [
  { title: "Account", description: "Create your login" },
  { title: "Workspace", description: "Name your team" },
  { title: "Invite", description: "Add teammates" },
];

export function Example() {
  const [current, setCurrent] = React.useState(1);
  return (
    <div className="max-w-xl space-y-4">
      <Steps steps={steps} current={current} onStepClick={setCurrent} />
      <div className="flex gap-2">
        <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          Back
        </Button>
        <Button disabled={current === steps.length} onClick={() => setCurrent(current + 1)}>
          {current === steps.length - 1 ? "Finish" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
```
