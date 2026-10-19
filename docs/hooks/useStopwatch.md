# useStopwatch

> Stopwatch state: elapsed ms, running flag, laps and start / pause / lap / reset actions.

- Import: `import { useStopwatch } from "@sutra/ui/social"`
- Source: `packages/ui/src/hooks/use-stopwatch`

## Signature

```ts
useStopwatch({ interval, autoStart }?: UseStopwatchOptions): { elapsed: number; running: boolean; laps: StopwatchLap[]; start: () => void; pause: () => void; toggle: () => void; lap: () => void; reset: () => void; }
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoStart` | `boolean` | `false` | Starts running as soon as the hook mounts. |
| `interval` | `number` | `50` | Refresh interval while running, ms. Default 50. |
