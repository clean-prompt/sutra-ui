# WheelPicker

> An iOS-style wheel for one list of values (time, duration, amount, day): the rows scroll with the mouse wheel or a finger and snap one at a time (CSS scroll-snap with `scroll-snap-stop: always`, so a fling cannot skip rows), the row in the centre is the value once the scroll stops. It is a `role="listbox"` with the selected row as `aria-activedescendant`: Arrow keys move one row, Page keys five, Home and End jump to the ends, typing selects by prefix, clicking a row selects it. Disabled rows are skipped. Controlled (`value`) or uncontrolled (`defaultValue`); under reduced motion the keys jump instead of gliding. The accessible name comes from `aria-label` or `aria-labelledby`.

- Import: `import { WheelPicker } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/wheel-picker` (primitives)
- `data-slot`: `wheel-picker`, `wheel-picker-band`, `wheel-picker-list`
- Parts: [`WheelPickerGroup`](WheelPickerGroup.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` (required) | `readonly (string \| WheelPickerOption)[]` |  | Items on the wheel, as strings or `{ value, label }` objects, in order. |
| `band` | `boolean` | `true` | Draw the highlight band behind the centre row (a `WheelPickerGroup` draws one band across its columns). Default true. |
| `defaultValue` | `string \| null` |  | Initially selected value when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables scrolling and keyboard changes. |
| `emptyState` | `React.ReactNode` | `"No options"` | Shown when there are no options. Default "No options". |
| `itemHeight` | `number` | `36` | Row height in px. Default 36. |
| `listClassName` | `string` |  | Class names for the scrolling listbox. |
| `loading` | `boolean` | `false` | Options are on their way: placeholder rows and `aria-busy`, no listbox. |
| `onValueChange` | `(value: string) => void` |  | Called with the value that is centred when scrolling settles or a key is pressed. |
| `value` | `string \| null` |  | Controlled selected value. Use with `onValueChange`. |
| `visibleCount` | `number` | `5` | Rows in view (odd; an even number is raised by one). Default 5. |

## Part props

### WheelPickerGroup

Several wheels read as one value (hours : minutes : period, or hours and minutes of a duration) with one highlight band across them. `value` is an array with one entry per column. Each column is a `WheelPicker`, so the keys, type-ahead and reduced-motion behaviour are the same; the group is a labelled `role="group"`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` (required) | `readonly WheelPickerColumn[]` |  | Wheels to show side by side; each has an `id`, an accessible `label`, `options` and an optional separator. |
| `defaultValue` | `readonly string[]` |  | Initially selected values, one per column, when uncontrolled. |
| `disabled` | `boolean` |  | Disables every wheel. |
| `itemHeight` | `number` | `36` | Height of one row in px. |
| `loading` | `boolean` |  | Dims the wheels and blocks changes while options load. |
| `onValueChange` | `(value: string[], meta: { columnId: string; index: number }) => void` |  | Called with all column values plus the column that changed. |
| `value` | `readonly string[]` |  | One value per column, in order. |
| `visibleCount` | `number` | `5` | Rows visible per wheel (odd numbers centre the selection). |

## Notes

**When to use:** An iOS-style wheel for one list of values (hour, minute, duration, amount) that you scroll or flick, with one row snapping into the centre band. `WheelPickerGroup` puts several wheels side by side under one band, with one value per column.

**Use instead when:**
- `Select`: a desktop dropdown from a list
- `TimePicker`: a typed time field
- `NumberInput`: an exact number
- `SegmentedControl`: a few visible options
- `DateTimePicker`: a calendar date and time

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | The wheel is one tab stop (a group has one per column) |
| ArrowDown, ArrowUp | Move the selection one row, skipping disabled rows, without wrapping |
| PageDown, PageUp | Move five rows |
| Home, End | First or last enabled row |
| A letter or digit | Type-ahead: select the next row whose text starts with what you typed (a 600 ms pause starts a new query; a repeated letter cycles) |

Space and Enter do nothing; moving the selection is the choice. Alt, Ctrl and Meta chords are left alone. With the mouse or a finger, scrolling snaps one row at a time and clicking a row selects it. The wheel is vertical, so RTL swaps no keys.

### Screen readers

- One wheel is a `role="listbox"` that keeps focus; the selected row is `aria-activedescendant` and `aria-selected` on its `role="option"`, and disabled rows are `aria-disabled`. Name it with `aria-label` or `aria-labelledby`: a bare `WheelPicker` has no name.
- `WheelPickerGroup` is a `role="group"` (pass it an `aria-label`) of listboxes named by each column `label`, such as "Hours". Separators and the highlight band are `aria-hidden`.
- With `loading` there is no listbox, only placeholder rows, `aria-busy` and the text "Loading…" for screen readers; with no options the `emptyState` text shows instead.
- The value is reported when scrolling settles, not for every row that passes the centre.

### Reduced motion

Under `prefers-reduced-motion` a key press jumps to the row; otherwise it glides with a smooth scroll. A parent changing `value` also glides only when motion is allowed, and the row colours fade in a short transition that the net ends in 1 ms.

### Server rendering

Server render: part of it fills in after mount. The listbox and all rows render on the server, but the scroll position is set after mount, so the server HTML is scrolled to the first row and the centre row's bold, foreground style is applied by script after hydration. The box height is set inline from `visibleCount` and `itemHeight`, so only the scroll position changes on hydration.

### Slots

- `wheel-picker`: the root; `wheel-picker-list`: the scrolling listbox
- `wheel-picker-band`: the highlight behind the centre row
- `wheel-picker-group`: the group root

### Gotchas

- `options` take strings or `{ value, label, disabled, textValue }`; `textValue` is what type-ahead matches when `label` is not a string. Values must be unique strings.
- `visibleCount` (default 5) is raised to the next odd number so there is a centre row, and `itemHeight` (default 36) is in pixels.
- `onValueChange` receives a string once the scroll stops. A scroll that stops on a disabled row moves to the nearest enabled one. In a group it receives all values plus `{ columnId, index }`.
- `wheelRange` (exported from the same module) builds padded numeric options such as `00` to `59`.

## Example

```tsx
import * as React from "react";
import { WheelPicker, wheelRange } from "@sutra/ui";

const minutes = wheelRange(5, 60, { step: 5 });

export function Example() {
  const [duration, setDuration] = React.useState("15");
  return (
    <div className="flex items-center gap-3">
      <WheelPicker
        aria-label="Timer minutes"
        className="w-20"
        options={minutes}
        value={duration}
        onValueChange={setDuration}
      />
      <span className="text-sm text-muted-foreground">minutes</span>
    </div>
  );
}
```
