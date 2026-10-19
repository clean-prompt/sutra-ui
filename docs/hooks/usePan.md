# usePan

> Drag with inertia: a release keeps its velocity and slows down with time-based friction; past the bounds it springs back. Built on `useDrag` (offset in `--sutra-drag-x` / `--sutra-drag-y`, no React state per move). A press stops the glide. Under reduced motion following the finger still works but a release stops at once.

- Import: `import { usePan } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-pan`

## Signature

```ts
usePan({ axis, friction, bounds, elastic, spring, onChange, mouse, enabled, allow, }?: UsePanOptions): PanBinding
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `allow` | `(event: React.PointerEvent<HTMLElement>) => boolean` |  |  |
| `axis` | `DragAxis` | `"both"` |  |
| `bounds` | `DragBounds` |  |  |
| `elastic` | `Elastic` | `0.4` | Pull beyond the bounds while dragging (0..1 factor or a curve). Default 0.4. |
| `enabled` | `boolean` |  |  |
| `friction` | `number` | `INERTIA_FRICTION` | Friction per second: the speed decays as `v * exp(-friction * dt)`, so it feels the same at any frame rate. Default 6. |
| `mouse` | `boolean` |  |  |
| `onChange` | `(x: number, y: number) => void` |  | Runs whenever the offset changes. |
| `spring` | `SpringConfig \| SpringName` | `"gentle"` | Spring used to settle back inside the bounds and by `to()`. Default "gentle". |
