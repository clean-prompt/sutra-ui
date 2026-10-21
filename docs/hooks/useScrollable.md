# useScrollable

> True while the element's content overflows its box. A scrolling region needs a keyboard tab stop so the arrow keys can scroll it (WCAG 2.1.1), but one that does not overflow should not add a useless stop: give `tabIndex={scrollable ? 0 : undefined}`. False on the server and on the first client render (so hydration matches), then measured and kept current from resizes of the element, of its children (the content) and of the child list (content added later).

- Import: `import { useScrollable } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-scrollable`

## Signature

```ts
useScrollable<T extends HTMLElement>(ref: RefObject<T | null>): boolean
```
