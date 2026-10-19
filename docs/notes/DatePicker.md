---
component: DatePicker
module: primitives/date-picker
use: An input-like button that opens a calendar popover to pick one date. Picking a day sets the value and closes the popover. For a range or a date with a time, use the sibling pickers.
instead: DateRangePicker = a from and to range with presets; DateTimePicker = a day and a time; Calendar = an always visible month grid; TimePicker = only a time of day; Input = a typed value
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to the trigger, the clear button (when `clearable` and a date is set) and, while open, through the calendar |
| Enter, Space | On the trigger: open the calendar (native button) |
| Arrow keys, PageUp, PageDown, Home, End | In the calendar: move the focused day by day, week, month or year (see Calendar) |
| Enter, Space | On a day: pick it and close the popover |
| Escape | Close without changing the value; focus returns to the trigger |

The trigger is a plain button, so ArrowDown does not open it. In RTL the Left and Right arrows swap inside the calendar and the previous and next month chevrons mirror.

## Screen readers
- The trigger is a native `<button>` that shows the formatted date, or the `placeholder`. The popover is a `role="dialog"` named by `aria-label`, falling back to the placeholder and then "Choose date"; a `FieldLabel` or `aria-labelledby` names the trigger, not the dialog.
- `required` only sets `aria-required`, `invalid` sets `aria-invalid` and a surrounding `Field` supplies `id`, `aria-describedby`, `disabled`, `required` and `invalid` when you do not pass them.
- A given name (`aria-label`, a `FieldLabel`, `aria-labelledby`) replaces the button text as its accessible name, so the chosen date is not part of that name. The clear button is named "Clear date".
- The calendar inside is a labelled grid with day buttons named by their full date (see Calendar).

## Reduced motion
The popover fades and zooms in with `animate-in`; the reduced-motion net removes the movement and ends the transitions in 1 ms. The calendar itself only has short hover transitions.

## Server rendering
The trigger renders on the server and the popover is portalled, so it appears only after mount. A trigger with a `value` or `defaultValue` is formatted with `Intl.DateTimeFormat` in the runtime's default locale and time zone unless you pass `locale` or `formatDate`, so a server and a browser that differ can print different text and trigger a hydration warning. The portalled layer does not inherit a subtree `dir` or `data-style`; set them on `<html>`.

## Gotchas
- `locale` and `formatOptions` only format the trigger text. The calendar is not given the locale, so its month names, weekdays and week start stay at DayPicker's defaults.
- `className` goes to the wrapper `div` around the trigger, not to the button; `contentClassName` styles the popover.
- Clicking the day that is already selected clears the value (`onValueChange(undefined)`) and leaves the popover open; `clearable` adds an explicit button.
- With `name` a hidden input posts the local day as `YYYY-MM-DD` (empty when none). `required` blocks nothing in a native form. `startMonth` and `endMonth` limit navigation, `disabledDates` takes react-day-picker matchers.

## Example
```tsx
import * as React from "react";
import { DatePicker, Field, FieldLabel } from "@sutra/ui";

export function Example() {
  const [due, setDue] = React.useState<Date | undefined>();
  return (
    <Field>
      <FieldLabel>Due date</FieldLabel>
      <DatePicker
        value={due}
        onValueChange={setDue}
        placeholder="Pick a date"
        disabledDates={{ before: new Date() }}
        clearable
      />
    </Field>
  );
}
```
