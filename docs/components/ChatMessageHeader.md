# ChatMessageHeader

> Sender name and time above the content.

- Import: `import { ChatMessageHeader } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message` (kit `ai`)
- Part of [`ChatMessage`](ChatMessage.md)
- Also accepts the props of HTMLAttributes

## Props

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
