# MemoryMap

> Knowledge / memory graph over time on a canvas: d3-force layout, radial time rings, pan/zoom, legend filter, time scrubber, detail panel and an accessible list view.

- Import: `import { MemoryMap } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/kits/workspace/memory-map` (kit `workspace`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` (required) | `MemoryNode[]` |  | Memories to plot, each with an id, title, kind, creation time and optional links to other nodes. |
| `aria-label` | `string` | `"Memory map"` | Defines a string value that labels the current element. |
| `defaultHiddenKinds` | `string[]` |  | Initially hidden kinds when `hiddenKinds` is not controlled. |
| `defaultListView` | `boolean` |  | Initial state when `listView` is not controlled. |
| `defaultSelectedId` | `string \| null` |  | Initially selected node id when `selectedId` is not controlled. |
| `defaultTimeRange` | `[number, number]` |  | Initial range when `timeRange` is not controlled; defaults to all nodes. |
| `defaultZoom` | `MemoryMapZoom` |  | Initial pan and zoom when `zoom` is not controlled. |
| `height` | `number` | `480` | Canvas height in px. Default 480. |
| `hiddenKinds` | `string[]` |  | Controlled kinds hidden from the map; toggled from the legend. |
| `legendOverrides` | `MemoryLegendOverrides` |  | Labels, colours and glyphs that replace the defaults for kinds in the legend. |
| `listView` | `boolean` |  | Controlled state of the list view: true shows the accessible list instead of the canvas. |
| `locale` | `string` |  | BCP 47 locale used to format dates and numbers. |
| `onDelete` | `(node: MemoryNode) => void` |  | Called with the node when the user presses Delete; the action is hidden when unset. |
| `onEdit` | `(node: MemoryNode) => void` |  | Called with the node when the user presses Edit; the action is hidden when unset. |
| `onHiddenKindsChange` | `(kinds: string[]) => void` |  | Called with the hidden kinds when the user toggles one in the legend. |
| `onLayout` | `(positions: Record<string, MemoryPoint>) => void` |  | Called with node positions once the layout settles. |
| `onListViewChange` | `(on: boolean) => void` |  | Called with the new state when the user switches between map and list. |
| `onOpen` | `(node: MemoryNode) => void` |  | Called with the node when the user presses Open in the detail panel or list; the action is hidden when unset. |
| `onSelect` | `(node: MemoryNode \| null) => void` |  | Called with the node, or `null` when the selection is cleared. |
| `onTimeRangeChange` | `(range: [number, number]) => void` |  | Called with the range when the user moves the time scrubber. |
| `onZoomChange` | `(zoom: MemoryMapZoom) => void` |  | Called with the pan and zoom when the user pans, pinches or zooms the map. |
| `radialTime` | `MemoryRadialTime` | `false` | Rings by creation time: true / "old-center" puts the oldest at the center, "old-outer" at the edge. |
| `renderDetail` | `(node: MemoryNode, helpers: MemoryMapDetailHelpers) => React.ReactNode` |  | Replace the default detail panel. |
| `rings` | `number` | `6` | Number of labeled time rings. Default 6. |
| `scrubberProps` | `Partial<Omit<TimeScrubberProps, "nodes" \| "value" \| "onValueChange">>` |  | Props forwarded to the TimeScrubber (e.g. controlled `playing`). |
| `seed` | `number \| string` | `1` | Layout seed (deterministic). Default 1. |
| `selectedId` | `string \| null` |  | Controlled id of the selected node; `null` selects none. |
| `showDetail` | `boolean` | `true` | Shows the detail panel for the selected node. Default true. |
| `showLegend` | `boolean` | `true` | Shows the kind legend, which doubles as a filter. Default true. |
| `showScrubber` | `boolean` | `true` | Shows the time scrubber under the map. Default true. |
| `staticLayout` | `boolean \| number` |  | Compute the layout synchronously (true = 300 ticks, or a tick count) instead of animating the settle. |
| `timeRange` | `[number, number]` |  | Controlled visible range `[from, to]` in epoch ms; nodes created outside it are hidden. |
| `toolbarExtra` | `React.ReactNode` |  | Extra toolbar content. |
| `zoom` | `MemoryMapZoom` |  | Controlled pan and zoom: scale `k` and offsets `x` and `y`. |

## Example (live: `#/components/kanban-memory/memory-map` in the playground)

```tsx
import * as React from "react";
import { MemoryMap, ShareCodeControls } from "@sutra/ui/workspace";

function MemoryMapDemo() {
  const [hiddenKinds, setHiddenKinds] = React.useState<string[]>([]);
  const [range, setRange] = React.useState<[number, number] | undefined>(undefined);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<{ k: number; x: number; y: number } | undefined>(undefined);
  const [lastAction, setLastAction] = React.useState("");
  const [nodes, setNodes] = React.useState(memoryNodes);
  const extent: [number, number] = React.useMemo(() => {
    const ts = nodes.map((n) => n.createdAt as number);
    return [Math.min(...ts), Math.max(...ts)];
  }, [nodes]);
  const view: MemoryMapViewState = { hiddenKinds, range: range ?? extent, selectedId: selectedId ?? undefined, zoom };
  return (
    <div className="flex w-full flex-col gap-4">
      <MemoryMap
        nodes={nodes}
        radialTime
        seed={7}
        height={520}
        hiddenKinds={hiddenKinds}
        onHiddenKindsChange={setHiddenKinds}
        timeRange={range ?? extent}
        onTimeRangeChange={setRange}
        selectedId={selectedId}
        onSelect={(n) => setSelectedId(n?.id ?? null)}
        zoom={zoom}
        onZoomChange={setZoom}
        onOpen={(n) => setLastAction(`Open “${n.label}”`)}
        onEdit={(n) => setLastAction(`Edit “${n.label}”`)}
        onDelete={(n) => {
          setNodes((all) => all.filter((x) => x.id !== n.id).map((x) => ({ ...x, links: x.links?.filter((l) => l !== n.id) })));
          setSelectedId(null);
          setLastAction(`Deleted “${n.label}”`);
        }}
        toolbarExtra={lastAction && <span className="mr-2 text-xs text-muted-foreground">{lastAction}</span>}
      />
      <ShareCodeControls
        className="max-w-xl"
        state={view}
        onImport={(s) => {
          setHiddenKinds(s.hiddenKinds ?? []);
          setRange(s.range);
          setSelectedId(s.selectedId ?? null);
          setZoom(s.zoom);
        }}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): memoryNodes.
