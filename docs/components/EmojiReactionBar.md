# EmojiReactionBar

> A row of reaction pills with an add-reaction button that opens an emoji picker.

- Import: `import { EmojiReactionBar } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/emoji-reactions` (assets)
- Part of [`EmojiReaction`](EmojiReaction.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `addLabel` | `string` | `"Add reaction"` | Accessible name of the add-reaction button. |
| `defaultReactions` | `EmojiReactionItem[]` | `[]` | Initial reactions when uncontrolled. |
| `ink` | `boolean` |  | Draw the reactions and the picker as ink: `true` in every style, `false` keeps the colour glyphs in the paper style; unset follows the style (ink in the paper style). |
| `inkMotion` | `boolean` | `true` | Moves the ink emoji: once on hover and focus, and with the pop when a reaction is added (also from the picker). Reduced motion keeps them still. |
| `inkVariant` | `InkEmojiVariant` | `"solid"` | Which drawing the ink emoji show in the chips and the picker: `solid` (filled, features cut out), `tint` (solid plus a tint) or `outline`. |
| `onReact` | `(emoji: string, reacted: boolean) => void` |  | Fired whenever the current user adds or removes a reaction. |
| `onReactionsChange` | `(reactions: EmojiReactionItem[]) => void` |  | Called with the full reaction list after the user adds or removes one. |
| `presets` | `readonly string[]` | `reactionPresets` | Quick picks shown at the top of the picker. |
| `reactions` | `EmojiReactionItem[]` |  | Reactions (controlled). |
| `readOnly` | `boolean` | `false` | Hide the add-reaction button. |
| `size` | `"sm" \| "md"` | `"md"` | Chip height and text size. |

## Notes

See the notes in [`EmojiReaction`](EmojiReaction.md#notes).

## Example

```tsx
import { EmojiReactionBar } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <EmojiReactionBar
      defaultReactions={[
        { emoji: "👍", count: 12, reacted: true },
        { emoji: "🎉", count: 5 },
        { emoji: "🦊", count: 1 },
      ]}
      inkVariant="solid"
      onReact={(emoji, reacted) => console.log(emoji, reacted)}
    />
  );
}
```
