# Calendar

> Date calendar built on react-day-picker v9. Supports single, multiple and range modes. The ref goes to the root element.

- Import: `import { Calendar } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/calendar` (primitives)
- Also accepts the props of PropsBase, PropsMulti, PropsRange, PropsSingle

## Props

No props of its own.

## Notes

**When to use:** An inline month grid for picking one date, several dates or a range. A styled `react-day-picker` v9, so every DayPicker prop works (`mode`, `selected`, `onSelect`, `numberOfMonths`, `captionLayout`, `locale`, `weekStartsOn`).

**Use instead when:**
- `DatePicker`: one date from a field with a popover
- `DateRangePicker`: a range from a field with presets
- `DateTimePicker`: a day and a time
- `TimePicker`: only a time of day

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves into the grid on one day (the last focused, else the selected, else today) and out again; the other days are not tab stops |
| ArrowLeft, ArrowRight | Previous or next day |
| ArrowUp, ArrowDown | Same weekday in the previous or next week |
| Shift+ArrowLeft, Shift+ArrowRight | Previous or next month |
| Shift+ArrowUp, Shift+ArrowDown | Previous or next year |
| PageUp, PageDown | Previous or next month (Shift: year) |
| Home, End | First or last day of the week |
| Enter, Space | Select the focused day (native button) |

In RTL, ArrowLeft goes forward and ArrowRight goes back (DayPicker reads the `dir` that `Calendar` passes down), and the previous and next month chevrons mirror. Up, Down, PageUp and PageDown do not change.

### Screen readers

- The grid is `role="grid"` named by the month and year, with `aria-multiselectable` in `multiple` and `range` mode. Days are `gridcell`s with `aria-selected`; each day button is named by its full date, prefixed "Today, " and suffixed ", selected" when they apply.
- The month label is a polite `role="status"` region, so changing month is announced. The previous and next buttons are named "Go to the Previous Month" and "Go to the Next Month" (English; pass DayPicker `labels` to translate them, and `locale` for dates and weekdays).
- With `captionLayout="dropdown"` the month and year are native `<select>`s named "Choose the Month" and "Choose the Year", laid over a visual label.
- Without `mode` and `onDayClick` the days are plain cells, not buttons.

### Reduced motion

Day hover and selection fade with short transitions, which the reduced-motion net ends in 1 ms. Nothing else moves; DayPicker's month `animate` option is off unless you pass it.

### Server rendering

Server render: part of it fills in after mount. The grid renders on the server. "Today" comes from the clock at render time, so a server in another time zone, or one that rendered a day earlier, can mark a different day than the client and trigger a hydration warning; pass `today` to pin it. The reading direction is `ltr` in the server HTML and settles after hydration on an RTL document. Dropdown layouts default `startMonth` and `endMonth` from the current year, so they differ across a year change.

### Gotchas

- `captionLayout="dropdown"`, `"dropdown-months"` and `"dropdown-years"` get a default range of 100 years back and 10 years forward; pass `startMonth` and `endMonth` to change it (react-day-picker needs a range to offer year choices).
- `showOutsideDays` defaults to `true`, so the days of neighbouring months show muted; outside days are never the Tab target. Pass `showOutsideDays={false}` for blank cells.
- In `single` mode a second click on the selected day clears it unless you pass `required`; `selected` with `onSelect` is the controlled pair, and with no `onSelect` DayPicker keeps the selection itself.
- Two or more `numberOfMonths` sit side by side only while the column is wide enough; they wrap and stack in a narrow container. The ref goes to the root element, and a `dir` you pass overrides the detected direction.

## Example

```tsx
import * as React from "react";
import { Calendar } from "@cleanprompt/sutra-ui";

export function Example() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      disabled={{ before: new Date() }}
    />
  );
}
```
