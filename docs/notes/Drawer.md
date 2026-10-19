---
component: Drawer
module: primitives/drawer
covers: DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody, DrawerFooter, DrawerClose
use: A touch-first bottom sheet with a grabber, drag-to-dismiss and optional snap points (`snapPoints` as fractions of the viewport height). Modal, with scroll lock and focus return. Header, title, body and footer are the Sheet parts with drawer spacing.
instead: Sheet = a panel from any edge that is not dragged; Dialog = a centred modal for one decision or task; Popover = a small floating panel that does not block the page
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Cycle focus inside the drawer (trapped while it is modal) |
| Escape | Close the drawer; ignored with `dismissible={false}` |
| Enter, Space | On the handle button (only with two or more `snapPoints`): go to the next snap point and wrap to the smallest |
| Enter, Space | Activate the focused button, including `DrawerClose` and the close button from `showClose` |

Dragging is pointer-only. Without snap points the handle is a decorative `aria-hidden` bar, so keyboard users close with Escape or a `DrawerClose` button. There are no direction-dependent keys, so RTL changes nothing. Focus returns to the `DrawerTrigger` on close (Radix), and for a drawer opened without a trigger (a hotkey, controlled `open`) to the element that had focus when it opened, as `SheetContent` does; a `preventDefault()` in your `onCloseAutoFocus` still wins.

## Screen readers
Radix gives the panel `role="dialog"` with `aria-labelledby` from `DrawerTitle` and `aria-describedby` from `DrawerDescription`, and hides the rest of the page while it is open. Always render a `DrawerTitle` (it may be visually hidden). The handle button with snap points is named "Expand sheet" or "Collapse sheet" depending on the current snap point; the grabber bar itself is `aria-hidden`. The close button from `showClose` is labelled "Close".

## Reduced motion
The sheet slides up from the bottom with `animate-in` and the drag release settles with a 320 ms translate transition. The reduced-motion net removes the slide, keeps the fade and ends the settle transition in 1 ms. Dragging follows the pointer and is not affected.

## Server rendering
Only the trigger renders on the server. The sheet is portalled into `<body>` after mount, so a drawer that is `open` on first render appears after hydration. The viewport height used for snap points is read only inside the portalled content.

## Slots
- `drawer-content`: the sheet panel (`data-dragging` while dragged, `data-snap` with snap points)
- `drawer-handle`: the grabber, a button with two or more snap points, else a decorative bar
- `drawer-header`: the pinned header; it is draggable
- `drawer-body`: the scrollable content area
- `drawer-footer`: the pinned action row

## Gotchas
- A release past 80 px of drag, or a fast flick down (above 500 px/s), dismisses the drawer; with snap points a flick moves one snap point and only the smallest one dismisses. A drag never starts on text fields, sliders, `[data-drawer-no-drag]` elements, or inside a scroll area that is scrolled down.
- `dismissible={false}` disables Escape, scrim clicks and drag-to-dismiss, but `DrawerClose` and a controlled `open` still close it. It stays draggable between snap points if there are two or more.
- `snapPoints` are clamped to 0.05 through 1 and sorted. The panel is as tall as the largest one, and an uncontrolled drawer reopens at `defaultSnapPoint` or the smallest. `snapPoint` makes it controlled with `onSnapPointChange`.
- Drawer parts must be inside `<Drawer>` (they throw otherwise). `showHandle` is on and `showClose` off by default, and the panel is at most `max-w-2xl`, centred, on wide screens.

## Example
```tsx
import { Button, Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerDescription } from "@sutra/ui";
import { DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@sutra/ui";

export function Example() {
  return (
    <Drawer snapPoints={[0.5, 1]}>
      <DrawerTrigger asChild>
        <Button variant="outline">Share trip</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Share this trip</DrawerTitle>
          <DrawerDescription>Anyone with the link can view your itinerary.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <p className="text-sm text-muted-foreground">Lisbon, 4 to 9 May. Four travellers, two rooms.</p>
        </DrawerBody>
        <DrawerFooter>
          <Button>Copy link</Button>
          <DrawerClose asChild>
            <Button variant="ghost">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```
