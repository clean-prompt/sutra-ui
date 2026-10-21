# AlertDialogContent

> Alert dialog panel (defaults to the `sm` size).

- Import: `import { AlertDialogContent } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/dialog` (primitives)
- Part of [`AlertDialog`](AlertDialog.md)
- Also accepts the props of HTMLAttributes, DismissableLayerProps, DialogContentImplProps, DialogContentProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `overlayClassName` | `string` |  | Classes for the dimmed backdrop behind the dialog. |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"sm"` | Dialog max width from `sm` to `xl`; `full` fills the viewport minus a margin. Below the `sm` breakpoint dialogs are always full width. |

## Variants

- `size`: `sm`, `md`, `lg`, `xl`, `full` (default "sm")

## Notes

See the notes in [`AlertDialog`](AlertDialog.md#notes).

## Example

```tsx
import * as React from "react";
import { Button, Dialog, DialogBody, DialogClose, DialogContent, DialogDescription } from "@cleanprompt/sutra-ui";
import { DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Field, FieldLabel, Input } from "@cleanprompt/sutra-ui";

export function Example() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Rename project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>Everyone on the team sees the new name.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Field>
            <FieldLabel>Project name</FieldLabel>
            <Input defaultValue="Atlas" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={() => setOpen(false)}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
