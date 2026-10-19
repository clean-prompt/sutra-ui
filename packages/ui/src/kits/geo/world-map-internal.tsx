/* Private pieces shared by the map components: the screen-reader tables, the legend row and the summary label. */
import * as React from "react";
import { cn } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { Skeleton } from "../../primitives/progress";
import { HeatmapLegend } from "../../patterns/heatmap";
import { formatGeoPoint, type GeoColorScale, type GeoPointInput } from "./geo-model";
import type { GeoMarker } from "./geo-marker-layer";

const count = (n: number, word: string, plural?: string) => `${n} ${pluralize(n, word, plural)}`;

/** `"World map: 12 countries with data, 16 markers"` (the parts with zero items are left out). */
export function geoSummary(title: string, counts: { countries: number; markers: number; arcs: number }): string {
  const parts = [
    counts.countries ? `${count(counts.countries, "country", "countries")} with data` : "",
    counts.markers ? count(counts.markers, "marker") : "",
    counts.arcs ? count(counts.arcs, "arc") : "",
  ].filter(Boolean);
  return parts.length ? `${title}: ${parts.join(", ")}` : title;
}

export interface GeoTableCountry {
  code: string;
  name: string;
  valueText: React.ReactNode;
}

export interface GeoTableArc {
  id: string;
  label: string;
  from: GeoPointInput;
  to: GeoPointInput;
}

/** Visually hidden tables: countries with values, then markers, then arcs. */
export function GeoDataTables({
  countries,
  valueLabel,
  markers,
  selectedMarkerId,
  arcs,
}: {
  countries: readonly GeoTableCountry[];
  valueLabel: string;
  markers: readonly GeoMarker[];
  selectedMarkerId: string | null;
  arcs: readonly GeoTableArc[];
}) {
  const details = markers.some((m) => m.description != null && m.description !== "");
  return (
    <>
      {countries.length ? (
        <table className="sr-only" data-slot="geo-table-countries">
          <caption>{`${valueLabel} by country`}</caption>
          <thead>
            <tr>
              <th scope="col">Country</th>
              <th scope="col">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.code}>
                <th scope="row">{c.name}</th>
                <td>{c.valueText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {markers.length ? (
        <table className="sr-only" data-slot="geo-table-markers">
          <caption>Markers</caption>
          <thead>
            <tr>
              <th scope="col">Marker</th>
              <th scope="col">Location</th>
              {details ? <th scope="col">Details</th> : null}
            </tr>
          </thead>
          <tbody>
            {markers.map((m) => (
              <tr key={m.id}>
                <th scope="row">{m.id === selectedMarkerId ? `${m.label} (selected)` : m.label}</th>
                <td>{formatGeoPoint(m.point)}</td>
                {details ? <td>{m.description}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {arcs.length ? (
        <table className="sr-only" data-slot="geo-table-arcs">
          <caption>Arcs</caption>
          <thead>
            <tr>
              <th scope="col">Arc</th>
              <th scope="col">From</th>
              <th scope="col">To</th>
            </tr>
          </thead>
          <tbody>
            {arcs.map((a) => (
              <tr key={a.id}>
                <th scope="row">{a.label}</th>
                <td>{formatGeoPoint(a.from)}</td>
                <td>{formatGeoPoint(a.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

/** Stepped scale legend (shared with heatmaps) plus a "No data" swatch. */
export function GeoScaleLegendRow({
  scale,
  format,
  noDataColor,
  showNoData,
  title,
  className,
}: {
  scale: GeoColorScale;
  format: (value: number) => string;
  noDataColor: string;
  showNoData: boolean;
  title?: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="geo-legend" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground", className)}>
      {title ? <span className="font-medium text-foreground">{title}</span> : null}
      <HeatmapLegend colors={scale.colors} lowLabel={format(scale.min)} highLabel={format(scale.max)} />
      {showNoData ? (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-xs" style={{ backgroundColor: noDataColor }} />
          No data
        </span>
      ) : null}
    </div>
  );
}

/** Placeholder legend shown while the map loads with no data yet. */
export function GeoLegendSkeleton() {
  return (
    <div aria-hidden data-slot="geo-legend-skeleton" className="flex items-center gap-1.5">
      <Skeleton shape="text" className="h-3 w-8" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="size-2.5 rounded-xs" />
      ))}
      <Skeleton shape="text" className="h-3 w-10" />
    </div>
  );
}
