# EmojiGlyph

> An emoji as text that reads as ink on paper in the paper style: the hand-drawn art when there is one, otherwise the glyph filtered to one ink.

- Import: `import { EmojiGlyph } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/emoji-ink` (assets)
- `data-slot`: `emoji`, `emoji-ink-filter`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `emoji` (required) | `string` |  | The emoji character. It stays in the DOM as text, so copy and paste and search still work. |
| `ink` | `boolean` |  | `true` draws it as ink in every style, `false` keeps the colour glyph in the paper style; unset follows the style (ink in the paper style, colour otherwise). An emoji with hand-drawn art (`hasInkEmoji`) shows the drawing, any other is filtered to one ink. |

## Notes

**When to use:** Original hand-drawn monoline art for every emoji of the built-in picker set (198 across smileys, people, nature, food, activities, travel, objects and symbols) as an svg in currentColor, readable at 16px, plus EmojiGlyph, the wrapper that makes any emoji read as ink on paper in the paper style.

**Use instead when:**
- `EmojiReaction`: a reaction pill with a count
- `Icon`: a user interface icon, not a character
- `FileFormatIcon`: a document icon
- `SutraMascot`: a character with states, not an emoji

### Keyboard

Not focusable: no keyboard interaction. Put a button around it when it should act, and name that button.

### Screen readers

- Decorative by default: the svg is `aria-hidden`, so say what it means in text next to it.
- `title="Approve"` names it (`role="img"` with a `<title>`); `title` set to `true` uses its built-in name (`inkEmojiNames`, "Thumbs up").
- `EmojiGlyph` keeps the emoji character as real text in `data-part="glyph"`. When the drawing shows it is clipped, not `display: none`, so copy, find in page and assistive technology that reads text keep working. Add `aria-hidden` when the words beside it already say the same.

### Reduced motion

Static art: nothing moves. The ink treatment is a filter and a swap, not an animation.

### Server rendering

Server render: same markup as the client. The same markup on the server and the client. `EmojiGlyph` adds one hidden `svg#sutra-emoji-ink` filter to `<body>` after mount (once per document, `svg[data-slot="emoji-ink-filter"]`), which the paper style uses to turn a colour glyph into one ink.

### Slots

- `ink-emoji`: the drawing svg
- `emoji`: the `EmojiGlyph` wrapper (`data-ink`, `data-art`), also used by `InkEmoji fallback`

### Gotchas

- `InkEmoji` returns `null` for an emoji without a drawing (check `hasInkEmoji`, list in `inkEmojiSet`) unless `fallback` is set, which renders the colour glyph filtered to one ink at the same size. A trailing variation selector does not matter (❤ and ❤️ match).
- The drawing uses `currentColor` and a 1.75 stroke in a 24 box: colour it with a text colour and size it with `size` (pixels or any CSS length, default `1em`). Do not expect fills; the pupils, tears and sparks are the only solid parts.
- `EmojiGlyph` shows the colour glyph by default and the ink in `[data-style="paper"]`; `ink` forces it everywhere, `ink={false}` keeps colour in paper. Glyphs without a drawing are filtered, so detail goes soft below about 20px.
- The paper-dark ink is the filtered glyph inverted to light on black. A subtree that is light inside a dark page still inverts, so keep the `dark` class where the page is dark.

## Example

```tsx
import { EmojiGlyph, InkEmoji, hasInkEmoji } from "@sutra/ui";

export function Example({ emoji }: { emoji: string }) {
  return (
    <p className="flex items-center gap-2 text-foreground">
      {hasInkEmoji(emoji) ? <InkEmoji emoji={emoji} size={24} title /> : <EmojiGlyph emoji={emoji} ink className="text-2xl" />}
      <span>Nice work</span>
    </p>
  );
}
```
