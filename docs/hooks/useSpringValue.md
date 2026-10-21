# useSpringValue

> A number that springs toward `target` for values CSS cannot animate (a count-up, a gauge angle, a value fed to a canvas). Prefer CSS (`transition-spring`) for anything a transition can do. It returns the current value (one render per frame while it moves, none at rest); with `onUpdate` it returns nothing and does not re-render. Retargeting mid-flight keeps the velocity. Under `prefers-reduced-motion` it jumps straight to the target. The frame loop stops at rest and on unmount.

- Import: `import { useSpringValue } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-spring-value`

## Signature

```ts
useSpringValue(target: number, options: UseSpringValueOptions & { onUpdate: (value: number) => void; }): void
```
