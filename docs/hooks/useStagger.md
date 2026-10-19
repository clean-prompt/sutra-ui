# useStagger

> `stagger` with a fixed `step` (ms), as a stable function for a list: `const at = useStagger(20); style={at(i)}`.

- Import: `import { useStagger } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-stagger`

## Signature

```ts
useStagger(step?: number | undefined): (index: number) => StaggerStyle
```
