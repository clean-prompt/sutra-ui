# MetricReadoutGroup

> A menu-bar strip of `MetricReadout`s with separators between them (role="group").

- Import: `import { MetricReadoutGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/system`)
- Source: `packages/ui/src/primitives/metric-readout` (primitives)
- `data-slot`: `metric-readout-group`, `metric-readout-separator`
- Part of [`MetricReadout`](MetricReadout.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Accessible name of the strip, e.g. "System readings". |
| `separator` | `"line" \| "dot" \| "none"` | `"line"` | Divider between readouts: a thin `line` (default), a `dot`, or `none` (just spacing). |
| `size` | `"xs" \| "sm"` | `"sm"` | Default `sm`; sets the gap and separator height. |

## Notes

See the notes in [`MetricReadout`](MetricReadout.md#notes).

## Example

```tsx
import { MetricReadout, MetricReadoutGroup } from "@cleanprompt/sutra-ui";

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
