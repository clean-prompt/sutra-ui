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

## Example (live: `#/components/assets/mascot-in-chat` in the playground)

```tsx
import * as React from "react";
import { ChatMessage, ChatMessageBody, ChatMessageContent, ChatMessageHeader } from "@sutra/ui/ai";
import { SutraMascot } from "@sutra/ui/assets";
import { Button } from "@sutra/ui/core";

function MascotChatDemo() {
  const [step, setStep] = React.useState(script.length - 1);
  const [asked, setAsked] = React.useState(0);
  React.useEffect(() => {
    if (asked === 0) return; // the first answer is already on screen
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      setStep(index);
      const wait = script[index]![1];
      index += 1;
      if (wait > 0 && index < script.length) timer = setTimeout(next, wait);
    };
    next();
    return () => clearTimeout(timer);
  }, [asked]);
  const state = script[step]![0];
  const answered = state === "happy" || state === "idle";
  return (
    <>
      <ChatMessage role="user">
        <ChatMessageBody>
          <ChatMessageContent>What is on my calendar tomorrow?</ChatMessageContent>
        </ChatMessageBody>
      </ChatMessage>
      <ChatMessage role="assistant" variant="flat">
        <SutraMascot shape="circle" size={36} state={state} className="mt-0.5" />
        <ChatMessageBody>
          <ChatMessageHeader name="Sutra" />
          <p role="status" className="text-xs text-muted-foreground">
            {statusText[state]}
          </p>
          <ChatMessageContent>
            {answered ? "Two meetings: design review at 10:00 and a call with Priya at 15:30. The rest of the day is free." : "…"}
          </ChatMessageContent>
        </ChatMessageBody>
      </ChatMessage>
      <ChatMessage role="assistant" variant="flat">
        <SutraMascot shape="circle" size={36} state="error" className="mt-0.5" />
        <ChatMessageBody>
          <ChatMessageHeader name="Sutra" />
          <ChatMessageContent>I could not reach the mail service. Nothing was sent.</ChatMessageContent>
        </ChatMessageBody>
      </ChatMessage>
      <div>
        <Button size="sm" variant="soft" onClick={() => setAsked((n) => n + 1)}>
          Ask again
        </Button>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): script, statusText.
