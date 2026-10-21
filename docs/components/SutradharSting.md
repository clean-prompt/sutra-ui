# SutradharSting

> A short logo sting with Sutradhar and the Sutra mark (the crescent bead on its thread), drawn in ink like the mascot. The final lockup is the markup (it renders on the server, under reduced motion and before a play starts); while it plays, the shared mascot frame driver writes the frames. It pauses off screen; `astra-endless` keeps streaming for as long as it is on screen. Decorative unless `title` is set. The art is direction-agnostic: it is drawn the same in left-to-right and right-to-left layouts (Sutradhar walks in from the left and the astra's aim is a protractor angle, like a logo), so it is never mirrored.

- Import: `import { SutradharSting } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/sutradhar-sting` (assets)
- `data-slot`: `sutradhar-sting`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `aim` | `number` |  | The astra's aim in degrees, measured like a protractor: 90 points straight up, 180 level to the left, 270 straight down. Clamped to 30 to 330; left out, `astra` aims at 150 and `astra-endless` at 172. Aimed to the right (under 90 or over 270) he turns round and faces where he fires; aimed steeply up or down the view pulls back just enough to keep the whole wave on the stage, and for a downward shot he rises off the ground as he swings. `mark` does not use it. |
| `autoPlay` | `boolean` | `true` | Play once when the sting first comes on screen. False shows the final lockup until `replayKey` changes. |
| `discharge` | `"wave" \| "lightning"` | `"wave"` | What the astra fires (both astra variants): `wave`, the layered ink wave, or `lightning`, a forked ink bolt that strikes out at once and crackles (the astra's settles to a shorter, quieter bolt on its lockup; the endless one keeps striking with pulses running along it). `mark` does not use it. |
| `loop` | `boolean` | `false` | Play again after a short hold on the lockup, for as long as it is on screen. `astra-endless` never stops, so it has no use for it. |
| `onComplete` | `() => void` |  | Called when a play reaches its lockup (also at once under reduced motion, where only the lockup is shown); for `astra-endless`, once its stream runs at full length (it keeps playing). |
| `paused` | `boolean` | `false` | Freeze the animation where it is (the clock stops; resume to carry on from there). Use it for off-screen or background stings. |
| `replayKey` | `string \| number` |  | Change it to play the sting again from the start. |
| `size` | `number \| string` | `160` | Rendered height: a number of pixels or any CSS length; the width follows the drawing (6:5 for `mark`, 16:13 for `astra`, 32:13 for `astra-endless`). Unlike `SutraMascot` and the brand marks, whose `size` is both width and height, the stings are wider than tall, so `size` is the height only. |
| `title` | `string \| boolean` |  | Accessible name. A string names the graphic, `true` uses the label of the variant (`Sutradhar forms the Sutra mark`, ...), and leaving it out keeps the sting decorative (hidden from assistive technology). |
| `variant` | `SutradharStingVariant` | `"mark"` | `mark` Sutradhar walks in with a bare thread, the crescent bead drops onto it and becomes the Sutra mark, he plants it and smiles (about 4.6 s). `astra` he summons a hand astra (the crescent bead on a short thread), charges it until ink lightning crackles round the bead, swings it into the aim and fires an ink wave out of its head into empty space (about 5.4 s). Both end on a still lockup. `astra-endless` is the same astra on a wide stage that never stops once fired: the lightning keeps crackling round the bead, arcs and beads flow out along the wave, and the wave streams on across the whole stage and thins away at its far end (it is at full length after about 4.6 s and keeps playing while on screen). |

## Notes

**When to use:** A short logo sting with Sutradhar (the full-figure mascot) and the Sutra mark, the crescent bead on its thread. `mark`: he walks in with a bare thread, the bead drops onto it and becomes the mark, he plants it and smiles. `astra`: he summons a hand astra (the crescent bead on a short thread), charges it until ink lightning crackles round the bead, swings it into the aim and fires an ink wave into empty space. Both end on a still lockup. `astra-endless`: the same astra on a wide stage that never stops once fired: the lightning keeps crackling, arcs and beads flow out along the wave, and the wave streams across the whole stage. Either astra can fire ink lightning instead of the wave (`discharge="lightning"`): a forked bolt that strikes out at once and crackles, settling to a shorter bolt on the astra's lockup and striking on with pulses running along it on the endless one. Use it on a splash screen, an onboarding step or a launch moment.

**Use instead when:**
- `SutraMark`: the static mark
- `SutraMascot`: a status character that shows what the assistant is doing
- `AssistantOrb`: the voice assistant

### Keyboard

Not focusable. Offer your own button to replay it (change `replayKey`) and to skip a splash that waits on `onComplete`.

### Screen readers

- Decorative by default (`aria-hidden`). `title` names it (`role="img"` with a `<title>`), for example "Sutradhar plants the Sutra mark".
- The sting carries no information; never make a task wait on it without a way to skip.

### Reduced motion

`autoPlay` (default) plays once when it first comes on screen; `false` shows the lockup until `replayKey` changes; a play ends on its last frame, which is the lockup, so it settles without a jump; `loop` plays again after a short hold, fading out and back in instead of cutting, and never calls `onComplete`; `astra-endless` keeps streaming for as long as it is on screen (it calls `onComplete` once, when its stream reaches full length) and holds the stream still under reduced motion. It runs on the mascot's shared frame driver (one `requestAnimationFrame` for the page, attribute writes only, no React render per frame) because the sequence is geometry CSS keyframes cannot express: a walk, two-bone arms, a bead dropping onto a turning thread, a wave of five layered sines. It pauses off screen, and draws its first frame before paint so the lockup never flashes first. Under `prefers-reduced-motion` or `data-motion="reduce"` only the lockup is shown, no frame is requested, and `onComplete` is called at once.

### Server rendering

Server render: same markup as the client. The final lockup is the markup, the same on the server and the client; mask ids come from `useSafeId`.

### Slots

- `sutradhar-sting`: the svg root (`data-variant`, `data-playing` while it plays)

### Gotchas

- `size` is the height; the width follows the drawing (6:5 for `mark`, 16:13 for `astra`, 32:13 for `astra-endless`). The drawing is clipped to its box, and the wave is sized to stay inside it at every aim; add `h-auto max-w-full` to let a wide one shrink on a phone.
- `aim` is in protractor degrees: 90 straight up, 180 level to the left, 270 straight down, clamped to 30 to 330 (default 150 for `astra`, 172 for `astra-endless`). Aimed to the right he turns round; aimed steeply up or down the view pulls back just enough to keep the whole wave on the stage, and for a downward shot he rises off the ground as he swings. The astra is held in one hand and fires into empty space: there is no target.
- The figure and the mark are ink in `currentColor`, so they follow the text colour on paper, dark and the paper style.

## Example

```tsx
import * as React from "react";
import { Button, SutradharSting } from "@cleanprompt/sutra-ui";

export function Example() {
  const [replay, setReplay] = React.useState(0);
  return (
    <div className="grid justify-items-center gap-3">
      <SutradharSting variant="mark" size={160} replayKey={replay} title="Sutradhar plants the Sutra mark" />
      <Button size="sm" variant="soft" onClick={() => setReplay((n) => n + 1)}>
        Replay
      </Button>
    </div>
  );
}
```
