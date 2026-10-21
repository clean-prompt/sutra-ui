# TipBubble

> Dismissible contextual tip anchored to an element, with a rotating "Next tip" list.

- Import: `import { TipBubble } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/patterns/coachmarks` (patterns)
- `data-slot`: `tip-bubble`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tips` (required) | `TipBubbleItem[]` |  | One or more tips; "Next tip" cycles through them. |
| `accent` | `TipBubbleAccent` |  | **Deprecated.** Use `tone`. Legacy name of `tone`. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the bubble along that side. |
| `children` | `React.ReactElement` |  | Anchor element (wrapped with asChild). Use `target` instead to anchor to an existing element. |
| `className` | `string` |  | Classes for the bubble. |
| `defaultIndex` | `number` | `0` | Initial tip index when uncontrolled. |
| `defaultOpen` | `boolean` | `true` | Initial open state when uncontrolled. |
| `icon` | `React.ReactNode` |  | Icon shown beside the tip text. |
| `index` | `number` |  | Controlled index of the visible tip when there are several. Use with `onIndexChange`. |
| `onDismiss` | `() => void` |  | Called when the bubble is closed. |
| `onDontShowAgain` | `() => void` |  | Shows a "Don't show again" action. |
| `onIndexChange` | `(index: number) => void` |  | Called with the new tip index when the user pages through the tips. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the bubble opens or closes. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `side` | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Side of the anchor the bubble opens on. |
| `target` | `CoachmarkTarget` |  | Existing element to anchor to: a CSS selector or a ref. Use it instead of wrapping an anchor in `children`. |
| `tone` | `ToneInput` |  | Accent colour of the bar and icon. Default `primary`. |

## Example (live: `#/components/workspace/tip-bubble` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { RiLightbulbLine } from "@sutra/ui/icons";
import { TipBubble } from "@sutra/ui/workspace";

function TipDemo() {
  const [open, setOpen] = React.useState(true);
  const [muted, setMuted] = React.useState(false);
  return (
    <div className="flex min-h-48 w-full flex-col items-start gap-3">
      <TipBubble tips={tips} open={open && !muted} onOpenChange={setOpen} onDontShowAgain={() => setMuted(true)} tone="primary" side="right">
        <Button variant="secondary" leadingIcon={<RiLightbulbLine />}>
          Composer
        </Button>
      </TipBubble>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          setMuted(false);
          setOpen(true);
        }}
      >
        Show tips again{muted ? " (was muted)" : ""}
      </Button>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): tips.
