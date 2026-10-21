# MediaShelf

> Horizontal media shelf: title + "See all", scroll-snap row with edge fades and prev/next, optional grid from a breakpoint.

- Import: `import { MediaShelf } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-cards-shelf` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Heading of the shelf. |
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `gridAbove` | `ShelfBreakpoint` |  | Switch from a scrolling row to a wrapping grid from this breakpoint. |
| `itemClassName` | `string` | `"w-36 sm:w-40 md:w-44"` | Width classes for each item in the row. Default "w-36 sm:w-40 md:w-44". |
| `listClassName` | `string` |  | Classes for the scrolling list (e.g. a different gap). |
| `onSeeAll` | `() => void` |  | Called when the user presses See all; with `seeAllHref` set the link is used instead. |
| `seeAllHref` | `string` |  | Address of the See all link. |
| `seeAllLabel` | `string` | `"See all"` | Label of the See all link. Default "See all". |

## Example (live: `#/components/media-player/media-shelf` in the playground)

```tsx
import { AlbumCard, MediaShelf, PosterCard } from "@sutra/ui/media";

<MediaShelf title="Continue watching" description="Pick up where you left off" onSeeAll={() => {}}>
  {Array.from({ length: 12 }, (_, i) => (
    <PosterCard
      key={i}
      title={["Arrival", "Dune", "Her", "Moon", "Primer", "Sunshine"][i % 6] + (i >= 6 ? " II" : "")}
      year={2000 + i}
      image={art(palette[i % 8][0], palette[i % 8][1], `#${i + 1}`, 400, 600)}
      progress={(i * 17) % 90}
      onPlay={() => {}}
    />
  ))}
</MediaShelf>
<MediaShelf title="Albums" gridAbove="lg" itemClassName="w-36 sm:w-40">
  {demoTracks.slice(0, 6).map((t) => (
    <AlbumCard key={t.id} title={t.album!} subtitle={t.artist} image={t.artwork} onOpen={() => {}} onPlay={() => player.playIndex(t.id)} />
  ))}
</MediaShelf>
```

Playground helpers in this snippet (not part of the library): art, demoTracks, palette.
