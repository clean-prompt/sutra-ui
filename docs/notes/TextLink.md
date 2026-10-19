---
component: TextLink
module: primitives/text-link
use: An inline link that reads as part of a sentence, with underline styles, an optional external indicator and a button mode for in-sentence actions. With `onClick` and no `href` it renders a `<button>`.
instead: Button = a standalone action (`variant="link"` gives the look); Breadcrumb = a navigation trail; AppStoreBadge = a store download badge
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from it. A disabled link or button is skipped |
| Enter | Follows the link, or presses the button |
| Space | Presses the button (not a link) |

No arrow keys are used, so nothing changes in RTL.

## Screen readers
- Link mode is a native `<a>`; button mode is a `<button type="button">` unless you pass `type`. The name is the text.
- `external` adds target `_blank`, `rel="noopener noreferrer"` and a visually hidden " (opens in a new tab)" after the text; the arrow icon is `aria-hidden`.
- A disabled link has no `href`, `aria-disabled="true"`, `tabindex="-1"` and `role="link"`, so it is still announced as a link, as unavailable. A disabled button is natively disabled.

## Reduced motion
The colour and underline fades and the nudge of the external arrow on hover are transitions, which the reduced-motion net ends within 1 ms: the effects still happen, without the glide.

## Server rendering
Plain markup with no browser API, so server and client output match.

## Gotchas
- The element is chosen for you: a `<button>` when there is an `onClick` and no `href`, otherwise an `<a>`. Pass `as="a"` or `as="button"` to force one. `as="a"` without `href` is not focusable. `ref` is typed as an anchor in both cases, and `external` does nothing on a button.
- `underline` defaults to `hover`: inside running text the link shows only its colour until the pointer is over it, so use `underline="always"` there. `size` defaults to `inherit`, which takes the surrounding font size.
- `target="_blank"` on its own gets `rel="noopener noreferrer"` but not the screen reader hint; only `external` adds the hint. An explicit `target` or `rel` always wins over what `external` would set.
- With `asChild`, `external` still sets `target` and `rel` on the child and adds the arrow and the hidden " (opens in a new tab)" text, as the plain link does. A disabled `asChild` link keeps the child's `href`, with `aria-disabled`, `tabindex="-1"` and clicks blocked in the capture phase, so a router link does not navigate.

## Example
```tsx
import { TextLink } from "@sutra/ui";

export function Example({ onResend }: { onResend: () => void }) {
  return (
    <p className="max-w-md text-sm text-muted-foreground">
      By continuing you agree to the{" "}
      <TextLink href="/terms" underline="always">
        Terms of Service
      </TextLink>{" "}
      and the{" "}
      <TextLink href="https://example.com/privacy" external underline="always">
        Privacy Policy
      </TextLink>
      . Did not get the email?{" "}
      <TextLink onClick={onResend} underline="always">
        Send it again
      </TextLink>
      .
    </p>
  );
}
```
