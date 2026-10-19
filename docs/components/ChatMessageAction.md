# ChatMessageAction

> Compact icon button used inside ChatMessageActions.

- Import: `import { ChatMessageAction } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message-actions` (kit `ai`)
- Parts: [`ChatMessageActions`](ChatMessageActions.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | Accessible name, also shown as the native tooltip. |
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `pressed` | `boolean` |  | Marks the action as a toggled-on state (aria-pressed). |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

## Part props

### ChatMessageActions

Row of message actions, revealed when the parent ChatMessage is hovered or focused.

| Prop | Type | Default | Description |
|---|---|---|---|
| `alwaysVisible` | `boolean` | `false` | Keep the row visible instead of revealing it on message hover. |
| `defaultReactions` | `EmojiReactionItem[]` |  | Initial reactions when `reactions` is not controlled; also turns on the reactions row. |
| `onReact` | `(emoji: string, reacted: boolean) => void` |  | Fired when the user adds or removes a reaction. Setting only this adds the toolbar button without a row. |
| `onReactionsChange` | `(reactions: EmojiReactionItem[]) => void` |  | Called with the new reaction list when the user adds or removes a reaction. |
| `reactionQuickPicks` | `readonly string[]` |  | Quick picks for the reaction picker. |
| `reactions` | `EmojiReactionItem[]` |  | Opt-in reactions (controlled). When `reactions` or `defaultReactions` is set, a ChatReactions row renders above the toolbar (always visible) and the toolbar gains an add-reaction button. |
