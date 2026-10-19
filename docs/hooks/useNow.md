# useNow

> Current time in epoch ms, re-rendering every `interval` ms while `active` (or the `fixed` time).

- Import: `import { useNow } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-now`

## Signature

```ts
useNow(options?: UseNowOptions): number
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` | `true` | Tick only while true. Default true. |
| `fixed` | `DateInput` |  | Freeze the clock at this time (tests, stories, server snapshots). |
| `interval` | `number` | `1000` | Tick interval in ms. Default 1000. |
