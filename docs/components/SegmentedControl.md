# SegmentedControl

> Single-choice segmented control with an animated sliding thumb.

- Import: `import { SegmentedControl } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/segmented-control` (primitives)
- Parts: [`SegmentedControlItem`](SegmentedControlItem.md)
- Also accepts the props of HTMLAttributes, ToggleGroupImplProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` |  | Initially selected item value when uncontrolled. |
| `fullWidth` | `boolean` | `false` | Stretch to the container and split segments evenly. |
| `onValueChange` | `(value: string) => void` |  | Called with the value of the segment the user picked. |
| `options` | `SegmentedControlOption[]` |  | Data-driven alternative to `SegmentedControlItem` children. |
| `size` | `Size` | `"md"` | Control height and text size. |
| `value` | `string` |  | Controlled selected item value. Use with `onValueChange`. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
- `fullWidth`: `true` (default false)

## Part props

### SegmentedControlItem

One segment. Renders icon-only (square) when it has an icon and no label.

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `React.ReactNode` |  | Icon shown before the segment label. |

## Notes

**When to use:** One choice from two to four short options that switch a view or a mode, drawn as a pill with a sliding thumb. Pass `options`, or compose `SegmentedControlItem` children; icon-only segments are square.

**Use instead when:**
- `RadioGroup`: options need descriptions or must read as a form field
- `Select`: more than a handful of options
- `Tabs`: the choice swaps panels of content
- `ToggleGroup`: loose on/off buttons that can all be off
- `ButtonGroup`: attached action buttons

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | One tab stop: the selected segment (the first one when none is selected) |
| ArrowRight, ArrowLeft, ArrowDown, ArrowUp | Move focus to the next or previous enabled segment, looping at the ends |
| Home, End | Focus the first or last segment |
| Enter, Space | Select the focused segment |

Arrow keys move focus only; selecting needs Enter or Space. In RTL the horizontal arrows swap (ArrowLeft goes to the next segment), because Radix roving focus reads the `dir` that the control passes down: a `DirectionProvider`, a `dir` container or `<html dir>`, or a `dir` you set yourself.

### Screen readers

- The root is `role="radiogroup"` and each segment is a `role="radio"` button with `aria-checked`. The group has no name of its own: pass `aria-label` or `aria-labelledby`.
- A segment is named by its label text. An icon-only segment has no text, so give it `aria-label` (an `options` entry takes `"aria-label"`). The sliding thumb is `aria-hidden`.
- Disabled segments are skipped by focus.

### Reduced motion

The thumb slides with a 300 ms transform transition and the label colours fade in 200 ms; the reduced-motion net ends both in 1 ms, so the thumb jumps. The thumb never animates on the first frame, it appears in place.

### Server rendering

Server render: part of it fills in after mount. The segments render on the server with the selected one marked, but the thumb behind it is measured after mount, so the server HTML shows the selection by text colour only and the pill appears on hydration. The group's `dir` is `ltr` in the server HTML and settles after hydration on an RTL page.

### Gotchas

- It is a single-select that never deselects: clicking the selected segment keeps it, and `onValueChange` does not fire for it (it receives a string, never an empty one).
- With `options` and no `value` or `defaultValue` the first option is selected; with `SegmentedControlItem` children and no `defaultValue` nothing is selected until the user picks.
- The root has `overflow-x-auto` and `max-w-full`, so many options scroll sideways in a narrow column instead of overflowing. `fullWidth` stretches the root and splits the segments evenly.
- Extra props (including `dir`, `disabled`, `loop`) go to the Radix root; a `dir` you pass overrides the detected direction.

## Example

```tsx
import * as React from "react";
import { SegmentedControl } from "@cleanprompt/sutra-ui";

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
