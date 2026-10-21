import * as React from "react";
import { RiDashboardLine, RiShutDownLine } from "@cleanprompt/sutra-ui/icons";
import { Button, Text } from "@cleanprompt/sutra-ui";
import { RegionStatusMap, type RegionLink, type RegionSort, type StatusRegion } from "@cleanprompt/sutra-ui/ops";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */

const regions: StatusRegion[] = [
  { id: "use1", name: "N. Virginia", code: "us-east-1", country: "US", point: { lat: 38.9, lng: -77.4 }, status: "healthy", latencyMs: 38, load: 71, nodes: 48 },
  { id: "usw2", name: "Oregon", code: "us-west-2", country: "US", point: { lat: 45.6, lng: -121.2 }, status: "healthy", latencyMs: 64, load: 44, nodes: 32 },
  { id: "cac1", name: "Montreal", code: "ca-central-1", country: "CA", point: { lat: 45.5, lng: -73.6 }, status: "maintenance", latencyMs: 52, load: 12, nodes: 8, incident: "Kernel upgrade until 14:00 UTC; traffic drained to us-east-1." },
  { id: "sae1", name: "São Paulo", code: "sa-east-1", country: "BR", point: { lat: -23.55, lng: -46.63 }, status: "degraded", latencyMs: 212, load: 86, nodes: 14, incident: "Elevated latency on the transit link to us-east-1." },
  { id: "euw1", name: "Ireland", code: "eu-west-1", country: "IE", point: { lat: 53.35, lng: -6.26 }, status: "healthy", latencyMs: 41, load: 58, nodes: 36 },
  { id: "euc1", name: "Frankfurt", code: "eu-central-1", country: "DE", point: { lat: 50.11, lng: 8.68 }, status: "healthy", latencyMs: 29, load: 63, nodes: 40 },
  { id: "eun1", name: "Stockholm", code: "eu-north-1", country: "SE", point: { lat: 59.33, lng: 18.07 }, status: "healthy", latencyMs: 47, load: 35, nodes: 12 },
  { id: "mes1", name: "Bahrain", code: "me-south-1", country: "BH", point: { lat: 26.07, lng: 50.56 }, status: "down", latencyMs: null, load: null, nodes: 6, incident: "Power event in AZ me-south-1b. Failing over to eu-central-1." },
  { id: "afs1", name: "Cape Town", code: "af-south-1", country: "ZA", point: { lat: -33.92, lng: 18.42 }, status: "healthy", latencyMs: 118, load: 27, nodes: 6 },
  { id: "aps1", name: "Mumbai", code: "ap-south-1", country: "IN", point: { lat: 19.08, lng: 72.88 }, status: "degraded", latencyMs: 164, load: 92, nodes: 18, incident: "Load above 90%; autoscaling is adding nodes." },
  { id: "apse1", name: "Singapore", code: "ap-southeast-1", country: "SG", point: { lat: 1.35, lng: 103.82 }, status: "healthy", latencyMs: 72, load: 66, nodes: 28 },
  { id: "apne1", name: "Tokyo", code: "ap-northeast-1", country: "JP", point: { lat: 35.68, lng: 139.69 }, status: "healthy", latencyMs: 58, load: 77, nodes: 30 },
  { id: "apse2", name: "Sydney", code: "ap-southeast-2", country: "AU", point: { lat: -33.87, lng: 151.21 }, status: "healthy", latencyMs: 96, load: 49, nodes: 16 },
];

const links: RegionLink[] = [
  { id: "l1", from: "use1", to: "euw1", kind: "replication" },
  { id: "l2", from: "use1", to: "usw2", kind: "replication" },
  { id: "l3", from: "use1", to: "sae1", kind: "traffic" },
  { id: "l4", from: "euw1", to: "euc1", kind: "replication" },
  { id: "l5", from: "euc1", to: "mes1", kind: "replication" },
  { id: "l6", from: "euc1", to: "aps1", kind: "traffic" },
  { id: "l7", from: "aps1", to: "apse1", kind: "replication" },
  { id: "l8", from: "apse1", to: "apne1", kind: "replication" },
  { id: "l9", from: "apse1", to: "apse2", kind: "replication" },
  { id: "l10", from: "use1", to: "cac1", kind: "replication", status: "maintenance" },
];

const regionActions = (r: StatusRegion) => (
  <>
    <Button size="sm" variant="outline" leadingIcon={<RiDashboardLine />} aria-label={`Open ${r.name} dashboard`}>
      Dashboard
    </Button>
    <Button size="sm" variant="ghost" leadingIcon={<RiShutDownLine />} aria-label={`Drain ${r.name}`}>
      Drain
    </Button>
  </>
);

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function FleetDemo() {
  return <RegionStatusMap regions={regions} links={links} renderRegionActions={regionActions} defaultSelectedId="mes1" />;
}

function GlobeDemo() {
  return <RegionStatusMap regions={regions} links={links} defaultView="globe" autoRotate renderRegionActions={regionActions} />;
}

/** Latency and load drift every two seconds, like a live feed. */
function LiveDemo() {
  const [data, setData] = React.useState(regions);
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setData((prev) =>
        prev.map((r) =>
          r.latencyMs == null || r.load == null
            ? r
            : {
                ...r,
                latencyMs: Math.max(10, Math.round(r.latencyMs + (Math.random() - 0.5) * 20)),
                load: Math.min(100, Math.max(0, Math.round(r.load + (Math.random() - 0.5) * 10))),
              }
        )
      );
    }, 2000);
    return () => clearInterval(t);
  }, [paused]);
  return (
    <div className="w-full space-y-3">
      <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
        {paused ? "Resume updates" : "Pause updates"}
      </Button>
      <RegionStatusMap regions={data} links={links} viewToggle={false} />
    </div>
  );
}

function ControlledDemo() {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<RegionSort | null>({ key: "latency", direction: "desc" });
  const region = regions.find((r) => r.id === selected);
  return (
    <div className="w-full space-y-3">
      <Text size="sm" tone="neutral" aria-live="polite">
        {`Selected: ${region ? `${region.name} (${region.code})` : "none"} · Sort: ${sort ? `${sort.key} ${sort.direction}` : "none"}`}
      </Text>
      <RegionStatusMap
        regions={regions}
        links={links}
        selectedId={selected}
        onSelectedIdChange={(id) => setSelected(id)}
        sort={sort}
        onSortChange={setSort}
        latencyThresholds={{ warning: 100, danger: 200 }}
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
      <RegionStatusMap loading={!loaded || refreshing} regions={loaded ? regions : []} links={loaded ? links : []} />
    </div>
  );
}

function EmptyDemo() {
  return <RegionStatusMap regions={[]} />;
}

function NarrowDemo() {
  return (
    <div className="mx-auto w-full max-w-[358px]">
      <RegionStatusMap regions={regions} links={links} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function RegionMapPage() {
  return (
    <PageIntro
      eyebrow="Ops"
      title="Region Map"
      description="RegionStatusMap puts infrastructure regions on a world map or globe: markers toned by status and sized by load, replication and traffic links as arcs, a status legend with counts, a sortable region table and a detail panel for the selected region."
    >
      <Demo
        id="fleet"
        title="Global fleet"
        description="Select a marker, a table row or an entry under Needs attention. Links touching the selected region are drawn thicker; healthy and degraded links flow, down links stand still."
        align="start"
      >
        <FleetDemo />
      </Demo>
      <Demo id="globe-view" title="Globe view" description="The same data on a slowly turning globe; selecting a region flies to it." align="start">
        <GlobeDemo />
      </Demo>
      <Demo id="live" title="Live updates" description="Readings change every two seconds; the selection and sort stay put." align="start">
        <LiveDemo />
      </Demo>
      <Demo id="controlled" title="Controlled" description="Selection and sort held by the parent, with tighter latency thresholds (100 / 200 ms)." align="start">
        <ControlledDemo />
      </Demo>
      <Demo id="loading" title="Loading" description="Skeletons until regions arrive; a refresh keeps them on screen and marks the view busy." align="start">
        <LoadingDemo />
      </Demo>
      <Demo id="empty" title="Empty" description="No regions reported yet." align="start">
        <EmptyDemo />
      </Demo>
      <Demo id="narrow" title="Narrow width" description="Layout follows the container, not the window: the panel stacks under the map, the status column becomes a dot beside the name and the node column drops out." align="start">
        <NarrowDemo />
      </Demo>
    </PageIntro>
  );
}
