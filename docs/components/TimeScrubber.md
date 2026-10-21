# TimeScrubber

> Range slider over time with a histogram of counts per bucket and chronological play/pause playback (Space toggles).

- Import: `import { TimeScrubber } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/memory-map-scrubber` (kit `workspace`)
- `data-slot`: `time-scrubber`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` (required) | `readonly Pick<MemoryNode, "id" \| "createdAt">[]` |  | Items to histogram (only `createdAt` is used). |
| `buckets` | `number` | `32` | Histogram bucket count. Default 32. |
| `defaultPlaying` | `boolean` |  | Initial playback state when `playing` is not controlled. |
| `defaultSpeed` | `number` |  | Initial speed when `speed` is not controlled. |
| `defaultValue` | `[number, number]` |  | Initial range when `value` is not controlled; defaults to the full axis. |
| `duration` | `number` | `8000` | Full sweep duration at 1× in ms. Default 8000. |
| `formatTime` | `(t: number) => string` |  | Custom formatter for the axis and handle labels, given epoch ms. |
| `locale` | `string` |  | BCP 47 locale used to format the default labels. |
| `max` | `number` |  | End of the time axis in epoch ms; defaults to the latest `createdAt` in `nodes`. |
| `min` | `number` |  | Start of the time axis in epoch ms; defaults to the earliest `createdAt` in `nodes`. |
| `onPlayingChange` | `(playing: boolean) => void` |  | Called with the new state when the user presses play or pause, or playback reaches the end. |
| `onSpeedChange` | `(speed: number) => void` |  | Called with the multiplier when the user picks another speed. |
| `onValueChange` | `(range: [number, number]) => void` |  | Called with the new `[from, to]` range while the user drags a handle or playback advances. |
| `playing` | `boolean` |  | Controlled playback state: true sweeps the range forward on a timer. |
| `speed` | `number` |  | Controlled playback speed multiplier; one of `speeds`. |
| `speeds` | `number[]` | `[0.5, 1, 2, 4]` | Speed multipliers the user can cycle through. Default `[0.5, 1, 2, 4]`. |
| `tickMs` | `number` | `100` | Playback tick in ms. Default 100. |
| `value` | `[number, number]` |  | Controlled selected range as `[from, to]` in epoch ms. |

## Example (live: `#/components/kanban-memory/time-scrubber` in the playground)

```tsx
import * as React from "react";
import { TimeScrubber } from "@sutra/ui/workspace";

function TimeScrubberDemo() {
  const [range, setRange] = React.useState<[number, number] | undefined>(undefined);
  const ts = memoryNodes.map((n) => n.createdAt as number);
  const extent: [number, number] = [Math.min(...ts), Math.max(...ts)];
  const value = range ?? extent;
  const count = memoryNodes.filter((n) => (n.createdAt as number) >= value[0] && (n.createdAt as number) <= value[1]).length;
  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <TimeScrubber nodes={memoryNodes} value={value} onValueChange={setRange} buckets={26} />
      <p className="text-xs text-muted-foreground">{count} memories revealed. Focus the scrubber and press Space to play or pause.</p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): memoryNodes.
