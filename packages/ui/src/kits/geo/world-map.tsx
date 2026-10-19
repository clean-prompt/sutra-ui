import * as React from "react";
import { cn } from "../../lib/cn";
import type { ToneInput } from "../../lib/tone";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePrefersReducedMotion } from "../../hooks/use-media-query";
import { useElementWidth } from "../../hooks/use-resize-observer";
import {
  createProjection,
  greatCircleArc,
  worldBorders,
  worldGraticule,
  worldLand,
  type GeoPointInput,
  type GeoProjectionKind,
  type GeoScaleKind,
} from "./geo-model";
import { GeoMarkerLayer, type GeoMarker, type GeoMarkerClusterOptions, type GeoMarkerLayerProps } from "./geo-marker-layer";
import {
  EMPTY,
  GeoArcPaths,
  GeoCountryTooltip,
  GeoDataTables,
  GeoLegendSkeleton,
  GeoScaleLegendRow,
  defaultGeoValueFormatter,
  geoKeyAt,
  geoPointerXY,
  geoSummary,
  useGeoArcRows,
  useGeoChoropleth,
  useGeoCountrySelection,
  useGeoCountryShapes,
  type GeoHover,
} from "./world-map-internal";

/* ------------------------------------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------------------------------------*/

/** One country's value for the choropleth. */
export interface WorldMapDatum {
  /** ISO 3166-1 alpha-2 code, any case (`"uk"` is accepted for GB). */
  code: string;
  value: number;
  /** Shown instead of the formatted value in the tooltip and the screen-reader table. */
  label?: React.ReactNode;
}

/** A great-circle line between two points (an attack origin to a datacenter, a flight, a replication link). */
export interface GeoArc {
  id: string;
  from: GeoPointInput;
  to: GeoPointInput;
  tone?: ToneInput;
  /** Colour token or any CSS colour; wins over `tone`. */
  color?: string;
  /** Name in the screen-reader table. Defaults to "Arc 1", "Arc 2", … */
  label?: string;
  /** Stroke width in px. Default 1.5. */
  width?: number;
  /** Dashes flow from `from` to `to` (static under reduced motion). */
  animated?: boolean;
}

/** A country as reported to `onCountrySelect`. */
export interface WorldMapCountry {
  code: string;
  name: string;
  value?: number;
}

/** The data, marker, arc and selection props `WorldMap` and `Globe` share. */
export interface GeoMapDataProps {
  /** Accessible name; defaults to a summary ("World map: 12 countries with data, 16 markers"). `aria-label` also works. */
  label?: string;

  /** Choropleth values by country. */
  data?: readonly WorldMapDatum[];
  /** Colour token or any CSS colour for the choropleth. Default `primary`. */
  color?: string;
  /** Bucketing: `quantize` (equal ranges, default) or `quantile` (equal counts). */
  scale?: GeoScaleKind;
  /** Number of colour buckets. Default 5. */
  steps?: number;
  /** Value range for `quantize`. Defaults to the data's min and max. */
  domain?: [number, number];
  valueFormatter?: (value: number) => string;
  /** Name of the value in the tooltip, legend and table. Default "Value". */
  valueLabel?: string;
  /** Show the stepped scale legend under the map. */
  legend?: boolean;
  /** Fill for countries without data. Default `var(--muted)`. */
  noDataColor?: string;
  /** Locale for country names. Default English. */
  locale?: string;

  markers?: readonly GeoMarker[];
  selectedMarkerId?: string | null;
  defaultSelectedMarkerId?: string | null;
  onMarkerSelect?: (id: string | null, marker: GeoMarker | undefined) => void;
  /** Merge nearby markers into count bubbles (`{ radius }` in px, default 36; 48 for compact markers). */
  cluster?: boolean | GeoMarkerClusterOptions;
  onClusterSelect?: GeoMarkerLayerProps["onClusterSelect"];
  /** Diameter range in px for `value`-scaled markers. Default `[8, 28]`. */
  markerSizeRange?: [number, number];
  /** Smaller markers and a wider cluster radius. Default: on when the drawing is narrower than 480 px. */
  compactMarkers?: boolean;

  arcs?: readonly GeoArc[];

  /** Hover tooltips for countries and markers. Default true. */
  tooltip?: boolean;
  /** Highlighted country (alpha-2 code). Clicking a country selects it when this, `defaultSelectedCountry` or `onCountrySelect` is set. */
  selectedCountry?: string | null;
  defaultSelectedCountry?: string | null;
  /** Called with the clicked country, or `null` when the selected one is clicked again. */
  onCountrySelect?: (code: string | null, country: WorldMapCountry | undefined) => void;

  /** Data is on its way: with nothing to show yet, a pulsing silhouette stands in; otherwise the map is marked busy. */
  loading?: boolean;
}

export interface WorldMapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color">, GeoMapDataProps {
  /** Map projection. Default `equalEarth`. */
  projection?: GeoProjectionKind;
  /** Leave Antarctica out and fit the map to the other land. Default true. */
  hideAntarctica?: boolean;
  /** Draw 10° graticule lines. */
  graticule?: boolean;
  /** Draw the outline of the globe. */
  sphere?: boolean;
  /** Height in px. Defaults to the projection's aspect at the measured width. */
  height?: number;
  /** Width used before the container is measured (and in jsdom). Default 640. */
  defaultWidth?: number;
  /** Space around the map in px. Default 4. */
  padding?: number;
}

/* ------------------------------------------------------------------------------------------------
 * WorldMap
 * ----------------------------------------------------------------------------------------------*/

/**
 * Flat world map from bundled outlines (no network): a choropleth with a stepped legend, marker buttons (dots, icons
 * or avatars, optionally clustered), animated great-circle arcs, country tooltips and selection, and screen-reader tables.
 */
export const WorldMap = React.forwardRef<HTMLDivElement, WorldMapProps>(
  (
    {
      projection = "equalEarth",
      hideAntarctica = true,
      graticule = false,
      sphere = false,
      height: heightProp,
      defaultWidth = 640,
      padding = 4,
      label,
      data = EMPTY,
      color = "primary",
      scale = "quantize",
      steps = 5,
      domain,
      valueFormatter = defaultGeoValueFormatter,
      valueLabel = "Value",
      legend = false,
      noDataColor = "var(--muted)",
      locale,
      markers = EMPTY,
      selectedMarkerId,
      defaultSelectedMarkerId = null,
      onMarkerSelect,
      cluster,
      onClusterSelect,
      markerSizeRange,
      compactMarkers,
      arcs = EMPTY,
      tooltip = true,
      selectedCountry: selectedCountryProp,
      defaultSelectedCountry,
      onCountrySelect,
      loading,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const mapRef = React.useRef<HTMLDivElement>(null);
    const measured = Math.round(useElementWidth(mapRef));
    const width = measured > 0 ? measured : defaultWidth;
    const reducedMotion = usePrefersReducedMotion();

    const proj = React.useMemo(
      () => createProjection(projection, { width, height: heightProp, padding, hideAntarctica }),
      [projection, width, heightProp, padding, hideAntarctica]
    );
    const height = proj.height;

    const countries = useGeoCountryShapes(hideAntarctica, locale);
    const shapes = React.useMemo(() => countries.map((c) => ({ ...c, d: proj.path(c.feature) })), [countries, proj]);
    const bordersPath = React.useMemo(() => proj.path(worldBorders()), [proj]);

    const { byCode, colorScale, tableCountries, fillOf } = useGeoChoropleth({ data, scale, steps, color, noDataColor, domain, locale, valueFormatter });
    const valueText = (d: WorldMapDatum | undefined) => (d ? (d.label ?? valueFormatter(d.value)) : undefined);
    const { selectable, selected: selectedCountry, toggle: toggleCountry } = useGeoCountrySelection(
      { selectedCountry: selectedCountryProp, defaultSelectedCountry, onCountrySelect },
      byCode
    );

    const [markerSelection, setMarkerSelection] = useControllableState<string | null>({
      value: selectedMarkerId,
      defaultValue: defaultSelectedMarkerId,
    });

    const [hover, setHover] = React.useState<GeoHover | null>(null);
    const hasContent = byCode.size > 0 || markers.length > 0 || arcs.length > 0;
    const skeleton = !!loading && !hasContent;

    const onPointerMove = (e: React.PointerEvent<SVGGElement>) => {
      const key = geoKeyAt(e.target);
      setHover(key ? { key, ...geoPointerXY(mapRef.current, e) } : null);
    };
    const onCountryClick = (e: React.MouseEvent<SVGGElement>) => toggleCountry(shapes.find((s) => s.key === geoKeyAt(e.target)));

    const hovered = hover && tooltip && !skeleton ? shapes.find((s) => s.key === hover.key) : undefined;
    const selectedShape = selectedCountry ? shapes.find((s) => s.code === selectedCountry) : undefined;

    const tableArcs = useGeoArcRows(arcs);
    const summary = geoSummary("World map", { countries: byCode.size, markers: markers.length, arcs: arcs.length });
    const ariaLabel = props["aria-label"] ?? label ?? summary;

    return (
      <div
        ref={ref}
        role="figure"
        data-slot="world-map"
        aria-busy={loading || undefined}
        className={cn("flex min-w-0 flex-col gap-3", className)}
        style={style}
        {...props}
        aria-label={ariaLabel}
      >
        {skeleton ? <span className="sr-only">Loading…</span> : null}
        <div ref={mapRef} data-slot="world-map-canvas" className="relative w-full select-none" style={{ height }}>
          <svg
            aria-hidden
            focusable="false"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn("absolute inset-0 block overflow-visible", skeleton && "animate-pulse motion-reduce:animate-none")}
          >
            {sphere ? (
              <path data-slot="world-map-sphere" d={proj.path({ type: "Sphere" })} fill="none" stroke="var(--border)" strokeWidth={1} />
            ) : null}
            {graticule ? (
              <path data-slot="world-map-graticule" d={proj.path(worldGraticule())} fill="none" stroke="var(--border)" strokeWidth={0.5} />
            ) : null}
            {skeleton ? (
              <path data-slot="world-map-skeleton" d={proj.path(worldLand())} fill="var(--muted)" />
            ) : (
              <>
                <g
                  data-slot="world-map-countries"
                  onPointerMove={onPointerMove}
                  onPointerDown={onPointerMove}
                  onPointerLeave={() => setHover(null)}
                  onClick={onCountryClick}
                  className={cn(selectable && "cursor-pointer")}
                >
                  {shapes.map((s) => {
                    const datum = s.code ? byCode.get(s.code) : undefined;
                    return (
                      <path
                        key={s.key}
                        d={s.d}
                        data-key={s.key}
                        data-code={s.code}
                        data-value={datum?.value}
                        fill={fillOf(s.code)}
                        className="transition-[fill] duration-200"
                      />
                    );
                  })}
                </g>
                <path data-slot="world-map-borders" d={bordersPath} fill="none" stroke="var(--background)" strokeWidth={0.6} pointerEvents="none" />
                {selectedShape ? (
                  <path data-slot="world-map-selected" d={selectedShape.d} fill="none" stroke="var(--foreground)" strokeWidth={1.5} strokeLinejoin="round" pointerEvents="none" />
                ) : null}
                {hovered && hovered !== selectedShape ? (
                  <path data-slot="world-map-hover" d={hovered.d} fill="none" stroke="var(--foreground)" strokeOpacity={0.6} strokeWidth={1} strokeLinejoin="round" pointerEvents="none" />
                ) : null}
                {arcs.length ? (
                  <g data-slot="world-map-arcs" fill="none" strokeLinecap="round" pointerEvents="none">
                    {arcs.map((a) => (
                      <GeoArcPaths key={a.id} slot="world-map-arc" arc={a} d={proj.path(greatCircleArc(a.from, a.to))} animate={!!a.animated && !reducedMotion} />
                    ))}
                  </g>
                ) : null}
              </>
            )}
          </svg>
          {!skeleton && markers.length ? (
            <GeoMarkerLayer
              markers={markers}
              project={proj.project}
              width={width}
              height={height}
              selectedId={markerSelection}
              onSelectedIdChange={(id, marker) => {
                setMarkerSelection(id);
                onMarkerSelect?.(id, marker);
              }}
              cluster={cluster}
              onClusterSelect={onClusterSelect}
              sizeRange={markerSizeRange}
              compact={compactMarkers}
              tooltip={tooltip}
            />
          ) : null}
          {hovered && hover ? (
            <GeoCountryTooltip
              slot="world-map-tooltip"
              shape={hovered}
              hover={hover}
              width={width}
              height={height}
              byCode={byCode}
              fillOf={fillOf}
              valueLabel={valueLabel}
              valueText={valueText}
            />
          ) : null}
        </div>

        {legend && skeleton ? <GeoLegendSkeleton /> : null}
        {legend && !skeleton && byCode.size ? (
          <GeoScaleLegendRow
            scale={colorScale}
            format={valueFormatter}
            noDataColor={noDataColor}
            showNoData={shapes.some((s) => !s.code || !byCode.has(s.code))}
            title={valueLabel === "Value" ? undefined : valueLabel}
          />
        ) : null}

        {skeleton ? null : (
          <GeoDataTables countries={tableCountries} valueLabel={valueLabel} markers={markers} selectedMarkerId={markerSelection} arcs={tableArcs} />
        )}
      </div>
    );
  }
);
WorldMap.displayName = "WorldMap";

