# MediaHero

> Featured banner: backdrop with gradients, title/logo, meta chips, clamped synopsis, Play and More info.

- Import: `import { MediaHero } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-cards` (kit `media`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Title of the film or show; the accessible name even when `logo` replaces it visually. |
| `actions` | `React.ReactNode` |  | Extra buttons after Play / More info. |
| `backdrop` | `string` |  | Full-bleed background image URL. |
| `eyebrow` | `React.ReactNode` |  | Small line above the title (for example "New episode" or "Featured"). |
| `logo` | `string` |  | Title artwork (replaces the text title visually; the title stays the accessible name). |
| `meta` | `React.ReactNode[]` |  | Short facts shown as chips: year, rating, runtime, genres. |
| `moreInfoLabel` | `string` | `"More info"` | Label of the more-info button. Default "More info". |
| `onMoreInfo` | `() => void` |  | Called when the user presses the more-info button; the button is hidden when unset. |
| `onPlay` | `() => void` |  | Called when the user presses the play button; the button is hidden when unset. |
| `playLabel` | `string` | `"Play"` | Label of the play button. Default "Play". |
| `progress` | `number` |  | Watch progress 0–100 with an optional label ("38 min left"). |
| `progressLabel` | `React.ReactNode` |  | Text beside the progress bar (for example "38 min left"). |
| `synopsis` | `React.ReactNode` |  | Short description under the title. |

## Example (live: `#/components/media-player/media-hero` in the playground)

```tsx
import { MediaHero } from "@sutra/ui/media";

<MediaHero
  eyebrow="Featured"
  title="Tidewater"
  backdrop={art("#0b3b5a", "#00b8db", "", 1600, 700)}
  meta={["2026", "TV-14", "1 season", "Mystery"]}
  synopsis="On a fog-bound island, a lighthouse keeper's apprentice discovers that the tide tables have been predicting more than the water. Each low tide reveals another piece of a ship that sank a hundred years before it was built."
  onPlay={() => {}}
  onMoreInfo={() => {}}
  progress={38}
  progressLabel="E2 · 31 min left"
/>
```

Playground helpers in this snippet (not part of the library): art.
