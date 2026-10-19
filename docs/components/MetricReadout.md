# MetricReadout

> Compact menu-bar style reading ("CPU 92%"): optional icon, label, tabular value with unit and a tiny trend slot. It turns warning or destructive under strain (from `thresholds` or `tone`), and its accessible text reads "CPU 92%, high".

- Import: `import { MetricReadout } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/primitives/metric-readout` (primitives)
- `data-slot`: `metric-readout`, `metric-readout-icon`, `metric-readout-label`, `metric-readout-value-skeleton`, `metric-readout-value`, `metric-readout-trend`
- Parts: [`MetricReadoutGroup`](MetricReadoutGroup.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `number \| string \| null \| undefined` |  | Numeric readings are formatted and classified by `thresholds`; strings are shown as given; `null` shows "—". |
| `accent` | `Accent` |  | Icon colour while the reading is normal. Default: muted. |
| `formatValue` | `(value: number) => string` |  | Formats a numeric value. Default: whole numbers in the locale ("2,400"). |
| `icon` | `React.ReactNode` |  | Leading icon (decorative). |
| `label` | `React.ReactNode` |  | Short name before the value ("CPU", "GPU", "Fan"). |
| `labelText` | `string` |  | Plain-text label for the accessible text when `label` is not a string. |
| `loading` | `boolean` |  | Waiting for the first reading: with no `value` the label stays and the value is a short placeholder. |
| `locale` | `string` |  | BCP 47 locale used by the default number formatter. |
| `size` | `"xs" \| "sm"` | `"sm"` | Default `sm`. |
| `statusLabels` | `ReadoutStatusLabels` |  | Words added to the accessible text when strained. |
| `statusText` | `string \| false` |  | Replaces the status word ("throttling"), or `false` for none. |
| `thresholds` | `ReadoutThresholds \| false` |  | Absolute thresholds for the strain colour. |
| `tone` | `ToneInput` |  | Explicit semantic colour; wins over `thresholds`. |
| `trend` | `React.ReactNode` |  | Tiny trailing chart, e.g. `<SparkBar data={…} width={24} height={12} />` (decorative here; the text names the reading). |
| `unit` | `string` |  | "%", "°C", "rpm", "MB/s" … |
| `variant` | `"plain" \| "pill"` | `"plain"` | `plain` (menu-bar text) or `pill` (a filled chip that turns soft warning / destructive under strain). Default `plain`. |

## Part props

### MetricReadoutGroup

A menu-bar strip of `MetricReadout`s with separators between them (role="group").

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Accessible name of the strip, e.g. "System readings". |
| `separator` | `"line" \| "dot" \| "none"` | `"line"` | Divider between readouts: a thin `line` (default), a `dot`, or `none` (just spacing). |
| `size` | `"xs" \| "sm"` | `"sm"` | Default `sm`; sets the gap and separator height. |

## Notes

**When to use:** A compact menu-bar style reading ("CPU 92%") with an optional icon and tiny trend, turning warning or destructive when the value crosses thresholds. `MetricReadoutGroup` lines several up with separators.

**Use instead when:**
- `Meter`: a value shown against a bounded bar
- `BatteryLevel`: a battery with a glyph and charging state
- `KeyValue`: a fact in a list
- `StatCard`: a large headline figure with a trend

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

- The visible parts (icon, label, value, unit, trend) sit in an `aria-hidden` wrapper, and a single sr-only sentence is read instead: "CPU 92%, high", "Fan 2,400 rpm", "GPU no data". The status word is appended under strain: "high" for warning and "critical" for danger. `statusLabels` renames them and `statusText` replaces the word (or `false` for none).
- A `label` that is not a string or number needs `labelText`, or the sentence has no name.
- `loading` with no value keeps the label, shows a placeholder, sets `aria-busy="true"` and reads "Loading CPU…".
- `MetricReadoutGroup` is a `role="group"`; give it `label` ("System readings"). Its separators are `aria-hidden`.

### Reduced motion

Static: no animation of its own (the loading placeholder is a `Skeleton`, which follows the net in `sutra.css`).

### Server rendering

Server render: part of it fills in after mount. Plain markup, but numbers go through `Intl.NumberFormat` in the default locale, so a value of 1,000 or more can print "2,400" on a server and "2.400" in a browser, and hydration warns. Pass `locale` (or `formatValue`) when you server-render such values. Nothing else waits for mount.

### Slots

- `metric-readout`: the root, with `data-level` (`normal`, `warning`, `danger`) and `data-tone`
- `metric-readout-icon`: the leading icon
- `metric-readout-label`: the name before the value
- `metric-readout-value`: the number with its unit
- `metric-readout-trend`: the trailing trend slot
- `metric-readout-value-skeleton`: the placeholder shown while `loading`
- `metric-readout-group`: the strip
- `metric-readout-separator`: a divider between two readouts

### Gotchas

- `thresholds` direction comes from the numbers: when `danger >= warning` higher is worse (CPU 70 and 90), otherwise lower is worse (battery 20 and 10). Only numeric values are classified, and `false` turns it off.
- `tone` wins over `thresholds`, but only `destructive` and `warning` count as strain (they add the status word); other tones just colour the reading.
- A string `statusText` is appended even when the reading is normal. A string `value` is shown as given and never classified; `null`, `undefined` and `""` show a dash and read "no data".
- `variant="pill"` fills the chip (muted, or soft warning or destructive under strain); `plain` only colours the text. The `trend` slot is decorative, so the text must carry the meaning.

## Example

```tsx
import { MetricReadout, MetricReadoutGroup } from "@sutra/ui";

export function Example() {
  return (
    <MetricReadoutGroup label="System readings">
      <MetricReadout label="CPU" value={82} unit="%" thresholds={{ warning: 70, danger: 90 }} />
      <MetricReadout label="Temp" value={58} unit="°C" thresholds={{ warning: 75, danger: 90 }} />
      <MetricReadout label="Battery" value={64} unit="%" thresholds={{ warning: 20, danger: 10 }} />
      <MetricReadout label="Fan" value={null} unit="rpm" />
    </MetricReadoutGroup>
  );
}
```
