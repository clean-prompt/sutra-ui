---
component: Avatar
module: primitives/avatar
covers: AvatarImage, AvatarFallback, AvatarLabelGroup
use: A person's picture with an initials fallback, an optional presence dot and a verified badge. `AvatarLabelGroup` adds a name and a supporting line beside it.
instead: Monogram = a square tile for an app, provider or tool, not a person; AvatarGroup = several avatars overlapping with a +N count; Item = a full row with media, title and actions
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction. Wrap it in a `Button` or a link when it should be clickable.

## Screen readers
- With `name` or `alt` the fallback is a `role="img"` whose `aria-label` is `alt` (or `name` when `alt` is not given; `alt=""` leaves it unlabelled); the loaded `<img>` gets `alt` or `name` as its alt text. With neither, the fallback is an unlabelled `RiUserLine` icon (`aria-hidden`), so a nameless avatar is silent.
- `status` renders a `role="img"` dot labelled with the status word ("online", "offline", "busy", "away"). `verified` adds a check icon (`aria-hidden`) with sr-only text "Verified".
- `AvatarLabelGroup` shows the name and supporting text as plain text, and the avatar it generates is decorative (`alt=""`), so the name is heard once; its status dot is still announced. Pass `avatarProps={{ alt: "…" }}` to name it anyway. On a plain `Avatar`, `alt=""` likewise drops the image alt and the fallback label.

## Reduced motion
Static, apart from the loaded image fading in with `animate-fade-in`, which the reduced-motion net in `sutra.css` turns off.

## Server rendering
Without `src` the initials render in the server HTML. With `src` the server output is an empty frame: Radix Avatar only renders the image after it has loaded in the browser, and `Avatar` delays the fallback by 500 ms (`delayMs`) so a fast image does not flash initials. The frame has a fixed size, so nothing shifts when the image arrives.

## Gotchas
- Initials come from `initials(name, initialsOptions)`: first and last word by default, so "Maya" gives "M". Pass `initialsOptions={{ singleWord: 2 }}` for "MA".
- The fallback colour is derived from `name` with `colorForSeed`, so one person has one colour everywhere. `color` overrides it, `colorful={false}` turns it off, and a custom `fallback` node also skips the seed colour. `variant="solid"` uses white initials on the full colour.
- Passing `children` replaces the built-in image and fallback entirely: compose `AvatarImage` and `AvatarFallback` yourself, then `src`, `name`, `fallback` and `color` are ignored.
- Inside an `AvatarGroup`, `size`, `shape` and `ring` come from the group, but a prop set on the avatar wins. The status dot and verified badge sit at the logical end corner, so they flip in RTL.

## Example
```tsx
import { Avatar, AvatarLabelGroup } from "@sutra/ui";

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
