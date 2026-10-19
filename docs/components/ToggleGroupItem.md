# ToggleGroupItem

> One toggle in a `ToggleGroup`; `value` identifies it.

- Import: `import { ToggleGroupItem } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/toggle-group` (primitives)
- `data-slot`: `toggle-group-item`
- Part of [`ToggleGroup`](ToggleGroup.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef, ToggleGroupItemImplProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Item height and padding. |
| `variant` | `"default" \| "outline" \| "soft"` | `"default"` | Look of the items: `default` (ghost), `outline` or `soft` (tinted when on). |

## Variants

- `variant`: `default`, `outline`, `soft` (default "default")
- `size`: `sm`, `md`, `lg` (default "md")

## Notes

See the notes in [`ToggleGroup`](ToggleGroup.md#notes).

## Example

```tsx
import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@sutra/ui";
import { RiBold, RiItalic, RiUnderline } from "@sutra/ui/icons";

export function Example() {
  const [marks, setMarks] = React.useState<string[]>(["bold"]);
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      aria-label="Text formatting"
      value={marks}
      onValueChange={setMarks}
    >
      <ToggleGroupItem value="bold" aria-label="Bold">
        <RiBold aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <RiItalic aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <RiUnderline aria-hidden />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```
