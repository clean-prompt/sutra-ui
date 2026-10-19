# SegmentedControlItem

> One segment. Renders icon-only (square) when it has an icon and no label.

- Import: `import { SegmentedControlItem } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/segmented-control` (primitives)
- Part of [`SegmentedControl`](SegmentedControl.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef, ToggleGroupItemImplProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `React.ReactNode` |  | Icon shown before the segment label. |

## Notes

See the notes in [`SegmentedControl`](SegmentedControl.md#notes).

## Example

```tsx
import * as React from "react";
import { SegmentedControl } from "@sutra/ui";

export function Example() {
  const [view, setView] = React.useState("list");
  return (
    <SegmentedControl
      aria-label="View"
      value={view}
      onValueChange={setView}
      options={[
        { value: "list", label: "List" },
        { value: "board", label: "Board" },
        { value: "calendar", label: "Calendar" },
      ]}
    />
  );
}
```
