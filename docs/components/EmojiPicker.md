# EmojiPicker

> A compact emoji picker with categories, keyword search and recently used emoji.

- Import: `import { EmojiPicker } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/emoji-reactions` (assets)
- `data-slot`: `emoji-picker`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoFocus` | `boolean` | `false` | Focuses the search field on mount. |
| `bare` | `boolean` | `false` | Drop the card surface (background, border, radius, shadow), e.g. when inside a popover. |
| `categories` | `EmojiCategory[]` | `emojiCategories` | Categories to show, in order, instead of the full set. |
| `columns` | `number` | `8` | Number of grid columns. |
| `defaultRecent` | `string[]` | `[]` | Initial recently used emoji when uncontrolled. |
| `maxRecent` | `number` | `16` | Maximum number of recent emoji kept. |
| `onRecentChange` | `(recent: string[]) => void` |  | Called with the new recent list after a pick. |
| `onSelect` | `(emoji: string, entry: EmojiEntry) => void` |  | Called with the picked emoji and its dictionary entry. |
| `quickPicks` | `readonly string[]` |  | Emoji shown as a quick-pick row above the search field. |
| `recent` | `string[]` |  | Recently used emoji (controlled). |
| `searchPlaceholder` | `string` | `"Search emoji"` | Placeholder of the search field. |
