# CalendarHeatmap

> GitHub-style contribution calendar: week columns, month/weekday labels, totals, month mode.

- Import: `import { CalendarHeatmap } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/patterns/heatmap` (patterns)
- `data-slot`: `calendar-heatmap`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` (required) | `CalendarHeatmapDatum[]` |  | One entry per day with a `date` and a `value`; missing days count as empty. |
| `cellSize` | `number` |  | Cell size in px. Default 11 (year) / 32 (month). |
| `colorStops` | `HeatmapColorStop[]` |  | Custom step stops (overrides `scale`). |
| `defaultMonth` | `Date` |  | Initially shown month when uncontrolled (month mode). |
| `endDate` | `Date \| string` |  | Year mode: last day shown. Default today. |
| `formatTooltip` | `(value: number, date: Date) => string` |  | Tooltip / accessible text. Default "12 on Oct 3". |
| `formatValue` | `(value: number) => string` | `(v) => v.toLocaleString(locale)` | Formats values in the tooltip and the total. Default is the localized number. |
| `gap` | `number` | `3` | Gap between cells in px. |
| `label` | `string` |  | Accessible name of the calendar. |
| `legend` | `boolean` | `true` | Shows the "less to more" legend. |
| `locale` | `string` |  | BCP 47 locale for month and weekday names and the numbers. |
| `max` | `number` |  | Value that maps to the strongest step; defaults to the largest value in the data. |
| `min` | `number` | `0` | Value that maps to the emptiest step; defaults to the smallest value in the data (0 when all are positive). |
| `mode` | `"year" \| "month"` | `"year"` | year: last 53 weeks · month: a single month with navigation. |
| `month` | `Date` |  | Month mode: controlled month (any date in it). |
| `onCellClick` | `(date: Date, value: number) => void` |  | Called with the day and its value when a cell is clicked, or activated with Enter or Space. Cells stay `gridcell`s with roving focus (they do not become buttons) and get a pointer cursor. |
| `onMonthChange` | `(month: Date) => void` |  | Called with the new month when the user navigates (month mode). |
| `scale` | `HeatmapScale` | `"primary"` | Colour ramp: a semantic token (`primary`, `success`, `warning`, `destructive`, `info`) or `thresholds` to colour by `thresholds`. |
| `showDayNumbers` | `boolean` |  | Show day numbers inside cells (month mode default). |
| `showMonthLabels` | `boolean` | `true` | Shows the month labels above the columns (year mode). |
| `showTotal` | `boolean` | `true` | Shows the total line under the grid. |
| `showWeekdayLabels` | `boolean` | `true` | Shows the weekday labels beside the rows. |
| `steps` | `number` | `4` | Number of discrete intensity steps above "empty". Default 4. |
| `unit` | `string` |  | Unit noun used in totals, e.g. "contributions". |
| `weekStartsOn` | `0 \| 1` | `0` | First day of the week: 0 Sunday, 1 Monday. |

## Notes

**When to use:** A GitHub-style activity calendar: one cell per day, in week columns over the last year (`mode="year"`) or in a single month with previous and next buttons (`mode="month"`), with a total and a "Less to More" legend.

**Use instead when:**
- `HeatmapGrid`: a plain grid of values that are not days
- `DatePicker`: choose a date rather than read activity
- `BarChart`: daily values read off an axis
- `StatCard`: one total with a trend

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | One day cell holds the tab stop; the month buttons are separate stops |
| ArrowLeft, ArrowRight | The same weekday in the previous or next week |
| ArrowUp, ArrowDown | The previous or next day in the week column |
| Home, End | The same weekday in the first or last week shown |
| Ctrl+Home, Ctrl+End (Cmd on Mac) | The first or last day shown |
| Enter, Space | On a day: calls `onCellClick(date, value)` when it is set. On "Previous month" or "Next month" (month mode): changes the month |
| Escape | Hides the tooltip |

The whole calendar is a forced `dir="ltr"` island: time runs left to right and the arrows never swap in RTL; the month buttons keep previous on the left.

### Screen readers

- A `grid` named by `label` (default "Activity in the last year" or "Activity in October 2026") with seven `row`s, one per weekday. Each row header holds the long weekday name as hidden text; the visible short names are `aria-hidden` (every other row in year mode).
- A day is named "15 sessions on Oct 3 (Saturday, October 3, 2026)"; days with no data read as 0. `formatTooltip` changes the first part. Month labels, day numbers and the tooltip are `aria-hidden`.
- In month mode the title ("October 2026") is `aria-live="polite"`, so navigating announces the new month. The total line ("19 sessions in the last year") and the legend are plain text.

### Reduced motion

Cell colour fades over 300 ms with a transition that the global net ends within 1 ms. Nothing else moves.

### Server rendering

Server render: part of it fills in after mount. Without `endDate` (year) or `defaultMonth` (month) the range starts from `new Date()`, and day keys, month names and numbers use the local time zone and the runtime locale, so the server HTML can differ from the browser's. Pass `endDate` or `defaultMonth` and a `locale` to make both sides agree.

### Gotchas

- Year mode shows exactly the 53 week columns that end on `endDate` (default today) and is fixed width (cell size plus gap, 14 px per week by default), so in a narrow box it scrolls sideways from the oldest week; it does not scroll to the newest.
- Several entries on the same day are summed, and entries outside the range are ignored (and left out of the total). `max` defaults to the largest day (at least 1), so one huge day washes out the rest: set `max`.
- `date` strings are local calendar days (`YYYY-MM-DD`); a datetime string or a `Date` is bucketed by its local date.
- `month` (any date in the month) makes month mode controlled and needs `onMonthChange`; use `defaultMonth` for uncontrolled. `weekStartsOn` is 0 (Sunday, default) or 1 (Monday).

## Example

```tsx
import { CalendarHeatmap } from "@cleanprompt/sutra-ui";

const sessions = [
  { date: "2026-10-12", value: 3 },
  { date: "2026-10-13", value: 8 },
  { date: "2026-10-15", value: 1 },
  { date: "2026-10-19", value: 5 },
];

export function Example() {
  return (
    <CalendarHeatmap
      data={sessions}
      endDate="2026-10-20"
      locale="en-US"
      weekStartsOn={1}
      unit="sessions"
      label="Sessions in the last year"
    />
  );
}
```
