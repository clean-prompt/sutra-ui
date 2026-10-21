import * as React from "react";
import {
  AgentBrowserPane,
  AnnotationLayer,
  ArtifactCard,
  ArtifactLibrary,
  ArtifactViewer,
  BranchPill,
  BrowserConsole,
  Button,
  ChangedFilesCard,
  DiffViewer,
  RealProfileConsentDialog,
  ReviewFileTree,
  ReviewScopeTabs,
  ShipBar,
  WorktreeDialog,
  type ArtifactData,
  type ArtifactVersion,
  type BrowserAnnotation,
  type BrowserConsoleEntry,
  type BrowserController,
  type ChangedFile,
  type RealProfileChoice,
  type ReviewScope,
  type ShipAction,
  type ShipStatus,
  type WorktreeBranch,
} from "@cleanprompt/sutra-ui";
import { RiGitForkLine, RiShieldUserLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Agent browser                                                       */
/* ------------------------------------------------------------------ */

/** A local, static mock page. Nothing is fetched. */
function MockPage({ path }: { path: string }) {
  return (
    <div className="flex h-full min-h-72 flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="font-semibold">Acme Notes</span>
        <span className="flex gap-4 text-sm text-muted-foreground">
          <span>Docs</span>
          <span>Pricing</span>
          <span className="rounded-control bg-primary px-3 py-1 text-primary-foreground">Sign in</span>
        </span>
      </div>
      <div className="grid grid-cols-1 flex-1 gap-4 p-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="text-2xl font-semibold">Write once, find anywhere.</div>
          <p className="text-sm text-muted-foreground">Mock page for {path}. This is a styled div, not a website.</p>
          <div className="flex gap-2">
            <span className="rounded-control bg-primary px-3 py-1.5 text-sm text-primary-foreground">Start free</span>
            <span className="rounded-control border border-border px-3 py-1.5 text-sm">See plans</span>
          </div>
        </div>
        <div className="space-y-2 rounded-box border border-border bg-subtle p-4">
          {[70, 90, 55, 80].map((w, i) => (
            <div key={i} className="h-2.5 rounded-xs bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const pages = ["https://acme-notes.example/", "https://acme-notes.example/pricing", "http://localhost:5173/checkout"];

const initialConsole: BrowserConsoleEntry[] = [
  { id: 1, level: "info", message: "[vite] connected.", source: "client.ts:2", ts: "10:41:02" },
  { id: 2, level: "log", message: "Hydrated 14 components", source: "main.tsx:31", ts: "10:41:02" },
  { id: 3, level: "warn", message: "Image is missing width/height", source: "Hero.tsx:12", ts: "10:41:03" },
  { id: 4, level: "error", message: "TypeError: Cannot read properties of undefined (reading 'price')", source: "Plan.tsx:48", ts: "10:41:05", count: 3 },
  { id: 5, level: "debug", message: "router: /pricing → PricingPage", ts: "10:41:06" },
];

function BrowserDemo() {
  const [history, setHistory] = React.useState({ stack: [pages[0]!], index: 0 });
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<number | undefined>(undefined);
  const [controller, setController] = React.useState<BrowserController>("agent");
  const [entries, setEntries] = React.useState(initialConsole);
  const url = history.stack[history.index]!;

  const fakeLoad = () => {
    setLoading(true);
    setProgress(20);
    window.setTimeout(() => setProgress(70), 250);
    window.setTimeout(() => {
      setLoading(false);
      setProgress(undefined);
    }, 600);
  };

  return (
    <AgentBrowserPane
      className="h-[460px] w-full"
      url={url}
      pageTitle="Acme Notes"
      loading={loading}
      progress={progress}
      canGoBack={history.index > 0}
      canGoForward={history.index < history.stack.length - 1}
      onBack={() => setHistory((h) => ({ ...h, index: h.index - 1 }))}
      onForward={() => setHistory((h) => ({ ...h, index: h.index + 1 }))}
      onReload={fakeLoad}
      onStop={() => setLoading(false)}
      onNavigate={(next) => {
        setHistory((h) => ({ stack: [...h.stack.slice(0, h.index + 1), next], index: h.index + 1 }));
        fakeLoad();
      }}
      controller={controller}
      onControllerChange={setController}
      agentName="Sutra"
      agentActivity="Checking the pricing table"
      footer={<BrowserConsole entries={entries} defaultOpen onClear={() => setEntries([])} />}
    >
      <MockPage path={url} />
    </AgentBrowserPane>
  );
}

function AnnotateDemo() {
  const [annotations, setAnnotations] = React.useState<BrowserAnnotation[]>([
    { id: "seed", x: 22, y: 48, comment: "Headline feels too long on mobile" },
  ]);
  const [sent, setSent] = React.useState<BrowserAnnotation[] | null>(null);
  return (
    <div className="w-full space-y-2">
      <div className="overflow-hidden rounded-box border border-border">
        <AnnotationLayer
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          defaultActive
          onSendAnnotations={setSent}
        >
          <MockPage path="https://acme-notes.example/" />
        </AnnotationLayer>
      </div>
      {sent && (
        <p className="text-sm text-muted-foreground">
          Sent {sent.length} {sent.length === 1 ? "note" : "notes"} to the agent: {sent.map((a) => `“${a.comment}” @ ${a.x}%,${a.y}%`).join(" · ")}
        </p>
      )}
    </div>
  );
}

function ConsentDemo() {
  const [open, setOpen] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiShieldUserLine />} onClick={() => setOpen(true)}>
        Ask to use my real profile
      </Button>
      {last && <span className="text-sm text-muted-foreground">{last}</span>}
      <RealProfileConsentDialog
        open={open}
        onOpenChange={setOpen}
        agentName="Sutra"
        profileName="Chrome — Personal"
        site="github.com"
        onChoose={(c: RealProfileChoice, { remember }) => setLast(`Choice: ${c}${remember ? " (remembered)" : ""}`)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Artifacts                                                           */
/* ------------------------------------------------------------------ */

const hookVersions: ArtifactVersion[] = [
  { id: "1", content: "export function useCounter() {\n  const [n, setN] = useState(0);\n  return { n, inc: () => setN(n + 1) };\n}", note: "First draft", createdAt: Date.now() - 3 * 3600_000 },
  { id: "2", content: "export function useCounter(start = 0) {\n  const [n, setN] = useState(start);\n  const inc = useCallback(() => setN((v) => v + 1), []);\n  return { n, inc };\n}", note: "Stable callback", createdAt: Date.now() - 40 * 60_000 },
  { id: "3", content: "export function useCounter(start = 0, step = 1) {\n  const [n, setN] = useState(start);\n  const inc = useCallback(() => setN((v) => v + step), [step]);\n  const reset = useCallback(() => setN(start), [start]);\n  return { n, inc, reset };\n}", note: "Step + reset", createdAt: Date.now() - 5 * 60_000 },
];

const markdownDoc = "## Launch checklist\n\n- [x] Pricing copy\n- [ ] Screenshots\n- [ ] Changelog\n\n> Ship on **Thursday**.";

const svgLogo =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect x="10" y="10" width="100" height="100" rx="28" fill="url(#g)"/><path d="M40 62l14 14 28-32" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const htmlVersions: ArtifactVersion[] = [
  { id: "1", content: "<!doctype html><body style='font-family:system-ui;padding:16px'><h2>Pricing</h2><p>One plan.</p></body>", note: "Skeleton", createdAt: Date.now() - 2 * 3600_000 },
  {
    id: "2",
    content:
      "<!doctype html><body style='font-family:system-ui;padding:16px;background:#faf5ff'><h2 style='margin:0 0 8px'>Pricing</h2><div style='display:flex;gap:8px'><div style='border:1px solid #ddd;border-radius:12px;padding:12px;background:#fff'><b>Free</b><p>$0</p></div><div style='border:2px solid #7c3aed;border-radius:12px;padding:12px;background:#fff'><b>Pro</b><p>$8/mo</p></div></div><script>document.body.append('scripts never run')</script></body>",
    note: "Two tiers",
    createdAt: Date.now() - 10 * 60_000,
  },
];

const libraryItems: ArtifactData[] = [
  { id: "hook", title: "useCounter.ts", kind: "code", language: "ts", versions: hookVersions, updatedAt: Date.now() - 5 * 60_000 },
  { id: "pricing", title: "Pricing page", kind: "html", versions: htmlVersions, updatedAt: Date.now() - 10 * 60_000 },
  { id: "checklist", title: "Launch checklist", kind: "markdown", versions: [{ id: "1", content: markdownDoc }], updatedAt: Date.now() - 26 * 3600_000 },
  { id: "logo", title: "Logo mark", kind: "svg", versions: [{ id: "1", content: svgLogo }], updatedAt: Date.now() - 3 * 86400_000 },
  { id: "schema", title: "Billing schema", kind: "data", versions: [{ id: "1", content: '{ "plan": "pro" }' }], updatedAt: Date.now() - 50 * 60_000 },
  { id: "flow", title: "Checkout flow", kind: "diagram", versions: [{ id: "1", content: "graph LR; Cart-->Pay-->Done" }], updatedAt: Date.now() - 8 * 86400_000 },
];

function StreamingCard() {
  const full = "# Release notes\n\nThis release adds the **agent browser**, artifact cards and a git review set.\n\n- Annotate pages for the agent\n- Version history for artifacts\n- Ship bar with split actions";
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (n >= full.length) return;
    const t = window.setTimeout(() => setN((v) => Math.min(full.length, v + 6)), 60);
    return () => window.clearTimeout(t);
  }, [n, full.length]);
  return (
    <div className="w-full space-y-2">
      <ArtifactCard title="Release notes" kind="markdown" content={full.slice(0, n)} streaming={n < full.length} />
      <Button size="xs" variant="ghost" onClick={() => setN(0)}>
        Replay stream
      </Button>
    </div>
  );
}

function ViewerDemo() {
  const [open, setOpen] = React.useState(true);
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open viewer
      </Button>
    );
  return <ArtifactViewer className="h-[520px] w-full" title="Pricing page" kind="html" versions={htmlVersions} onClose={() => setOpen(false)} onShare={() => {}} />;
}

/* ------------------------------------------------------------------ */
/* Git review                                                          */
/* ------------------------------------------------------------------ */

const changed: ChangedFile[] = [
  { path: "packages/ui/src/components/agent-browser.tsx", status: "added", additions: 512, deletions: 0 },
  { path: "packages/ui/src/components/artifacts.tsx", status: "added", additions: 640, deletions: 0 },
  { path: "packages/ui/src/components/git-review.tsx", status: "added", additions: 590, deletions: 0 },
  { path: "packages/ui/src/components/button.tsx", status: "modified", additions: 4, deletions: 2 },
  { path: "packages/ui/src/lib/legacy-browser.ts", status: "deleted", additions: 0, deletions: 88 },
  { path: "apps/playground/src/pages/browser-review.tsx", status: "added", additions: 320, deletions: 0 },
  { path: "docs/REVIEW.md", status: "renamed", oldPath: "docs/review.md", additions: 3, deletions: 1 },
];

const diffOld = `export function Button({ size = "md", ...props }) {
  return <button className={cn(base, sizes[size])} {...props} />;
}`;
const diffNew = `export function Button({ size = "md", loading, ...props }) {
  return (
    <button className={cn(base, sizes[size])} aria-busy={loading} {...props} />
  );
}`;

function ReviewDemo() {
  const [scope, setScope] = React.useState<ReviewScope>("uncommitted");
  const [selected, setSelected] = React.useState<string | null>("packages/ui/src/components/button.tsx");
  const files = scope === "turn" ? changed.slice(0, 3) : changed;
  return (
    <div className="w-full space-y-3">
      <ReviewScopeTabs value={scope} onValueChange={setScope} baseBranch="main" counts={{ uncommitted: changed.length, branch: 12, turn: 3 }} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        <div className="rounded-box border border-border p-1">
          <ReviewFileTree files={files} selected={selected} onSelectedChange={setSelected} showStats />
        </div>
        <DiffViewer oldValue={diffOld} newValue={diffNew} lineNumbers headerExtra={<span className="font-mono text-xs text-muted-foreground">{selected}</span>} />
      </div>
    </div>
  );
}

function ShipDemo() {
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<ShipStatus>("idle");
  const [generating, setGenerating] = React.useState(false);
  const [result, setResult] = React.useState<string>("");
  const run = (label: string) => () => {
    setStatus("running");
    window.setTimeout(() => {
      setStatus("success");
      setResult(`${label} · a1b2c3d`);
      setMessage("");
    }, 900);
  };
  return (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-box border border-border">
        <ShipBar
          branch="feature/agent-browser-artifacts-and-git-review"
          baseBranch="main"
          ahead={2}
          behind={0}
          changedCount={7}
          message={message}
          onMessageChange={setMessage}
          generating={generating}
          onGenerateMessage={() => {
            setGenerating(true);
            window.setTimeout(() => {
              setMessage("feat(ui): agent browser, artifacts and git review set");
              setGenerating(false);
            }, 700);
          }}
          onCommit={run("Committed")}
          onCommitAndPush={run("Pushed")}
          onCreatePR={run("Opened PR #128")}
          onDelegate={() => setResult("Handed to Sutra")}
          status={status}
          progressLabel="Committing…"
          result={result}
        />
      </div>
      <div className="overflow-hidden rounded-box border border-border">
        <ShipBar branch="fix/merge-main" changedCount={3} conflicts={2} defaultMessage="Merge main" defaultAction={"commit-push" as ShipAction} onDelegate={() => {}} />
      </div>
      <div className="overflow-hidden rounded-box border border-border">
        <ShipBar branch="main" changedCount={0} ahead={0} behind={4} />
      </div>
    </div>
  );
}

const branchList: WorktreeBranch[] = [
  { name: "main", current: true, recent: true },
  { name: "feature/agent-browser", recent: true },
  { name: "fix/login-redirect" },
  { name: "chore/bump-deps" },
  { name: "release/2.4" },
  { name: "origin/main", remote: true },
  { name: "origin/release/2.3", remote: true },
  { name: "origin/feature/voice", remote: true },
];

function WorktreeDemo() {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiGitForkLine />} onClick={() => setOpen(true)}>
        New worktree
      </Button>
      {last && <span className="font-mono text-xs text-muted-foreground">{last}</span>}
      <WorktreeDialog
        open={open}
        onOpenChange={setOpen}
        branches={branchList}
        worktreeRoot="~/code/.worktrees/sutra"
        creating={creating}
        onCreate={(v) => {
          setCreating(true);
          window.setTimeout(() => {
            setCreating(false);
            setOpen(false);
            setLast(`git worktree add ${v.path} -b ${v.name} ${v.base}${v.openInNewSession ? " (new session)" : ""}`);
          }, 600);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function BrowserReviewPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Browser, Artifacts & Review"
      description="An agent-driven browser surface with console, annotations and profile consent; promoted artifacts with versions and safe previews; and a git review set for shipping the agent's changes. All demos are local: nothing is fetched."
    >
      <Demo id="agent-browser" title="Agent browser pane" description="Address bar, lease banner (Take over / Hand back), loading bar, console. The viewport is a local styled div." align="start">
        <BrowserDemo />
      </Demo>
      <Demo id="browser-console" title="Browser console" description="Collapsible, with level toggles and a text filter." align="start">
        <div className="w-full overflow-hidden rounded-box border border-border">
          <BrowserConsole entries={initialConsole} defaultOpen />
        </div>
      </Demo>
      <Demo id="annotation-layer" title="Annotation layer" description="Click the page to drop numbered pins, write a note, then send them all to the agent." align="start">
        <AnnotateDemo />
      </Demo>
      <Demo id="real-profile-consent" title="Real profile consent" description="Ask before the agent browses with the user's cookies and logins.">
        <ConsentDemo />
      </Demo>
      <Demo id="artifact-cards" title="Artifact cards" description="Code with versions, markdown, SVG via an img data URL and HTML that renders only on opt-in inside a sandboxed iframe." align="start">
        <div className="grid grid-cols-1 w-full gap-3 lg:grid-cols-2">
          <ArtifactCard title="useCounter.ts" kind="code" language="ts" versions={hookVersions} onOpen={() => {}} onShare={() => {}} />
          <ArtifactCard title="Launch checklist" kind="markdown" content={markdownDoc} />
          <ArtifactCard title="Logo mark" kind="svg" content={svgLogo} />
          <ArtifactCard title="Pricing page" kind="html" versions={htmlVersions} />
        </div>
      </Demo>
      <Demo id="artifact-streaming" title="Streaming artifact" description="Shimmer and “Generating…” while content arrives." align="start">
        <StreamingCard />
      </Demo>
      <Demo id="artifact-viewer" title="Artifact viewer" description="Preview / Code tabs, version history and fullscreen (Esc exits)." align="start">
        <ViewerDemo />
      </Demo>
      <Demo id="artifact-library" title="Artifact library" description="Search, kind filter chips, sort and grid / list layouts." align="start">
        <ArtifactLibrary artifacts={libraryItems} className="w-full" />
        <ArtifactLibrary artifacts={[]} className="w-full" />
      </Demo>
      <Demo id="changed-files" title="Changed files card" description="Transcript summary with totals, per-file stats and Review." align="start">
        <ChangedFilesCard files={changed} onReview={() => {}} onOpenFile={() => {}} className="w-full max-w-xl" />
      </Demo>
      <Demo id="review-scope" title="Review: scope, file tree and diff" description="Scope tabs with counts, a compacted file tree with status letters and the diff for the selected file." align="start">
        <ReviewDemo />
      </Demo>
      <Demo id="ship-bar" title="Ship bar" description="Commit message with Generate, split Commit / Commit & push / Create PR, Hand to agent, and disabled reasons (conflicts, nothing to commit)." align="start">
        <ShipDemo />
      </Demo>
      <Demo id="worktree-dialog" title="Worktree dialog" description="Name validation, base branch search (recent / local / remote), path preview and new session switch.">
        <WorktreeDemo />
      </Demo>
      <Demo id="branch-pill" title="Branch pills" description="Long names lose their head so the distinctive tail stays visible.">
        <BranchPill name="main" status="clean" />
        <BranchPill name="feature/agent-browser-artifacts-and-git-review" status="dirty" />
        <BranchPill name="fix/merge-conflict-in-pricing" status="conflict" maxLength={16} />
        <BranchPill name="release/2.4" size="sm" copyable={false} />
      </Demo>
    </PageIntro>
  );
}

export default BrowserReviewPage;
