# ChatListItem

> One conversation row with hover rename / delete actions and inline renaming.

**Deprecated:** Use `ConversationRow` (default `rowActions="inline"`).

- Import: `import { ChatListItem } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-list-view` (kit `ai`)
- Also accepts the props of HTMLAttributes, LiHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Chat title, shown on one line. |
| `actions` | `React.ReactNode` |  | Extra hover actions rendered before rename/delete. |
| `active` | `boolean` |  | Marks the row as the open chat (highlight and `aria-current`). |
| `onDelete` | `() => void` |  | Enables the delete action. |
| `onRename` | `(title: string) => void` |  | Enables the rename action; called with the trimmed new title. |
| `onSelect` | `() => void` |  | Called when the row is pressed. |
| `pinned` | `boolean` |  | Shows a pin icon before the title. |
