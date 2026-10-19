# MorphDialog

> A dialog (or bottom sheet) that grows out of the rectangle of the thing that opened it and shrinks back into it. The panel is clipped to the origin's box and its radius and slides onto its final place (Web Animations on the spring token, nothing is scaled, so text never stretches); the scrim, the shadow and the parts marked `data-morph-fade` appear late and go early. It is a Radix Dialog underneath: focus is trapped and handed back on close (to the `trigger`, or to whatever had it), Escape, the close button and a press on the scrim close it, and the panel stays mounted until the closing flight ends. Reduced motion (or no `animate`) means no flight at all. Pass `origin` (an element, a ref or a rect), or use `ExpandCard` for a card that is its own origin. Start the panel's content with the same face as the origin and the flight reads as one object.

- Import: `import { MorphDialog } from "@sutra/ui"` (or from `@sutra/ui/motion`)
- Source: `packages/ui/src/patterns/morph-dialog` (patterns)
- `data-slot`: `morph-dialog-overlay`, `morph-dialog`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `string` |  | Accessible name of the dialog. |
| `children` | `React.ReactNode` |  | The panel content. Parts marked `data-morph-fade` appear late and go early. |
| `className` | `string` |  | Classes of the panel. |
| `defaultOpen` | `boolean` | `false` | Start open (uncontrolled). |
| `description` | `string` |  | Accessible description. |
| `onCloseAutoFocus` | `(event: Event) => void` |  | Runs when focus is handed back; `preventDefault()` keeps the default (the trigger, or whatever had focus). |
| `onMorphEnd` | `(phase: "open" \| "close") => void` |  | Runs when the open or close flight has finished (at once under reduced motion). |
| `onOpenAutoFocus` | `(event: Event) => void` |  | Runs when focus moves into the panel; `preventDefault()` keeps Radix from choosing the element. |
| `onOpenChange` | `(open: boolean) => void` |  | Asked to open or close: Escape, the close button, a press on the scrim or the trigger. |
| `open` | `boolean` |  | Whether the dialog is open (controlled). |
| `origin` | `MorphDialogOrigin` |  | The box the panel grows from and shrinks back into. It is measured when the dialog opens and again when it closes. Without one the panel lifts in. |
| `overlayClassName` | `string` |  | Classes of the scrim. |
| `showClose` | `boolean` | `true` | The close button at the top end of the panel. Default true. |
| `showTitle` | `boolean` | `false` | Show the title as a heading at the top of the panel instead of hiding it from sight. Default false. |
| `size` | `MorphDialogSize` | `"md"` | Width of the panel: sm, md or lg. Default "md". |
| `trigger` | `React.ReactNode` |  | The element that opens it (rendered with `asChild`); it gets focus back on close. |
| `variant` | `MorphDialogVariant` | `"auto"` | `"dialog"` is centred, `"sheet"` docks to the bottom edge, `"auto"` is a sheet below the `sm` breakpoint. Default "auto". |

## Example (live: `#/components/showpieces/morph-dialog` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { MorphDialog } from "@sutra/ui/motion";

function AnyOrigin() {
  const [open, setOpen] = React.useState<"dialog" | "sheet" | null>(null);
  const dialogButton = React.useRef<HTMLButtonElement>(null);
  const sheetButton = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={dialogButton} onClick={() => setOpen("dialog")}>
        Open as a dialog
      </Button>
      <Button ref={sheetButton} variant="outline" onClick={() => setOpen("sheet")}>
        Open as a sheet
      </Button>
      <MorphDialog
        open={open === "dialog"}
        onOpenChange={(o) => !o && setOpen(null)}
        origin={dialogButton}
        title="Invite your team"
        description="Send an invitation by email"
        variant="dialog"
        showTitle
        size="sm"
      >
        <div className="space-y-3 p-4 pt-2 text-sm">
          <p className="text-muted-foreground">The panel grew out of the button you pressed and shrinks back into it when you close it.</p>
          <Button size="sm" onClick={() => setOpen(null)}>
            Done
          </Button>
        </div>
      </MorphDialog>
      <MorphDialog open={open === "sheet"} onOpenChange={(o) => !o && setOpen(null)} origin={sheetButton} title="Filters" variant="sheet" showTitle>
        <div className="space-y-3 p-4 pt-2 text-sm">
          <p className="text-muted-foreground">A sheet docks to the bottom edge and still comes out of its own button.</p>
          <Button size="sm" onClick={() => setOpen(null)}>
            Apply
          </Button>
        </div>
      </MorphDialog>
    </>
  );
}
```
