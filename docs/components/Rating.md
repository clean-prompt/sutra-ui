# Rating

> Star rating input with hover preview, half steps and radiogroup keyboard support.

- Import: `import { Rating } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/rating` (primitives)
- Parts: [`RatingSummary`](RatingSummary.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activeClassName` | `string` | `"text-warning"` | Class applied to the filled part of each icon (defaults to an amber fill). |
| `allowClear` | `boolean` | `true` | Let the user take the rating back to 0: click the selected star again, press Delete, Backspace or 0, or arrow below the first step. `false` keeps a given rating at one star or more. Default true. |
| `allowHalf` | `boolean` | `false` | Allow half-star values (0.5 steps). |
| `defaultValue` | `number` | `0` | Initial rating when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables the control: dimmed and not focusable. |
| `getLabel` | `(value: number, max: number) => string` | `defaultGetLabel` | Builds the accessible label for each option. |
| `icon` | `React.ComponentType<{ className?: string }>` | `RiStarFill` | Icon component used for every star; receives `className`. |
| `inactiveClassName` | `string` | `"text-border-strong"` | Class applied to the empty part of each icon. |
| `max` | `number` | `5` | Number of stars. |
| `name` | `string` |  | Name for a hidden input, for native form submission. |
| `onValueChange` | `(value: number) => void` |  | Called with the new rating when the user picks, clears or steps it. |
| `readOnly` | `boolean` | `false` | Displays the rating without letting the user change it (still announced as a rating). |
| `size` | `Size` | `"md"` | Star size. |
| `value` | `number` |  | Controlled rating, from 0 to `max` (halves when `allowHalf`). Use with `onValueChange`. |

## Part props

### RatingSummary

Review summary: average score, stars, count and a 5→1 distribution chart.

| Prop | Type | Default | Description |
|---|---|---|---|
| `average` (required) | `number` |  | Average score, e.g. 4.3. |
| `count` | `number` |  | Total number of ratings. Defaults to the sum of `distribution`. |
| `countLabel` | `(count: number) => React.ReactNode` | `(n) => pluralize(n, "rating")` | Text after the count. |
| `distribution` | `Partial<Record<number, number>>` |  | Ratings per star, keyed by star value: `{ 5: 120, 4: 40, … }`. |
| `locale` | `string` |  | BCP 47 locale used to format the average and the counts. |
| `max` | `number` | `5` | Number of stars the average is out of. |

## Notes

**When to use:** A star rating input from 0 to `max` with hover preview, optional half steps and radiogroup keyboard support. With `readOnly` or `disabled` it is a static display of a score; `RatingSummary` adds the average, the count and a 5 to 1 distribution.

**Use instead when:**
- `Slider`: a value on a continuous range
- `SegmentedControl`: a few labelled choices
- `RadioGroup`: named options that need labels
- `Meter`: a level measured against thresholds

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | One tab stop: the checked star (the first star when there is no rating) |
| ArrowRight, ArrowUp | Add one star (half a star with `allowHalf`) |
| ArrowLeft, ArrowDown | Remove one star; below the first step it goes to 0, or stops at one step with `allowClear={false}` |
| Home, End | One step, or `max` |
| 0 to 9 | Set that rating, up to `max` (0 only with `allowClear`) |
| Delete, Backspace | Clear to 0 (only with `allowClear`) |

Every key sets the value at once and moves focus to the matching star. Space and Enter do nothing. In RTL the stars run right to left, so ArrowLeft adds and ArrowRight removes (the key towards the inline end always adds); Up and Down do not change. A `readOnly` or `disabled` rating is not focusable.

### Screen readers

- Interactive: a `role="radiogroup"` of `role="radio"` stars with `aria-checked`, each named "N stars out of M" (`getLabel` changes the wording; with `allowHalf` the checked star carries the half value, such as "2.5 stars out of 5"). The group has no name of its own: pass `aria-label` or `aria-labelledby`.
- `readOnly` and `disabled`: a single `role="img"` named "Rated N out of M" (a given `aria-label` replaces it), with `aria-disabled` when disabled. The star icons are `aria-hidden`.
- `RatingSummary` shows the average as text, a read-only `Rating` rounded to the nearest half, and a list named "Rating distribution" whose rows are `role="meter"` named "5 star" to "1 star" with the percentage as the value.

### Reduced motion

The star under the pointer scales up (`hover:scale-110`), presses down, and the fill width eases over 150 ms; the distribution bars ease over 500 ms. All are transitions, which the reduced-motion net ends in 1 ms.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API at render time: the fill comes from `value` or `defaultValue`, the hover preview exists only after a pointer move, and the direction is read from the DOM when a key or click happens. Server and client output match.

### Gotchas

- `allowClear` is on by default: clicking the selected star again sets 0, and so do Delete, Backspace and `0`. With `allowClear={false}` a rating of one or more cannot go back to 0; an unrated control can still be rated.
- With `allowHalf`, a click on the half of a star nearer the inline start sets the half value, and that half flips in RTL.
- `onValueChange` receives a number (0 for cleared). `name` posts the number through a hidden input; `value` and `defaultValue` are numbers up to `max`.
- `icon` swaps the star glyph, and `activeClassName` and `inactiveClassName` replace the amber fill and grey outline colours instead of adding to them.

## Example

```tsx
import * as React from "react";
import { Rating } from "@cleanprompt/sutra-ui";

export function Example() {
  const [stars, setStars] = React.useState(4);
  return (
    <div className="flex items-center gap-3">
      <Rating aria-label="Your rating" value={stars} onValueChange={setStars} allowHalf />
      <span className="text-sm text-muted-foreground">{stars} of 5</span>
    </div>
  );
}
```
