# DrawerHeader

> Pinned header (does not scroll with the body); drag it to move the sheet. `SheetHeader` with drawer spacing.

- Import: `import { DrawerHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/primitives/drawer` (primitives)
- `data-slot`: `drawer-header`
- Part of [`Drawer`](Drawer.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Notes

See the notes in [`Drawer`](Drawer.md#notes).

## Example

```tsx
import { Button, Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerDescription } from "@cleanprompt/sutra-ui";
import { DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@cleanprompt/sutra-ui";

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
