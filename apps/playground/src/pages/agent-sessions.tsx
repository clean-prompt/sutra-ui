import * as React from "react";
import {
  AgentRoster,
  AgentRosterPanel,
  AgentSessionList,
  AgentStatusDot,
  AgentTodoList,
  BackgroundTaskRow,
  BookmarkButton,
  BookmarksPane,
  Button,
  ChatConversation,
  ChatConversationContent,
  ChatMessage,
  ChatMessageBody,
  ChatMessageContent,
  ConnectionState,
  ContextBanner,
  ContextUsageBreakdown,
  FocusViewItem,
  FocusViewProvider,
  FocusViewToggle,
  OnboardingChecklist,
  PasteCodeAuth,
  ResponseRating,
  SessionStats,
  SpinnerVerbs,
  TranscriptSystemRow,
  TranscriptTurn,
  UsageLimitBars,
  useTranscriptBookmarks,
  type AgentRosterAgent,
  type AgentSession,
  type AgentSessionGroup,
  type AgentTodoItem,
} from "@sutra/ui";
import { RiFlashlightLine, RiGitBranchLine, RiGitMergeLine, RiHistoryLine, RiTerminalLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/** Anchor ids of the demos on this page. */
export const agentSessionsAnchors = [
  "agent-session-list",
  "agent-status-dot",
  "agent-transcript",
  "transcript-system-rows",
  "agent-todo-list",
  "agent-roster",
  "background-task",
  "spinner-verbs",
  "context-banner",
  "response-rating",
  "context-usage",
  "usage-limits",
  "session-stats",
  "onboarding-checklist",
  "connection-state",
  "paste-code-auth",
] as const;

export function AgentSessionsPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Tasks & Sessions"
      description="Building blocks for agentic coding assistants: session sidebars with status, task lists, subagent rosters, transcript chrome, usage and onboarding."
    >
      <SessionListDemo />
      <StatusDotDemo />
      <TranscriptDemo />
      <SystemRowsDemo />
      <TodoListDemo />
      <RosterDemo />
      <BackgroundTaskDemo />
      <SpinnerVerbsDemo />
      <ContextBannerDemo />
      <ResponseRatingDemo />
      <ContextUsageDemo />
      <UsageLimitsDemo />
      <SessionStatsDemo />
      <OnboardingDemo />
      <ConnectionStateDemo />
      <PasteCodeAuthDemo />
    </PageIntro>
  );
}

export default AgentSessionsPage;

/* ------------------------------------------------------------------ */

const minute = 60_000;

function SessionListDemo() {
  const [now] = React.useState(() => Date.now());
  const [groups, setGroups] = React.useState<AgentSessionGroup[]>([
    { id: "web", name: "web-app" },
    { id: "api", name: "api-server" },
    { id: "infra", name: "infra", defaultCollapsed: true },
  ]);
  const [sessions, setSessions] = React.useState<AgentSession[]>([
    { id: "1", title: "Fix hydration warning on /settings", status: "running", updatedAt: now - 1 * minute, groupId: "web", branch: "fix/hydration", cost: "$0.41" },
    { id: "2", title: "Add dark mode toggle", status: "waiting", updatedAt: now - 6 * minute, groupId: "web", branch: "feat/dark-mode" },
    { id: "3", title: "Migrate to React Router 7", status: "unread", updatedAt: now - 52 * minute, groupId: "web", branch: "chore/rr7", cost: "$2.10" },
    { id: "4", title: "Rate limiter for /v1/search", status: "failed", updatedAt: now - 3 * 60 * minute, groupId: "api", branch: "feat/rate-limit" },
    { id: "5", title: "Write tests for billing webhooks", status: "idle", updatedAt: now - 26 * 60 * minute, groupId: "api", repo: "acme/api" },
    { id: "6", title: "Terraform: split staging state", status: "idle", updatedAt: now - 4 * 24 * 60 * minute, groupId: "infra" },
    { id: "7", title: "Explain the auth flow", status: "idle", updatedAt: now - 2 * 60 * minute },
    { id: "8", title: "Nightly dependency bump", status: "elsewhere", updatedAt: now - 12 * minute, location: "remote", repo: "acme/web" },
    { id: "9", title: "Triage flaky e2e suite", status: "running", updatedAt: now - 3 * minute, location: "remote", repo: "acme/web" },
  ]);
  const [active, setActive] = React.useState<string | null>("1");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [log, setLog] = React.useState("");

  const remove = (ids: string[], verb: string) => {
    setSessions((s) => s.filter((x) => !ids.includes(x.id)));
    setSelected([]);
    setLog(`${verb} ${ids.length} session${ids.length > 1 ? "s" : ""}`);
  };

  return (
    <Demo
      id="agent-session-list"
      title="Session list"
      description="Groups with inline rename, status dots, search, status filter, local/remote, Cmd/Ctrl-click and Shift-range multi-select with bulk actions, context menu and arrow-key navigation."
      align="start"
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="h-[30rem] w-full max-w-xs rounded-box border border-border bg-subtle p-2">
          <AgentSessionList
            className="h-full"
            sessions={sessions}
            groups={groups}
            now={now}
            activeId={active}
            onActiveChange={setActive}
            selectedIds={selected}
            onSelectedIdsChange={setSelected}
            onNewSession={(g) => setLog(g ? `New session in ${groups.find((x) => x.id === g)?.name}` : "New session")}
            onCreateGroup={() => setGroups((g) => [...g, { id: `g${g.length + 1}`, name: `New group ${g.length - 2}` }])}
            onRenameSession={(id, title) => setSessions((s) => s.map((x) => (x.id === id ? { ...x, title } : x)))}
            onRenameGroup={(id, name) => setGroups((g) => g.map((x) => (x.id === id ? { ...x, name } : x)))}
            onArchive={(ids) => remove(ids, "Archived")}
            onDelete={(ids) => remove(ids, "Deleted")}
            onMarkUnread={(ids) =>
              setSessions((s) => s.map((x) => (ids.includes(x.id) ? { ...x, status: "unread" } : x)))
            }
            onMoveToGroup={(ids, groupId) =>
              setSessions((s) => s.map((x) => (ids.includes(x.id) ? { ...x, groupId: groupId ?? undefined } : x)))
            }
          />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Active: <span className="text-foreground">{sessions.find((s) => s.id === active)?.title ?? "none"}</span>
          </p>
          <p>Selected: {selected.length ? selected.join(", ") : "none"}</p>
          {log && <p>Last action: {log}</p>}
          <p className="text-xs">Tips: double-click or F2 to rename, Space to select, Shift+Arrow to extend, right-click for more.</p>
        </div>
      </div>
    </Demo>
  );
}

function StatusDotDemo() {
  return (
    <Demo id="agent-status-dot" title="Status dot" description="Running animates, needs-input draws attention, elsewhere is hollow.">
      {(["running", "waiting", "idle", "unread", "failed", "elsewhere"] as const).map((s) => (
        <span key={s} className="inline-flex items-center gap-2 text-sm">
          <AgentStatusDot status={s} decorative />
          {{ running: "Running", waiting: "Needs input", idle: "Idle", unread: "Unread", failed: "Failed", elsewhere: "Running elsewhere" }[s]}
        </span>
      ))}
    </Demo>
  );
}

/* ------------------------------------------------------------------ */

function ToolLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-control border border-border bg-subtle px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
      <RiTerminalLine className="size-3.5" aria-hidden />
      {children}
    </div>
  );
}

function TranscriptDemo() {
  const bm = useTranscriptBookmarks([
    { id: "msg-a2", snippet: "The settings page renders the theme from localStorage during SSR…", author: "Assistant", time: Date.now() - 14 * minute },
  ]);
  const [showPane, setShowPane] = React.useState(true);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const jump = (id: string) => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(`#${id}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.animate?.([{ backgroundColor: "var(--primary-soft)" }, { backgroundColor: "transparent" }], { duration: 1200 });
  };

  const Assistant = ({ id, snippet, children }: { id: string; snippet: string; children: React.ReactNode }) => (
    <FocusViewItem kind="assistant">
      <div id={id} className="group/row relative rounded-control">
        <ChatMessage role="assistant" variant="flat">
          <ChatMessageBody>
            <ChatMessageContent className="text-sm leading-6">{children}</ChatMessageContent>
          </ChatMessageBody>
        </ChatMessage>
        <BookmarkButton
          className="absolute -right-1 top-0 opacity-0 group-hover/row:opacity-100 aria-pressed:opacity-100 focus-visible:opacity-100"
          pressed={bm.isBookmarked(id)}
          onPressedChange={() => bm.toggle({ id, snippet, author: "Assistant", time: Date.now() })}
        />
      </div>
    </FocusViewItem>
  );

  return (
    <Demo
      id="agent-transcript"
      title="Transcript"
      description="The user's prompt sticks to the top while its turn scrolls (click to jump back). Compaction, interruption and checkpoint dividers, bookmarks and focus view."
      align="start"
    >
      <FocusViewProvider>
        <div className="flex items-center gap-2">
          <FocusViewToggle />
          <Button variant="ghost" size="xs" onClick={() => setShowPane((v) => !v)}>
            {showPane ? "Hide" : "Show"} bookmarks
          </Button>
        </div>
        <div className="flex flex-col gap-4 md:flex-row">
          <ChatConversation className="h-[28rem] flex-1 rounded-box border border-border" initial={false}>
            <ChatConversationContent ref={scrollerRef} className="gap-4 p-4">
              <TranscriptSystemRow kind="date" date={Date.now() - 86_400_000} />
              <TranscriptSystemRow kind="divider" icon={<RiFlashlightLine aria-hidden />} title="Teleported from web" />
              <TranscriptTurn id="turn-1" index={1} prompt="The /settings page flashes the light theme before switching to dark. Can you find out why and fix it?">
                <FocusViewItem kind="tool">
                  <ToolLine>grep -rn "localStorage" src/settings</ToolLine>
                </FocusViewItem>
                <Assistant id="msg-a1" snippet="Found it: the theme is read in a useEffect…">
                  Found it: the theme is read inside a <code>useEffect</code>, so the first paint always uses the default light palette. I&apos;ll move the
                  read into an inline script that runs before hydration.
                </Assistant>
                <FocusViewItem kind="tool">
                  <ToolLine>edit src/app/layout.tsx (+14 −3)</ToolLine>
                </FocusViewItem>
                <FocusViewItem kind="tool">
                  <ToolLine>npm test -- settings</ToolLine>
                </FocusViewItem>
                <Assistant id="msg-a2" snippet="The settings page renders the theme from localStorage during SSR…">
                  The settings page now renders the theme from a cookie during SSR and falls back to localStorage on the client. All 42 settings tests
                  pass. Want me to apply the same fix to the onboarding pages?
                </Assistant>
                <TranscriptSystemRow kind="divider" icon={<RiHistoryLine aria-hidden />} title="Checkpoint · 3 files changed" />
              </TranscriptTurn>
              <TranscriptSystemRow
                kind="compaction"
                summary="Fixed the theme flash on /settings by reading the theme cookie during SSR. Tests pass. Next: apply to onboarding pages."
              />
              <TranscriptTurn id="turn-2" index={2} prompt="Yes, do the onboarding pages too, and add a regression test that checks the first paint.">
                <FocusViewItem kind="tool">
                  <ToolLine>read src/onboarding/layout.tsx</ToolLine>
                </FocusViewItem>
                <Assistant id="msg-a3" snippet="Updating the three onboarding layouts…">
                  Updating the three onboarding layouts and adding a Playwright check that snapshots the first frame…
                </Assistant>
                <TranscriptSystemRow kind="interrupted" />
                <TranscriptSystemRow kind="divider" icon={<RiHistoryLine aria-hidden />} title="Checkpoint · 1 file changed" />
              </TranscriptTurn>
              <TranscriptTurn id="turn-3" index={3} prompt="Skip Playwright, use a Vitest DOM test instead.">
                <TranscriptSystemRow kind="compacting" />
              </TranscriptTurn>
            </ChatConversationContent>
          </ChatConversation>
          {showPane && (
            <BookmarksPane className="md:w-64" bookmarks={bm.bookmarks} onJump={jump} onRemove={bm.remove} onClose={() => setShowPane(false)} />
          )}
        </div>
      </FocusViewProvider>
    </Demo>
  );
}

function SystemRowsDemo() {
  const [retries, setRetries] = React.useState(0);
  return (
    <Demo id="transcript-system-rows" title="System rows" description="Every system row variant on its own." align="start">
      <TranscriptSystemRow kind="date" />
      <TranscriptSystemRow kind="compaction" summary="Summary of the earlier conversation goes here." />
      <TranscriptSystemRow kind="compacting" />
      <TranscriptSystemRow kind="interrupted" />
      <TranscriptSystemRow kind="command" command="/review" args="src/billing" result="Reviewed 6 files: 2 suggestions, 0 blocking issues." />
      <TranscriptSystemRow
        kind="error"
        title="Request failed"
        error={`API error 529: overloaded${retries ? ` (retried ${retries}×)` : ""}`}
        onRetry={() => setRetries((r) => r + 1)}
      />
      <TranscriptSystemRow kind="divider" icon={<RiGitMergeLine aria-hidden />} title="Merged main into feat/dark-mode" />
    </Demo>
  );
}

/* ------------------------------------------------------------------ */

const todoPlan: Omit<AgentTodoItem, "status">[] = [
  { id: "1", content: "Reproduce the theme flash", activeForm: "Reproducing the theme flash" },
  { id: "2", content: "Read the theme during SSR", activeForm: "Reading the theme during SSR" },
  { id: "3", content: "Update onboarding layouts", activeForm: "Updating onboarding layouts" },
  { id: "4", content: "Add a first-paint regression test", activeForm: "Adding a first-paint regression test" },
  { id: "5", content: "Run the full test suite", activeForm: "Running the full test suite" },
];

function TodoListDemo() {
  const [step, setStep] = React.useState(1);
  React.useEffect(() => {
    const id = setInterval(() => setStep((s) => (s > todoPlan.length ? 0 : s + 1)), 2200);
    return () => clearInterval(id);
  }, []);
  const items: AgentTodoItem[] = todoPlan.map((t, i) => ({
    ...t,
    status: i < step - 1 ? "succeeded" : i === step - 1 ? "running" : "pending",
  }));
  return (
    <Demo id="agent-todo-list" title="Todo list" description="Progresses on a timer. The compact variant sits inline in a transcript." align="start">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AgentTodoList items={items} />
        <div className="space-y-1">
          <DemoLabel>Compact</DemoLabel>
          <AgentTodoList items={items} density="compact" title="Update Todos" />
        </div>
      </div>
    </Demo>
  );
}

function RosterDemo() {
  const [start] = React.useState(() => Date.now());
  const [agents, setAgents] = React.useState<AgentRosterAgent[]>([
    { id: "a", name: "Map the auth module", type: "Explore", description: "Find every place that reads the session cookie", status: "running", startedAt: start - 48_000, tokens: 18_200, toolUses: 14 },
    { id: "b", name: "Draft migration", type: "general-purpose", description: "Write the SQL migration for the new sessions table", status: "running", startedAt: start - 95_000, tokens: 9_400, toolUses: 6 },
    { id: "c", name: "Check test coverage", type: "Explore", description: "List untested branches in src/billing", status: "running", startedAt: start - 12_000, tokens: 2_100, toolUses: 3 },
    { id: "d", name: "Lint pass", type: "general-purpose", status: "done", startedAt: start - 300_000, endedAt: start - 240_000, tokens: 4_000, toolUses: 2 },
  ]);
  const [opened, setOpened] = React.useState<string | null>(null);
  const stop = (id: string) =>
    setAgents((list) => list.map((a) => (a.id === id ? { ...a, status: "failed", endedAt: Date.now(), description: "Stopped by user" } : a)));
  return (
    <Demo id="agent-roster" title="Agent roster" description="Pill with an aggregate status that opens the roster; rows tick live, can be stopped or opened." align="start">
      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-2">
          <DemoLabel>Pill + popover</DemoLabel>
          <AgentRoster agents={agents} onStop={stop} onOpenTranscript={setOpened} />
        </div>
        <div className="w-full max-w-md space-y-2">
          <DemoLabel>Inline panel</DemoLabel>
          <div className="rounded-box border border-border bg-card p-1.5">
            <AgentRosterPanel agents={agents} onStop={stop} onOpenTranscript={setOpened} />
          </div>
          {opened && <p className="text-xs text-muted-foreground">Opened transcript: {agents.find((a) => a.id === opened)?.name}</p>}
        </div>
      </div>
    </Demo>
  );
}

function BackgroundTaskDemo() {
  const [start] = React.useState(() => Date.now() - 37_000);
  const [lines, setLines] = React.useState<string[]>(["> vite", "  VITE v6 ready in 412 ms"]);
  const [status, setStatus] = React.useState<"running" | "killed">("running");
  const [ended, setEnded] = React.useState<number | undefined>();
  React.useEffect(() => {
    if (status !== "running") return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setLines((l) => [...l, `  [hmr] update /src/app/layout.tsx (${n})`]);
    }, 1800);
    return () => clearInterval(id);
  }, [status]);
  return (
    <Demo id="background-task" title="Background shell task" description="Command, status, live elapsed time, the tail of the output and a kill action." align="start">
      <BackgroundTaskRow
        command="npm run dev -- --port 5173"
        status={status}
        startedAt={start}
        endedAt={ended}
        output={lines.join("\n")}
        onKill={() => {
          setStatus("killed");
          setEnded(Date.now());
        }}
      />
      <BackgroundTaskRow command="pytest -x tests/billing" status="failed" exitCode={1} startedAt={0} endedAt={84_000} output={"FAILED tests/billing/test_refunds.py::test_partial\n1 failed, 211 passed in 83.9s"} />
    </Demo>
  );
}

function SpinnerVerbsDemo() {
  const [start] = React.useState(() => Date.now());
  const [tokens, setTokens] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTokens((t) => t + 137), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <Demo id="spinner-verbs" title="Spinner verbs" description="Rotating verbs with shimmer, elapsed time and tokens. Stops rotating under reduced motion." align="start">
      <SpinnerVerbs startedAt={start} tokens={tokens} hint="esc to interrupt" />
      <SpinnerVerbs verbs={["Indexing", "Embedding", "Ranking"]} order="sequential" interval={1500} />
    </Demo>
  );
}

function ContextBannerDemo() {
  const [checking, setChecking] = React.useState(false);
  return (
    <Demo id="context-banner" title="Context banner" description="Worktree and branch context with actions; warning with expandable git output." align="start">
      <ContextBanner name="feat-x" nameIcon={<RiGitBranchLine aria-hidden />}>
        This session is in worktree
      </ContextBanner>
      <ContextBanner
        name="feat/dark-mode"
        action={{
          label: "Checkout",
          loading: checking,
          onClick: () => {
            setChecking(true);
            setTimeout(() => setChecking(false), 1200);
          },
        }}
      >
        This session was started on branch
      </ContextBanner>
      <ContextBanner
        variant="warning"
        name="feat/dark-mode"
        output={`error: Your local changes to the following files would be overwritten by checkout:\n\tsrc/app/layout.tsx\nPlease commit your changes or stash them before you switch branches.\nAborting`}
        action={{ label: "Retry" }}
      >
        Branch checkout failed
      </ContextBanner>
    </Demo>
  );
}

function ResponseRatingDemo() {
  const [last, setLast] = React.useState("");
  return (
    <Demo id="response-rating" title="Response rating" description="Thumbs, follow-up reasons, thank-you state.">
      <div className="space-y-2">
        <ResponseRating onSubmit={(f) => setLast(`${f.rating}${f.reasons.length ? `: ${f.reasons.join(", ")}` : ""}`)} />
        {last && <p className="text-xs text-muted-foreground">Submitted {last}</p>}
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */

function ContextUsageDemo() {
  const [messages, setMessages] = React.useState(96_400);
  return (
    <Demo id="context-usage" title="Context usage" description="Segmented track per category with token counts and a compact action." align="start">
      <div className="max-w-md">
        <ContextUsageBreakdown
          max={200_000}
          categories={[
            { key: "system", label: "System prompt", tokens: 3_100, color: "var(--muted-foreground)" },
            { key: "tools", label: "Tools", tokens: 14_800, color: "info" },
            { key: "memory", label: "Memory files", tokens: 2_400, color: "warning" },
            { key: "messages", label: "Messages", tokens: messages, color: "primary" },
          ]}
          onCompact={() => setMessages(12_000)}
        />
      </div>
    </Demo>
  );
}

function UsageLimitsDemo() {
  const [now] = React.useState(() => Date.now());
  const nextMonday = React.useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  }, [now]);
  return (
    <Demo id="usage-limits" title="Usage limits" description="Rolling windows with threshold colors and reset captions, a window toggle and per-model attribution." align="start">
      <div className="max-w-md">
        <UsageLimitBars
          title="Plan usage"
          now={now}
          views={[
            { value: "session", label: "Session" },
            { value: "weekly", label: "Weekly" },
          ]}
          windows={[
            { id: "session", label: "Current session", percent: 38, resetsAt: now + (2 * 60 + 14) * minute, view: "session" },
            { id: "weekly", label: "Weekly", percent: 78, resetsAt: nextMonday, view: "weekly" },
            { id: "weekly-model", label: "Weekly (Opus)", percent: 93, resetsAt: nextMonday, view: "weekly" },
          ]}
          models={[
            { name: "Opus", percent: 62 },
            { name: "Sonnet", percent: 31 },
            { name: "Haiku", percent: 7 },
          ]}
        />
      </div>
    </Demo>
  );
}

function SessionStatsDemo() {
  return (
    <Demo id="session-stats" title="Session stats" align="start">
      <div className="max-w-sm">
        <SessionStats
          cost={1.8734}
          apiDurationMs={4 * minute + 12_000}
          wallDurationMs={18 * minute + 3_000}
          linesAdded={214}
          linesRemoved={37}
          extra={[{ label: "Tool calls", value: "58" }]}
        />
      </div>
    </Demo>
  );
}

/* ------------------------------------------------------------------ */

function OnboardingDemo() {
  const [done, setDone] = React.useState<string[]>(["ask"]);
  const [dismissed, setDismissed] = React.useState(false);
  const items = [
    { id: "ask", title: "Ask about your codebase", description: "Try “How is auth wired up?”" },
    { id: "edit", title: "Make your first edit", description: "Ask for a small change and review the diff." },
    { id: "run", title: "Run a command", description: "Let the agent run your tests." },
    { id: "plan", title: "Plan a larger change", description: "Switch to plan mode before a refactor." },
  ].map((i) => ({ ...i, completed: done.includes(i.id) }));
  return (
    <Demo id="onboarding-checklist" title="Onboarding checklist" description="Completed, next (highlighted) and upcoming milestones." align="start">
      {dismissed ? (
        <Button variant="outline" size="sm" onClick={() => setDismissed(false)}>
          Show checklist again
        </Button>
      ) : (
        <div className="max-w-md">
          <OnboardingChecklist
            items={items}
            description="Four quick steps to learn the ropes."
            onShowMe={(id) => setDone((d) => [...d, id])}
            onDismiss={() => setDismissed(true)}
          />
        </div>
      )}
    </Demo>
  );
}

function ConnectionStateDemo() {
  const [reconnecting, setReconnecting] = React.useState(false);
  return (
    <Demo id="connection-state" title="Connection states" description="Full-panel host states." align="start">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-box border border-border">
          <ConnectionState
            state="unresponsive"
            reconnecting={reconnecting}
            onReconnect={() => {
              setReconnecting(true);
              setTimeout(() => setReconnecting(false), 2000);
            }}
          />
        </div>
        <div className="rounded-box border border-border">
          <ConnectionState state="disconnected" onReconnect={() => {}} />
        </div>
        <div className="rounded-box border border-border">
          <ConnectionState state="error" details="ECONNREFUSED 127.0.0.1:43117" onRetry={() => {}} />
        </div>
      </div>
    </Demo>
  );
}

function PasteCodeAuthDemo() {
  return (
    <Demo id="paste-code-auth" title="Paste-code sign in" description="Fallback when the browser can't redirect back. Any code of 8+ characters signs in; “bad-code” fails." align="start">
      <div className="max-w-md">
        <PasteCodeAuth
          url="https://auth.example.com/device?session=4F7K-92QD"
          onOpenUrl={() => {}}
          validate={(c) => (c.length < 8 ? "That code looks too short" : null)}
          onSubmit={(code) =>
            new Promise<void>((resolve, reject) =>
              setTimeout(() => (code === "bad-code" ? reject(new Error("That code has expired. Get a new one.")) : resolve()), 900)
            )
          }
        />
      </div>
    </Demo>
  );
}
