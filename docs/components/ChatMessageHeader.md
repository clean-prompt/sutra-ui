# ChatMessageHeader

> Sender name and time above the content.

- Import: `import { ChatMessageHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message` (kit `ai`)
- `data-slot`: `chat-message-header`
- Part of [`ChatMessage`](ChatMessage.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `React.ReactNode` |  | Author name, shown before the timestamp. |
| `timestamp` | `Date \| string \| number` |  | A Date / timestamp (formatted as a short time) or a preformatted string. |

## Example (live: `#/components/assets/mascot-picker` in the playground)

```tsx
import * as React from "react";
import {
  ChatMessage,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageHeader,
} from "@cleanprompt/sutra-ui/ai";
import { SutraMascot, mascotCharacterLabels, mascotCharacters } from "@cleanprompt/sutra-ui/assets";
import { RadioCard, RadioGroup } from "@cleanprompt/sutra-ui/forms";

function MascotPickerDemo() {
  const [character, setCharacter] = React.useState<MascotCharacter>("bead");
  return (
    <>
      <RadioGroup
        aria-label="Your Sutra"
        value={character}
        onValueChange={(value) => setCharacter(value as MascotCharacter)}
        className="grid grid-cols-2 gap-2 @3xl:grid-cols-4"
      >
        {mascotCharacters.map((c) => (
          <RadioCard
            key={c}
            value={c}
            className="items-center"
            label={
              <span className="flex flex-col items-start gap-2 @sm:flex-row @sm:items-center @sm:gap-3">
                <SutraMascot character={c} shape="circle" size={40} />
                {mascotCharacterLabels[c]}
              </span>
            }
          />
        ))}
      </RadioGroup>
      <div className="space-y-4 rounded-lg border p-4">
        <ChatMessage role="assistant" variant="flat">
          <SutraMascot character={character} shape="circle" size={36} className="mt-0.5" />
          <ChatMessageBody>
            <ChatMessageHeader name="Sutra" />
            <ChatMessageContent>Your 3 pm is now on Thursday. I let Maya know.</ChatMessageContent>
          </ChatMessageBody>
        </ChatMessage>
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <SutraMascot character={character} state="thinking" size={20} />
          Sutra is thinking…
        </p>
      </div>
    </>
  );
}
```
