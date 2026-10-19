/* Private pieces shared by WorldMap and Globe: choropleth and country-selection state, country shapes, arcs, the
 * country tooltip, the screen-reader tables, the legend row and the summary label. */
import * as React from "react";
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { pluralize } from "../../lib/format";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Skeleton } from "../../primitives/progress";
import { HeatmapLegend } from "../../patterns/heatmap";
import { ChartTooltip } from "../../patterns/chart-container";
import {
  countryName,
  formatGeoPoint,
  geoColorScale,
  isAntarctica,
  normalizeCountryCode,
  worldCountries,
  type GeoColorScale,
  type GeoPointInput,
  type WorldCountryFeature,
} from "./geo-model";
import { geoItemColor, type GeoMarker } from "./geo-marker-layer";
import type { GeoArc, GeoMapDataProps, WorldMapDatum } from "./world-map";

export const EMPTY: readonly never[] = [];
const plainFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export const defaultGeoValueFormatter = (v: number) => plainFormat.format(v);

/* ------------------------------------------------------------------------------------------------
 * Countries and choropleth
 * ----------------------------------------------------------------------------------------------*/

export interface GeoCountryShape {
  key: string;
  code?: string;
  name: string;
  feature: WorldCountryFeature;
}

/** Country outlines with display names, optionally without Antarctica. */
export function useGeoCountryShapes(hideAntarctica: boolean, locale: string | undefined): GeoCountryShape[] {
  return React.useMemo(
    () =>
      worldCountries()
        .features.filter((f) => !(hideAntarctica && isAntarctica(f)))
        .map((f) => {
          const code = typeof f.id === "string" ? f.id : undefined;
          return { key: code ?? f.properties.name, code, name: code ? countryName(code, locale) : f.properties.name, feature: f };
        }),
    [hideAntarctica, locale]
  );
}

type ChoroplethOptions = Pick<GeoMapDataProps, "scale" | "steps" | "color" | "domain" | "locale"> & {
  data: readonly WorldMapDatum[];
  noDataColor: string;
  valueFormatter: (value: number) => string;
};

/** Valid data by country code, its colour scale, and the rows for the screen-reader table (largest first). */
export function useGeoChoropleth({ data, scale, steps, color, noDataColor, domain, locale, valueFormatter }: ChoroplethOptions) {
  const byCode = React.useMemo(() => {
    const map = new Map<string, WorldMapDatum>();
    for (const d of data) {
      const code = normalizeCountryCode(d?.code);
      if (code && Number.isFinite(d.value)) map.set(code, d);
    }
    return map;
  }, [data]);
  const colorScale = React.useMemo(
    () => geoColorScale([...byCode.values()].map((d) => d.value), { scale, steps, color, emptyColor: noDataColor, domain }),
    [byCode, scale, steps, color, noDataColor, domain]
  );
  const tableCountries = React.useMemo<GeoTableCountry[]>(
    () =>
      [...byCode.entries()]
        .sort((a, b) => b[1].value - a[1].value)
        .map(([code, d]) => ({ code, name: countryName(code, locale), valueText: d.label ?? valueFormatter(d.value) })),
    [byCode, locale, valueFormatter]
  );
  const fillOf = (code: string | undefined) => colorScale.color(code ? byCode.get(code)?.value : undefined) ?? noDataColor;
  return { byCode, colorScale, tableCountries, fillOf };
}

/** Click-to-select countries (only when the map is selectable: a selection prop or `onCountrySelect` is set). */
export function useGeoCountrySelection(
  { selectedCountry, defaultSelectedCountry, onCountrySelect }: Pick<GeoMapDataProps, "selectedCountry" | "defaultSelectedCountry" | "onCountrySelect">,
  byCode: ReadonlyMap<string, WorldMapDatum>
) {
  const selectable = selectedCountry !== undefined || defaultSelectedCountry !== undefined || !!onCountrySelect;
  const [selected, setSelected] = useControllableState<string | null>({
    value: selectedCountry === undefined ? undefined : (normalizeCountryCode(selectedCountry) ?? null),
    defaultValue: normalizeCountryCode(defaultSelectedCountry) ?? null,
  });
  const toggle = (shape: GeoCountryShape | undefined) => {
    if (!selectable || !shape?.code) return;
    const next = selected === shape.code ? null : shape.code;
    setSelected(next);
    onCountrySelect?.(next, next ? { code: next, name: shape.name, value: byCode.get(next)?.value } : undefined);
  };
  return { selectable, selected, toggle };
}

/** The `data-key` of the country path under an event target. */
export const geoKeyAt = (target: EventTarget | null) => (target instanceof Element ? target.getAttribute("data-key") : null);

/** Pointer position relative to an element, never NaN. */
export function geoPointerXY(el: Element | null, e: { clientX: number; clientY: number }) {
  const rect = el?.getBoundingClientRect();
  const x = rect ? e.clientX - rect.left : 0;
  const y = rect ? e.clientY - rect.top : 0;
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

export interface GeoHover {
  key: string;
  x: number;
  y: number;
}

/** Country name and value readout that follows the pointer. */
export function GeoCountryTooltip({
  shape,
  hover,
  width,
  height,
  byCode,
  fillOf,
  valueLabel,
  valueText,
  slot,
}: {
  shape: GeoCountryShape;
  hover: GeoHover;
  width: number;
  height: number;
  byCode: ReadonlyMap<string, WorldMapDatum>;
  fillOf: (code: string | undefined) => string;
  valueLabel: string;
  valueText: (d: WorldMapDatum | undefined) => React.ReactNode;
  slot: string;
}) {
  return (
    <ChartTooltip
      aria-hidden
      data-slot={slot}
      label={shape.name}
      items={
        byCode.size && shape.code
          ? [{ key: shape.key, label: valueLabel, color: fillOf(shape.code), value: valueText(byCode.get(shape.code)) ?? "No data" }]
          : []
      }
      style={{
        left: clamp(hover.x + 14, 0, Math.max(0, width - 176)),
        top: hover.y + 70 > height ? Math.max(0, hover.y - 64) : hover.y + 16,
      }}
    />
  );
}

/* ------------------------------------------------------------------------------------------------
 * Arcs
 * ----------------------------------------------------------------------------------------------*/

/**
 * One arc: a solid line, or a faint line plus flowing dashes when `animated`. `d` is the path for flat maps; the
 * globe passes `pathRef` instead and writes `d` itself as it turns.
 */
export function GeoArcPaths({
  arc,
  d,
  animate,
  pathRef,
  slot,
}: {
  arc: GeoArc;
  d?: string;
  animate: boolean;
  pathRef?: (el: SVGPathElement | null) => void | (() => void);
  slot: string;
}) {
  const stroke = geoItemColor(arc);
  const w = Number.isFinite(arc.width) && arc.width! > 0 ? arc.width! : 1.5;
  const dash = Math.max(4, w * 3);
  const gap = Math.max(8, w * 6);
  return (
    <g data-slot={slot} data-id={arc.id} data-animated={animate || undefined}>
      <path ref={pathRef} d={d} stroke={stroke} strokeWidth={w} strokeOpacity={arc.animated ? 0.35 : 0.85} />
      {arc.animated ? (
        <path ref={pathRef} d={d} stroke={stroke} strokeWidth={w} strokeDasharray={`${dash} ${gap}`}>
          {animate ? <animate attributeName="stroke-dashoffset" from={dash + gap} to={0} dur="1s" repeatCount="indefinite" /> : null}
        </path>
      ) : null}
    </g>
  );
}

/** Rows for the arcs table ("Arc 1", "Arc 2", … when unlabeled). */
export function useGeoArcRows(arcs: readonly GeoArc[]): GeoTableArc[] {
  return React.useMemo(() => arcs.map((a, i) => ({ id: a.id, label: a.label ?? `Arc ${i + 1}`, from: a.from, to: a.to })), [arcs]);
}

/* ------------------------------------------------------------------------------------------------
 * Summary and tables
 * ----------------------------------------------------------------------------------------------*/

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

/**
 * Visually hidden tables: countries with values, then markers, then arcs. With `onMarkerActivate` each marker name is
 * a toggle button (the globe uses it so markers on the far side stay reachable); `onMarkerFocus` lets the globe turn
 * the focused marker into view so sighted keyboard users can see where focus is.
 */
export function GeoDataTables({
  countries,
  valueLabel,
  markers,
  selectedMarkerId,
  arcs,
  onMarkerActivate,
  onMarkerFocus,
}: {
  countries: readonly GeoTableCountry[];
  valueLabel: string;
  markers: readonly GeoMarker[];
  selectedMarkerId: string | null;
  arcs: readonly GeoTableArc[];
  onMarkerActivate?: (marker: GeoMarker) => void;
  onMarkerFocus?: (marker: GeoMarker | null) => void;
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
                <th scope="row">
                  {onMarkerActivate ? (
                    <button
                      type="button"
                      data-slot="geo-table-marker-button"
                      aria-pressed={m.id === selectedMarkerId}
                      className={focusRing}
                      onClick={() => onMarkerActivate(m)}
                      onFocus={() => onMarkerFocus?.(m)}
                      onBlur={() => onMarkerFocus?.(null)}
                    >
                      {m.label}
                    </button>
                  ) : m.id === selectedMarkerId ? (
                    `${m.label} (selected)`
                  ) : (
                    m.label
                  )}
                </th>
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
