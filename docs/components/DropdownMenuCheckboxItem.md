# DropdownMenuCheckboxItem

> Toggleable item with a check indicator.

- Import: `import { DropdownMenuCheckboxItem } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/dropdown-menu` (primitives)
- Part of [`DropdownMenu`](DropdownMenu.md)
- Also accepts the props of HTMLAttributes, MenuCheckboxItemProps, MenuItemImplProps, MenuItemProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `shortcut` | `React.ReactNode` |  | Shortcut hint shown at the end of the row (display only: it does not bind the keys). |

## Notes

See the notes in [`DropdownMenu`](DropdownMenu.md#notes).

## Example

```tsx
import * as React from "react";
import { Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem } from "@sutra/ui";
import { DropdownMenuSeparator, DropdownMenuTrigger } from "@sutra/ui";
import { RiDeleteBinLine, RiFileCopyLine, RiMoreLine } from "@sutra/ui/icons";

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
