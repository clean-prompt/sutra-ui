---
component: StackedMeter
module: primitives/meter
use: One bar split into coloured parts with a legend, for a breakdown against a capacity (storage by kind, time by phase). The legend is inline chips or a `BreakdownList` with values and percentages.
instead: Meter = a single level against thresholds; BreakdownList = only the legend rows, next to a chart you draw yourself; Progress = task completion; DonutChart = a round breakdown
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction. The `legend="list"` rows are static here (they are not toggle buttons); use `BreakdownList` directly for a legend that hides series.

## Screen readers
- The root is a `role="group"` named by `label` (through `aria-labelledby`); without `label` the group has no name, so pass `aria-label`.
- The bar is a `role="img"` whose label summarises the parts: "Models 50 GB, Datasets 20 GB of 100 GB". Override it, or turn the bar into a real meter, with `trackProps` (for example `role: "meter"` plus the `aria-value*` attributes).
- The legend is a real list of the parts with their values; the colour swatches are `aria-hidden`.
- `loading` with no `parts` replaces the bar and legend with `aria-hidden` placeholders and an sr-only "Loading Storage…"; with parts it only sets `aria-busy`.

## Reduced motion
Part widths animate over 500 ms, and the loading track pulses; both have `motion-reduce:` variants that switch them off.

## Server rendering
Plain markup computed from the props (the label id uses `useId`), so server and client output match.

## Gotchas
- `max` is the capacity: without it the bar is the sum of the parts and always full. The header text defaults to "used / max" (or just the sum); `valueText` replaces it and `showValue={false}` hides the header.
- Parts without `color` take the chart palette in order; a `color` is a token name (`primary`, `success`, ...) or any CSS colour. Parts with a value of 0 or less draw nothing but still appear in the legend. Each drawn part has `data-slot="stacked-meter-part"` (change it with `partSlot`) and a `title` tooltip.
- `legend` is `true` or `"inline"` for chips, `"list"` for rows with a percent column (`showPercent` defaults to true for the list, false for chips), or `false` for none. Percentages are of `max`, otherwise of the total.
- Keep `key` stable: it defaults to `label`, so two parts with the same label collide.

## Example
```tsx
import { StackedMeter } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <StackedMeter
      className="max-w-sm"
      label="Storage"
      max={256}
      valueText="182 of 256 GB"
      valueFormatter={(value) => `${value} GB`}
      legend="list"
      parts={[
        { label: "Apps", value: 82, color: "primary" },
        { label: "Photos", value: 64, color: "info" },
        { label: "Documents", value: 36, color: "warning" },
      ]}
    />
  );
}
```
