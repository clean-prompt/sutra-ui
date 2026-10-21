---
component: AlertBanner
module: primitives/alert-banner
use: A full-width announcement bar for the top of an app or page, with an icon, a message, an optional action and an optional dismiss button. Solid or soft fill, optionally sticky.
instead: InlineAlert = a notice inside a form, panel or page body; RotatingNoticeBar = several notices that take turns; Toaster = a transient message that leaves by itself; AlertDialog = the user must answer before going on
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves through the `leading` and `trailing` controls, the action and the dismiss button |
| Enter | Follows the action link, or presses the action or dismiss button |
| Space | Presses the action or dismiss button (not a link) |

The banner itself is not focusable and no arrow key does anything, so RTL changes no key. In RTL the arrow glyph of an `action` object is mirrored and the dismiss button stays on the end edge, which is then the left. Dismissing does not move focus: the banner just unmounts.

## Screen readers
- `tone` `warning` and `destructive` render `role="alert"`, which is announced when the banner is inserted. Every other tone is a `role="region"`, which is not announced on insertion, so do not rely on it for urgent news.
- Both carry `aria-label="Announcement"`. Pass your own `aria-label` to rename it. Passing `role` removes the default label, so add one yourself.
- The icon is `aria-hidden`; the arrow after an `action` label is too. The dismiss button is named by `dismissLabel` (default "Dismiss banner").
- An `action` object renders an `<a>` when it has `href`, otherwise a `<button type="button">`. Any other node you pass as `action` is rendered as is.

## Reduced motion
Dismissing plays `animate-out` (a 200 ms fade and a small slide up). Under reduced motion the slide is removed and the fade stays; the banner unmounts on `animationend`, with a 250 ms timer as a fallback. The hover nudge of the action arrow is a transition and ends in 1 ms.

## Server rendering
An open banner renders its full markup on the server; it uses only state, and the timer starts in an effect. With `defaultOpen={false}` or `open={false}` it renders nothing on both sides.

## Gotchas
- With `open` set, the banner is controlled: the close button calls `onOpenChange(false)` and `onDismiss`, but it stays until you pass `open={false}`. Without `open`, it hides itself.
- It stays mounted for the exit (`data-state="closed"`), so `open` going back to `true` mid-exit brings it straight back.
- `variant` is a deprecated alias of `tone` (`brand` is `primary`); `tone` wins when both are set. `inverse` is the dark high-contrast bar.
- `appearance="soft"` changes nothing for `neutral` and `inverse`. `message` wins over `children`. `icon={false}` removes the icon.

## Example
```tsx
import * as React from "react";
import { AlertBanner } from "@cleanprompt/sutra-ui";

export function Example() {
  const [open, setOpen] = React.useState(true);
  return (
    <AlertBanner
      tone="warning"
      open={open}
      onOpenChange={setOpen}
      dismissible
      message="Scheduled maintenance tonight from 22:00 to 23:00 UTC."
      action={{ label: "Read the status page", href: "/status" }}
    />
  );
}
```
