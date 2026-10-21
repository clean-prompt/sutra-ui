# PosterCard

> 2:3 poster with fallback, hover play, quiet actions, status/language badges, watch progress and busy overlay.

- Import: `import { PosterCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/media`)
- Source: `packages/ui/src/kits/media/media-cards-poster` (kit `media`)
- `data-slot`: `media-status`, `media-actions`, `media-progress`, `media-busy`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Title of the film or show; shown under the poster and in the accessible name. |
| `actions` | `MediaCardAction[]` |  | Quiet icon actions revealed on hover (always visible on touch). |
| `busy` | `MediaBusyState` |  | Blocking overlay, e.g. `{ label: "Moving…", progress: 42 }`. |
| `disabled` | `boolean` |  | Disables the main action and dims the poster. |
| `disabledReason` | `string` |  | Why the poster cannot be played; shown as a tooltip and read with the title. |
| `href` | `string` |  | Makes the poster a link to this address instead of a button. |
| `image` | `string` |  | Poster image URL. |
| `imageAlt` | `string` |  | Alt text of the poster; decorative (empty) by default, since the title is shown beside it. |
| `languages` | `string[]` |  | Audio/subtitle language codes shown as small badges. |
| `meta` | `React.ReactNode` |  | Extra meta after the year, e.g. "2h 14m" or "8 episodes". |
| `onPlay` | `() => void` |  | Primary action (the whole poster is the hit target). |
| `playLabel` | `string` |  | Accessible name of the poster's main action. Default "Play {title}". |
| `progress` | `number` |  | Watch progress 0–100 (strip along the bottom). |
| `ratio` | `number` | `2 / 3` | Width / height. Default 2/3. |
| `status` | `MediaStatus` |  | One status badge, top-left. |
| `year` | `string \| number` |  | Release year, shown in the meta line. |

## Example (live: `#/components/media-player/poster-card` in the playground)

```tsx
import { PosterCard } from "@cleanprompt/sutra-ui/media";

function PosterGrid() {
  return (
    <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {movies.map((m, i) => (
        <PosterCard
          key={m.title}
          title={m.title}
          year={m.year}
          meta={m.meta}
          image={m.noImage ? undefined : art(palette[i][0], palette[i][1], m.title, 400, 600)}
          progress={m.progress}
          languages={m.languages}
          status={m.status}
          busy={m.busy}
          disabled={m.disabled}
          disabledReason="Storage node is offline"
          actions={posterActions(m.title)}
          onPlay={() => console.info("play", m.title)}
        />
      ))}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): art, movies, palette, posterActions.
