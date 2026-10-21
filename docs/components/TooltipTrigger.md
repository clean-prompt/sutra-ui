# TooltipTrigger

> Element that opens the tooltip on hover/focus.

- Import: `import { TooltipTrigger } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/tooltip` (primitives)
- Part of [`Tooltip`](Tooltip.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef

## Props

No props of its own.

## Notes

See the notes in [`Tooltip`](Tooltip.md#notes).

## Example

```tsx
import { Button, SimpleTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@cleanprompt/sutra-ui";
import { RiDeleteBinLine, RiSave3Line } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <SimpleTooltip content="Save" shortcut="mod+s">
          <Button size="icon" variant="outline" aria-label="Save">
            <RiSave3Line aria-hidden />
          </Button>
        </SimpleTooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Delete">
              <RiDeleteBinLine aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete permanently</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```
