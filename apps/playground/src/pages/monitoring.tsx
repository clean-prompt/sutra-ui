import "@xterm/xterm/css/xterm.css";
import * as React from "react";
import {
  AlertGroup,
  Badge,
  Button,
  CalendarHeatmap,
  GpuCard,
  HeatmapGrid,
  JsonViewer,
  ModelTable,
  NodeCard,
  NodeGrid,
  NodeMiniChart,
  ProcessTable,
  RequestInspector,
  RequestLogTable,
  ResourceHero,
  TimelineBar,
  UptimeBar,
  type AlertItem,
  type KillSignal,
  type ModelAction,
  type ModelInfo,
  type ModelTestResult,
  type NodeStatus,
  type ProcessInfo,
  type RequestLogRecord,
  type UptimeBucket,
} from "@sutra/ui";
import { Terminal, TerminalSessionPicker, type TerminalConnection, type TerminalHandle, type TerminalSession } from "@sutra/ui/terminal";
import { RiCpuLine, RiRefreshLine, RiRouterLine, RiServerLine, RiTerminalLine } from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Fake data helpers                                                   */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const jitter = (v: number, amount: number, lo = 0, hi = 100) => clamp(v + (Math.random() - 0.5) * amount, lo, hi);
const GB = 1024 ** 3;
const MB = 1024 ** 2;

function useInterval(fn: () => void, ms: number) {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => {
    const t = setInterval(() => ref.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* ------------------------------------------------------------------ */

interface FakeNode {
  id: string;
  name: string;
  host: string;
  status: NodeStatus;
  priority?: boolean;
  cores: number[];
  ramTotal: number;
  ramUsed: number;
  gpu: number | null;
  vram: { used: number; total: number } | null;
  history: number[];
}

const initialNodes: FakeNode[] = [
  {
    id: "dilab-01",
    name: "dilab-01",
    host: "10.0.0.11 · 4× A6000",
    status: "online",
    priority: true,
    cores: Array.from({ length: 40 }, () => Math.random() * 80),
    ramTotal: 256,
    ramUsed: 180,
    gpu: 78,
    vram: { used: 150, total: 192 },
    history: Array.from({ length: 30 }, () => 40 + Math.random() * 40),
  },
  {
    id: "dilab-02",
    name: "dilab-02",
    host: "10.0.0.12 · 2× RTX 4090",
    status: "online",
    cores: Array.from({ length: 16 }, () => Math.random() * 50),
    ramTotal: 128,
    ramUsed: 52,
    gpu: 24,
    vram: { used: 9, total: 48 },
    history: Array.from({ length: 30 }, () => 10 + Math.random() * 30),
  },
  {
    id: "storage-01",
    name: "storage-01",
    host: "10.0.0.20 · NAS",
    status: "online",
    cores: Array.from({ length: 8 }, () => Math.random() * 20),
    ramTotal: 32,
    ramUsed: 12,
    gpu: null,
    vram: null,
    history: Array.from({ length: 30 }, () => 5 + Math.random() * 10),
  },
];

function NodeGridDemo() {
  const [nodes, setNodes] = React.useState(initialNodes);
  const [states, setStates] = React.useState<Record<string, NodeStatus>>({});

  useInterval(() => {
    setNodes((prev) =>
      prev.map((n) => {
        const cores = n.cores.map((c) => jitter(c, 30));
        const avg = cores.reduce((s, c) => s + c, 0) / cores.length;
        return {
          ...n,
          cores,
          ramUsed: jitter(n.ramUsed, n.ramTotal * 0.04, 0, n.ramTotal),
          gpu: n.gpu == null ? null : jitter(n.gpu, 14),
          vram: n.vram ? { ...n.vram, used: jitter(n.vram.used, 6, 0, n.vram.total) } : null,
          history: [...n.history.slice(1), avg],
        };
      })
    );
  }, 1500);

  const cycle = (id: string) =>
    setStates((s) => {
      const order: NodeStatus[] = ["online", "connecting", "error", "offline"];
      const next = order[(order.indexOf(s[id] ?? "online") + 1) % order.length];
      return { ...s, [id]: next };
    });

  return (
    <NodeGrid className="w-full">
      {nodes.map((n) => {
        const status = states[n.id] ?? n.status;
        const avg = n.cores.reduce((s, c) => s + c, 0) / n.cores.length;
        return (
          <NodeCard
            key={n.id}
            name={n.name}
            description={n.host}
            icon={n.gpu == null ? <RiServerLine /> : <RiCpuLine />}
            badges={n.priority ? <Badge size="sm" tone="warning">Priority</Badge> : undefined}
            status={status}
            uptime="12d 4h"
            cpu={avg}
            ram={{ used: Math.round(n.ramUsed), total: n.ramTotal }}
            gpu={n.gpu}
            vram={n.vram ? { used: Math.round(n.vram.used), total: n.vram.total } : undefined}
            noGpu={n.gpu == null}
            error="ssh: connect to host 10.0.0.12 port 22: Connection timed out"
            onRetry={() => setStates((s) => ({ ...s, [n.id]: "connecting" }))}
            chart={<NodeMiniChart label="CPU · 45s" data={n.history} value={`${avg.toFixed(0)}%`} max={100} />}
            coreGrid={
              <HeatmapGrid
                data={n.cores}
                shape="bar"
                columns={n.cores.length > 20 ? 20 : 10}
                cellHeight={n.cores.length > 20 ? 28 : 36}
                gap={2}
                label={`${n.name} CPU cores`}
                cellLabel={(i) => `Core ${i}`}
                showIndices={n.cores.length > 20 ? 5 : 1}
              />
            }
            footer={
              <>
                <Button size="xs" variant="ghost" onClick={() => cycle(n.id)}>
                  Cycle state
                </Button>
                <Button size="xs" variant="outline" leadingIcon={<RiTerminalLine />}>
                  Shell
                </Button>
              </>
            }
          />
        );
      })}
    </NodeGrid>
  );
}

/* ------------------------------------------------------------------ */
/* GPUs                                                                */
/* ------------------------------------------------------------------ */

function GpuCardsDemo() {
  const [gpus, setGpus] = React.useState(() =>
    Array.from({ length: 4 }, (_, i) => ({ used: 10 + i * 9, util: 20 + i * 18, temp: 52 + i * 9, procs: i }))
  );
  useInterval(() => {
    setGpus((prev) => prev.map((g) => ({ ...g, used: jitter(g.used, 3, 0, 48), util: jitter(g.util, 20), temp: jitter(g.temp, 4, 30, 95) })));
  }, 2000);
  return (
    <NodeGrid minCardWidth={220} className="w-full">
      {gpus.map((g, i) => (
        <GpuCard
          key={i}
          index={i}
          model="NVIDIA RTX A6000"
          memoryUsed={Number(g.used.toFixed(1))}
          memoryTotal={48}
          utilization={g.util}
          temperature={g.temp}
          processes={g.procs}
          power={120 + g.util * 1.8}
          powerLimit={300}
        />
      ))}
    </NodeGrid>
  );
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

const now0 = Date.now();
const alertsData: AlertItem[] = [
  { id: "a1", severity: "critical", message: "GPU 3 on dilab-01 at 92°C (threshold 85°C)", category: "thermal", source: "dilab-01", time: now0 - 60_000, postRepair: true },
  { id: "a2", severity: "critical", message: "Unexpected listening port 4444/tcp", category: "security", source: "dilab-02", time: now0 - 8 * 60_000 },
  { id: "a3", severity: "warning", message: "/data is 87% full", category: "storage", source: "storage-01", time: now0 - 3600_000 },
  { id: "a4", severity: "warning", message: "RAM at 82% for 10 minutes", category: "memory", source: "dilab-01", time: now0 - 20 * 60_000 },
  { id: "a5", severity: "warning", message: "Last backup is 14 days old", category: "operational", source: "storage-01", time: now0 - 86_400_000 },
];

function AlertGroupDemo() {
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  return (
    <div className="flex w-full flex-col gap-3">
      <AlertGroup alerts={alertsData} dismissedIds={dismissed} onDismissedChange={setDismissed} />
      {dismissed.length ? (
        <Button size="sm" variant="outline" className="self-start" leadingIcon={<RiRefreshLine />} onClick={() => setDismissed([])}>
          Restore {dismissed.length} dismissed
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Processes                                                           */
/* ------------------------------------------------------------------ */

const commands = [
  ["python", "python train.py --model llama3-8b --epochs 3 --lr 2e-5 --bf16 --output /data/runs/exp42"],
  ["jupyter", "jupyter-lab --no-browser --port 8888 --ip 0.0.0.0"],
  ["vllm", "python -m vllm.entrypoints.openai.api_server --model qwen3-32b --tensor-parallel-size 2"],
  ["tmux", "tmux new -s main"],
  ["rsync", "rsync -avz /data/datasets/ storage-01:/backup/datasets/"],
  ["node", "node server.js"],
];
const users = ["alice", "bob", "carol", "root"];
let nextPid = 4100;
const makeProc = (): ProcessInfo => {
  const [name, command] = commands[Math.floor(Math.random() * commands.length)];
  const gpu = name === "python" || name === "vllm";
  return {
    pid: nextPid++,
    name,
    command,
    user: users[Math.floor(Math.random() * users.length)],
    cpu: Math.random() * (gpu ? 100 : 20),
    memory: (0.2 + Math.random() * (gpu ? 30 : 2)) * GB,
    vram: gpu ? (4 + Math.random() * 40) * GB : null,
    gpuIndex: gpu ? Math.floor(Math.random() * 4) : undefined,
    state: Math.random() < 0.08 ? "zombie" : Math.random() < 0.6 ? "running" : "sleeping",
    startedAt: Date.now() - Math.random() * 3 * 86_400_000,
  };
};

function ProcessTableDemo() {
  const [procs, setProcs] = React.useState<ProcessInfo[]>(() => Array.from({ length: 8 }, makeProc));
  const [pending, setPending] = React.useState<number[]>([]);
  const [log, setLog] = React.useState<string[]>([]);
  useInterval(() => {
    setProcs((prev) => {
      let next: ProcessInfo[] = prev.map((p) => ({ ...p, cpu: jitter(p.cpu ?? 0, 12), memory: Math.max(MB, (p.memory ?? 0) + (Math.random() - 0.5) * 200 * MB) }));
      if (Math.random() < 0.3 && next.length < 12) next = [...next, makeProc()];
      if (Math.random() < 0.15 && next.length > 5) next = next.filter((_, i) => i !== Math.floor(Math.random() * next.length));
      return next;
    });
  }, 2500);
  const kill = async (p: ProcessInfo, signal: KillSignal) => {
    setPending((s) => [...s, p.pid]);
    await new Promise((r) => setTimeout(r, signal === "SIGKILL" ? 400 : 1200));
    setPending((s) => s.filter((x) => x !== p.pid));
    setProcs((s) => s.filter((x) => x.pid !== p.pid));
    setLog((l) => [`${signal} → ${p.pid} (${p.name})`, ...l].slice(0, 3));
  };
  return (
    <div className="flex w-full flex-col gap-2">
      <ProcessTable processes={procs} onKill={kill} pendingPids={pending} canKill={(p) => p.user !== "root"} maxHeight={420} />
      {log.length ? <p className="font-mono text-xs text-muted-foreground">{log.join("  ·  ")}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timelines                                                           */
/* ------------------------------------------------------------------ */

function TimelineDemo() {
  const [now, setNow] = React.useState(() => Date.now());
  useInterval(() => setNow(Date.now()), 5000);
  const from = now - 6 * 3600_000;
  const h = (n: number) => now - n * 3600_000;
  return (
    <div className="flex w-full flex-col gap-8">
      <TimelineBar
        label="SSH sessions, last 6 hours"
        from={from}
        to={now + 15 * 60_000}
        now={now}
        lanes={[
          {
            id: "alice",
            label: "alice@dilab-01",
            spans: [
              { id: "1", start: h(5.8), end: h(4.2), label: "ssh", tone: "info" },
              { id: "2", start: h(3), label: "tmux main", tone: "success", live: true, detail: "from 192.168.1.20" },
            ],
          },
          { id: "bob", label: "bob@dilab-02", spans: [{ id: "3", start: h(4.5), end: h(1.1), label: "jupyter", tone: "primary" }] },
          {
            id: "carol",
            label: "carol@dilab-01",
            spans: [
              { id: "4", start: h(7), end: h(5), label: "vscode", tone: "neutral" },
              { id: "5", start: h(0.6), label: "ssh", tone: "warning", live: true },
            ],
          },
        ]}
      />
      <TimelineBar
        label="GPU occupancy"
        from={from}
        to={now}
        now={now}
        laneHeight={18}
        ticks={6}
        lanes={[0, 1, 2, 3].map((g) => ({
          id: `gpu${g}`,
          label: `GPU ${g}`,
          spans:
            g === 3
              ? []
              : [
                  { id: `${g}a`, start: h(5.5 - g), end: h(3.5 - g * 0.5), label: g === 0 ? "train exp41" : "vllm qwen3", tone: g === 0 ? "primary" : "info" },
                  { id: `${g}b`, start: h(2 - g * 0.3), live: true, label: "train exp42", tone: "success" },
                ],
        }))}
      />
    </div>
  );
}

const uptimeBuckets = (seed: number): UptimeBucket[] =>
  Array.from({ length: 90 }, (_, i) => {
    const d = new Date(Date.now() - (89 - i) * 86_400_000);
    const r = Math.sin(i * 12.9898 + seed) * 43758.5453;
    const f = r - Math.floor(r);
    const status = i < 6 && seed === 2 ? "no-data" : f < 0.03 ? "down" : f < 0.09 ? "degraded" : "up";
    return { status, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), detail: status === "down" ? "Outage 23m" : undefined };
  });

function UptimeDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      <UptimeBar label="Model gateway" buckets={uptimeBuckets(1)} startLabel="90 days ago" endLabel="Today" />
      <UptimeBar label="dilab-01 SSH" buckets={uptimeBuckets(2)} startLabel="90 days ago" endLabel="Today" height={24} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar heatmap                                                    */
/* ------------------------------------------------------------------ */

const calendarData = Array.from({ length: 365 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const r = Math.abs(Math.sin(i * 7.13)) * (weekend ? 4 : 14);
  return { date: d, value: Math.random() < 0.18 ? 0 : Math.round(r) };
});

function CalendarDemo() {
  return (
    <div className="flex w-full flex-col gap-8">
      <CalendarHeatmap data={calendarData} unit="GPU hours" />
      <div className="flex flex-wrap items-start gap-8">
        <CalendarHeatmap data={calendarData} mode="month" unit="sessions" scale="success" />
        <div className="min-w-64 flex-1">
          <p className="mb-2 text-xs font-medium text-muted-foreground">HeatmapGrid · 8×8 utilization matrix, custom stops</p>
          <HeatmapGrid
            data={Array.from({ length: 64 }, (_, i) => Math.round(Math.abs(Math.sin(i * 1.7)) * 100))}
            columns={8}
            cellSize={24}
            legend
            colorStops={[
              { value: 0, color: "var(--muted)", label: "idle" },
              { value: 25, color: "color-mix(in oklab, var(--primary) 45%, var(--muted))", label: "≥25%" },
              { value: 60, color: "var(--primary)", label: "≥60%" },
              { value: 90, color: "var(--destructive)", label: "≥90%" },
            ]}
            label="GPU utilization matrix"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* JSON / request logs                                                 */
/* ------------------------------------------------------------------ */

const jsonSample: Record<string, unknown> = {
  node: "dilab-01",
  healthy: true,
  uptime_s: 1_052_100,
  load: [3.12, 2.88, 2.4],
  gpus: Array.from({ length: 4 }, (_, i) => ({ index: i, name: "RTX A6000", memory: { used_mb: 12_000 + i * 4000, total_mb: 49_140 }, temp_c: 55 + i * 8, processes: [] })),
  samples: Array.from({ length: 240 }, (_, i) => Math.round(40 + Math.sin(i / 8) * 30)),
  last_error: null,
  "kernel version": "6.8.0-45-generic",
};
jsonSample.self = jsonSample;

const recordModels = ["qwen3-8b", "qwen3-32b", "llama3.1-70b", "gemma4-e4b"];
const identities = ["alice", "bob", "ci-bot", "notebook"];
const fakeRecords: RequestLogRecord[] = Array.from({ length: 64 }, (_, i) => {
  const model = recordModels[i % recordModels.length];
  const status = i % 11 === 0 ? 502 : i % 7 === 0 ? 429 : 200;
  const latency = status === 200 ? 300 + ((i * 937) % 12000) : 30_000;
  const question = ["Summarize this log line", "Write a haiku about GPUs", "What is 17 × 23?", "Translate 'hello' to Korean"][i % 4];
  const answer = ["Disk is nearly full on /data.", "Fans spin, tensors flow / warm silicon hums at night / loss curve bending down", "391", "안녕하세요"][i % 4];
  return {
    id: `chatcmpl-${(0x9a3f00 + i * 7919).toString(16)}`,
    timestamp: Date.now() - i * 47_000,
    method: "POST",
    path: "/v1/chat/completions",
    model,
    identity: identities[i % identities.length],
    status,
    latencyMs: latency,
    stream: i % 3 === 0,
    request: {
      model,
      temperature: 0.7,
      max_tokens: 512,
      stream: i % 3 === 0,
      messages: [
        { role: "system", content: "You are a concise assistant." },
        { role: "user", content: question },
      ],
    },
    response:
      status === 200
        ? {
            id: `chatcmpl-${i}`,
            choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: answer, reasoning_content: i % 2 ? "Short request; answer directly without preamble." : undefined } }],
            usage: { prompt_tokens: 24 + i, completion_tokens: answer.length },
          }
        : undefined,
    error: status === 502 ? { type: "upstream_error", message: `upstream ${model} timed out after 30s (attempt 3/3)` } : status === 429 ? "rate limited: 60 requests/min exceeded for key 'ci-bot'" : undefined,
  };
});

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

const initialModels: ModelInfo[] = [
  { name: "qwen3-8b", state: "ready", info: "8B · BF16 · 32k ctx", download: { status: "cached", size: "16 GB" }, gpus: [0], vram: 18.4, coldStartMs: 41_000, wakeMs: 1_900, idleSeconds: 42 },
  { name: "qwen3-32b", state: "sleeping", info: "32B · FP8 · 32k ctx · TP2", download: { status: "cached", size: "33 GB" }, gpus: [1, 2], vram: 2.1, coldStartMs: 96_000, wakeMs: 4_200, pinned: true, idleSeconds: 1800 },
  { name: "qwen3-235b-a22b", state: "stopped", info: "235B-A22B · AWQ (community)", download: { status: "partial", progress: 61, size: "118 GB" }, vram: 124 },
  { name: "llama3.1-70b", state: "stopped", info: "70B · AWQ · 16k ctx", download: { status: "cached", size: "39 GB" }, vram: 42, blocked: "Needs 42 GB, 31 GB free", coldStartMs: 120_000 },
  { name: "llama3.1-8b", state: "stopped", info: "8B · BF16", download: { status: "missing", size: "16 GB" } },
  { name: "gemma4-e4b", state: "downloading", info: "4B · BF16", download: { status: "downloading", progress: 12, size: "9 GB" } },
  { name: "mistral-7b", state: "failed", info: "7B · BF16", download: { status: "cached", size: "14 GB" }, error: "CUDA out of memory while allocating KV cache" },
];

function ModelTableDemo() {
  const [models, setModels] = React.useState(initialModels);
  const [pending, setPending] = React.useState<Record<string, ModelAction | null>>({});
  const [tests, setTests] = React.useState<Record<string, ModelTestResult | null>>({});

  useInterval(() => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.state !== "downloading" || !m.download) return m;
        const progress = (m.download.progress ?? 0) + 4;
        return progress >= 100
          ? { ...m, state: "stopped", download: { ...m.download, status: "cached", progress: 100 } }
          : { ...m, download: { ...m.download, progress } };
      })
    );
  }, 800);

  const patch = (name: string, p: Partial<ModelInfo>) => setModels((s) => s.map((m) => (m.name === name ? { ...m, ...p } : m)));

  const onAction = async (m: ModelInfo, a: ModelAction) => {
    if (a === "pin" || a === "unpin") return patch(m.name, { pinned: a === "pin" });
    if (a === "test") {
      setTests((t) => ({ ...t, [m.name]: { ok: true, running: true } }));
      await new Promise((r) => setTimeout(r, 900));
      setTests((t) => ({ ...t, [m.name]: { ok: true, latencyMs: 640 + Math.random() * 300, tokensPerSecond: 40 + Math.random() * 30, reply: "Hello! How can I help you today?" } }));
      return;
    }
    if (a === "download") return patch(m.name, { state: "downloading", download: { ...m.download, status: "downloading", progress: 0 } });
    if (a === "cancel") return patch(m.name, { state: "stopped", download: { ...m.download, status: "partial" } });
    setPending((p) => ({ ...p, [m.name]: a }));
    if (a === "start") patch(m.name, { state: "loading" });
    await new Promise((r) => setTimeout(r, 1200));
    setPending((p) => ({ ...p, [m.name]: null }));
    const next: Partial<Record<ModelAction, ModelInfo["state"]>> = { start: "ready", wake: "ready", sleep: "sleeping", stop: "stopped" };
    patch(m.name, { state: next[a] ?? m.state, idleSeconds: 0, error: undefined });
  };

  return (
    <ModelTable
      className="w-full"
      models={models}
      onAction={onAction}
      pendingActions={pending}
      testResults={tests}
      onDismissTest={(n) => setTests((t) => ({ ...t, [n]: null }))}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Terminal (local echo, no network)                                   */
/* ------------------------------------------------------------------ */

const PROMPT = "\x1b[1;32malice@dilab-01\x1b[0m:\x1b[1;34m~\x1b[0m$ ";

function runCommand(cmd: string): string {
  const [name, ...args] = cmd.trim().split(/\s+/);
  switch (name) {
    case "":
      return "";
    case "help":
      return "Commands: help, echo, date, whoami, nvidia-smi, clear, colors";
    case "echo":
      return args.join(" ");
    case "date":
      return new Date().toString();
    case "whoami":
      return "alice";
    case "colors":
      return [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97].map((c) => `\x1b[${c}m■ ${c}\x1b[0m`).join(" ");
    case "nvidia-smi":
      return [
        "+-----------------------------------------------+",
        "| GPU  Name        Temp  Util   Memory-Usage    |",
        "|   0  RTX A6000   \x1b[33m71C\x1b[0m   \x1b[32m78%\x1b[0m   38211MiB / 49140MiB |",
        "|   1  RTX A6000   \x1b[31m88C\x1b[0m   \x1b[32m96%\x1b[0m   47002MiB / 49140MiB |",
        "+-----------------------------------------------+",
      ].join("\r\n");
    default:
      return `\x1b[31m${name}: command not found\x1b[0m`;
  }
}

function TerminalDemo() {
  const term = React.useRef<TerminalHandle>(null);
  const line = React.useRef("");
  const [connection, setConnection] = React.useState<TerminalConnection>("connecting");
  const [sessions, setSessions] = React.useState<TerminalSession[]>([
    { id: "main", name: "main", windows: 3, attached: true, lastActivity: Date.now() - 30_000 },
    { id: "train", name: "train-exp42", windows: 1, lastActivity: Date.now() - 3600_000 },
    { id: "notebook", name: "notebook", windows: 2, lastActivity: Date.now() - 5 * 3600_000 },
  ]);
  const [active, setActive] = React.useState("main");

  const connect = React.useCallback(() => {
    setConnection("connecting");
    setTimeout(() => {
      setConnection("connected");
      term.current?.writeln(`\x1b[2m[local echo demo — no network] attached to session ${active}\x1b[0m`);
      term.current?.writeln("Type \x1b[1mhelp\x1b[0m for commands.");
      term.current?.write(PROMPT);
      term.current?.focus();
    }, 700);
  }, [active]);

  React.useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const onData = (data: string) => {
    const t = term.current;
    if (!t || connection !== "connected") return;
    for (const ch of data) {
      if (ch === "\r") {
        const cmd = line.current;
        line.current = "";
        t.write("\r\n");
        if (cmd.trim() === "clear") t.clear();
        else if (cmd.trim() === "exit") {
          setConnection("disconnected");
          return;
        } else {
          const out = runCommand(cmd);
          if (out) t.write(`${out}\r\n`);
        }
        t.write(PROMPT);
      } else if (ch === "\x7f") {
        if (line.current.length) {
          line.current = line.current.slice(0, -1);
          t.write("\b \b");
        }
      } else if (ch === "\x03") {
        line.current = "";
        t.write(`^C\r\n${PROMPT}`);
      } else if (ch >= " ") {
        line.current += ch;
        t.write(ch);
      }
    }
  };

  return (
    <div className="grid w-full gap-4 md:grid-cols-[220px_1fr]">
      <TerminalSessionPicker
        sessions={sessions}
        value={active}
        onValueChange={setActive}
        onCreate={() => {
          const id = `s${sessions.length + 1}`;
          setSessions((s) => [...s, { id, name: `session-${s.length + 1}`, windows: 1, lastActivity: Date.now() }]);
          setActive(id);
        }}
      />
      <Terminal
        ref={term}
        title={`alice@dilab-01 · ${sessions.find((s) => s.id === active)?.name ?? active}`}
        connection={connection}
        connectionMessage={connection === "disconnected" ? "Session ended (type exit to try this)." : undefined}
        onReconnect={connect}
        onData={onData}
        height={340}
        toolbar={
          <Button size="xs" variant="ghost" onClick={() => setConnection("disconnected")} disabled={connection !== "connected"}>
            Disconnect
          </Button>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function MonitoringPage() {
  return (
    <PageIntro
      eyebrow="Ops"
      title="Monitoring"
      description="A mini cluster dashboard: nodes, GPUs, alerts, processes, sessions, uptime, request logs, models and a terminal."
    >
      <Demo id="resource-hero" title="ResourceHero" description="Endpoint header with copyable URL, uptime, readiness and config chips." align="start">
        <ResourceHero
          icon={<RiRouterLine />}
          name="model-gateway"
          description="OpenAI-compatible gateway for the lab cluster"
          status="online"
          endpoint="http://gpu-gw.lab.internal:8000/v1"
          uptime="18d 6h"
          ready={{ ready: 2, total: 3, noun: "models ready" }}
          chips={[
            { label: "GPUs", value: "4× A6000" },
            { label: "max_ctx", value: "32k" },
            { label: "sleep after", value: "15m" },
            { label: "auth", value: "keys" },
          ]}
          actions={
            <Button size="sm" variant="outline" leadingIcon={<RiRefreshLine />}>
              Reload config
            </Button>
          }
        />
      </Demo>
      <Demo id="node-grid" title="NodeGrid & NodeCard" description="Live metrics every 1.5s, per-core grids (20 per row above 20 cores), mini chart, no-GPU node. “Cycle state” walks connecting → error → offline." align="start">
        <NodeGridDemo />
      </Demo>
      <Demo id="gpu-cards" title="GpuCard" description="VRAM bar, utilization, temperature gauge with thresholds, process count and power." align="start">
        <GpuCardsDemo />
      </Demo>
      <Demo id="alert-group" title="AlertGroup" description="Grouped, collapsible alerts sorted by severity with per-item and bulk dismiss (ids kept in state)." align="start">
        <AlertGroupDemo />
      </Demo>
      <Demo id="process-table" title="ProcessTable" description="Live process list: rows animate in and out, sortable columns, totals, hover-revealed SIGTERM / SIGKILL with inline confirm. root processes are protected." align="start">
        <ProcessTableDemo />
      </Demo>
      <Demo id="timeline-bar" title="TimelineBar" description="Session uptime lanes with live spans pulsing to now, and GPU job occupancy." align="start">
        <TimelineDemo />
      </Demo>
      <Demo id="uptime-bar" title="UptimeBar" description="90 daily buckets: up, degraded, down and no data." align="start">
        <UptimeDemo />
      </Demo>
      <Demo id="calendar-heatmap" title="CalendarHeatmap & HeatmapGrid" description="Year view with month and weekday labels, month view with navigation; arrow keys move between cells." align="start">
        <CalendarDemo />
      </Demo>
      <Demo id="json-viewer" title="JsonViewer" description="Tree with search, copy value/path, chunked 240-item array, a circular reference and a raw view." align="start">
        <JsonViewer data={jsonSample} defaultExpandDepth={1} className="w-full" />
      </Demo>
      <Demo id="request-inspector" title="RequestInspector" description="A single LLM request record with param chips, messages by role and JSON tabs." align="start">
        <RequestInspector record={fakeRecords[1]} />
      </Demo>
      <Demo id="request-log-table" title="RequestLogTable" description="64 fake records with status, model and latency filters; click a row to inspect." align="start">
        <RequestLogTable records={fakeRecords} pageSize={10} className="w-full" />
      </Demo>
      <Demo id="model-table" title="ModelTable" description="Models grouped by family with state glyphs, downloads, won't-fit tags, timings, state-dependent actions and smoke tests." align="start">
        <ModelTableDemo />
      </Demo>
      <Demo id="terminal" title="Terminal & TerminalSessionPicker" description="xterm.js themed from Sutra tokens (toggle dark mode to re-theme), fit on resize, connection overlay, fullscreen. Local echo only." align="start">
        <TerminalDemo />
      </Demo>
    </PageIntro>
  );
}

export default MonitoringPage;
