import * as React from "react";
import {
  ACCENT_COLORS,
  AreaChart,
  Treemap,
  BarList,
  DonutChart,
  MetricHero,
  Monogram,
  StackedMeter,
  StatCard,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TopItemCard,
  topWithOther,
  useSampler,
  type Accent,
  type BarListItem,
} from "@sutra/ui";
import {
  RiApps2Line,
  RiBattery2ChargeLine,
  RiCpuLine,
  RiFlashlightLine,
  RiGlobalLine,
  RiHardDrive3Line,
  RiLayoutGridLine,
  RiRam2Line,
  RiStackLine,
} from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Simulated readings                                                  */
/* ------------------------------------------------------------------ */

/** A bounded random walk, so live charts drift instead of jumping. */
function walker(start: number, step: number, min: number, max: number) {
  let v = start;
  return () => {
    v = Math.min(max, Math.max(min, v + (Math.random() - 0.5) * step));
    return Math.round(v * 10) / 10;
  };
}

const seed = (n: number, f: () => number) => Array.from({ length: n }, f);

interface App {
  id: string;
  name: string;
  processes: number;
  cpu: number;
  memoryGB: number;
  gpu: number;
  diskMBs: number;
  watts: number;
}

const APPS: App[] = [
  { id: "chrome", name: "Google Chrome", processes: 96, cpu: 37, memoryGB: 21.23, gpu: 6.6, diskMBs: 1.9, watts: 5 },
  { id: "code", name: "Visual Studio Code", processes: 63, cpu: 9.2, memoryGB: 8.53, gpu: 1.2, diskMBs: 0.4, watts: 1.1 },
  { id: "terminal", name: "Terminal", processes: 49, cpu: 14.6, memoryGB: 4.06, gpu: 0.3, diskMBs: 0.2, watts: 0.9 },
  { id: "safari", name: "Safari", processes: 16, cpu: 5.9, memoryGB: 2.69, gpu: 3.5, diskMBs: 0.6, watts: 0.8 },
  { id: "figma", name: "Figma", processes: 14, cpu: 4.1, memoryGB: 1.9, gpu: 19, diskMBs: 0.3, watts: 2.3 },
  { id: "photos", name: "Photos", processes: 6, cpu: 2.2, memoryGB: 1.1, gpu: 2.1, diskMBs: 7, watts: 0.6 },
  { id: "docker", name: "Docker", processes: 9, cpu: 3, memoryGB: 0.67, gpu: 0, diskMBs: 1, watts: 0.4 },
  { id: "zoom", name: "Zoom", processes: 8, cpu: 6.8, memoryGB: 0.9, gpu: 4.4, diskMBs: 0.1, watts: 2.9 },
];

const appIcon = (app: App) => <Monogram name={app.name} size="sm" />;
/** Legend rows have a 16px icon slot, so the monogram is sized to fit instead of being clipped. */
const legendIcon = (app: App) => <Monogram name={app.name} size="xs" className="size-4 text-[8px]" />;

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

interface Section {
  id: "overview" | "cpu" | "memory" | "gpu" | "disk";
  label: string;
  icon: React.ReactNode;
  accent: Accent;
}

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: <RiLayoutGridLine />, accent: "blue" },
  { id: "cpu", label: "CPU", icon: <RiCpuLine />, accent: "blue" },
  { id: "memory", label: "Memory", icon: <RiRam2Line />, accent: "violet" },
  { id: "gpu", label: "GPU", icon: <RiStackLine />, accent: "pink" },
  { id: "disk", label: "Disk", icon: <RiHardDrive3Line />, accent: "amber" },
];

function useLiveReadings() {
  const cpu = useSampler(React.useMemo(() => walker(28, 9, 6, 92), []), {
    interval: 1000,
    capacity: 48,
    initial: seed(48, walker(28, 9, 6, 92)),
  });
  const gpu = useSampler(React.useMemo(() => walker(55, 12, 10, 95), []), {
    interval: 1000,
    capacity: 48,
    initial: seed(48, walker(55, 12, 10, 95)),
  });
  const memory = useSampler(React.useMemo(() => walker(50, 1.2, 40, 60), []), {
    interval: 1000,
    capacity: 48,
    initial: seed(48, walker(50, 1.2, 40, 60)),
  });
  const disk = useSampler(React.useMemo(() => walker(8, 6, 0, 40), []), {
    interval: 1000,
    capacity: 48,
    initial: seed(48, walker(8, 6, 0, 40)),
  });
  const network = useSampler(React.useMemo(() => walker(4, 5, 0, 30), []), {
    interval: 1000,
    capacity: 48,
    initial: seed(48, walker(4, 5, 0, 30)),
  });
  return { cpu: cpu.data, gpu: gpu.data, memory: memory.data, disk: disk.data, network: network.data };
}

const last = (data: number[]) => data[data.length - 1] ?? 0;
const avg = (data: number[]) => (data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0);
const peak = (data: number[]) => (data.length ? Math.max(...data) : 0);

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Overview({ live, onOpen }: { live: ReturnType<typeof useLiveReadings>; onOpen: (id: Section["id"]) => void }) {
  const cpu = last(live.cpu);
  const memory = last(live.memory);
  const byApp = topWithOther(APPS, {
    value: (a) => a.memoryGB,
    limit: 4,
    other: (rest, total) => ({ ...rest[0]!, id: "other", name: "Other", memoryGB: total, processes: 0 }),
  });
  const power = topWithOther(APPS, {
    value: (a) => a.watts,
    limit: 4,
    other: (rest, total) => ({ ...rest[0]!, id: "other", name: "Other", watts: total, processes: 0 }),
  });
  return (
    <div className="space-y-4">
      <div className="@container w-full">
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 2xl:grid-cols-3">
          <StatCard
            valueFont="sans"
            accent="blue"
            icon={<RiCpuLine />}
            label="CPU"
            onClick={() => onOpen("cpu")}
            caption="Now"
            value={Math.round(cpu)}
            unit="%"
            stats={[
              { label: "User", value: `${Math.round(cpu * 0.7)}%` },
              { label: "System", value: `${Math.round(cpu * 0.3)}%` },
              { label: "Average today", value: `${Math.round(avg(live.cpu))}%` },
            ]}
            trend={live.cpu}
            trendType="bar"
            trendPlacement="footer"
            trendMin={0}
            trendMax={100}
          />
          <StatCard
            valueFont="sans"
            accent="violet"
            icon={<RiRam2Line />}
            label="Memory"
            onClick={() => onOpen("memory")}
            caption="In use of 64 GB"
            value={memory.toFixed(2)}
            unit="GB"
            status={
              <StatusBadge status="success" size="sm">
                Normal
              </StatusBadge>
            }
            stats={[
              { label: "App", value: "22.49 GB", color: "blue" },
              { label: "Wired", value: "5.37 GB", color: "orange" },
              { label: "Compressed", value: "22.10 GB", color: "green" },
            ]}
            trend={live.memory}
            trendType="bar"
            trendPlacement="footer"
            trendMin={0}
            trendMax={64}
          />
          <StatCard
            valueFont="sans"
            accent="pink"
            icon={<RiStackLine />}
            label="GPU"
            onClick={() => onOpen("gpu")}
            caption="Apple M2 Max"
            value={Math.round(last(live.gpu))}
            unit="%"
            stats={[
              { label: "Memory", value: "1.69 GB" },
              { label: "Average", value: `${Math.round(avg(live.gpu))}%` },
              { label: "Peak", value: `${Math.round(peak(live.gpu))}%` },
            ]}
            trend={live.gpu}
            trendType="bar"
            trendPlacement="footer"
            trendMin={0}
            trendMax={100}
          />
          <StatCard
            valueFont="sans"
            accent="amber"
            icon={<RiHardDrive3Line />}
            label="Disk"
            onClick={() => onOpen("disk")}
            caption="Free of 994.66 GB"
            value="479.72"
            unit="GB"
            stats={[
              { label: "Reading", value: "7.2 MB/s" },
              { label: "Writing", value: `${last(live.disk).toFixed(1)} MB/s` },
              { label: "Written today", value: "39.8 GB" },
            ]}
            trend={live.disk}
            trendType="bar"
            trendPlacement="footer"
            trendMin={0}
            trendMax={40}
          />
          <StatCard
            valueFont="sans"
            accent="emerald"
            icon={<RiGlobalLine />}
            label="Network"
            href="#/components/metrics/dashboard"
            caption="Downloading"
            value={last(live.network).toFixed(1)}
            unit="MB/s"
            stats={[
              { label: "Uploading", value: "698 kB/s" },
              { label: "Today", value: "4.9 GB" },
              { label: "Last 7 days", value: "48.3 GB" },
            ]}
            trend={live.network}
            trendType="bar"
            trendPlacement="footer"
            trendMin={0}
            trendMax={30}
          />
          <StatCard
            valueFont="sans"
            accent="lime"
            icon={<RiBattery2ChargeLine />}
            label="Battery"
            href="#/components/metrics/dashboard"
            caption="On battery"
            value={63}
            unit="%"
            stats={[
              { label: "Remaining", value: "3h 15m" },
              { label: "Power draw", value: "13.5 W" },
              { label: "Health", value: "76%" },
            ]}
            trend={Array.from({ length: 48 }, () => 63)}
            trendType="bar"
            trendPlacement="footer"
            trendMin={0}
            trendMax={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          valueFont="sans"
          accent="blue"
          icon={<RiRam2Line />}
          label="Memory by type">
          <DonutChart
            data={[
              { name: "App", value: 22.15 },
              { name: "Wired", value: 5.67 },
              { name: "Compressed", value: 24.54 },
              { name: "Cached", value: 10.32 },
              { name: "Free", value: 1.32 },
            ]}
            index="name"
            colors={[ACCENT_COLORS.blue, ACCENT_COLORS.orange, ACCENT_COLORS.emerald, ACCENT_COLORS.slate, "var(--border)"]}
            size={140}
            thickness={14}
            centerValue="82%"
            centerLabel="in use"
            legend="right"
            legendValues
            valueFormatter={(v) => `${v.toFixed(2)} GB`}
            label="Memory by type"
          />
        </StatCard>
        <StatCard
          valueFont="sans"
          accent="violet"
          icon={<RiApps2Line />}
          label="Memory by app">
          <DonutChart
            data={byApp.map((a) => ({ name: a.name, value: a.memoryGB }))}
            index="name"
            colors={[ACCENT_COLORS.violet, "#a78bfa", "#7c6fd6", "#6d5bd0", "var(--border)"]}
            size={140}
            thickness={14}
            centerValue={`${APPS.reduce((s, a) => s + a.memoryGB, 0).toFixed(2)} GB`}
            centerLabel="all apps"
            legend="right"
            legendValues
            iconFor={(datum) => {
              const app = APPS.find((a) => a.name === datum.name);
              return app ? legendIcon(app) : null;
            }}
            valueFormatter={(v) => `${v.toFixed(2)} GB`}
            label="Memory by app"
          />
        </StatCard>
        <StatCard
          valueFont="sans"
          accent="green"
          icon={<RiFlashlightLine />}
          label="Power by app">
          <DonutChart
            data={power.map((a) => ({ name: a.name, value: a.watts * 1000 }))}
            index="name"
            colors={[ACCENT_COLORS.green, "#4ade80", "#22a356", "#16803f", "var(--border)"]}
            size={140}
            thickness={14}
            centerValue={`${APPS.reduce((s, a) => s + a.watts, 0).toFixed(1)} W`}
            centerLabel="all apps"
            legend="right"
            legendValues
            iconFor={(datum) => {
              const app = APPS.find((a) => a.name === datum.name);
              return app ? legendIcon(app) : null;
            }}
            valueFormatter={(v) => `${Math.round(v)} mW`}
            label="Power by app"
          />
        </StatCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail tabs                                                         */
/* ------------------------------------------------------------------ */

interface DetailConfig {
  caption: string;
  unit: string;
  series: number[];
  max: number;
  format: (v: number) => string;
  details: { label: string; value: string }[];
  cards: { label: string; icon: React.ReactNode; value: string; hint?: string; progress?: number }[];
  appValue: (a: App) => number;
  appLabel: (v: number) => string;
  column: string;
}

function detailConfig(id: Exclude<Section["id"], "overview">, live: ReturnType<typeof useLiveReadings>): DetailConfig {
  switch (id) {
    case "cpu":
      return {
        caption: "Now",
        unit: "%",
        series: live.cpu,
        max: 100,
        format: (v) => `${Math.round(v)}`,
        details: [
          { label: "Average today", value: `${Math.round(avg(live.cpu))}%` },
          { label: "Load", value: "6.75" },
        ],
        cards: [
          { label: "User", icon: <RiCpuLine />, value: `${Math.round(last(live.cpu) * 0.7)}%`, hint: "Your apps" },
          { label: "System", icon: <RiCpuLine />, value: `${Math.round(last(live.cpu) * 0.3)}%`, hint: "macOS" },
          { label: "Cores", icon: <RiFlashlightLine />, value: "12", hint: "8 performance · 4 efficiency" },
        ],
        appValue: (a) => a.cpu,
        appLabel: (v) => `${v.toFixed(1)}%`,
        column: "CPU",
      };
    case "memory":
      return {
        caption: "In use of 64 GB",
        unit: "GB",
        series: live.memory,
        max: 64,
        format: (v) => v.toFixed(2),
        details: [
          { label: "Free", value: `${(64 - last(live.memory)).toFixed(2)} GB` },
          { label: "Swap", value: "0 MB" },
        ],
        cards: [
          { label: "App", icon: <RiApps2Line />, value: "26.34 GB", progress: 41 },
          { label: "Wired", icon: <RiRam2Line />, value: "5.37 GB", progress: 8 },
          { label: "Compressed", icon: <RiRam2Line />, value: "22.39 GB", progress: 35 },
        ],
        appValue: (a) => a.memoryGB,
        appLabel: (v) => `${v.toFixed(2)} GB`,
        column: "Memory",
      };
    case "gpu":
      return {
        caption: "Apple M2 Max",
        unit: "%",
        series: live.gpu,
        max: 100,
        format: (v) => `${Math.round(v)}`,
        details: [
          { label: "Average", value: `${Math.round(avg(live.gpu))}%` },
          { label: "Peak", value: `${Math.round(peak(live.gpu))}%` },
        ],
        cards: [
          { label: "Memory", icon: <RiRam2Line />, value: "1.69 GB" },
          { label: "Average", icon: <RiStackLine />, value: `${Math.round(avg(live.gpu))}%` },
          { label: "Peak", icon: <RiFlashlightLine />, value: `${Math.round(peak(live.gpu))}%` },
        ],
        appValue: (a) => a.gpu,
        appLabel: (v) => `${v.toFixed(1)}%`,
        column: "GPU",
      };
    case "disk":
      return {
        caption: "Writing",
        unit: "MB/s",
        series: live.disk,
        max: 40,
        format: (v) => v.toFixed(1),
        details: [
          { label: "Used", value: "514.94 GB" },
          { label: "Written today", value: "40.1 GB" },
        ],
        cards: [
          { label: "Reading", icon: <RiHardDrive3Line />, value: "5.8 MB/s" },
          { label: "Free", icon: <RiHardDrive3Line />, value: "479.72 GB", progress: 48 },
          { label: "Volumes", icon: <RiHardDrive3Line />, value: "2", hint: "Macintosh HD · Backup" },
        ],
        appValue: (a) => a.diskMBs,
        appLabel: (v) => `${v.toFixed(1)} MB/s`,
        column: "Writing",
      };
  }
}

function Detail({ section, live }: { section: Section; live: ReturnType<typeof useLiveReadings> }) {
  const config = detailConfig(section.id as Exclude<Section["id"], "overview">, live);
  const ranked = [...APPS].sort((a, b) => config.appValue(b) - config.appValue(a));
  const top = ranked[0]!;
  const items: BarListItem[] = ranked.map((app) => ({
    id: app.id,
    name: app.name,
    description: `${app.processes} processes`,
    icon: appIcon(app),
    value: config.appValue(app),
    valueLabel: config.appLabel(config.appValue(app)),
  }));
  return (
    <div className="space-y-4">
      <MetricHero
        valueFont="sans"
        accent={section.accent}
        caption={config.caption}
        value={config.format(last(config.series))}
        unit={config.unit}
        details={config.details}
        series={config.series}
        min={0}
        max={config.max}
        chartHeight={180}
        chartLabel={`${section.label} over the last minute`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.cards.map((card) => (
          <StatCard
            valueFont="sans"
            key={card.label}
            accent={section.accent}
            labelTone="muted"
            iconPlacement="start"
            icon={card.icon}
            label={card.label}
            value={card.value}
            hint={card.hint}
            progress={card.progress}
            size="sm"
          />
        ))}
        <TopItemCard
          valueFont="sans"
          accent={section.accent}
          icon={<RiApps2Line />}
          item={top.name}
          itemIcon={appIcon(top)}
          value={config.appLabel(config.appValue(top))}
          onClick={() => undefined}
        />
      </div>
      <BarList
        accent={section.accent}
        items={items}
        header={{ label: "App", value: config.column }}
        highlightFirst
        limit={5}
        label={`Apps by ${config.column.toLowerCase()}`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Dashboard() {
  const live = useLiveReadings();
  const [tab, setTab] = React.useState<Section["id"]>("overview");
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Section["id"])} className="w-full space-y-4">
      <TabsList aria-label="Sections" className="max-w-full overflow-x-auto">
        {SECTIONS.map((s) => (
          <TabsTrigger key={s.id} value={s.id} accent={s.accent} icon={s.icon}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview">
        <Overview live={live} onOpen={setTab} />
      </TabsContent>
      {SECTIONS.filter((s) => s.id !== "overview").map((s) => (
        <TabsContent key={s.id} value={s.id}>
          <Detail section={s} live={live} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function MetricsPage() {
  return (
    <PageIntro
      eyebrow="Patterns"
      title="Metrics dashboard"
      description="A live system-monitor dashboard built only from Sutra parts: accent tabs, StatCard tiles with footer trends, DonutChart value legends, MetricHero, TopItemCard and BarList, fed by useSampler."
    >
      <Demo
        id="dashboard"
        title="Live dashboard"
        description="Each section has its own accent colour. Click a tile to open its tab; readings update every second."
        align="start"
      >
        <Dashboard />
      </Demo>
      <Demo
        id="loading"
        title="Loading states"
        description="Before the first readings arrive: skeletons in each component's real layout, so nothing jumps when data lands."
        align="start"
      >
        <div className="@container w-full">
          <div className="grid grid-cols-1 w-full gap-4 @2xl:grid-cols-2">
            <StatCard accent="blue" icon={<RiCpuLine />} label="CPU" caption="Now" value={0} unit="%" loading stats={[{ label: "User", value: "" }, { label: "System", value: "" }, { label: "Average today", value: "" }]} trend={[0]} trendType="bar" trendPlacement="footer" />
            <TopItemCard accent="blue" icon={<RiApps2Line />} item="" loading />
            <MetricHero className="md:col-span-2" accent="violet" caption="In use of 64 GB" value={undefined} unit="GB" details={[{ label: "Free", value: "" }, { label: "Swap", value: "" }]} chartHeight={160} loading />
            <BarList className="md:col-span-2" accent="violet" items={[]} header={{ label: "App", value: "Memory" }} label="Apps by memory" loading loadingRows={3} />
            <DonutChart data={[]} index="name" size={140} thickness={14} centerLabel="in use" legend="right" legendValues label="Memory by type" loading />
            <AreaChart data={[]} index="t" series={[{ key: "cpu", label: "CPU" }]} height={160} label="CPU history" loading />
            <Treemap className="md:col-span-2" data={{ id: "root", name: "Disk", children: [] }} label="Storage" height={200} legend loading />
          </div>
        </div>
      </Demo>
      <Demo
        id="bar-list"
        title="BarList"
        description="Ranked rows with a proportional bar under each value, a highlighted leader, and a show-all toggle."
        align="start"
      >
        <BarList
          className="w-full max-w-xl"
          accent="green"
          header={{ label: "App", value: "Downloading" }}
          highlightFirst
          limit={3}
          label="Apps by download speed"
          items={[
            { id: "safari", name: "Safari", description: "16 processes", value: 4.6, valueLabel: "4.6 MB/s" },
            { id: "chrome", name: "Google Chrome", description: "96 processes", value: 1.0, valueLabel: "1.0 MB/s" },
            { id: "slack", name: "Slack", description: "13 processes", value: 0.4, valueLabel: "403 kB/s" },
            { id: "mail", name: "Mail", description: "4 processes", value: 0.1, valueLabel: "96 kB/s" },
          ].map((item) => ({ ...item, icon: <Monogram name={item.name} size="sm" /> }))}
        />
      </Demo>
      <Demo
        id="breakdown"
        title="Breakdown legends"
        description="StackedMeter with a value-and-percent list legend, as in a per-container memory breakdown."
        align="start"
      >
        <StackedMeter
          className="w-full max-w-2xl"
          label="By container"
          legend="list"
          valueFormatter={(v) => `${v} MB`}
          parts={[
            { label: "postgres", value: 312, color: ACCENT_COLORS.blue },
            { label: "rabbitmq", value: 206, color: ACCENT_COLORS.orange },
            { label: "minio", value: 142, color: ACCENT_COLORS.emerald },
            { label: "redis", value: 14, color: ACCENT_COLORS.slate },
          ]}
        />
      </Demo>
    </PageIntro>
  );
}
