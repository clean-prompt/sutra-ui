# ConversationTurns

> Interpreter mode: two speakers left/right with live state, and a log of original + translated turns.

- Import: `import { ConversationTurns } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/translate-conversation` (kit `voice`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `left` (required) | `ConversationSpeaker` |  | The speaker on the left (name, language and avatar). |
| `right` (required) | `ConversationSpeaker` |  | The speaker on the right (name, language and avatar). |
| `turns` (required) | `ConversationTurn[]` |  | Finished turns in order, each with a speaker, original text and translation. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no turns and nothing is live. |
| `live` | `{ speaker: "left" \| "right"; state: ConversationLiveState; level?: number; text?: string } \| null` |  | Who is active and what is happening. |
| `onMicPress` | `(speaker: "left" \| "right") => void` |  | Called with `left` or `right` when the user presses a speaker's microphone button. |

## Example (live: `#/components/voice/conversation` in the playground)

```tsx
import * as React from "react";
import { ConversationTurns } from "@sutra/ui/voice";

function ConversationDemo() {
  const [turns, setTurns] = React.useState<ConversationTurn[]>([]);
  const [live, setLive] = React.useState<{ speaker: "left" | "right"; state: ConversationLiveState; level?: number; text?: string } | null>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  React.useEffect(() => {
    if (live?.state !== "hearing") return;
    const t = setInterval(() => setLive((l) => (l && l.state === "hearing" ? { ...l, level: 0.2 + Math.random() * 0.7 } : l)), 90);
    return () => clearInterval(t);
  }, [live?.state]);

  const press = (speaker: "left" | "right") => {
    if (live) return;
    const next = script.find((s, i) => i >= turns.length && s.speaker === speaker) ?? { speaker, original: speaker === "left" ? "Thank you!" : "धन्यवाद!", translation: speaker === "left" ? "धन्यवाद!" : "Thank you!" };
    setLive({ speaker, state: "hearing", level: 0.4, text: next.original.split(" ").slice(0, 2).join(" ") + "…" });
    timers.current.push(
      setTimeout(() => setLive({ speaker, state: "translating", text: next.original }), 1600),
      setTimeout(() => setLive({ speaker, state: "speaking", text: next.translation }), 2400),
      setTimeout(() => {
        setLive(null);
        setTurns((t) => [...t, { ...next, id: String(t.length + 1) }]);
      }, 3500)
    );
  };

  return (
    <>
      <ConversationTurns left={{ lang: "en" }} right={{ lang: "hi" }} turns={turns} live={live} onMicPress={press} />
      {turns.length ? (
        <div>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setTurns([])}>
            Clear conversation
          </button>
        </div>
      ) : null}
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): script.
