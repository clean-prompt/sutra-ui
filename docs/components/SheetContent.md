# SheetContent

> Sheet panel sliding in from `side`. A sheet opened inside another sheet stacks on top of it: the one underneath scales down and fades (`data-nested`), and the reduced-motion net removes the movement.

- Import: `import { SheetContent } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/dialog` (primitives)
- `data-slot`: `sheet-content`
- Part of [`Sheet`](Sheet.md)
- Also accepts the props of HTMLAttributes, DismissableLayerProps, DialogContentImplProps, DialogContentProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `blur` | `boolean` | `false` | Frosted panel: translucent surface with a backdrop blur, so the page shows through. |
| `children` | `React.ReactNode` |  | Sheet body content. |
| `detached` | `boolean` | `false` | Float the panel off the screen edges with rounded corners. |
| `dismissible` | `boolean` | `true` | Set to `false` to keep the sheet open on Escape and outside clicks, and to hide the built-in close button. |
| `overlayClassName` | `string` |  | Classes for the dimmed backdrop behind the sheet. |
| `showClose` | `boolean` |  | Show the close button (default: when `dismissible`). |
| `side` | `SheetSide` | `"right"` | Edge the panel slides from. `start` and `end` follow the document direction (left and right in LTR); `left` and `right` are fixed. |
| `size` | `SheetSize` |  | Panel width (left, right, start, end) or height (top, bottom). Without it: 24rem wide, or as tall as its content. |

## Variants

- `side`: `left`, `right`, `top`, `bottom`, `start`, `end` (default "right")

## Notes

See the notes in [`Sheet`](Sheet.md#notes).

## Example

```tsx
import { Button, Field, FieldLabel, Input, Sheet, SheetBody, SheetClose, SheetContent } from "@cleanprompt/sutra-ui";
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Filters</Button>
      </SheetTrigger>
      <SheetContent side="end" size="md">
        <SheetHeader>
          <SheetTitle>Filter orders</SheetTitle>
          <SheetDescription>Narrow the list down to one customer.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field>
            <FieldLabel>Customer</FieldLabel>
            <Input placeholder="Name or email" />
          </Field>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Apply filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```
