# CommandItem

> Selectable command row.

- Import: `import { CommandItem } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/patterns/command-menu` (patterns)
- Part of [`Command`](Command.md)
- Also accepts the props of HTMLAttributes, Children

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary line under the label. |
| `icon` | `React.ReactNode` |  | Icon shown at the start of the item. |
| `shortcut` | `React.ReactNode \| string[]` |  | Shortcut hint. A keys spec ("mod+n", "g t") renders platform-aware Kbd chips; an array renders one Kbd per entry (e.g. ["⌘", "N"]); any other node (or a glyph string like "⌘N") renders as text. |

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
