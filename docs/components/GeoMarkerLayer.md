# GeoMarkerLayer

> HTML overlay of marker buttons positioned over a map drawing: focusable, labelled, `aria-pressed` for the selected one, optional clustering into count bubbles and a hover/focus tooltip. Shared by WorldMap and the globe.

- Import: `import { GeoMarkerLayer } from "@sutra/ui"` (or from `@sutra/ui/geo`)
- Source: `packages/ui/src/kits/geo/geo-marker-layer` (kit `geo`)
- `data-slot`: `geo-marker-layer`, `geo-marker-item`, `geo-marker-visual`, `geo-marker-cluster`, `geo-marker-badge`, `geo-marker`, `geo-marker-tooltip`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` (required) | `number` |  | Height in px of the drawing the layer sits on, used to keep tooltips inside. |
| `markers` (required) | `readonly GeoMarker[]` |  | Markers to place, each with an id, a point and optional label, value, colour and avatar. |
| `project` (required) | `(point: GeoPointInput) => readonly [number, number] \| null` |  | Screen position of a point, or `null` to hide the marker (clipped, or on a globe's far side). |
| `width` (required) | `number` |  | Size of the drawing the layer sits on, used to keep tooltips inside. |
| `activeId` | `string \| null` | `null` | A marker to show as active from outside (tooltip and ring), e.g. while a list row for it has focus. |
| `cluster` | `boolean \| GeoMarkerClusterOptions` |  | Merge nearby markers into count bubbles. The selected marker always stays on its own. |
| `compact` | `boolean` |  | Smaller markers (about 70%) and a wider default cluster radius, for small maps where avatars would crowd. Default: on when `width` is under 480 px. |
| `defaultSelectedId` | `string \| null` | `null` | Initially selected marker id when `selectedId` is not controlled. |
| `markerOpacity` | `(marker: GeoMarker) => number` |  | Opacity per marker, 0–1 (the globe fades markers near its edge). Markers at 0 are not rendered. |
| `onClusterSelect` | `(members: GeoMarker[], cluster: GeoCluster<GeoMarker>) => void` |  | Called when a cluster bubble is activated. |
| `onSelectedIdChange` | `(id: string \| null, marker: GeoMarker \| undefined) => void` |  | Called with the new selection (`null` when the selected marker is activated again). |
| `selectedId` | `string \| null` |  | Controlled id of the selected marker; `null` selects none. |
| `sizeRange` | `[number, number]` | `[8, 28]` | Diameter range in px for `value`-scaled markers. Default `[8, 28]`. |
| `tooltip` | `boolean` | `true` | Show a tooltip for the hovered or focused marker. Default true. |
