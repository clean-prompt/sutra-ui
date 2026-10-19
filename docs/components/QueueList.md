# QueueList

> Reorderable queue: current row marked with NowPlayingBars, tap to jump, remove, drag or Alt+↑/↓ to reorder.

- Import: `import { QueueList } from "@sutra/ui"` (or from `@sutra/ui/media`)
- Source: `packages/ui/src/kits/media/audio-player` (kit `media`)
- `data-slot`: `queue-drop-indicator`, `queue-handle`, `queue-select`, `queue-remove`, `queue-announcer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `PlayerTrack[]` |  | Tracks in the queue, in play order. |
| `currentId` | `string \| null` |  | Id of the track that is current; its row is highlighted. |
| `emptyMessage` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when the queue is empty. Default "Nothing queued". |
| `label` | `string` | `"Queue"` | Accessible list name. Default "Queue". |
| `onRemove` | `(item: PlayerTrack, index: number) => void` |  | Called with the track and its index when the user removes a row; the remove action is hidden when unset. |
| `onReorder` | `(from: number, to: number) => void` |  | Enables drag handles and Alt+↑/↓. Indices are positions in `items`. |
| `onSelect` | `(item: PlayerTrack, index: number) => void` |  | Tap a row to jump to it. |
| `playing` | `boolean` | `false` | Whether the current track is playing; animates the now-playing bars on its row. |

## Example (live: `#/components/media-player/queue-list` in the playground)

```tsx
<div className="w-full max-w-lg">{player.queueList}</div>
```
