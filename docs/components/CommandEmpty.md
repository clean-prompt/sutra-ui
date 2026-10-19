# CommandEmpty

> Shown when no items match (beside the list, in a live region, so the list never has to be an empty listbox).

- Import: `import { CommandEmpty } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/patterns/command-menu` (patterns)
- Part of [`Command`](Command.md)
- Also accepts the props of HTMLAttributes, Children

## Props

No props of its own.

## Notes

See the notes in [`Command`](Command.md#notes).

## Example

```tsx
import * as React from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, useCommandMenuShortcut } from "@sutra/ui";

export function Example() {
  const [open, setOpen] = React.useState(false);
  useCommandMenuShortcut(setOpen);
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput aria-label="Search commands" placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem value="dashboard" onSelect={() => setOpen(false)}>
            Dashboard
          </CommandItem>
          <CommandItem value="settings" shortcut="g t" onSelect={() => setOpen(false)}>
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```
