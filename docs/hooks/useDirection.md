# useDirection

> The reading direction components should assume: the nearest `DirectionProvider` with a `dir`, else the `dir` of the document (`<html dir>`, followed live), else `"ltr"`. Pass a ref to read the nearest `dir` ancestor of that element instead (a chart pinned to `dir="ltr"` inside an RTL page). The server renders `"ltr"` and the value settles after hydration.

- Import: `import { useDirection } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-direction`

## Signature

```ts
useDirection(ref?: RefObject<Element | null> | undefined): Direction
```
