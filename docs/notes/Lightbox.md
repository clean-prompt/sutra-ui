---
component: Lightbox
module: patterns/lightbox
covers: LightboxTrigger
use: A full-screen viewer for a set of images or videos: previous and next, a counter, a thumbnail strip, zoom and pan, swipe, optional download. Put `LightboxTrigger`s (your thumbnails) inside it, or open it from code with `useLightbox`.
instead: Dialog = any other content in a modal; Carousel = browse in place without a full-screen viewer; FileViewer = previews for pdf, text and other file types; ImageWithFallback = one image that handles loading and errors; Drawer = a touch-first bottom sheet
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| ArrowLeft, ArrowRight | Previous or next item (stops at the ends unless `loop`). Ignored while a video is focused |
| Home, End | First or last item |
| + or =, -, 0 | Zoom in or out by 1.5 times, or reset to 100% |
| Escape | Close |
| Tab / Shift+Tab | Cycles through the toolbar buttons, the previous and next buttons, and the thumbnails (focus is trapped while open) |
| Enter, Space | Press the focused button, including a thumbnail |

In RTL the arrows follow reading order: ArrowLeft goes to the next item and ArrowRight to the previous, and a swipe towards the inline start brings the next item. Closing sends focus back to the element that had it when the viewer opened (the `LightboxTrigger`, or a button that called `openAt`), even though the viewer has no Radix trigger; if that element is gone, focus ends on the page body. Pointer extras: double-click toggles 200%, a drag pans a zoomed image, Ctrl or Cmd with the wheel or a trackpad pinch zooms.

## Screen readers
- Radix gives the panel `role="dialog"` named by `label` (default "Image viewer") and hides the page. The counter ("2 / 5") is a polite live region, so it announces each change of item.
- The current image has its `alt` (a failed one reads "<alt> (image unavailable)"); videos get `aria-label` from `alt` and native controls. Captions are plain text.
- Buttons are named "Zoom out", "Zoom in", "Download", "Close viewer", "Previous" and "Next". Thumbnails are a `group` named "Thumbnails" of buttons "View 2 of 5: <alt>" with `aria-current` on the shown one.
- `LightboxTrigger` has `aria-haspopup="dialog"` and defaults to the name "Open <alt>" of its item; give it an `aria-label` when it holds more than an image.

## Reduced motion
The backdrop and panel fade and scale in with `animate-in` (movement stripped under reduced motion), and zoom changes use a 150 ms transform transition that the global net ends in 1 ms, so zoom is immediate. The thumbnail fade is a transition too.

## Server rendering
A closed viewer renders only its children (the triggers) on both sides; the panel is portalled. A viewer that is `open` on first render appears after hydration.

## Slots
- `lightbox`: the panel
- `lightbox-counter`: the "2 / 5" text
- `lightbox-stage`: the area that holds the media, the swipe and pan surface

## Gotchas
- Control it with `open`, `index` and their `onOpenChange` and `onIndexChange`, or take `useLightbox()` and spread `{...lb.props}`. Opening through a `LightboxTrigger` sets the index first. `index` is clamped to the items.
- The previous and next buttons are hidden below the `sm` breakpoint (swipe and the arrow keys remain); there is no wrap unless `loop`, and the buttons disable at the ends.
- Zoom resets whenever the item changes or the viewer opens or closes, and a swipe to the next item is ignored while zoomed in (it pans instead). `maxZoom` defaults to 4.
- `download` adds a plain link with the `download` attribute (so it is subject to the browser's cross-origin rule) and `downloadName` names the file. The two neighbouring images are preloaded.

## Example
```tsx
import { Lightbox, LightboxTrigger, type LightboxItem } from "@sutra/ui";

const photos: LightboxItem[] = [
  { src: "/images/alps.jpg", alt: "Alps at dawn", caption: "Alps at dawn" },
  { src: "/images/lake.jpg", alt: "Lake at sunrise", caption: "Lake at sunrise" },
  { src: "/images/forest.jpg", alt: "Pine forest in fog" },
];

export function Example() {
  return (
    <Lightbox items={photos} loop>
      <div className="flex gap-2">
        {photos.map((photo, index) => (
          <LightboxTrigger key={photo.src} index={index}>
            <img src={photo.src} alt="" className="h-24 w-32 object-cover" />
          </LightboxTrigger>
        ))}
      </div>
    </Lightbox>
  );
}
```
