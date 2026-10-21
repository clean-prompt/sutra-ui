# MessageList

> Scrolling conversation with day separators, an unread divider and grouped bubbles.

- Import: `import { MessageList } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/kits/social/messenger` (kit `social`)
- `data-slot`: `message-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentUserId` (required) | `string` |  | Messages from this sender render as outgoing. |
| `messages` (required) | `MessengerMessage[]` |  | Messages in order, oldest first; grouped into runs by sender and time. |
| `autoScroll` | `boolean` | `true` | Keep scrolled to the newest message. Default true. |
| `firstUnreadId` | `string` |  | Id of the first unread message; an "unread" divider is drawn above it. |
| `now` | `Date` |  | Reference time for date dividers; set it in tests and SSR for stable output. |
| `onReactionToggle` | `(message: MessengerMessage, emoji: string, reacted: boolean) => void` |  | Called with the message, the emoji and the new reacted state when the user presses a reaction pill. |
| `onRetry` | `(message: MessengerMessage) => void` |  | Called with the message when the user retries a failed one. |
| `showSenders` | `boolean` |  | Show sender names and avatars on incoming groups (group chats). |
| `users` | `Record<string, MessengerUser>` | `{}` | Sender details by user id (name and avatar), used for sender names and avatars in group chats. |
| `windowMs` | `number` |  | Largest gap in ms between messages that still share a run. Default 300000 (5 minutes). |

## Example (live: `#/components/social/messenger` in the playground)

```tsx
import * as React from "react";
import { MessageComposer, MessageList, MessengerHeader } from "@sutra/ui/social";

function MessengerDemo() {
  const [messages, setMessages] = React.useState(initialMessages);
  const setStatus = (id: string, status: MessengerMessage["status"]) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, status } : m)));

  const deliver = (id: string) => {
    setStatus(id, "sending");
    setTimeout(() => setStatus(id, "sent"), 600);
    setTimeout(() => setStatus(id, "delivered"), 1400);
    setTimeout(() => setStatus(id, "read"), 2600);
  };

  return (
    <div className="mx-auto flex h-[640px] w-full max-w-md flex-col overflow-hidden rounded-box border border-border bg-subtle">
      <MessengerHeader
        name="Ana Lima"
        presence="online"
        onBack={() => {}}
        onVoiceCall={() => {}}
        onVideoCall={() => {}}
        onInfo={() => {}}
      />
      <MessageList
        className="flex-1"
        messages={messages}
        currentUserId="me"
        firstUnreadId="m7"
        onRetry={(m) => deliver(m.id)}
        onReactionToggle={(m, emoji, reacted) =>
          setMessages((list) =>
            list.map((x) =>
              x.id === m.id
                ? { ...x, reactions: (x.reactions ?? []).map((r) => (r.emoji === emoji ? { ...r, reacted, count: r.count + (reacted ? 1 : -1) } : r)) }
                : x
            )
          )
        }
      />
      <MessageComposer
        onAttach={() => {}}
        onSend={(text) => {
          const id = `local-${Date.now()}`;
          setMessages((list) => [...list, { id, senderId: "me", text, createdAt: new Date(), status: "sending" }]);
          deliver(id);
        }}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): initialMessages.
