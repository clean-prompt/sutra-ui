# MessageComposer

> Message input: auto-growing textarea, attach and emoji buttons, Enter to send (Shift+Enter for a new line).

- Import: `import { MessageComposer } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/kits/social/messenger` (kit `social`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `""` | Initial text when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables the field and the buttons. |
| `emoji` | `boolean` | `true` | Show the emoji picker button. Default true. |
| `maxRows` | `number` | `6` | Rows after which the field stops growing and scrolls. Default 6. |
| `onAttach` | `() => void` |  | Shows the attach button. |
| `onCancelReply` | `() => void` |  | Called when the user dismisses the reply preview; the close button is hidden when unset. |
| `onSend` | `(text: string) => void` |  | Called with the trimmed text; the field clears afterwards. |
| `onValueChange` | `(value: string) => void` |  | Called with the text on every edit. |
| `placeholder` | `string` | `"Message"` | Placeholder of the field. Default "Message". |
| `replyingTo` | `MessageReplyTo` |  | Message being replied to, shown above the field. |
| `value` | `string` |  | Controlled text of the field. |

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
