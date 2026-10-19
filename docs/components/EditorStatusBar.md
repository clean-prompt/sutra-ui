# EditorStatusBar

> Editor footer: save status and presence on the left; counts, reading time, cursor and mode on the right.

- Import: `import { EditorStatusBar } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/kits/editor/editor-status` (kit `editor`)
- `data-slot`: `editor-status-bar`, `editor-mode`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `characters` | `number` |  | Explicit character count (overrides `text`). |
| `cursor` | `{ line: number; column: number }` |  | 1-based cursor position. |
| `mode` | `React.ReactNode` |  | Mode chip, e.g. "Live" or "Offline". |
| `modeTone` | `EditorModeTone` | `"neutral"` | Colour of the mode chip: `live`, `offline`, `neutral` or `warning`. |
| `presence` | `React.ReactNode` |  | Left, after the status: e.g. `PresenceAvatars` or `TypingIndicator`. |
| `selectionLength` | `number` |  | Selection length, shown as "(N selected)" after the cursor. |
| `showCharacters` | `boolean` | `true` | Shows the character count. Default true. |
| `showPages` | `boolean` | `true` | Shows the estimated page count. Default true. |
| `showReadingTime` | `boolean` | `true` | Shows the estimated reading time. Default true. |
| `showWords` | `boolean` | `true` | Shows the word count. Default true. |
| `statsOptions` | `TextStatsOptions` |  | Options for counting words and reading time (reading speeds, CJK handling). |
| `status` | `React.ReactNode` |  | Left: usually a `SaveStatus`. |
| `text` | `string` |  | Document text; word/character counts, reading time and pages are derived from it. |
| `words` | `number` |  | Explicit word count (overrides `text`). |
