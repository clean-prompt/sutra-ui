# ZoneEditor

> FancyZones-style editor: click to split zones (Shift for horizontal), drag dividers, delete zones.

- Import: `import { ZoneEditor } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/patterns/tiling-layout-zone-editor` (patterns)
- `data-slot`: `zone`, `zone-split`, `zone-editor`, `zone-canvas`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onApply` (required) | `(layout: LayoutNode) => void` |  | Called with the layout the user drew when "Apply" is clicked. |
| `defaultLayout` | `LayoutNode` |  | Starting arrangement (panes are ignored). Default: two columns. |
| `minSize` | `number` | `0.1` | Minimum zone fraction per split. Default 0.1. |
| `onCancel` | `() => void` |  | Called when the user cancels the editor. |
| `onChange` | `(zones: LayoutNode) => void` |  | **Deprecated.** Use `onValueChange`. Called on every edit with the zone tree. |
| `onValueChange` | `(zones: LayoutNode) => void` |  | Called on every edit with the zone tree. |
| `panes` | `string[]` |  | When given, the applied layout has these panes filled into the zones in order. |

## Example (live: `#/components/tiling/zone-editor` in the playground)

```tsx
import * as React from "react";
import { JsonViewer } from "@sutra/ui/ops";
import { ZoneEditor } from "@sutra/ui/workspace";

function ZoneEditorDemo() {
  const [output, setOutput] = React.useState<LayoutNode | null>(null);
  const [key, setKey] = React.useState(0);
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <ZoneEditor key={key} onApply={setOutput} onCancel={() => setKey((k) => k + 1)} />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Applied output</p>
        {output ? (
          <JsonViewer data={output} defaultExpandDepth={2} maxHeight={280} toolbar={false} label="Zone output" />
        ) : (
          <p className="text-sm text-muted-foreground">Press Apply to see the tree.</p>
        )}
      </div>
    </div>
  );
}
```
