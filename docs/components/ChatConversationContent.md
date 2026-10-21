# ChatConversationContent

> Scrollable message column. Put ChatMessage elements inside.

- Import: `import { ChatConversationContent } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-conversation` (kit `ai`)
- `data-slot`: `chat-conversation-viewport`, `chat-conversation-content`
- Part of [`ChatConversation`](ChatConversation.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `viewportClassName` | `string` |  | Classes for the scrolling viewport (the outer element). `className` styles the inner message column. |
