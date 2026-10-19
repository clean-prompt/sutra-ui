# DropdownMenuItem

> Actionable menu row with optional icon, description and shortcut.

- Import: `import { DropdownMenuItem } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/dropdown-menu` (primitives)
- Part of [`DropdownMenu`](DropdownMenu.md)
- Also accepts the props of HTMLAttributes, MenuItemImplProps, MenuItemProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary line under the label. |
| `icon` | `React.ReactNode` |  | Icon shown at the start of the row. |
| `inset` | `boolean` |  | Indents the row to line up with rows that have an icon. |
| `shortcut` | `React.ReactNode` |  | Shortcut hint shown at the end of the row (display only: it does not bind the keys). |
| `tone` | `"neutral" \| "destructive"` |  | `destructive` colours the row red for dangerous actions. Default `neutral`. |
| `variant` | `"default" \| "destructive"` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |

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
