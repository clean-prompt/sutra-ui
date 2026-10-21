# useSwipeDismiss

> Drag along one axis and let go: past the distance (or fast enough) it dismisses, otherwise it springs back. Built on `useDrag`, so the offset is in `--sutra-drag-x` / `--sutra-drag-y` and nothing re-renders per move. `reset()` brings a dismissed element back.

- Import: `import { useSwipeDismiss } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-swipe-dismiss`

## Signature

```ts
useSwipeDismiss({ axis, distance, velocity, onDismiss, flyOut, spring, enabled, mouse, allow, onStart, onMove, }: UseSwipeDismissOptions): DragBinding & { reset: () => void; }
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `axis` (required) | `"x" \| "y"` |  |  |
| `onDismiss` (required) | `(direction: -1 \| 1) => void` |  | Called on a committing release with the direction (-1 left or up, 1 right or down). |
| `allow` | `(event: React.PointerEvent<HTMLElement>) => boolean` |  |  |
| `distance` | `number` | `COMMIT_DISTANCE` | Release distance (px) that dismisses. Default 90. |
| `enabled` | `boolean` |  |  |
| `flyOut` | `boolean` | `true` | Fly the element off along the axis after a dismissal (it is the caller's job to remove it). Default true. |
| `mouse` | `boolean` |  |  |
| `onMove` | `(info: DragInfo) => void` |  |  |
| `onStart` | `(info: DragInfo) => void` |  |  |
| `spring` | `SpringConfig \| SpringName` | `"snappy"` | The spring for the fly-out and the snap-back. Default "snappy". |
| `velocity` | `number` | `COMMIT_VELOCITY` | Release speed (px/s) that dismisses. Default 450. |
