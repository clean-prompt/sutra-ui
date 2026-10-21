# MessageBubble

> Human-to-human chat bubble with grouping radii, delivery ticks, reply quote, reactions and rich previews.

- Import: `import { MessageBubble } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/kits/social/messenger-bubble` (kit `social`)
- `data-slot`: `message-bubble`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `attachment` | `React.ReactNode` |  | Rich shared-item preview rendered above the text. |
| `avatar` | `React.ReactNode` |  | Avatar shown beside the last incoming bubble of a group. Space is reserved on other positions. |
| `direction` | `MessageDirection` | `"incoming"` | `incoming` aligns the bubble to the start, `outgoing` to the end with the accent fill. |
| `edited` | `boolean` |  | Shows an "edited" mark in the footer. |
| `onReactionToggle` | `(emoji: string, reacted: boolean) => void` |  | Called with the emoji and the new reacted state when the user presses a reaction pill. |
| `onReplyClick` | `() => void` |  | Called when the user presses the quoted reply, for example to scroll to the original. |
| `onRetry` | `() => void` |  | Called when the user presses Retry on a `failed` message; the button is hidden when unset. |
| `position` | `MessageGroupPosition` | `"single"` | Place in a run of messages from one sender (`single`, `first`, `middle`, `last`); shapes the corners. |
| `reactions` | `MessageReactionSummary[]` |  | Reaction pills under the bubble, each with an emoji, count and whether you reacted. |
| `replyTo` | `MessageReplyTo` |  | Quoted message this one replies to, shown above the text. |
| `senderName` | `string` |  | Sender name shown above the first incoming bubble of a group (group chats). |
| `showTimestamp` | `boolean` | `true` | Show the time inside the bubble footer. Default true. |
| `status` | `MessageDeliveryStatus` |  | Delivery state of an outgoing message; shows the tick icon in the footer. |
| `timestamp` | `Date \| number \| string` |  | Time of the message (Date, epoch ms or ISO string), shown in the footer when `showTimestamp`. |
