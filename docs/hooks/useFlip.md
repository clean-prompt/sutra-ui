# useFlip

> FLIP for a list: pass the ordered keys and put `register(key)` on each element. When the keys change (a reorder, an insert, a removal), the elements that moved glide from their old place to the new one with WAAPI (`translate`, plus `scale` when asked), on the motion tokens, so a style that retunes them retunes this. Positions are measured relative to the parent, an animation still in flight is cancelled and continued from where the element is, and nothing is measured or animated under `prefers-reduced-motion` (the list just changes) or where `animate` is missing (jsdom). Cancels on unmount; StrictMode's second run measures the same boxes, which is no move. With `enabled` false it measures nothing. Otherwise it measures after every render, on purpose: the "before" positions of the next change are whatever this commit laid out.

- Import: `import { useFlip } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-flip`

## Signature

```ts
useFlip(keys: readonly string[], options?: UseFlipOptions): FlipRegister
```
