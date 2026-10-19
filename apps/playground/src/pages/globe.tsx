import * as React from "react";
import { Avatar, Badge, Button, CountryFlag, Label, SimpleSelect, StatusDot, Switch, Text, cn, formatCompact } from "@sutra/ui";
import { Globe, countryName, formatGeoPoint, type GeoRotation, type GlobeApi } from "@sutra/ui/geo";
import { RiCloseLine } from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";
import { DATACENTER, SOURCES, attackArcs, attackMarkers, attacks, traffic, visitorMarker, visitors, type Visitor } from "./geo-data";

/* ------------------------------------------------------------------ */
/* Live visitors                                                       */
/* ------------------------------------------------------------------ */

const sourceCounts = (Object.keys(SOURCES) as (keyof typeof SOURCES)[])
  .map((key) => ({ key, ...SOURCES[key], count: visitors.filter((v) => v.source === key).length }))
  .sort((a, b) => b.count - a.count);

function VisitorCard({ visitor, onClose, className }: { visitor: Visitor; onClose: () => void; className?: string }) {
  const source = SOURCES[visitor.source];
  return (
    <div
      data-testid="visitor-card"
      className={cn("w-64 space-y-3 rounded-box border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg", className)}
    >
      <div className="flex items-start gap-2.5">
        <Avatar size="md" name={visitor.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{visitor.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CountryFlag code={visitor.country} size="xs" label="" />
            {visitor.city}, {countryName(visitor.country)}
          </div>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label="Close visitor details" onClick={onClose}>
          <RiCloseLine />
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Source</dt>
        <dd className="flex items-center gap-1.5 [&_svg]:size-3.5">
          <span style={{ color: source.color }}>{source.icon}</span>
          {source.label}
        </dd>
        <dt className="text-muted-foreground">Viewing</dt>
        <dd className="truncate font-mono">{visitor.page}</dd>
        <dt className="text-muted-foreground">Location</dt>
        <dd className="tabular-nums">{formatGeoPoint(visitor)}</dd>
      </dl>
    </div>
  );
}

function LiveVisitorsDemo() {
  const [selected, setSelected] = React.useState<string | null>(null);
  const markers = React.useMemo(() => visitors.map(visitorMarker), []);
  const visitor = visitors.find((v) => v.id === selected);
  return (
    <div className="w-full overflow-hidden rounded-box border border-border bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <StatusDot tone="success" pulse label="" />
          Live
        </span>
        <Badge color="success">{visitors.length} online</Badge>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {sourceCounts.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1 [&_svg]:size-3.5">
              <span style={{ color: s.color }}>{s.icon}</span>
              {s.label} <span className="tabular-nums text-foreground">{s.count}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_16rem]">
        <div className="relative p-2 sm:p-4">
          <Globe
            className="mx-auto w-full max-w-[600px]"
            markers={markers}
            cluster
            controls
            autoRotate
            selectedMarkerId={selected}
            onMarkerSelect={(id) => setSelected(id)}
            label={`Live visitors: ${visitors.length} people online`}
          />
          {visitor ? (
            <VisitorCard
              visitor={visitor}
              onClose={() => setSelected(null)}
              className="mx-auto mt-3 sm:absolute sm:top-4 sm:left-4 sm:mt-0"
            />
          ) : null}
        </div>
        {/* contain-size: the list column takes the globe column's height instead of setting it, and scrolls inside. */}
        <div className="flex min-h-0 flex-col border-t border-border p-4 lg:border-t-0 lg:border-l lg:[contain:size]">
          <Text size="xs" tone="neutral" className="mb-2 font-medium uppercase tracking-wide">
            Recent visitors
          </Text>
          <ul className="max-h-96 min-h-0 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin lg:max-h-none">
            {visitors.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  aria-pressed={v.id === selected}
                  onClick={() => setSelected(v.id === selected ? null : v.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                    v.id === selected && "bg-accent"
                  )}
                >
                  <Avatar size="xs" name={v.name} />
                  <span className="min-w-0 flex-1 truncate">{v.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{v.city}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Other demos                                                         */
/* ------------------------------------------------------------------ */

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

function ChoroplethDemo() {
  const [country, setCountry] = React.useState<string | null>(null);
  const value = traffic.find((d) => d.code === country)?.value;
  return (
    <div className="w-full space-y-3">
      <Globe
        className="mx-auto w-full max-w-[460px]"
        data={traffic}
        legend
        graticule
        valueLabel="Visits"
        valueFormatter={(v) => formatCompact(v)}
        selectedCountry={country}
        onCountrySelect={(code) => setCountry(code)}
        defaultRotation={[30, -25, 0]}
      />
      <Text size="sm" tone="neutral" aria-live="polite" className="text-center">
        {country ? `${countryName(country)}: ${value !== undefined ? `${value.toLocaleString()} visits` : "no visits"}` : "Drag to turn the globe; click a country to select it."}
      </Text>
    </div>
  );
}

const cities = [
  { value: "seoul", label: "Seoul", point: { lat: 37.57, lng: 126.98 } },
  { value: "nyc", label: "New York", point: { lat: 40.71, lng: -74.0 } },
  { value: "london", label: "London", point: { lat: 51.51, lng: -0.13 } },
  { value: "sao-paulo", label: "São Paulo", point: { lat: -23.55, lng: -46.63 } },
  { value: "sydney", label: "Sydney", point: { lat: -33.87, lng: 151.21 } },
  { value: "nairobi", label: "Nairobi", point: { lat: -1.29, lng: 36.82 } },
];

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

function ControlledDemo() {
  const [rotation, setRotation] = React.useState<GeoRotation>([-127, -37.6, 0]);
  const [zoom, setZoom] = React.useState(1.4);
  const [city, setCity] = React.useState("seoul");
  const [reportCount, setReportCount] = React.useState(0);
  const api = React.useRef<GlobeApi>(null);
  const focus = cities.find((c) => c.value === city)?.point;
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 w-full items-start gap-6 @2xl:grid-cols-[1fr_16rem]">
        <Globe
          className="mx-auto w-full max-w-[420px]"
          apiRef={api}
          rotation={rotation}
          onRotationChange={(r) => {
            setRotation(r);
            setReportCount((n) => n + 1);
          }}
          zoom={zoom}
          onZoomChange={setZoom}
          focus={focus}
          markers={cities.map((c) => ({ id: c.value, point: c.point, label: c.label, tone: c.value === city ? "primary" : "neutral" }))}
          selectedMarkerId={city}
          onMarkerSelect={(id) => id && setCity(id)}
          label="Controlled globe"
        />
        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="globe-city">Fly to</Label>
            <SimpleSelect id="globe-city" size="sm" value={city} onValueChange={setCity} options={cities.map(({ value, label }) => ({ value, label }))} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs" aria-live="polite">
            <dt className="text-muted-foreground">λ</dt>
            <dd data-testid="readout-lambda">{fmt(rotation[0])}°</dd>
            <dt className="text-muted-foreground">φ</dt>
            <dd data-testid="readout-phi">{fmt(rotation[1])}°</dd>
            <dt className="text-muted-foreground">zoom</dt>
            <dd data-testid="readout-zoom">{fmt(zoom)}×</dd>
            <dt className="text-muted-foreground">reports</dt>
            <dd>{reportCount}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setRotation([0, 0, 0])}>
              Set rotation to 0°
            </Button>
            <Button size="sm" variant="outline" onClick={() => api.current?.flyTo({ lat: 35.68, lng: 139.69 }, { zoom: 3 })}>
              Fly to Tokyo at 3×
            </Button>
            <Button size="sm" variant="outline" onClick={() => api.current?.reset()}>
              Reset
            </Button>
          </div>
          <Text size="xs" tone="neutral">
            The readouts update when the globe comes to rest, not on every frame.
          </Text>
        </div>
      </div>
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
      <Globe
        className="mx-auto w-full max-w-[360px]"
        loading={!loaded || refreshing}
        data={loaded ? traffic : []}
        legend
        controls
        valueLabel="Visits"
        valueFormatter={(v) => formatCompact(v)}
      />
    </div>
  );
}

function NarrowDemo() {
  const markers = React.useMemo(() => visitors.map(visitorMarker), []);
  const [compact, setCompact] = React.useState(true);
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <Switch id="globe-compact" size="sm" checked={compact} onCheckedChange={setCompact} />
        <Label htmlFor="globe-compact">Compact markers (automatic below 480 px)</Label>
      </div>
      <div className="mx-auto w-full max-w-[358px] rounded-box border border-border p-2">
        <Globe markers={markers} cluster compactMarkers={compact} controls defaultRotation={[0, -40, 0]} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function GlobePage() {
  return (
    <PageIntro
      eyebrow="Geo"
      title="Globe"
      description="An orthographic globe from the same bundled outlines as World Map: drag with momentum, wheel, pinch and keyboard zoom, auto-rotation, fly-to, and the same choropleth, markers, clusters, arcs and screen-reader tables."
    >
      <Demo
        id="live-visitors-globe"
        title="Live visitors"
        description="Auto-rotating globe with avatar markers, source badges and clusters. Selecting a visitor (on the globe or in the list) flies to them and pauses the rotation."
        align="start"
      >
        <LiveVisitorsDemo />
      </Demo>
      <Demo id="attack-globe" title="Attack origins" description="Animated great-circle arcs into the Frankfurt datacenter, clipped where they pass over the horizon." align="start">
        <AttacksDemo />
      </Demo>
      <Demo id="choropleth-globe" title="Choropleth" description="Traffic by country with a stepped legend, tooltips and country selection." align="start">
        <ChoroplethDemo />
      </Demo>
      <Demo
        id="controlled-globe"
        title="Controlled"
        description="Rotation and zoom held in state and reported on settle; the select drives the focus prop and the buttons use the imperative handle."
        align="start"
      >
        <ControlledDemo />
      </Demo>
      <Demo id="loading-globe" title="Loading" description="A pulsing silhouette until data arrives; a refresh keeps the data on screen." align="start">
        <LoadingDemo />
      </Demo>
      <Demo id="narrow-globe" title="Narrow width" description="Below 480 px markers shrink and clusters reach further, so avatars don't pile up." align="start">
        <NarrowDemo />
      </Demo>
    </PageIntro>
  );
}
