# useScrollEdges

> Scroll-edge detection for fades and prev/next buttons; updates on scroll and on resize of the container or its content.

- Import: `import { useScrollEdges } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-scroll-edges`

## Signature

```ts
useScrollEdges<T extends HTMLElement>(ref: RefObject<T | null>, options?: UseScrollEdgesOptions): ScrollEdges & { update: () => void; }
```
