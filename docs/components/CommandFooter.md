# CommandFooter

> Keyboard hints bar: ↑↓ navigate, ↵ select, esc close.

- Import: `import { CommandFooter } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/patterns/command-menu` (patterns)
- Part of [`Command`](Command.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Notes

See the notes in [`Command`](Command.md#notes).

## Example

```tsx
import * as React from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, useCommandMenuShortcut } from "@cleanprompt/sutra-ui";

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
