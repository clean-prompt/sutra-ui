import * as React from "react";
import {
  AgentProcessList,
  AlertRuleList,
  FanControl,
  HeatByApp,
  MetricReadout,
  MetricReadoutGroup,
  ProcessTable,
  StorageMap,
  ThermalSensors,
  ALERT_RULE_PRESETS,
  type AlertRule,
  type FanControlFan,
  type ProcessInfo,
  type StorageMapItem,
  type ThermalSensor,
  ContainerList,
  ContainerSummary,
  DevServerList,
  DeviceBatteryList,
  QuotaBars,
  QuotaStrip,
  VolumeMixer,
  type AgentProcessSession,
  type BatteryDevice,
  type ContainerInfo,
  type DevServerProject,
  type UsageQuota,
  type VolumeMixerApp,
} from "@sutra/ui";
import { Demo, PageIntro } from "../components/demo";

/* All times are relative to a fixed "now" so the pills read the same as the reference screenshots. */
const NOW = new Date(2026, 9, 19, 15, 0).getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MB = 1_000_000;

/* ------------------------------------------------------------------ */
/* Sound                                                               */
/* ------------------------------------------------------------------ */

const initialApps: VolumeMixerApp[] = [
  { id: "music", name: "Music", playing: true, volume: 100 },
  { id: "zoom", name: "Zoom", playing: true, volume: 80 },
  { id: "chrome", name: "Google Chrome", playing: true, volume: 35 },
  { id: "slack", name: "Slack", volume: 70, muted: true },
  { id: "safari", name: "Safari", volume: 100 },
  { id: "figma", name: "Figma", volume: 100 },
  { id: "notion", name: "Notion", volume: 100 },
  { id: "mail", name: "Mail", volume: 100 },
];

function SoundDemo() {
  const [apps, setApps] = React.useState(initialApps);
  const update = (id: string, patch: Partial<VolumeMixerApp>) =>
    setApps((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  return (
    <VolumeMixer
      className="w-full"
      apps={apps}
      onAppVolumeChange={(id, volume) => update(id, { volume, muted: false })}
      onAppMutedChange={(id, muted) => update(id, { muted })}
      defaultVolume={64}
      devices={[
        { id: "speakers", name: "MacBook Pro Speakers" },
        { id: "airpods", name: "AirPods Pro" },
        { id: "display", name: "Studio Display" },
      ]}
      defaultDevice="speakers"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Bluetooth                                                           */
/* ------------------------------------------------------------------ */

const devices: BatteryDevice[] = [
  {
    id: "airpods",
    name: "AirPods Pro",
    kind: "headphones",
    parts: [
      { id: "left", label: "Left", battery: 42 },
      { id: "right", label: "Right", battery: 58 },
      { id: "case", label: "Case", battery: 80 },
    ],
  },
  { id: "trackpad", name: "Magic Trackpad", kind: "trackpad", battery: 67 },
  { id: "keyboard", name: "Magic Keyboard", kind: "keyboard", battery: 91 },
  { id: "beats", name: "Beats Fit Pro", kind: "headphones", connected: false },
];

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

const initialProjects: DevServerProject[] = [
  { id: "storefront", name: "storefront", processes: 9, memoryBytes: 1180 * MB, state: "working" },
  { id: "storefront-web", name: "storefront-web", runtime: "node", ports: [4322], memoryBytes: 458 * MB, state: "idle", startedAt: NOW - 3 * DAY },
  { id: "scraper-api", name: "scraper-api", runtime: "python", ports: [8000], memoryBytes: 412 * MB, state: "idle", startedAt: NOW - 4 * DAY },
  { id: "marketing-site", name: "marketing-site", runtime: "node", ports: [4321], memoryBytes: 296 * MB, state: "running", startedAt: NOW - 6 * HOUR, idleSince: NOW - 2 * HOUR },
  { id: "billing-api", name: "billing-api", runtime: "node", ports: [3000, 9229], memoryBytes: 204 * MB, state: "running", startedAt: NOW - 5 * HOUR, idleSince: NOW - 45 * MIN },
  { id: "docs", name: "docs", runtime: "node", ports: [5173], memoryBytes: 188 * MB, state: "running", startedAt: NOW - 20 * MIN },
  { id: "ml-notebooks", name: "ml-notebooks", runtime: "python", ports: [8888], memoryBytes: 164 * MB, state: "running", startedAt: NOW - HOUR },
  { id: "design-tokens", name: "design-tokens", runtime: "node", ports: [6006], memoryBytes: 121 * MB, state: "running", startedAt: NOW - 3 * HOUR, idleSince: NOW - 20 * MIN },
  { id: "infra", name: "infra", processes: 3, memoryBytes: 96 * MB, state: "running" },
];

function ProjectsDemo() {
  const [projects, setProjects] = React.useState(initialProjects);
  const stop = (ids: string[]) => setProjects((list) => list.filter((p) => !ids.includes(p.id)));
  return (
    <DevServerList
      className="w-full"
      projects={projects}
      now={NOW}
      onStop={(id) => stop([id])}
      onStopIdle={stop}
      emptyState="No dev servers running"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

const quotas: UsageQuota[] = [
  { id: "claude", provider: "Claude", label: "This week", used: 28, startsAt: NOW - 2.6 * DAY, resetsAt: NOW + 4.4 * DAY },
  { id: "codex", provider: "Codex", label: "5-hour session", used: 11, resetsAt: NOW + 3 * HOUR + 12 * MIN, pace: false },
  { id: "copilot", provider: "GitHub Copilot", label: "Premium requests", used: 64, startsAt: NOW - 14 * DAY, resetsAt: NOW + 16 * DAY },
  { id: "cursor", provider: "Cursor", label: "This billing cycle", used: 52, resetsAt: NOW + 12 * DAY + 5 * HOUR, pace: false },
];

const initialSessions: AgentProcessSession[] = [
  {
    id: "checkout",
    agent: "Claude Code",
    title: "Checkout flow tests",
    project: "storefront",
    status: "waiting",
    startedAt: NOW - 48 * MIN,
    memoryBytes: 411 * MB,
    processes: [
      { pid: 101, name: "vitest", kind: "command", cpu: 0, memoryBytes: 516 * MB },
      { pid: 102, name: "node", kind: "server", port: 3001, memoryBytes: 235 * MB },
      { pid: 103, name: "Google Chrome for Testing", kind: "browser", memoryBytes: 308 * MB },
      { pid: 104, name: "mcp-server-fetch", kind: "tool-server", memoryBytes: 65 * MB },
    ],
  },
  { id: "codex", agent: "Codex", project: "docs", host: "in Terminal", status: "idle", statusSince: NOW - 48 * MIN, memoryBytes: 290 * MB },
];

function AgentsDemo() {
  const [sessions, setSessions] = React.useState(initialSessions);
  return (
    <div className="w-full space-y-4">
      <QuotaStrip quotas={quotas} now={NOW} />
      <AgentProcessList
        sessions={sessions}
        now={NOW}
        onQuit={(id) => setSessions((list) => list.filter((s) => s.id !== id))}
        emptyState="No agent sessions running"
      />
      <div className="max-w-sm rounded-box border border-border bg-card p-4">
        <p className="mb-3 text-sm text-muted-foreground">Compact strip for an overview tile</p>
        <QuotaBars quotas={quotas} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Containers                                                          */
/* ------------------------------------------------------------------ */

const initialContainers: ContainerInfo[] = [
  { id: "pg", name: "postgres", image: "postgres:16", group: "storefront", state: "running", startedAt: NOW - 5 * HOUR, ports: [5433], cpu: 1.6, memoryBytes: 312 * MB, network: { rxBps: 4000, txBps: 2000 } },
  { id: "redis", name: "redis", image: "redis:7-alpine", group: "storefront", state: "running", startedAt: NOW - 5 * HOUR, ports: [6379], cpu: 0.3, memoryBytes: 14 * MB, network: { rxBps: 500, txBps: 300 } },
  { id: "rmq", name: "rabbitmq", image: "rabbitmq:3-management", group: "api", state: "running", startedAt: NOW - 3 * HOUR, ports: [5672, 15672], cpu: 0.9, memoryBytes: 206 * MB, memoryLimitBytes: 240 * MB, network: { rxBps: 1200, txBps: 600 } },
  { id: "minio", name: "minio", image: "minio/minio", state: "running", startedAt: NOW - 2 * HOUR, ports: [9000, 9001], cpu: 0.2, memoryBytes: 142 * MB, network: { rxBps: 300, txBps: 100 } },
];

function ContainersDemo() {
  const [containers, setContainers] = React.useState(initialContainers);
  return (
    <div className="w-full space-y-4">
      <ContainerSummary containers={containers} history={[592.3 * MB, 640 * MB, 674 * MB]} />
      <ContainerList
        containers={containers}
        now={NOW}
        onStop={(id) => setContainers((list) => list.filter((c) => c.id !== id))}
        emptyState="No containers running"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Menu bar readouts                                                   */
/* ------------------------------------------------------------------ */

function ReadoutsDemo() {
  return (
    <div className="flex w-full flex-col gap-4">
      <MetricReadoutGroup label="Menu bar" className="w-fit rounded-control border border-border bg-card px-3 py-1.5">
        <MetricReadout label="CPU" value={34} unit="%" thresholds={{ warning: 70, danger: 90 }} />
        <MetricReadout label="MEM" value={84} unit="%" thresholds={{ warning: 80, danger: 92 }} />
        <MetricReadout label="GPU" value={96} unit="%" thresholds={{ warning: 70, danger: 90 }} />
        <MetricReadout label="NET" value="4.9" unit="MB/s" />
        <MetricReadout label="TEMP" value={72} unit="°C" thresholds={{ warning: 80, danger: 95 }} />
      </MetricReadoutGroup>
      <MetricReadoutGroup label="Menu bar, pill style" separator="none" className="flex-wrap">
        <MetricReadout variant="pill" label="CPU" value={34} unit="%" thresholds={{ warning: 70, danger: 90 }} />
        <MetricReadout variant="pill" label="MEM" value={84} unit="%" thresholds={{ warning: 80, danger: 92 }} />
        <MetricReadout variant="pill" label="GPU" value={96} unit="%" thresholds={{ warning: 70, danger: 90 }} />
        <MetricReadout variant="pill" label="BAT" value={9} unit="%" thresholds={{ warning: 20, danger: 10 }} />
      </MetricReadoutGroup>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thermals                                                            */
/* ------------------------------------------------------------------ */

const sensors: ThermalSensor[] = [
  { id: "cpu", label: "CPU", kind: "cpu", value: 72, history: [64, 66, 70, 68, 71, 74, 73, 72] },
  { id: "gpu", label: "GPU", kind: "gpu", value: 86, history: [70, 74, 79, 82, 85, 88, 87, 86] },
  { id: "ssd", label: "SSD", kind: "ssd", value: 41 },
  { id: "battery", label: "Battery", kind: "battery", value: 31 },
];

const initialFans: FanControlFan[] = [
  { id: "left", name: "Left fan", rpm: 2380, minRpm: 1200, maxRpm: 5800, mode: "auto" },
  { id: "right", name: "Right fan", rpm: 2410, minRpm: 1200, maxRpm: 5800, mode: "fixed", targetRpm: 1800, needRpm: 2300 },
];

function ThermalsDemo() {
  const [fans, setFans] = React.useState(initialFans);
  const update = (id: string, patch: Partial<FanControlFan>) => setFans((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  return (
    <div className="grid w-full gap-4 lg:grid-cols-2">
      <ThermalSensors sensors={sensors} showUnitToggle />
      <FanControl
        fans={fans}
        onModeChange={(id, mode) => update(id, { mode, targetRpm: mode === "fixed" ? fans.find((f) => f.id === id)?.rpm ?? 2000 : undefined })}
        onTargetChange={(id, rpm) => update(id, { targetRpm: rpm })}
      />
      <HeatByApp
        className="lg:col-span-2"
        explanation="Apps ranked by energy impact over the last minute, the closest proxy for heat."
        apps={[
          { id: "figma", name: "Figma", impact: 61, description: "14 processes" },
          { id: "chrome", name: "Google Chrome", impact: 48, description: "96 processes" },
          { id: "zoom", name: "Zoom", impact: 33, description: "8 processes" },
          { id: "docker", name: "Docker", impact: 12, description: "9 processes" },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

function AlertsDemo() {
  const [rules, setRules] = React.useState<AlertRule[]>(() =>
    ALERT_RULE_PRESETS.map((preset, i) => ({ ...preset.rule, id: `preset-${i}`, enabled: i !== 2 }))
  );
  return (
    <AlertRuleList
      className="w-full"
      rules={rules}
      onRulesChange={setRules}
      firingIds={["preset-0"]}
      apps={["Google Chrome", "Slack", "Zoom", "Music", "Docker"]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

const GB = 1_000_000_000;
const storage: StorageMapItem[] = [
  { id: "system", name: "System", category: "macos", size: 24 * GB },
  { id: "system-data", name: "System Data", category: "macos", size: 14 * GB },
  { id: "docker", name: "Docker images", category: "app-data", size: 64 * GB },
  { id: "xcode", name: "Xcode", category: "app-data", size: 41 * GB },
  { id: "caches", name: "Caches", category: "app-data", size: 18 * GB },
  { id: "photos", name: "Photos Library", category: "yours", size: 128 * GB },
  {
    id: "projects",
    name: "Projects",
    category: "yours",
    children: [
      { id: "nm", name: "node_modules", size: 52 * GB },
      { id: "src", name: "Source", size: 44 * GB },
    ],
  },
  { id: "downloads", name: "Downloads", category: "yours", size: 37 * GB },
  { id: "snapshots", name: "Local snapshots", category: "other", size: 34 * GB },
  { id: "purgeable", name: "Purgeable", category: "other", size: 18 * GB },
];

/* ------------------------------------------------------------------ */
/* Apps, not processes                                                 */
/* ------------------------------------------------------------------ */

const helpers = (app: string, base: number, n: number, cpu: number, mem: number): ProcessInfo[] =>
  Array.from({ length: n }, (_, i) => ({
    pid: base + i,
    name: i === 0 ? app : `${app} Helper${i > 1 ? ` (${i})` : ""}`,
    app,
    user: "vyom",
    cpu: Math.round((cpu / n) * (i === 0 ? 2 : 1) * 10) / 10,
    memory: Math.round((mem / n) * MB),
    state: "running",
    startedAt: NOW - (3 * HOUR + i * MIN),
  }));

const initialProcesses: ProcessInfo[] = [
  ...helpers("Google Chrome", 4100, 6, 37, 21230),
  ...helpers("Visual Studio Code", 5200, 4, 9.2, 8530),
  ...helpers("Terminal", 6300, 3, 14.6, 4060),
  { pid: 88, name: "WindowServer", user: "_windowserver", cpu: 6.1, memory: 690 * MB, state: "running", startedAt: NOW - 2 * DAY },
];

function AppsDemo() {
  const [processes, setProcesses] = React.useState(initialProcesses);
  return (
    <ProcessTable
      className="w-full"
      processes={processes}
      groupBy={(p) => p.app}
      defaultExpandedGroups={["Google Chrome"]}
      defaultSort={{ key: "cpu", direction: "desc" }}
      now={NOW}
      onQuitGroup={(group) => setProcesses((list) => list.filter((p) => p.app !== group.key))}
      onKill={(p) => setProcesses((list) => list.filter((x) => x.pid !== p.pid))}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function SystemPage() {
  return (
    <PageIntro
      eyebrow="Kits"
      title="System monitor"
      description="Screens for a Mac system monitor (@sutra/ui/system): a per-app volume mixer, Bluetooth device batteries, dev servers with idle detection, coding-agent quotas and sessions, and Docker containers. Components take plain data and report actions through callbacks; destructive actions confirm first."
    >
      <Demo id="volume-mixer" title="Volume mixer" description="Output device and master volume, then a slider and mute toggle per app." align="start">
        <SoundDemo />
      </Demo>
      <Demo id="device-batteries" title="Device batteries" description="Connected devices with nested parts, the lowest reading in the summary, and away devices dimmed." align="start">
        <DeviceBatteryList className="w-full" devices={devices} settingsHref="#/components/system/device-batteries" />
      </Demo>
      <Demo id="dev-servers" title="Dev servers" description="Projects with ports and activity. Servers idle for 30 minutes or more are offered for stopping, with what that frees." align="start">
        <ProjectsDemo />
      </Demo>
      <Demo id="agents" title="Agent quotas and sessions" description="Plan limits with a pace forecast, and each coding-agent session with the processes it started." align="start">
        <AgentsDemo />
      </Demo>
      <Demo id="readouts" title="Menu bar readouts" description="Compact readings that turn amber and red under strain; lower-is-worse thresholds work too (battery)." align="start">
        <ReadoutsDemo />
      </Demo>
      <Demo id="thermals" title="Temperatures and fans" description="Sensor readings in °C or °F, fans held at a fixed speed with a warning when it is below what the system needs, and apps ranked by heat." align="start">
        <ThermalsDemo />
      </Demo>
      <Demo id="alerts" title="Alert rules" description="Rules written as sentences, with presets, a firing badge, mute lists and an editor with a live preview." align="start">
        <AlertsDemo />
      </Demo>
      <Demo id="storage" title="Storage map" description="A treemap of disk usage by category. Click or press Enter to drill into a category or folder; Backspace goes back." align="start">
        <StorageMap className="w-full" items={storage} capacity={994.66 * GB} label="Macintosh HD" />
      </Demo>
      <Demo id="apps" title="Apps, not processes" description="ProcessTable grouped by app: totals per app, expandable helpers, and Quit or Force Quit with confirmation." align="start">
        <AppsDemo />
      </Demo>
      <Demo id="containers" title="Containers" description="Memory by container, the container closest to its limit, and Compose projects with their containers." align="start">
        <ContainersDemo />
      </Demo>
    </PageIntro>
  );
}
