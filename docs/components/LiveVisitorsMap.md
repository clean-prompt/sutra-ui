# LiveVisitorsMap

> Live analytics screen: a header with live, country and source counts, a globe or flat map of avatar markers with source badges and clusters, a visitor list whose rows select and fly to the marker, and a card for the selected visitor.

- Import: `import { LiveVisitorsMap } from "@sutra/ui"` (or from `@sutra/ui/geo`)
- Source: `packages/ui/src/kits/geo/live-visitors-map` (kit `geo`)
- `data-slot`: `live-visitors-map`, `live-visitors-header`, `live-visitors-count`, `live-visitors-window`, `live-visitors-map-area`, `live-visitors-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `visitors` (required) | `readonly LiveVisitor[]` | `EMPTY` | Visitors currently on the site, each with a location, source and last-seen time. |
| `autoRotate` | `boolean \| number` | `true` | Spin the globe while nothing is selected (see `Globe`'s `autoRotate`). Default true. |
| `defaultSelectedId` | `string \| null` | `null` | Initially selected visitor id when `selectedId` is not controlled. |
| `defaultView` | `LiveVisitorsMapView` | `"globe"` | Default `globe`. |
| `emptyState` | `React.ReactNode` |  | Shown in the list when there are no visitors. |
| `label` | `string` | `"Live visitors"` | Accessible name of the screen. Default "Live visitors". |
| `liveWithinMs` | `number` | `60_000` | Visitors seen within this many ms get a pulsing marker and read "now". Default 60 000. |
| `loading` | `boolean` |  | Data is on its way: skeletons with no visitors yet, otherwise the screen is marked busy. |
| `locale` | `string` |  | Locale for country names and numbers. |
| `mapClassName` | `string` |  | Classes for the map column. |
| `maxSources` | `number` | `4` | How many sources the header lists before "+N". Default 4. |
| `now` | `TimeInput` |  | Reference time for "now / 1m" labels. Default: the clock, refreshed every 15 s. |
| `onSelectedIdChange` | `(id: string \| null, visitor: LiveVisitor \| undefined) => void` |  | Called when a marker or list row is selected, or the card is closed (`null`). |
| `onViewChange` | `(view: LiveVisitorsMapView) => void` |  | Called with the view when the user flips the globe and flat switch. |
| `renderVisitorActions` | `(visitor: LiveVisitor) => React.ReactNode` |  | Actions in the visitor card, e.g. a "View history" button. |
| `selectedId` | `string \| null` |  | Controlled id of the selected visitor; `null` selects none. |
| `sources` | `readonly LiveVisitorSourceCount[]` |  | Header source counts. Defaults to counts grouped from `visitors`. |
| `total` | `number` |  | Live count in the header when it differs from `visitors.length` (e.g. only a sample is plotted). |
| `view` | `LiveVisitorsMapView` |  | Controlled view: `globe` or `flat`. |
| `windowLabel` | `React.ReactNode` |  | Time window text in the header, e.g. "Last 30 minutes". |

## Example (live: `#/components/live-visitors/empty-visitors` in the playground)

```tsx
import { LiveVisitorsMap } from "@sutra/ui/geo";

function EmptyDemo() {
  return <LiveVisitorsMap visitors={[]} windowLabel="Last 30 minutes" defaultView="flat" label="Live visitors (empty)" />;
}
```
