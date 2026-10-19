---
component: AnimatedNumber
module: patterns/animated-number
use: A number whose digits roll to their new values when `value` changes, in tabular figures. Formatting uses `Intl.NumberFormat` (currency, percent, compact), and the first render shows the value without motion.
instead: StatValue = a number inside a StatCard (it has an `animate` option that uses this); Countdown = a time that counts down; Typewriter = text that types itself out; Text = a number that never changes
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
The formatted value is rendered once as visually hidden text, and the rolling digit columns are `aria-hidden` and `select-none`, so a screen reader reads the number once and copy and paste do not pick up the columns. It is not a live region: pass `aria-live="polite"` (props go on the root `span`) to have changes announced. It has no role or label of its own, so say what the number is in the surrounding text.

## Reduced motion
The digits roll through a CSS transition on `transform` and a new digit column fades in with `animate-fade-in`. Under `prefers-reduced-motion` the net ends the transition in 1 ms and stops the fade, so a change shows at once.

## Server rendering
The first render is the final value with no motion and no browser API, so the markup is stable. It is formatted with `Intl.NumberFormat`, though: without `locale` the server's runtime locale and the browser's can format the same number differently (`1,234` against `1.234`) and hydration will warn, so pass `locale` where the HTML is rendered on a server.

## Slots
- `animated-number`: the root `span` (also with `animate={false}`, where it holds plain text)
- `animated-number-digit`: one rolling digit column (`data-digit` is its value)
- `animated-number-text`: a separator, sign, currency symbol or unit

## Gotchas
- Numbers only: `value` is a `number`. A value that is not finite (`NaN`, `Infinity`) shows as one static piece of text. Format anything else yourself.
- Columns are keyed from the decimal point outward, so a digit stays in its column when one is added (99 to 100 keeps the nines and fades in the new hundreds place). Only added columns fade in, never the first render.
- `animate={false}` renders plain formatted text with no columns, which suits dense tables and lists; `duration` is in milliseconds and defaults to the fill speed token (`--sutra-duration-fill`, 500 ms).
- `locale` also picks the digit glyphs (Arabic-Indic, Devanagari and so on), and a bad `locale` or `format` falls back to the default format instead of throwing. An inline `format` object is fine: it is compared by its contents.

## Example
```tsx
import * as React from "react";
import { AnimatedNumber, Button } from "@sutra/ui";

export function Example() {
  const [revenue, setRevenue] = React.useState(12480);
  return (
    <div className="flex items-center gap-4">
      <p className="text-3xl font-semibold">
        <AnimatedNumber
          value={revenue}
          locale="en-US"
          format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
          aria-live="polite"
        />
      </p>
      <Button variant="secondary" onClick={() => setRevenue((r) => r + 750)}>
        Add a sale
      </Button>
    </div>
  );
}
```
