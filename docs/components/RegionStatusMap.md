# RegionStatusMap

> Infrastructure regions on a world map or globe: markers toned by status and sized by load, replication/traffic links as arcs, a status legend with counts, a sortable region table whose rows select the marker, and a detail panel (status, incident, load meter, latency and node readings, links, actions) for the selected region.

- Import: `import { RegionStatusMap } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/region-status-map` (kit `ops`)
- `data-slot`: `region-status-panel`, `region-status-map`, `region-status-empty`, `region-status-map-canvas`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `regions` (required) | `readonly StatusRegion[]` |  | Regions to plot and list, each with a name, location, status, latency and load. |
| `autoRotate` | `boolean \| number` |  | Spin the globe view slowly (see `Globe`'s `autoRotate`). |
| `cluster` | `boolean` | `false` | Merge nearby markers into count bubbles. Default false. |
| `defaultSelectedId` | `string \| null` | `null` | Initially selected region id when `selectedId` is not controlled. |
| `defaultSort` | `RegionSort \| null` | `DEFAULT_SORT` | Initial table sort when `sort` is not controlled. |
| `defaultView` | `RegionStatusMapView` | `"map"` | Initial view when `view` is not controlled: `map` or `globe`. |
| `emptyState` | `React.ReactNode` |  | Shown instead of the map and table when there are no regions. |
| `label` | `string` |  | Accessible name of the map. Defaults to a summary ("Region map: 12 regions, 1 down, 2 degraded"). |
| `latencyThresholds` | `ReadoutThresholds \| false` | `DEFAULT_LATENCY_THRESHOLDS` | Latency (ms) at which readings turn warning / destructive. Default `{ warning: 150, danger: 300 }`. |
| `links` | `readonly RegionLink[]` | `EMPTY` | Replication or traffic links between regions, drawn as arcs toned by health. |
| `loading` | `boolean` |  | Data is on its way: skeletons with no regions yet; otherwise the current regions stay and the root is busy. |
| `loadingRows` | `number` | `5` | Skeleton rows in the table while loading. Default 5. |
| `loadThresholds` | `MeterThresholds \| false` |  | Load percent at which meters turn warning / destructive. Default `{ warn: 75, danger: 90 }`. |
| `locale` | `string` |  | Locale for numbers. |
| `onSelectedIdChange` | `(id: string \| null, region: StatusRegion \| undefined) => void` |  | Called with the region id (or `null`) and the region when the user selects or clears one. |
| `onSortChange` | `(sort: RegionSort \| null) => void` |  | Called with the sort (or `null`) when the user changes it. |
| `onViewChange` | `(view: RegionStatusMapView) => void` |  | Called with the view when the user flips the map and globe toggle. |
| `renderRegionActions` | `(region: StatusRegion) => React.ReactNode` |  | Actions in the selected region's detail panel (e.g. "Open dashboard", "Drain"). |
| `selectedId` | `string \| null` |  | Selected region id (shows its detail and highlights its marker and row). |
| `sort` | `RegionSort \| null` |  | Table sort. Default: status, worst first. `null` keeps the order of `regions`. |
| `view` | `RegionStatusMapView` |  | Flat map (default) or globe. |
| `viewToggle` | `boolean` | `true` | Show the map / globe toggle. Default true. |

## Example (live: `#/components/region-map/empty` in the playground)

```tsx
import { RegionStatusMap } from "@sutra/ui/ops";

function EmptyDemo() {
  return <RegionStatusMap regions={[]} />;
}
```
