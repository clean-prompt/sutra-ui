# BookmarksPane

> Pane listing bookmarked messages; click jumps to the message.

- Import: `import { BookmarksPane } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `bookmarks` (required) | `TranscriptBookmark[]` |  | Bookmarked messages with their id, excerpt and time. |
| `emptyState` | `React.ReactNode` |  | Shown when there is nothing to list. Default "Bookmark a message to find it here". |
| `emptyText` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `onClose` | `() => void` |  | Called when the user closes the pane; the close button is hidden when unset. |
| `onJump` | `(id: string) => void` |  | Called on click; when omitted the element with the bookmark's id is scrolled into view. |
| `onRemove` | `(id: string) => void` |  | Called with the bookmark id when the user removes it; the remove button is hidden when unset. |
| `title` | `React.ReactNode` | `"Bookmarks"` | Default "Bookmarks". |
