# AlertDialogFooter

> Action row; stacks full-width on mobile.

- Import: `import { AlertDialogFooter } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/dialog` (primitives)
- Part of [`AlertDialog`](AlertDialog.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `bordered` | `boolean` |  | Separate the footer with a top border and subtle background. |

## Notes

See the notes in [`AlertDialog`](AlertDialog.md#notes).

## Example

```tsx
import * as React from "react";
import { Button, Dialog, DialogBody, DialogClose, DialogContent, DialogDescription } from "@sutra/ui";
import { DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Field, FieldLabel, Input } from "@sutra/ui";

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
