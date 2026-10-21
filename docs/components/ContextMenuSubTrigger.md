# ContextMenuSubTrigger

> Item that opens a nested sub-menu.

- Import: `import { ContextMenuSubTrigger } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/context-menu` (primitives)
- Part of [`ContextMenuSub`](ContextMenuSub.md)
- Also accepts the props of HTMLAttributes, MenuItemImplProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `React.ReactNode` |  | Icon shown at the start of the row. |
| `inset` | `boolean` |  | Indents the row to line up with rows that have an icon. |

## Notes

See the notes in [`ContextMenuSub`](ContextMenuSub.md#notes).

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
