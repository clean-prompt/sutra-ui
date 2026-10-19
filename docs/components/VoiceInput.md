# VoiceInput

> Mic toggle with a live input-level ring, timer + max-duration countdown and interim transcript preview.

- Import: `import { VoiceInput } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/voice` (kit `voice`)
- `data-slot`: `level-ring`, `voice-timer`, `voice-interim`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` |  | Disables the microphone button. |
| `fallback` | `React.ReactNode` | `null` | Rendered instead of nothing when speech recognition is unavailable. |
| `lang` | `string` |  | BCP 47 language of the speech to recognise; defaults to the document language. |
| `maxDuration` | `number` | `60` | Auto-stop after this many seconds. Default 60. |
| `meter` | `boolean` | `true` | Capture the mic for the level meter. Default true. |
| `onError` | `(error: string) => void` |  | Called with the speech recognition error code (for example `not-allowed` when the microphone is blocked). |
| `onTranscript` | `(text: string, info: { done: boolean }) => void` |  | Called with each finalized phrase (`done: false`) and with the whole transcript when dictation stops (`done: true`). |
| `showTranscript` | `boolean` | `true` | Show the interim transcript preview. Default true. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size: `sm`, `md` or `lg`. Default "md". |

## Example (live: `#/components/voice/voice-input` in the playground)

```tsx
import * as React from "react";
import { VoiceInput } from "@sutra/ui/voice";

function VoiceInputDemo() {
  const [text, setText] = React.useState("");
  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <VoiceInput
          lang="en-US"
          maxDuration={30}
          onTranscript={(t, { done }) => !done && setText((v) => (v ? `${v} ${t}` : t))}
          fallback={<span className="text-sm text-muted-foreground">Speech recognition isn't available in this browser.</span>}
        />
      </div>
      {/* Transcript */}
      <p className="min-h-6 text-sm text-foreground">{text || "—"}</p>
    </>
  );
}
```
