# useMergedRefs

> `mergeRefs` with a stable identity while the refs themselves don't change (avoids ref churn on every render).

- Import: `import { useMergedRefs } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-merged-refs`

## Signature

```ts
useMergedRefs<T>(...refs: (Ref<T> | undefined)[]): (instance: T | null) => void | (() => VoidOrUndefinedOnly)
```
