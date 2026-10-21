# useAddedKeys

> The keys that the latest change of `keys` added: empty on the first render and again after a change that only removed or reordered. Give those items an entrance class so a list animates what is new, never what was already there when it mounted:

- Import: `import { useAddedKeys } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-added-keys`

## Signature

```ts
useAddedKeys(keys: readonly string[]): ReadonlySet<string>
```

const added = useAddedKeys(values); <li key={v} className={added.has(v) ? "animate-pop" : undefined}>

The set stays the same until `keys` changes again, so an item keeps its class (and does not replay) across unrelated renders. It derives the set while rendering (React's "adjust state when a prop changes" pattern), so a new item and its class land in the same commit, and it is safe under StrictMode.
