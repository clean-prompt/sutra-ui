# ChatMessage

> A single chat turn. Compose with ChatMessageAvatar, ChatMessageBody, ChatMessageContent and friends.

- Import: `import { ChatMessage } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message` (kit `ai`)
- Parts: [`ChatMessageAvatar`](ChatMessageAvatar.md), [`ChatMessageBody`](ChatMessageBody.md), [`ChatMessageContent`](ChatMessageContent.md), [`ChatMessageFooter`](ChatMessageFooter.md), [`ChatMessageHeader`](ChatMessageHeader.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `role` | `ChatMessageRole` | `"assistant"` | Who wrote the message: `user`, `assistant` or `system`; sets alignment and styling. |
| `streaming` | `boolean` | `false` | Shows a blinking caret after the content while the reply streams in. |
| `variant` | `ChatMessageVariant` | `"bubble"` | bubble: user messages sit right-aligned in a soft bubble · flat: every message is left-aligned with no bubble. |

## Part props

### ChatMessageAvatar

Circular `Avatar` for a chat turn: image, initials, or the Sutra spark for assistant messages.

| Prop | Type | Default | Description |
|---|---|---|---|
| `alt` | `string` |  | Alt text of the image and label of the initials fallback. Defaults to `name`; `""` marks the avatar decorative (use it beside a visible name). |
| `color` | `string` |  | Explicit fallback colour (any CSS colour); overrides the colour derived from `name`. |
| `colorful` | `boolean` |  | Colorize the initials fallback deterministically from `name` (via `colorForSeed`). Default true. |
| `fallback` | `React.ReactNode` |  | Custom fallback content (overrides initials / the assistant spark). |
| `fallbackClassName` | `string` |  | Extra classes for the fallback (initials / icon) layer. |
| `frameClassName` | `string` |  | Extra classes for the inner image/fallback frame. |
| `initialsOptions` | `InitialsOptions` |  | Options for the auto initials (e.g. `{ singleWord: 2 }` → "Ma" for "Maya"). |
| `name` | `string` |  | Used for initials when there is no image. |
| `ring` | `boolean` |  | Adds a ring in the background color (useful when overlapping). |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Avatar size. |
| `src` | `string` |  | Image URL; the initials fallback shows while it loads or when it fails. |
| `variant` | `AvatarVariant` |  | How the colour is applied to the fallback. Default `soft`. |

### ChatMessageContent

Message text: soft bubble for user turns, flowing prose for assistant turns.

| Prop | Type | Default | Description |
|---|---|---|---|
| `components` | `MarkdownProps["components"]` |  | Custom markdown renderers, forwarded to `Markdown`. |
| `markdown` | `boolean` | `false` | Render string children as markdown. |
| `streaming` | `boolean` |  | Overrides the message's streaming caret. |

### ChatMessageHeader

Sender name and time above the content.

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `React.ReactNode` |  | Author name, shown before the timestamp. |
| `timestamp` | `Date \| string \| number` |  | A Date / timestamp (formatted as a short time) or a preformatted string. |

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
