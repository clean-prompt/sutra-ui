---
component: DropdownMenu
module: primitives/dropdown-menu
covers: DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal
use: A menu of actions that opens from a trigger button. Rows take an `icon`, `description`, display-only `shortcut` and `tone="destructive"`, plus checkbox and radio rows and nested sub-menus.
instead: Select = the menu chooses a value for a form field; ContextMenu = the menu opens from a right-click on an area; SplitButton = a primary action with a menu of alternatives; Popover = rich content or a form rather than a list of actions
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Enter, Space, ArrowDown | On the trigger: Enter and Space toggle the menu, ArrowDown opens it (a left click opens it too) |
| ArrowDown, ArrowUp | Move the highlighted row; focus stops at the ends unless you pass `loop` to `DropdownMenuContent` |
| Home, End, PageUp, PageDown | Highlight the first or last row |
| A letter or digit | Typeahead: highlights the next row whose text starts with it |
| Enter, Space | Activate the highlighted row; a checkbox or radio row toggles or picks, and the menu closes |
| ArrowRight | On a sub-menu trigger: open it (Enter and Space do too) |
| ArrowLeft | Inside a sub-menu: close it and return to its trigger |
| Escape | Close the menu |
| Tab | Does nothing while the menu is open (Radix blocks it) |

In RTL the sub-menu keys swap: ArrowLeft opens a sub-menu and ArrowRight closes it, and the sub-menu opens to the left. `DropdownMenu` passes the document or `DirectionProvider` direction to Radix (an explicit `dir` prop wins). Focus returns to the trigger when the menu closes.

## Screen readers
The trigger gets `aria-haspopup="menu"`, `aria-expanded` and, while open, `aria-controls`. The panel is `role="menu"` labelled by the trigger; rows are `menuitem`, `menuitemcheckbox` and `menuitemradio` (with `aria-checked`), groups are `role="group"` and the separator is `separator`. `DropdownMenuLabel` is a plain text div that is not linked to its group, so give `DropdownMenuGroup` an `aria-label` to name it. A disabled row gets `aria-disabled`. The sub-menu chevron is `aria-hidden`; an `icon` you pass is not hidden for you. The `shortcut` text is read as part of the row name. An icon-only trigger needs `aria-label`.

## Reduced motion
The panel fades and zooms in from the trigger with the `animate-in` utilities and slides slightly from its side; the reduced-motion net removes the slide and the scale and keeps only the fade. Row highlight changes are instant by design.

## Server rendering
A closed menu renders only its trigger on both server and client, so nothing can mismatch. The panel is portalled into `<body>` after mount, so a menu with `defaultOpen` or `open` on first render appears after hydration. The panel carries its own `dir` (the document or `DirectionProvider` direction), but it is portalled outside a subtree `data-style`: set that on `<html>`.

## Gotchas
- `shortcut` is only a label: it does not bind any key. Wire the real shortcut yourself.
- `DropdownMenuItem` closes the menu on select; call `event.preventDefault()` in `onSelect` to keep it open (use `onSelect`, not `onClick`, for keyboard and pointer alike).
- `tone="destructive"` replaces the deprecated `variant="destructive"` (`tone` wins when both are set). With `asChild` the row styling applies but `icon`, `description` and `shortcut` are ignored: you render the content.
- `DropdownMenuContent` already wraps itself in a portal (`sideOffset` 6, `align="start"`), so `DropdownMenuPortal` is only for custom compositions. Radix `loop` defaults to off.

## Example
```tsx
import * as React from "react";
import { Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem } from "@cleanprompt/sutra-ui";
import { DropdownMenuSeparator, DropdownMenuTrigger } from "@cleanprompt/sutra-ui";
import { RiDeleteBinLine, RiFileCopyLine, RiMoreLine } from "@cleanprompt/sutra-ui/icons";

export function Example({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [pinned, setPinned] = React.useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Project actions">
          <RiMoreLine aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem icon={<RiFileCopyLine aria-hidden />} shortcut="Ctrl D" onSelect={onDuplicate}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>
          Pin to sidebar
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive" icon={<RiDeleteBinLine aria-hidden />} onSelect={onDelete}>
          Delete project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
