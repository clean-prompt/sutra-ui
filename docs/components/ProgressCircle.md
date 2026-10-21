# ProgressCircle

> Circular progress ring with centered value (role="progressbar"): task completion, like `Progress`. `RingMeter` draws the same ring as a threshold-coloured level (role="meter"), e.g. a context window.

- Import: `import { ProgressCircle } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/progress` (primitives)
- Part of [`Progress`](Progress.md)
- Also accepts the props of HTMLAttributes

## Props

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
