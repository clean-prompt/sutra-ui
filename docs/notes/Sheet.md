---
component: Sheet
module: primitives/dialog
covers: SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter, SheetClose
use: A modal panel that slides in from an edge (right by default) and keeps the page visible behind a scrim, for detail, filter, settings and navigation panels. Sizes, `detached` and `blur` looks, logical `start` and `end` sides, and stacked nested sheets.
instead: Dialog = a centred modal for one decision or task; Drawer = a touch-first bottom sheet you drag with snap points; Popover = a small panel that does not block the page; Collapsible = content that expands in the page instead of overlaying it
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Cycle focus inside the sheet (trapped while open) |
| Escape | Close the sheet; ignored with `dismissible={false}` |
| Enter, Space | Activate the focused button, including the close button |

Focus moves into the sheet on open and returns to whatever had it before, even when it was opened without a `SheetTrigger` (a hotkey, controlled `open`). There are no arrow keys, so RTL changes nothing. With stacked sheets Escape closes only the topmost.

## Screen readers
The panel is a Radix dialog: `role="dialog"` with `aria-labelledby` from `SheetTitle` and `aria-describedby` from `SheetDescription`, and the page behind is hidden from assistive technology while it is open. Always render a `SheetTitle` (it may be visually hidden). The built-in close button is labelled "Close" and appears when `dismissible` is true (or with `showClose`).

## Reduced motion
The panel slides in from its edge and the sheet underneath a nested one scales down and fades; the reduced-motion net removes the slide, keeps the fade and ends the scale and opacity transition in 1 ms.

## Server rendering
A closed sheet renders only its trigger on the server and the client. The panel is portalled into `<body>` after mount, so a sheet that is `open` on first render appears after hydration. Being portalled, it does not sit inside a subtree `dir` or `data-style`: the `start` and `end` sides and the `rtl:` flips read `<html dir>`, so set it there.

## Slots
- `sheet-content`: the panel (`data-side`, plus `data-detached` and `data-nested` when set)

## Gotchas
- `side` accepts `left`, `right`, `top`, `bottom` (fixed edges) and `start`, `end` (follow the document direction, so `start` is the right edge in RTL). Prefer `start` and `end` for side navigation.
- `size` is a width for side sheets and a height for `top` and `bottom` (`auto`, `sm`, `md`, `lg`, `half`, `full`); without it a side sheet is 24rem wide (up to 85vw) and a top or bottom sheet is as tall as its content. `className` still wins over it.
- `dismissible={false}` ignores Escape and outside clicks and hides the close button, so give users another way out (`showClose` brings the button back; a `SheetClose` or controlled `open` also closes it).
- Nested sheets stack only when the inner `Sheet` is rendered inside the outer `SheetContent`; the one underneath gets `data-nested`. `Sheet` is the Radix Dialog root, so `open`, `defaultOpen`, `onOpenChange` and `modal` work as in `Dialog`.

## Example
```tsx
import { Button, Field, FieldLabel, Input, Sheet, SheetBody, SheetClose, SheetContent } from "@sutra/ui";
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@sutra/ui";

export function Example() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Filters</Button>
      </SheetTrigger>
      <SheetContent side="end" size="md">
        <SheetHeader>
          <SheetTitle>Filter orders</SheetTitle>
          <SheetDescription>Narrow the list down to one customer.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field>
            <FieldLabel>Customer</FieldLabel>
            <Input placeholder="Name or email" />
          </Field>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Apply filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```
