import * as React from "react";
import {
  Button,
  ContextMeter,
  ConversationSidebarList,
  JobBanner,
  ModelPicker,
  QuestionCard,
  SlashMenu,
  StatusStrip,
  UsageSummary,
  type ModelPickerModel,
  type SidebarConversation,
  type SidebarFolder,
  type SlashCommand,
  type StatusStripStatus,
  type UsageDay,
} from "@cleanprompt/sutra-ui";
import {
  RiBookOpenLine,
  RiCodeSSlashLine,
  RiDeleteBinLine,
  RiGlobalLine,
  RiImageLine,
  RiQuillPenLine,
  RiTranslate2,
  RiUser3Line,
} from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/** Anchor ids of the demos on this page. */
export const aiExtrasAnchors = [
  "context-meter",
  "status-strip",
  "job-banner",
  "question-card",
  "slash-menu",
  "model-picker",
  "usage-summary",
  "conversation-sidebar",
] as const;

export function AiExtrasPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="AI Extras"
      description="Pieces around the chat: context usage, model lifecycle status, background jobs, model-asked questions, inline commands, model picking, usage and a full conversation sidebar."
    >
      <ContextMeterDemo />
      <StatusStripDemo />
      <JobBannerDemo />
      <QuestionCardDemo />
      <SlashMenuDemo />
      <ModelPickerDemo />
      <UsageSummaryDemo />
      <ConversationSidebarDemo />
    </PageIntro>
  );
}

export default AiExtrasPage;

/* ------------------------------------------------------------------ */

function ContextMeterDemo() {
  const [history, setHistory] = React.useState(9000);
  const [compressing, setCompressing] = React.useState(false);
  const compress = () => {
    setCompressing(true);
    setTimeout(() => {
      setHistory((h) => Math.round(h * 0.25));
      setCompressing(false);
    }, 1200);
  };
  const levels = [
    { label: "Plenty of room", history: 6000 },
    { label: "Getting full (warn)", history: 22000 },
    { label: "Almost full (danger)", history: 27500 },
  ];
  return (
    <Demo
      id="context-meter"
      title="Context meter"
      description="A ring for the context window. Quiet until it nears full, then it shows the percentage and turns warning / danger. Click it for the token breakdown and a compact action."
    >
      <div className="flex flex-col items-center gap-2">
        <ContextMeter
          limit={32000}
          model="qwen3-8b"
          breakdown={{ system: 1400, history, attachments: 2600, reserved: 2000 }}
          onCompact={compress}
          compacting={compressing}
          canCompact={history > 2000}
        />
        <DemoLabel>Interactive</DemoLabel>
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => setHistory((h) => Math.min(30000, h + 4000))}>
            + history
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setHistory(9000)}>
            Reset
          </Button>
        </div>
      </div>
      {levels.map((l) => (
        <div key={l.label} className="flex flex-col items-center gap-2">
          <ContextMeter limit={32000} breakdown={{ system: 1400, history: l.history, attachments: 0 }} />
          <DemoLabel>{l.label}</DemoLabel>
        </div>
      ))}
    </Demo>
  );
}

function StatusStripDemo() {
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [retryKey, setRetryKey] = React.useState(0);
  const statuses: Array<[string, StatusStripStatus]> = [
    ["Waking (ticking ETA)", { kind: "waking", estimate: 20, startedAt }],
    ["Cold start with model", { kind: "cold-start", model: "llama-3.1-8b", estimate: 40, elapsed: 12 }],
    ["Queued", { kind: "queued", position: 2, model: "qwen3-8b", message: "One request ahead of you" }],
    ["Retrying (countdown)", { kind: "retrying", retryIn: 7, attempt: 2, maxAttempts: 5, message: "The model is at capacity" }],
    ["Rate limited", { kind: "rate-limited", retryIn: 42, message: "20 requests per minute on this key" }],
    ["Offline", { kind: "offline" }],
  ];
  return (
    <Demo id="status-strip" title="Status strip" description="Sits above the composer while nothing has streamed yet. Every state names what is happening and keeps Cancel live." align="start">
      {statuses.map(([label, s]) => (
        <div key={`${label}-${retryKey}`} className="space-y-1">
          <DemoLabel>{label}</DemoLabel>
          <StatusStrip status={s} onCancel={() => {}} onRetry={s.kind === "retrying" || s.kind === "offline" ? () => setRetryKey((k) => k + 1) : undefined} />
        </div>
      ))}
      <div>
        <Button size="xs" variant="outline" onClick={() => setStartedAt(Date.now())}>
          Restart timers
        </Button>
      </div>
    </Demo>
  );
}

const jobPhases = ["planning", "searching", "reading", "writing"];

function JobBannerDemo() {
  const [phase, setPhase] = React.useState(0);
  const [status, setStatus] = React.useState<"running" | "done" | "cancelled">("running");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => {
      setPhase((p) => {
        if (p >= jobPhases.length - 1) {
          setStatus("done");
          return p;
        }
        return p + 1;
      });
    }, 2500);
    return () => clearInterval(t);
  }, [status]);
  const restart = () => {
    setPhase(0);
    setStatus("running");
    setStartedAt(Date.now());
  };
  return (
    <Demo id="job-banner" title="Job banner" description="A long-running research job: step dots, a shimmering current phase, elapsed time, cancel, and Ask again / Open result once it lands." align="start">
      <JobBanner
        title="Compare local vector databases for a 10M-row corpus"
        phase={jobPhases[phase]}
        status={status}
        startedAt={startedAt}
        detail={status === "running" && phase === 1 ? "“sqlite-vec vs lancedb benchmark 2026”" : undefined}
        onCancel={() => setStatus("cancelled")}
        onAskAgain={restart}
        onOpenResult={() => {}}
      />
      <DemoLabel>Failed</DemoLabel>
      <JobBanner title="Summarize every PDF in /papers" phase="reading" status="failed" elapsed={312} detail="3 of 41 files could not be read" onAskAgain={() => {}} />
    </Demo>
  );
}

function QuestionCardDemo() {
  return (
    <Demo id="question-card" title="Question card" description="When the model needs a decision. Single choice answers on pick; multi-choice confirms; free text supports attachments. The card locks to show what was chosen." align="start" canvasClassName="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <QuestionCard
        question="Which database should the prototype use?"
        description="I can scaffold either; this decides the migration tooling."
        options={[
          { value: "pg", label: "Postgres", description: "Full SQL, needs a server" },
          { value: "sqlite", label: "SQLite", description: "Single file, zero setup" },
        ]}
        allowOther
      />
      <QuestionCard
        type="multi"
        question="Which platforms should I target?"
        options={[
          { value: "web", label: "Web" },
          { value: "ios", label: "iOS" },
          { value: "android", label: "Android" },
        ]}
        allowOther
      />
      <QuestionCard type="text" allowAttachments question="What should the CLI be called?" placeholder="A short, lowercase name…" />
      <QuestionCard question="Use tabs or spaces?" options={[{ value: "tabs", label: "Tabs" }, { value: "spaces", label: "Spaces" }]} answer={{ values: ["spaces"] }} />
    </Demo>
  );
}

const slashCommands: SlashCommand[] = [
  { id: "summarize", name: "summarize", description: "Summarize the conversation so far", icon: <RiQuillPenLine /> },
  { id: "search", name: "search", description: "Search the web before answering", icon: <RiGlobalLine />, keywords: ["web", "google"] },
  { id: "image", name: "image", description: "Generate an image", icon: <RiImageLine />, keywords: ["picture", "draw"] },
  { id: "code", name: "code", description: "Answer with code only", icon: <RiCodeSSlashLine /> },
  { id: "translate", name: "translate", description: "Translate the last reply", icon: <RiTranslate2 /> },
  { id: "explain", name: "explain", description: "Explain like I'm new to this", icon: <RiBookOpenLine /> },
  { id: "clear", name: "clear", description: "Start a fresh conversation", icon: <RiDeleteBinLine /> },
];
const people: SlashCommand[] = ["Asha", "Bilal", "Chen", "Diego", "Emma"].map((n) => ({
  id: n.toLowerCase(),
  name: n.toLowerCase(),
  description: `${n} · teammate`,
  icon: <RiUser3Line />,
  insertText: `@${n.toLowerCase()} `,
}));

function SlashMenuDemo() {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <Demo id="slash-menu" title="Slash menu" description="Type “/” at the start of a word for commands or “@” to mention someone. ↑↓ to move, Enter to pick, Esc to dismiss." align="start">
      <textarea
        ref={ref}
        aria-label="Message"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Try /sum or @a…"
        className="w-full resize-none rounded-box border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
      />
      <SlashMenu anchorRef={ref} commands={slashCommands} onSelect={(c) => setLast(`/${c.name}`)} />
      <SlashMenu anchorRef={ref} trigger="@" commands={people} onSelect={(c) => setLast(`@${c.name}`)} />
      <DemoLabel>Last selected: {last ?? "—"}</DemoLabel>
    </Demo>
  );
}

const pickerModels: ModelPickerModel[] = [
  { id: "qwen3-8b", name: "Qwen3 8B", state: "ready", answerSeconds: 3, group: "Local", tags: ["chat"], cost: "free", quality: "good", rank: 1 },
  { id: "phi-4-mini", name: "Phi-4 mini", state: "sleeping", warmSeconds: 4, group: "Local", tags: ["fast"], cost: "free", quality: "basic" },
  { id: "llama-3.1-8b", name: "Llama 3.1 8B", state: "stopped", warmSeconds: 40, group: "Local", tags: ["chat"], cost: "free", quality: "good" },
  { id: "gemma-27b", name: "Gemma 27B", state: "failed", group: "Local", tags: ["chat"], cost: "free", quality: "best" },
  { id: "deepseek-70b", name: "DeepSeek 70B", state: "stopped", warmSeconds: 160, group: "Local", tags: ["reasoning"], blockedReason: "needs 48 GB, 22 GB free" },
  { id: "cloud-large", name: "Cloud Large", state: "ready", answerSeconds: 1, group: "Cloud", tags: ["chat"], cost: "high", quality: "best" },
  { id: "cloud-mini", name: "Cloud Mini", state: "ready", answerSeconds: 1, group: "Cloud", tags: ["chat"], cost: "low", quality: "good" },
  { id: "tinyllama", name: "TinyLlama 1.1B", state: "stopped", warmSeconds: 6, group: "Local" },
  { id: "mistral-7b-old", name: "Mistral 7B (v0.1)", state: "stopped", warmSeconds: 35, group: "Local" },
];

function ModelPickerDemo() {
  const [models, setModels] = React.useState(pickerModels);
  const [value, setValue] = React.useState("qwen3-8b");
  const [warming, setWarming] = React.useState<string[]>([]);
  const warm = (id: string) => {
    setWarming((w) => [...w, id]);
    setTimeout(() => {
      setWarming((w) => w.filter((x) => x !== id));
      setModels((ms) => ms.map((m) => (m.id === id ? { ...m, state: "ready" } : m)));
    }, 2000);
  };
  return (
    <Demo id="model-picker" title="Model picker" description="Lifecycle glyphs use shape, not just color (filled = ready, outline = stopped, moon = asleep, triangle = failed). Ready models rank first; blocked models explain why; untagged models hide behind a disclosure.">
      <ModelPicker models={models} value={value} onValueChange={setValue} onWarmUp={warm} warmingIds={warming} side="bottom" />
    </Demo>
  );
}

function makeUsage(): UsageDay[] {
  const out: UsageDay[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const start = Date.UTC(2026, 6, 20);
  for (let i = 0; i < 90; i++) {
    const weekday = new Date(start + i * 864e5).getUTCDay();
    const base = weekday === 0 || weekday === 6 ? 6 : 22;
    const n = Math.round(base * (0.5 + rnd()) + i / 6);
    const qwen = Math.round(n * 0.55);
    const cloud = Math.round(n * 0.3);
    out.push({
      date: new Date(start + i * 864e5).toISOString().slice(0, 10),
      requests: n,
      tokens: n * Math.round(900 + rnd() * 1400),
      waitMs: n * Math.round(300 + rnd() * 2500),
      generateMs: n * Math.round(2500 + rnd() * 4000),
      models: { "qwen3-8b": qwen, "cloud-mini": cloud, "llama-3.1-8b": n - qwen - cloud },
      finishReasons: { stop: Math.round(n * 0.86), length: Math.round(n * 0.07), cancelled: Math.round(n * 0.05), error: Math.max(0, n - Math.round(n * 0.86) - Math.round(n * 0.07) - Math.round(n * 0.05)) },
    });
  }
  return out;
}

function UsageSummaryDemo() {
  const days = React.useMemo(makeUsage, []);
  return (
    <Demo id="usage-summary" title="Usage summary" description="Settings → Usage: range switch, KPI tiles, requests per day, per-model bars, wait vs. generate split and finish reasons." align="start">
      <UsageSummary days={days} />
    </Demo>
  );
}

function ConversationSidebarDemo() {
  const [folders, setFolders] = React.useState<SidebarFolder[]>([
    { id: "work", name: "Work" },
    { id: "learning", name: "Learning" },
  ]);
  const [items, setItems] = React.useState<SidebarConversation[]>([
    { id: "1", title: "Trip to Kyoto: 5-day plan", pinned: true },
    { id: "2", title: "Quarterly OKR draft", folderId: "work" },
    { id: "3", title: "Postgres index tuning", folderId: "work" },
    { id: "4", title: "Rust lifetimes, explained", folderId: "learning" },
    { id: "5", title: "Sourdough schedule" },
    { id: "6", title: "Birthday gift ideas for Maya" },
    { id: "7", title: "Car insurance comparison" },
    { id: "8", title: "Old resume rewrite", archived: true },
  ]);
  const [active, setActive] = React.useState("5");
  const patch = (id: string, p: Partial<SidebarConversation>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <Demo id="conversation-sidebar" title="Conversation sidebar list" description="Pinned, collapsible folders (double-click or pencil to rename), archived group, and a row menu with a Move to submenu. The menu is portalled so the scroll container never clips it." align="start">
      <div className="h-96 w-72 overflow-y-auto rounded-box border border-border bg-subtle p-2">
        <ConversationSidebarList
          conversations={items}
          folders={folders}
          activeId={active}
          onSelect={setActive}
          onRename={(id, title) => patch(id, { title })}
          onPin={(id, pinned) => patch(id, { pinned })}
          onMove={(id, folderId) => patch(id, { folderId })}
          onArchive={(id, archived) => patch(id, { archived, pinned: false })}
          onDelete={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
          onRenameFolder={(id, name) => setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, name } : f)))}
        />
      </div>
    </Demo>
  );
}
