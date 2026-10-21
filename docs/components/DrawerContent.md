# DrawerContent

> The sheet panel: grabber, drag-to-dismiss (80px or a fast flick), rubber-band upward, snap points.

- Import: `import { DrawerContent } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/primitives/drawer` (primitives)
- `data-slot`: `drawer-content`, `drawer-handle`
- Part of [`Drawer`](Drawer.md)
- Also accepts the props of HTMLAttributes, DismissableLayerProps, DialogContentImplProps, DialogContentProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `overlayClassName` | `string` |  | Classes for the dimmed backdrop behind the sheet. |
| `showClose` | `boolean` | `false` | Show a close button at the top end (top-right in left-to-right). Default false. |
| `showHandle` | `boolean` | `true` | Show the grabber handle. Default true. |

## Notes

See the notes in [`Drawer`](Drawer.md#notes).

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
