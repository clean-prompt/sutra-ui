---
component: AssistantOrb
module: kits/voice/assistant-orb
use: The face of a voice assistant. A glass orb or a layered waveform that shows idle, listening, thinking and speaking, and swells with a live audio level.
instead: AudioLevelMeter = bars for a plain input level, no assistant state; Spinner = a task is loading and nothing is being said; VoiceInput = the whole mic button with timer and transcript
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction. Put it beside a real control (the mic button) and keep that control's name in step with the state.

## Screen readers
- The orb is `role="img"` named for its state ("Assistant is listening"). `label` replaces the name, `label=""` makes it decorative (`aria-hidden`), which is right when a caption beside it already says what is going on (the assistant bar demo does this).
- The name is not a live region and the orb never announces a change. Announce state changes in a status text of your own (`role="status"`, polite), as the demos do.
- A state never relies on motion alone: each one has its own shape (a ring while listening, an arc while thinking, two rings while speaking, a flat grey look for muted) and the waveform has a different pose per state.

## Reduced motion
`prefersReducedMotion()` (system setting or `<html data-motion>`) stops everything: no frame loop is ever requested, the stylesheet ends the CSS animations, and the live `level` is ignored. The orb keeps the still pose of its state (size, saturation, rings, arc) and the waveform draws one still frame per state, redrawn when the state changes. `paused` freezes the animation where it is without changing the look.

## Server rendering
The orb's markup is the same on the server and the client. The waveform's canvas is blank until mount, when it is sized and drawn. The server assumes left-to-right, so a right-to-left page mirrors the travelling pulse after hydration.

## Slots
- `assistant-orb`: the root of both variants (`data-variant`, `data-state`, `data-paused`, `data-offscreen`).

## Gotchas
- `level` (0 to 1) is smoothed inside with a fast attack and a slow release and written to the `--orb-level` CSS variable by one frame loop, so feeding it every frame from `useAudioLevel` does not re-render the orb's parts. The loop stops at rest, while the orb is off screen and while `paused`.
- Idle, error and muted ignore `level`; thinking counts a fifth of it. Speech synthesis has no output level, so drive a speaking orb with your own envelope or a steady value. `useAssistantOrbState({ listening, thinking, speaking, error, muted })` picks the state by priority: error, speaking, thinking, listening, muted, idle.
- Colours come from the theme tokens: primary and chart hues in the stock look, one ink in the paper style, red for an error. A theme set on an ancestor below `<html>` is read on mount and on state changes; changes to `<html>` are followed live.
- `size` is the box for the orb and the height for the waveform (its width is three times that; `className="w-full"` stretches it).

## Example
```tsx
import { AssistantOrb, useAssistantOrbState, useAudioLevel } from "@sutra/ui";

export function Example({ stream, thinking, speaking }: { stream: MediaStream | null; thinking: boolean; speaking: boolean }) {
  const level = useAudioLevel(stream);
  const state = useAssistantOrbState({ listening: Boolean(stream), thinking, speaking });
  return (
    <div className="flex items-center gap-3">
      <AssistantOrb state={state} level={level} size={56} label="" />
      <p role="status" className="text-sm">
        {state === "listening" ? "Listening..." : state === "thinking" ? "Thinking..." : state === "speaking" ? "Speaking" : "Ask anything"}
      </p>
      <AssistantOrb variant="waveform" state={state} level={level} size={32} label="" className="w-40" />
    </div>
  );
}
```
