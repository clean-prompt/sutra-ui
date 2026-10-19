# ContextMenuCheckboxItem

> Toggleable item with a check indicator.

- Import: `import { ContextMenuCheckboxItem } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/context-menu` (primitives)
- Part of [`ContextMenu`](ContextMenu.md)
- Also accepts the props of HTMLAttributes, MenuCheckboxItemProps, MenuItemImplProps, MenuItemProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `shortcut` | `React.ReactNode` |  | Shortcut hint shown at the end of the row (display only: it does not bind the keys). |

## Notes

See the notes in [`ContextMenu`](ContextMenu.md#notes).

## Example

```tsx
import * as React from "react";
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem } from "@sutra/ui";
import { ContextMenuSeparator, ContextMenuTrigger } from "@sutra/ui";
import { RiDeleteBinLine, RiFileCopyLine } from "@sutra/ui/icons";

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
