# ProgressRingSvg

> The SVG ring drawn by `ProgressCircle`, `RingMeter` and `ChatAttachment`: a track circle plus a fill arc that starts at 12 o'clock. Decorative (`aria-hidden`); the wrapper carries the role and values.

- Import: `import { ProgressRingSvg } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/progress` (primitives)
- Part of [`Progress`](Progress.md)
- Also accepts the props of SVGAttributes

## Props

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

## Notes

See the notes in [`Progress`](Progress.md#notes).

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
