---
component: DateTimePicker
module: primitives/date-picker-datetime
use: An input-like button that opens a calendar plus a time field, to pick a local day and time together. The value is wall-clock time in the user's zone, like `datetime-local`, as a `Date` or a `"YYYY-MM-DDTHH:mm"` string.
instead: DatePicker = a day only; TimePicker = a time only; DateRangePicker = a from and to range; Input = a native `type="datetime-local"` field
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Trigger, clear button, then (open) the presets, the calendar, the hour, minute and day period segments and Done |
| Enter, Space | On the trigger: open; on a preset: choose it and close; on a day: pick it; on Done: close |
| Arrow keys, PageUp, PageDown, Home, End | In the calendar: move the focused day (see Calendar) |
| ArrowUp, ArrowDown, digits, Backspace | In a time segment: step, type or clear it (see TimePicker) |
| Escape | Close the popover; focus returns to the trigger |

The trigger is a plain button, so ArrowDown does not open it. In RTL the calendar's Left and Right arrows swap; the time segments stay in a left to right group with fixed Left and Right.

## Screen readers
- The trigger is a native `<button>` showing the formatted date and time, or the `placeholder`. The popover is a `role="dialog"` named by `aria-label`, then the placeholder, then "Choose date and time". `required`, `invalid`, `id` and `aria-describedby` work as on `DatePicker`.
- The time field is a group named by the visible "Time" text (`timeLabel`) with spinbutton segments for hour, minute and, with `granularity="second"`, seconds, plus an AM/PM segment on a 12-hour clock. The presets are plain buttons in a group named "Presets".
- A given name (`aria-label`, a `FieldLabel`) replaces the button text as the accessible name, so the chosen moment is not part of it. The clear button is named "Clear date".

## Reduced motion
The popover fades and zooms in with `animate-in`; the net removes the movement and ends transitions in 1 ms. The time field has no motion of its own.

## Server rendering
The trigger renders on the server and the popover is portalled, so it appears after mount. The trigger text is formatted with `Intl.DateTimeFormat` in the runtime's default locale and time zone unless you pass `locale`, `formatOptions` or `formatDateTime`, so server and browser can print different text and trigger a hydration warning. The portalled layer does not inherit a subtree `dir` or `data-style`; set them on `<html>`.

## Gotchas
- Changes apply at once: picking a day, or stepping the time, calls `onValueChange(date, { localValue })` and the popover stays open until Done, Escape or an outside click. Picking a preset sets the value and closes. Clicking the selected day does not unselect it.
- A day picked before any time is set uses the time typed so far, else `defaultTime` (`"00:00"`). A time typed before a day exists is held until a day is picked.
- `min` and `max` disable days outside them, clamp the result, and limit the time on the boundary day; strings without a zone are read as local time.
- With `name` a hidden input posts `YYYY-MM-DDTHH:mm` (with `:ss` for seconds, empty when none). `locale` formats the trigger, sets the time field's clock and segment order, and sets the calendar's month and weekday names, digits and first weekday (its aria labels stay English).

## Example
```tsx
import * as React from "react";
import { DateTimePicker, Field, FieldLabel } from "@sutra/ui";

export function Example() {
  const [start, setStart] = React.useState<Date | undefined>();
  return (
    <Field>
      <FieldLabel>Meeting starts</FieldLabel>
      <DateTimePicker
        value={start}
        onValueChange={setStart}
        placeholder="Pick a day and time"
        min={new Date()}
        step={15}
        hourCycle={24}
        clearable
      />
    </Field>
  );
}
```
