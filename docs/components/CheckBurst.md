# CheckBurst

> A tiny celebratory pop for completing a task or reaching a streak: a ring of particles flies out of the centre and fades (Web Animations on `translate`, `scale` and `opacity`, no keyframes in the stylesheet), and the content swells. Pure decoration: the layer is `aria-hidden` and never carries information, so say the result in text (a live region, the checked state). Under `prefers-reduced-motion` nothing plays. It draws past its own box, so keep it out of an `overflow-hidden` ancestor. Drive it with `active`, `burstKey` or `apiRef.burst()`.

- Import: `import { CheckBurst } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/check-burst` (patterns)
- `data-slot`: `check-burst`, `check-burst-content`, `check-burst-layer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | A burst plays when this goes from false to true (never on mount). |
| `apiRef` | `React.Ref<CheckBurstApi>` |  | Imperative handle (`burst()`). |
| `burstKey` | `string \| number` |  | A burst plays whenever this value changes (a streak count). |
| `children` | `React.ReactNode` |  | What the burst belongs to (a checkbox, a streak flame). It swells with the burst unless `pop` is false. Optional: with no children the burst fills its positioned parent. |
| `count` | `number` | `10` | Number of particles, 0 to 24. Default 10. |
| `duration` | `number` | `500` | Milliseconds. Default 500. |
| `onBurst` | `() => void` |  | Called when a burst is asked for, also where reduced motion keeps it from showing. |
| `onBurstEnd` | `() => void` |  | Called when the particles are gone. |
| `particleSize` | `number` | `5` | Particle size in px (a dash is 1.8 times as long). Default 5. |
| `pop` | `boolean` | `true` | Swell the children with the burst. Default true. |
| `radius` | `number` | `28` | How far the particles fly, in px from the centre. Default 28. |
| `shape` | `BurstShape` | `"mixed"` | Particle shape of the burst: `dots`, `dashes` or `mixed`. |
| `tone` | `Tone \| "multi"` | `"multi"` | `"multi"` cycles brand, success, warning and info; a tone paints them all in one colour. Default "multi". |

## Example (live: `#/components/showpieces/check-burst-streak` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { AnimatedNumber } from "@cleanprompt/sutra-ui/dataviz";
import { RiFireFill } from "@cleanprompt/sutra-ui/icons";
import { CheckBurst } from "@cleanprompt/sutra-ui/motion";

function Streak() {
  const [streak, setStreak] = React.useState(6);
  return (
    <div className="flex w-full max-w-sm items-center gap-4 rounded-box border border-border bg-card p-4">
      <CheckBurst burstKey={streak} radius={34} count={12} className="rounded-full bg-warning-soft p-3 text-warning-soft-foreground">
        <RiFireFill aria-hidden className="size-7" />
      </CheckBurst>
      <div className="min-w-0 flex-1">
        <p className="text-display-xs font-semibold tabular-nums">
          <AnimatedNumber value={streak} /> days
        </p>
        <p className="text-sm text-muted-foreground">Your current streak</p>
      </div>
      <Button size="sm" onClick={() => setStreak((s) => s + 1)}>
        Log today
      </Button>
    </div>
  );
}
```
