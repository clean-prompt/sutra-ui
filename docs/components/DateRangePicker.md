# DateRangePicker

> Date range picker with two months, a presets sidebar and an Apply/Cancel footer.

- Import: `import { DateRangePicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/date-picker-range` (primitives)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the calendar popover against the trigger. |
| `applyLabel` | `string` | `"Apply"` | Text of the apply button. |
| `aria-describedby` | `string` |  | Id(s) of the element(s) that describe the trigger (hint, error text). |
| `aria-invalid` | `boolean` |  | Overrides the invalid state announced to assistive technology; normally set `invalid` instead. |
| `aria-label` | `string` |  | Accessible name of the trigger when there is no visible label. |
| `aria-labelledby` | `string` |  | Id(s) of the element(s) that label the trigger. |
| `cancelLabel` | `string` | `"Cancel"` | Text of the cancel button. |
| `className` | `string` |  | Classes for the wrapper around the trigger button (the button itself takes no class). |
| `clearable` | `boolean` |  | Show an inline button that resets the value. |
| `contentClassName` | `string` |  | Classes for the calendar popover. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultValue` | `DateRange` |  | Initial range when uncontrolled. |
| `disabled` | `boolean` |  | Disables the trigger so the calendar cannot be opened. |
| `disabledDates` | `Matcher \| Matcher[]` |  | Dates that can't be picked (react-day-picker matchers). |
| `endMonth` | `Date` |  | Latest month the calendar can navigate to. |
| `formatOptions` | `Intl.DateTimeFormatOptions` |  | Options passed to `Intl.DateTimeFormat`. Defaults to `{ dateStyle: "medium" }`. |
| `formatRange` | `(range: DateRange) => string` |  | Custom formatter for the trigger text. |
| `id` | `string` |  | `id` of the trigger, so a `<label htmlFor>` or `Field` can point at it. |
| `invalid` | `boolean` |  | Marks the picker invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `locale` | `string` |  | BCP 47 locale for the trigger text (`Intl.DateTimeFormat`) and the calendar's month and weekday names, digits and first weekday. |
| `name` | `string` |  | Name of the hidden input that submits the value with a surrounding form. |
| `numberOfMonths` | `number` | `2` | Number of months shown side by side. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the popover opens or closes (selection, Escape, outside click). |
| `onValueChange` | `(value: DateRange \| undefined) => void` |  | Called with the new range (or `undefined` when cleared); with `presets` or apply/cancel it fires on apply. |
| `open` | `boolean` |  | Controlled open state of the calendar popover. Use with `onOpenChange`. |
| `placeholder` | `string` | `"Pick a date range"` | Trigger text while no date is selected (each picker has its own default, e.g. "Pick a date"). |
| `presets` | `DateRangePreset[]` | `defaultDateRangePresets` | Sidebar presets. Pass `[]` to hide the sidebar. |
| `required` | `boolean` |  | Marks the picker required. Inherited from a surrounding `Field` when omitted. |
| `size` | `Size` | `"md"` | Trigger height and text size; match the neighbouring inputs. |
| `startMonth` | `Date` |  | Earliest month the calendar can navigate to (days before it are not reachable). |
| `value` | `DateRange` |  | Controlled range as `{ from, to }`; either may be undefined while picking. Use with `onValueChange`. |
| `variant` | `"outline" \| "filled"` |  | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |

## Notes

**When to use:** An input-like button that opens a two month range calendar with a presets sidebar and an Apply and Cancel footer. The value changes only when the user applies.

**Use instead when:**
- `DatePicker`: a single date
- `DateTimePicker`: a day and a time
- `Calendar`: an always visible grid (`mode="range"`)
- `Select`: a few fixed periods with no calendar

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Through the trigger, the clear button, then (open) the presets, the calendar, Cancel and Apply |
| Enter, Space | On the trigger: open; on a preset or a day: choose it; on Cancel or Apply: run it |
| Arrow keys, PageUp, PageDown, Home, End | In the calendar: move the focused day (see Calendar) |
| Escape | Close and discard the draft; focus returns to the trigger |

The trigger is a plain button, so ArrowDown does not open it. In RTL the Left and Right arrows swap inside the calendar and the month chevrons mirror. The preset column is vertical, so it has no arrow keys.

### Screen readers

- The trigger is a native `<button>` showing the applied range or the `placeholder`. The popover is a `role="dialog"` named by `aria-label`, then the placeholder, then "Choose date range". `required`, `invalid`, `id` and `aria-describedby` work as on `DatePicker`, including the values a surrounding `Field` supplies.
- The presets are buttons in a group named "Presets"; the one that matches the draft range has `aria-pressed="true"`.
- The footer text (the draft range, or "Select a start date") is a polite live region, so each click on a day is announced there.
- A given name (`aria-label`, a `FieldLabel`) replaces the button text as the accessible name, so the applied range is not part of it. The clear button is named "Clear date".

### Reduced motion

The popover fades and zooms in with `animate-in`; the net removes the movement. Preset and day hovers are short transitions that end in 1 ms.

### Server rendering

Server render: part of it fills in after mount. The trigger renders on the server and the popover is portalled, so it appears after mount. A trigger with a range is formatted with `Intl.DateTimeFormat` in the runtime's default locale and time zone unless you pass `locale` or `formatRange`, so server and browser text can differ.

### Gotchas

- Nothing is committed until Apply: clicking days, presets or closing with Escape or an outside click leaves `value` alone, and the next open starts from the committed value. `clearable` clears at once, with no Apply.
- Apply is disabled until a start day is picked, and a range with only a start is applied as a one day range (`to` equals `from`).
- `presets` replaces the defaults (`defaultDateRangePresets`: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month); `presets={[]}` hides the sidebar. Each `getRange` runs when a preset is chosen and when the popover renders, so relative ranges stay current. `numberOfMonths` defaults to 2.
- `locale` formats the trigger and footer text and sets the calendar's month and weekday names, digits and first weekday; its aria labels stay English. With `name`, two hidden inputs post `name[from]` and `name[to]` as `YYYY-MM-DD`.

## Example

```tsx
import * as React from "react";
import { DateRangePicker, Field, FieldLabel } from "@cleanprompt/sutra-ui";

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
