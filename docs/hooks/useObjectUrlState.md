# useObjectUrlState

> An object URL for a Blob or File plus a pending flag. The URL is created in an effect (StrictMode-safe), revoked when the source changes or the component unmounts, and never returned for a source other than the current one (so a revoked URL is never rendered). Without `URL.createObjectURL` (old runtimes, some test setups) it settles on `url: undefined`.

- Import: `import { useObjectUrlState } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-object-url`

## Signature

```ts
useObjectUrlState(source: Blob | null | undefined): ObjectUrlState
```
