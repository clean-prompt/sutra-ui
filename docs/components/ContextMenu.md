# ContextMenu

> Context (right-click) menu root: Radix `ContextMenu.Root` with the reading direction filled in.

- Import: `import { ContextMenu } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/context-menu` (primitives)
- Parts: [`ContextMenuCheckboxItem`](ContextMenuCheckboxItem.md), [`ContextMenuContent`](ContextMenuContent.md), [`ContextMenuGroup`](ContextMenuGroup.md), [`ContextMenuItem`](ContextMenuItem.md), [`ContextMenuLabel`](ContextMenuLabel.md), [`ContextMenuRadioGroup`](ContextMenuRadioGroup.md), [`ContextMenuRadioItem`](ContextMenuRadioItem.md), [`ContextMenuSeparator`](ContextMenuSeparator.md), [`ContextMenuShortcut`](ContextMenuShortcut.md), [`ContextMenuSub`](ContextMenuSub.md), [`ContextMenuSubContent`](ContextMenuSubContent.md), [`ContextMenuSubTrigger`](ContextMenuSubTrigger.md), [`ContextMenuTrigger`](ContextMenuTrigger.md)
- Also accepts the props of ContextMenuProps

## Props

No props of its own.

## Part props

### ContextMenuCheckboxItem

Toggleable item with a check indicator.

| Prop | Type | Default | Description |
|---|---|---|---|
| `shortcut` | `React.ReactNode` |  | Shortcut hint shown at the end of the row (display only: it does not bind the keys). |

### ContextMenuItem

Actionable menu row with optional icon, description and shortcut.

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary line under the label. |
| `icon` | `React.ReactNode` |  | Icon shown at the start of the row. |
| `inset` | `boolean` |  | Indents the row to line up with rows that have an icon. |
| `shortcut` | `React.ReactNode` |  | Shortcut hint shown at the end of the row (display only: it does not bind the keys). |
| `tone` | `"neutral" \| "destructive"` |  | `destructive` colours the row red for dangerous actions. Default `neutral`. |
| `variant` | `"default" \| "destructive"` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |

### ContextMenuLabel

Non-interactive section label.

| Prop | Type | Default | Description |
|---|---|---|---|
| `inset` | `boolean` |  | Indents the label to line up with rows that have an icon. |

### ContextMenuSubTrigger

Item that opens a nested sub-menu.

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `React.ReactNode` |  | Icon shown at the start of the row. |
| `inset` | `boolean` |  | Indents the row to line up with rows that have an icon. |

## Notes

**When to use:** A menu of actions that opens at the pointer on right-click or touch long-press over an area, for rows, canvases, files and cards. It shares its rows and styling with `DropdownMenu`.

**Use instead when:**
- `DropdownMenu`: a visible trigger button opens the menu
- `Popover`: rich content or a form
- `Select`: choosing a value for a field

### Keyboard

| Key | Action |
|---|---|
| ArrowDown, ArrowUp | Move the highlighted row; focus stops at the ends unless you pass `loop` to `ContextMenuContent` |
| Home, End, PageUp, PageDown | Highlight the first or last row |
| A letter or digit | Typeahead: highlights the next row whose text starts with it |
| Enter, Space | Activate the highlighted row, or toggle or pick a checkbox or radio row; the menu closes |
| ArrowRight | On a sub-menu trigger: open it (Enter and Space do too) |
| ArrowLeft | Inside a sub-menu: close it and return to its trigger |
| Escape | Close the menu |
| Tab | Does nothing while the menu is open |

The trigger is a plain `<span>` with no tab stop, and Radix opens the menu only from a `contextmenu` event (right click) or a 700 ms touch or pen press. Keyboard users cannot reach it from Tab, so offer the same actions elsewhere (a `DropdownMenu` button). In RTL ArrowLeft opens a sub-menu and ArrowRight closes it.

### Screen readers

The panel is `role="menu"`; rows are `menuitem`, `menuitemcheckbox` and `menuitemradio` with `aria-checked`, groups are `role="group"`, and a disabled row gets `aria-disabled`. The trigger area gets no role or hint, so a screen reader user is not told a context menu exists: describe it or add a visible alternative. The sub-menu trigger has `aria-haspopup="menu"` and `aria-expanded`. The check and chevron icons are `aria-hidden`; the radio dot is an empty span.

### Reduced motion

The panel fades and zooms in from the pointer with the `animate-in` utilities; the reduced-motion net removes the slide and the scale and keeps only the fade. Rows highlight instantly.

### Server rendering

Server render: same markup as the client. The trigger span renders on the server; the menu does not exist until a `contextmenu` event, and its panel is portalled after mount. Nothing differs between server and client.

### Gotchas

- A touch long-press opens the menu after 700 ms and cancels if the finger moves; mouse users need the right button (the `contextmenu` event).
- `modal` defaults to true: while the menu is open, pointer events outside it are blocked and focus is trapped. Pass `modal={false}` on `ContextMenu` to keep the page interactive.
- Unlike `DropdownMenuContent`, `ContextMenuContent` has no `sideOffset` or `align` defaults: the menu opens at the cursor. `ContextMenuTrigger` renders a `<span>`: pass `asChild` to use your own element, and make it a block or give it a size so the whole area responds.
- `shortcut` is display only, `tone="destructive"` replaces the deprecated `variant`, and with `asChild` on `ContextMenuItem` the `icon`, `description` and `shortcut` props are ignored.

## Example

```tsx
import * as React from "react";
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem } from "@cleanprompt/sutra-ui";
import { ContextMenuSeparator, ContextMenuTrigger } from "@cleanprompt/sutra-ui";
import { RiDeleteBinLine, RiFileCopyLine } from "@cleanprompt/sutra-ui/icons";

export function Example({ onCopy, onDelete }: { onCopy: () => void; onDelete: () => void }) {
  const [starred, setStarred] = React.useState(false);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex h-32 max-w-sm items-center justify-center rounded-box border border-dashed text-sm text-muted-foreground">
          Right-click or long-press this file
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem icon={<RiFileCopyLine aria-hidden />} shortcut="Ctrl C" onSelect={onCopy}>
          Copy link
        </ContextMenuItem>
        <ContextMenuCheckboxItem checked={starred} onCheckedChange={setStarred}>
          Starred
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem tone="destructive" icon={<RiDeleteBinLine aria-hidden />} onSelect={onDelete}>
          Delete file
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```
