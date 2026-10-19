# DateTimePicker

> Input-like button that opens a calendar plus a `TimePicker` to pick a local date and time. Time-zone agnostic: the value is wall-clock time in the user's zone, like `datetime-local`.

- Import: `import { DateTimePicker } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/date-picker-datetime` (primitives)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the calendar popover against the trigger. |
| `aria-describedby` | `string` |  | Id(s) of the element(s) that describe the trigger (hint, error text). |
| `aria-invalid` | `boolean` |  | Overrides the invalid state announced to assistive technology; normally set `invalid` instead. |
| `aria-label` | `string` |  | Accessible name of the trigger when there is no visible label. |
| `aria-labelledby` | `string` |  | Id(s) of the element(s) that label the trigger. |
| `captionLayout` | `"label" \| "dropdown" \| "dropdown-months" \| "dropdown-years"` |  | Show month/year dropdowns in the calendar caption. |
| `className` | `string` |  | Classes for the trigger button. |
| `clearable` | `boolean` |  | Show an inline button that resets the value. |
| `contentClassName` | `string` |  | Classes for the calendar popover. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultTime` | `string` | `"00:00"` | Time used when a day is picked before any time is set. Default `"00:00"`. |
| `defaultValue` | `DateTimeInput` |  | Initial date and time when uncontrolled; a `Date` or a local `"YYYY-MM-DDTHH:mm"` string. |
| `disabled` | `boolean` |  | Disables the trigger so the calendar cannot be opened. |
| `disabledDates` | `Matcher \| Matcher[]` |  | Dates that can't be picked (react-day-picker matchers). |
| `doneLabel` | `string` | `"Done"` | Label of the button that closes the popover. Default "Done". |
| `endMonth` | `Date` |  | Latest month the calendar can navigate to. |
| `formatDateTime` | `(date: Date) => string` |  | Custom formatter for the trigger text; overrides `formatOptions`. |
| `formatOptions` | `Intl.DateTimeFormatOptions` |  | Options passed to `Intl.DateTimeFormat`. Defaults to `{ dateStyle: "medium", timeStyle: "short" }`. |
| `granularity` | `TimeGranularity` | `"minute"` | Add a seconds segment. Default `"minute"`. |
| `hourCycle` | `12 \| 24` |  | Force a 12- or 24-hour clock. Defaults to the locale's convention. |
| `id` | `string` |  | `id` of the trigger, so a `<label htmlFor>` or `Field` can point at it. |
| `invalid` | `boolean` |  | Marks the picker invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `locale` | `string` |  | BCP 47 locale passed to `Intl.DateTimeFormat`. |
| `max` | `DateTimeInput` |  | Latest selectable moment. |
| `min` | `DateTimeInput` |  | Earliest selectable moment. Days before it are disabled and times are clamped. |
| `name` | `string` |  | Name of the hidden input that submits the value with a surrounding form. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the popover opens or closes (selection, Escape, outside click). |
| `onValueChange` | `(value: Date \| undefined, meta: { localValue: string }) => void` |  | Called with the new local date-time; `meta.localValue` is the same moment as `"YYYY-MM-DDTHH:mm"` (`""` when cleared). |
| `open` | `boolean` |  | Controlled open state of the calendar popover. Use with `onOpenChange`. |
| `placeholder` | `string` | `"Pick a date and time"` | Trigger text while no date is selected (each picker has its own default, e.g. "Pick a date"). |
| `presets` | `DateTimePreset[]` | `[]` | Quick picks shown in a sidebar ("In 1 hour", "Tomorrow 9:00"). Choosing one sets the value and closes. |
| `required` | `boolean` |  | Marks the picker required. Inherited from a surrounding `Field` when omitted. |
| `size` | `Size` | `"md"` | Trigger height and text size; match the neighbouring inputs. |
| `startMonth` | `Date` |  | Earliest month the calendar can navigate to (days before it are not reachable). |
| `step` | `number` |  | Minutes moved by the minute segment's arrow keys. |
| `timeLabel` | `string` | `"Time"` | Label next to the time field. Default "Time". |
| `value` | `DateTimeInput` |  | A `Date`, or a local `"YYYY-MM-DDTHH:mm"` string (what `<input type="datetime-local">` uses). |
| `variant` | `"outline" \| "filled"` |  | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |

## Notes

**When to use:** An input-like button that opens a calendar plus a time field, to pick a local day and time together. The value is wall-clock time in the user's zone, like `datetime-local`, as a `Date` or a `"YYYY-MM-DDTHH:mm"` string.

**Use instead when:**
- `DatePicker`: a day only
- `TimePicker`: a time only
- `DateRangePicker`: a from and to range
- `Input`: a native `type="datetime-local"` field

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Trigger, clear button, then (open) the presets, the calendar, the hour, minute and day period segments and Done |
| Enter, Space | On the trigger: open; on a preset: choose it and close; on a day: pick it; on Done: close |
| Arrow keys, PageUp, PageDown, Home, End | In the calendar: move the focused day (see Calendar) |
| ArrowUp, ArrowDown, digits, Backspace | In a time segment: step, type or clear it (see TimePicker) |
| Escape | Close the popover; focus returns to the trigger |

The trigger is a plain button, so ArrowDown does not open it. In RTL the calendar's Left and Right arrows swap; the time segments stay in a left to right group with fixed Left and Right.

### Screen readers

- The trigger is a native `<button>` showing the formatted date and time, or the `placeholder`. The popover is a `role="dialog"` named by `aria-label`, then the placeholder, then "Choose date and time". `required`, `invalid`, `id` and `aria-describedby` work as on `DatePicker`.
- The time field is a group named by the visible "Time" text (`timeLabel`) with spinbutton segments for hour, minute and, with `granularity="second"`, seconds, plus an AM/PM segment on a 12-hour clock. The presets are plain buttons in a group named "Presets".
- A given name (`aria-label`, a `FieldLabel`) replaces the button text as the accessible name, so the chosen moment is not part of it. The clear button is named "Clear date".

### Reduced motion

The popover fades and zooms in with `animate-in`; the net removes the movement and ends transitions in 1 ms. The time field has no motion of its own.

### Server rendering

Server render: part of it fills in after mount. The trigger renders on the server and the popover is portalled, so it appears after mount. The trigger text is formatted with `Intl.DateTimeFormat` in the runtime's default locale and time zone unless you pass `locale`, `formatOptions` or `formatDateTime`, so server and browser can print different text and trigger a hydration warning. The portalled layer does not inherit a subtree `dir` or `data-style`; set them on `<html>`.

### Gotchas

- Changes apply at once: picking a day, or stepping the time, calls `onValueChange(date, { localValue })` and the popover stays open until Done, Escape or an outside click. Picking a preset sets the value and closes. Clicking the selected day does not unselect it.
- A day picked before any time is set uses the time typed so far, else `defaultTime` (`"00:00"`). A time typed before a day exists is held until a day is picked.
- `min` and `max` disable days outside them, clamp the result, and limit the time on the boundary day; strings without a zone are read as local time.
- With `name` a hidden input posts `YYYY-MM-DDTHH:mm` (with `:ss` for seconds, empty when none). `locale` formats the trigger and sets the time field's clock and segment order, but the calendar keeps DayPicker's default language.

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
