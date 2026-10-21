# WorldMap

> Flat world map from bundled outlines (no network): a choropleth with a stepped legend, marker buttons (dots, icons or avatars, optionally clustered), animated great-circle arcs, country tooltips and selection, and screen-reader tables.

- Import: `import { WorldMap } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/geo`)
- Source: `packages/ui/src/kits/geo/world-map` (kit `geo`)
- `data-slot`: `world-map`, `world-map-canvas`, `world-map-sphere`, `world-map-graticule`, `world-map-skeleton`, `world-map-countries`, `world-map-borders`, `world-map-selected`, `world-map-hover`, `world-map-arcs`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `arcs` | `readonly GeoArc[]` | `EMPTY` | Great-circle arcs between two points, for example traffic or replication links. |
| `cluster` | `boolean \| GeoMarkerClusterOptions` |  | Merge nearby markers into count bubbles (`{ radius }` in px, default 36; 48 for compact markers). |
| `color` | `string` | `"primary"` | Colour token or any CSS colour for the choropleth. Default `primary`. |
| `compactMarkers` | `boolean` |  | Smaller markers and a wider cluster radius. Default: on when the drawing is narrower than 480 px. |
| `data` | `readonly WorldMapDatum[]` | `EMPTY` | Choropleth values by country. |
| `dataTable` | `boolean` | `true` | Render the visually hidden screen-reader tables (countries, markers, arcs). Default true. Set false when the page already lists the same data accessibly next to the map (as LiveVisitorsMap, SignInMap and RegionStatusMap do). |
| `defaultSelectedCountry` | `string \| null` |  | Initially selected country (alpha-2 code) when `selectedCountry` is not controlled. |
| `defaultSelectedMarkerId` | `string \| null` | `null` | Initially selected marker id when `selectedMarkerId` is not controlled. |
| `defaultWidth` | `number` | `640` | Width used before the container is measured (and in jsdom). Default 640. |
| `domain` | `[number, number]` |  | Value range for `quantize`. Defaults to the data's min and max. |
| `graticule` | `boolean` | `false` | Draw 10° graticule lines. |
| `height` | `number` |  | Height in px. Defaults to the projection's aspect at the measured width. |
| `hideAntarctica` | `boolean` | `true` | Leave Antarctica out and fit the map to the other land. Default true. |
| `label` | `string` |  | Accessible name; defaults to a summary ("World map: 12 countries with data, 16 markers"). `aria-label` also works. |
| `legend` | `boolean` | `false` | Show the stepped scale legend under the map. |
| `loading` | `boolean` |  | Data is on its way: with nothing to show yet, a pulsing silhouette stands in; otherwise the map is marked busy. |
| `locale` | `string` |  | Locale for country names. Default English. |
| `markers` | `readonly GeoMarker[]` | `EMPTY` | Points to plot on the map, each with an id, a location and optional label, value and colour. |
| `markerSizeRange` | `[number, number]` |  | Diameter range in px for `value`-scaled markers. Default `[8, 28]`. |
| `noDataColor` | `string` | `"var(--muted)"` | Fill for countries without data. Default `var(--muted)`. |
| `onClusterSelect` | `GeoMarkerLayerProps["onClusterSelect"]` |  | Called with the members and the cluster when the user activates a cluster bubble. |
| `onCountrySelect` | `(code: string \| null, country: WorldMapCountry \| undefined) => void` |  | Called with the clicked country, or `null` when the selected one is clicked again. |
| `onMarkerSelect` | `(id: string \| null, marker: GeoMarker \| undefined) => void` |  | Called with the marker id (or `null`) and the marker when the user selects or clears a marker. |
| `padding` | `number` | `4` | Space around the map in px. Default 4. |
| `projection` | `GeoProjectionKind` | `"equalEarth"` | Map projection. Default `equalEarth`. |
| `scale` | `GeoScaleKind` | `"quantize"` | Bucketing: `quantize` (equal ranges, default) or `quantile` (equal counts). |
| `selectedCountry` | `string \| null` |  | Highlighted country (alpha-2 code). Clicking a country selects it when this, `defaultSelectedCountry` or `onCountrySelect` is set. |
| `selectedMarkerId` | `string \| null` |  | Controlled id of the selected marker; `null` selects none. |
| `sphere` | `boolean` | `false` | Draw the outline of the globe. |
| `steps` | `number` | `5` | Number of colour buckets. Default 5. |
| `tooltip` | `boolean` | `true` | Hover tooltips for countries and markers. Default true. |
| `valueFormatter` | `(value: number) => string` | `defaultGeoValueFormatter` | Formats a country value for the tooltip, legend and table. |
| `valueLabel` | `string` | `"Value"` | Name of the value in the tooltip, legend and table. Default "Value". |

## Example (live: `#/components/geo/traffic-by-country` in the playground)

```tsx
import * as React from "react";
import { Text } from "@cleanprompt/sutra-ui/core";
import { formatCompact } from "@cleanprompt/sutra-ui/format";
import { WorldMap, countryName } from "@cleanprompt/sutra-ui/geo";

function TrafficDemo() {
  const [country, setCountry] = React.useState<string | null>("US");
  const value = traffic.find((d) => d.code === country)?.value;
  return (
    <div className="w-full space-y-3">
      <WorldMap
        data={traffic}
        legend
        valueLabel="Visits"
        valueFormatter={(v) => formatCompact(v)}
        selectedCountry={country}
        onCountrySelect={(code) => setCountry(code)}
      />
      <Text size="sm" tone="neutral" aria-live="polite">
        {country ? `${countryName(country)}: ${value !== undefined ? `${value.toLocaleString()} visits` : "no visits"}` : "Click a country to select it."}
      </Text>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): traffic.
