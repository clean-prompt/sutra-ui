# TallyCounter

> Big tally number with −/+ (press and hold to repeat), step, goal ring and an entry log with undo.

- Import: `import { TallyCounter } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/patterns/tally-counter` (patterns)
- `data-slot`: `tally-counter`, `tally-counter-value`, `tally-counter-log`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `number` | `0` | Initial count when uncontrolled. |
| `goal` | `number` |  | Draws a progress ring towards this target. |
| `label` | `string` | `"Count"` | Accessible name of the counter. |
| `labels` | `TallyCounterLabels` |  | Button names and captions (English by default); pass them to translate the counter. |
| `logLimit` | `number` | `20` | Max log entries kept. Default 20. |
| `max` | `number` | `Number.POSITIVE_INFINITY` | Highest allowed count. |
| `min` | `number` | `0` | Lowest allowed count. |
| `onValueChange` | `(value: number) => void` |  | Called with the new count when the user increments or decrements. |
| `showLog` | `boolean` | `true` | Show the entry log with undo. Default true. |
| `step` | `number` | `1` | Amount added or removed by the buttons. |
| `value` | `number` |  | Controlled count. Use with `onValueChange`. |

## Example (live: `#/components/social/tally-counter` in the playground)

```tsx
import { TallyCounter } from "@sutra/ui/social";

<div className="@container w-full">
  <div className="grid grid-cols-1 gap-8 @lg:grid-cols-2">
    <TallyCounter label="Glasses of water" goal={8} />
    <TallyCounter label="Push-ups" step={5} goal={100} defaultValue={35} />
  </div>
</div>
```
