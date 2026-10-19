# useSampler

> Calls `read` every `interval` ms and keeps the last `capacity` results, for live charts. Pauses while `enabled` is false and stops on unmount. `read` may change between renders without restarting the timer.

- Import: `import { useSampler } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-rolling-series`

## Signature

```ts
useSampler<T = number>(read: () => T, { interval, capacity, enabled, initial, immediate }: UseSamplerOptions<T>): RollingSeries<T>
```
