# SutraMascot

> The Sutra mascot: a friendly bead on a thread, with a face that follows `state` (idle, listening, thinking, working, speaking, happy, sleeping, error). Flat shapes, ink on paper; the motion is CSS keyframes that stand still under reduced motion while the expression stays. Decorative unless `title` is set. The art is direction-agnostic: it is drawn the same in left-to-right and right-to-left layouts (the characters face left and the listening arcs open to the right on purpose, like a logo), so it is never mirrored.

- Import: `import { SutraMascot } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/mascot` (assets)
- `data-slot`: `sutra-mascot`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `app` | `SutraApp` |  | The Sutra app whose dye colours the bead when `tone` is `dyed` (see `sutraAppMeta`). |
| `character` | `MascotCharacter` | `"bead"` | Which Sutra: `bead` the bead buddy on its thread (the original), `pendant` a bead hanging on a thread with a knot under it, `mala` a head bead leading three beads on a thread, `bindu` a drop of ink whose tip curls into a thread, `knot-pendant` the bead hanging straight from a knot, `bow` the bead buddy with a bow tied from her thread, `bun` the pendant with a bun and a pin, `sutradhar` a whole figure strung from beads and thread. Every character has all eight states, the three shapes and the dyed tone. The bead moves with CSS keyframes; the others are drawn frame by frame while motion is allowed. |
| `paused` | `boolean` | `false` | Freeze the animation where it is (the expression stays). Use it for off-screen or background mascots. |
| `replayKey` | `string \| number` |  | Change it to play a one-shot reaction (`happy`, `error`) again while the state stays the same. |
| `shape` | `MascotShape` | `"bare"` | `bare` the character alone in `currentColor` (follows the text colour), `circle` or `squircle` on a paper tile with a hairline, the form for a chat or agent avatar next to `Avatar`. |
| `size` | `number \| string` | `64` | Rendered width and height: a number of pixels or any CSS length. |
| `state` | `MascotState` | `"idle"` | What the mascot is doing. The face and the extras around it change with the state (so it reads without motion), and the animation swaps in place without remounting: the pose blends into the new state with a blink (instant under reduced motion). `happy` and `error` are one-shot reactions that play again when the state is set again. |
| `title` | `string \| boolean` |  | Accessible name. A string names the graphic, `true` uses the label of the current state (`mascotStateLabels`), and leaving it out makes the mascot decorative (hidden from assistive technology): pair it with live text that says what Sutra is doing. |
| `tone` | `MascotTone` | `"mono"` | `mono` ink on paper, `dyed` puts the dye of `app` in the bead. Without an `app`, `dyed` stays ink. |

## Notes

**When to use:** The Sutra mascot, a friendly character with eight states (idle, listening, thinking, working, speaking, happy, sleeping, error), in eight characters a user can choose from (`mascotCharacters`: bead, pendant, mala, bindu, knot-pendant, bow, bun, sutradhar). Use it as the assistant or agent avatar, an empty state, or a loading companion.

**Use instead when:**
- `Avatar`: a person or an image
- `SutraMark`: the logo, not a character
- `Spinner`: a plain wait with no personality
- `AssistantOrb`: the voice assistant visual driven by a live audio level
- `SutradharSting`: a one-off logo animation, not a status

### Keyboard

Not focusable: no keyboard interaction. Put a button around it when it should act, and name that button. For a "Choose your Sutra" setting use `RadioGroup` with `RadioCard`s (arrow keys move the choice) named by `mascotCharacterLabels`.

### Screen readers

- Decorative by default: the svg is `aria-hidden`, so say what Sutra is doing in live text next to it (a `role="status"` line).
- `title="Sutra"` names it (`role="img"` with a `<title>`); `title` set to `true` uses the label of the current state (`mascotStateLabels`: "Sutra is listening").
- Do not name it when the same words are beside it: the name would be read twice.
- The state and the character are also in `data-state` and `data-character` for tests and styling.

### Reduced motion

Each state has its own face and extras in the markup (eyes, mouth, rings, thought dots, sparks, stars, z marks, a bang), so a still mascot still tells the states apart. The bead moves with CSS keyframes on `data-part` started by `data-state`; under `prefers-reduced-motion` or `data-motion="reduce"` the twin blocks at the end of `sutra.css` remove them. The other characters are drawn frame by frame, because their motion is geometry CSS cannot express (a pendulum with a knot a beat behind, beads riding a spline, two-bone arms and legs, a winding curl): each is a pure function of time, the still pose is the markup, and while motion is allowed one shared `requestAnimationFrame` for the whole page writes only the attributes that changed (no React render per frame). A mascot joins that frame only while it is on screen and not `paused`; under reduced motion it requests no frame and shows the still pose. `paused` freezes any character where it is. A change of state is smooth: the frame-drawn characters blend the pose on screen into the new state over about a third of a second and blink on the way, so the face changes behind shut eyes, and the bead's new face opens from a blink; under reduced motion the change is instant.

### Server rendering

Server render: same markup as the client. The same markup on the server and the client: the frame-drawn characters render the still pose of their state. The mask ids come from `useSafeId`, so two mascots never share one.

### Slots

- `sutra-mascot`: the svg root (`data-character`, `data-state`, `data-shape`)

### Gotchas

- `happy` and `error` are one-shot (a jump, a swing, a shake) and then rest. Set the state again after another one, or change `replayKey`, to play them again; the svg is never remounted.
- Faces and gaps are cut out with masks, so they show whatever is behind. `shape="circle"` or `"squircle"` adds a paper tile with the brand inks and clips the art (`sutradhar` becomes head and shoulders, the best avatar form for it). `tone="dyed"` with an `app` fills the beads with its dye; threads stay ink.
- The bead's jump may leave its box (`overflow: visible`); the other characters are clipped to theirs, and the pendants' thread runs off the top edge, so give `pendant`, `knot-pendant` and `bun` room above the bead.
- `bindu` differs from the review design to stay clear of Dragon Quest's Slime (a squat drop with a short pointed tip and a wide grin): a taller, narrower body (radius 14.2, tip 29.5 above the belly), a longer, more prominent thread curl (scaled 1.18) and a smaller mouth (0.72).

## Example

```tsx
import { SutraMascot, mascotStateLabels, type MascotCharacter, type MascotState } from "@sutra/ui";

export function Example({ phase, character }: { phase: "waiting" | "working" | "answering" | "failed"; character: MascotCharacter }) {
  const state: MascotState =
    phase === "working" ? "working" : phase === "answering" ? "speaking" : phase === "failed" ? "error" : "idle";
  return (
    <div className="flex items-center gap-3">
      <SutraMascot character={character} shape="circle" size={36} state={state} />
      <p role="status" className="text-sm text-muted-foreground">
        {mascotStateLabels[state]}
      </p>
    </div>
  );
}
```
