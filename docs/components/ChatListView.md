# ChatListView

> Sidebar list of conversations grouped by recency, with search and inline rename / delete.

**Deprecated:** Use `<ConversationList groupBy="date" searchable rowActions="inline" archivedSection={false} />`.

- Import: `import { ChatListView } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-list-view` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `ChatListItemData[]` |  | Chats to list, each with an id, title and date; grouped by recency. |
| `activeId` | `string` |  | Id of the open chat; its row is highlighted. |
| `defaultSearch` | `string` |  | Initial search text when `search` is not controlled. |
| `emptyMessage` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no items (or no search matches). |
| `now` | `Date` |  | Reference "now" for date grouping (useful for tests and SSR). |
| `onDelete` | `(id: string) => void` |  | Called with the chat id when the user deletes a chat; the delete action is hidden when unset. |
| `onRename` | `(id: string, title: string) => void` |  | Called with the chat id and the trimmed new title when the user renames a chat; the rename action is hidden when unset. |
| `onSearchChange` | `(query: string) => void` |  | Called with the search text on every change. |
| `onSelect` | `(id: string) => void` |  | Called with the chat id when a row is pressed. |
| `search` | `string` |  | Controlled search text. |
| `searchable` | `boolean` | `true` | Show the search field (default true). |
| `searchPlaceholder` | `string` |  | Placeholder of the search field. |
