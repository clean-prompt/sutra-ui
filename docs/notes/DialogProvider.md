---
component: DialogProvider
module: primitives/confirm
use: Mount once near the root to ask for a confirmation, a line of text or a choice from code with promises. `useDialogs()` returns `confirm`, `prompt` and `choose`; `useConfirm()` is `confirm` alone. One dialog shows at a time and the rest queue.
instead: ConfirmDialog = a confirmation you render in place with a `trigger` or controlled `open`; Dialog = a custom form or content; AlertDialog = a blocking message with your own buttons; Toaster = feedback that needs no answer
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Cycle focus inside the dialog (trapped while open) |
| Escape | Cancel: `confirm` resolves `false`, `prompt` and `choose` resolve `null` |
| Enter | In `prompt`: submit the field (the form validates, then resolves the text) |
| Enter, Space | Activate the focused button |
| ArrowUp, ArrowDown, ArrowLeft, ArrowRight | In `choose`: move between the options (the radio group; Enter does not pick, Tab on to Confirm) |

`confirm` opens with focus on Cancel, so a stray Enter does not confirm; `prompt` focuses and selects the field; focus returns to whatever had it when the first dialog of a run opened, once the queue is empty. The radio group reads the document or `DirectionProvider` direction, so its left and right arrows follow reading direction in RTL.

## Screen readers
`confirm` is a Radix `alertdialog` named by its title (default "Are you sure?") and described by `description`; `prompt` and `choose` are `dialog`s named by `title` (a `prompt` without one uses a string `label`, else "Enter a value"; `choose` falls back to "Choose an option"). The `prompt` field is named by `label`, or by the title through `aria-label` when there is no `label`; a validation message sits in `FieldError`, sets `aria-invalid` and is linked as the field's description, and focus returns to the field. `choose` is a labelled radio group. The rest is `ConfirmDialog` and `Dialog` behaviour (the page is hidden from assistive technology while open).

## Reduced motion
The dialogs are the standard ones: a short fade and zoom (a slide from the bottom on small screens), and the reduced-motion net removes the movement and keeps the fade. The pending spinner on the confirm button keeps turning.

## Server rendering
The provider renders only its children on the server: no dialog exists until `confirm`, `prompt` or `choose` is called, which happens in handlers or effects on the client. The dialogs themselves are portalled after mount.

## Gotchas
- `useDialogs` and `useConfirm` throw outside a `DialogProvider`. Unmounting the provider resolves every open and queued dialog as cancelled (`false` or `null`), so no `await` hangs.
- `confirm`'s `onConfirm` may be async: the button shows a spinner and the dialog cannot be dismissed meanwhile. If it throws, the dialog stays open and the error is swallowed, so show your own message from the `catch`.
- `prompt` trims and requires a value by default (`trim` and `required` default to true; `required: false` can resolve `""`). `validate` keeps the dialog open only when it returns a non-empty string (the message); returning `false` accepts the value.
- `choose` resolves the picked option's own `value` (any type) and starts on `defaultValue`, else the first enabled option; disabled options cannot be picked. Cancel resolves `null` for `prompt` and `choose`, so test for `null` before using the answer.

## Example
```tsx
import * as React from "react";
import { Button, DialogProvider, useDialogs } from "@cleanprompt/sutra-ui";

function ProjectActions() {
  const { confirm, prompt } = useDialogs();
  const [name, setName] = React.useState<string | null>("Atlas");
  const rename = async () => {
    const next = await prompt({ title: "Rename project", label: "Project name", defaultValue: name ?? "" });
    if (next !== null) setName(next);
  };
  const remove = async () => {
    const ok = await confirm({ title: `Delete ${name}?`, description: "This cannot be undone.", confirmLabel: "Delete", tone: "destructive" });
    if (ok) setName(null);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{name ?? "Project deleted"}</span>
      <Button variant="outline" disabled={name === null} onClick={rename}>Rename</Button>
      <Button variant="destructive" disabled={name === null} onClick={remove}>Delete</Button>
    </div>
  );
}

export function Example() {
  return (
    <DialogProvider>
      <ProjectActions />
    </DialogProvider>
  );
}
```
