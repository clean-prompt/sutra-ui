import * as React from "react";
import { Avatar, Badge, Button, Card, Label, SegmentedControl, Switch, Text, formatCompact } from "@sutra/ui";
import { WorldMap, countryName, formatGeoPoint, type GeoProjectionKind } from "@sutra/ui/geo";
import { Demo, PageIntro } from "../components/demo";
import { SOURCES, attackArcs, attackMarkers, traffic, visitorMarker, visitors } from "./geo-data";

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

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

function VisitorsDemo() {
  const [selected, setSelected] = React.useState<string | null>("v5");
  const [clusterInfo, setClusterInfo] = React.useState<string | null>(null);
  const markers = React.useMemo(() => visitors.map(visitorMarker), []);
  const visitor = visitors.find((v) => v.id === selected);
  return (
    <div className="grid w-full gap-4 lg:grid-cols-[1fr_15rem]">
      <WorldMap
        markers={markers}
        cluster
        selectedMarkerId={selected}
        onMarkerSelect={(id) => {
          setSelected(id);
          setClusterInfo(null);
        }}
        onClusterSelect={(members) => setClusterInfo(members.map((m) => visitors.find((v) => v.id === m.id)?.name).join(", "))}
        label={`Live visitors: ${visitors.length} people online`}
      />
      <Card className="space-y-2 p-4 text-sm" aria-live="polite">
        <div className="flex items-center gap-2">
          <Badge color="success">{visitors.length} online</Badge>
        </div>
        {visitor ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Avatar size="sm" name={visitor.name} />
              <div className="min-w-0">
                <div className="truncate font-medium">{visitor.name}</div>
                <div className="text-xs text-muted-foreground">{visitor.city}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Via {SOURCES[visitor.source].label} · viewing <span className="font-mono">{visitor.page}</span>
            </div>
            <div className="text-xs text-muted-foreground">{formatGeoPoint(visitor)}</div>
          </div>
        ) : (
          <Text size="sm" tone="neutral">
            Select a visitor on the map.
          </Text>
        )}
        {clusterInfo ? <div className="border-t border-border pt-2 text-xs text-muted-foreground">Cluster: {clusterInfo}</div> : null}
      </Card>
    </div>
  );
}

function AttacksDemo() {
  return (
    <WorldMap
      className="w-full"
      arcs={attackArcs}
      markers={attackMarkers}
      markerSizeRange={[8, 18]}
      label="Attack origins: 7 sources targeting the Frankfurt datacenter"
    />
  );
}

const projections: { value: GeoProjectionKind; label: string }[] = [
  { value: "equalEarth", label: "Equal Earth" },
  { value: "naturalEarth", label: "Natural Earth" },
  { value: "mercator", label: "Mercator" },
  { value: "equirectangular", label: "Equirectangular" },
];

function ProjectionDemo() {
  const [projection, setProjection] = React.useState<GeoProjectionKind>("equalEarth");
  const [graticule, setGraticule] = React.useState(true);
  const [sphere, setSphere] = React.useState(true);
  const [hideAntarctica, setHideAntarctica] = React.useState(false);
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SegmentedControl size="sm" value={projection} onValueChange={(v) => setProjection(v as GeoProjectionKind)} options={projections} />
        {(
          [
            ["graticule", "Graticule", graticule, setGraticule],
            ["sphere", "Outline", sphere, setSphere],
            ["antarctica", "Hide Antarctica", hideAntarctica, setHideAntarctica],
          ] as const
        ).map(([id, text, checked, set]) => (
          <div key={id} className="flex items-center gap-2">
            <Switch id={`geo-${id}`} size="sm" checked={checked} onCheckedChange={set} />
            <Label htmlFor={`geo-${id}`}>{text}</Label>
          </div>
        ))}
      </div>
      <WorldMap
        projection={projection}
        graticule={graticule}
        sphere={sphere}
        hideAntarctica={hideAntarctica}
        data={traffic}
        color="info"
        scale="quantile"
        markers={visitors.slice(0, 6).map((v) => ({ id: v.id, point: [v.lng, v.lat], label: `${v.city}`, tone: "warning" }))}
        arcs={[{ id: "pacific", from: { lat: 35.68, lng: 139.69 }, to: { lat: 37.77, lng: -122.42 }, label: "Tokyo to San Francisco", color: "warning" }]}
      />
    </div>
  );
}

function LoadingDemo() {
  const [loaded, setLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    if (!refreshing) return;
    const t = setTimeout(() => setRefreshing(false), 1500);
    return () => clearTimeout(t);
  }, [refreshing]);
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setLoaded((v) => !v)}>
          {loaded ? "Clear data" : "Load data"}
        </Button>
        <Button size="sm" variant="outline" disabled={!loaded} loading={refreshing} onClick={() => setRefreshing(true)}>
          Refresh
        </Button>
      </div>
      <WorldMap loading={!loaded || refreshing} data={loaded ? traffic : []} legend valueLabel="Visits" valueFormatter={(v) => formatCompact(v)} />
    </div>
  );
}

function NarrowDemo() {
  const markers = React.useMemo(() => visitors.map(visitorMarker), []);
  return (
    <div className="mx-auto w-full max-w-[358px] rounded-box border border-border p-2">
      <WorldMap data={traffic} markers={markers} cluster legend valueLabel="Visits" valueFormatter={(v) => formatCompact(v)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function GeoPage() {
  return (
    <PageIntro
      eyebrow="Geo"
      title="World Map"
      description="Flat world maps drawn from bundled Natural Earth outlines (no tiles, no network): choropleths, marker buttons with avatars and clustering, great-circle arcs, and a screen-reader table for every map."
    >
      <Demo id="traffic-by-country" title="Traffic by country" description="Choropleth with a stepped legend. Hover a country for its value; click to select it." align="start">
        <TrafficDemo />
      </Demo>
      <Demo
        id="live-visitors"
        title="Live visitors"
        description="Avatar markers with a source badge, clustered when they overlap. The selected visitor stays out of clusters."
        align="start"
      >
        <VisitorsDemo />
      </Demo>
      <Demo id="attack-origins" title="Attack origins" description="Animated great-circle arcs from blocked sources to a datacenter; marker size follows the request count." align="start">
        <AttacksDemo />
      </Demo>
      <Demo id="projections" title="Projections" description="Equal Earth (default), Natural Earth, Mercator (cut at ±85°) and equirectangular, with graticule and outline." align="start">
        <ProjectionDemo />
      </Demo>
      <Demo id="loading" title="Loading" description="A pulsing land silhouette until data arrives; a refresh keeps the data on screen." align="start">
        <LoadingDemo />
      </Demo>
      <Demo id="narrow" title="Narrow width" description="The map fills its width and takes its height from the projection." align="start">
        <NarrowDemo />
      </Demo>
    </PageIntro>
  );
}
