import * as React from "react";
import { Button, Text } from "@cleanprompt/sutra-ui";
import { SignInMap, type SignInEvent } from "@cleanprompt/sutra-ui/identity";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */

const NOW = Date.now();
const min = (n: number) => NOW - n * 60_000;
const hours = (n: number) => min(n * 60);
const days = (n: number) => hours(n * 24);

const SEOUL = { lat: 37.57, lng: 126.98 };
const BERLIN = { lat: 52.52, lng: 13.4 };

const events: SignInEvent[] = [
  {
    id: "s1",
    account: "hana@acme.io",
    point: SEOUL,
    city: "Seoul",
    country: "KR",
    time: hours(20),
    outcome: "success",
    method: "Passkey",
    device: "laptop",
    browser: "Safari",
    os: "macOS",
    ip: "211.36.142.7",
    current: true,
  },
  {
    id: "s2",
    account: "hana@acme.io",
    point: { lat: 51.51, lng: -0.13 },
    city: "London",
    country: "GB",
    time: hours(1),
    outcome: "success",
    method: "Password",
    device: "desktop",
    browser: "Chrome",
    os: "Windows",
    ip: "185.220.101.4",
  },
  {
    id: "s3",
    account: "hana@acme.io",
    point: SEOUL,
    city: "Seoul",
    country: "KR",
    time: hours(4),
    outcome: "success",
    method: "Passkey",
    device: "phone",
    browser: "Safari",
    os: "iOS",
    ip: "211.36.142.9",
  },
  {
    id: "s4",
    account: "hana@acme.io",
    point: { lat: 55.76, lng: 37.62 },
    city: "Moscow",
    country: "RU",
    time: hours(5),
    outcome: "blocked",
    method: "Password",
    device: "desktop",
    browser: "Firefox",
    os: "Linux",
    ip: "95.173.136.70",
  },
  {
    id: "s5",
    account: "hana@acme.io",
    point: { lat: 55.75, lng: 37.6 },
    city: "Moscow",
    country: "RU",
    time: hours(5.1),
    outcome: "blocked",
    method: "Password",
    device: "desktop",
    browser: "Firefox",
    os: "Linux",
    ip: "95.173.136.71",
  },
  {
    id: "s6",
    account: "hana@acme.io",
    point: { lat: 6.52, lng: 3.38 },
    city: "Lagos",
    country: "NG",
    time: hours(9),
    outcome: "failed",
    method: "Password",
    device: "phone",
    browser: "Chrome",
    os: "Android",
    ip: "105.112.33.18",
  },
  {
    id: "s7",
    account: "hana@acme.io",
    point: { lat: 35.18, lng: 129.08 },
    city: "Busan",
    country: "KR",
    time: days(1),
    outcome: "success",
    method: "Passkey",
    device: "phone",
    browser: "Safari",
    os: "iOS",
    ip: "175.223.10.2",
  },
  {
    id: "s8",
    account: "hana@acme.io",
    point: { lat: 35.68, lng: 139.69 },
    city: "Tokyo",
    country: "JP",
    time: days(2),
    outcome: "success",
    method: "Passkey",
    device: "laptop",
    browser: "Safari",
    os: "macOS",
    ip: "126.75.0.31",
  },
  {
    id: "s9",
    account: "hana@acme.io",
    point: SEOUL,
    city: "Seoul",
    country: "KR",
    time: days(4),
    outcome: "success",
    method: "Passkey",
    device: "laptop",
    browser: "Safari",
    os: "macOS",
    ip: "211.36.142.7",
  },
  {
    id: "s10",
    account: "hana@acme.io",
    point: { lat: -23.55, lng: -46.63 },
    city: "São Paulo",
    country: "BR",
    time: days(3),
    outcome: "failed",
    method: "Password",
    device: "desktop",
    browser: "Edge",
    os: "Windows",
    ip: "177.54.144.2",
  },
  {
    id: "j1",
    account: "jonas@acme.io",
    point: BERLIN,
    city: "Berlin",
    country: "DE",
    time: days(5),
    outcome: "success",
    method: "Google SSO",
    device: "laptop",
    browser: "Chrome",
    os: "macOS",
    ip: "91.64.12.5",
  },
  {
    id: "j2",
    account: "jonas@acme.io",
    point: { lat: 52.37, lng: 4.9 },
    city: "Amsterdam",
    country: "NL",
    time: hours(6),
    outcome: "success",
    method: "Google SSO",
    device: "laptop",
    browser: "Chrome",
    os: "macOS",
    ip: "145.14.20.8",
  },
  {
    id: "j3",
    account: "jonas@acme.io",
    point: { lat: 40.71, lng: -74.0 },
    city: "New York",
    country: "US",
    time: hours(5.5),
    outcome: "success",
    method: "Password",
    device: "desktop",
    browser: "Chrome",
    os: "Windows",
    ip: "198.51.100.23",
  },
  {
    id: "j4",
    account: "jonas@acme.io",
    point: BERLIN,
    city: "Berlin",
    country: "DE",
    time: hours(2),
    outcome: "failed",
    method: "Password",
    device: "phone",
    browser: "Chrome",
    os: "Android",
    ip: "91.64.12.9",
  },
  {
    id: "j5",
    account: "jonas@acme.io",
    point: { lat: 48.14, lng: 11.58 },
    city: "Munich",
    country: "DE",
    time: days(1.5),
    outcome: "success",
    method: "Google SSO",
    device: "tablet",
    browser: "Safari",
    os: "iPadOS",
    ip: "93.104.5.17",
  },
];

const quietEvents = events.filter((e) => ["s1", "s3", "s7", "s9", "j1", "j5", "j4"].includes(e.id));

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function OverviewDemo() {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [log, setLog] = React.useState("Select a flagged sign-in, or a marker on the map.");
  const [list, setList] = React.useState(events);
  return (
    <div className="w-full space-y-3">
      <SignInMap
        events={list}
        windowLabel="Last 7 days"
        selectedId={selected}
        onSelectedIdChange={(id, e) => {
          setSelected(id);
          if (e) setLog(`Selected ${e.city ?? e.id} (${e.outcome}).`);
        }}
        onReview={(e, flags) => setLog(`Review ${e.city}: ${flags.map((f) => f.kind).join(", ")}.`)}
        onRevoke={async (e) => {
          await new Promise((r) => setTimeout(r, 800));
          setList((prev) => prev.map((x) => (x.id === e.id ? { ...x, outcome: "blocked" } : x)));
          setLog(`Revoked the session from ${e.city}; it now shows as blocked.`);
        }}
      />
      <Text size="sm" tone="neutral" aria-live="polite">
        {log}
      </Text>
    </div>
  );
}

function GlobeDemo() {
  return <SignInMap events={events} defaultView="globe" windowLabel="Last 7 days" defaultSelectedId="s2" onReview={() => {}} />;
}

function QuietDemo() {
  return <SignInMap events={quietEvents} windowLabel="Last 7 days" title="Your sign-ins" />;
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
      <SignInMap loading={!loaded || refreshing} events={loaded ? events : []} windowLabel="Last 7 days" />
    </div>
  );
}

function EmptyDemo() {
  return <SignInMap events={[]} windowLabel="Last 24 hours" />;
}

function NarrowDemo() {
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <SignInMap events={events} windowLabel="7 days" onReview={() => {}} onRevoke={() => {}} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function SignInMapPage() {
  return (
    <PageIntro
      eyebrow="Identity & security"
      title="Sign-in Map"
      description="Where sign-ins come from: markers toned by outcome (clustered), impossible-travel arcs, first sign-ins from a new country, a summary row and a list of flagged sign-ins with review and revoke actions. Detection is pure (detectImpossibleTravel, detectNewLocations, analyzeSignIns)."
    >
      <Demo
        id="overview"
        title="Overview"
        description="Two accounts over a week. London three hours after Seoul and New York half an hour after Amsterdam are impossible at 900 km/h; Tokyo, Amsterdam and New York are new countries. Rows select their marker; Revoke resolves after 800 ms."
        align="start"
      >
        <OverviewDemo />
      </Demo>
      <Demo id="globe" title="Globe" description="The same data on the globe; selecting a sign-in flies to it." align="start">
        <GlobeDemo />
      </Demo>
      <Demo id="no-alerts" title="No alerts" description="Sign-ins from familiar places only, without actions." align="start">
        <QuietDemo />
      </Demo>
      <Demo id="loading" title="Loading" description="Skeletons until data arrives; a refresh keeps the data on screen." align="start">
        <LoadingDemo />
      </Demo>
      <Demo id="empty" title="Empty" description="No sign-ins in the window." align="start">
        <EmptyDemo />
      </Demo>
      <Demo id="narrow" title="Narrow width" description="At phone width the map, details and list stack." align="start">
        <NarrowDemo />
      </Demo>
    </PageIntro>
  );
}
