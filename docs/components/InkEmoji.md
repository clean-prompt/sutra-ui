# InkEmoji

> An original hand-drawn monoline version of an emoji of the built-in set, drawn in `currentColor`; renders nothing for an emoji without art unless `fallback` is set.

- Import: `import { InkEmoji } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/emoji-ink` (assets)
- `data-slot`: `emoji`, `ink-emoji`, `emoji-ink-filter`
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `emoji` (required) | `string` |  | The emoji character to draw, e.g. "👍". A trailing variation selector does not matter. |
| `animate` | `InkEmojiAnimate` | `false` | Moves the named parts of a solid or tint drawing (eyes blink, the heart beats, hands clap): `hover` plays once when the nearest interactive parent (a button, link or option) is hovered or focused, `loop` repeats. Reduced motion shows the still drawing. |
| `fallback` | `boolean` | `false` | Draws the colour glyph as ink (the filtered glyph the paper style uses) for an emoji that has no drawing, instead of rendering nothing. |
| `playKey` | `number \| string` |  | Plays the motion once whenever it changes to a truthy value (also on mount), e.g. a counter bumped when a reaction is added. |
| `size` | `number \| string` | `"1em"` | Edge length: a number is pixels, a string is any CSS length. The drawing scales with it and is still readable at 16. |
| `title` | `string \| boolean` |  | Names the drawing for assistive technology (`true` uses its built-in name); without it the svg is decorative and `aria-hidden`. |
| `variant` | `InkEmojiVariant` | `"solid"` | How the ink is laid down: `solid` fills the shapes and cuts the features out as holes, `tint` adds a light tint of the ink for the secondary parts (tears, blush, cuffs, the core of a flame), `outline` is the monoline drawing. |

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
import { EmojiGlyph, InkEmoji, hasInkEmoji } from "@sutra/ui";

export function Example({ emoji }: { emoji: string }) {
  return (
    <p className="flex items-center gap-2 text-foreground">
      {hasInkEmoji(emoji) ? <InkEmoji emoji={emoji} size={24} title variant="tint" animate="hover" /> : <EmojiGlyph emoji={emoji} ink className="text-2xl" />}
      <span>Nice work</span>
    </p>
  );
}
```
