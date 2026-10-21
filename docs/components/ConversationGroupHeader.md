# ConversationGroupHeader

> Collapsible group / folder header with a count, inline rename and trailing actions.

- Import: `import { ConversationGroupHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/conversation-list` (kit `ai`)
- `data-slot`: `conversation-group-header`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `expanded` (required) | `boolean` |  | Whether the group is open; sets `aria-expanded` and the chevron direction. |
| `name` (required) | `string` |  | Group name, shown in the header and used as the rename field's value. |
| `actions` | `React.ReactNode` |  | Trailing buttons, hidden while renaming. |
| `controlsId` | `string` |  | Id of the list this header expands (sets `aria-controls` while expanded). |
| `count` | `number` |  | Number of conversations in the group, shown beside the name. |
| `defaultEditing` | `boolean` | `false` | Initial state of the rename editor when `editing` is not controlled. |
| `editing` | `boolean` |  | Controlled state of the inline rename editor. |
| `icon` | `React.ReactNode` |  | Icon after the chevron (e.g. a folder). |
| `inputClassName` | `string` |  | Extra classes for the rename field. |
| `onEditingChange` | `(editing: boolean) => void` |  | Called with the new state when the rename editor opens or closes. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user presses the header. |
| `onRename` | `(name: string) => void` |  | Enables double-click rename (and the pencil button); called with the trimmed new name. |
| `renameButton` | `boolean` |  | Show a pencil button on hover. Default true when `onRename` is set. |
| `renameButtonLabel` | `string` |  | Accessible name of the pencil button. Default "Rename {name}". |
| `renameLabel` | `string` | `"Group name"` | Accessible name of the rename field. Default "Group name". |
| `triggerClassName` | `string` |  | Extra classes for the toggle button. |
| `triggerId` | `string` |  | Id for the toggle button. |
