---
component: Slider
module: primitives/slider
covers: RangeSlider
use: Pick a number, or a range with two thumbs, by dragging along a track. The value is always an array (`[40]`, or `[10, 80]` for `RangeSlider`). It has an optional value bubble, tick marks, `accent` and `tone` colours, and a vertical orientation.
instead: NumberInput = an exact number is typed or stepped; VolumeSlider = a slider with a mute toggle and level readout; Progress = a level the user cannot change; Rating = a few discrete stars; SegmentedControl = a few labelled steps
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Each thumb is a tab stop |
| ArrowRight, ArrowUp | Raise the focused thumb by one `step` |
| ArrowLeft, ArrowDown | Lower it by one `step` |
| Shift+Arrow, PageUp, PageDown | Move ten steps (PageUp raises, PageDown lowers) |
| Home, End | Set the first thumb to `min` and the last thumb to `max`, whichever thumb has focus |

In RTL on a horizontal slider ArrowLeft raises and ArrowRight lowers, and the track fills from the right; Up and Down do not change. The direction is read from the parent (a `DirectionProvider`, a `dir` container or `<html dir>`), and a `dir` you pass wins. Thumbs keep a minimum gap of `minStepsBetweenThumbs` steps (1 for `RangeSlider`).

## Screen readers
- Each thumb is a `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and `aria-orientation`. A single thumb is named by `thumbLabels` (such as `["Volume"]`), else by `aria-label` or `aria-labelledby` on the `Slider`, else by a surrounding `FieldLabel`; two thumbs are named "Minimum" and "Maximum" by default (an `aria-label` on the `Slider` then becomes a `role="group"` around them), more are "Value 1 of 3" and so on. `getValueText` sets `aria-valuetext` per thumb, for example `(v) => v + "%"`.
- `id` stays on the Radix root `span` (which has no role), so a `FieldLabel` click does not focus a thumb. The slider reads `Field`: its id, `disabled`, invalid state and description, hint and error ids (`aria-describedby`, also on every thumb); an explicit prop wins.
- The value bubble and the tick marks and their labels are `aria-hidden`; put what matters in `getValueText`. `invalid` (or an invalid `Field`) sets `aria-invalid` on the root and on each thumb and turns the range red.

## Reduced motion
The thumb ring, press scale and value bubble use short transitions, which the reduced-motion net ends in 1 ms.

## Server rendering
The track and range render on the server from `value` or `defaultValue`, but each thumb is `display: none` until Radix has mounted and located it, so the thumbs appear after hydration. The direction is `ltr` in the server HTML and settles after hydration on an RTL page.

## Gotchas
- `value` and `defaultValue` are arrays, and `onValueChange` receives the whole array. `onValueCommit` fires when a drag or key press ends.
- `ref` and `className` go to the outer wrapper (which also holds the marks); every other prop, including `disabled`, `step`, `name` and `orientation`, goes to the Radix root inside it. `name` posts one hidden input per thumb (named `name[]` for a range) inside a form.
- `showValue` shows the bubble on hover, focus and drag; `"always"` keeps it. `marks` take numbers or `{ value, label }` and only mark; they do not snap the value (use `step`).
- A given `tone` beats `accent`, and `invalid` beats both.

## Example
```tsx
import * as React from "react";
import { Slider } from "@sutra/ui";

export function Example() {
  const [price, setPrice] = React.useState([20, 80]);
  return (
    <Slider
      className="max-w-sm"
      min={0}
      max={100}
      step={5}
      value={price}
      onValueChange={setPrice}
      thumbLabels={["Minimum price", "Maximum price"]}
      showValue
      formatValue={(value) => `$${value}`}
      marks={[0, 50, 100]}
    />
  );
}
```
