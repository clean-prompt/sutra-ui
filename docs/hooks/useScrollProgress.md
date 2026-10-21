# useScrollProgress

> The script fallback of the scroll-driven utilities. In browsers with `animation-timeline` the CSS does everything and this hook does nothing (unless `always`). Elsewhere it marks the element `data-scroll="script"` and writes `--sutra-progress` (0..1, three decimals) from the element's position, one passive scroll listener and one frame per scroll burst; the same CSS reads the variable, whose default is 1, so an element with no script and no timeline shows its end state. Under reduced motion it does nothing at all. Write the variable on the element you pass.

- Import: `import { useScrollProgress } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-scroll-progress`

## Signature

```ts
useScrollProgress(ref: RefObject<HTMLElement | null>, options?: UseScrollProgressOptions): void
```
