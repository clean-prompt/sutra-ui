# PlaylistCard

> Playlist variant of AlbumCard: optional 2×2 cover mosaic and a track-count subtitle.

- Import: `import { PlaylistCard } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-cards-collection` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Album, playlist or artist name, shown under the artwork. |
| `artworks` | `string[]` |  | Up to four covers, shown as a 2×2 mosaic when there is no single image. |
| `count` | `number` |  | Track count; used for the default subtitle ("12 tracks"). |
| `href` | `string` |  | Makes the card a link to this address instead of a button. |
| `image` | `string` |  | Artwork image URL. |
| `onOpen` | `() => void` |  | Open the album/playlist (whole card). |
| `onPlay` | `() => void` |  | Floating play button on the artwork. |
| `playing` | `boolean` |  | This collection is what is playing (FAB shows pause and stays visible). |
| `shape` | `"square" \| "circle"` |  | Circle for artists. Default "square". |
| `subtitle` | `React.ReactNode` |  | Line under the title (for example the artist or the track count). |
