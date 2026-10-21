import * as React from "react";
import { geoCentroid } from "d3-geo";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useIsoLayoutEffect, useLatestRef } from "../../hooks/use-iso-layout-effect";
import { usePrefersReducedMotion } from "../../hooks/use-media-query";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { useElementWidth } from "../../hooks/use-resize-observer";
import { useSafeId } from "../../hooks/use-safe-id";
import {
  createProjection,
  normalizeGeoRotation,
  rotationToCenter,
  toGeoPoint,
  worldBorders,
  worldGraticule,
  worldLand,
  type GeoPointInput,
  type GeoRotation,
  type GeoRotationInput,
} from "./geo-model";
import type { GeoMarker, GeoMarkerLayerProps } from "./geo-marker-layer";
import { GlobeEngine, type GlobeView } from "./globe-internal";
import { GlobeArcs, GlobeControls, GlobeCountries, GlobeMarkers, type CountryHandlers } from "./globe-parts-internal";
import { useGlobeGestures } from "./globe-gestures-internal";
import type { GeoMapDataProps, WorldMapDatum } from "./world-map";
import {
  EMPTY,
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

export interface GlobeFlyToOptions {
  /** Zoom to end at. Defaults to the current zoom. */
  zoom?: number;
  /** Animation length in ms. Default 800 (instant under reduced motion). */
  duration?: number;
}

/** Imperative controls for a `Globe`, through its `apiRef`. */
export interface GlobeApi {
  /** Turn the globe until `point` is in the middle (animated unless reduced motion is on). */
  flyTo(point: GeoPointInput, options?: GlobeFlyToOptions): void;
  /** Animate back to the starting rotation and zoom. */
  reset(): void;
  zoomIn(): void;
  zoomOut(): void;
  /** The view right now (also mid-animation). */
  getView(): { rotation: GeoRotation; zoom: number };
}

export interface GlobeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color">, GeoMapDataProps {
  /**
   * Rotation `[λ, φ, γ]` in degrees (`rotationToCenter(point)` builds one). The globe jumps to it whenever it changes;
   * drags and animations move the globe on their own and report the resting rotation to `onRotationChange`.
   */
  rotation?: GeoRotationInput;
  /** Starting rotation. Defaults to centring `focus`, else the selected marker, else Europe and Africa. */
  defaultRotation?: GeoRotationInput;
  /**
   * Called when the globe comes to rest after a drag, momentum, fly-to, zoom or key press, and when auto-rotation
   * pauses; not on every frame, so a parent that stores the value doesn't re-render 60 times a second.
   */
  onRotationChange?: (rotation: GeoRotation) => void;
  /** Zoom as a scale multiplier (1 = the whole globe fits). Same jump-and-report contract as `rotation`. */
  zoom?: number;
  /** Initial zoom multiplier when `zoom` is not controlled. Default 1. */
  defaultZoom?: number;
  /** Called with the resting zoom (see `onRotationChange`). */
  onZoomChange?: (zoom: number) => void;
  /** Default 1. */
  minZoom?: number;
  /** Default 6. */
  maxZoom?: number;

  /**
   * Spin slowly: `true` for 8°/s or a speed in degrees per second (negative turns westward). Pauses while the user
   * drags, zooms, hovers or focuses a marker, or has one selected, and resumes after `autoRotateDelay`. Starts off
   * under reduced motion (the play control can still start it) and stops while off-screen or in a hidden tab.
   */
  autoRotate?: boolean | number;
  /** Called when the play control starts or stops auto-rotation. */
  onAutoRotateChange?: (playing: boolean) => void;
  /** Ms of quiet before auto-rotation resumes. Default 2500. */
  autoRotateDelay?: number;
  /** A point to turn to: the globe flies there whenever this changes (and starts there). */
  focus?: GeoPointInput | null;
  /** Fly to a marker when it is selected. Default true. */
  flyToSelection?: boolean;
  /** Imperative handle (`flyTo`, `reset`, `zoomIn`, `zoomOut`, `getView`); `ref` stays on the root element. */
  apiRef?: React.Ref<GlobeApi>;

  /** Show the play/pause, zoom and reset buttons. Default false. */
  controls?: boolean;
  /** Classes for the control bar (bottom-end by default). */
  controlsClassName?: string;
  /** Draw 10° graticule lines. */
  graticule?: boolean;
  /** Light and edge shading plus a faint atmosphere glow. Default true. */
  shading?: boolean;
  /** Zoom with the mouse wheel or trackpad pinch. Default true. */
  wheelZoom?: boolean;
  /** Height in px. Default: the measured width (a square). */
  height?: number;
  /** Width used before the container is measured (and in jsdom). Default 480. */
  defaultWidth?: number;
  /** Space between the globe and the edge in px. Default 8. */
  padding?: number;
}

const DEFAULT_ROTATION: GeoRotation = [-10, -20, 0];
const DEFAULT_SPEED = 8;
const OCEAN = "color-mix(in oklab, var(--muted) 55%, var(--background))";
const LAND = "color-mix(in oklab, var(--muted-foreground) 32%, var(--muted))";

const sameRotation = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) < 1e-6);

/* ------------------------------------------------------------------------------------------------
 * Globe
 * ----------------------------------------------------------------------------------------------*/

/**
 * Interactive 3D globe (orthographic, bundled outlines): drag with momentum, wheel/pinch/keyboard zoom, auto-rotation,
 * fly-to, and the same choropleth, markers, clustering, arcs, country selection and screen-reader tables as WorldMap.
 */
export const Globe = React.forwardRef<HTMLDivElement, GlobeProps>(
  (
    {
      rotation: rotationProp,
      defaultRotation,
      onRotationChange,
      zoom: zoomProp,
      defaultZoom = 1,
      onZoomChange,
      minZoom = 1,
      maxZoom = 6,
      autoRotate = false,
      onAutoRotateChange,
      autoRotateDelay = 2500,
      focus,
      flyToSelection = true,
      apiRef,
      controls = false,
      controlsClassName,
      graticule = false,
      shading = true,
      wheelZoom = true,
      height: heightProp,
      defaultWidth = 480,
      padding = 8,
      label,
      data = EMPTY,
      color = "primary",
      scale = "quantize",
      steps = 5,
      domain,
      valueFormatter = defaultGeoValueFormatter,
      valueLabel = "Value",
      legend = false,
      noDataColor = LAND,
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
      dataTable = true,
      className,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLDivElement>(null);
    const mergedRef = useMergedRefs(ref, rootRef);
    const measured = Math.round(useElementWidth(canvasRef));
    const width = measured > 0 ? measured : defaultWidth;
    const height = Number.isFinite(heightProp) && heightProp! > 0 ? heightProp! : width;
    const reducedMotion = usePrefersReducedMotion();
    const hintId = useSafeId("globe-hint");
    const ids = useSafeId("globe");

    const [markerSelection, setMarkerSelection] = useControllableState<string | null>({
      value: selectedMarkerId,
      defaultValue: defaultSelectedMarkerId,
    });
    const selectedMarker = markerSelection ? markers.find((m) => m.id === markerSelection) : undefined;

    /* ---- engine ---- */

    const initial = React.useRef<GlobeView | null>(null);
    initial.current ??= {
      rotation: normalizeGeoRotation(
        rotationProp ?? defaultRotation ?? rotationToCenter(focus) ?? rotationToCenter(selectedMarker?.point) ?? DEFAULT_ROTATION,
        90
      ),
      zoom: clamp(zoomProp ?? defaultZoom, minZoom, maxZoom),
    };
    const [engine] = React.useState(() => new GlobeEngine(initial.current!));
    const reported = React.useRef<{ rotation: GeoRotation; zoom: number }>(initial.current);
    const callbacks = React.useRef({ onRotationChange, onZoomChange, onAutoRotateChange });
    callbacks.current = { onRotationChange, onZoomChange, onAutoRotateChange };

    const [playing, setPlayingState] = React.useState(() => !!autoRotate && !reducedMotion);
    React.useEffect(() => setPlayingState(!!autoRotate && !reducedMotion), [autoRotate, reducedMotion]);
    const speed = typeof autoRotate === "number" && Number.isFinite(autoRotate) ? autoRotate : DEFAULT_SPEED;

    useIsoLayoutEffect(() => {
      engine.configure({
        minZoom,
        maxZoom: Math.max(minZoom, maxZoom),
        autoRotateSpeed: speed,
        idleDelay: Math.max(0, autoRotateDelay),
        reducedMotion,
        onSettle: (view) => {
          const prev = reported.current;
          reported.current = { rotation: [...view.rotation] as GeoRotation, zoom: view.zoom };
          if (!sameRotation(prev.rotation, view.rotation)) callbacks.current.onRotationChange?.(reported.current.rotation);
          if (prev.zoom !== view.zoom) callbacks.current.onZoomChange?.(view.zoom);
        },
      });
    });

    // The engine is mutable, so the fitted projection is handed over in a layout effect (never while rendering); it runs before
    // `mount()` below, which draws, and a size change redraws on the next frame.
    useIsoLayoutEffect(() => {
      engine.setProjection(createProjection("orthographic", { width, height, padding }));
    }, [engine, width, height, padding]);

    useIsoLayoutEffect(() => {
      engine.mount();
      return () => engine.unmount();
    }, [engine]);
    React.useEffect(() => engine.setPlaying(playing), [engine, playing]);

    // Controlled rotation and zoom: jump when the prop changes to something other than what the globe last reported.
    const rotationKey = rotationProp ? normalizeGeoRotation(rotationProp, 90).join(",") : null;
    React.useEffect(() => {
      if (!rotationProp) return;
      const next = normalizeGeoRotation(rotationProp, 90);
      if (sameRotation(next, normalizeGeoRotation(reported.current.rotation, 90))) return;
      reported.current = { ...reported.current, rotation: next };
      engine.setView({ rotation: next }, false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine, rotationKey]);
    React.useEffect(() => {
      if (zoomProp === undefined || !Number.isFinite(zoomProp) || zoomProp === reported.current.zoom) return;
      reported.current = { ...reported.current, zoom: engine.clampZoom(zoomProp) };
      engine.setView({ zoom: zoomProp }, false);
    }, [engine, zoomProp]);

    const flyToPoint = React.useCallback(
      (point: GeoPointInput | null | undefined, options: GlobeFlyToOptions = {}) => {
        const [, , gamma] = engine.view.rotation;
        const rotation = rotationToCenter(point, gamma);
        if (rotation) engine.flyTo({ rotation, zoom: options.zoom }, options.duration);
      },
      [engine]
    );

    React.useImperativeHandle(
      apiRef,
      () => ({
        flyTo: flyToPoint,
        reset: () => engine.flyTo({ ...initial.current! }),
        zoomIn: () => engine.flyTo({ zoom: engine.view.zoom * 1.5 }, 250),
        zoomOut: () => engine.flyTo({ zoom: engine.view.zoom / 1.5 }, 250),
        getView: () => ({ rotation: [...engine.view.rotation] as GeoRotation, zoom: engine.view.zoom }),
      }),
      [engine, flyToPoint]
    );

    // Fly when `focus` changes (it was already the starting point on mount).
    const focusPoint = toGeoPoint(focus);
    const focusKey = focusPoint ? `${focusPoint.lat},${focusPoint.lng}` : "";
    const lastFocus = React.useRef(focusKey);
    React.useEffect(() => {
      if (focusKey === lastFocus.current) return;
      lastFocus.current = focusKey;
      if (focusPoint) flyToPoint(focusPoint);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusKey, flyToPoint]);

    // Fly to a newly selected marker, and hold auto-rotation while one is selected.
    const lastSelection = React.useRef(markerSelection);
    React.useEffect(() => {
      if (markerSelection === lastSelection.current) return;
      lastSelection.current = markerSelection;
      if (flyToSelection && selectedMarker) flyToPoint(selectedMarker.point);
    }, [markerSelection, selectedMarker, flyToSelection, flyToPoint]);
    React.useEffect(() => {
      if (!markerSelection) return;
      engine.hold("selected");
      return () => engine.release("selected");
    }, [engine, markerSelection]);

    // Pause off-screen and in hidden tabs.
    React.useEffect(() => {
      const el = rootRef.current;
      if (!el || typeof IntersectionObserver === "undefined") return;
      let io: IntersectionObserver;
      try {
        io = new IntersectionObserver(([entry]) => (entry?.isIntersecting ? engine.release("offscreen") : engine.hold("offscreen")));
        io.observe(el);
      } catch {
        return;
      }
      return () => {
        io.disconnect();
        engine.release("offscreen");
      };
    }, [engine]);
    React.useEffect(() => {
      if (typeof document === "undefined") return;
      const sync = () => (document.hidden ? engine.hold("hidden") : engine.release("hidden"));
      sync();
      document.addEventListener("visibilitychange", sync);
      return () => {
        document.removeEventListener("visibilitychange", sync);
        engine.release("hidden");
      };
    }, [engine]);

    const togglePlaying = () => {
      const next = !playing;
      setPlayingState(next);
      callbacks.current.onAutoRotateChange?.(next);
    };

    /* ---- data ---- */

    const countries = useGeoCountryShapes(false, locale);
    const { byCode, colorScale, tableCountries, fillOf } = useGeoChoropleth({ data, scale, steps, color, noDataColor, domain, locale, valueFormatter });
    const valueText = (d: WorldMapDatum | undefined) => (d ? (d.label ?? valueFormatter(d.value)) : undefined);
    const fills = React.useMemo(() => countries.map((c) => fillOf(c.code)), [countries, colorScale, byCode, noDataColor]); // eslint-disable-line react-hooks/exhaustive-deps
    const { selectable, selected: selectedCountry, toggle: toggleCountry } = useGeoCountrySelection(
      { selectedCountry: selectedCountryProp, defaultSelectedCountry, onCountrySelect },
      byCode
    );
    const [hover, setHover] = React.useState<GeoHover | null>(null);
    const [activeMarker, setActiveMarker] = React.useState<string | null>(null);
    const hasContent = byCode.size > 0 || markers.length > 0 || arcs.length > 0;
    const skeleton = !!loading && !hasContent;
    const tableArcs = useGeoArcRows(arcs);

    const gestures = useGlobeGestures({
      engine,
      canvasRef,
      enabled: !skeleton,
      wheelZoom,
      onDragStart: () => setHover(null),
      onReset: () => engine.flyTo({ ...initial.current! }),
    });

    const selectMarker = (id: string | null, marker: GeoMarker | undefined) => {
      setMarkerSelection(id);
      onMarkerSelect?.(id, marker);
    };
    const onCluster: GeoMarkerLayerProps["onClusterSelect"] = (members, group) => {
      onClusterSelect?.(members, group);
      const [lng, lat] = geoCentroid({ type: "MultiPoint", coordinates: members.map((m) => toLngLatTuple(m.point)) });
      flyToPoint({ lat, lng }, { zoom: engine.view.zoom * 2 });
    };

    const countryHandlers = useLatestRef<CountryHandlers>({
      onHover: (e) => {
        if (gestures.dragging()) return;
        const key = geoKeyAt(e.target);
        setHover(key ? { key, ...geoPointerXY(canvasRef.current, e) } : null);
      },
      onLeave: () => setHover(null),
      onSelect: (e) => toggleCountry(countries.find((c) => c.key === geoKeyAt(e.target))),
    });

    const hovered = hover && tooltip && !skeleton ? countries.find((s) => s.key === hover.key) : undefined;
    const selectedShape = selectedCountry ? countries.find((s) => s.code === selectedCountry) : undefined;
    const summary = geoSummary("Globe", { countries: byCode.size, markers: markers.length, arcs: arcs.length });
    const ariaLabel = props["aria-label"] ?? label ?? summary;
    const path = (geo: Parameters<GlobeEngine["pathOf"]>[0]) => ({
      ref: (el: SVGPathElement | null) => engine.registerPath(el, geo),
      d: engine.pathOf(geo),
    });
    const circle = (factor: number) => ({
      ref: (el: SVGCircleElement | null) => engine.registerCircle(el, factor),
      cx: width / 2,
      cy: height / 2,
      r: Math.round(engine.radius() * factor * 10) / 10,
    });

    return (
      <div
        ref={mergedRef}
        role="group"
        aria-roledescription="globe"
        data-slot="globe"
        tabIndex={0}
        aria-busy={loading || undefined}
        aria-describedby={hintId}
        className={cn("group/globe flex min-w-0 flex-col gap-3 outline-none", className)}
        onKeyDown={gestures.onKeyDown}
        dir="ltr"
        {...props}
        aria-label={ariaLabel}
      >
        <span id={hintId} className="sr-only">
          Drag or use the arrow keys to turn the globe. Plus and minus zoom, Home resets.
        </span>
        {skeleton ? <span className="sr-only">Loading…</span> : null}
        <div
          ref={canvasRef}
          data-slot="globe-canvas"
          className={cn(
            "relative w-full touch-none select-none overflow-hidden rounded-box",
            "group-focus-visible/globe:ring-2 group-focus-visible/globe:ring-ring group-focus-visible/globe:ring-offset-2 group-focus-visible/globe:ring-offset-background",
            !skeleton && "cursor-grab data-[dragging]:cursor-grabbing"
          )}
          style={{ height }}
          {...gestures.canvasHandlers}
        >
          <svg
            aria-hidden
            focusable="false"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn("absolute inset-0 block", skeleton && "animate-pulse motion-reduce:animate-none")}
          >
            {shading && !skeleton ? (
              <defs>
                <radialGradient id={`${ids}-glow`}>
                  <stop offset="86%" style={{ stopColor: "var(--primary)", stopOpacity: 0.18 }} />
                  <stop offset="100%" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
                </radialGradient>
                <radialGradient id={`${ids}-shade`} cx="38%" cy="32%" r="72%">
                  <stop offset="0%" style={{ stopColor: "white", stopOpacity: 0.12 }} />
                  <stop offset="55%" style={{ stopColor: "white", stopOpacity: 0 }} />
                  <stop offset="100%" style={{ stopColor: "black", stopOpacity: 0.28 }} />
                </radialGradient>
              </defs>
            ) : null}
            {shading && !skeleton ? <circle data-slot="globe-atmosphere" {...circle(1.08)} fill={`url(#${ids}-glow)`} /> : null}
            <circle data-slot="globe-sphere" {...circle(1)} fill={skeleton ? "var(--muted)" : OCEAN} />
            {skeleton ? (
              <path data-slot="globe-skeleton" {...path(worldLand())} fill="var(--border)" />
            ) : (
              <>
                {graticule ? <path data-slot="globe-graticule" {...path(worldGraticule())} fill="none" stroke="var(--border-strong)" strokeOpacity={0.5} strokeWidth={0.5} /> : null}
                <GlobeCountries engine={engine} shapes={countries} fills={fills} selectable={selectable} handlers={countryHandlers} />
                <path data-slot="globe-borders" {...path(worldBorders())} fill="none" stroke="var(--background)" strokeOpacity={0.85} strokeWidth={0.6} pointerEvents="none" />
                {selectedShape ? (
                  <path key={selectedShape.key} data-slot="globe-selected" {...path(selectedShape.feature)} fill="none" stroke="var(--foreground)" strokeWidth={1.5} strokeLinejoin="round" pointerEvents="none" />
                ) : null}
                {hovered && hovered !== selectedShape ? (
                  <path key={hovered.key} data-slot="globe-hover" {...path(hovered.feature)} fill="none" stroke="var(--foreground)" strokeOpacity={0.6} strokeWidth={1} strokeLinejoin="round" pointerEvents="none" />
                ) : null}
                {arcs.length ? <GlobeArcs engine={engine} arcs={arcs} animate={!reducedMotion} /> : null}
                {shading ? <circle data-slot="globe-shade" {...circle(1)} fill={`url(#${ids}-shade)`} pointerEvents="none" /> : null}
                <circle data-slot="globe-rim" {...circle(1)} fill="none" stroke="var(--border-strong)" strokeWidth={1} pointerEvents="none" />
              </>
            )}
          </svg>
          {!skeleton && markers.length ? (
            <GlobeMarkers
              engine={engine}
              markers={markers}
              width={width}
              height={height}
              selectedId={markerSelection}
              onSelectedIdChange={selectMarker}
              cluster={cluster}
              onClusterSelect={onCluster}
              sizeRange={markerSizeRange}
              compact={compactMarkers}
              tooltip={tooltip}
              activeId={activeMarker}
            />
          ) : null}
          {hovered && hover ? (
            <GeoCountryTooltip
              slot="globe-tooltip"
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
          {controls && !skeleton ? (
            <GlobeControls
              engine={engine}
              playing={playing}
              onTogglePlaying={togglePlaying}
              onReset={() => engine.flyTo({ ...initial.current! })}
              className={controlsClassName}
            />
          ) : null}
        </div>

        {legend && skeleton ? <GeoLegendSkeleton /> : null}
        {legend && !skeleton && byCode.size ? (
          <GeoScaleLegendRow
            scale={colorScale}
            format={valueFormatter}
            noDataColor={noDataColor}
            showNoData={countries.some((s) => !s.code || !byCode.has(s.code))}
            title={valueLabel === "Value" ? undefined : valueLabel}
          />
        ) : null}

        {skeleton || !dataTable ? null : (
          <GeoDataTables
            countries={tableCountries}
            valueLabel={valueLabel}
            markers={markers}
            selectedMarkerId={markerSelection}
            arcs={tableArcs}
            onMarkerActivate={(m) => {
              const next = markerSelection === m.id ? null : m.id;
              selectMarker(next, next ? m : undefined);
              if (next && !flyToSelection) flyToPoint(m.point);
            }}
            onMarkerFocus={(m) => {
              setActiveMarker(m?.id ?? null);
              if (m) {
                engine.hold("focus");
                flyToPoint(m.point);
              } else engine.release("focus");
            }}
          />
        )}
      </div>
    );
  }
);
Globe.displayName = "Globe";

const toLngLatTuple = (p: GeoPointInput): [number, number] => {
  const g = toGeoPoint(p);
  return g ? [g.lng, g.lat] : [0, 0];
};
