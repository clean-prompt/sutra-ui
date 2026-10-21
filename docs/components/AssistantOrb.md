# AssistantOrb

> The voice assistant's face: one of several looks (`variant`: a glass orb, a waveform, or an ink look such as the Sutra string or the mala) that shows what the assistant is doing (idle, listening, thinking, speaking, error, muted) and follows a live `level`. Colours come from the theme (primary and chart hues, one ink in the paper style).

- Import: `import { AssistantOrb } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/voice`)
- Source: `packages/ui/src/kits/voice/assistant-orb` (kit `voice`)
- `data-slot`: `assistant-orb`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Accessible name. By default it says what the state is ("Assistant is listening"). Pass your own to name the assistant, or `""` to make the orb decorative (`aria-hidden`) when text beside it already says what is going on. The name is not a live region: announce state changes in a status text of your own. |
| `level` | `number` |  | The live amplitude, 0 to 1: the microphone while listening, the audio output while speaking. It is smoothed inside (fast attack, slow release) and written to a CSS variable, so feeding it every frame does not render the orb's parts again. States that do not follow the level (idle, error, muted) ignore it. Default 0. |
| `paused` | `boolean` |  | Freezes the animation where it is: no frame loop, ambient motion held. The state and size still apply. Default false. |
| `size` | `number \| string` |  | Size in px (a number) or any CSS length. For the round looks (orb, mala, ink, rings, graph, halftone) it is the width and height. For the bars (waveform, string) it is the height; the width is three times that, and `className="w-full"` stretches it (the canvas follows its box). A numeric size under 48 gives `string` a square box, drawn as the compact form (the logo); any `string` box under 1.8:1 draws that form. Default 128 (round looks) or 64 (bars). |
| `state` | `AssistantOrbState` |  | What the assistant is doing: `idle` (breathing, muted colour), `listening` (swells with `level`, ripples on loud input), `thinking` (faster swirl, an orbiting arc, a travelling pulse in the waveform), `speaking` (a rhythmic pulse and expanding rings), `error` or `muted`. Each has its own shape as well as its own motion, so the state reads under reduced motion. Default "idle". |
| `variant` | `AssistantOrbVariant` |  | The look. `orb` is a radial glass orb of blurred colour layers; `waveform` is a canvas of layered sine waves. The ink looks are drawn on a canvas in flat ink (one ink in the paper style, the primary and chart hues in colour): `mala` (beads on a closed thread, the Sutra bead at the top), `string` (the Sutra bead on a vibrating thread: a 3:1 bar, the square logo below 48 px), `ink` (a drop of ink), `rings` (thick thread loops), `graph` (dots on a turning sphere joined around a hub) and `halftone` (a sphere of whole dots around a centre dot). `assistantOrbVariants` lists them in picker order and `assistantOrbVariantLabels` names them. Default "orb". |

## Notes

**When to use:** The face of a voice assistant, in one of eight looks a user can pick (glass orb, waveform, mala, Sutra string, ink drop, thread rings, dot graph, halftone). It shows idle, listening, thinking and speaking (plus error and muted) by shape, and follows a live audio level.

**Use instead when:**
- `AudioLevelMeter`: bars for a plain input level, no assistant state
- `Spinner`: a task is loading and nothing is being said
- `VoiceInput`: the whole mic button with timer and transcript

### Keyboard

Not focusable: no keyboard interaction. Put it beside a real control (the mic button) and keep that control's name in step with the state. A style picker built from `assistantOrbVariants` should be a radio group (`RadioGroup` with `RadioCard`), so the arrow keys move through the looks.

### Screen readers

- The orb is `role="img"` named for its state ("Assistant is listening") in every look. `label` replaces the name, `label=""` makes it decorative (`aria-hidden`), which is right when a caption beside it already says what is going on (the assistant bar and picker demos do this). The canvas inside is always `aria-hidden`.
- The name is not a live region and the orb never announces a change. Announce state changes in a status text of your own (`role="status"`, polite), as the demos do.
- A state never relies on motion alone: each look has its own shape per state (the glass orb a ring, an arc or two rings; the string a plucked thread, a turning bead, outgoing waves, a snapped or slack thread; the mala an equaliser, one counted bead, a broken thread, hollow beads; and so on), even at 32 px.

### Reduced motion

`prefersReducedMotion()` (system setting or `<html data-motion>`) stops everything: no frame loop is ever requested, the stylesheet ends the CSS animations, and the live `level` is ignored. The glass orb keeps the still pose of its state (size, saturation, rings, arc); the waveform and the ink looks draw one still frame per state (a fixed moment chosen so the states differ most), redrawn when the state or the theme changes. `paused` freezes the animation where it is without changing the look; a look paused from the start shows the still pose.

### Server rendering

Server render: part of it fills in after mount. The markup is the same on the server and the client. The canvas looks (waveform and the six ink looks) are blank until mount, when they are sized and drawn. The server assumes left-to-right, so a right-to-left page mirrors the travelling motion after hydration.

### Slots

- `assistant-orb`: the root of every look (`data-variant`, `data-state`, `data-paused`, `data-offscreen`; the string adds `data-form="bar" | "square"`; the canvas looks draw on a `data-part="canvas"` child).

### Gotchas

- `level` (0 to 1) is smoothed inside (fast attack, slow release), so feeding it every frame from `useAudioLevel` re-renders nothing; the canvas looks keep a second of history so beads, rings and waves can follow the level of a moment ago. Idle, error and muted ignore it, thinking counts a fifth. Every loop stops off screen, while `paused` and under reduced motion. `useAssistantOrbState(flags)` picks the state by priority: error, speaking, thinking, listening, muted, idle.
- `size` is the box of the round looks (default 128) and the height of the bars, waveform and string (default 64, three times as wide; `className="w-full"` stretches them). A numeric size under 48 gives `string` a square box drawn as the Sutra logo; any `string` box under 1.8:1 draws that form. Small sizes keep the state shapes: eight mala beads below 64 px, two ring loops below 120 px (a 2 px line at 32, 7 px at 240), a coarser halftone, fewer graph nodes.
- Colours come from the tokens: primary and chart hues in the stock look, one ink in the paper style, `--destructive` for an error, `--muted-foreground` when muted. Gaps are cut out of the canvas, so the looks sit on any surface. Right-to-left mirrors the travel (the string's slide, the mala's swell and count, the graph's turn), never the Sutra bead itself.
- The canvas looks cap the pixel ratio at 2. The ink drop is the heaviest (a metaball field each frame): keep one large ink drop on screen rather than many.

## Example

```tsx
import { AssistantOrb, assistantOrbVariantLabels, assistantOrbVariants, useAssistantOrbState, useAudioLevel, type AssistantOrbVariant } from "@cleanprompt/sutra-ui";

export function Example({ stream, thinking, speaking, look = "string" }: { stream: MediaStream | null; thinking: boolean; speaking: boolean; look?: AssistantOrbVariant }) {
  const level = useAudioLevel(stream);
  const state = useAssistantOrbState({ listening: Boolean(stream), thinking, speaking });
  return (
    <div className="flex items-center gap-3">
      <AssistantOrb variant={look} state={state} level={level} size={32} label="" />
      <p role="status" className="text-sm">
        {state === "listening" ? "Listening..." : state === "thinking" ? "Thinking..." : state === "speaking" ? "Speaking" : "Ask anything"}
      </p>
      <span className="sr-only">Style: {assistantOrbVariantLabels[look]} (one of {assistantOrbVariants.length})</span>
    </div>
  );
}
```
