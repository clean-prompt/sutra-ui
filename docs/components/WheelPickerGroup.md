# WheelPickerGroup

> Several wheels read as one value (hours : minutes : period, or hours and minutes of a duration) with one highlight band across them. `value` is an array with one entry per column. Each column is a `WheelPicker`, so the keys, type-ahead and reduced-motion behaviour are the same; the group is a labelled `role="group"`.

- Import: `import { WheelPickerGroup } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/wheel-picker` (primitives)
- `data-slot`: `wheel-picker-group`
- Part of [`WheelPicker`](WheelPicker.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` (required) | `readonly WheelPickerColumn[]` |  | Wheels to show side by side; each has an `id`, an accessible `label`, `options` and an optional separator. |
| `defaultValue` | `readonly string[]` |  | Initially selected values, one per column, when uncontrolled. |
| `disabled` | `boolean` |  | Disables every wheel. |
| `itemHeight` | `number` | `36` | Height of one row in px. |
| `loading` | `boolean` |  | Dims the wheels and blocks changes while options load. |
| `onValueChange` | `(value: string[], meta: { columnId: string; index: number }) => void` |  | Called with all column values plus the column that changed. |
| `value` | `readonly string[]` |  | One value per column, in order. |
| `visibleCount` | `number` | `5` | Rows visible per wheel (odd numbers centre the selection). |

## Notes

See the notes in [`WheelPicker`](WheelPicker.md#notes).

## Example

```tsx
import * as React from "react";
import { WheelPicker, wheelRange } from "@sutra/ui";

const minutes = wheelRange(5, 60, { step: 5 });

export function Example() {
  const [duration, setDuration] = React.useState("15");
  return (
    <div className="flex items-center gap-3">
      <WheelPicker
        aria-label="Timer minutes"
        className="w-20"
        options={minutes}
        value={duration}
        onValueChange={setDuration}
      />
      <span className="text-sm text-muted-foreground">minutes</span>
    </div>
  );
}
```
