# useRollingSeries

> A fixed-size buffer of the most recent values, for live charts. When `T` is itself an array, wrap single values: `push([value])`.

- Import: `import { useRollingSeries } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-rolling-series`

## Signature

```ts
useRollingSeries<T = number>({ capacity, initial }: UseRollingSeriesOptions<T>): RollingSeries<T>
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `capacity` (required) | `number` |  | How many values to keep; pushing past it drops the oldest. |
| `initial` | `T[]` |  | Starting values (read on the first render; also what `reset()` restores). |
