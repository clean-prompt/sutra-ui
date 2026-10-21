# EmojiGlyph

> An emoji as text that reads as ink on paper in the paper style: the hand-drawn art when there is one, otherwise the glyph filtered to one ink.

- Import: `import { EmojiGlyph } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/emoji-ink` (assets)
- `data-slot`: `emoji`, `emoji-ink-filter`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `emoji` (required) | `string` |  | The emoji character. It stays in the DOM as text, so copy and paste and search still work. |
| `ink` | `boolean` |  | `true` draws it as ink in every style, `false` keeps the colour glyph in the paper style; unset follows the style (ink in the paper style, colour otherwise). An emoji with hand-drawn art (`hasInkEmoji`) shows the drawing, any other is filtered to one ink. |
| `inkMotion` | `boolean` | `true` | Plays the drawing's motion once when the nearest interactive parent (the chip, the picker cell) is hovered or focused. Reduced motion keeps it still; `outline` never moves. |
| `inkPlayKey` | `number \| string` |  | Plays the drawing's motion once whenever it changes to a truthy value (also on mount), e.g. when a reaction is added. |
| `inkVariant` | `InkEmojiVariant` | `"solid"` | Which ink drawing shows when the ink does: `solid` (filled, features cut out), `tint` (solid plus a tint for secondary parts) or `outline`. |

## Notes

**When to use:** Original hand-drawn art for every emoji of the built-in picker set (198 across smileys, people, nature, food, activities, travel, objects and symbols) as an svg in currentColor, readable at 16px, in three variants (solid, tint, outline) with optional motion on named parts, plus EmojiGlyph, the wrapper that makes any emoji read as ink on paper in the paper style.

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

Still by default (`animate={false}`). With `animate="hover"`, `animate="loop"` or `playKey`, named parts move with CSS keyframes (a wind-up, the move, a settle, about 1 to 1.5 s, then the still drawing). Under reduced motion (the system setting, or `data-motion="reduce"` on `<html>`) the stylesheet removes the animation and the script does not start a play, so the still drawing shows; nothing carries meaning only in motion. The ink treatment is a filter and a swap, not an animation.

### Server rendering

Server render: same markup as the client. The same markup on the server and the client: the solid and tint drawings define their masks inside the svg with ids from `useId`, and `animate="loop"` is in the markup (`data-play="loop"`). Hover and `playKey` plays start after hydration. `EmojiGlyph` adds one hidden `svg#sutra-emoji-ink` filter to `<body>` after mount (once per document, `svg[data-slot="emoji-ink-filter"]`), which the paper style uses to turn a colour glyph into one ink.

### Slots

- `ink-emoji`: the drawing svg (`data-variant` solid, tint or outline; `data-animate` hover or loop; `data-play` once or loop while a play runs). Inside a solid or tint drawing, `data-part="all"` wraps the art and named parts carry `data-part` (eye, mouth, hand, tear …) and `data-move`, the keyframes they play (`sutra-emoji-<move>`).
- `emoji`: the `EmojiGlyph` wrapper (`data-ink`, `data-art`), also used by `InkEmoji fallback`

### Gotchas

- `InkEmoji` returns `null` for an emoji without a drawing (check `hasInkEmoji`, list in `inkEmojiSet`) unless `fallback` is set, which renders the colour glyph filtered to one ink at the same size. A trailing variation selector does not matter (❤ and ❤️ match).
- The drawing uses `currentColor` in a 24 box: colour it with a text colour and size it with `size` (pixels or any CSS length, default `1em`). `variant="solid"` (the default) fills the shapes and cuts the features out as real holes (an SVG mask, so the art works on any background and in dark mode); `tint` adds a light tint of the ink for the secondary parts (tears, blush, cuffs, the core of a flame); `outline` is the monoline drawing with a 1.75 stroke. `hasInkEmoji(emoji, variant)` checks one variant. The masks have ids of their own, so render `InkEmoji` again rather than cloning its markup.
- `animate="hover"` listens on the nearest interactive ancestor (a button, link, label, summary, option, menu item, tab or anything with `tabindex`), or the parent element when there is none, and plays once on pointer enter and focus. `playKey` plays once whenever it changes to a truthy value, also on mount, so a parent that remounts the emoji with a new key still gets the play. `playInkEmoji(svg)` starts a play from your own code. `outline` never moves.
- `EmojiGlyph` shows the colour glyph by default and the ink in `[data-style="paper"]`; `ink` forces it everywhere, `ink={false}` keeps colour in paper. Glyphs without a drawing are filtered, so detail goes soft below about 20px. The paper-dark ink is the filtered glyph inverted to light on black. A subtree that is light inside a dark page still inverts, so keep the `dark` class where the page is dark.

## Example

```tsx
import { EmojiGlyph, InkEmoji, hasInkEmoji } from "@cleanprompt/sutra-ui";

export function Example({ emoji }: { emoji: string }) {
  return (
    <p className="flex items-center gap-2 text-foreground">
      {hasInkEmoji(emoji) ? <InkEmoji emoji={emoji} size={24} title variant="tint" animate="hover" /> : <EmojiGlyph emoji={emoji} ink className="text-2xl" />}
      <span>Nice work</span>
    </p>
  );
}
```
