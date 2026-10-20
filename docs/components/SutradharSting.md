# SutradharSting

> A short logo sting with Sutradhar and the Sutra mark (the crescent bead on its thread), drawn in ink like the mascot. The final lockup is the markup (it renders on the server, under reduced motion and before a play starts); while it plays, the shared mascot frame driver writes the frames. It pauses off screen. Decorative unless `title` is set.

- Import: `import { SutradharSting } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/sutradhar-sting` (assets)
- `data-slot`: `sutradhar-sting`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `aim` | `number` | `150` | The astra's aim in degrees, measured like a protractor: 90 points straight up, 135 up and to the left, 180 level to the left. Clamped to 135 to 180. Only for `variant="astra"`. |
| `autoPlay` | `boolean` | `true` | Play once when the sting first comes on screen. False shows the final lockup until `replayKey` changes. |
| `loop` | `boolean` | `false` | Play again after a short hold on the lockup, for as long as it is on screen. |
| `onComplete` | `() => void` |  | Called when a play reaches its lockup (also at once under reduced motion, where only the lockup is shown). |
| `replayKey` | `string \| number` |  | Change it to play the sting again from the start. |
| `size` | `number \| string` | `160` | Rendered height: a number of pixels or any CSS length; the width follows the drawing (6:5 for `mark`, 16:13 for `astra`). |
| `title` | `string` |  | Accessible name. Leave it out to keep the sting decorative (hidden from assistive technology). |
| `variant` | `SutradharStingVariant` | `"mark"` | `mark` Sutradhar walks in with a bare thread, the crescent bead drops onto it and becomes the Sutra mark, he plants it and smiles (about 4.6 s). `astra` he summons a hand astra (the crescent bead on a short thread), charges it, swings it into the aim and fires an ink wave out of its head into empty space (about 5.4 s). Both end on a still lockup. |

## Notes

**When to use:** A short logo sting with Sutradhar (the full-figure mascot) and the Sutra mark, the crescent bead on its thread. `mark`: he walks in with a bare thread, the bead drops onto it and becomes the mark, he plants it and smiles. `astra`: he summons a hand astra (the crescent bead on a short thread), charges it, swings it into the aim and fires an ink wave into empty space. Both end on a still lockup. Use it on a splash screen, an onboarding step or a launch moment.

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

`autoPlay` (default) plays once when it first comes on screen; `false` shows the lockup until `replayKey` changes; `loop` plays again after a short hold and never calls `onComplete`. It runs on the mascot's shared frame driver (one `requestAnimationFrame` for the page, attribute writes only, no React render per frame) because the sequence is geometry CSS keyframes cannot express: a walk, two-bone arms, a bead dropping onto a turning thread, a wave of five layered sines. It pauses off screen, and draws its first frame before paint so the lockup never flashes first. Under `prefers-reduced-motion` or `data-motion="reduce"` only the lockup is shown, no frame is requested, and `onComplete` is called at once.

### Server rendering

Server render: same markup as the client. The final lockup is the markup, the same on the server and the client; mask ids come from `useSafeId`.

### Slots

- `sutradhar-sting`: the svg root (`data-variant`, `data-playing` while it plays)

### Gotchas

- `size` is the height; the width follows the drawing (6:5 for `mark`, 16:13 for `astra`). The drawing is clipped to its box, and the astra's wave is sized to stay inside it at every aim.
- `aim` (astra only) is in protractor degrees: 90 straight up, 180 level to the left, clamped to 135 to 180, default 150. The astra is held in one hand and fires into empty space: there is no target.
- The figure and the mark are ink in `currentColor`, so they follow the text colour on paper, dark and the paper style.

## Example

```tsx
import * as React from "react";
import { Button, SutradharSting } from "@sutra/ui";

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
