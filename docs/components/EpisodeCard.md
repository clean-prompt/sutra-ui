# EpisodeCard

> Landscape 16:9 episode card with episode number, runtime, description, progress and actions.

- Import: `import { EpisodeCard } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-cards` (kit `media`)
- `data-slot`: `media-status`, `media-actions`, `media-progress`, `media-busy`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Title of the film or show; shown under the poster and in the accessible name. |
| `actions` | `MediaCardAction[]` |  | Quiet icon actions revealed on hover (always visible on touch). |
| `busy` | `MediaBusyState` |  | Blocking overlay, e.g. `{ label: "Moving…", progress: 42 }`. |
| `description` | `React.ReactNode` |  | Short synopsis under the title. |
| `disabled` | `boolean` |  | Disables the main action and dims the poster. |
| `disabledReason` | `string` |  | Why the poster cannot be played; shown as a tooltip and read with the title. |
| `episode` | `number \| string` |  | Episode number, shown in the meta line and the default accessible name. |
| `href` | `string` |  | Makes the poster a link to this address instead of a button. |
| `image` | `string` |  | Poster image URL. |
| `imageAlt` | `string` |  | Alt text of the poster; decorative (empty) by default, since the title is shown beside it. |
| `meta` | `React.ReactNode` |  | Extra meta after the year, e.g. "2h 14m" or "8 episodes". |
| `onPlay` | `() => void` |  | Primary action (the whole poster is the hit target). |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | Thumbnail beside the text instead of above it. |
| `playLabel` | `string` |  | Accessible name of the poster's main action. Default "Play {title}". |
| `progress` | `number` |  | Watch progress 0–100 (strip along the bottom). |
| `runtime` | `number \| string` |  | Seconds, or a preformatted string. |
| `season` | `number \| string` |  | Season number, shown in the meta line. |
| `status` | `MediaStatus` |  | One status badge, top-left. |

## Example (live: `#/components/media-player/episode-card` in the playground)

```tsx
import { RiTimeLine } from "@sutra/ui/icons";
import { EpisodeCard } from "@sutra/ui/media";

<div className="@container w-full">
  <div className="grid grid-cols-1 w-full gap-6 @2xl:grid-cols-[1fr_1.4fr]">
    <EpisodeCard
      title="The Lighthouse"
      season={1}
      episode={1}
      runtime={3120}
      progress={72}
      description="A storm cuts the island off from the mainland, and the keeper's logbook starts writing itself."
      image={art(palette[0][0], palette[0][1], "E1", 640, 360)}
      actions={posterActions("The Lighthouse").slice(0, 2)}
      onPlay={() => {}}
    />
    <div className="flex flex-col gap-4">
      {episodes.slice(1).map((e, i) => (
        <EpisodeCard
          key={e.id}
          orientation="horizontal"
          title={e.title}
          season={1}
          episode={e.n}
          runtime={2700 + i * 300}
          description="The crew follows a signal to the old pier, where the water is far too warm for October."
          image={art(e.colors[0], e.colors[1], `E${e.n}`, 640, 360)}
          status={i === 1 ? { label: "Queued", icon: <RiTimeLine /> } : undefined}
          onPlay={() => {}}
        />
      ))}
    </div>
  </div>
</div>
```

Playground helpers in this snippet (not part of the library): art, episodes, palette, posterActions.
