# useSwipe

> Detects a flick (decided when the pointer lifts, so it never fights native scrolling). Spread the returned handlers on an element; give it a matching `touch-action` (e.g. `touch-pan-y` for horizontal swipes).

- Import: `import { useSwipe } from "@cleanprompt/sutra-ui/mobile"`
- Source: `packages/ui/src/hooks/use-swipe`

## Signature

```ts
useSwipe(options?: UseSwipeOptions): SwipeHandlers
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `allow` | `(event: React.PointerEvent<HTMLElement>) => boolean` |  | Asked on pointer down; return false to ignore the whole gesture (e.g. from inside a slider). |
| `axis` | `"x" \| "y" \| "both"` |  | Which axis counts. Default "both". |
| `enabled` | `boolean` |  | Turns the gesture off without unmounting; on unless set to `false`. |
| `maxDuration` | `number` |  | Slower gestures are reading/scrolling, not flicks. Default 750ms. |
| `mouse` | `boolean` |  | Also react to mouse drags (touch and pen always count). Default false. |
| `onSwipe` | `(info: SwipeInfo) => void` |  | Called after any recognised swipe, with its direction, `dx`, `dy`, duration and velocity. |
| `onSwipeDown` | `(info: SwipeInfo) => void` |  | Called after a downward swipe. |
| `onSwipeLeft` | `(info: SwipeInfo) => void` |  | Called after a swipe towards the left of the screen (not logical start). |
| `onSwipeRight` | `(info: SwipeInfo) => void` |  | Called after a swipe towards the right of the screen (not logical end). |
| `onSwipeUp` | `(info: SwipeInfo) => void` |  | Called after an upward swipe. |
| `ratio` | `number` |  | The winning axis must beat the other by this factor. Default 1.5. |
| `threshold` | `number` |  | Minimum travel in px. Default 56. |
