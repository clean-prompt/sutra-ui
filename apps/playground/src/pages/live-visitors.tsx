import * as React from "react";
import { Button, Label, Switch, Text } from "@sutra/ui";
import { LiveVisitorsMap, type LiveVisitor, type LiveVisitorDevice, type LiveVisitorsMapView } from "@sutra/ui/geo";
import { RiHistoryLine } from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";
import { SOURCES, visitors as demoVisitors, type Visitor } from "../demos/geo-data";

/* ------------------------------------------------------------------ */
/* Demo data: the shared geo visitors plus device and timing details    */
/* ------------------------------------------------------------------ */

const DEVICES: { device: LiveVisitorDevice; os: string; browser: string }[] = [
  { device: "phone", os: "iOS 18", browser: "Safari" },
  { device: "laptop", os: "macOS", browser: "Chrome" },
  { device: "desktop", os: "Windows 11", browser: "Edge" },
  { device: "phone", os: "Android 15", browser: "Chrome" },
  { device: "tablet", os: "iPadOS", browser: "Safari" },
  { device: "desktop", os: "Ubuntu", browser: "Firefox" },
];

/** Seconds since last activity, spread so the list shows "now", "1m", "3m" … */
const AGES = [5, 20, 70, 12, 150, 40, 300, 8, 95, 30, 220, 15, 400, 60, 25, 180, 10, 520, 35, 90];

function toLiveVisitor(v: Visitor, i: number, now: number): LiveVisitor {
  const d = DEVICES[i % DEVICES.length]!;
  return {
    id: v.id,
    point: { lat: v.lat, lng: v.lng },
    city: v.city,
    country: v.country,
    name: i % 4 === 3 ? undefined : v.name,
    source: { id: v.source, ...SOURCES[v.source] },
    page: v.page,
    ...d,
    lastSeen: now - (AGES[i % AGES.length]! * 1000),
    loadTime: 380 + ((i * 337) % 1900),
  };
}

const buildVisitors = (now = Date.now()) => demoVisitors.map((v, i) => toLiveVisitor(v, i, now));

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function LiveScreenDemo() {
  const [visitors, setVisitors] = React.useState(() => buildVisitors());
  const [simulate, setSimulate] = React.useState(false);
  const [history, setHistory] = React.useState<string | null>(null);

  // Simulated traffic: every few seconds someone is active again, and one visitor leaves or comes back.
  React.useEffect(() => {
    if (!simulate) return;
    const all = buildVisitors();
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      setVisitors((prev) => {
        const now = Date.now();
        const bumped = prev.map((v, i) => ((i + tick) % 5 === 0 ? { ...v, lastSeen: now } : v));
        const missing = all.filter((v) => !bumped.some((b) => b.id === v.id));
        if (tick % 2 === 0 && missing.length) return [{ ...missing[0]!, lastSeen: now }, ...bumped];
        return bumped.length > 12 ? bumped.slice(0, -1) : bumped;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [simulate]);

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="lv-simulate" size="sm" checked={simulate} onCheckedChange={setSimulate} />
          <Label htmlFor="lv-simulate">Simulate traffic</Label>
        </div>
        <Text size="sm" tone="neutral" aria-live="polite">
          {history ?? "Select a visitor in the list or on the map."}
        </Text>
      </div>
      <LiveVisitorsMap
        visitors={visitors}
        windowLabel="Last 30 minutes"
        total={1284}
        renderVisitorActions={(v) => (
          <Button size="xs" variant="outline" leadingIcon={<RiHistoryLine />} onClick={() => setHistory(`History for ${v.name ?? `the visitor in ${v.city}`}`)}>
            View history
          </Button>
        )}
      />
    </div>
  );
}

function ControlledDemo() {
  const visitors = React.useMemo(() => buildVisitors(), []);
  const [view, setView] = React.useState<LiveVisitorsMapView>("flat");
  const [selected, setSelected] = React.useState<string | null>("v10");
  const visitor = visitors.find((v) => v.id === selected);
  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setView(view === "globe" ? "flat" : "globe")}>
          Switch to {view === "globe" ? "flat map" : "globe"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSelected("v5")}>
          Select Seoul
        </Button>
        <Button size="sm" variant="outline" disabled={!selected} onClick={() => setSelected(null)}>
          Clear selection
        </Button>
      </div>
      <LiveVisitorsMap
        visitors={visitors}
        view={view}
        onViewChange={setView}
        selectedId={selected}
        onSelectedIdChange={(id) => setSelected(id)}
        autoRotate={false}
        windowLabel="Last 5 minutes"
        label="Live visitors (controlled)"
      />
      <Text size="sm" tone="neutral" aria-live="polite">
        View: {view} · selected: {visitor ? `${visitor.city} (${visitor.id})` : "none"}
      </Text>
    </div>
  );
}

function LoadingDemo() {
  const [loaded, setLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const visitors = React.useMemo(() => (loaded ? buildVisitors().slice(0, 8) : []), [loaded]);
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
      <LiveVisitorsMap visitors={visitors} loading={!loaded || refreshing} windowLabel="Last 30 minutes" defaultView="flat" label="Live visitors (loading)" />
    </div>
  );
}

function EmptyDemo() {
  return <LiveVisitorsMap visitors={[]} windowLabel="Last 30 minutes" defaultView="flat" label="Live visitors (empty)" />;
}

function NarrowDemo() {
  const visitors = React.useMemo(() => buildVisitors(), []);
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <LiveVisitorsMap visitors={visitors} windowLabel="Last 30 min" label="Live visitors (narrow)" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function LiveVisitorsPage() {
  return (
    <PageIntro
      eyebrow="Geo"
      title="Live Visitors"
      description="A ready-made live analytics screen: live, country and source counts, a globe or flat map of avatar markers with source badges and clusters, a visitor list whose rows select and fly to the marker, and a closable card for the selected visitor."
    >
      <Demo
        id="live-screen"
        title="Live screen"
        description="Auto-rotating globe with clusters. Pick a row (arrow keys move, Enter selects) to fly there; the card's action slot holds a View history button."
        align="start"
      >
        <LiveScreenDemo />
      </Demo>
      <Demo id="controlled-view" title="Controlled" description="View and selection held in state; starts on the flat map with London selected." align="start">
        <ControlledDemo />
      </Demo>
      <Demo id="loading-visitors" title="Loading" description="Skeleton rows and a silhouette map until the first visitors arrive; a refresh keeps them on screen." align="start">
        <LoadingDemo />
      </Demo>
      <Demo id="empty-visitors" title="Empty" description="Nobody online right now." align="start">
        <EmptyDemo />
      </Demo>
      <Demo id="narrow-visitors" title="Narrow width" description="At phone width the list and card stack under the map and markers turn compact." align="start">
        <NarrowDemo />
      </Demo>
    </PageIntro>
  );
}
