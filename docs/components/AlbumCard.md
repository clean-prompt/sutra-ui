# AlbumCard

> Square album art with a hover play FAB, title and subtitle.

- Import: `import { AlbumCard } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-cards-collection` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Album, playlist or artist name, shown under the artwork. |
| `href` | `string` |  | Makes the card a link to this address instead of a button. |
| `image` | `string` |  | Artwork image URL. |
| `onOpen` | `() => void` |  | Open the album/playlist (whole card). |
| `onPlay` | `() => void` |  | Floating play button on the artwork. |
| `playing` | `boolean` |  | This collection is what is playing (FAB shows pause and stays visible). |
| `shape` | `"square" \| "circle"` |  | Circle for artists. Default "square". |
| `subtitle` | `React.ReactNode` |  | Line under the title (for example the artist or the track count). |

## Example (live: `#/components/media-player/album-card` in the playground)

```tsx
import { AlbumCard, PlaylistCard } from "@sutra/ui/media";

<div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
  <AlbumCard title="Tidal" subtitle="Nadia Vale · 2025" image={demoTracks[0].artwork} onOpen={() => {}} onPlay={() => player.playIndex("t1")} playing={queue.currentId === "t1" && media.playing} />
  <AlbumCard title="Canopy" subtitle="Mossline · 2024" image={demoTracks[2].artwork} onOpen={() => {}} onPlay={() => player.playIndex("t3")} />
  <PlaylistCard title="Daily mix" count={8} artworks={demoTracks.slice(0, 4).map((t) => t.artwork!)} onOpen={() => {}} onPlay={() => player.playIndex("t1")} />
  <PlaylistCard title="Empty playlist" count={0} onOpen={() => {}} />
  <AlbumCard title="Mossline" subtitle="Artist" shape="circle" image={demoTracks[5].artwork} onOpen={() => {}} onPlay={() => player.playIndex("t6")} />
</div>
```

Playground helpers in this snippet (not part of the library): demoTracks.
