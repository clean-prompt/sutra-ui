# Gauge

> Radial arc gauge with threshold coloring (role="meter").

- Import: `import { Gauge } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/dataviz`)
- Source: `packages/ui/src/patterns/gauge` (patterns)
- `data-slot`: `gauge-fill`, `gauge-value`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `number \| null` |  | Current reading in `min` to `max` units; `null` shows an empty "no data" gauge. |
| `accent` | `Accent` |  | Categorical arc colour (a sensor or metric colour). Colour order: `colorStops`, then the warning/danger threshold colours, then `tone`/`color`, then `accent`, then primary. Sets `--sutra-accent` on the root. |
| `ariaValueText` | `string` |  | Screen-reader value text override (default is the formatted value with its unit). |
| `children` | `React.ReactNode` |  | Extra content under the value (replaces the label slot). |
| `color` | `MeterColor \| ToneInput` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `colorStops` | `GaugeColorStop[]` |  | Custom colors by absolute value (overrides thresholds). |
| `endAngle` | `number` | `135` | Arc end in degrees. Default 135 (270° sweep). |
| `glow` | `boolean` |  | Soft colored glow around the value arc. |
| `label` | `React.ReactNode` |  | Caption under the value (also the accessible name). |
| `loading` | `boolean` |  | Waiting for the first reading: with `value` null, the track stays empty and a placeholder stands in for the number. |
| `max` | `number` | `100` | Default 100. |
| `min` | `number` | `0` | Value at the start of the arc. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Gauge diameter: `sm`, `md` or `lg`. |
| `startAngle` | `number` | `-135` | Arc start in degrees (0 = top, clockwise). Default -135. |
| `thickness` | `number` |  | Stroke width override in px. |
| `thresholds` | `MeterThresholds \| false` | `defaultMeterThresholds` | Percent thresholds, same semantics as Meter. |
| `tone` | `ToneInput` |  | Base tone below thresholds. Default `primary`. |
| `unit` | `string` |  | Unit shown beside the value (e.g. "°C"). Without it the value is shown as given. |
| `valueFormatter` | `(value: number) => string` | `(v) => String(Math.round(v * 10) / 10)` | Formats the number in the middle. Default is the rounded value. |

## Notes

**When to use:** A radial arc showing one reading inside a range (temperature, load, score), coloured by thresholds, with the value in the middle. `RingMeter` is the compact ring for inline use, such as a context window.

**Use instead when:**
- `Meter`: a level against a limit as a bar
- `ProgressCircle`: completion of a task (role progressbar)
- `DonutChart`: several parts of a whole
- `QuotaRing`: a plan limit with a pace
- `Sparkline`: history rather than the current value

### Keyboard

Not focusable: no keyboard interaction. The reading is exposed to screen readers as a meter, with no controls.

### Screen readers

- The root is `role="meter"` with `aria-valuenow` (clamped into `min` and `max`), `aria-valuemin` and `aria-valuemax`. `aria-valuetext` is the formatted value plus `unit` ("62 °C"), "No data" for `value={null}`, "Loading" while `loading` has no value, or whatever you pass as `ariaValueText`.
- The name is `label` (referenced with `aria-labelledby`, and kept as hidden text when `children` replaces the visible caption); without `label` it is "Gauge", so pass one when several are on a page.
- `data-level` (`ok`, `warn`, `danger`) is a styling hook, not announced: the warn and danger colour is visual only, so put the state in `ariaValueText` when it matters.
- `RingMeter` is a `role="meter"` span named by `label` (default "Usage"), always on a 0 to 100 scale, with value text like "92%". Its percentage is shown only from `showValueAbove` (50) upwards, but the value text is always there.

### Reduced motion

The arc animates `stroke-dasharray` and colour over 500 ms with `motion-reduce:transition-none`, so under `prefers-reduced-motion` it jumps to the new value. The loading placeholder uses the `Skeleton` pulse, which the global net stops.

### Server rendering

Server render: same markup as the client. A static SVG computed from the props (arc path, `pathLength` dash), so the server and client markup match. The arc fills clockwise in both directions: nothing mirrors in RTL.

### Slots

- `gauge-fill`: the coloured value arc (absent when empty or at 0)
- `gauge-value`: the number and unit in the middle
- `ring-value`: the percentage beside a `RingMeter`

### Gotchas

- Thresholds are percentages of `min` to `max` and higher is worse (warn at 75, danger at 90). For readings where high is good, pass `thresholds={false}`, or use `colorStops`, which use absolute values, win over thresholds and leave `data-level` at `ok`.
- Arc colour order: `colorStops`, then the warn and danger colours, then `tone`, then `accent`, then primary. `color` is a deprecated alias of `tone`, and `tone="neutral"` draws the arc in the foreground colour.
- `value={null}` draws an empty track and "—". With `loading`, the placeholder replaces the number only when the value is null; with a value the gauge keeps showing it and just sets `aria-busy`.
- The number in the middle is the unclamped `value` through `valueFormatter` (rounded to one decimal by default), while `aria-valuenow` and the arc are clamped to the range.

## Example

```tsx
import { Gauge } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <Gauge
      label="GPU temperature"
      value={68}
      unit="°C"
      min={20}
      max={110}
      thresholds={{ warn: 70, danger: 90 }}
      size="lg"
    />
  );
}
```
