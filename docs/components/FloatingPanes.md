# FloatingPanes

> Layer of draggable, resizable floating windows kept inside their container.

- Import: `import { FloatingPanes } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/workspace`)
- Source: `packages/ui/src/patterns/tiling-layout-floating` (patterns)
- `data-slot`: `floating-panes`, `floating-pane`, `floating-pane-handle`, `floating-pane-resize`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onPanesChange` (required) | `(panes: FloatingPaneState[]) => void` |  | Called with the full window list after a window moves, resizes, closes or is brought to the front. |
| `panes` (required) | `FloatingPaneState[]` |  | Windows; the last one is in front. |
| `renderPane` (required) | `(paneId: string) => React.ReactNode` |  | Renders the content of a window from its pane id. |
| `minHeight` | `number` | `120` | Smallest window height in px. |
| `minWidth` | `number` | `180` | Smallest window width in px. |
| `onClose` | `(paneId: string) => void` |  | Called with the pane id when the window's close button is clicked. |
| `onDock` | `(paneId: string) => void` |  | Show a "dock" button that hands the pane back to the layout. |
| `paneIcon` | `(paneId: string) => React.ReactNode` |  | Icon shown before the window title. |
| `paneLabel` | `(paneId: string) => string` |  | Plain-text name for labels (defaults to a string title or the id). |
| `paneTitle` | `(paneId: string) => React.ReactNode` |  | Window title from the pane id; defaults to a string title or the id. |

## Example (live: `#/components/tiling/floating-panes` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { FloatingPanes } from "@cleanprompt/sutra-ui/workspace";

function FloatingDemo() {
  const [panes, setPanes] = React.useState<FloatingPaneState[]>([
    { id: "inspector", x: 24, y: 24, width: 260, height: 170 },
    { id: "console", x: 200, y: 110, width: 300, height: 180 },
  ]);
  const [docked, setDocked] = React.useState<string[]>([]);
  return (
    <div className="w-full space-y-2">
      <div className="relative h-[360px] w-full overflow-hidden rounded-box border border-border bg-dots">
        <FloatingPanes
          panes={panes}
          onPanesChange={setPanes}
          paneTitle={(id) => (id === "inspector" ? "Inspector" : "Console")}
          renderPane={(id) =>
            id === "inspector" ? (
              <div className="space-y-1 p-3 text-xs">
                <p className="font-medium">button.primary</p>
                <p className="text-muted-foreground">padding: 8px 14px</p>
                <p className="text-muted-foreground">radius: var(--radius-control)</p>
              </div>
            ) : (
              <pre className="h-full bg-inverse p-2 font-mono text-2xs text-inverse-foreground">{"> layout.serialize()\n'{\"type\":\"split\",…}'"}</pre>
            )
          }
          onDock={(id) => {
            setPanes((ps) => ps.filter((p) => p.id !== id));
            setDocked((d) => [...d, id]);
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        Docked: {docked.length ? docked.join(", ") : "none"}
        {docked.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setPanes((ps) => [...ps, ...docked.map((id, i) => ({ id, x: 40 + i * 30, y: 40 + i * 30, width: 260, height: 170 }))]);
              setDocked([]);
            }}
          >
            Float again
          </Button>
        )}
      </div>
    </div>
  );
}
```
