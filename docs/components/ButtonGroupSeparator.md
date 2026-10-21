# ButtonGroupSeparator

> Thin divider between segments, useful for filled (e.g. primary) split buttons.

- Import: `import { ButtonGroupSeparator } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/button-group` (primitives)
- `data-slot`: `button-group-separator`
- Part of [`ButtonGroup`](ButtonGroup.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Notes

See the notes in [`ButtonGroup`](ButtonGroup.md#notes).

## Example

```tsx
import * as React from "react";
import { ButtonGroup, ButtonGroupItem } from "@cleanprompt/sutra-ui";
import { RiAlignCenter, RiAlignLeft, RiAlignRight } from "@cleanprompt/sutra-ui/icons";

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
