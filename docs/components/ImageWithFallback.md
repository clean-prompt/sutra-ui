# ImageWithFallback

> Image that reserves its aspect ratio, shimmers while loading and shows "Image unavailable" on error.

- Import: `import { ImageWithFallback } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/patterns/lightbox` (patterns)
- `data-slot`: `image`, `image-skeleton`
- Also accepts the props of HTMLAttributes, ImgHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `alt` (required) | `string` |  | Alternative text of the image (empty for a decorative image). |
| `fallback` | `React.ReactNode` |  | Content for the error state. Default: icon + "Image unavailable". |
| `fetcher` | `(src: string) => Promise<Blob>` |  | Load the image yourself (e.g. with auth headers). The blob becomes an object URL, revoked on unmount. |
| `fit` | `"cover" \| "contain"` | `"cover"` | `object-fit` of the image. Default "cover". |
| `height` | `number` |  | Intrinsic height in px; with `width` it reserves the aspect ratio before the image loads. |
| `imgClassName` | `string` |  | Classes for the `<img>` element (the wrapper gets `className`). |
| `onError` | `() => void` |  | Called when the image fails to load. |
| `onLoad` | `() => void` |  | Called when the image has loaded. |
| `ratio` | `number` |  | Aspect ratio (width / height) to reserve, e.g. `16 / 9`. Overrides width/height. |
| `src` | `string` |  | URL of the image; with no `src` the fallback shows. |
| `width` | `number` |  | Intrinsic size; reserves the aspect ratio before the image loads. |

## Notes

**When to use:** An image that reserves its space, shimmers until it loads, fades in, and shows an "Image unavailable" state when it fails or has no `src`. It can load through your own fetch (for authenticated images).

**Use instead when:**
- `Avatar`: a person's picture with initials as the fallback
- `Lightbox`: open images full screen
- `FileViewer`: previews for non-image files
- `Skeleton`: a placeholder you control yourself

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

- The image keeps its `alt` (an empty string for a decorative image). On failure the area becomes a `role="img"` named "<alt> (image unavailable)", or "Image unavailable" with no alt; the visible "Image unavailable" text is `aria-hidden` so it is not read twice.
- The shimmer skeleton is `aria-hidden`. There is no live announcement when the image finishes loading or fails.

### Reduced motion

The shimmer has `motion-reduce:animate-none`, and the fade-in is a 300 ms opacity transition that the global net ends in 1 ms.

### Server rendering

Server render: part of it fills in after mount. With a `src` the server renders the `<img>` at opacity 0 over the shimmer skeleton; it becomes visible only after hydration, when the load (or an already complete image) is detected, so the picture is invisible until the script runs. Reserve the space with `ratio` or `width` and `height` to avoid a layout jump. With no `src` the error state renders on both sides.

### Slots

- `image`: the wrapper (`data-status` is `loading`, `loaded` or `error`)
- `image-skeleton`: the loading shimmer

### Gotchas

- Pass `width` and `height` (or `ratio`, which wins) so the box has its aspect ratio before the image arrives; without either, it holds a minimum height of 6rem while loading.
- `className` goes on the wrapper and `imgClassName` on the `<img>`. `fit` is `cover` by default, `contain` shows the whole image. `loading` defaults to `lazy`.
- `fetcher(src)` returns a `Blob` that is shown through an object URL, revoked on unmount; a rejection shows the fallback. Use `fallback` to replace the default icon and text, `onLoad` and `onError` to react.

## Example

```tsx
import { ImageWithFallback } from "@sutra/ui";

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
