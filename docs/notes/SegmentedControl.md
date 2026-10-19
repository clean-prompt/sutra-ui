---
component: SegmentedControl
module: primitives/segmented-control
covers: SegmentedControlItem
use: One choice from two to four short options that switch a view or a mode, drawn as a pill with a sliding thumb. Pass `options`, or compose `SegmentedControlItem` children; icon-only segments are square.
instead: RadioGroup = options need descriptions or must read as a form field; Select = more than a handful of options; Tabs = the choice swaps panels of content; ToggleGroup = loose on/off buttons that can all be off; ButtonGroup = attached action buttons
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | One tab stop: the selected segment (the first one when none is selected) |
| ArrowRight, ArrowLeft, ArrowDown, ArrowUp | Move focus to the next or previous enabled segment, looping at the ends |
| Home, End | Focus the first or last segment |
| Enter, Space | Select the focused segment |

Arrow keys move focus only; selecting needs Enter or Space. In RTL the horizontal arrows swap (ArrowLeft goes to the next segment), because Radix roving focus reads the `dir` that the control passes down: a `DirectionProvider`, a `dir` container or `<html dir>`, or a `dir` you set yourself.

## Screen readers
- The root is `role="radiogroup"` and each segment is a `role="radio"` button with `aria-checked`. The group has no name of its own: pass `aria-label` or `aria-labelledby`.
- A segment is named by its label text. An icon-only segment has no text, so give it `aria-label` (an `options` entry takes `"aria-label"`). The sliding thumb is `aria-hidden`.
- Disabled segments are skipped by focus.

## Reduced motion
The thumb slides with a 300 ms transform transition and the label colours fade in 200 ms; the reduced-motion net ends both in 1 ms, so the thumb jumps. The thumb never animates on the first frame, it appears in place.

## Server rendering
The segments render on the server with the selected one marked, but the thumb behind it is measured after mount, so the server HTML shows the selection by text colour only and the pill appears on hydration. The group's `dir` is `ltr` in the server HTML and settles after hydration on an RTL page.

## Gotchas
- It is a single-select that never deselects: clicking the selected segment keeps it, and `onValueChange` does not fire for it (it receives a string, never an empty one).
- With `options` and no `value` or `defaultValue` the first option is selected; with `SegmentedControlItem` children and no `defaultValue` nothing is selected until the user picks.
- The root has `overflow-x-auto` and `max-w-full`, so many options scroll sideways in a narrow column instead of overflowing. `fullWidth` stretches the root and splits the segments evenly.
- Extra props (including `dir`, `disabled`, `loop`) go to the Radix root; a `dir` you pass overrides the detected direction.

## Example
```tsx
import * as React from "react";
import { SegmentedControl } from "@sutra/ui";

export function Example() {
  const [view, setView] = React.useState("list");
  return (
    <SegmentedControl
      aria-label="View"
      value={view}
      onValueChange={setView}
      options={[
        { value: "list", label: "List" },
        { value: "board", label: "Board" },
        { value: "calendar", label: "Calendar" },
      ]}
    />
  );
}
```
