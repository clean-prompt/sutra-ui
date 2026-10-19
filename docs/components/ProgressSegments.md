# ProgressSegments

> Segmented bar for multi-step progress, or (with `role="meter"`) a level such as password strength.

- Import: `import { ProgressSegments } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/progress` (primitives)
- Part of [`Progress`](Progress.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `number` |  | Filled amount, relative to `max` (defaults to `segments`). |
| `color` | `ProgressColor` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `indicatorClassName` | `string` |  | Classes for the filled segments; replaces the tone colour (e.g. `bg-success/70`). |
| `label` | `string` |  | Accessible name of the progressbar (`aria-label`). |
| `max` | `number` |  | Total number of units the bar represents; defaults to the segment count. |
| `role` | `"progressbar" \| "meter"` | `"progressbar"` | `progressbar` (default) for steps done; `meter` for a level such as password strength. Pair with `aria-valuetext`. |
| `segments` | `number` | `4` | Number of segments. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Segment height: sm, md or lg. |
| `tone` | `ToneInput` |  | Semantic colour of the filled part. Default "primary". |

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
