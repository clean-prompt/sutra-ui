# useResizeObserver

> Calls `callback` whenever the element resizes (no-op where `ResizeObserver` is missing).

- Import: `import { useResizeObserver } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-resize-observer`

## Signature

```ts
useResizeObserver<T extends Element>(target: Target<T>, callback: (entry: ResizeObserverEntry) => void): void
```
