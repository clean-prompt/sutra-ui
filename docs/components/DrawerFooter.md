# DrawerFooter

> Action row pinned to the bottom of the sheet. `SheetFooter` with a top border and drawer spacing.

- Import: `import { DrawerFooter } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/primitives/drawer` (primitives)
- `data-slot`: `drawer-footer`
- Part of [`Drawer`](Drawer.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

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
