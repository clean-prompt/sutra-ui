# ChatMessageBody

> Column that stacks header, content and footer next to the avatar.

- Import: `import { ChatMessageBody } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message` (kit `ai`)
- Part of [`ChatMessage`](ChatMessage.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Example (live: `#/components/chat-extras/reactions` in the playground)

```tsx
import * as React from "react";
import {
  ChatCopyAction,
  ChatMessage,
  ChatMessageActions,
  ChatMessageAvatar,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageFooter,
  ChatReactions,
  MessageTimestampHover,
} from "@sutra/ui/ai";

function ReactionsDemo() {
  const [reactions, setReactions] = React.useState<EmojiReactionItem[]>([
    { emoji: "👍", count: 3, reacted: true },
    { emoji: "🎉", count: 1 },
  ]);
  const now = React.useMemo(() => Date.now(), []);
  return (
    <>
      <ChatMessage role="assistant" variant="flat">
        <ChatMessageAvatar />
        <ChatMessageBody>
          <div className="flex items-center gap-2 text-sm font-medium">
            Sutra <MessageTimestampHover date={now - 4 * 60_000} />
          </div>
          <ChatMessageContent>The migration finished: 12 tables updated, no data loss.</ChatMessageContent>
          <ChatReactions reactions={reactions} onReactionsChange={setReactions} />
          <ChatMessageFooter>
            <ChatMessageActions>
              <ChatCopyAction text="The migration finished" />
            </ChatMessageActions>
          </ChatMessageFooter>
        </ChatMessageBody>
      </ChatMessage>
      <ChatMessage role="assistant" variant="flat">
        <ChatMessageAvatar />
        <ChatMessageBody>
          <div className="flex items-center gap-2 text-sm font-medium">
            Sutra <MessageTimestampHover date={now - 26 * 3600_000} alwaysVisible />
          </div>
          <ChatMessageContent>Reactions built into the actions row (opt-in via `defaultReactions`).</ChatMessageContent>
          <ChatMessageFooter>
            <ChatMessageActions defaultReactions={[{ emoji: "🔥", count: 2 }]}>
              <ChatCopyAction text="Reactions built in" />
            </ChatMessageActions>
          </ChatMessageFooter>
        </ChatMessageBody>
      </ChatMessage>
    </>
  );
}
```
