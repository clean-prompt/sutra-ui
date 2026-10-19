# CommandPaletteFromRegistry

> Command palette listing every registered shortcut as a runnable command.

- Import: `import { CommandPaletteFromRegistry } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/patterns/command-menu` (patterns)
- Part of [`Command`](Command.md)
- Also accepts the props of DialogProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | Extra items rendered above the registry groups. |
| `className` | `string` |  | Classes for the palette panel. |
| `commandProps` | `React.ComponentPropsWithoutRef<typeof CommandPrimitive>` |  | Props passed to the inner `Command` (e.g. `filter`, `shouldFilter`, `loop`). |
| `description` | `string` |  | Accessible description (visually hidden). |
| `emptyState` | `React.ReactNode` |  | Shown when nothing matches. Default "No commands found". |
| `emptyText` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Legacy name of `emptyState`. |
| `keys` | `string \| null` | `"mod+k"` | Shortcut that toggles the palette. Default "mod+k"; `null` disables. |
| `onRun` | `(command: ShortcutRegistryItem) => void` |  | Called after a command runs. |
| `placeholder` | `string` | `"Type a command or search…"` | Placeholder of the search input. |
| `showFooter` | `boolean` |  | Render the keyboard hints footer. Default true. |
| `title` | `string` |  | Accessible title (visually hidden). |

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
