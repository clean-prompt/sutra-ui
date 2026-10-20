# EmojiReaction

> A reaction pill showing an emoji and its count; highlighted when the user has reacted.

- Import: `import { EmojiReaction } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/emoji-reactions` (assets)
- Parts: [`EmojiReactionBar`](EmojiReactionBar.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `emoji` (required) | `string` |  | The emoji shown on the chip. |
| `count` | `number` | `0` | How many people reacted; shown beside the emoji, hidden at 0. |
| `defaultReacted` | `boolean` | `false` | Initial reacted state when uncontrolled. |
| `ink` | `boolean` |  | Draw the emoji as ink: `true` in every style, `false` keeps the colour glyph in the paper style; unset follows the style (ink in the paper style). Every emoji of the built-in set uses the hand-drawn `InkEmoji` art, any emoji outside it is filtered to one ink. |
| `inkMotion` | `boolean` | `true` | Moves the ink drawing: it plays once on hover and focus, and with the pop when the reaction is added. Reduced motion keeps it still. |
| `inkVariant` | `InkEmojiVariant` | `"solid"` | Which drawing shows when the emoji is drawn as ink: `solid` (filled, features cut out), `tint` (solid plus a tint for the secondary parts) or `outline` (monoline). |
| `onToggle` | `(reacted: boolean) => void` |  | Called with the new reacted state when the chip is toggled. |
| `playKey` | `number` |  | Pops the emoji (and plays its ink motion) whenever it changes to a truthy value; `EmojiReactionBar` sets it for a reaction added from the picker. |
| `reacted` | `boolean` |  | Whether the current user has reacted (controlled). |
| `size` | `"sm" \| "md"` | `"md"` | Chip height and text size. |

## Part props

### EmojiReactionBar

A row of reaction pills with an add-reaction button that opens an emoji picker.

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

**When to use:** A reaction pill (emoji and count, pressed when you reacted), a bar of them with an add-reaction picker, and the standalone searchable emoji picker. In the paper style every emoji reads as ink on paper: the solid hand-drawn art of the built-in set (or its tint or outline variant), which moves on hover and pops and plays when a reaction is added.

**Use instead when:**
- `InkEmoji`: draw a hand-drawn emoji anywhere, in any style
- `EmojiGlyph`: show an emoji you render yourself with the same ink treatment
- `Badge`: a categorical label with no emoji
- `ToggleButton`: a plain on/off button

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between the reaction pills and the add-reaction button; in the picker, through the search field, the category tabs and the grid |
| Enter, Space | Toggles a pill, opens the add-reaction popover, picks the focused emoji |
| Arrow keys | In the picker grid, move by one cell (Left and Right follow the reading direction, so they swap in RTL) or one row (Up and Down) |
| Escape | Closes the add-reaction popover and returns focus to its button |

Type in the search field to filter by name; the grid then shows only the results.

### Screen readers

- A pill is a toggle button (`aria-pressed`) named like "thumbs reaction, 3 people, including you". The emoji and the number inside are `aria-hidden`, so the name is read once.
- Picker cells are buttons named by their first two keywords ("grinning face"); the preview row and the empty-result icon are decorative.
- The ink version does not change any name or role. The emoji character stays in the DOM inside `data-part="glyph"` (visually hidden when the drawing shows), so copy and paste, find in page and text-based tests still see it.

### Reduced motion

A new reaction pops once (`animate-pop`), which the reduced-motion net shortens to 1 ms. With the ink drawings, a pill's emoji also plays its motion once on hover and focus and when the reaction is added (also from the picker), and a picker cell plays on hover and focus; reduced motion keeps the still drawing (`inkMotion={false}` turns it off everywhere). Switching to ink is not animated. The picker hover scale is a transform transition and also ends under reduced motion.

### Server rendering

Server render: same markup as the client. The markup is the same on the server and the client. The paper style needs a one-ink filter for glyphs without art: the first glyph that mounts adds a hidden `svg#sutra-emoji-ink` to `<body>` in an effect, so before hydration a paper page shows an unfiltered colour glyph for a moment.

### Slots

- `emoji-picker`: the picker root

### Gotchas

- Every emoji sits in `span[data-slot="emoji"]` (see `EmojiGlyph`) with `data-part="glyph"` and, for emoji with art, `data-part="ink"`: style those, not the text. Ink follows the style: in `[data-style="paper"]` everything is ink, elsewhere colour. `ink` on the pill, the bar or the picker forces it (`true`) or keeps colour in the paper style (`false`), the same as `FileFormatIcon mono`.
- `inkVariant` picks the drawing the ink shows on the pill, the bar and the picker: `solid` (the default, filled with the features cut out), `tint` (solid plus a tint for the secondary parts) or `outline` (monoline). `inkMotion` (default on) moves it; `EmojiReaction playKey` pops and plays from outside, which the bar uses for a reaction added from the picker. An emoji with hand-drawn art (`hasInkEmoji`: every emoji of the built-in picker set) shows the drawing in the ink; any emoji outside the set (a dinosaur, a flag) shows the colour glyph filtered to one ink, so fine detail goes soft at small sizes. Ink on a black background is inverted to light, so set `data-style` on `<html>` for portaled popovers.
- The glyph is wrapped in a `span` (`inline-block`, `leading-none`, the size class), so a test that looked for the emoji as a bare text node of the button should look in the glyph part. Text-only searches such as `getByText("👍")` still work.
- Reaction state is controlled with `reacted` or uncontrolled with `defaultReacted`; the bar owns the counts, and a count that falls to 0 removes the pill.

## Example

```tsx
import { EmojiReactionBar } from "@sutra/ui";

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
