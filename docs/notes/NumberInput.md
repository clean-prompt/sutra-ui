---
component: NumberInput
module: primitives/number-input
use: A numeric field with step buttons, arrow-key stepping, press-and-hold repeat, min and max, and locale-aware formatting and parsing (currency, percent, units). The value is a `number` or `null`, never a string.
instead: Input = free text, or a native `type="number"` where the browser spinner is enough; Slider = a coarse value on a range; TimePicker = a time of day; InputOTP = a fixed length code
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to and from the field; the step buttons are not tab stops (`tabIndex` -1) |
| ArrowUp, ArrowDown | Add or subtract `step`, clamped to `min` and `max` |
| Shift+ArrowUp, Shift+ArrowDown, PageUp, PageDown | Add or subtract `largeStep` (default `step * 10`) |
| Home, End | Jump to `min` or `max`; with no bound set they move the caret as usual |
| Enter | Commit what was typed |

Pressing a step button with a pointer steps once, then repeats every 60 ms after 400 ms until release or a bound. Nothing here reads the Left and Right arrows, so RTL changes only the layout. Keys do nothing while the field is `disabled` or `readOnly`.

## Screen readers
- The field is a text input with `role="spinbutton"` and `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and `aria-valuetext` (the formatted value, such as "$1,234.50"). They follow the committed value, not text still being typed.
- The step buttons are named "Increase" and "Decrease" (`incrementLabel`, `decrementLabel`) and point at the field with `aria-controls`; use the arrow keys instead of tabbing to them. Icons are `aria-hidden`.
- Name the field with a `<label>`, `aria-label` or a surrounding `FieldLabel`. `invalid`, `required`, `disabled` and `aria-describedby` are inherited from a surrounding `Field` unless you pass them.

## Reduced motion
Static apart from colour transitions on the step buttons and the border, which the reduced-motion net ends in 1 ms.

## Server rendering
The field renders on the server, but the display text is formatted with `Intl.NumberFormat` in the runtime's default locale unless you pass `locale`, so a server and a browser with different locales can show "1,234.5" against "1.234,5" and trigger a hydration warning. Pass `locale` to make both sides agree.

## Slots
- `number-input`: the outer group; `data-layout` is `split` or `stacked`
- `number-input-field`: the text input

## Gotchas
- `onValueChange` fires when a typed entry is committed (blur or Enter), and on each step, Home or End; it does not fire per keystroke. The native `onChange` prop is removed from the type.
- `clampOnBlur` is on by default: a typed 42 with `max={10}` becomes 10 on blur. Turn it off to keep out-of-range text; stepping still clamps. Clearing the text commits `null`.
- `precision` fixes the number of decimals shown and rounds values to it; without it up to three decimals show (more if `step` has more), and stepping rounds to the step's own decimals, so `0.1` plus `0.2` gives `0.3`.
- Typed text is parsed with the locale's separators, native digits (Arabic-Indic, Persian) and currency or percent signs; a `percent` style stores a fraction (50 % is 0.5). `name` posts the raw number, not the formatted text.

## Example
```tsx
import * as React from "react";
import { Field, FieldLabel, NumberInput } from "@sutra/ui";

export function Example() {
  const [seats, setSeats] = React.useState<number | null>(5);
  return (
    <Field>
      <FieldLabel>Seats</FieldLabel>
      <NumberInput
        min={1}
        max={50}
        step={1}
        largeStep={5}
        value={seats}
        onValueChange={setSeats}
        wrapperClassName="w-40"
      />
    </Field>
  );
}
```
