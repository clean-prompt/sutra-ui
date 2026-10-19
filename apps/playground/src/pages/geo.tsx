import * as React from "react";
import { Avatar, Badge, Button, Card, Label, SegmentedControl, Switch, Text, formatCompact } from "@sutra/ui";
import {
  WorldMap,
  countryName,
  formatGeoPoint,
  type GeoArc,
  type GeoMarker,
  type GeoProjectionKind,
  type WorldMapDatum,
} from "@sutra/ui/geo";
import { RiGithubFill, RiGoogleFill, RiMailFill, RiServerLine, RiTwitterXFill } from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const traffic: WorldMapDatum[] = [
  { code: "US", value: 48210 },
  { code: "IN", value: 31870 },
  { code: "GB", value: 18440 },
  { code: "DE", value: 15320 },
  { code: "BR", value: 12900 },
  { code: "CA", value: 9800 },
  { code: "FR", value: 9120 },
  { code: "JP", value: 8740 },
  { code: "KR", value: 7310 },
  { code: "AU", value: 6020 },
  { code: "MX", value: 5480 },
  { code: "ID", value: 4930 },
  { code: "ES", value: 4410 },
  { code: "NG", value: 3260 },
  { code: "ZA", value: 2780 },
  { code: "SE", value: 2140 },
  { code: "AR", value: 1990 },
  { code: "EG", value: 1530 },
  { code: "PL", value: 1480 },
  { code: "SG", value: 1320 },
  { code: "TR", value: 1210 },
  { code: "VN", value: 980 },
];

type Source = "google" | "x" | "github" | "email";

const SOURCES: Record<Source, { label: string; icon: React.ReactNode; color: string }> = {
  google: { label: "Google", icon: <RiGoogleFill />, color: "#4285f4" },
  x: { label: "X", icon: <RiTwitterXFill />, color: "var(--foreground)" },
  github: { label: "GitHub", icon: <RiGithubFill />, color: "#6e40c9" },
  email: { label: "Email", icon: <RiMailFill />, color: "#e8730c" },
};

interface Visitor {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  source: Source;
  page: string;
}

const visitors: Visitor[] = [
  { id: "v1", name: "Maya Patel", city: "Mumbai", lat: 19.08, lng: 72.88, source: "google", page: "/pricing" },
  { id: "v2", name: "Jonas Berg", city: "Berlin", lat: 52.52, lng: 13.4, source: "github", page: "/docs/maps" },
  { id: "v3", name: "Lea Martin", city: "Paris", lat: 48.86, lng: 2.35, source: "x", page: "/blog/launch" },
  { id: "v4", name: "Sam Okafor", city: "Lagos", lat: 6.52, lng: 3.38, source: "google", page: "/" },
  { id: "v5", name: "Hana Kim", city: "Seoul", lat: 37.57, lng: 126.98, source: "email", page: "/changelog" },
  { id: "v6", name: "Yuto Sato", city: "Tokyo", lat: 35.68, lng: 139.69, source: "github", page: "/docs" },
  { id: "v7", name: "Ava Chen", city: "San Francisco", lat: 37.77, lng: -122.42, source: "x", page: "/pricing" },
  { id: "v8", name: "Noah Smith", city: "New York", lat: 40.71, lng: -74.0, source: "google", page: "/signup" },
  { id: "v9", name: "Lucas Silva", city: "São Paulo", lat: -23.55, lng: -46.63, source: "email", page: "/" },
  { id: "v10", name: "Olivia Brown", city: "London", lat: 51.51, lng: -0.13, source: "google", page: "/docs/maps" },
  { id: "v11", name: "Emma Wilson", city: "Amsterdam", lat: 52.37, lng: 4.9, source: "github", page: "/docs" },
  { id: "v12", name: "Arjun Rao", city: "Bengaluru", lat: 12.97, lng: 77.59, source: "x", page: "/pricing" },
  { id: "v13", name: "Chloe Taylor", city: "Sydney", lat: -33.87, lng: 151.21, source: "google", page: "/" },
  { id: "v14", name: "Mateo García", city: "Madrid", lat: 40.42, lng: -3.7, source: "email", page: "/blog" },
  { id: "v15", name: "Ines Costa", city: "Lisbon", lat: 38.72, lng: -9.14, source: "google", page: "/signup" },
  { id: "v16", name: "Ji-woo Park", city: "Busan", lat: 35.18, lng: 129.08, source: "github", page: "/docs/maps" },
];

function visitorMarker(v: Visitor): GeoMarker {
  const source = SOURCES[v.source];
  return {
    id: v.id,
    point: { lat: v.lat, lng: v.lng },
    label: `${v.name}, ${v.city}, from ${source.label}`,
    description: `${v.city} · ${v.page}`,
    pulse: true,
    tone: "success",
    render: <Avatar size="sm" name={v.name} ring />,
    badge: (
      <span
        className="flex size-4 items-center justify-center rounded-full bg-background shadow-xs ring-1 ring-border [&_svg]:size-2.5"
        style={{ color: source.color }}
      >
        {source.icon}
      </span>
    ),
  };
}

const DATACENTER = { lat: 50.11, lng: 8.68 };

const attacks = [
  { id: "a1", city: "Shenzhen", lat: 22.54, lng: 114.06, count: 1240 },
  { id: "a2", city: "São Paulo", lat: -23.55, lng: -46.63, count: 610 },
  { id: "a3", city: "Moscow", lat: 55.76, lng: 37.62, count: 980 },
  { id: "a4", city: "Ashburn", lat: 39.04, lng: -77.49, count: 420 },
  { id: "a5", city: "Lagos", lat: 6.52, lng: 3.38, count: 260 },
  { id: "a6", city: "Ho Chi Minh City", lat: 10.82, lng: 106.63, count: 530 },
  { id: "a7", city: "Seattle", lat: 47.61, lng: -122.33, count: 180 },
];

const attackArcs: GeoArc[] = attacks.map((a) => ({
  id: a.id,
  from: { lat: a.lat, lng: a.lng },
  to: DATACENTER,
  tone: "destructive",
  label: `${a.city} to Frankfurt, ${a.count} requests blocked`,
  width: a.count > 900 ? 2 : 1.25,
  animated: true,
}));

const attackMarkers: GeoMarker[] = [
  ...attacks.map(
    (a): GeoMarker => ({
      id: a.id,
      point: { lat: a.lat, lng: a.lng },
      label: `${a.city}: ${a.count} blocked requests`,
      description: `${a.count} blocked requests`,
      tone: "destructive",
      value: a.count,
    })
  ),
  {
    id: "dc",
    point: DATACENTER,
    label: "Frankfurt datacenter (eu-central)",
    description: "eu-central · healthy",
    color: "primary",
    size: 22,
    icon: <RiServerLine />,
  },
];

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
