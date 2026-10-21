# Meter

> Labeled usage meter with threshold coloring (role="meter"): a level read against thresholds. For task completion use `Progress`.

- Import: `import { Meter } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/dataviz`)
- Source: `packages/ui/src/primitives/meter` (primitives)
- `data-slot`: `meter-value-skeleton`, `meter-value`, `meter-track`, `meter-segment`, `meter-fill`
- Parts: [`MeterGroup`](MeterGroup.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `number \| null` |  | Current value; `null` renders an empty "no data" meter. |
| `accent` | `Accent` |  | Categorical fill colour (a provider or metric colour). Colour order: the warning/danger threshold colours, then `tone`/`color`, then `accent`, then primary. Sets `--sutra-accent` on the root. |
| `ariaValueText` | `string` |  | Screen-reader value text override. |
| `barClassName` | `string` |  | Classes for the bar track (`className` styles the whole meter). |
| `caption` | `React.ReactNode` |  | Secondary line under the bar, e.g. "resets in 2h". |
| `color` | `MeterColor \| ToneInput` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `label` | `React.ReactNode` |  | Text shown above the bar; also the accessible name of the meter. |
| `loading` | `boolean` |  | Waiting for the first reading: with no `value` the bar is a muted track with no fill and a placeholder value. |
| `max` | `number` | `100` | Default 100. |
| `min` | `number` | `0` | Value that counts as empty (the start of the scale). |
| `segments` | `number` |  | Render as n discrete blocks instead of a continuous bar. |
| `showValue` | `boolean` | `true` | Show the value text next to the label. Default true. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Bar height. |
| `thresholds` | `MeterThresholds \| false` | `defaultMeterThresholds` | Percent thresholds for automatic warning/danger color, or false to disable. |
| `tone` | `ToneInput` |  | Base fill tone when below thresholds (or always, if thresholds are off). Default `primary`. |
| `unit` | `string` |  | Unit appended to the default value text: "62.1 / 80 GB". Without it the text is a percentage. |
| `valueText` | `React.ReactNode \| ((value: number, max: number, percent: number) => React.ReactNode)` |  | Custom value text, or a formatter. Strings are also used as aria-valuetext. |

## Part props

### MeterGroup

Stack (or grid) of Meters, e.g. CPU / RAM / GPU / VRAM.

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `1 \| 2 \| 3 \| 4` | `1` | Grid columns on wide screens. Default 1 (stacked). |

## Notes

**When to use:** A labelled usage bar for a level read against limits (CPU, memory, quota), turning warning and destructive past thresholds. Continuous or in discrete segments, with a caption. `MeterGroup` stacks or grids several.

**Use instead when:**
- `Progress`: how far a task has got (a determinate bar with start and end)
- `StackedMeter`: one bar split into labelled parts
- `BreakdownList`: the legend rows of such a split
- `RingMeter`: a round gauge
- `BatteryLevel`: a battery reading
- `MetricReadout`: a compact text reading

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

- The bar is a `role="meter"` with `aria-valuenow`, `aria-valuemin` (`min`), `aria-valuemax` (`max`) and `aria-valuetext`. It is named by `label` (`aria-labelledby`), or just "Usage" when there is no label, so give every meter a `label`. An `aria-label` or `aria-labelledby` passed to `Meter` goes on the bar (replacing the label as its name), not on the outer div.
- The value text is "62.1 / 80 GB" with `unit`, otherwise a rounded percentage ("62%"). A string from `valueText` (or its function) becomes `aria-valuetext` too; `ariaValueText` overrides it, and a non-text `valueText` falls back to the percentage. `value={null}` reads "No data".
- `loading` with no value drops the meter role and shows sr-only "Loading CPU…" (or "Loading usage…" without a string label); `loading` with a value keeps the meter and only sets `aria-busy`.
- `MeterGroup` is a `role="group"`; pass `aria-label` ("Node").

### Reduced motion

The fill width transition (500 ms), the segment colour fade and the loading pulse all carry `motion-reduce:` variants that turn them off.

### Server rendering

Server render: same markup as the client. Plain markup computed from the props (the label id uses `useId`), so server and client output match.

### Slots

- `meter-fill`: the continuous fill, with an inline `width` percentage
- `meter-segment`: one block in `segments` mode, `data-state` `on` or `off`
- `meter-value`: the value text beside the label
- `meter-track`: the muted placeholder track while `loading`
- `meter-value-skeleton`: the value placeholder while `loading`
- `meter-group`: the `MeterGroup` root

### Gotchas

- Thresholds are percentages of the range, higher is worse, and default to warn 75 and danger 90; `thresholds={false}` turns them off. `data-level` on the root is `ok`, `warn` or `danger`.
- Fill colour order: the threshold colour when strained, then `tone` (or the deprecated `color`), then `accent`, then primary. With `thresholds={false}` and no tone you get primary.
- `min` and `max` set the scale and the fill is clamped to 0 to 100%, and `aria-valuenow` is clamped to the same range, while the visible and `aria-valuetext` text keep the real value ("130 / 100 GB").
- `segments={n}` fills `round(percent * n)` blocks, so small values can show none. For task completion use `Progress`, which has the progressbar role.

## Example

```tsx
import { Meter, MeterGroup } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <MeterGroup aria-label="Server usage" className="max-w-sm">
      <Meter label="CPU" value={62} />
      <Meter label="Memory" value={62.1} max={80} unit="GB" />
      <Meter label="API quota" value={820} max={1000} unit="calls" caption="Resets in 2h" />
      <Meter label="Disk" value={93} />
    </MeterGroup>
  );
}
```
