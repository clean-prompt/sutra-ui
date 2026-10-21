---
component: SutraMascot
module: assets/mascot
use: The Sutra mascot, a friendly character with eight states (idle, listening, thinking, working, speaking, happy, sleeping, error), in eight characters a user can choose from (`mascotCharacters`: bead, pendant, mala, bindu, knot-pendant, bow, bun, sutradhar). Use it as the assistant or agent avatar, an empty state, or a loading companion.
instead: Avatar = a person or an image; SutraMark = the logo, not a character; Spinner = a plain wait with no personality; AssistantOrb = the voice assistant visual driven by a live audio level; SutradharSting = a one-off logo animation, not a status
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction. Put a button around it when it should act, and name that button. For a "Choose your Sutra" setting use `RadioGroup` with `RadioCard`s (arrow keys move the choice) named by `mascotCharacterLabels`.

## Screen readers
- Decorative by default: the svg is `aria-hidden`, so say what Sutra is doing in live text next to it (a `role="status"` line).
- `title="Sutra"` names it (`role="img"` with a `<title>`); `title` set to `true` uses the label of the current state (`mascotStateLabels`: "Sutra is listening").
- Do not name it when the same words are beside it: the name would be read twice.
- The state and the character are also in `data-state` and `data-character` for tests and styling.

## Reduced motion
Each state has its own face and extras in the markup (eyes, mouth, rings, thought dots, sparks, stars, z marks, a bang), so a still mascot still tells the states apart. The bead moves with CSS keyframes on `data-part` started by `data-state`; under `prefers-reduced-motion` or `data-motion="reduce"` the twin blocks at the end of `sutra.css` remove them. The other characters are drawn frame by frame, because their motion is geometry CSS cannot express (a pendulum with a knot a beat behind, beads riding a spline, two-bone arms and legs, a winding curl): each is a pure function of time, the still pose is the markup, and while motion is allowed one shared `requestAnimationFrame` for the whole page writes only the attributes that changed (no React render per frame). A mascot joins that frame only while it is on screen and not `paused`; under reduced motion it requests no frame and shows the still pose. `paused` freezes any character where it is. A change of state is smooth: the frame-drawn characters blend the pose on screen into the new state over about a third of a second and blink on the way, so the face changes behind shut eyes, and the bead's new face opens from a blink; under reduced motion the change is instant.

## Server rendering
The same markup on the server and the client: the frame-drawn characters render the still pose of their state. The mask ids come from `useSafeId`, so two mascots never share one.

## Slots
- `sutra-mascot`: the svg root (`data-character`, `data-state`, `data-shape`)

## Gotchas
- `happy` and `error` are one-shot (a jump, a swing, a shake) and then rest. Set the state again after another one, or change `replayKey`, to play them again; the svg is never remounted.
- Faces and gaps are cut out with masks, so they show whatever is behind. `shape="circle"` or `"squircle"` adds a paper tile with the brand inks and clips the art (`sutradhar` becomes head and shoulders, the best avatar form for it). `tone="dyed"` with an `app` fills the beads with its dye; threads stay ink.
- The bead's jump may leave its box (`overflow: visible`); the other characters are clipped to theirs, and the pendants' thread runs off the top edge, so give `pendant`, `knot-pendant` and `bun` room above the bead.
- `bindu` differs from the review design to stay clear of Dragon Quest's Slime (a squat drop with a short pointed tip and a wide grin): a taller, narrower body (radius 14.2, tip 29.5 above the belly), a longer, more prominent thread curl (scaled 1.18) and a smaller mouth (0.72).

## Example
```tsx
import { SutraMascot, mascotStateLabels, type MascotCharacter, type MascotState } from "@cleanprompt/sutra-ui";

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
