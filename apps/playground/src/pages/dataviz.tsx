import * as React from "react";
import {
  AreaChart,
  BarChart,
  Card,
  DonutChart,
  FunnelChart,
  Gauge,
  LineChart,
  Meter,
  MeterGroup,
  RadarChart,
  RingMeter,
  ScatterChart,
  StackedMeter,
  StatCard,
  StatGroup,
  WaterfallChart,
  type ChartDatum,
} from "@cleanprompt/sutra-ui";
import { RiCpuLine, RiCoinsLine, RiFlashlightLine, RiTimerLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* Deterministic pseudo-random so demos don't jump between renders. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(42);
const today = new Date(2026, 9, 18);
const daily: ChartDatum[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(today);
  date.setDate(today.getDate() - 29 + i);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const base = 1800 + i * 40 + (weekend ? -700 : 0);
  const requests = Math.round(base + rand() * 500);
  const prompt = Math.round(requests * (820 + rand() * 200));
  const completion = Math.round(requests * (260 + rand() * 120));
  return { date, requests, prompt, completion };
});

const busy = new Set([10, 11, 14, 15, 16]);
const hourly: ChartDatum[] = Array.from({ length: 24 }, (_, h) => {
  const work = h >= 9 && h <= 18 ? 1 : h >= 7 && h <= 21 ? 0.5 : 0.12;
  return { hour: `${String(h).padStart(2, "0")}h`, h, requests: Math.round(40 + work * 380 + rand() * 60 + (busy.has(h) ? 120 : 0)) };
});

const storage: ChartDatum[] = [
  { user: "alice", models: 412, datasets: 180, checkpoints: 260 },
  { user: "bob", models: 120, datasets: 520, checkpoints: 90 },
  { user: "carol", models: 300, datasets: 60, checkpoints: 410 },
  { user: "dmitri", models: 80, datasets: 140, checkpoints: 40 },
  { user: "eun-ji", models: 220, datasets: 300, checkpoints: 150 },
];

const members = ["Ana", "Ben", "Chen", "Dev", "Eli"];
const weeklyUsage: ChartDatum[] = Array.from({ length: 14 }, (_, d) => {
  const row: ChartDatum = { day: `Oct ${d + 5}` };
  members.forEach((m, i) => {
    row[m] = Math.min(100, Math.round(10 + d * (3 + i * 1.6) + rand() * 12));
  });
  return row;
});

const modelShare: ChartDatum[] = [
  { model: "llama-3.1-70b", value: 48210 },
  { model: "qwen2.5-32b", value: 31800 },
  { model: "mistral-small", value: 18420 },
  { model: "gemma-2-27b", value: 9120 },
  { model: "other", value: 3300 },
];

const gpus = ["GPU 0", "GPU 1", "GPU 2", "GPU 3"];
const gb = (v: number) => `${v.toFixed(1)} GB`;
const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const timeFmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function useLiveVram(windowSize = 40) {
  const make = React.useCallback((t: Date, prev?: ChartDatum): ChartDatum => {
    const row: ChartDatum = { t };
    gpus.forEach((g, i) => {
      const last = typeof prev?.[g] === "number" ? (prev[g] as number) : 20 + i * 14;
      row[g] = Math.max(2, Math.min(80, Math.round((last + (Math.random() - 0.48) * 6) * 10) / 10));
    });
    return row;
  }, []);
  const [data, setData] = React.useState<ChartDatum[]>(() => {
    const rows: ChartDatum[] = [];
    const now = Date.now();
    for (let i = windowSize - 1; i >= 0; i--) rows.push(make(new Date(now - i * 2000), rows[rows.length - 1]));
    return rows;
  });
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setData((rows) => [...rows.slice(1), make(new Date(), rows[rows.length - 1])]);
    }, 2000);
    return () => window.clearInterval(id);
  }, [make]);
  return data;
}

function useJitter(initial: number, spread: number, min = 0, max = 100) {
  const [v, setV] = React.useState(initial);
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setV((x) => Math.max(min, Math.min(max, Math.round((x + (Math.random() - 0.5) * spread) * 10) / 10)));
    }, 1800);
    return () => window.clearInterval(id);
  }, [spread, min, max]);
  return v;
}

function LiveVramChart() {
  const data = useLiveVram();
  return (
    <AreaChart
      data={data}
      index="t"
      series={gpus.map((g) => ({ key: g }))}
      valueFormatter={(v) => gb(v)}
      xAxis={{ formatter: (v) => (v instanceof Date ? timeFmt(v) : ""), tickCount: 5, label: "Time" }}
      yAxis={{ min: 0, max: 80, formatter: (v) => `${v}G` }}
      referenceLines={[{ value: 72, label: "90% of 80 GB", color: "destructive" }]}
      gradient={false}
      height={260}
      label="VRAM used per GPU, last 80 seconds"
    />
  );
}

function NodeMeters() {
  const cpu = useJitter(38, 14);
  const ram = useJitter(71, 6);
  const gpu = useJitter(88, 10);
  const vram = useJitter(62.1, 4, 0, 80);
  return (
    <MeterGroup aria-label="dgx-02 resources">
      <Meter label="CPU" value={cpu} caption="64 cores · load 24.3" />
      <Meter label="RAM" value={ram} valueText={`${((ram / 100) * 512).toFixed(0)} / 512 GB`} />
      <Meter label="GPU" value={gpu} />
      <Meter label="VRAM" value={vram} max={80} unit="GB" />
    </MeterGroup>
  );
}

function GpuGauges() {
  const temps = [useJitter(54, 6, 30, 100), useJitter(71, 6, 30, 100), useJitter(83, 5, 30, 100), useJitter(91, 4, 30, 100)];
  return (
    <div className="flex flex-wrap items-end justify-center gap-8">
      {temps.map((t, i) => (
        <Gauge key={i} value={t} max={100} unit="°C" label={`GPU ${i}`} thresholds={{ warn: 80, danger: 90 }} glow />
      ))}
    </div>
  );
}

/** Data visualization: charts, stat tiles, meters and gauges. */
/* Uneven samples: every 10 minutes, a missing reading at 02:00 and no data between 04:00 and 05:30. */
const timeStart = new Date(2026, 9, 19, 0, 0).getTime();
const timeSamples: ChartDatum[] = Array.from({ length: 48 }, (_, i) => timeStart + i * 10 * 60_000)
  .filter((t) => t < timeStart + 4 * 3_600_000 || t >= timeStart + 5.5 * 3_600_000)
  .map((t, i) => ({ t, used: t === timeStart + 2 * 3_600_000 ? null : Math.min(100, 8 + i * 1.6 + (i % 5) * 2) }));

/* New chart types: funnel, waterfall, scatter and radar demo data. */
const signupFunnel: ChartDatum[] = [
  { label: "Visited", value: 12480 },
  { label: "Viewed pricing", value: 6120 },
  { label: "Started trial", value: 2310 },
  { label: "Activated", value: 1480 },
  { label: "Subscribed", value: 412 },
];
const longFunnel: ChartDatum[] = [
  { label: "Impressions", value: 480000 },
  { label: "Clicks", value: 61200 },
  { label: "Landing views", value: 52800 },
  { label: "Sign-up started", value: 14900 },
  { label: "Email verified", value: 9800 },
  { label: "Profile completed", value: 7400 },
  { label: "First project", value: 4100 },
  { label: "Invited a teammate", value: 1650 },
  { label: "Upgraded to a paid plan", value: 520 },
];
const revenueBridge: ChartDatum[] = [
  { label: "Jan MRR", value: 1200, type: "total" },
  { label: "New", value: 340 },
  { label: "Expansion", value: 180 },
  { label: "Contraction", value: -90 },
  { label: "Churn", value: -210 },
  { label: "Apr MRR", type: "total" },
];
const cashFlow: ChartDatum[] = [
  { label: "Opening", value: 40, type: "total" },
  { label: "Sales", value: 120 },
  { label: "Payroll", value: -150 },
  { label: "Rent", value: -30 },
  { label: "Grants", value: 25 },
  { label: "Tax", value: -45 },
  { label: "Loan", value: 90 },
  { label: "Closing", type: "total" },
];
const weeklyNet: ChartDatum[] = (() => {
  const r = seeded(11);
  return Array.from({ length: 26 }, (_, i) => ({ label: `W${i + 1}`, value: Math.round((r() - 0.46) * 60) }));
})();
const modelRuns: ChartDatum[] = (() => {
  const r = seeded(5);
  return Array.from({ length: 36 }, () => {
    const latency = Math.round(120 + r() * 880);
    const quality = Math.round(Math.min(98, 52 + (1 - latency / 1100) * 18 + r() * 28));
    return { latency, small: quality, large: Math.min(99, quality + 6 + Math.round(r() * 5)), cost: Math.round(2 + r() * 38), requests: Math.round(100 + r() * 4000) };
  });
})();
const manyPoints: ChartDatum[] = (() => {
  const r = seeded(21);
  return Array.from({ length: 320 }, () => {
    const x = r() * 100;
    return { x: Math.round(x * 10) / 10, y: Math.round((x * 0.6 + (r() - 0.5) * 40 + 10) * 10) / 10, n: Math.round(r() * 60) };
  });
})();
const negativePoints: ChartDatum[] = (() => {
  const r = seeded(8);
  return Array.from({ length: 40 }, () => ({ x: Math.round((r() - 0.5) * 80) / 10, y: Math.round((r() - 0.5) * 60) / 10 }));
})();
const incidentTimes: ChartDatum[] = (() => {
  const r = seeded(31);
  const start = new Date(2026, 9, 1).getTime();
  return Array.from({ length: 28 }, () => ({ t: start + Math.round(r() * 20) * 86_400_000 + Math.round(r() * 20) * 3_600_000, minutes: Math.round(5 + r() * 85) }));
})();
const modelSkills: ChartDatum[] = [
  { metric: "Reasoning", sutra: 82, baseline: 64 },
  { metric: "Coding", sutra: 91, baseline: 72 },
  { metric: "Speed", sutra: 58, baseline: 88 },
  { metric: "Safety", sutra: 87, baseline: 70 },
  { metric: "Cost", sutra: 66, baseline: 81 },
  { metric: "Context", sutra: 94, baseline: 60 },
];
const longAxes: ChartDatum[] = [
  "Reading comprehension",
  "Mathematical reasoning",
  "Code generation",
  "Instruction following",
  "Multilingual translation",
  "Long-context retrieval",
  "Tool use reliability",
  "Refusal calibration",
  "Creative writing",
  "Summarisation faithfulness",
].map((metric, i) => ({ metric, a: 40 + ((i * 37) % 55), b: 35 + ((i * 53) % 60) }));
const trade: ChartDatum[] = [
  { metric: "Revenue", delta: 24, last: -8 },
  { metric: "Margin", delta: -12, last: 6 },
  { metric: "Churn", delta: 9, last: -15 },
  { metric: "NPS", delta: 14, last: 3 },
  { metric: "Latency", delta: -6, last: -2 },
];

export function DataVizPage() {
  const ctx = useJitter(64, 18);
  return (
    <PageIntro
      eyebrow="Components"
      title="Data visualization"
      description="A small SVG chart kit (area, line, bar, donut, funnel, waterfall, scatter, radar) with axes, crosshair tooltips, keyboard navigation and toggleable legends, plus KPI tiles, usage meters and gauges."
    >
      <Demo
        id="stat-card"
        title="StatCard & StatGroup"
        description="KPI tiles with delta coloring by intent (latency going up is bad), sparklines and a loading skeleton."
        align="start"
        canvasClassName="gap-6"
      >
        <StatGroup>
          <StatCard
            label="Requests (30d)"
            value={compact.format(daily.reduce((a, d) => a + (d.requests as number), 0))}
            delta={12.4}
            deltaLabel="vs prev."
            icon={<RiFlashlightLine />}
            tone="primary"
            trend={daily.map((d) => d.requests as number)}
          />
          <StatCard
            label="p95 latency"
            value="1,284"
            unit="ms"
            delta={8.1}
            deltaIntent="negative-is-good"
            icon={<RiTimerLine />}
            trend={[980, 1010, 1100, 1060, 1180, 1220, 1284]}
            trendType="line"
          />
          <StatCard label="Tokens" value="2.4B" delta={-3.2} hint="prompt 1.9B · completion 0.5B" icon={<RiCoinsLine />} />
          <StatCard label="Spend" value="$4,210" loading icon={<RiCpuLine />} />
        </StatGroup>
        <div className="space-y-2">
          <DemoLabel>Divided</DemoLabel>
          <StatGroup variant="divided" columns={6}>
            <StatCard size="sm" label="Tracked" value="42" />
            <StatCard size="sm" label="Reporting" value="39" />
            <StatCard size="sm" label="Median weekly" value="48%" />
            <StatCard size="sm" label="Highest weekly" value="97%" tone="destructive" />
            <StatCard size="sm" label="Over 80%" value="5" tone="warning" />
            <StatCard size="sm" label="Need attention" value="2" delta="+1" deltaIntent="negative-is-good" />
          </StatGroup>
        </div>
      </Demo>

      <Demo id="area-chart" title="AreaChart" description="Requests per day. Hover for the crosshair, or focus the chart and use the arrow keys." align="start">
        <AreaChart
          data={daily}
          index="date"
          series={[{ key: "requests", label: "Requests" }]}
          xAxis={{ label: "Date" }}
        />
      </Demo>

      <Demo id="stacked-area" title="Stacked area" description="Prompt vs. completion tokens per day." align="start">
        <AreaChart
          data={daily}
          index="date"
          stacked
          series={[
            { key: "prompt", label: "Prompt tokens", color: "muted" },
            { key: "completion", label: "Completion tokens" },
          ]}
          valueFormatter={(v) => compact.format(v)}
          xAxis={{ label: "Date" }}
        />
      </Demo>

      <Demo id="time-axis" title="Time axis" description="Samples placed by their real time: an hour with no data (maxGap breaks the line) and a single missing reading bridged with connectNulls, on a step curve." align="start">
        <LineChart
          className="w-full"
          data={timeSamples}
          index="t"
          series={[{ key: "used", label: "Usage %", color: "#d97757" }]}
          curve="step"
          connectNulls
          height={220}
          xAxis={{ type: "time", maxGap: 45 * 60_000 }}
          yAxis={{ domain: [0, 100] }}
          valueFormatter={(v) => `${Math.round(v)}%`}
          label="Usage over time"
        />
      </Demo>
      <Demo id="live-chart" title="Live multi-series" description="VRAM per GPU, rolling 40-sample window updated every 2 s, with a threshold line." align="start">
        <LiveVramChart />
      </Demo>

      <Demo id="bar-chart" title="BarChart" description="Requests by hour; busy hours are highlighted with colorFor." align="start">
        <BarChart
          data={hourly}
          index="hour"
          series={[{ key: "requests", label: "Requests", color: "var(--b-200)" }]}
          colorFor={(d) => (busy.has(d.h as number) ? "primary" : undefined)}
          xAxis={{ label: "Hour" }}
          height={220}
        />
      </Demo>

      <Demo id="stacked-bar" title="Stacked & horizontal bars" description="Storage per user (GB), stacked by type, as columns and as horizontal bars." align="start" canvasClassName="gap-10">
        <BarChart
          data={storage}
          index="user"
          stacked
          series={[
            { key: "models", label: "Models" },
            { key: "datasets", label: "Datasets" },
            { key: "checkpoints", label: "Checkpoints" },
          ]}
          valueFormatter={(v) => `${v} GB`}
          maxBarSize={32}
        />
        <BarChart
          data={storage}
          index="user"
          layout="horizontal"
          stacked
          series={[
            { key: "models", label: "Models" },
            { key: "datasets", label: "Datasets" },
            { key: "checkpoints", label: "Checkpoints" },
          ]}
          valueFormatter={(v) => `${v} GB`}
          legend={false}
          height={200}
        />
      </Demo>

      <Demo
        id="line-chart"
        title="LineChart"
        description="Weekly usage per member. Click a legend entry to toggle it, Alt/⌥-click or double-click to isolate one. The dashed line marks the 80% limit."
        align="start"
      >
        <LineChart
          data={weeklyUsage}
          index="day"
          series={members.map((m) => ({ key: m }))}
          curve="step"
          yAxis={{ min: 0, max: 100, formatter: (v) => `${v}%` }}
          valueFormatter={(v) => `${v}%`}
          referenceLines={[{ value: 80, label: "80% limit", color: "warning" }]}
          legend="top"
        />
      </Demo>

      <Demo id="donut-chart" title="DonutChart" description="Requests by model this week." align="start">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <DonutChart data={modelShare} index="model" valueFormatter={(v) => compact.format(v)} centerLabel="requests" legend="right" />
          <DonutChart
            data={[
              { part: "Generating", value: 71 },
              { part: "Queued", value: 22 },
              { part: "Prefill", value: 7 },
            ]}
            index="part"
            size={160}
            centerValue="1.8 s"
            centerLabel="avg latency"
            valueFormatter={(v) => `${v}%`}
          />
        </div>
      </Demo>

      <Demo
        id="funnel-chart"
        title="FunnelChart"
        description="Stages that narrow with the value, with the conversion from the stage before (or from the top). Hover a stage, or focus the chart and use the arrow keys."
        align="start"
      >
        <div className="@container space-y-8">
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Default: share of the previous stage</DemoLabel>
              <FunnelChart data={signupFunnel} valueFormatter={(v) => v.toLocaleString("en-US")} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>conversion=&quot;first&quot;, separate bars, own colors</DemoLabel>
              <FunnelChart
                data={signupFunnel}
                conversion="first"
                connected={false}
                valueFormatter={(v) => v.toLocaleString("en-US")}
                colors={["info", "primary", "warning", "success", "destructive"]}
              />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <DemoLabel>Many stages, rates hidden, formatted values</DemoLabel>
            <FunnelChart data={longFunnel} conversion={false} valueFormatter={(v) => compact.format(v)} color="success" height={380} />
          </div>
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Loading</DemoLabel>
              <FunnelChart data={[]} loading />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Empty</DemoLabel>
              <FunnelChart data={[]} emptyState="No visits this week" />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Narrow container</DemoLabel>
              <div className="w-full max-w-[260px]">
                <FunnelChart data={signupFunnel} valueFormatter={(v) => compact.format(v)} />
              </div>
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="waterfall-chart"
        title="WaterfallChart"
        description="A running total built from increases and decreases. Rows of type total stand on zero (with no value they show the running total). Signs and the legend carry the meaning, not just color."
        align="start"
      >
        <div className="@container space-y-8">
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Monthly recurring revenue bridge</DemoLabel>
              <WaterfallChart data={revenueBridge} valueFormatter={(v) => `$${v}k`} yAxis={{ formatter: (v) => `$${v}k` }} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Negative running total, subtotals, target line</DemoLabel>
              <WaterfallChart
                data={cashFlow.map((d) => (d.label === "Tax" ? { label: "Subtotal", type: "subtotal" } : d))}
                valueFormatter={(v) => `${v}k`}
                referenceLines={[{ value: 50, label: "Reserve", color: "warning" }]}
                kindLabels={{ increase: "Inflow", decrease: "Outflow" }}
              />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <DemoLabel>Many points: weekly net change, labels thin out</DemoLabel>
            <WaterfallChart data={weeklyNet} connectors={false} height={240} />
          </div>
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Loading</DemoLabel>
              <WaterfallChart data={[]} loading height={200} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Empty</DemoLabel>
              <WaterfallChart data={[]} emptyState="No movements yet" height={200} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Narrow container</DemoLabel>
              <div className="w-full max-w-[260px]">
                <WaterfallChart data={revenueBridge} height={200} />
              </div>
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="scatter-chart"
        title="ScatterChart"
        description="Points on two axes that fit the data (no forced zero). A sizeKey turns points into bubbles: the area, not the radius, follows the value. Hover picks the nearest point; the keyboard steps through them in x order."
        align="start"
      >
        <div className="@container space-y-8">
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Two series: latency against quality</DemoLabel>
              <ScatterChart
                data={modelRuns}
                index="latency"
                series={[
                  { key: "small", label: "Small model" },
                  { key: "large", label: "Large model" },
                ]}
                xAxis={{ label: "Latency", formatter: (v) => `${v} ms` }}
                yAxis={{ formatter: (v) => `${v}%` }}
                valueFormatter={(v) => `${v}%`}
                referenceLines={[{ value: 80, label: "Target", color: "success" }]}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Bubbles: size is requests</DemoLabel>
              <ScatterChart
                data={modelRuns}
                index="latency"
                series={[{ key: "large", label: "Quality", sizeKey: "requests", sizeLabel: "Requests", color: "info" }]}
                xAxis={{ label: "Latency", formatter: (v) => `${v} ms` }}
                valueFormatter={(v) => `${v}%`}
                sizeFormatter={(v) => v.toLocaleString("en-US")}
                bubbleSize={[5, 24]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Many points (320), small markers</DemoLabel>
              <ScatterChart data={manyPoints} index="x" series={[{ key: "y", label: "Score" }]} pointSize={3} height={260} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Negative values on both axes</DemoLabel>
              <ScatterChart
                data={negativePoints}
                index="x"
                series={[{ key: "y", label: "Residual", color: "warning" }]}
                referenceLines={[{ value: 0 }, { axis: "x", value: 0 }]}
                height={260}
              />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <DemoLabel>Time axis: incident duration</DemoLabel>
            <ScatterChart
              data={incidentTimes}
              index="t"
              series={[{ key: "minutes", label: "Duration", color: "destructive" }]}
              xAxis={{ type: "time", label: "Started" }}
              valueFormatter={(v) => `${v} min`}
              height={220}
            />
          </div>
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Loading</DemoLabel>
              <ScatterChart data={[]} index="x" series={[{ key: "y" }, { key: "z" }]} loading height={200} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Empty</DemoLabel>
              <ScatterChart data={[]} index="x" series={[{ key: "y" }]} emptyState="No runs recorded" height={200} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Narrow container</DemoLabel>
              <div className="w-full max-w-[260px]">
                <ScatterChart data={modelRuns} index="latency" series={[{ key: "large", sizeKey: "requests" }]} height={200} />
              </div>
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="radar-chart"
        title="RadarChart"
        description="Several measures on spokes from one center, one polygon per series. Hover or arrow through the spokes to read every series at once."
        align="start"
      >
        <div className="@container space-y-8">
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Two models, fixed 0 to 100 domain</DemoLabel>
              <RadarChart
                data={modelSkills}
                index="metric"
                series={[
                  { key: "sutra", label: "Sutra" },
                  { key: "baseline", label: "Baseline" },
                ]}
                domain={[0, 100]}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Circle rings, no fill, no dots</DemoLabel>
              <RadarChart
                data={modelSkills}
                index="metric"
                series={[{ key: "sutra", label: "Sutra", color: "success" }]}
                domain={[0, 100]}
                shape="circle"
                fill={false}
                dots={false}
                levels={5}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Many spokes with long names</DemoLabel>
              <RadarChart
                data={longAxes}
                index="metric"
                series={[
                  { key: "a", label: "Run A" },
                  { key: "b", label: "Run B" },
                ]}
                height={380}
                domain={[0, 100]}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Negative values (change vs. plan)</DemoLabel>
              <RadarChart
                data={trade}
                index="metric"
                series={[
                  { key: "delta", label: "This quarter", color: "info" },
                  { key: "last", label: "Last quarter", color: "warning" },
                ]}
                valueFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
                height={380}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-3">
            <div className="min-w-0 space-y-2">
              <DemoLabel>Loading</DemoLabel>
              <RadarChart data={[]} index="metric" series={[{ key: "a" }, { key: "b" }]} loading height={240} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Empty</DemoLabel>
              <RadarChart data={[]} index="metric" series={[{ key: "a" }]} emptyState="Nothing to compare" height={240} />
            </div>
            <div className="min-w-0 space-y-2">
              <DemoLabel>Narrow container</DemoLabel>
              <div className="w-full max-w-[260px]">
                <RadarChart data={longAxes.slice(0, 6)} index="metric" series={[{ key: "a", label: "Run A" }]} height={240} domain={[0, 100]} />
              </div>
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="meter" title="Meter" description="Usage meters auto-color at 75% (warning) and 90% (danger). Values update live." align="start" canvasClassName="gap-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card className="p-4">
            <p className="mb-3 text-sm font-semibold">dgx-02</p>
            <NodeMeters />
          </Card>
          <div className="space-y-5">
            <Meter label="5-hour window" value={42} caption="resets in 2h 14m" size="sm" />
            <Meter label="Weekly" value={81} caption="resets Mon 09:00" size="sm" />
            <Meter label="Opus weekly" value={96} caption="resets Mon 09:00" size="sm" />
            <Meter label="Battery-style segments" value={64} segments={12} size="lg" />
          </div>
        </div>
      </Demo>

      <Demo id="stacked-meter" title="StackedMeter" description="One bar, several parts: storage breakdown and request time split." align="start" canvasClassName="gap-8">
        <StackedMeter
          label="Home quota"
          max={2000}
          valueFormatter={(v) => `${v} GB`}
          parts={[
            { label: "Models", value: 812 },
            { label: "Datasets", value: 430 },
            { label: "Checkpoints", value: 260 },
            { label: "Other", value: 95, color: "muted" },
          ]}
          caption="403 GB free"
        />
        <StackedMeter
          label="Time per request"
          valueText="1.8 s avg"
          valueFormatter={(v) => `${v}%`}
          showPercent
          size="lg"
          parts={[
            { label: "Queue wait", value: 22, color: "warning" },
            { label: "Prefill", value: 7, color: "info" },
            { label: "Generate", value: 71, color: "primary" },
          ]}
        />
      </Demo>

      <Demo id="gauge" title="Gauge" description="GPU temperatures: 270° arc gauges, warning at 80 °C, danger at 90 °C, with glow.">
        <div className="flex w-full flex-col items-center gap-8">
          <GpuGauges />
          <div className="flex flex-wrap items-end justify-center gap-8">
            <Gauge size="sm" value={34} label="Fan" unit="%" />
            <Gauge size="md" value={62} label="Power" unit="W" max={300} />
            <Gauge size="lg" value={7.2} label="Utilization" max={10} startAngle={-90} endAngle={90} valueFormatter={(v) => v.toFixed(1)} />
            <Gauge
              size="md"
              value={66}
              label="Custom stops"
              unit="°"
              colorStops={[
                { value: 0, color: "success" },
                { value: 60, color: "#ea580c" },
                { value: 85, color: "destructive" },
              ]}
            />
          </div>
        </div>
      </Demo>

      <Demo id="ring-meter" title="RingMeter" description="Compact ring for AI context-window usage; shows the percent from 50% up.">
        <div className="flex flex-wrap items-center gap-6">
          <RingMeter value={18} label="Context window" />
          <RingMeter value={ctx} label="Context window" />
          <RingMeter value={82} label="Context window" />
          <RingMeter value={97} label="Context window" size={28} />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-control border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            <RingMeter value={ctx} label="Context used" showValueAbove={0} />
            <span>{Math.round((ctx / 100) * 200)}k / 200k</span>
          </button>
        </div>
      </Demo>
    </PageIntro>
  );
}

export default DataVizPage;
