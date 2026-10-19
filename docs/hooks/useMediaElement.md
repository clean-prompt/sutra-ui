# useMediaElement

> Subscribes to an `HTMLMediaElement` (or any `MediaElementLike`) and exposes its state plus imperative actions. Autoplay refusals fall back to muted playback and raise `autoplayMuted`.

- Import: `import { useMediaElement } from "@sutra/ui/media"`
- Source: `packages/ui/src/kits/media/media-controls`

## Signature

```ts
useMediaElement(target: MediaElementLike | RefObject<MediaElementLike | null> | RefObject<HTMLMediaElement | null> | null, options?: UseMediaElementOptions): UseMediaElementResult
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `buffered` | `TimeRanges` |  |  |
| `currentTime` | `number` |  |  |
| `duration` | `number` |  |  |
| `ended` | `boolean` |  |  |
| `error` | `{ code: number; message?: string } \| null` |  |  |
| `load` | `(() => void)` |  |  |
| `muted` | `boolean` |  |  |
| `pause` | `() => void` |  |  |
| `paused` | `boolean` |  |  |
| `play` | `() => void \| Promise<void>` |  |  |
| `playbackRate` | `number` |  |  |
| `readyState` | `number` |  |  |
| `volume` | `number` |  |  |
