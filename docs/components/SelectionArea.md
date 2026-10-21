# SelectionArea

> A selectable region: drag on empty space to rubber-band select (Shift adds, Mod toggles), click items to select, Shift-click for ranges, Mod+A selects all, Escape clears, Space toggles the focused item and the arrow keys move focus. Items get their props from `getItemProps(id)` (via `useSelectionArea()` or the render-prop argument).

- Import: `import { SelectionArea } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/patterns/selection-area` (patterns)
- `data-slot`: `selection-area-marquee`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` |  | Marquee colour. Default: the primary colour. |
| `autoScroll` | `boolean \| { edge?: number; speed?: number }` |  | Scroll the container while dragging near its edges. `edge` is the zone in px, `speed` the max px per frame. |
| `children` | `React.ReactNode \| ((api: SelectionAreaContextValue) => React.ReactNode)` |  | The selectable items: a node, or a function that receives the selection API. |
| `clearOnClick` | `boolean` |  | A plain click on empty space clears the selection. Default true. |
| `defaultValue` | `string[]` |  | Initially selected ids when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables marquee selection. |
| `formatAnnouncement` | `(count: number) => string` | `defaultAnnouncement` | Screen-reader text after the selection count changes. Default "3 items selected" / "No items selected". |
| `items` | `string[]` |  | All item ids in display order: used by select-all and Shift range selection. Default: the DOM order. |
| `mode` | `"intersect" \| "contain"` |  | Whether an item must touch (`intersect`, default) or lie fully inside (`contain`) the marquee. |
| `onValueChange` | `(value: string[]) => void` |  | Called with the selected ids as the selection changes. |
| `selectOnClick` | `boolean` | `true` | Clicking an item selects it (Mod toggles, Shift selects a range). Default true. |
| `threshold` | `number` |  | Pointer travel in px before a press becomes a marquee (so clicks stay clicks). Default 4. |
| `touch` | `boolean` |  | Start marquees from touch too. Off by default so touch drags keep scrolling; set `touch-action: none` when on. |
| `value` | `string[]` |  | Selected ids (controlled). |

## Example (live: `#/components/files/selection-area` in the playground)

```tsx
import * as React from "react";
import { SelectionArea } from "@cleanprompt/sutra-ui/forms";

function MarqueeDemo() {
  const [selected, setSelected] = React.useState<string[]>([]);
  return (
    <div className="w-full space-y-2">
      <SelectionArea
        value={selected}
        onValueChange={setSelected}
        items={files}
        aria-label="Files"
        className="grid grid-cols-3 gap-3 rounded-box border border-dashed border-border p-4 sm:grid-cols-4 lg:grid-cols-6"
      >
        {files.map((f) => (
          <FileTile key={f} id={f} />
        ))}
      </SelectionArea>
      <p className="text-sm text-muted-foreground">
        Drag on empty space to select; Shift adds, Cmd/Ctrl toggles. Click an item, Cmd/Ctrl+A selects all, Escape clears. Selected:{" "}
        {selected.length ? selected.join(", ") : "none"}
      </p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): FileTile, files.
