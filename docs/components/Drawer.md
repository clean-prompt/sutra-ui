# Drawer

> Bottom sheet with drag-to-dismiss, optional snap points, scroll lock and focus return (Radix Dialog).

- Import: `import { Drawer } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/primitives/drawer` (primitives)
- Parts: [`DrawerBody`](DrawerBody.md), [`DrawerClose`](DrawerClose.md), [`DrawerContent`](DrawerContent.md), [`DrawerDescription`](DrawerDescription.md), [`DrawerFooter`](DrawerFooter.md), [`DrawerHeader`](DrawerHeader.md), [`DrawerTitle`](DrawerTitle.md), [`DrawerTrigger`](DrawerTrigger.md)

Dialog vs Sheet vs Drawer: `Dialog` is a centred modal for a focused task or decision; `Sheet` is a panel that slides in from any edge (side navigation, detail or filter panels); `Drawer` is a touch-first bottom sheet with a grabber, drag-to-dismiss and snap points. Drawer's Header, Title, Description, Body and Footer are the Sheet parts with drawer spacing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | The drawer parts: a `DrawerTrigger` and a `DrawerContent`. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultSnapPoint` | `number` |  | Initially active snap point when uncontrolled; one of `snapPoints`. |
| `dismissible` | `boolean` | `true` | Allow closing by drag, Escape and scrim click. Default true. |
| `modal` | `boolean` | `true` | Modal (scroll lock, focus trap, inert page). Default true. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the drawer opens or closes (drag, Escape, scrim click, a close button). |
| `onSnapPointChange` | `(snap: number) => void` |  | Called with the snap point the sheet settled on after a drag. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `snapPoint` | `number` |  | Active snap point (one of `snapPoints`). |
| `snapPoints` | `number[]` |  | Heights as fractions of the viewport, e.g. `[0.5, 1]`. Omit for a content-sized sheet. |

## Part props

### DrawerContent

The sheet panel: grabber, drag-to-dismiss (80px or a fast flick), rubber-band upward, snap points.

| Prop | Type | Default | Description |
|---|---|---|---|
| `overlayClassName` | `string` |  | Classes for the dimmed backdrop behind the sheet. |
| `showClose` | `boolean` | `false` | Show a top-right close button. Default false. |
| `showHandle` | `boolean` | `true` | Show the grabber handle. Default true. |

## Notes

**When to use:** A touch-first bottom sheet with a grabber, drag-to-dismiss and optional snap points (`snapPoints` as fractions of the viewport height). Modal, with scroll lock and focus return. Header, title, body and footer are the Sheet parts with drawer spacing.

**Use instead when:**
- `Sheet`: a panel from any edge that is not dragged
- `Dialog`: a centred modal for one decision or task
- `Popover`: a small floating panel that does not block the page

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Cycle focus inside the drawer (trapped while it is modal) |
| Escape | Close the drawer; ignored with `dismissible={false}` |
| Enter, Space | On the handle button (only with two or more `snapPoints`): go to the next snap point and wrap to the smallest |
| Enter, Space | Activate the focused button, including `DrawerClose` and the close button from `showClose` |

Dragging is pointer-only. Without snap points the handle is a decorative `aria-hidden` bar, so keyboard users close with Escape or a `DrawerClose` button. There are no direction-dependent keys, so RTL changes nothing. Focus returns to the `DrawerTrigger` on close (Radix). Unlike `SheetContent`, `DrawerContent` does not restore focus for a drawer opened without a trigger (a hotkey, controlled `open`): move focus back yourself in `onCloseAutoFocus`.

### Screen readers

Radix gives the panel `role="dialog"` with `aria-labelledby` from `DrawerTitle` and `aria-describedby` from `DrawerDescription`, and hides the rest of the page while it is open. Always render a `DrawerTitle` (it may be visually hidden). The handle button with snap points is named "Expand sheet" or "Collapse sheet" depending on the current snap point; the grabber bar itself is `aria-hidden`. The close button from `showClose` is labelled "Close".

### Reduced motion

The sheet slides up from the bottom with `animate-in` and the drag release settles with a 320 ms translate transition. The reduced-motion net removes the slide, keeps the fade and ends the settle transition in 1 ms. Dragging follows the pointer and is not affected.

### Server rendering

Server render: same markup as the client. Only the trigger renders on the server. The sheet is portalled into `<body>` after mount, so a drawer that is `open` on first render appears after hydration. The viewport height used for snap points is read only inside the portalled content.

### Slots

- `drawer-content`: the sheet panel (`data-dragging` while dragged, `data-snap` with snap points)
- `drawer-handle`: the grabber, a button with two or more snap points, else a decorative bar
- `drawer-header`: the pinned header; it is draggable
- `drawer-body`: the scrollable content area
- `drawer-footer`: the pinned action row

### Gotchas

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
