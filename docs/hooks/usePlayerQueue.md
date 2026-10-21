# usePlayerQueue

> Queue state for a player: current item, play order and next/previous with repeat & shuffle semantics.

- Import: `import { usePlayerQueue } from "@cleanprompt/sutra-ui/media"`
- Source: `packages/ui/src/kits/media/audio-player-model`

## Signature

```ts
usePlayerQueue<T extends PlayerQueueItem>(options?: UsePlayerQueueOptions<T>): { dispatch: (action: PlayerQueueAction<T>) => PlayerQueueState<T>; current: T | null; ordered: T[]; position: number; upNext: T[]; hasNext: boolean; hasPrevious: boolean; next: (opts?: { auto?: boolean | undefined; }) => T | null; previous: (opts?: { currentTime?: number | undefined; restartAfter?: number | undefined; }) => T | null…
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentId` | `string \| null` |  |  |
| `index` | `number` |  | Start index in `items` (ignored when `currentId` is set). Default 0. |
| `items` | `T[]` |  |  |
| `onChange` | `(state: PlayerQueueState<T>) => void` |  | **Deprecated.** Use `onValueChange`. |
| `onValueChange` | `(state: PlayerQueueState<T>) => void` |  | Called with the next queue state after every change. |
| `repeat` | `RepeatMode` |  |  |
| `rng` | `() => number` |  | Random source for shuffling (inject for deterministic tests). Default Math.random. |
| `shuffle` | `boolean` |  |  |
