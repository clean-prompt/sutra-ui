# ChatConversation

> Message viewport with stick-to-bottom scrolling. Give it a height (or place it in a flex column).

- Import: `import { ChatConversation } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-conversation` (kit `ai`)
- Parts: [`ChatConversationContent`](ChatConversationContent.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `initial` | `ScrollBehavior \| false` |  | Scroll behavior for the first jump to the bottom on mount. |
| `resize` | `ScrollBehavior` |  | Scroll behavior used when content grows while stuck to the bottom. |
| `threshold` | `number` |  | Distance in px from the bottom that still counts as "at bottom". |

## Part props

### ChatConversationContent

Scrollable message column. Put ChatMessage elements inside.

| Prop | Type | Default | Description |
|---|---|---|---|
| `viewportClassName` | `string` |  | Classes for the scrolling viewport (the outer element). `className` styles the inner message column. |
