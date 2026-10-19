# ChipGroup

> Group of chips with single or multiple selection.

- Import: `import { ChipGroup } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/chip` (primitives)
- Part of [`Chip`](Chip.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowDeselect` | `boolean` |  | Allow clicking the selected chip to clear the selection. Default true. |
| `color` | `ChipColor` | `"neutral"` | **Deprecated.** Use `tone` (`brand` is `primary`). Legacy name of `tone`. |
| `defaultValue` | `string \| null \| string[]` |  | Initially selected chip value when uncontrolled. Initially selected chip values when uncontrolled. |
| `disabled` | `boolean` |  | Disables every chip in the group. |
| `onValueChange` | `((value: string \| null) => void) \| ((value: string[]) => void)` |  | Called with the selected value, or `null` when the selection is cleared. Called with the full list of selected values after every toggle. |
| `size` | `ChipSize` | `"md"` | Chip size for every chip in the group. |
| `tone` | `ToneInput` |  | Semantic colour for every chip in the group. Default `primary`. |
| `type` | `"single" \| "multiple"` | `"single"` | Selection mode: at most one chip selected (the default); use `"multiple"` for a list. Selection mode: any number of chips can be selected. |
| `value` | `string \| null \| string[]` |  | Controlled selected chip value (`null` for none). Use with `onValueChange`. Controlled list of selected chip values. Use with `onValueChange`. |
| `variant` | `ChipVariant` | `"outline"` | Visual style for every chip in the group (a chip's own `variant` wins). |

## Variants

- `variant`: `outline`, `soft`, `solid` (default "outline")
- `color`: `neutral`, `brand`, `success`, `warning`, `destructive`, `info` (default "neutral")
- `size`: `sm`, `md`, `lg` (default "md")

## Notes

See the notes in [`Chip`](Chip.md#notes).

## Example

```tsx
import * as React from "react";
import { Chip, ChipGroup } from "@sutra/ui";

const topics = ["Design", "Engineering", "Research", "Support"];

export function Example() {
  const [selected, setSelected] = React.useState<string[]>(["Design"]);
  return (
    <ChipGroup type="multiple" value={selected} onValueChange={setSelected} aria-label="Topics">
      {topics.map((topic) => (
        <Chip key={topic} value={topic}>
          {topic}
        </Chip>
      ))}
    </ChipGroup>
  );
}
```
