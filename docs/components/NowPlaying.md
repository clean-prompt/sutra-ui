# NowPlaying

> Full-screen expanded player sheet: slides up, swipe down (from the top of its scroll) to dismiss.

- Import: `import { NowPlaying } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/audio-player-now-playing` (kit `media`)
- `data-slot`: `now-playing-scroll`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `playing` (required) | `boolean` |  | Whether audio is playing; sets the play and pause icon. |
| `track` (required) | `PlayerTrack \| null` |  | Track that is loaded (title, artist, artwork); `null` shows an empty player. |
| `actions` | `React.ReactNode` |  | Extra action buttons next to favorite / add (e.g. a "More" menu). |
| `buffered` | `MediaTimeRange[] \| number` |  | Buffered ranges, or a single buffered-until time, drawn on the seek bar. |
| `buffering` | `boolean` |  | Shows a spinner on the play button while audio loads. |
| `className` | `string` |  | Extra classes for the full-screen player. |
| `context` | `React.ReactNode` |  | Where playback comes from, e.g. "Playlist · Road trip". |
| `currentTime` | `number` |  | Playback position in seconds. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. Default false. |
| `duration` | `number` |  | Track length in seconds. Default 0; an infinite or NaN value marks a live stream with no progress or seeking. |
| `favorite` | `boolean` |  | Whether the track is a favourite; fills the heart button. |
| `hasNext` | `boolean` |  | Whether a next track exists; `false` disables Next (it is also disabled without `onNext`). |
| `hasPrevious` | `boolean` |  | Whether a previous track exists; `false` disables Previous (it is also disabled without `onPrevious`). |
| `header` | `React.ReactNode` |  | Centered header content, e.g. "Playing from Road trip". |
| `media` | `React.ReactNode` |  | Replaces the artwork (e.g. a `<video>`). |
| `muted` | `boolean` |  | Whether audio is muted. |
| `onAddToPlaylist` | `() => void` |  | Called when the user presses Add to playlist; the button is hidden when unset. |
| `onFavoriteChange` | `(favorite: boolean) => void` |  | Called with the new state when the user toggles the heart; the button is hidden when unset. |
| `onMutedChange` | `(muted: boolean) => void` |  | Called with the new state when the user presses the mute button. |
| `onNext` | `() => void` |  | Called when the user presses Next. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the full-screen player opens or closes. |
| `onPlayPause` | `() => void` |  | Called when the user presses the play or pause button. |
| `onPrevious` | `() => void` |  | Called when the user presses Previous. |
| `onRepeatChange` | `(repeat: RepeatMode) => void` |  | Called with the next mode when the user cycles repeat; the button is hidden when unset. |
| `onSeek` | `(time: number) => void` |  | Called with the time in seconds when the user seeks. |
| `onShuffleChange` | `(shuffle: boolean) => void` |  | Called with the new state when the user toggles shuffle; the button is hidden when unset. |
| `onVolumeChange` | `(volume: number) => void` |  | Called with the volume (0 to 1) when the user moves the slider; the volume control is hidden when unset. |
| `open` | `boolean` |  | Controlled open state. |
| `queue` | `React.ReactNode` |  | Queue rendered under "Up next" (e.g. a `QueueList`). |
| `queuePosition` | `{ index: number; total: number }` |  | 0-based position, rendered as "3 of 12". |
| `queueTitle` | `React.ReactNode` | `"Up next"` | Heading above the queue. Default "Up next". |
| `repeat` | `RepeatMode` |  | Repeat mode (`off`, `all` or `one`) shown on the repeat button. |
| `shuffle` | `boolean` |  | Shuffle state shown on the shuffle button. |
| `volume` | `number` |  | Volume from 0 to 1. |

## Example (live: `#/components/media-player/now-playing` in the playground)

```tsx
import { Button } from "@sutra/ui/core";
import { RiMore2Fill } from "@sutra/ui/icons";
import { NowPlaying } from "@sutra/ui/media";

<Button onClick={() => player.setExpanded(true)}>Open now playing</Button>
<NowPlaying
  open={player.expanded}
  onOpenChange={player.setExpanded}
  {...player.transport}
  header="Playing from Daily mix"
  onAddToPlaylist={() => console.info("add to playlist")}
  actions={
    <button type="button" aria-label="More" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
      <RiMore2Fill className="size-[18px]" />
    </button>
  }
  queue={player.queueList}
/>
```
