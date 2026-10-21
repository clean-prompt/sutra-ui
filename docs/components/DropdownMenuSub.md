# DropdownMenuSub

> Sub-menu root.

- Import: `import { DropdownMenuSub } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/dropdown-menu` (primitives)
- Part of [`DropdownMenu`](DropdownMenu.md)
- Parts: [`DropdownMenuSubContent`](DropdownMenuSubContent.md), [`DropdownMenuSubTrigger`](DropdownMenuSubTrigger.md)
- Also accepts the props of DropdownMenuSubProps

## Props

No props of its own.

## Part props

### DropdownMenuSubTrigger

Item that opens a nested sub-menu.

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `React.ReactNode` |  | Icon shown at the start of the row. |
| `inset` | `boolean` |  | Indents the row to line up with rows that have an icon. |

## Notes

See the notes in [`DropdownMenu`](DropdownMenu.md#notes).

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
