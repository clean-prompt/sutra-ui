# MeterGroup

> Stack (or grid) of Meters, e.g. CPU / RAM / GPU / VRAM.

- Import: `import { MeterGroup } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/primitives/meter` (primitives)
- `data-slot`: `meter-group`
- Part of [`Meter`](Meter.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `1 \| 2 \| 3 \| 4` | `1` | Grid columns on wide screens. Default 1 (stacked). |

## Notes

See the notes in [`Meter`](Meter.md#notes).

## Example

```tsx
import { Meter, MeterGroup } from "@sutra/ui";

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
