# Stopwatch

> Stopwatch with start / pause, lap and reset, and a laps list highlighting the fastest and slowest.

- Import: `import { Stopwatch } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/patterns/stopwatch` (patterns)
- `data-slot`: `stopwatch`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoStart` | `boolean` | `false` | Starts counting on mount. |
| `onLap` | `(lap: StopwatchLap) => void` |  | Called with the lap when the user records one. |
| `showLaps` | `boolean` | `true` | Show the laps list. Default true. |

## Example (live: `#/components/social/stopwatch` in the playground)

```tsx
import { Stopwatch } from "@sutra/ui/social";

<Stopwatch />
```
