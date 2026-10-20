# ChatMessageAvatar

> Circular `Avatar` for a chat turn: image, initials, or the Sutra spark for assistant messages.

- Import: `import { ChatMessageAvatar } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message` (kit `ai`)
- Part of [`ChatMessage`](ChatMessage.md)
- Also accepts the props of HTMLAttributes

## Props

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

## Example (live: `#/components/assets/mascot-picker` in the playground)

```tsx
import * as React from "react";
import { ChatMessage, ChatMessageBody, ChatMessageContent, ChatMessageHeader } from "@sutra/ui/ai";
import { SutraMascot, mascotCharacterLabels, mascotCharacters } from "@sutra/ui/assets";
import { RadioCard, RadioGroup } from "@sutra/ui/forms";

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
