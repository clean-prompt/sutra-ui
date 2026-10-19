---
component: DateRangePicker
module: primitives/date-picker-range
use: An input-like button that opens a two month range calendar with a presets sidebar and an Apply and Cancel footer. The value changes only when the user applies.
instead: DatePicker = a single date; DateTimePicker = a day and a time; Calendar = an always visible grid (`mode="range"`); Select = a few fixed periods with no calendar
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Through the trigger, the clear button, then (open) the presets, the calendar, Cancel and Apply |
| Enter, Space | On the trigger: open; on a preset or a day: choose it; on Cancel or Apply: run it |
| Arrow keys, PageUp, PageDown, Home, End | In the calendar: move the focused day (see Calendar) |
| Escape | Close and discard the draft; focus returns to the trigger |

The trigger is a plain button, so ArrowDown does not open it. In RTL the Left and Right arrows swap inside the calendar and the month chevrons mirror. The preset column is vertical, so it has no arrow keys.

## Screen readers
- The trigger is a native `<button>` showing the applied range or the `placeholder`. The popover is a `role="dialog"` named by `aria-label`, then the placeholder, then "Choose date range". `required`, `invalid`, `id` and `aria-describedby` work as on `DatePicker`, including the values a surrounding `Field` supplies.
- The presets are buttons in a group named "Presets"; the one that matches the draft range has `aria-pressed="true"`.
- The footer text (the draft range, or "Select a start date") is a polite live region, so each click on a day is announced there.
- A given name (`aria-label`, a `FieldLabel`) replaces the button text as the accessible name, so the applied range is not part of it. The clear button is named "Clear date".

## Reduced motion
The popover fades and zooms in with `animate-in`; the net removes the movement. Preset and day hovers are short transitions that end in 1 ms.

## Server rendering
The trigger renders on the server and the popover is portalled, so it appears after mount. A trigger with a range is formatted with `Intl.DateTimeFormat` in the runtime's default locale and time zone unless you pass `locale` or `formatRange`, so server and browser text can differ.

## Gotchas
- Nothing is committed until Apply: clicking days, presets or closing with Escape or an outside click leaves `value` alone, and the next open starts from the committed value. `clearable` clears at once, with no Apply.
- Apply is disabled until a start day is picked, and a range with only a start is applied as a one day range (`to` equals `from`).
- `presets` replaces the defaults (`defaultDateRangePresets`: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month); `presets={[]}` hides the sidebar. Each `getRange` runs when a preset is chosen and when the popover renders, so relative ranges stay current. `numberOfMonths` defaults to 2.
- `locale` formats the trigger and footer text and sets the calendar's month and weekday names, digits and first weekday; its aria labels stay English. With `name`, two hidden inputs post `name[from]` and `name[to]` as `YYYY-MM-DD`.

## Example
```tsx
import * as React from "react";
import { DateRangePicker, Field, FieldLabel } from "@sutra/ui";

type Range = React.ComponentProps<typeof DateRangePicker>["value"];

export function Example() {
  const [range, setRange] = React.useState<Range>();
  return (
    <Field>
      <FieldLabel>Report period</FieldLabel>
      <DateRangePicker
        value={range}
        onValueChange={setRange}
        placeholder="Select dates"
        clearable
      />
    </Field>
  );
}
```
