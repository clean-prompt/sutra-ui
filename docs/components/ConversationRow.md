# ConversationRow

> One conversation row: select button, inline rename and either hover icon buttons or a "⋯" action menu.

- Import: `import { ConversationRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/conversation-list` (kit `ai`)
- `data-slot`: `conversation-row`
- Also accepts the props of HTMLAttributes, LiHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Conversation title, shown on one line and used as the rename field's value. |
| `actions` | `React.ReactNode` |  | Extra hover actions rendered before the built-in ones. |
| `active` | `boolean` |  | Marks the row as the open conversation (highlight and `aria-current`). |
| `archived` | `boolean` |  | Flips the menu's Archive item to Unarchive. |
| `defaultEditing` | `boolean` | `false` | Initial state of the rename editor when `editing` is not controlled. |
| `editing` | `boolean` |  | Controlled state of the inline rename editor. |
| `folderId` | `string \| null` |  | Current folder, for the "Move to" submenu. |
| `folders` | `ConversationFolder[]` | `[]` | Targets for the "Move to" submenu. |
| `onArchive` | `(archived: boolean) => void` |  | Menu only: called with the new archived state. |
| `onDelete` | `() => void` |  | Called when the user chooses delete (hover button or menu item); the action is hidden when unset. |
| `onEditingChange` | `(editing: boolean) => void` |  | Called with the new state when the rename editor opens or closes. |
| `onMove` | `(folderId: string \| null) => void` |  | Menu only: called with the target folder id, or null to remove from its folder. |
| `onPin` | `(pinned: boolean) => void` |  | Menu only: called with the new pinned state. |
| `onRename` | `(title: string) => void` |  | Enables rename (button or menu item, double-click, inline editor); called with the trimmed new title. |
| `onSelect` | `() => void` |  | Called when the row is pressed. |
| `pinned` | `boolean` |  | Shows a pin icon before the title. |
| `renameLabel` | `string` | `"Conversation title"` | Accessible name of the rename field. Default "Conversation title". |
| `rowActions` | `ConversationRowActions` | `"inline"` | `inline`: hover icon buttons for rename / delete. `menu`: one "⋯" menu with every action. Default `inline`. |
