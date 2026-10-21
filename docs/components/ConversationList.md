# ConversationList

> Conversation sidebar: optional search, grouping by date or folder, archived section and inline or menu row actions.

- Import: `import { ConversationList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/conversation-list` (kit `ai`)
- `data-slot`: `conversation-list`, `conversation-list-search`, `conversation-list-nav`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `ConversationListItem[]` |  | Conversations to list, each with an id, title, date and optional folder, pinned and archived flags. |
| `activeId` | `string` |  | Id of the open conversation; its row is highlighted. |
| `archivedSection` | `boolean` | `true` | Collect archived items in a collapsed "Archived" section at the end. Default true. |
| `aria-label` | `string` | `"Conversations"` | Name of the navigation landmark. Default "Conversations"; give each list on a page its own name. |
| `defaultExpandedFolders` | `string[]` |  | Folder ids expanded initially. Default all. |
| `defaultSearch` | `string` | `""` | Initial search text when `search` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Shown when there is nothing to list (or no search matches). |
| `folders` | `ConversationFolder[]` | `[]` | Folders for `groupBy="folder"` and the "Move to" menu. |
| `groupBy` | `ConversationGroupBy` | `"date"` | `date`: Pinned / Today / … / Older. `folder`: Pinned / Folders / Chats. `none`: one flat list. Default `date`. |
| `now` | `Date` |  | Reference "now" for date grouping (useful for tests and SSR). |
| `onArchive` | `(id: string, archived: boolean) => void` |  | Called with the conversation id and the new archived state (menu rows only). |
| `onDelete` | `(id: string) => void` |  | Called with the conversation id when the user deletes one. |
| `onMove` | `(id: string, folderId: string \| null) => void` |  | Called with the conversation id and the target folder id, or `null` to remove it from its folder (menu rows only). |
| `onPin` | `(id: string, pinned: boolean) => void` |  | Called with the conversation id and the new pinned state (menu rows only). |
| `onRename` | `(id: string, title: string) => void` |  | Called with the conversation id and the trimmed new title when the user renames one. |
| `onRenameFolder` | `(folderId: string, name: string) => void` |  | Called with the folder id and the trimmed new name when the user renames a folder group. |
| `onSearchChange` | `(query: string) => void` |  | Called with the search text on every change. |
| `onSelect` | `(id: string) => void` |  | Called with the conversation id when a row is pressed. |
| `rowActions` | `ConversationRowActions` | `"inline"` | `inline`: hover rename / delete buttons. `menu`: a "⋯" menu with rename, pin, move, archive and delete. Default `inline`. |
| `search` | `string` |  | Controlled search text. |
| `searchable` | `boolean` | `false` | Show the search field. Default false. |
| `searchPlaceholder` | `string` | `"Search chats…"` | Placeholder of the search field. Default "Search chats…". |
