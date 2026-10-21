---
component: ImageWithFallback
module: patterns/lightbox
use: An image that reserves its space, shimmers until it loads, fades in, and shows an "Image unavailable" state when it fails or has no `src`. It can load through your own fetch (for authenticated images).
instead: Avatar = a person's picture with initials as the fallback; Lightbox = open images full screen; FileViewer = previews for non-image files; Skeleton = a placeholder you control yourself
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
- The image keeps its `alt` (an empty string for a decorative image). On failure the area becomes a `role="img"` named "<alt> (image unavailable)", or "Image unavailable" with no alt; the visible "Image unavailable" text is `aria-hidden` so it is not read twice.
- The shimmer skeleton is `aria-hidden`. There is no live announcement when the image finishes loading or fails.

## Reduced motion
The shimmer has `motion-reduce:animate-none`, and the fade-in is a 300 ms opacity transition that the global net ends in 1 ms.

## Server rendering
With a `src` the server renders the `<img>` at opacity 0 over the shimmer skeleton; it becomes visible only after hydration, when the load (or an already complete image) is detected, so the picture is invisible until the script runs. Reserve the space with `ratio` or `width` and `height` to avoid a layout jump. With no `src` the error state renders on both sides.

## Slots
- `image`: the wrapper (`data-status` is `loading`, `loaded` or `error`)
- `image-skeleton`: the loading shimmer

## Gotchas
- Pass `width` and `height` (or `ratio`, which wins) so the box has its aspect ratio before the image arrives; without either, it holds a minimum height of 6rem while loading.
- `className` goes on the wrapper and `imgClassName` on the `<img>`. `fit` is `cover` by default, `contain` shows the whole image. `loading` defaults to `lazy`.
- `fetcher(src)` returns a `Blob` that is shown through an object URL, revoked on unmount; a rejection shows the fallback. Use `fallback` to replace the default icon and text, `onLoad` and `onError` to react.

## Example
```tsx
import { ImageWithFallback } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <ImageWithFallback
      src="/images/lake.jpg"
      alt="Lake at sunrise"
      width={640}
      height={360}
      className="max-w-md rounded-box"
    />
  );
}
```
