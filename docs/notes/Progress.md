---
component: Progress
module: primitives/progress
covers: ProgressCircle, ProgressSegments, ProgressRingSvg
use: How far a task has got: a linear bar (determinate or indeterminate) with optional label and value, plus a ring (`ProgressCircle`) and a stepped bar (`ProgressSegments`).
instead: Meter = a level read against thresholds (disk, memory, quota); Spinner = work of unknown length with no bar; Skeleton = a placeholder for content that is loading; Steps = named stages with their own state; RingMeter = a round level gauge
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
- `Progress` is Radix's `role="progressbar"` with `aria-valuemin` 0, `aria-valuemax` and `aria-valuenow`, plus `aria-valuetext` of the rounded percentage ("40%"). `label` names it through `aria-labelledby`; without a visible `label`, pass `aria-label` (it reaches the bar itself).
- With no `value` (or `indeterminate`) there is no `aria-valuenow` and `data-state="indeterminate"`; announce what is happening in the name or nearby text, since no number is exposed.
- `ProgressCircle` and `ProgressSegments` are `role="progressbar"` divs with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (clamped) and `aria-label` from `label`. They have no `aria-valuetext`, so a ring reads its raw value against `max`. `ProgressSegments role="meter"` makes it a level (password strength); add `aria-valuetext` then.
- `ProgressRingSvg` is `aria-hidden`; the wrapper that uses it carries the role.

## Reduced motion
The determinate fill slides with a 500 ms transform, the ring arc with a stroke transition, and the segments fade with staggered delays; the first two have `motion-reduce:transition-none` and the net ends transitions in 1 ms. The indeterminate bar does not stop: the net slows its loop to 3 s because it carries meaning.

## Server rendering
Renders on the server, but direction is read from the page after mount: the server paints left-to-right (the fill is hidden by a negative `translateX`), so on an RTL page the fill flips to the right side after hydration. `ProgressCircle` and `ProgressSegments` have no direction logic and match exactly.

## Gotchas
- `value` is clamped to 0 to `max`; an out-of-range value never reaches Radix's console error. `max <= 0` reads as an empty bar. `showValue` is `true` (above next to the label, else on the right), `"top"` or `"right"`.
- `formatValue` also sets `aria-valuetext` when it returns text or a number ("3 / 8 GB"), so the bar reads what it shows; a JSX result cannot be spoken, so the default percentage stays. Radix's `getValueLabel` or an explicit `aria-valuetext` overrides it.
- When there is a `label` or a shown value, the bar sits in a wrapper: `className` then styles the wrapper, not the track (use `indicatorClassName` for the fill).
- `ProgressCircle` has no indeterminate state; use `Spinner` for that. Its centre text is `children`, or the percentage unless `showValue={false}`.

## Example
```tsx
import { Progress } from "@sutra/ui";

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
