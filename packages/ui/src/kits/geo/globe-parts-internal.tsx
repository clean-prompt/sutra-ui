/* The globe's drawn pieces (private): country paths, arcs, the per-frame marker layer and the control bar. */
import * as React from "react";
import { RiAddLine, RiFocus3Line, RiPauseFill, RiPlayFill, RiSubtractLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { Button } from "../../primitives/button";
import { geoAngularDistance, greatCircleArc, rotationCenter, type GeoPointInput } from "./geo-model";
import { GeoMarkerLayer, type GeoMarker, type GeoMarkerLayerProps } from "./geo-marker-layer";
import type { GlobeEngine } from "./globe-internal";
import type { GeoArc } from "./world-map";
import { GeoArcPaths, type GeoCountryShape } from "./world-map-internal";

/** Markers fade out over the last this-many degrees before the horizon. */
const HORIZON_FADE = 12;

export interface CountryHandlers {
  onHover: (e: React.PointerEvent<SVGGElement>) => void;
  onLeave: () => void;
  onSelect: (e: React.MouseEvent<SVGGElement>) => void;
}

interface GlobeCountriesProps {
  engine: GlobeEngine;
  shapes: readonly GeoCountryShape[];
  fills: readonly string[];
  selectable: boolean;
  handlers: React.RefObject<CountryHandlers>;
}

/** The 177 country paths. Re-renders only when data or size change; the engine rewrites their `d` as the globe turns. */
export const GlobeCountries = React.memo(
  function GlobeCountries({ engine, shapes, fills, selectable, handlers }: GlobeCountriesProps) {
    return (
      <g
        data-slot="globe-countries"
        onPointerMove={(e) => handlers.current.onHover(e)}
        onPointerLeave={() => handlers.current.onLeave()}
        onClick={(e) => handlers.current.onSelect(e)}
        className={cn(selectable && "cursor-pointer")}
      >
        {shapes.map((s, i) => (
          <path
            key={s.key}
            ref={(el) => engine.registerPath(el, s.feature)}
            d={engine.pathOf(s.feature)}
            data-key={s.key}
            data-code={s.code}
            fill={fills[i]}
            className="transition-[fill] duration-200"
          />
        ))}
      </g>
    );
  },
  (a, b) => a.engine === b.engine && a.shapes === b.shapes && a.fills === b.fills && a.selectable === b.selectable && a.handlers === b.handlers
);

export function GlobeArcs({ engine, arcs, animate }: { engine: GlobeEngine; arcs: readonly GeoArc[]; animate: boolean }) {
  const lines = React.useMemo(() => arcs.map((a) => greatCircleArc(a.from, a.to)), [arcs]);
  return (
    <g data-slot="globe-arcs" fill="none" strokeLinecap="round" pointerEvents="none">
      {arcs.map((a, i) => (
        <GeoArcPaths
          key={a.id}
          slot="globe-arc"
          arc={a}
          d={engine.pathOf(lines[i]!)}
          pathRef={(el) => engine.registerPath(el, lines[i]!)}
          animate={!!a.animated && animate}
        />
      ))}
    </g>
  );
}

type GlobeMarkersProps = Omit<GeoMarkerLayerProps, "project" | "markerOpacity"> & { engine: GlobeEngine };

/** The marker layer, re-rendered once per drawn frame with markers on the far side hidden and those near the edge faded. */
export function GlobeMarkers({ engine, width, height, ...props }: GlobeMarkersProps) {
  const version = React.useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  const { project, opacity } = React.useMemo(() => {
    const center = rotationCenter(engine.view.rotation);
    return {
      project: (p: GeoPointInput) => engine.project(p),
      opacity: (m: GeoMarker) => clamp((90 - geoAngularDistance(m.point, center)) / HORIZON_FADE, 0, 1),
    };
    // `version` and the size stand in for the engine's mutable view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, version, width, height]);
  return <GeoMarkerLayer project={project} markerOpacity={opacity} width={width} height={height} {...props} />;
}

/** Play/pause, zoom in, zoom out and reset, bottom-end over the globe. */
export function GlobeControls({
  engine,
  playing,
  onTogglePlaying,
  onReset,
  className,
}: {
  engine: GlobeEngine;
  playing: boolean;
  onTogglePlaying: () => void;
  onReset: () => void;
  className?: string;
}) {
  const limits = React.useSyncExternalStore(
    engine.subscribe,
    () => `${engine.view.zoom <= engine.config.minZoom}|${engine.view.zoom >= engine.config.maxZoom}`,
    () => "false|false"
  );
  const [atMin, atMax] = limits.split("|").map((v) => v === "true");
  const btn = "text-foreground hover:bg-accent";
  return (
    <div
      role="group"
      aria-label="Globe controls"
      data-slot="globe-controls"
      className={cn(
        "absolute right-3 bottom-3 flex items-center gap-0.5 rounded-control border border-border bg-popover/90 p-0.5 text-popover-foreground shadow-md",
        className
      )}
    >
      <Button variant="ghost" size="icon-sm" className={btn} aria-label="Auto-rotate" aria-pressed={playing} title={playing ? "Pause rotation" : "Rotate"} onClick={onTogglePlaying}>
        {playing ? <RiPauseFill /> : <RiPlayFill />}
      </Button>
      <Button variant="ghost" size="icon-sm" className={btn} aria-label="Zoom in" title="Zoom in" disabled={atMax} onClick={() => engine.flyTo({ zoom: engine.view.zoom * 1.5 }, 250)}>
        <RiAddLine />
      </Button>
      <Button variant="ghost" size="icon-sm" className={btn} aria-label="Zoom out" title="Zoom out" disabled={atMin} onClick={() => engine.flyTo({ zoom: engine.view.zoom / 1.5 }, 250)}>
        <RiSubtractLine />
      </Button>
      <Button variant="ghost" size="icon-sm" className={btn} aria-label="Reset view" title="Reset view" onClick={onReset}>
        <RiFocus3Line />
      </Button>
    </div>
  );
}
