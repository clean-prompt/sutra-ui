# CommandDialog

> Top-anchored command palette in a modal dialog.

- Import: `import { CommandDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/patterns/command-menu` (patterns)
- Part of [`Command`](Command.md)
- Also accepts the props of DialogProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the palette panel. |
| `commandProps` | `React.ComponentPropsWithoutRef<typeof CommandPrimitive>` |  | Props passed to the inner `Command` (e.g. `filter`, `shouldFilter`, `loop`). |
| `description` | `string` | `"Search for a command to run"` | Accessible description (visually hidden). |
| `showFooter` | `boolean` | `true` | Render the keyboard hints footer. Default true. |
| `title` | `string` | `"Command menu"` | Accessible title (visually hidden). |

## Notes

**When to use:** A command palette: a top-anchored modal with a search field and a filtered, keyboard-driven list of commands (built on cmdk). `Command` and its parts also work inline without the dialog; `CommandPaletteFromRegistry` fills it from the registered shortcuts, and `useCommandMenuShortcut` opens it with Ctrl or Cmd+K.

**Use instead when:**
- `Dialog`: a modal with your own content
- `Combobox`: pick a value for a form field
- `SearchTrigger`: the button that opens a palette
- `Popover`: a small floating panel
- `DropdownMenu`: a short list of actions on a button

### Keyboard

| Key | Action |
|---|---|
| Ctrl+K, Cmd+K | Open or close it, when `useCommandMenuShortcut` is used (the letter is its second argument) |
| ArrowDown, ArrowUp | Highlight the next or previous item; wraps around (`loop`) |
| Alt+ArrowDown, Alt+ArrowUp | Jump to the next or previous group |
| Cmd+ArrowDown, Cmd+ArrowUp | Jump to the last or first item |
| Home, End | First or last item (they do not move the text caret) |
| Enter | Run the highlighted item (`onSelect`) |
| Escape | Close; focus returns to what had it before, also when opened by a hotkey |
| Tab | Stays inside the dialog; the search field is its only tab stop |

The list is vertical, so the arrows do not swap in RTL. The panel centres itself with logical offsets, and shortcut chips sit at the inline end.

### Screen readers

- The dialog is `role="dialog"` named by the hidden `title` (default "Command menu"), with a hidden `description`. Focus is on the search field, a `combobox` with `aria-activedescendant` pointing at the highlighted `option` of a `listbox`; options carry `aria-selected`.
- An explicit `aria-label` on `CommandInput` wins over the title as its name. Group headings are `aria-hidden` and the group is labelled by them.
- With no match, the empty listbox is hidden and `CommandEmpty` is announced from a polite live region beside it, never from an empty listbox. A `forceMount` item stays as a real option.
- `CommandLoading` is a `progressbar` named by its `label` ("Loading..."); its children are `aria-hidden`.

### Reduced motion

The panel fades and zooms in from the top (`animate-in`), and the list height and the highlight animate with 150 ms transitions. The global net removes the movement and ends the rest in 1 ms.

### Server rendering

Server render: same markup as the client. A closed dialog renders nothing on the server or the client (the panel is portalled), and one that is `open` on first render appears after hydration. `useCommandMenuShortcut` only attaches its listener in an effect. An inline `Command` renders on the server, but `CommandEmpty` appears only after the list has mounted.

### Slots

- `command-empty`: the live region beside the list that holds `CommandEmpty`

### Gotchas

- `CommandDialog` has no trigger: control it with `open` and `onOpenChange` (or `defaultOpen`). `useCommandMenuShortcut(setOpen)` toggles; inside a `ShortcutProvider` it registers as "Command menu" and works from inputs, otherwise it uses its own document listener and skips events another handler already prevented.
- The dialog sets `loop` and `vimBindings={false}` on its `Command` (so Ctrl+K can close it); a bare `Command` keeps cmdk's defaults, where Ctrl+N, J, P and K move the highlight. Pass your own through `commandProps`.
- Filtering is cmdk's fuzzy match on each item's `value` (or its text); `onSelect` receives that value. Use `shouldFilter={false}` in `commandProps` for server-side results.
- `CommandPaletteFromRegistry` lists shortcuts registered with `useShortcut`, so it is empty without a `ShortcutProvider`. It closes first and runs the command on the next tick so focus can return.

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
