# SutraMascot

> The Sutra mascot: a friendly bead on a thread, with a face that follows `state` (idle, listening, thinking, working, speaking, happy, sleeping, error). Flat shapes, ink on paper; the motion is CSS keyframes that stand still under reduced motion while the expression stays. Decorative unless `title` is set.

- Import: `import { SutraMascot } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/mascot` (assets)
- `data-slot`: `sutra-mascot`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `app` | `SutraApp` |  | The Sutra app whose dye colours the bead when `tone` is `dyed` (see `sutraAppMeta`). |
| `paused` | `boolean` | `false` | Freeze the animation where it is (the expression stays). Use it for off-screen or background mascots. |
| `replayKey` | `string \| number` |  | Change it to play a one-shot reaction (`happy`, `error`) again while the state stays the same. |
| `shape` | `MascotShape` | `"bare"` | `bare` the character alone in `currentColor` (follows the text colour), `circle` or `squircle` on a paper tile with a hairline, the form for a chat or agent avatar next to `Avatar`. |
| `size` | `number \| string` | `64` | Rendered width and height: a number of pixels or any CSS length. |
| `state` | `MascotState` | `"idle"` | What the mascot is doing. The face and the extras around it change with the state (so it reads without motion), and the animation swaps in place without remounting. `happy` and `error` are one-shot reactions that play again when the state is set again. |
| `title` | `string \| boolean` |  | Accessible name. A string names the graphic, `true` uses the label of the current state (`mascotStateLabels`), and leaving it out makes the mascot decorative (hidden from assistive technology): pair it with live text that says what Sutra is doing. |
| `tone` | `MascotTone` | `"mono"` | `mono` ink on paper, `dyed` puts the dye of `app` in the bead. Without an `app`, `dyed` stays ink. |

## Notes

**When to use:** The Sutra Bead as a friendly character with eight states (idle, listening, thinking, working, speaking, happy, sleeping, error). Use it as the assistant or agent avatar, an empty state, or a loading companion.

**Use instead when:**
- `Avatar`: a person or an image
- `SutraMark`: the logo, not a character
- `Spinner`: a plain wait with no personality
- `AssistantOrb`: the voice assistant visual driven by a live audio level

### Keyboard

Not focusable: no keyboard interaction. Put a button around it when it should act, and name that button.

### Screen readers

- Decorative by default: the svg is `aria-hidden`, so say what Sutra is doing in live text next to it (a `role="status"` line).
- `title="Sutra"` names it (`role="img"` with a `<title>`); `title` set to `true` uses the label of the current state (`mascotStateLabels`: "Sutra is listening").
- Do not name it when the same words are beside it: the name would be read twice.
- The state is also in `data-state` for tests and styling.

### Reduced motion

Each state has its own face and extras in the markup (eyes, mouth, rings, thought dots, sparks, stars, z marks, a bang), so a still mascot still tells the states apart. Under `prefers-reduced-motion` or `data-motion="reduce"` the keyframes are removed (twin blocks at the end of `sutra.css`) and the still pose stays. There is no script: no timers, frames or effects. `paused` freezes the animation where it is.

### Server rendering

Server render: same markup as the client. The same markup on the server and the client. The mask ids come from `useSafeId`, so two mascots never share one.

### Slots

- `sutra-mascot`: the svg root

### Gotchas

- `happy` and `error` are one-shot (a jump, a shake) and then rest. Set the state again after another one, or change `replayKey`, to play them again; the svg is never remounted.
- The face and the gap around the thread are cut out of the bead with a mask, so they show whatever is behind it. `shape="circle"` or `"squircle"` adds a paper tile with the brand inks, as `SutraAppIcon` does, and clips the art to it.
- `tone="dyed"` needs an `app` (its dye from `sutraAppMeta` fills the bead); without one the bead stays ink. Bare mono follows `currentColor`, so it works on dark and paper.
- The jump may leave the box (`overflow: visible`); keep a few pixels free above it or do not put it inside an `overflow-hidden` frame.

## Example

```tsx
import { SutraMascot, mascotStateLabels, type MascotState } from "@sutra/ui";

export function Example({ phase }: { phase: "waiting" | "working" | "answering" | "failed" }) {
  const state: MascotState =
    phase === "working" ? "working" : phase === "answering" ? "speaking" : phase === "failed" ? "error" : "idle";
  return (
    <div className="flex items-center gap-3">
      <SutraMascot shape="circle" size={36} state={state} />
      <p role="status" className="text-sm text-muted-foreground">
        {mascotStateLabels[state]}
      </p>
    </div>
  );
}
```
