import * as React from "react";
import {
  AttachmentThumbnails,
  Button,
  ComposerToolbar,
  PromptInput,
  PromptInputAddContextMenu,
  PromptInputAttachments,
  PromptInputButton,
  PromptInputContextChip,
  PromptInputDropOverlay,
  PromptInputModelPill,
  PromptInputModelSelect,
  PromptInputSubmit,
  PromptInputTextarea,
  QueuedMessages,
  SideThread,
  VoiceInput,
  useComposerHistory,
  type AttachmentThumbnailItem,
  type PromptInputFastMode,
  type PromptInputModel,
  type QueuedMessage,
  type SideThreadExchange,
} from "@sutra/ui";
import { RiBrainLine, RiQuestionAnswerLine, RiShieldCheckLine, RiTerminalBoxLine, RiSparkling2Line, RiFlashlightLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/** Anchor ids of the demos on this page. */
export const agentComposerAnchors = [
  "full-composer",
  "mention-highlight",
  "drop-overlay",
  "context-chip",
  "add-context",
  "model-pill",
  "queued-messages",
  "side-thread",
  "composer-toolbar",
  "attachment-thumbnails",
  "composer-history",
] as const;

export function AgentComposerPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Composer"
      description="The prompt box of an agentic coding assistant: inline-highlighted @file / #tag / /command tokens, editor context chips, an add-context menu, attachment thumbnails, a model pill with effort and fast-mode cooldown, messages queued while the agent works, and a docked side-question thread. Everything is simulated locally — no network."
    >
      <FullComposerDemo />
      <HighlightDemo />
      <DropOverlayDemo />
      <ContextChipDemo />
      <AddContextDemo />
      <ModelPillDemo />
      <QueuedMessagesDemo />
      <SideThreadDemo />
      <ComposerToolbarDemo />
      <AttachmentThumbnailsDemo />
      <HistoryDemo />
    </PageIntro>
  );
}

export default AgentComposerPage;

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

function svgThumb(from: string, to: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><rect x="24" y="24" width="150" height="14" rx="7" fill="#fff" fill-opacity=".7"/><rect x="24" y="50" width="220" height="10" rx="5" fill="#fff" fill-opacity=".45"/><rect x="24" y="68" width="190" height="10" rx="5" fill="#fff" fill-opacity=".45"/><text x="24" y="176" font-family="system-ui" font-size="20" font-weight="700" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const sampleAttachments: AttachmentThumbnailItem[] = [
  { id: "img-1", name: "login-bug.png", url: svgThumb("#6366f1", "#ec4899", "Login"), mimeType: "image/png" },
  { id: "img-2", name: "dashboard.png", url: svgThumb("#0ea5e9", "#22c55e", "Dashboard"), mimeType: "image/png" },
  { id: "pdf-1", name: "api-spec.pdf", size: 1_850_000, pages: 14 },
];

const models: PromptInputModel[] = [
  { id: "atlas", name: "Atlas", description: "Most capable, best for large refactors", icon: <RiBrainLine /> },
  { id: "swift", name: "Swift", description: "Balanced speed and quality", icon: <RiSparkling2Line />, badge: "Default" },
  { id: "nano", name: "Nano", description: "Fastest for quick edits", icon: <RiFlashlightLine /> },
];

const modes = ["Ask before edits", "Edit automatically", "Plan mode"] as const;
const efforts = ["Low", "Medium", "High", "Max"] as const;

const answers = [
  "Short answer: yes — it memoizes the value between renders until a dependency changes.",
  "That flag only affects the dev server; production builds ignore it.",
  "Use `git stash -u` to include untracked files.",
];

let uid = 0;
const nextId = (p: string) => `${p}-${++uid}`;

function useSideThread() {
  const [exchanges, setExchanges] = React.useState<SideThreadExchange[]>([
    { id: "s0", question: "Which test runner does this repo use?", answer: "Vitest, with jsdom and Testing Library (see vitest.config.ts)." },
  ]);
  const ask = (text: string) => {
    const id = nextId("side");
    setExchanges((xs) => [...xs, { id, question: text, status: "pending" }]);
    setTimeout(() => {
      setExchanges((xs) =>
        xs.map((x) => (x.id === id ? { ...x, status: "succeeded", answer: answers[uid % answers.length] } : x))
      );
    }, 1200);
  };
  return { exchanges, ask };
}

/* ------------------------------------------------------------------ */
/* Full composer                                                       */
/* ------------------------------------------------------------------ */

interface Turn {
  id: string;
  role: "user" | "agent";
  text: string;
}

function FullComposerDemo() {
  const [value, setValue] = React.useState("/review @src/app.tsx focusing on #perf");
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [queue, setQueue] = React.useState<QueuedMessage[]>([]);
  const [chip, setChip] = React.useState<{ included: boolean } | null>({ included: true });
  const [attachments, setAttachments] = React.useState<AttachmentThumbnailItem[]>(sampleAttachments);
  const [mode, setMode] = React.useState(0);
  const [effort, setEffort] = React.useState(2);
  const [fast, setFast] = React.useState<PromptInputFastMode>("cooldown");
  const [sideOpen, setSideOpen] = React.useState(true);
  const side = useSideThread();
  const history = useComposerHistory({ value, onValueChange: setValue, initialEntries: ["Run the test suite", "Explain this stack trace"] });
  const runTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = React.useCallback((text: string) => {
    setTurns((t) => [...t, { id: nextId("u"), role: "user", text }]);
    setBusy(true);
    if (runTimer.current) clearTimeout(runTimer.current);
    runTimer.current = setTimeout(() => {
      setTurns((t) => [...t, { id: nextId("a"), role: "agent", text: `Done: “${text.slice(0, 60)}”. (simulated)` }]);
      setBusy(false);
    }, 4000);
  }, []);

  React.useEffect(() => () => void (runTimer.current && clearTimeout(runTimer.current)), []);

  // When the agent goes idle, send the next queued message.
  React.useEffect(() => {
    if (busy || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    run(next.text);
  }, [busy, queue, run]);

  const stop = () => {
    if (runTimer.current) clearTimeout(runTimer.current);
    setTurns((t) => [...t, { id: nextId("a"), role: "agent", text: "Interrupted." }]);
    setBusy(false);
  };

  const submit = (text: string) => {
    history.push(text);
    if (busy) setQueue((q) => [...q, { id: nextId("q"), text }]);
    else run(text);
    setAttachments([]);
  };

  const addFiles = (files: File[]) => {
    for (const file of files) {
      const id = nextId("file");
      const url = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setAttachments((a) => [...a, { id, name: file.name, size: file.size, mimeType: file.type, url, status: "uploading", progress: 30 }]);
      setTimeout(() => setAttachments((a) => a.map((x) => (x.id === id ? { ...x, status: "ready", progress: 100 } : x))), 1200);
    }
  };

  return (
    <Demo
      id="full-composer"
      title="Agent composer"
      description="Type while the agent is busy to queue messages (Send now interrupts). ↑ at the start of the box recalls earlier prompts. Drop files onto the composer, use + to add context, and ask side questions in the docked thread."
      align="start"
      canvasClassName="flex-col items-stretch"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="flex max-h-56 min-h-20 flex-col gap-2 overflow-y-auto rounded-box border border-border bg-subtle p-3 text-sm">
          {turns.length === 0 ? (
            <p className="m-auto text-muted-foreground">Send a prompt to start a (simulated) agent run.</p>
          ) : (
            turns.map((t) => (
              <div key={t.id} className={t.role === "user" ? "self-end rounded-box bg-secondary px-3 py-1.5" : "self-start text-muted-foreground"}>
                {t.text}
              </div>
            ))
          )}
          {busy && <p className="text-shimmer self-start text-sm">Working…</p>}
        </div>

        <QueuedMessages
          items={queue}
          onEdit={(id, text) => setQueue((q) => q.map((m) => (m.id === id ? { ...m, text } : m)))}
          onRemove={(id) => setQueue((q) => q.filter((m) => m.id !== id))}
          onReorder={(ids) => setQueue((q) => ids.map((id) => q.find((m) => m.id === id)!))}
          onSendNow={(id) => {
            const item = queue.find((m) => m.id === id);
            if (!item) return;
            setQueue((q) => q.filter((m) => m.id !== id));
            if (runTimer.current) clearTimeout(runTimer.current);
            run(item.text);
          }}
        />

        {sideOpen && (
          <SideThread exchanges={side.exchanges} onAsk={side.ask} onClose={() => setSideOpen(false)} defaultHeight={240} />
        )}

        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={submit}
          canSubmit={value.trim().length > 0 || attachments.length > 0}
          loading={busy && value.trim().length === 0}
          onStop={stop}
          onFilesAdded={addFiles}
        >
          <PromptInputAttachments>
            {chip && (
              <PromptInputContextChip
                path="src/app.tsx"
                lines={[10, 20]}
                included={chip.included}
                onIncludedChange={(included) => setChip({ included })}
                onRemove={() => setChip(null)}
              />
            )}
            {attachments.length > 0 && (
              <AttachmentThumbnails items={attachments} onRemove={(id) => setAttachments((a) => a.filter((x) => x.id !== id))} />
            )}
          </PromptInputAttachments>
          <PromptInputTextarea
            highlight
            onKeyDown={history.onKeyDown}
            placeholder={busy ? "Queue another message…" : "Ask the agent, @ to mention files, / for commands"}
          />
          <ComposerToolbar
            addContext={
              <PromptInputAddContextMenu
                onAttachFile={() => setValue((v) => `${v}${v && !v.endsWith(" ") ? " " : ""}@package.json `)}
                items={(defaults) => [
                  ...defaults,
                  { id: "terminal", label: "Terminal output", icon: <RiTerminalBoxLine />, onSelect: () => setValue((v) => `${v} #terminal`) },
                ]}
              />
            }
            mode={
              <PromptInputButton onClick={() => setMode((m) => (m + 1) % modes.length)} title="Switch mode">
                <RiShieldCheckLine />
                {modes[mode]}
              </PromptInputButton>
            }
            tools={
              <PromptInputButton label="Side question" pressed={sideOpen} onClick={() => setSideOpen((o) => !o)}>
                <RiQuestionAnswerLine />
              </PromptInputButton>
            }
            effort={
              <PromptInputButton onClick={() => setEffort((e) => (e + 1) % efforts.length)} title="Reasoning effort">
                <RiBrainLine />
                {efforts[effort]}
              </PromptInputButton>
            }
            model={
              <PromptInputModelSelect
                models={models}
                defaultValue="swift"
                align="end"
                effort={efforts[effort]}
                fast={fast}
                fastCooldown={45}
                onFastCooldownEnd={() => setFast("on")}
              />
            }
            voice={
              <VoiceInput
                size="sm"
                meter={false}
                showTranscript={false}
                onTranscript={(text, { done }) => done && setValue((v) => (v ? `${v} ${text}` : text))}
              />
            }
            submit={<PromptInputSubmit />}
          />
          <PromptInputDropOverlay description="Images, PDFs and source files" />
        </PromptInput>
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */
/* Isolated demos                                                      */
/* ------------------------------------------------------------------ */

function HighlightDemo() {
  return (
    <Demo
      id="mention-highlight"
      title="Inline mention highlighting"
      description="A mirror layer behind a transparent-text textarea paints @file, #tag and leading /command tokens. Caret, selection, IME, undo and scrolling stay native. Custom rules take a regex or explicit ranges."
      align="start"
      canvasClassName="grid gap-4 md:grid-cols-2"
    >
      <div className="flex flex-col gap-2">
        <DemoLabel>Built-in tokens</DemoLabel>
        <PromptInput defaultValue={"/fix the failing test in @src/utils/date.ts\nsee #flaky and @\"docs/Release Notes.md\""}>
          <PromptInputTextarea highlight minRows={3} />
        </PromptInput>
      </div>
      <div className="flex flex-col gap-2">
        <DemoLabel>Custom rules</DemoLabel>
        <PromptInput defaultValue="TODO: rename fetchUser → loadUser, FIXME later">
          <PromptInputTextarea
            minRows={3}
            highlight={{
              mentions: true,
              rules: [
                { pattern: /\b(?:TODO|FIXME)\b/g, kind: "todo", className: "rounded-xs bg-destructive-soft text-destructive-soft-foreground" },
                { pattern: /\b\w+(?= →)|(?<=→ )\w+/g, kind: "symbol", className: "rounded-xs bg-success-soft text-success-soft-foreground" },
              ],
            }}
          />
        </PromptInput>
      </div>
    </Demo>
  );
}

function DropOverlayDemo() {
  const [dropped, setDropped] = React.useState<string[]>([]);
  return (
    <Demo
      id="drop-overlay"
      title="Drop overlay"
      description="Drag a file from your desktop (or a link / text with onContextDrop) onto the composer."
      align="start"
      canvasClassName="flex-col items-stretch"
    >
      <PromptInput
        className="mx-auto max-w-xl"
        onFilesAdded={(files) => setDropped((d) => [...d, ...files.map((f) => f.name)])}
        onContextDrop={(data) => setDropped((d) => [...d, data.getData("text/uri-list") || data.getData("text/plain") || "(data)"])}
      >
        <PromptInputTextarea placeholder="Drop something here…" minRows={2} />
        <PromptInputDropOverlay />
      </PromptInput>
      <p className="text-center text-xs text-muted-foreground">{dropped.length ? `Dropped: ${dropped.join(", ")}` : "Nothing dropped yet."}</p>
    </Demo>
  );
}

function ContextChipDemo() {
  const [chips, setChips] = React.useState([
    { id: "sel", path: "src/app.tsx", lines: [10, 20] as const, included: true },
    { id: "open", path: "src/routes/settings/profile.tsx", lines: undefined, included: false },
    { id: "line", path: "packages/ui/src/index.ts", lines: 42, included: true },
  ]);
  return (
    <Demo id="context-chip" title="Context chips" description="Editor selection / open file attached as context. The eye toggles whether it is sent; × removes it.">
      {chips.map((c) => (
        <PromptInputContextChip
          key={c.id}
          path={c.path}
          lines={c.lines}
          included={c.included}
          onIncludedChange={(included) => setChips((cs) => cs.map((x) => (x.id === c.id ? { ...x, included } : x)))}
          onRemove={() => setChips((cs) => cs.filter((x) => x.id !== c.id))}
        />
      ))}
      {chips.length === 0 && <span className="text-sm text-muted-foreground">All removed.</span>}
    </Demo>
  );
}

function AddContextDemo() {
  const [log, setLog] = React.useState("Pick an item from the + menu.");
  return (
    <Demo id="add-context" title="Add-context menu" description="Defaults: attach file, mention a project file (inserts @ when no search callback), upload, paste image — extend or replace via `items`." align="start" canvasClassName="flex-col items-stretch">
      <PromptInput className="mx-auto max-w-xl" onFilesAdded={(f) => setLog(`Added ${f.map((x) => x.name).join(", ")}`)}>
        <PromptInputTextarea highlight placeholder="Use + to add context" />
        <ComposerToolbar
          addContext={
            <PromptInputAddContextMenu
              onAttachFile={() => setLog("Attach file… (would open the editor's file picker)")}
              onPasteImage={() => setLog("Paste image (would read the clipboard)")}
              items={(defaults) => [
                ...defaults,
                { id: "problems", label: "Problems panel", description: "3 errors, 1 warning", icon: <RiTerminalBoxLine />, onSelect: () => setLog("Attached problems") },
              ]}
            />
          }
          submit={<PromptInputSubmit />}
        />
      </PromptInput>
      <p className="text-center text-xs text-muted-foreground">{log}</p>
    </Demo>
  );
}

function ModelPillDemo() {
  const [cooldown, setCooldown] = React.useState(20);
  const [state, setState] = React.useState<PromptInputFastMode>("cooldown");
  return (
    <Demo id="model-pill" title="Model pill" description="Name, reasoning-effort slot and fast-mode indicator: on, off, or cooling down with a live seconds countdown.">
      <PromptInputModelPill model="Atlas" icon={<RiBrainLine />} effort="High" fast="on" />
      <PromptInputModelPill model="Swift" effort="Medium" fast="off" />
      <PromptInputModelPill
        model="Nano"
        effort="Low"
        fast={state}
        fastCooldown={cooldown}
        onFastCooldownEnd={() => setState("on")}
      />
      <Button size="sm" variant="outline" onClick={() => { setState("cooldown"); setCooldown((c) => (c === 20 ? 21 : 20)); }}>
        Restart cooldown
      </Button>
    </Demo>
  );
}

function QueuedMessagesDemo() {
  const [items, setItems] = React.useState<QueuedMessage[]>([
    { id: "q1", text: "Also add a test for the empty-string case" },
    { id: "q2", text: "Then update the CHANGELOG with a short note about the date parsing fix and link the issue", attachments: 1 },
    { id: "q3", text: "Finally run lint" },
  ]);
  const [sent, setSent] = React.useState<string | null>(null);
  return (
    <Demo id="queued-messages" title="Queued messages" description="Edit inline (Enter saves, Esc cancels), remove, reorder (Alt+↑/↓ or arrows), Send now to interrupt, and collapse to the pill." align="start" canvasClassName="flex-col items-stretch">
      <div className="mx-auto w-full max-w-xl">
        <QueuedMessages
          items={items}
          onEdit={(id, text) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, text } : x)))}
          onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
          onReorder={(ids) => setItems((xs) => ids.map((id) => xs.find((x) => x.id === id)!))}
          onSendNow={(id) => {
            setSent(items.find((x) => x.id === id)?.text ?? null);
            setItems((xs) => xs.filter((x) => x.id !== id));
          }}
        />
        <p className="mt-2 text-xs text-muted-foreground">{sent ? `Sent now: “${sent}”` : items.length ? "" : "Queue is empty."}</p>
      </div>
    </Demo>
  );
}

function SideThreadDemo() {
  const side = useSideThread();
  const [open, setOpen] = React.useState(true);
  const [height, setHeight] = React.useState(260);
  return (
    <Demo id="side-thread" title="Side thread" description="A docked mini-chat for quick questions that don't interrupt the main run. Drag the top edge or focus it and use ↑/↓ to resize." align="start" canvasClassName="flex-col items-stretch">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
        {open ? (
          <SideThread exchanges={side.exchanges} onAsk={side.ask} onClose={() => setOpen(false)} height={height} onHeightChange={setHeight} />
        ) : (
          <Button size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)} leadingIcon={<RiQuestionAnswerLine />}>
            Ask a side question
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Height: {height}px</p>
      </div>
    </Demo>
  );
}

function ComposerToolbarDemo() {
  const toolbar = (
    <ComposerToolbar
      addContext={<PromptInputAddContextMenu />}
      mode={<PromptInputButton><RiShieldCheckLine />Ask before edits</PromptInputButton>}
      effort={<PromptInputButton><RiBrainLine />High</PromptInputButton>}
      model={<PromptInputModelSelect models={models} align="end" fast="on" />}
      submit={<PromptInputSubmit />}
    />
  );
  return (
    <Demo id="composer-toolbar" title="Composer toolbar" description="Left: add context, mode, effort. Right: model, voice, send. Below 440px wide the mode / effort / extra tools collapse into a ⋯ popover." align="start" canvasClassName="grid gap-4 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-2">
        <DemoLabel>Wide</DemoLabel>
        <PromptInput>
          <PromptInputTextarea placeholder="Wide toolbar" />
          {toolbar}
        </PromptInput>
      </div>
      <div className="flex flex-col gap-2">
        <DemoLabel>Narrow (auto-collapsed)</DemoLabel>
        <PromptInput>
          <PromptInputTextarea placeholder="Narrow toolbar" />
          {toolbar}
        </PromptInput>
      </div>
    </Demo>
  );
}

function AttachmentThumbnailsDemo() {
  const initial: AttachmentThumbnailItem[] = [
    ...sampleAttachments,
    { id: "img-3", name: "error-state.png", url: svgThumb("#f97316", "#ef4444", "Error"), mimeType: "image/png", status: "uploading" },
    { id: "csv", name: "metrics.csv", size: 48_200, status: "uploading", progress: 64 },
    { id: "zip", name: "logs.zip", size: 92_000_000, status: "failed", error: "File is larger than 30 MB" },
  ];
  const [items, setItems] = React.useState(initial);
  return (
    <Demo id="attachment-thumbnails" title="Attachment thumbnails" description="Image thumbnails open in a lightbox; file chips show pages / size, uploading progress and failures with retry. Hover to remove.">
      <AttachmentThumbnails
        items={items}
        onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
        onRetry={(id) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "uploading", progress: 10, error: undefined } : x)))}
      />
      {items.length < initial.length && (
        <Button size="sm" variant="ghost" onClick={() => setItems(initial)}>
          Reset
        </Button>
      )}
    </Demo>
  );
}

function HistoryDemo() {
  const [value, setValue] = React.useState("");
  const history = useComposerHistory({
    value,
    onValueChange: setValue,
    initialEntries: ["Summarize the open PR", "Why is the build slow?", "/compact"],
  });
  return (
    <Demo id="composer-history" title="Prompt history" description="useComposerHistory: ↑ with the caret at the start recalls older prompts, ↓ at the end walks forward and finally restores your draft." align="start" canvasClassName="flex-col items-stretch">
      <PromptInput className="mx-auto max-w-xl" value={value} onValueChange={setValue} onSubmit={(v) => history.push(v)}>
        <PromptInputTextarea highlight onKeyDown={history.onKeyDown} placeholder="Press ↑ to recall" />
        <ComposerToolbar submit={<PromptInputSubmit />} />
      </PromptInput>
      <p className="text-center text-xs text-muted-foreground">
        {history.entries.length} entries · {history.index === null ? "editing draft" : `showing #${history.index + 1}`}
      </p>
    </Demo>
  );
}
