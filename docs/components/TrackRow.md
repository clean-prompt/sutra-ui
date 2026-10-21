# TrackRow

> Track list row: number/now-playing bars, hover play, artwork, title/artist, album, duration and menu slot.

- Import: `import { TrackRow } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/audio-player-track-row` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `track` (required) | `PlayerTrack` |  | The track to show (title, artist, album, artwork, duration). |
| `actions` | `React.ReactNode` |  | Extra inline actions shown on hover. |
| `current` | `boolean` | `false` | This row is the queue's current track. |
| `favorite` | `boolean` |  | Whether the track is a favourite; fills the heart button. |
| `index` | `number` |  | 1-based number shown in the lead column. |
| `menu` | `React.ReactNode` |  | Trailing menu (e.g. a DropdownMenu trigger). |
| `onFavoriteChange` | `(favorite: boolean) => void` |  | Called with the new state when the user toggles the heart; the button is hidden when unset. |
| `onPause` | `(track: PlayerTrack) => void` |  | Pause when this is the current playing row (falls back to `onPlay`). |
| `onPlay` | `(track: PlayerTrack) => void` |  | Called with the track when the user presses the row's play button. |
| `playing` | `boolean` | `false` | Whether this row's track is playing; shows the pause icon and the now-playing bars. |
| `showAlbum` | `boolean` | `true` | Shows the album column. Default true. |
| `showArtwork` | `boolean` | `true` | Shows the artwork thumbnail. Default true. |

## Example (live: `#/components/media-player/track-row` in the playground)

```tsx
import { RiMore2Fill } from "@sutra/ui/icons";
import { TrackRow } from "@sutra/ui/media";

<div className="w-full">
  {queue.items.map((t, i) => (
    <TrackRow
      key={t.id}
      track={t}
      index={i + 1}
      current={t.id === queue.currentId}
      playing={t.id === queue.currentId && media.playing}
      onPlay={(track) => player.playIndex(track.id)}
      onPause={() => media.pause()}
      favorite={player.favorites.has(t.id)}
      onFavoriteChange={() => {}}
      menu={
        <button type="button" aria-label={`More options for ${t.title}`} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent">
          <RiMore2Fill className="size-4" />
        </button>
      }
    />
  ))}
  <TrackRow track={{ id: "gone", title: "Removed upload", unavailable: true }} index={9} onPlay={() => {}} />
</div>
```
