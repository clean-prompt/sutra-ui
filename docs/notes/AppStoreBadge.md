---
component: AppStoreBadge
module: primitives/app-store-badge
use: A link styled as the "Download on the App Store" or "Get it on Google Play" badge. `store` picks the logo and text (`apple`, `google-play`, `microsoft`, `galaxy`), `theme` the colours and `size` the height.
instead: Button = a normal action or a button-styled link with your own label; TextLink = a plain link in running text
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the link |
| Enter | Follows the link (a native `<a>`, so Space does nothing) |

No arrow keys are used, so nothing changes in RTL.

## Screen readers
A native `<a>` named by `aria-label`, which defaults to the badge text, for example "Download on the App Store" or "GET IT ON Google Play" (the Google Play eyebrow is written in capitals). The visible text is `aria-hidden` and the logos are decorative, so pass `aria-label` for a more specific name ("Get Sutra for iPhone"); the test pins that it replaces the default.

## Reduced motion
On hover the badge lifts 1px with a shadow, and on press it scales to 0.98. These are transitions, which the reduced-motion net ends in 1 ms: the lift and press still happen, without the glide.

## Server rendering
Plain markup with no browser API, so server and client output match. The Galaxy mark takes a `useId` for its gradient, which is stable between server and client.

## Slots
- `mark`: the wrapper around the store logo
- `eyebrow`: the small line above the name ("Download on the")
- `name`: the large store name

## Gotchas
- Pass `href`. Without it the `<a>` has no link role and cannot be focused, and the type does not require it.
- The text, the four logos and the colours (`dark` black badge for light backgrounds, `light` white badge) are fixed brand art: not themed, not localized, and `size` only offers `sm` (40px), `md` (48px, default) and `lg` (56px).
- The badge is a link, not a button: for an `onClick` without navigation use `Button`.
- Extra props go on the anchor (`target`, `rel`, `onClick`), so add `rel="noopener"` yourself with `target="_blank"`.

## Example
```tsx
import { AppStoreBadge } from "@sutra/ui";

export function Example() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <AppStoreBadge
        store="apple"
        href="https://apps.apple.com/app/id1234567890"
        target="_blank"
        rel="noopener noreferrer"
      />
      <AppStoreBadge
        store="google-play"
        href="https://play.google.com/store/apps/details?id=com.example.app"
        target="_blank"
        rel="noopener noreferrer"
      />
    </div>
  );
}
```
