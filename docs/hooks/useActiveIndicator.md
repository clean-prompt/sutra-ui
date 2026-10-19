# useActiveIndicator

> Measures the active item of a tab strip / segmented control for a sliding indicator. `getActive` is a selector (queried inside the container) or a function returning the element. Re-measures when `deps` change, when the container or its items resize, and on `watchAttributes` mutations. Items are re-collected for the resize observer whenever `deps` change, so items added later are watched too.

- Import: `import { useActiveIndicator } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-active-indicator`

## Signature

```ts
useActiveIndicator<T extends HTMLElement>(containerRef: RefObject<T | null>, getActive: string | ((container: T) => HTMLElement | null | undefined), deps?: DependencyList, options?: UseActiveIndicatorOptions): ActiveIndicatorState
```
