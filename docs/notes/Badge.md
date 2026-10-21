---
component: Badge
module: primitives/badge
use: A compact label for a category, tag, status word or count. Four fill styles, three sizes, optional icons and a remove button.
instead: StatusBadge = a status with a ready-made dot, icon or spinner and a default label; Chip = a filter or selection token that toggles; Eyebrow = a small caption above a heading
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to the remove button, which only exists with `onRemove` |
| Enter, Space | Removes (native `<button>`) |

The badge itself is not focusable and has no direction-dependent keys, so RTL changes nothing.

## Screen readers
- A plain `<span>`: no role, so its text is read inline. Colour carries no meaning for assistive technology, so put the meaning in the text ("Paid", not just a green badge).
- The remove button is labelled "Remove" by default. Several badges would all read the same, so pass `removeLabel` with the item ("Remove beta").
- `variant="dot"` draws its dot as an `aria-hidden` span. Icons you pass as `leadingIcon` or `trailingIcon` are not hidden for you: pass `aria-hidden` icons.

## Reduced motion
Static. The only motion is a colour transition, which the reduced-motion net in `sutra.css` ends within 1 ms.

## Server rendering
Plain markup with no browser API, so server and client output match.

## Gotchas
- `tone` (`neutral`, `primary`, `success`, `warning`, `destructive`, `info`, plus legacy aliases like `brand`, `danger`) wins over `color` when both are set. The categorical hues `gray`, `blue`, `purple`, `pink` and `orange` exist only on `color`.
- `variant="dot"` is always a neutral bordered pill: the colour only tints the dot, so `variant="dot" tone="success"` is not a green pill.
- Long text is truncated (`max-w-full` plus `truncate`), so give the badge a width limit from its parent rather than expecting it to wrap.
- `color` is kept for older call sites (the types say "legacy"); new code should pass `tone`.

## Example
```tsx
import { Badge } from "@cleanprompt/sutra-ui";
import { RiCheckLine } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Draft</Badge>
      <Badge tone="success" leadingIcon={<RiCheckLine aria-hidden />}>
        Published
      </Badge>
      <Badge tone="warning" variant="outline">
        Needs review
      </Badge>
      <Badge tone="destructive" variant="solid" size="sm">
        3
      </Badge>
      <Badge variant="dot" tone="info">
        Beta
      </Badge>
    </div>
  );
}
```
