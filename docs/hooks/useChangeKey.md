# useChangeKey

> A counter that is 0 until `value` changes, then goes up by one per change. Use it as a `key` (and as the switch for an entrance class) to animate a value only when it changes, never on the first render:

- Import: `import { useChangeKey } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-change-key`

## Signature

```ts
useChangeKey(value: unknown): number
```

const n = useChangeKey(status); <span key={n} className={n > 0 ? "animate-pop" : undefined}>{icon}</span>

It derives the key while rendering (React's "adjust state when a prop changes" pattern), so the new value and its new key land in the same commit: no frame with the new value and the old key, and it is safe under StrictMode.
