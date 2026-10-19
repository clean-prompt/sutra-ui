---
component: SearchTrigger
module: patterns/search-trigger
use: A button that looks like a search field, with placeholder text and the shortcut as key chips ("Ctrl K", or the command key on macOS). Clicking it, or pressing the shortcut when `hotkey` is on, calls `onTrigger`, where you open your command palette.
instead: SearchInput = a real text field you type into; CommandDialog = the palette this opens; FilterBarSearch = a search field that filters a list in place; Button = any other action; Combobox = pick a value from a searchable list
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the button |
| Enter, Space | Press it: calls `onClick`, then `onTrigger` (not if `onClick` calls `preventDefault`) |
| The `shortcut` (default Ctrl or Cmd+K) | With `hotkey`, calls `onTrigger` from anywhere on the page and stops the browser's own handling |

A `mod+` chord also fires while typing in an input, a textarea or an editable element; a plain key such as `/` is ignored there and fires elsewhere. On macOS `mod` is the command key and Ctrl is ignored. Nothing depends on arrow keys, so RTL changes nothing.

## Screen readers
- It is a native `button` named by `label`, else by the placeholder text ("Search…"). The search icon and the key chips are `aria-hidden`, so the shortcut does not become part of the name.
- The shortcut is exposed as a description ("Shortcut: Control K", from a single combination, not for key sequences) and through `aria-keyshortcuts` ("Meta+K Control+K").
- With `collapseBelow`, an icon-only button named `label` or "Search" replaces the field below that breakpoint; both exist in the page and CSS hides one.

## Reduced motion
Only a colour and border transition on hover, which the global net ends within 1 ms. Static otherwise.

## Server rendering
The shortcut chips depend on the platform, found with `navigator` in the first client render (the server assumes a non-Mac), so a Mac user's first client render shows the command key where the server HTML has "Ctrl". Inside a `ShortcutProvider` the provider's platform is used on both sides. The hotkey listener is attached in an effect.

## Slots
- `search-trigger`: the field-shaped button

## Gotchas
- It opens nothing itself: `onTrigger` (also called by the hotkey) is where you set your palette's `open`. Pair it with `CommandDialog` by setting its `open` in `onTrigger`.
- `hotkey` defaults to off, so the chips are only a hint until you turn it on. Inside a `ShortcutProvider` it registers as "Search" in the shortcut registry; otherwise it listens on `document`.
- `shortcut` is a keys spec (`"mod+k"`, `"/"`, `"g t"`); the same value draws the chips and sets the hotkey.
- The field has `max-w-72` and takes the full width up to it; `size` is `sm` 32 px, `md` 36 px (default) or `lg` 40 px, and `className` is merged last.

## Example
```tsx
import * as React from "react";
import { CommandDialog, CommandEmpty, CommandInput, CommandList, SearchTrigger } from "@sutra/ui";

export function Example() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <SearchTrigger placeholder="Search docs…" hotkey onTrigger={() => setOpen(true)} />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput aria-label="Search docs" placeholder="Search docs…" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```
