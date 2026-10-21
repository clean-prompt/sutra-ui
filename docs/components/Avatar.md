# Avatar

> User avatar with image, initials fallback, status dot and verified badge. The fallback is labelled with `alt` or `name`. For square tiles that stand for apps, providers or tools, use `Monogram`.

- Import: `import { Avatar } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/avatar` (primitives)
- Parts: [`AvatarContext`](AvatarContext.md), [`AvatarFallback`](AvatarFallback.md), [`AvatarImage`](AvatarImage.md), [`AvatarLabelGroup`](AvatarLabelGroup.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `alt` | `string` |  | Alt text of the image and label of the initials fallback. Defaults to `name`; `""` marks the avatar decorative (use it beside a visible name). |
| `color` | `string` |  | Explicit fallback colour (any CSS colour); overrides the colour derived from `name`. |
| `colorful` | `boolean` | `true` | Colorize the initials fallback deterministically from `name` (via `colorForSeed`). Default true. |
| `fallback` | `React.ReactNode` |  | Custom fallback content (overrides auto initials). |
| `fallbackClassName` | `string` |  | Extra classes for the fallback (initials / icon) layer. |
| `frameClassName` | `string` |  | Extra classes for the inner image/fallback frame. |
| `initialsOptions` | `InitialsOptions` |  | Options for the auto initials (e.g. `{ singleWord: 2 }` → "Ma" for "Maya"). |
| `name` | `string` |  | Used to derive initials, the fallback color and the default alt text. |
| `ring` | `boolean` | `false` | Adds a ring in the background color (useful when overlapping). |
| `shape` | `AvatarShape` | `"circle"` | Outline of the avatar: round or rounded-square. |
| `size` | `AvatarSize` | `"md"` | Diameter from `xs` to `2xl`; the initials and status dot scale with it. |
| `src` | `string` |  | Image URL; the initials fallback shows while it loads or when it fails. |
| `status` | `AvatarStatus` |  | Presence dot in the bottom corner: online, offline, busy or away. |
| `variant` | `AvatarVariant` | `"soft"` | How the colour is applied to the fallback. Default `soft`. |
| `verified` | `boolean` |  | Shows a verified check badge in the corner. |

## Variants

- `size`: `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (default "md")
- `shape`: `circle`, `square` (default "circle")
- `ring`: `true`, `false` (default false)

## Part props

### AvatarLabelGroup

Avatar with a name and a line of supporting text.

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `React.ReactNode` |  | Primary line, also used for the avatar initials when a string. |
| `avatar` | `React.ReactNode` |  | Pass a custom avatar element instead of the generated one. |
| `avatarProps` | `Omit<AvatarProps, "size">` |  | Extra props for the generated avatar (`variant`, `colorful`, `initialsOptions`, ...); `size` follows the group. |
| `shape` | `AvatarShape` | `"circle"` | Avatar outline: round or rounded-square. |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Avatar size; the name and supporting text scale with it. |
| `src` | `string` |  | Image URL for the avatar. |
| `status` | `AvatarStatus` |  | Presence dot in the avatar corner: online, offline, busy or away. |
| `supportingText` | `React.ReactNode` |  | Secondary line under the name (email, role). |
| `verified` | `boolean` |  | Shows a verified check badge on the avatar. |

## Notes

**When to use:** A person's picture with an initials fallback, an optional presence dot and a verified badge. `AvatarLabelGroup` adds a name and a supporting line beside it.

**Use instead when:**
- `Monogram`: a square tile for an app, provider or tool, not a person
- `AvatarGroup`: several avatars overlapping with a +N count
- `Item`: a full row with media, title and actions

### Keyboard

Not focusable: no keyboard interaction. Wrap it in a `Button` or a link when it should be clickable.

### Screen readers

- With `name` or `alt` the fallback is a `role="img"` whose `aria-label` is `alt` (or `name` when `alt` is not given; `alt=""` leaves it unlabelled); the loaded `<img>` gets `alt` or `name` as its alt text. With neither, the fallback is an unlabelled `RiUserLine` icon (`aria-hidden`), so a nameless avatar is silent.
- `status` renders a `role="img"` dot labelled with the status word ("online", "offline", "busy", "away"). `verified` adds a check icon (`aria-hidden`) with sr-only text "Verified".
- `AvatarLabelGroup` shows the name and supporting text as plain text, and the avatar it generates is decorative (`alt=""`), so the name is heard once; its status dot is still announced. Pass `avatarProps={{ alt: "…" }}` to name it anyway. On a plain `Avatar`, `alt=""` likewise drops the image alt and the fallback label.

### Reduced motion

Static, apart from the loaded image fading in with `animate-fade-in`, which the reduced-motion net in `sutra.css` turns off.

### Server rendering

Server render: part of it fills in after mount. Without `src` the initials render in the server HTML. With `src` the server output is an empty frame: Radix Avatar only renders the image after it has loaded in the browser, and `Avatar` delays the fallback by 500 ms (`delayMs`) so a fast image does not flash initials. The frame has a fixed size, so nothing shifts when the image arrives.

### Gotchas

- Initials come from `initials(name, initialsOptions)`: first and last word by default, so "Maya" gives "M". Pass `initialsOptions={{ singleWord: 2 }}` for "MA".
- The fallback colour is derived from `name` with `colorForSeed`, so one person has one colour everywhere. `color` overrides it, `colorful={false}` turns it off, and a custom `fallback` node also skips the seed colour. `variant="solid"` fills with the full colour and sets the initials in white or dark ink, whichever contrasts more (about 4.5:1 or better; colours that are not hex keep white).
- Passing `children` replaces the built-in image and fallback entirely: compose `AvatarImage` and `AvatarFallback` yourself, then `src`, `name`, `fallback` and `color` are ignored.
- Inside an `AvatarGroup`, `size`, `shape` and `ring` come from the group, but a prop set on the avatar wins. The status dot and verified badge sit at the logical end corner, so they flip in RTL.

## Example

```tsx
import { Avatar, AvatarLabelGroup } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <div className="flex items-center gap-4">
      <Avatar name="Maya Chen" src="/avatars/maya.jpg" size="lg" status="online" />
      <Avatar name="Omar Haddad" size="lg" verified />
      <AvatarLabelGroup name="Priya Nair" supportingText="Design lead" status="away" />
    </div>
  );
}
```
