# CoachmarkTour

> Dependency-free guided tour: spotlight cutout, anchored step card, keyboard and completion callbacks.

- Import: `import { CoachmarkTour } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/patterns/coachmarks` (patterns)
- `data-slot`: `coachmark-tour`, `coachmark-card`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` (required) | `CoachmarkStep[]` |  | Tour steps in order; each has a `target`, a `title` and optional body, placement and action. |
| `className` | `string` |  | Classes for the tour card. |
| `closeOnOverlayClick` | `boolean` | `false` | Close (skip) when the dimmed area is clicked. Default false. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultStep` | `number` | `0` | Initial step index when uncontrolled. |
| `labels` | `CoachmarkTourLabels` | `{}` | Overrides for the button texts (`next`, `back`, `skip`, `finish`). |
| `onComplete` | `(reason: "finish" \| "skip") => void` |  | Persist completion; called for both finish and skip. |
| `onFinish` | `() => void` |  | Called when the user finishes the last step. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the tour opens or closes. |
| `onSkip` | `(step: number) => void` |  | Called with the step index where the user chose Skip. |
| `onStepChange` | `(step: number) => void` |  | Called with the new step index when the user moves between steps. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `padding` | `number` | `8` | Spotlight padding around the target, px. Default 8. |
| `radius` | `number` | `10` | Spotlight corner radius, px. Default 10. |
| `step` | `number` |  | Controlled index of the current step. Use with `onStepChange`. |

## Example (live: `#/components/workspace/coachmarks` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { RiCompass3Line } from "@sutra/ui/icons";
import { CoachmarkTour } from "@sutra/ui/workspace";

function TourDemo() {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState("not started");
  return (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiCompass3Line />} onClick={() => setOpen(true)}>
        Start tour
      </Button>
      <p className="text-xs text-muted-foreground">Completion: {status} · ← → to move, Esc to skip</p>
      <CoachmarkTour
        steps={tourSteps}
        open={open}
        onOpenChange={setOpen}
        defaultStep={0}
        onFinish={() => setStatus("finished")}
        onSkip={(i) => setStatus(`skipped at step ${i + 1}`)}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): tourSteps.
