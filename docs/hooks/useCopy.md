# useCopy

> Copy text to the clipboard; `copied` flips true for `timeout` ms.

- Import: `import { useCopy } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-copy`

## Signature

```ts
useCopy(timeout?: number): { copied: boolean; copy: (text: string) => Promise<boolean>; }
```
