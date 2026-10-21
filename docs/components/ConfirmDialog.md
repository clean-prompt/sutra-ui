# ConfirmDialog

> Ready-made confirmation dialog with async-aware confirm.

- Import: `import { ConfirmDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/dialog` (primitives)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Dialog heading; also its accessible name. |
| `cancelLabel` | `React.ReactNode` | `"Cancel"` | Text of the cancel button. |
| `children` | `React.ReactNode` |  | Extra content between the header and the footer. |
| `className` | `string` |  | Classes for the dialog panel. |
| `confirmLabel` | `React.ReactNode` | `"Confirm"` | Text of the confirm button. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `description` | `React.ReactNode` |  | Supporting text under the title; also the accessible description. |
| `icon` | `React.ReactNode` |  | Featured icon shown above the title (tone-coloured). |
| `onCancel` | `() => void` |  | Called when the cancel button is clicked; the dialog closes either way. |
| `onConfirm` | `() => void \| Promise<void>` |  | May return a promise; the confirm button shows a spinner until it settles. Throw to keep the dialog open. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes (confirm, cancel, Escape; closing is blocked while a confirm is pending). |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `tone` | `ToneInput` |  | `destructive` turns the icon and confirm button red. Default `neutral`. `default` is a deprecated alias of `neutral`. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (wrapped with `asChild`). |

## Notes

**When to use:** A modal that interrupts the page for one focused task. Centred on screens from `sm` up, a bottom sheet below. `AlertDialog` and `ConfirmDialog` are the variants for confirmations that must be answered.

**Use instead when:**
- `Sheet`: a side or edge panel that keeps the page context
- `Drawer`: a touch-first bottom sheet you drag
- `Popover`: a small floating panel that does not block the page
- `DialogProvider`: ask for a confirm or a prompt from code

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Cycle focus inside the dialog (it is trapped while open) |
| Escape | Close the dialog (`AlertDialog` closes on Escape too, but not on an outside click) |
| Enter, Space | Activate the focused button, including the close button |

Focus moves into the dialog on open and returns to whatever had it before, even when the dialog was opened without a `DialogTrigger` (a hotkey, a menu item, controlled `open`). There are no arrow-key or direction-dependent keys, so RTL changes nothing.

### Screen readers

Radix gives the panel `role="dialog"` (`alertdialog` for `AlertDialog`), `aria-labelledby` from `DialogTitle` and `aria-describedby` from `DialogDescription`, and hides the rest of the page from assistive technology while it is open. Always render a `DialogTitle` (it may be visually hidden); `ConfirmDialog` requires `title` for that reason. The built-in close button is labelled "Close". The mobile grabber bar is `aria-hidden` decoration.

### Reduced motion

The panel fades and zooms in (from the bottom edge on mobile) with the `animate-in` utilities; under reduced motion the net removes the zoom and slide and keeps the fade.

### Server rendering

Server render: same markup as the client. A closed dialog renders only its trigger on both server and client, so there is nothing to mismatch. The content is portalled into `<body>` after mount: a dialog that is `open` on first render appears after hydration, not in the server HTML. The portalled layer does not sit inside a subtree `data-style` or `dir`: put them on `<html>`.

### Gotchas

- `AlertDialog` ignores outside clicks (no dismiss by clicking the backdrop), `Dialog` does not: use `AlertDialog` when the user must choose.
- `ConfirmDialog onConfirm` may return a promise: the confirm button shows a spinner and closing is blocked until it settles, and throwing keeps the dialog open.
- A dialog opened from a menu item that then unmounts cannot return focus to it (the opener is gone), and Radix's default applies; keep the opener mounted when focus matters.
- `size` only sets the maximum width from `sm` up; below that every dialog is full width.

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
