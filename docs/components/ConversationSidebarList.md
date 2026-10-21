# ConversationSidebarList

> Sidebar chat list with pinned, folders (inline rename), archived and a per-row action menu.

**Deprecated:** Use `<ConversationList items={conversations} groupBy="folder" rowActions="menu" folders={…} />`.

- Import: `import { ConversationSidebarList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/conversation-sidebar` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `conversations` (required) | `SidebarConversation[]` |  | Conversations to list, each with an id, title and optional folder, pinned and archived flags. |
| `activeId` | `string` |  | Id of the open conversation; its row is highlighted. |
| `defaultExpandedFolders` | `string[]` |  | Folder ids expanded initially. Default all. |
| `folders` | `SidebarFolder[]` |  | Folders that conversations can be grouped into and moved to. |
| `onArchive` | `(id: string, archived: boolean) => void` |  | Called with the conversation id and the new archived state. |
| `onDelete` | `(id: string) => void` |  | Called with the conversation id when the user deletes one. |
| `onMove` | `(id: string, folderId: string \| null) => void` |  | Called with the conversation id and the target folder id, or `null` to remove it from its folder. |
| `onPin` | `(id: string, pinned: boolean) => void` |  | Called with the conversation id and the new pinned state. |
| `onRename` | `(id: string, title: string) => void` |  | Called with the conversation id and the trimmed new title when the user renames one. |
| `onRenameFolder` | `(folderId: string, name: string) => void` |  | Called with the folder id and the trimmed new name when the user renames a folder. |
| `onSelect` | `(id: string) => void` |  | Called with the conversation id when a row is pressed. |

## Example (live: `#/components/ai-extras/conversation-sidebar` in the playground)

```tsx
import * as React from "react";
import { ConversationSidebarList } from "@cleanprompt/sutra-ui/ai";

function ConversationSidebarDemo() {
  const [folders, setFolders] = React.useState<SidebarFolder[]>([
    { id: "work", name: "Work" },
    { id: "learning", name: "Learning" },
  ]);
  const [items, setItems] = React.useState<SidebarConversation[]>([
    { id: "1", title: "Trip to Kyoto: 5-day plan", pinned: true },
    { id: "2", title: "Quarterly OKR draft", folderId: "work" },
    { id: "3", title: "Postgres index tuning", folderId: "work" },
    { id: "4", title: "Rust lifetimes, explained", folderId: "learning" },
    { id: "5", title: "Sourdough schedule" },
    { id: "6", title: "Birthday gift ideas for Maya" },
    { id: "7", title: "Car insurance comparison" },
    { id: "8", title: "Old resume rewrite", archived: true },
  ]);
  const [active, setActive] = React.useState("5");
  const patch = (id: string, p: Partial<SidebarConversation>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <>
      <div className="h-96 w-72 overflow-y-auto rounded-box border border-border bg-subtle p-2">
        <ConversationSidebarList
          conversations={items}
          folders={folders}
          activeId={active}
          onSelect={setActive}
          onRename={(id, title) => patch(id, { title })}
          onPin={(id, pinned) => patch(id, { pinned })}
          onMove={(id, folderId) => patch(id, { folderId })}
          onArchive={(id, archived) => patch(id, { archived, pinned: false })}
          onDelete={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
          onRenameFolder={(id, name) => setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, name } : f)))}
        />
      </div>
    </>
  );
}
```
