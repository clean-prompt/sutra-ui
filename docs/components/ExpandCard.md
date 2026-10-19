# ExpandCard

> A card that grows into its dialog: the card is the button that opens a `MorphDialog` and also the origin it flies out of and back into. While the dialog is open the card is hidden (it comes back as the panel lands on it). The card is a native button with `aria-haspopup="dialog"`; its content may use blocks. Controlled with `open` / `defaultOpen` / `onOpenChange`.

- Import: `import { ExpandCard } from "@sutra/ui"` (or from `@sutra/ui/motion`)
- Source: `packages/ui/src/patterns/morph-dialog` (patterns)
- `data-slot`: `expand-card`, `expand-card-face`, `expand-card-detail`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` (required) | `React.ReactNode` |  | The collapsed card face. It is shown again at the top of the expanded panel (unless `repeatFace` is false), so keep it start-aligned. |
| `detail` (required) | `React.ReactNode \| ((api: { close: () => void }) => React.ReactNode)` |  | What the expanded panel shows below the face. A function gets `close`. |
| `title` (required) | `string` |  | Accessible name of the expanded dialog (the visible title is in the face). |
| `defaultOpen` | `boolean` | `false` | Start open (uncontrolled). |
| `description` | `string` |  | Accessible description of the dialog. |
| `onMorphEnd` | `(phase: "open" \| "close") => void` |  | Runs when the open or close flight has finished. |
| `onOpenChange` | `(open: boolean) => void` |  | Asked to open or close: a press on the card, Escape, the close button or the scrim. |
| `open` | `boolean` |  | Whether the dialog is open (controlled). |
| `panelClassName` | `string` |  | Classes of the expanded panel. |
| `repeatFace` | `boolean` | `true` | Draw the face again at the top of the panel, which is what makes the morph read as one object. The copy is hidden from assistive technology and inert, so the detail must carry what the face says. Default true. |
| `showClose` | `boolean` |  | The close button at the top end of the panel. Default true. |
| `size` | `MorphDialogSize` |  | Width of the panel: sm, md or lg. Default "md". |
| `variant` | `MorphDialogVariant` |  | `"dialog"` is centred, `"sheet"` docks to the bottom edge, `"auto"` is a sheet below the `sm` breakpoint. Default "auto". |

## Example (live: `#/components/showpieces/expand-card-calendar` in the playground)

```tsx
import { Avatar, AvatarGroup, Button } from "@sutra/ui/core";
import { RiCalendarEventLine, RiMapPinLine, RiVideoChatLine } from "@sutra/ui/icons";
import { ExpandCard } from "@sutra/ui/motion";

function Calendar() {
  return (
    <div className="w-full max-w-md space-y-3">
      {events.map((e) => (
        <ExpandCard
          key={e.id}
          title={e.title}
          description={`${e.time}, ${e.where}`}
          className={`border-s-4 ${e.color}`}
          panelClassName={`border-s-4 ${e.color}`}
          detail={({ close }) => (
            <div className="space-y-4">
              <p className="text-muted-foreground">{e.note}</p>
              <div className="flex items-center gap-3">
                <AvatarGroup>
                  {e.people.map((p) => (
                    <Avatar key={p} name={p} size="sm" />
                  ))}
                </AvatarGroup>
                <span className="text-xs text-muted-foreground">{e.people.length} going</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" leadingIcon={<RiVideoChatLine aria-hidden />}>
                  Join
                </Button>
                <Button size="sm" variant="outline" onClick={close}>
                  Close
                </Button>
              </div>
            </div>
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <RiCalendarEventLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{e.title}</span>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">{e.time}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <RiMapPinLine aria-hidden className="size-3.5 shrink-0" />
            {e.where}
          </span>
        </ExpandCard>
      ))}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): events.
