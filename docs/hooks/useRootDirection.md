# useRootDirection

> For wrappers of Radix roots, which always write a `dir` attribute (ltr when told nothing): the direction in effect where the root sits, read from its parent so that a provider, a `dir` container, an LTR island or `<html dir>` all win in that order. Pass the forwarded ref in and put the returned ref on the root; pass `dir` before the consumer's props.

- Import: `import { useRootDirection } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-direction`

## Signature

```ts
useRootDirection<T extends Element>(forwarded?: Ref<T> | undefined): { ref: (instance: T | null) => void | (() => VoidOrUndefinedOnly); dir: Direction; }
```
