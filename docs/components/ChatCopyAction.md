# ChatCopyAction

> Copies the message text and briefly flips to a check mark.

- Import: `import { ChatCopyAction } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message-actions` (kit `ai`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` (required) | `string` |  | Text to copy. |
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `label` | `string` | `"Copy"` | Accessible name and tooltip of the button. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `onCopy` | `(text: string) => void` |  | Called with the text after it has been copied. |
| `pressed` | `boolean` |  | Marks the action as a toggled-on state (aria-pressed). |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

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
