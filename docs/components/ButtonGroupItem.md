# ButtonGroupItem

> Segment of a `ButtonGroup`; becomes a toggle item when the group has a `type`.

- Import: `import { ButtonGroupItem } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/button-group` (primitives)
- `data-slot`: `button-group-item`
- Part of [`ButtonGroup`](ButtonGroup.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping the item styles. |
| `iconOnly` | `boolean` |  | Makes the item square for an icon-only button; set it together with an `aria-label`. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `size` | `Size` | `"md"` | Overrides the size from the group. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `value` | `string` |  | Required when the parent `ButtonGroup` has a `type` (toggle mode). |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
- `iconOnly`: `true`

## Notes

See the notes in [`ButtonGroup`](ButtonGroup.md#notes).

## Example

```tsx
import * as React from "react";
import { ButtonGroup, ButtonGroupItem } from "@sutra/ui";
import { RiAlignCenter, RiAlignLeft, RiAlignRight } from "@sutra/ui/icons";

export function Example() {
  const [align, setAlign] = React.useState("left");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonGroup aria-label="Change date">
        <ButtonGroupItem>Previous</ButtonGroupItem>
        <ButtonGroupItem>Today</ButtonGroupItem>
        <ButtonGroupItem>Next</ButtonGroupItem>
      </ButtonGroup>
      <ButtonGroup type="single" value={align} onValueChange={setAlign} aria-label="Text alignment">
        <ButtonGroupItem value="left" iconOnly aria-label="Align left">
          <RiAlignLeft aria-hidden />
        </ButtonGroupItem>
        <ButtonGroupItem value="center" iconOnly aria-label="Align center">
          <RiAlignCenter aria-hidden />
        </ButtonGroupItem>
        <ButtonGroupItem value="right" iconOnly aria-label="Align right">
          <RiAlignRight aria-hidden />
        </ButtonGroupItem>
      </ButtonGroup>
    </div>
  );
}
```
