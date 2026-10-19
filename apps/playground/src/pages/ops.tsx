import "katex/dist/katex.min.css";
import * as React from "react";
import {
  Button,
  LogViewer,
  Markdown,
  ProgressDialog,
  SimpleSelect,
  TransferList,
  TransferTray,
  useStreamingTask,
  type LogEntry,
  type LogViewerStatus,
  type StreamingTaskEvent,
  type TransferItemData,
} from "@sutra/ui";
import { RiDatabase2Line, RiFolderTransferLine } from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Fake gateway logs                                                   */
/* ------------------------------------------------------------------ */

const ESC = "\x1b";
const models = ["llama-3.1-8b", "qwen2.5-14b", "mistral-7b"];
const paths = ["/v1/chat/completions", "/v1/models", "/v1/embeddings", "/health"];

function fakeLine(i: number): LogEntry {
  const r = Math.random();
  const model = models[i % models.length];
  const source = i % 4 === 0 ? model : "gateway";
  let message: string;
  if (r < 0.45) {
    const path = paths[Math.floor(Math.random() * paths.length)];
    const status = Math.random() < 0.85 ? 200 : Math.random() < 0.6 ? 429 : 502;
    message = `aiohttp.access: 10.0.0.${(i % 40) + 2} "POST ${path} HTTP/1.1" ${status} ${Math.floor(Math.random() * 4000)}`;
  } else if (r < 0.7) {
    message = `INFO ${ESC}[36m${model}${ESC}[0m generated ${Math.floor(Math.random() * 900)} tokens in ${(Math.random() * 4).toFixed(2)}s`;
  } else if (r < 0.82) {
    message = `${ESC}[2mDEBUG${ESC}[0m kv-cache hit ratio=${Math.random().toFixed(3)}`;
  } else if (r < 0.94) {
    message = `${ESC}[33mWARN${ESC}[0m queue depth ${Math.floor(Math.random() * 40)} exceeds soft limit for ${model}`;
  } else {
    message = `${ESC}[1;31mERROR${ESC}[0m upstream ${model} timed out after 30s (attempt ${1 + (i % 3)}/3)`;
  }
  return { id: i, ts: Date.now(), source, message };
}

function LogViewerDemo() {
  const [lines, setLines] = React.useState<LogEntry[]>(() => Array.from({ length: 40 }, (_, i) => fakeLine(i)));
  const [status, setStatus] = React.useState<LogViewerStatus>("live");
  const [source, setSource] = React.useState("all");
  const counter = React.useRef(40);

  React.useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => {
      setLines((prev) => {
        const burst = 1 + Math.floor(Math.random() * 3);
        const next = Array.from({ length: burst }, () => fakeLine(counter.current++));
        return [...prev, ...next].slice(-5000);
      });
    }, 400);
    return () => clearInterval(t);
  }, [status]);

  return (
    <LogViewer
      entries={source === "all" ? lines : lines.filter((l) => l.source === source)}
      status={status}
      height={360}
      maxLines={5000}
      downloadName="gateway.log"
      sources={[{ value: "all", label: "All sources" }, { value: "gateway" }, ...models.map((m) => ({ value: m }))]}
      source={source}
      onSourceChange={setSource}
      onReconnect={() => setStatus("live")}
      toolbarExtra={
        <Button size="xs" variant="ghost" onClick={() => setStatus((s) => (s === "live" ? "disconnected" : "live"))}>
          {status === "live" ? "Disconnect" : "Connect"}
        </Button>
      }
    />
  );
}

function BigLogDemo() {
  const lines = React.useMemo(
    () =>
      Array.from({ length: 20_000 }, (_, i) =>
        i % 97 === 0 ? `ERROR batch ${i} failed checksum` : i % 13 === 0 ? `WARN batch ${i} retried` : `INFO batch ${i} ok`
      ),
    []
  );
  return <LogViewer lines={lines} height={240} defaultShowLineNumbers maxLines={20_000} />;
}

/* ------------------------------------------------------------------ */
/* Transfers                                                           */
/* ------------------------------------------------------------------ */

const MB = 1024 * 1024;

const initialTransfers: TransferItemData[] = [
  { id: "u1", name: "Holiday photos 2024.zip", direction: "upload", status: "active", bytes: 0, total: 240 * MB, detail: "to Drive / Photos" },
  { id: "u2", name: "Quarterly report.pdf", direction: "upload", status: "active", bytes: 0, total: 18 * MB },
  { id: "u3", name: "interview-raw.mov", direction: "upload", status: "queued", bytes: 0, total: 1200 * MB },
  {
    id: "d1",
    name: "Kind of Blue - So What.flac",
    direction: "download",
    status: "failed",
    bytes: 12 * MB,
    total: 41 * MB,
    error: "upstream returned 502 Bad Gateway (slskd peer disconnected)",
  },
  { id: "m1", name: "Albums → /mnt/music", direction: "move", status: "active", progress: 0, icon: <RiFolderTransferLine /> },
  { id: "c1", name: "notes.md", direction: "upload", status: "completed", total: 0.2 * MB },
];

function useSimulatedTransfers() {
  const [items, setItems] = React.useState(initialTransfers);
  React.useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setItems((prev) => {
        let promoted = false;
        return prev.map((item) => {
          if (item.status === "queued" && !promoted && prev.filter((p) => p.status === "active").length < 3) {
            promoted = true;
            return { ...item, status: "active", startedAt: now, samples: [{ t: now, bytes: item.bytes ?? 0 }] };
          }
          if (item.status !== "active") return item;
          if (item.total) {
            const step = (2 + Math.random() * 6) * MB;
            const bytes = Math.min(item.total, (item.bytes ?? 0) + step);
            const samples = [...(item.samples ?? []), { t: now, bytes }].slice(-10);
            return bytes >= item.total ? { ...item, bytes, status: "completed", samples } : { ...item, bytes, samples };
          }
          const progress = Math.min(100, (item.progress ?? 0) + Math.random() * 4);
          return { ...item, progress, status: progress >= 100 ? "completed" : "active", eta: ((100 - progress) / 2) * 0.5 };
        });
      });
    }, 500);
    return () => clearInterval(t);
  }, []);

  const update = (id: string, patch: Partial<TransferItemData>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const actions = {
    onPause: (id: string) => update(id, { status: "paused" }),
    onResume: (id: string) => update(id, { status: "active", samples: undefined }),
    onCancel: (id: string) => update(id, { status: "canceled" }),
    onRetry: (id: string) => update(id, { status: "active", bytes: 0, progress: 0, error: undefined, samples: undefined }),
    onRemove: (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
    onOpen: (id: string) => window.alert(`Open ${id}`),
    onClearCompleted: () => setItems((prev) => prev.filter((i) => i.status !== "completed" && i.status !== "canceled")),
  };
  const reset = () => setItems(initialTransfers);
  return { items, actions, reset };
}

function TransferListDemo() {
  const { items, actions, reset } = useSimulatedTransfers();
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-box border border-border bg-card">
        <TransferList items={items} title="Transfers" {...actions} />
      </div>
      <Button size="sm" variant="secondary" onClick={reset}>
        Reset simulation
      </Button>
    </div>
  );
}

function TransferTrayDemo() {
  const { items, actions, reset } = useSimulatedTransfers();
  const [open, setOpen] = React.useState(true);
  return (
    <div className="relative flex min-h-96 w-full items-end justify-end rounded-box bg-subtle p-4">
      {open ? (
        <TransferTray inline items={items} {...actions} onClose={() => setOpen(false)} />
      ) : (
        <Button
          size="sm"
          className="self-center"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          Show uploads
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress dialog                                                     */
/* ------------------------------------------------------------------ */

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

async function* syncDataset(target: string, fail: boolean, signal: AbortSignal): AsyncGenerator<StreamingTaskEvent> {
  yield { phase: "Connecting…", progress: null, log: `INFO connecting to ${target}` };
  await sleep(700, signal);
  yield { log: "INFO manifest: 48 files, 3.2 GB" };
  for (let i = 1; i <= 48; i++) {
    await sleep(80 + Math.random() * 120, signal);
    const pct = Math.round((i / 48) * 90);
    yield {
      phase: `Downloading… ${i}/48`,
      progress: pct,
      log:
        i % 11 === 0
          ? `WARN shard-${String(i).padStart(3, "0")}.parquet slow mirror, retrying`
          : `INFO shard-${String(i).padStart(3, "0")}.parquet ${(40 + Math.random() * 60).toFixed(1)} MB`,
    };
    if (fail && i === 31) throw new Error("rsync: connection unexpectedly closed (code 12)");
  }
  yield { phase: "Verifying checksums…", progress: 95, log: "INFO sha256 verified" };
  await sleep(600, signal);
  yield { progress: 100, log: "INFO sync complete", done: true };
}

function ProgressDialogDemo() {
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState("gpu-node-1");
  const [fail, setFail] = React.useState(false);
  const task = useStreamingTask();
  const start = () => void task.start((signal) => syncDataset(target, fail, signal));
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        leadingIcon={<RiDatabase2Line />}
        onClick={() => {
          task.reset();
          setFail(false);
          setOpen(true);
        }}
      >
        Sync dataset
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          task.reset();
          setFail(true);
          setOpen(true);
        }}
      >
        Sync (fails midway)
      </Button>
      <ProgressDialog
        open={open}
        onOpenChange={setOpen}
        title="Sync imagenet-mini"
        description="Copies the dataset to the selected node."
        task={task}
        onStart={start}
        startLabel="Start sync"
        successMessage="48 files synced and verified."
        size="lg"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Target node</p>
          <SimpleSelect
            aria-label="Target node"
            value={target}
            onValueChange={setTarget}
            options={["gpu-node-1", "gpu-node-2", "cpu-pool"].map((v) => ({ value: v, label: v }))}
          />
        </div>
      </ProgressDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Markdown                                                            */
/* ------------------------------------------------------------------ */

const markdownSources = [
  { title: "Attention Is All You Need", href: "https://arxiv.org/abs/1706.03762" },
  { title: "The Illustrated Transformer", href: "https://jalammar.github.io/illustrated-transformer/" },
  { title: "FlashAttention", href: "https://arxiv.org/abs/2205.14135" },
];

const markdownSource = `Scaled dot-product attention weights values by query–key similarity [1]:

$$
\\operatorname{Attention}(Q, K, V) = \\operatorname{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right) V
$$

The $\\sqrt{d_k}$ term keeps the logits from growing with dimension [1, 2]. Memory-efficient kernels avoid materialising the $n \\times n$ matrix [3].

Citations are not linked inside code: \`scores[1]\` stays literal.`;

function MarkdownDemo() {
  const [cited, setCited] = React.useState<number | null>(null);
  return (
    <div className="space-y-3">
      <Markdown math sources={markdownSources} onCite={setCited} className="[&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
        {markdownSource}
      </Markdown>
      <p className="text-sm text-muted-foreground">
        {cited ? `Clicked source ${cited}: ${markdownSources[cited - 1]?.title}` : "Click a citation pill."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function OpsPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Ops & Data"
      description="Live log tails, transfer queues, streaming progress dialogs and markdown with math and citations."
    >
      <Demo
        id="log-viewer"
        title="LogViewer"
        description="Streaming gateway logs: level detection, ANSI colors, filters with highlighting, pause buffer and stick-to-bottom."
        align="start"
      >
        <LogViewerDemo />
      </Demo>
      <Demo
        id="log-viewer-large"
        title="LogViewer, 20k lines"
        description="Rows are windowed by fixed height, so large tails stay fast."
        align="start"
      >
        <BigLogDemo />
      </Demo>
      <Demo
        id="transfer-list"
        title="TransferList"
        description="Uploads, a failed download that keeps its upstream error, and a move job with speed and ETA."
        align="start"
      >
        <TransferListDemo />
      </Demo>
      <Demo id="transfer-tray" title="TransferTray" description="Collapsible floating uploads panel." align="start">
        <TransferTrayDemo />
      </Demo>
      <Demo
        id="progress-dialog"
        title="ProgressDialog"
        description="Dataset sync driven by useStreamingTask over an async generator, with streamed log lines."
      >
        <ProgressDialogDemo />
      </Demo>
      <Demo id="markdown-math" title="Markdown math & citations" align="start">
        <MarkdownDemo />
      </Demo>
    </PageIntro>
  );
}

export default OpsPage;
