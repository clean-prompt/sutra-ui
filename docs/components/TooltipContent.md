# TooltipContent

> Floating tooltip bubble (dark inverse by default).

- Import: `import { TooltipContent } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/tooltip` (primitives)
- Part of [`Tooltip`](Tooltip.md)
- Also accepts the props of HTMLAttributes, PopperContentProps, TooltipContentImplProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `arrow` | `boolean` | `true` | Show the pointing arrow. Default true. |
| `variant` | `"inverse" \| "light"` | `"inverse"` | Look of the bubble: `inverse` (dark, default) or `light` (bordered popover surface). |

## Variants

- `variant`: `inverse`, `light` (default "inverse")

## Notes

See the notes in [`Tooltip`](Tooltip.md#notes).

## Example

```tsx
import { Button, SimpleTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@sutra/ui";
import { RiDeleteBinLine, RiSave3Line } from "@sutra/ui/icons";

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
