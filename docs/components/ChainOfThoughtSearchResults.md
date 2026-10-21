# ChainOfThoughtSearchResults

> Wrapping row of source chips under a search step.

- Import: `import { ChainOfThoughtSearchResults } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chain-of-thought` (kit `ai`)
- Part of [`ChainOfThoughtSearchResult`](ChainOfThoughtSearchResult.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `results` | `{ href: string; title?: string; favicon?: string }[]` |  | Data-driven chips; alternatively pass ChainOfThoughtSearchResult children. |
