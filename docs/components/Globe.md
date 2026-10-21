# Globe

> Interactive 3D globe (orthographic, bundled outlines): drag with momentum, wheel/pinch/keyboard zoom, auto-rotation, fly-to, and the same choropleth, markers, clustering, arcs, country selection and screen-reader tables as WorldMap.

- Import: `import { Globe } from "@sutra/ui"` (or from `@sutra/ui/geo`)
- Source: `packages/ui/src/kits/geo/globe` (kit `geo`)
- `data-slot`: `globe`, `globe-canvas`, `globe-atmosphere`, `globe-sphere`, `globe-skeleton`, `globe-graticule`, `globe-borders`, `globe-selected`, `globe-hover`, `globe-shade`, `globe-rim`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiRef` | `React.Ref<GlobeApi>` |  | Imperative handle (`flyTo`, `reset`, `zoomIn`, `zoomOut`, `getView`); `ref` stays on the root element. |
| `arcs` | `readonly GeoArc[]` | `EMPTY` | Great-circle arcs between two points, for example traffic or replication links. |
| `autoRotate` | `boolean \| number` | `false` | Spin slowly: `true` for 8°/s or a speed in degrees per second (negative turns westward). Pauses while the user drags, zooms, hovers or focuses a marker, or has one selected, and resumes after `autoRotateDelay`. Starts off under reduced motion (the play control can still start it) and stops while off-screen or in a hidden tab. |
| `autoRotateDelay` | `number` | `2500` | Ms of quiet before auto-rotation resumes. Default 2500. |
| `cluster` | `boolean \| GeoMarkerClusterOptions` |  | Merge nearby markers into count bubbles (`{ radius }` in px, default 36; 48 for compact markers). |
| `color` | `string` | `"primary"` | Colour token or any CSS colour for the choropleth. Default `primary`. |
| `compactMarkers` | `boolean` |  | Smaller markers and a wider cluster radius. Default: on when the drawing is narrower than 480 px. |
| `controls` | `boolean` | `false` | Show the play/pause, zoom and reset buttons. Default false. |
| `controlsClassName` | `string` |  | Classes for the control bar (bottom-end by default). |
| `data` | `readonly WorldMapDatum[]` | `EMPTY` | Choropleth values by country. |
| `dataTable` | `boolean` | `true` | Render the visually hidden screen-reader tables (countries, markers, arcs). Default true. Set false when the page already lists the same data accessibly next to the map (as LiveVisitorsMap, SignInMap and RegionStatusMap do). |
| `defaultRotation` | `GeoRotationInput` |  | Starting rotation. Defaults to centring `focus`, else the selected marker, else Europe and Africa. |
| `defaultSelectedCountry` | `string \| null` |  | Initially selected country (alpha-2 code) when `selectedCountry` is not controlled. |
| `defaultSelectedMarkerId` | `string \| null` | `null` | Initially selected marker id when `selectedMarkerId` is not controlled. |
| `defaultWidth` | `number` | `480` | Width used before the container is measured (and in jsdom). Default 480. |
| `defaultZoom` | `number` | `1` | Initial zoom multiplier when `zoom` is not controlled. Default 1. |
| `domain` | `[number, number]` |  | Value range for `quantize`. Defaults to the data's min and max. |
| `flyToSelection` | `boolean` | `true` | Fly to a marker when it is selected. Default true. |
| `focus` | `GeoPointInput \| null` |  | A point to turn to: the globe flies there whenever this changes (and starts there). |
| `graticule` | `boolean` | `false` | Draw 10° graticule lines. |
| `height` | `number` |  | Height in px. Default: the measured width (a square). |
| `label` | `string` |  | Accessible name; defaults to a summary ("World map: 12 countries with data, 16 markers"). `aria-label` also works. |
| `legend` | `boolean` | `false` | Show the stepped scale legend under the map. |
| `loading` | `boolean` |  | Data is on its way: with nothing to show yet, a pulsing silhouette stands in; otherwise the map is marked busy. |
| `locale` | `string` |  | Locale for country names. Default English. |
| `markers` | `readonly GeoMarker[]` | `EMPTY` | Points to plot on the map, each with an id, a location and optional label, value and colour. |
| `markerSizeRange` | `[number, number]` |  | Diameter range in px for `value`-scaled markers. Default `[8, 28]`. |
| `maxZoom` | `number` | `6` | Default 6. |
| `minZoom` | `number` | `1` | Default 1. |
| `noDataColor` | `string` | `LAND` | Fill for countries without data. Default `var(--muted)`. |
| `onAutoRotateChange` | `(playing: boolean) => void` |  | Called when the play control starts or stops auto-rotation. |
| `onClusterSelect` | `GeoMarkerLayerProps["onClusterSelect"]` |  | Called with the members and the cluster when the user activates a cluster bubble. |
| `onCountrySelect` | `(code: string \| null, country: WorldMapCountry \| undefined) => void` |  | Called with the clicked country, or `null` when the selected one is clicked again. |
| `onMarkerSelect` | `(id: string \| null, marker: GeoMarker \| undefined) => void` |  | Called with the marker id (or `null`) and the marker when the user selects or clears a marker. |
| `onRotationChange` | `(rotation: GeoRotation) => void` |  | Called when the globe comes to rest after a drag, momentum, fly-to, zoom or key press, and when auto-rotation pauses; not on every frame, so a parent that stores the value doesn't re-render 60 times a second. |
| `onZoomChange` | `(zoom: number) => void` |  | Called with the resting zoom (see `onRotationChange`). |
| `padding` | `number` | `8` | Space between the globe and the edge in px. Default 8. |
| `rotation` | `GeoRotationInput` |  | Rotation `[λ, φ, γ]` in degrees (`rotationToCenter(point)` builds one). The globe jumps to it whenever it changes; drags and animations move the globe on their own and report the resting rotation to `onRotationChange`. |
| `scale` | `GeoScaleKind` | `"quantize"` | Bucketing: `quantize` (equal ranges, default) or `quantile` (equal counts). |
| `selectedCountry` | `string \| null` |  | Highlighted country (alpha-2 code). Clicking a country selects it when this, `defaultSelectedCountry` or `onCountrySelect` is set. |
| `selectedMarkerId` | `string \| null` |  | Controlled id of the selected marker; `null` selects none. |
| `shading` | `boolean` | `true` | Light and edge shading plus a faint atmosphere glow. Default true. |
| `steps` | `number` | `5` | Number of colour buckets. Default 5. |
| `tooltip` | `boolean` | `true` | Hover tooltips for countries and markers. Default true. |
| `valueFormatter` | `(value: number) => string` | `defaultGeoValueFormatter` | Formats a country value for the tooltip, legend and table. |
| `valueLabel` | `string` | `"Value"` | Name of the value in the tooltip, legend and table. Default "Value". |
| `wheelZoom` | `boolean` | `true` | Zoom with the mouse wheel or trackpad pinch. Default true. |
| `zoom` | `number` |  | Zoom as a scale multiplier (1 = the whole globe fits). Same jump-and-report contract as `rotation`. |

## Example (live: `#/components/globe/attack-globe` in the playground)

```tsx
import { Text } from "@sutra/ui/core";
import { formatCompact } from "@sutra/ui/format";
import { Globe } from "@sutra/ui/geo";

function AttacksDemo() {
  const total = attacks.reduce((s, a) => s + a.count, 0);
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 w-full items-center gap-4 @2xl:grid-cols-[1fr_14rem]">
        <Globe
          className="mx-auto w-full max-w-[460px]"
          arcs={attackArcs}
          markers={attackMarkers}
          markerSizeRange={[8, 18]}
          graticule
          focus={DATACENTER}
          controls
          label="Attack origins: 7 sources targeting the Frankfurt datacenter"
        />
        <div className="space-y-2 text-sm">
          <Text size="sm" className="font-medium">
            {formatCompact(total)} requests blocked
          </Text>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {[...attacks]
              .sort((a, b) => b.count - a.count)
              .map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span>{a.city}</span>
                  <span className="tabular-nums text-foreground">{a.count.toLocaleString()}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): DATACENTER, attackArcs, attackMarkers, attacks.
