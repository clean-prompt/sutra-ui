# useCaretAnchor

> Position a fixed popup under (or above) the caret of a field, re-measured on scroll/resize.

- Import: `import { useCaretAnchor } from "@sutra/ui/ai"`
- Source: `packages/ui/src/hooks/use-caret-anchor`

## Signature

```ts
useCaretAnchor(ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>, position: number | null, open: boolean): { top: number; left: number; height: number; } | null
```
