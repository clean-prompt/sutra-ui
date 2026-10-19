# ChatMessageActions

> Row of message actions, revealed when the parent ChatMessage is hovered or focused.

- Import: `import { ChatMessageActions } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message-actions` (kit `ai`)
- Part of [`ChatMessageAction`](ChatMessageAction.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `alwaysVisible` | `boolean` | `false` | Keep the row visible instead of revealing it on message hover. |
| `defaultReactions` | `EmojiReactionItem[]` |  | Initial reactions when `reactions` is not controlled; also turns on the reactions row. |
| `onReact` | `(emoji: string, reacted: boolean) => void` |  | Fired when the user adds or removes a reaction. Setting only this adds the toolbar button without a row. |
| `onReactionsChange` | `(reactions: EmojiReactionItem[]) => void` |  | Called with the new reaction list when the user adds or removes a reaction. |
| `reactionQuickPicks` | `readonly string[]` |  | Quick picks for the reaction picker. |
| `reactions` | `EmojiReactionItem[]` |  | Opt-in reactions (controlled). When `reactions` or `defaultReactions` is set, a ChatReactions row renders above the toolbar (always visible) and the toolbar gains an add-reaction button. |
