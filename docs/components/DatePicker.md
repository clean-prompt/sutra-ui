# DatePicker

> Input-like button that opens a calendar popover to pick a single date.

- Import: `import { DatePicker } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/date-picker` (primitives)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the calendar popover against the trigger. |
| `aria-describedby` | `string` |  | Id(s) of the element(s) that describe the trigger (hint, error text). |
| `aria-invalid` | `boolean` |  | Overrides the invalid state announced to assistive technology; normally set `invalid` instead. |
| `aria-label` | `string` |  | Accessible name of the trigger when there is no visible label. |
| `aria-labelledby` | `string` |  | Id(s) of the element(s) that label the trigger. |
| `captionLayout` | `"label" \| "dropdown" \| "dropdown-months" \| "dropdown-years"` |  | Show month/year dropdowns in the calendar caption. |
| `className` | `string` |  | Classes for the wrapper around the trigger button (the button itself takes no class). |
| `clearable` | `boolean` |  | Show an inline button that resets the value. |
| `contentClassName` | `string` |  | Classes for the calendar popover. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultValue` | `Date` |  | Initially selected date when uncontrolled. |
| `disabled` | `boolean` |  | Disables the trigger so the calendar cannot be opened. |
| `disabledDates` | `Matcher \| Matcher[]` |  | Dates that can't be picked (react-day-picker matchers). |
| `endMonth` | `Date` |  | Latest month the calendar can navigate to. |
| `formatDate` | `(date: Date) => string` |  | Custom formatter for the trigger text; overrides `formatOptions`. |
| `formatOptions` | `Intl.DateTimeFormatOptions` |  | Options passed to `Intl.DateTimeFormat`. Defaults to `{ dateStyle: "medium" }`. |
| `id` | `string` |  | `id` of the trigger, so a `<label htmlFor>` or `Field` can point at it. |
| `invalid` | `boolean` |  | Marks the picker invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `locale` | `string` |  | BCP 47 locale for the trigger text (`Intl.DateTimeFormat`) and the calendar's month and weekday names, digits and first weekday. |
| `name` | `string` |  | Name of the hidden input that submits the value with a surrounding form. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the popover opens or closes (selection, Escape, outside click). |
| `onValueChange` | `(value: Date \| undefined) => void` |  | Called with the picked date, or `undefined` when cleared. |
| `open` | `boolean` |  | Controlled open state of the calendar popover. Use with `onOpenChange`. |
| `placeholder` | `string` | `"Pick a date"` | Trigger text while no date is selected (each picker has its own default, e.g. "Pick a date"). |
| `required` | `boolean` |  | Marks the picker required. Inherited from a surrounding `Field` when omitted. |
| `size` | `Size` | `"md"` | Trigger height and text size; match the neighbouring inputs. |
| `startMonth` | `Date` |  | Earliest month the calendar can navigate to (days before it are not reachable). |
| `value` | `Date` |  | Selected date; `undefined` means none. Use with `onValueChange`. |
| `variant` | `"outline" \| "filled"` |  | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |

## Notes

**When to use:** An input-like button that opens a calendar popover to pick one date. Picking a day sets the value and closes the popover. For a range or a date with a time, use the sibling pickers.

**Use instead when:**
- `DateRangePicker`: a from and to range with presets
- `DateTimePicker`: a day and a time
- `Calendar`: an always visible month grid
- `TimePicker`: only a time of day
- `Input`: a typed value

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to the trigger, the clear button (when `clearable` and a date is set) and, while open, through the calendar |
| Enter, Space | On the trigger: open the calendar (native button) |
| Arrow keys, PageUp, PageDown, Home, End | In the calendar: move the focused day by day, week, month or year (see Calendar) |
| Enter, Space | On a day: pick it and close the popover |
| Escape | Close without changing the value; focus returns to the trigger |

The trigger is a plain button, so ArrowDown does not open it. In RTL the Left and Right arrows swap inside the calendar and the previous and next month chevrons mirror.

### Screen readers

- The trigger is a native `<button>` that shows the formatted date, or the `placeholder`. The popover is a `role="dialog"` named by `aria-label`, falling back to the placeholder and then "Choose date"; a `FieldLabel` or `aria-labelledby` names the trigger, not the dialog.
- `required` only sets `aria-required`, `invalid` sets `aria-invalid` and a surrounding `Field` supplies `id`, `aria-describedby`, `disabled`, `required` and `invalid` when you do not pass them.
- A given name (`aria-label`, a `FieldLabel`, `aria-labelledby`) replaces the button text as its accessible name, so the chosen date is not part of that name. The clear button is named "Clear date".
- The calendar inside is a labelled grid with day buttons named by their full date (see Calendar).

### Reduced motion

The popover fades and zooms in with `animate-in`; the reduced-motion net removes the movement and ends the transitions in 1 ms. The calendar itself only has short hover transitions.

### Server rendering

Server render: part of it fills in after mount. The trigger renders on the server and the popover is portalled, so it appears only after mount. A trigger with a `value` or `defaultValue` is formatted with `Intl.DateTimeFormat` in the runtime's default locale and time zone unless you pass `locale` or `formatDate`, so a server and a browser that differ can print different text and trigger a hydration warning. The portalled layer does not inherit a subtree `dir` or `data-style`; set them on `<html>`.

### Gotchas

- `locale` formats the trigger text and also sets the calendar's month and weekday names, digits and first weekday (through `Intl`); `formatOptions` only formats the trigger. The calendar's aria labels ("Go to the Next Month", the day names read by a screen reader) stay English: they are not derived from `locale`.
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
