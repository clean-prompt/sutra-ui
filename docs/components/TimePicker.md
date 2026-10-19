# TimePicker

> Time field with hour, minute (and optional second / AM-PM) segments. Each segment is a spinbutton: arrows step it, digits type into it, Backspace clears it. Value is a 24-hour `"HH:mm"` string.

- Import: `import { TimePicker } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/time-picker` (primitives)
- `data-slot`: `time-picker`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `clearable` | `boolean` |  | Show an inline button that clears the time. |
| `defaultValue` | `string` |  | Initial time (`"HH:mm"`) when uncontrolled. |
| `disabled` | `boolean` |  | Disables every segment. |
| `granularity` | `TimeGranularity` | `"minute"` | Show a seconds segment. Default `"minute"`. |
| `hourCycle` | `12 \| 24` |  | Force a 12- or 24-hour clock. Defaults to the locale's convention. |
| `icon` | `boolean` | `true` | Show the leading clock icon. Default true. |
| `invalid` | `boolean` |  | Marks the field invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `labels` | `TimePickerLabels` |  | Override the segment names and the clear button label (i18n). |
| `locale` | `string` |  | BCP 47 locale for the clock convention, segment order and AM/PM labels. |
| `max` | `string` |  | Latest allowed time (`"HH:mm"`). |
| `min` | `string` |  | Earliest allowed time (`"HH:mm"`). Values outside the range are clamped. |
| `name` | `string` |  | Submits the value under this name through a hidden input. |
| `onValueChange` | `(value: string \| undefined) => void` |  | Called with the new time, or `undefined` when it is cleared or no longer complete. |
| `readOnly` | `boolean` |  | Shows the time without letting the user change it. |
| `required` | `boolean` |  | Marks the field required. Inherited from a surrounding `Field` when omitted. |
| `size` | `Size` | `"md"` | Field height and text size. |
| `step` | `number` | `1` | Minutes moved by the minute segment's arrow keys (snaps to multiples). Default 1. |
| `value` | `string` |  | Time as `"HH:mm"` (24-hour), or `"HH:mm:ss"` with `granularity="second"`. `undefined` means empty. |

## Notes

**When to use:** A typed time of day made of hour, minute, optional second and AM/PM segments, each a spinbutton. The value is a 24-hour `"HH:mm"` string (`"HH:mm:ss"` with `granularity="second"`) whatever clock is shown.

**Use instead when:**
- `DateTimePicker`: a day and a time
- `WheelPicker`: a touch-first scrolling picker
- `Input`: a native `type="time"` field
- `NumberInput`: a plain number

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between the segments, then the clear button |
| ArrowLeft, ArrowRight | Previous or next segment (unfinished digits are committed first) |
| ArrowUp, ArrowDown | Step the segment by 1, wrapping at the ends without carrying into the next segment; the minute segment moves by `step` and snaps to its multiples; AM/PM toggles |
| Home, End | Set the segment to its lowest or highest value |
| 0 to 9 | Type into the segment; a complete entry moves focus to the next segment |
| A, P | In the AM/PM segment (or from the hour or minute on a 12-hour clock): set AM or PM |
| Backspace, Delete | Clear an hour, minute or second segment (AM/PM stays) |

Focusing a segment selects its text. Ctrl, Meta and Alt chords are left to the browser. The segments sit in a `dir="ltr"` row in any reading direction, so Left and Right keep their physical meaning and nothing swaps in RTL.

### Screen readers

- The wrapper is a `role="group"` named by `aria-label`, `aria-labelledby` or a surrounding `FieldLabel`. Each segment is a text input with `role="spinbutton"`, a name ("Hour", "Minute", "Second", "AM/PM"), `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and `aria-valuetext` ("Empty" when unset).
- `labels` replaces the segment names, the clear button ("Clear time") and the spoken empty value, for translation.
- `invalid`, `required` and `readOnly` set `aria-invalid`, `aria-required` and `aria-readonly` on each segment; `disabled` also sets `aria-disabled` on the group. The clock icon and the separators are `aria-hidden`.

### Reduced motion

Nothing moves; only the border and focus colours transition, which the net ends in 1 ms.

### Server rendering

Server render: part of it fills in after mount. Without `hourCycle` and `locale` the clock convention and segment order come from the runtime's default locale, so a server and a browser with different locales can render a 24-hour field against a 12-hour one (an extra AM/PM segment) and trigger a hydration warning. Pass `locale` or `hourCycle` to make the first render deterministic.

### Slots

- `time-picker`: the group element that wraps the segments

### Gotchas

- `onValueChange` receives `undefined` whenever the time is incomplete, for example after clearing one segment; typing a digit that can still grow ("3" in the minute) waits until focus leaves or another digit completes it.
- `min` and `max` clamp the value when it is committed (typed, stepped or blurred) rather than blocking keys, and they are `"HH:mm"` strings.
- With `value` and no `onValueChange` the segments show what was typed but nothing is committed upstream.
- `name` posts the 24-hour value through a hidden input (empty when incomplete). `step` applies to minutes only and is rounded and limited to 1 to 59.

## Example

```tsx
import * as React from "react";
import { Field, FieldLabel, TimePicker } from "@sutra/ui";

export function Example() {
  const [time, setTime] = React.useState<string | undefined>("09:30");
  return (
    <Field>
      <FieldLabel>Reminder time</FieldLabel>
      <TimePicker
        value={time}
        onValueChange={setTime}
        hourCycle={12}
        step={15}
        min="08:00"
        max="20:00"
        clearable
      />
    </Field>
  );
}
```
