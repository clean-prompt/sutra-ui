# SheetClose

> Closes the sheet when clicked.

- Import: `import { SheetClose } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/dialog` (primitives)
- Part of [`Sheet`](Sheet.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef

## Props

No props of its own.

## Notes

See the notes in [`Sheet`](Sheet.md#notes).

## Example

```tsx
import { Button, Field, FieldLabel, Input, Sheet, SheetBody, SheetClose, SheetContent } from "@sutra/ui";
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@sutra/ui";

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
