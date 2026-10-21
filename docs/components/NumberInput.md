# NumberInput

> Numeric stepper with keyboard support, press-and-hold repeat and locale-aware formatting.

- Import: `import { NumberInput } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/number-input` (primitives)
- `data-slot`: `number-input`, `number-input-field`
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `clampOnBlur` | `boolean` | `true` | Clamp typed values to min/max on blur. |
| `decrementLabel` | `string` | `"Decrease"` | Accessible name of the decrement button. |
| `defaultValue` | `number \| null` | `null` | Initial number when uncontrolled; `null` starts empty. |
| `formatOptions` | `Intl.NumberFormatOptions` |  | Display formatting, e.g. `{ style: "currency", currency: "USD" }`. |
| `incrementLabel` | `string` | `"Increase"` | Accessible name of the increment button. |
| `invalid` | `boolean` |  | Marks the field invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `largeStep` | `number` |  | Step used by PageUp / PageDown and Shift+Arrow. Defaults to `step * 10`. |
| `layout` | `"split" \| "stacked"` | `"split"` | `split` renders − value +, `stacked` renders chevrons on the right. |
| `locale` | `string` |  | BCP 47 locale for number formatting and parsing (decimal and group separators). Defaults to the user's locale. |
| `max` | `number` |  | Largest allowed value; stepping and blur clamp to it. |
| `min` | `number` |  | Smallest allowed value; stepping and blur clamp to it. |
| `onValueChange` | `(value: number \| null) => void` |  | Called with the parsed number (or `null` when emptied) when a typed entry is committed (blur or Enter) and on each step, Home or End; not on every keystroke. |
| `precision` | `number` |  | Fixed number of decimals; values are rounded to it. |
| `size` | `Size` | `"md"` | Field height and text size. |
| `step` | `number` | `1` | Amount added or removed by the buttons and the arrow keys. |
| `value` | `number \| null` |  | Controlled number; `null` is an empty field. Use with `onValueChange`. |
| `variant` | `"outline" \| "filled"` |  | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |
| `wrapperClassName` | `string` |  | Class for the outer group. |

## Notes

**When to use:** A numeric field with step buttons, arrow-key stepping, press-and-hold repeat, min and max, and locale-aware formatting and parsing (currency, percent, units). The value is a `number` or `null`, never a string.

**Use instead when:**
- `Input`: free text, or a native `type="number"` where the browser spinner is enough
- `Slider`: a coarse value on a range
- `TimePicker`: a time of day
- `InputOTP`: a fixed length code

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to and from the field; the step buttons are not tab stops (`tabIndex` -1) |
| ArrowUp, ArrowDown | Add or subtract `step`, clamped to `min` and `max` |
| Shift+ArrowUp, Shift+ArrowDown, PageUp, PageDown | Add or subtract `largeStep` (default `step * 10`) |
| Home, End | Jump to `min` or `max`; with no bound set they move the caret as usual |
| Enter | Commit what was typed |

Pressing a step button with a pointer steps once, then repeats every 60 ms after 400 ms until release or a bound. Nothing here reads the Left and Right arrows, so RTL changes only the layout. Keys do nothing while the field is `disabled` or `readOnly`.

### Screen readers

- The field is a text input with `role="spinbutton"` and `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and `aria-valuetext` (the formatted value, such as "$1,234.50"). They follow the committed value, not text still being typed.
- The step buttons are named "Increase" and "Decrease" (`incrementLabel`, `decrementLabel`) and point at the field with `aria-controls`; use the arrow keys instead of tabbing to them. Icons are `aria-hidden`.
- Name the field with a `<label>`, `aria-label` or a surrounding `FieldLabel`. `invalid`, `required`, `disabled` and `aria-describedby` are inherited from a surrounding `Field` unless you pass them.

### Reduced motion

Static apart from colour transitions on the step buttons and the border, which the reduced-motion net ends in 1 ms.

### Server rendering

Server render: part of it fills in after mount. The field renders on the server, but the display text is formatted with `Intl.NumberFormat` in the runtime's default locale unless you pass `locale`, so a server and a browser with different locales can show "1,234.5" against "1.234,5" and trigger a hydration warning. Pass `locale` to make both sides agree.

### Slots

- `number-input`: the outer group; `data-layout` is `split` or `stacked`
- `number-input-field`: the text input

### Gotchas

- `onValueChange` fires when a typed entry is committed (blur or Enter), and on each step, Home or End; it does not fire per keystroke. The native `onChange` prop is removed from the type.
- `clampOnBlur` is on by default: a typed 42 with `max={10}` becomes 10 on blur. Turn it off to keep out-of-range text; stepping still clamps. Clearing the text commits `null`.
- `precision` fixes the number of decimals shown and rounds values to it; without it up to three decimals show (more if `step` has more), and stepping rounds to the step's own decimals, so `0.1` plus `0.2` gives `0.3`.
- Typed text is parsed with the locale's separators, native digits (Arabic-Indic, Persian) and currency or percent signs; a `percent` style stores a fraction (50 % is 0.5). `name` posts the raw number, not the formatted text.

## Example

```tsx
import * as React from "react";
import { Field, FieldLabel, NumberInput } from "@cleanprompt/sutra-ui";

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
