---
component: PortBadge
module: primitives/port-badge
covers: PortBadgeList
use: A small monospaced chip for a network port, optionally a link that opens it on localhost. `PortBadgeList` shows a row of them with a "+N" overflow.
instead: Badge = any other short label; KeyValue = a port as one fact among others; CopyButton = copy the port or URL
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to the link, only when `href` is set (a plain badge is not focusable) |
| Enter | Follows the link (native `<a>`) |

No key depends on direction, so RTL changes nothing.

## Screen readers
- A linked badge is an `<a>` whose `aria-label` is "Open localhost:3000" (the URL without `http://`), which replaces the visible "3000" as its name. A plain badge is a `<span>` read as its text.
- `PortBadgeList` is a `ul` with `aria-label` "Ports" (change it with `label`) and one `li` per badge. The "+N" chip is `aria-hidden`; a visually hidden "N more: 9001, 15672" is read instead, and the same ports are in its `title`.

## Reduced motion
Static, apart from the hover fade on a linked badge, which the reduced-motion net in `sutra.css` ends within 1 ms.

## Server rendering
Plain markup built from the props, with no browser API, so server and client output match.

## Slots
- `port-badge`: the badge, which is the `<a>` for a linked badge and the `<span>` otherwise
- `port-badge-list`: the list
- `port-badge-overflow`: the "+N" chip

## Gotchas
- `href` is `true` for `http://localhost:<port>` (change the machine with `host`), or a string used as is. The link is plain HTTP and opens in a new tab (`target="_blank"` with `rel="noopener noreferrer"`); `rel` is dropped if you change `target`.
- A string `href` that fails `isSafeHref` (such as `javascript:`) is dropped silently and you get a plain, unlinked badge.
- `tone` wins over `accent`; with neither, the badge follows the inherited accent or primary. `PortBadgeList` takes `accent` once on the list (a CSS variable that the badges inherit), `tone` on every badge.
- `PortBadgeList` renders nothing for an empty `ports` array, and `max={0}` shows only the "+N" chip. A string port such as `":8080"` loses its leading colon, and `colon` adds one back to the text.

## Example
```tsx
import { PortBadge, PortBadgeList } from "@sutra/ui";

export function Example() {
  return (
    <div className="flex flex-col items-start gap-3">
      <PortBadge port={3000} href />
      <PortBadge port={5432} colon />
      <PortBadgeList ports={[3000, 5173, 8080, 9001, 15672]} max={3} />
    </div>
  );
}
```
