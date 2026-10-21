# AlertDialog

> Interrupting confirmation dialog root (no outside-click dismiss).

- Import: `import { AlertDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/dialog` (primitives)
- Parts: [`AlertDialogAction`](AlertDialogAction.md), [`AlertDialogCancel`](AlertDialogCancel.md), [`AlertDialogContent`](AlertDialogContent.md), [`AlertDialogDescription`](AlertDialogDescription.md), [`AlertDialogFooter`](AlertDialogFooter.md), [`AlertDialogHeader`](AlertDialogHeader.md), [`AlertDialogTitle`](AlertDialogTitle.md), [`AlertDialogTrigger`](AlertDialogTrigger.md)
- Also accepts the props of DialogProps

## Props

No props of its own.

## Part props

### AlertDialogAction

Confirming action button (closes the dialog).

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

### AlertDialogCancel

Dismissing button (receives initial focus).

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

### AlertDialogContent

Alert dialog panel (defaults to the `sm` size).

| Prop | Type | Default | Description |
|---|---|---|---|
| `overlayClassName` | `string` |  | Classes for the dimmed backdrop behind the dialog. |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"sm"` | Dialog max width from `sm` to `xl`; `full` fills the viewport minus a margin. Below the `sm` breakpoint dialogs are always full width. |

### AlertDialogFooter

Action row; stacks full-width on mobile.

| Prop | Type | Default | Description |
|---|---|---|---|
| `bordered` | `boolean` |  | Separate the footer with a top border and subtle background. |

### AlertDialogHeader

Title block with optional featured icon.

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"start" \| "center"` | `"start"` | Alignment of the icon, title and description. |
| `icon` | `React.ReactNode` |  | Featured icon shown above the title. |
| `tone` | `DialogTone` | `"primary"` | Colour of the featured `icon` badge. |

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
