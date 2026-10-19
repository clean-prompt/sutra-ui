# SeekBar

> Media scrubber with buffered and played layers, hover time preview, chapters and keyboard seeking.

- Import: `import { SeekBar } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/media-controls` (kit `media`)
- `data-slot`: `seek-buffered`, `seek-played`, `seek-chapter`, `seek-preview`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `duration` (required) | `number` |  | Total length in seconds. |
| `value` (required) | `number` |  | Current playback time (seconds). |
| `buffered` | `MediaTimeRange[] \| number` |  | Buffered ranges, or a single buffered-until time. |
| `chapters` | `MediaChapter[]` |  | Chapter markers drawn on the track, each with a start time and title. |
| `defaultTimeDisplay` | `"total" \| "remaining"` | `"total"` | Initial mode of the right-hand label when `timeDisplay` is not controlled. Default "total". |
| `disabled` | `boolean` |  | Disables dragging, clicking and keyboard seeking. |
| `label` | `string` | `"Seek"` | Accessible name of the slider. |
| `onScrub` | `(time: number \| null) => void` |  | Live scrub position while dragging; `null` when the drag ends. |
| `onSeek` | `(time: number) => void` |  | Commit a seek (keyboard, click, end of drag). |
| `onTimeDisplayChange` | `(mode: "total" \| "remaining") => void` |  | Called with `total` or `remaining` when the user toggles the right-hand label. |
| `showTimes` | `boolean \| "inline" \| "below"` | `"inline"` | Elapsed/total labels: beside the bar (`"inline"`), under it (`"below"`) or hidden. Default "inline". |
| `size` | `"sm" \| "md"` | `"md"` | Track thickness: `sm` or `md`. |
| `step` | `number` | `5` | Arrow-key step in seconds. Default 5. |
| `thumbnails` | `(time: number) => string \| null` |  | Preview image for a time, shown in the hover bubble. |
| `timeDisplay` | `"total" \| "remaining"` |  | Right-hand label shows the total or the remaining time (click toggles). |
| `tone` | `MediaTone` | `"default"` | `default` follows the theme; `overlay` is for a bar drawn over video. |
