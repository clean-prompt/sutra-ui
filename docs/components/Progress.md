# Progress

> Linear progress bar, determinate or indeterminate (role="progressbar"): how far a task has got. For a level read against thresholds (disk usage, context window) use `Meter` instead. Restyle the track with `className` (e.g. `rounded-none bg-transparent` for an edge strip) and the fill with `indicatorClassName`.

- Import: `import { Progress } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/progress` (primitives)
- Parts: [`ProgressCircle`](ProgressCircle.md), [`ProgressRingSvg`](ProgressRingSvg.md), [`ProgressSegments`](ProgressSegments.md)
- Also accepts the props of HTMLAttributes, ProgressProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `ProgressColor \| ToneInput` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `formatValue` | `(value: number, max: number) => React.ReactNode` |  | Formats the displayed value; receives the value and `max`. Default is the rounded percentage, e.g. "40%". A text or number result is also used as `aria-valuetext`. |
| `indeterminate` | `boolean` |  | Forces the looping animation regardless of `value` (also used when `value` is null). |
| `indicatorClassName` | `string` |  | Classes for the filled indicator bar (`className` styles the track). |
| `label` | `React.ReactNode` |  | Text shown above the bar; it also becomes the accessible name. |
| `showValue` | `boolean \| "right" \| "top"` |  | Show the percentage on the right of the bar or above it, next to the label. |
| `size` | `"2xs" \| "xs" \| "sm" \| "md" \| "lg"` | `"md"` | Track height: 2xs 2px (hairline loading strips), xs 4px, sm 6px, md 8px, lg 12px. Default "md". |
| `tone` | `ToneInput` |  | Semantic colour of the filled part. Default "primary". |
| `value` | `number \| null` |  | Completed amount from 0 to `max`; `null` or `undefined` renders the indeterminate animation. |

## Part props

### ProgressCircle

Circular progress ring with centered value (role="progressbar"): task completion, like `Progress`. `RingMeter` draws the same ring as a threshold-coloured level (role="meter"), e.g. a context window.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | Custom center content (overrides the value). |
| `color` | `ProgressColor \| ToneInput` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `gradient` | `boolean` |  | Brand gradient stroke instead of a flat color. |
| `label` | `string` |  | Accessible name of the progressbar (`aria-label`). |
| `max` | `number` | `100` | Value that counts as 100%. |
| `showValue` | `boolean` | `true` | Show the percentage in the center. Default true. |
| `size` | `number` | `64` | Diameter in px. |
| `strokeWidth` | `number` | `6` | Ring thickness in px. |
| `tone` | `ToneInput` |  | Semantic colour of the filled part. Default "primary". |
| `value` | `number` | `0` | Completed amount from 0 to `max`; the centre shows it as a percentage unless `children` replaces it. |

### ProgressRingSvg

The SVG ring drawn by `ProgressCircle`, `RingMeter` and `ChatAttachment`: a track circle plus a fill arc that starts at 12 o'clock. Decorative (`aria-hidden`); the wrapper carries the role and values.

| Prop | Type | Default | Description |
|---|---|---|---|
| `percent` (required) | `number` |  | Filled share, 0–100. |
| `size` (required) | `number` |  | Diameter in px. |
| `strokeWidth` (required) | `number` |  | Ring thickness in px. |
| `defs` | `React.ReactNode` |  | Extra SVG definitions (gradients). |
| `fillClassName` | `string` |  | Classes for the fill arc, e.g. a `stroke-*` tone class. |
| `fillSlot` | `string` |  | `data-slot` on the fill arc. |
| `fillStroke` | `string` |  | Explicit fill stroke (CSS colour or `url(#id)`); wins over `fillClassName` colours. |
| `trackClassName` | `string` | `"stroke-muted"` | Classes for the track circle. Default `stroke-muted`. |
| `trackOpacity` | `number` |  | Opacity of the track ring, 0 to 1. |
| `trackStroke` | `string` |  | Explicit track stroke (e.g. `currentColor`). |

### ProgressSegments

Segmented bar for multi-step progress, or (with `role="meter"`) a level such as password strength.

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `number` |  | Filled amount, relative to `max` (defaults to `segments`). |
| `color` | `ProgressColor \| ToneInput` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `indicatorClassName` | `string` |  | Classes for the filled segments; replaces the tone colour (e.g. `bg-success/70`). |
| `label` | `string` |  | Accessible name of the progressbar (`aria-label`). |
| `max` | `number` |  | Total number of units the bar represents; defaults to the segment count. |
| `role` | `"progressbar" \| "meter"` | `"progressbar"` | `progressbar` (default) for steps done; `meter` for a level such as password strength. Pair with `aria-valuetext`. |
| `segments` | `number` | `4` | Number of segments. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Segment height: sm, md or lg. |
| `tone` | `ToneInput` |  | Semantic colour of the filled part. Default "primary". |

## Notes

**When to use:** How far a task has got: a linear bar (determinate or indeterminate) with optional label and value, plus a ring (`ProgressCircle`) and a stepped bar (`ProgressSegments`).

**Use instead when:**
- `Meter`: a level read against thresholds (disk, memory, quota)
- `Spinner`: work of unknown length with no bar
- `Skeleton`: a placeholder for content that is loading
- `Steps`: named stages with their own state
- `RingMeter`: a round level gauge

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

- `Progress` is Radix's `role="progressbar"` with `aria-valuemin` 0, `aria-valuemax` and `aria-valuenow`, plus `aria-valuetext` of the rounded percentage ("40%"). `label` names it through `aria-labelledby`; without a visible `label`, pass `aria-label` (it reaches the bar itself).
- With no `value` (or `indeterminate`) there is no `aria-valuenow` and `data-state="indeterminate"`; announce what is happening in the name or nearby text, since no number is exposed.
- `ProgressCircle` and `ProgressSegments` are `role="progressbar"` divs with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (clamped) and `aria-label` from `label`. They have no `aria-valuetext`, so a ring reads its raw value against `max`. `ProgressSegments role="meter"` makes it a level (password strength); add `aria-valuetext` then.
- `ProgressRingSvg` is `aria-hidden`; the wrapper that uses it carries the role.

### Reduced motion

The determinate fill slides with a 500 ms transform, the ring arc with a stroke transition, and the segments fade with staggered delays; the first two have `motion-reduce:transition-none` and the net ends transitions in 1 ms. The indeterminate bar does not stop: the net slows its loop to 3 s because it carries meaning.

### Server rendering

Server render: part of it fills in after mount. Renders on the server, but direction is read from the page after mount: the server paints left-to-right (the fill is hidden by a negative `translateX`), so on an RTL page the fill flips to the right side after hydration. `ProgressCircle` and `ProgressSegments` have no direction logic and match exactly.

### Gotchas

- `value` is clamped to 0 to `max`; an out-of-range value never reaches Radix's console error. `max <= 0` reads as an empty bar. `showValue` is `true` (above next to the label, else on the right), `"top"` or `"right"`.
- `formatValue` also sets `aria-valuetext` when it returns text or a number ("3 / 8 GB"), so the bar reads what it shows; a JSX result cannot be spoken, so the default percentage stays. Radix's `getValueLabel` or an explicit `aria-valuetext` overrides it.
- When there is a `label` or a shown value, the bar sits in a wrapper: `className` then styles the wrapper, not the track (use `indicatorClassName` for the fill).
- `ProgressCircle` has no indeterminate state; use `Spinner` for that. Its centre text is `children`, or the percentage unless `showValue={false}`.

## Example

```tsx
import { Progress } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <Progress label="Uploading photos" value={64} showValue />
      <Progress
        label="Storage"
        value={9.2}
        max={10}
        tone="warning"
        showValue="right"
        formatValue={(value, max) => `${value} / ${max} GB`}
      />
      <Progress aria-label="Syncing" value={null} size="xs" />
    </div>
  );
}
```
