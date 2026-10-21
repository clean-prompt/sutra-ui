# ChatReactions

> Reaction row under a chat message: emoji pills with counts and reacted state, plus an add-reaction picker.

- Import: `import { ChatReactions } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message-actions` (kit `ai`)
- `data-slot`: `chat-reactions`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `addLabel` | `string` | `"Add reaction"` | Accessible name of the add-reaction button. Default "Add reaction". |
| `defaultReactions` | `EmojiReactionItem[]` | `[]` | Initial reactions when `reactions` is not controlled. |
| `onReact` | `(emoji: string, reacted: boolean) => void` |  | Fired when the current user adds or removes a reaction. |
| `onReactionsChange` | `(reactions: EmojiReactionItem[]) => void` |  | Called with the new reaction list when the user adds or removes a reaction. |
| `onToggle` | `(emoji: string) => void` |  | Intercept pill clicks (the caller updates the list itself). |
| `quickPicks` | `readonly string[]` |  | Quick picks at the top of the picker. |
| `reactions` | `EmojiReactionItem[]` |  | Reactions (controlled). |
| `readOnly` | `boolean` | `false` | Hide the add-reaction button. |
| `size` | `"sm" \| "md"` | `"sm"` | Size of the reaction pills and the add button. |
