# MiniPlayer

> Persistent now-playing bar: compact phone layout (tap/swipe up to expand) and a full desktop transport.

- Import: `import { MiniPlayer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/kits/media/audio-player` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `playing` (required) | `boolean` |  | Whether audio is playing; sets the play and pause icon. |
| `track` (required) | `PlayerTrack \| null` |  | Track that is loaded (title, artist, artwork); `null` shows an empty player. |
| `buffered` | `MediaTimeRange[] \| number` |  | Buffered ranges, or a single buffered-until time, drawn on the seek bar. |
| `buffering` | `boolean` |  | Shows a spinner on the play button while audio loads. |
| `context` | `React.ReactNode` |  | Where playback comes from, e.g. "Playlist · Road trip". |
| `currentTime` | `number` | `0` | Playback position in seconds. |
| `duration` | `number` | `0` | Track length in seconds. Default 0; an infinite or NaN value marks a live stream with no progress or seeking. |
| `favorite` | `boolean` |  | Whether the track is a favourite; fills the heart button. |
| `hasNext` | `boolean` |  | Whether a next track exists; `false` disables Next (it is also disabled without `onNext`). |
| `hasPrevious` | `boolean` |  | Whether a previous track exists; `false` disables Previous (it is also disabled without `onPrevious`). |
| `layout` | `"auto" \| "compact" \| "full"` | `"auto"` | "auto" renders the compact bar below `md` and the full bar above. |
| `muted` | `boolean` |  | Whether audio is muted. |
| `onClose` | `() => void` |  | Stops playback and dismisses the bar. |
| `onExpand` | `() => void` |  | Opens the expanded player (row tap, swipe up, chevron). |
| `onFavoriteChange` | `(favorite: boolean) => void` |  | Called with the new state when the user toggles the heart; the button is hidden when unset. |
| `onMutedChange` | `(muted: boolean) => void` |  | Called with the new state when the user presses the mute button. |
| `onNext` | `() => void` |  | Called when the user presses Next. |
| `onPlayPause` | `() => void` |  | Called when the user presses the play or pause button. |
| `onPrevious` | `() => void` |  | Called when the user presses Previous. |
| `onRepeatChange` | `(repeat: RepeatMode) => void` |  | Called with the next mode when the user cycles repeat; the button is hidden when unset. |
| `onSeek` | `(time: number) => void` |  | Called with the time in seconds when the user seeks. |
| `onShuffleChange` | `(shuffle: boolean) => void` |  | Called with the new state when the user toggles shuffle; the button is hidden when unset. |
| `onVolumeChange` | `(volume: number) => void` |  | Called with the volume (0 to 1) when the user moves the slider; the volume control is hidden when unset. |
| `queuePosition` | `{ index: number; total: number }` |  | 0-based position, rendered as "3 of 12". |
| `repeat` | `RepeatMode` |  | Repeat mode (`off`, `all` or `one`) shown on the repeat button. |
| `shuffle` | `boolean` |  | Shuffle state shown on the shuffle button. |
| `volume` | `number` |  | Volume from 0 to 1. |

## Example (live: `#/components/media-player/mini-player` in the playground)

```tsx
<MiniPlayerDemo player={player} />
```

Playground helpers in this snippet (not part of the library): MiniPlayerDemo.
