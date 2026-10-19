import * as React from "react";
import {
  Button,
  CoachmarkTour,
  ConnectionRegistry,
  GatewayStatusPopover,
  KeybindEditor,
  ProfileScopeBanner,
  RotatingNoticeBar,
  ShortcutKeys,
  ShortcutProvider,
  TipBubble,
  TranscriptTimelineRail,
  WorkspaceProfileSwitcher,
  randomAvatarSpec,
  useNoticeQueue,
  useShortcuts,
  type CoachmarkStep,
  type ConnectionTestResult,
  type GatewayRunState,
  type KeybindItem,
  type NoticeItem,
  type SavedConnection,
  type TimelineRailTurn,
  type WorkspaceGateway,
  type WorkspaceSelection,
} from "@sutra/ui";
import { RiCompass3Line, RiLightbulbLine, RiRestartLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Switcher + scope banner                                             */
/* ------------------------------------------------------------------ */

const gateways: WorkspaceGateway[] = [
  {
    id: "local",
    name: "This Mac",
    kind: "local",
    host: "127.0.0.1:8642",
    reachability: "reachable",
    latencyMs: 3,
    profiles: [
      { id: "personal", name: "Personal", isDefault: true, avatar: randomAvatarSpec("personal"), description: "Everyday assistant" },
      { id: "work", name: "Work", avatar: randomAvatarSpec("work-profile"), description: "Calendar, mail, docs" },
      { id: "coder", name: "Coder", avatar: randomAvatarSpec("coder"), description: "Repo access, terminal" },
    ],
  },
  {
    id: "homelab",
    name: "Homelab",
    kind: "remote",
    host: "homelab.tail0.ts.net",
    reachability: "reachable",
    latencyMs: 48,
    profiles: [
      { id: "media", name: "Media butler", isDefault: true, avatar: randomAvatarSpec("media") },
      { id: "ops", name: "Ops", avatar: randomAvatarSpec("ops") },
    ],
  },
  {
    id: "office",
    name: "Office GPU box",
    kind: "remote",
    host: "gpu-01.office.lan",
    reachability: "unreachable",
    profiles: [
      { id: "research", name: "Research", isDefault: true, avatar: randomAvatarSpec("research") },
      { id: "eval", name: "Eval runner", avatar: randomAvatarSpec("eval") },
    ],
  },
];

const defaultSelection: WorkspaceSelection = { gatewayId: "local", profileId: "personal" };

function SwitcherDemo() {
  const [value, setValue] = React.useState<WorkspaceSelection>({ gatewayId: "homelab", profileId: "ops" });
  const [log, setLog] = React.useState("—");
  const gateway = gateways.find((g) => g.id === value.gatewayId)!;
  const profile = gateway.profiles.find((p) => p.id === value.profileId)!;
  const isDefault = value.gatewayId === defaultSelection.gatewayId && value.profileId === defaultSelection.profileId;
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      {/* The nav anchor lives on this always-rendered wrapper: the banner itself is absent on the default profile. */}
      <div id="profile-scope-banner" className="scroll-mt-20 overflow-hidden rounded-box border border-border">
        {!isDefault ? (
          <ProfileScopeBanner
            profileName={profile.name}
            gatewayName={gateway.name}
            onSwitchBack={() => setValue(defaultSelection)}
          />
        ) : (
          <div className="border-b border-border bg-subtle px-4 py-2 text-sm text-muted-foreground">On your default profile: no banner.</div>
        )}
        <div className="flex flex-col gap-2 p-4">
          <DemoLabel>Sidebar header</DemoLabel>
          <WorkspaceProfileSwitcher
            gateways={gateways}
            value={value}
            onValueChange={(v, d) => {
              setValue(v);
              setLog(`Switched to ${d.profile.name} on ${d.gateway.name}`);
            }}
            onManageConnections={() => setLog("Manage connections")}
            onNewProfile={(gw) => setLog(`New profile on ${gw ?? "?"}`)}
            className="max-w-72"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Last action: {log}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Connection registry                                                 */
/* ------------------------------------------------------------------ */

const savedConnections: SavedConnection[] = [
  { id: "homelab", name: "Homelab", url: "https://homelab.tail0.ts.net", auth: "token", token: "demo-token", isDefault: true },
  { id: "office", name: "Office GPU box", url: "ops@gpu-01.office.lan:22", auth: "ssh-key", sshKeyPath: "~/.ssh/id_ed25519" },
];

function fakeTest(conn: SavedConnection): Promise<ConnectionTestResult> {
  return new Promise((resolve) =>
    setTimeout(() => {
      if (/office|fail|nowhere/i.test(conn.url)) resolve({ ok: false, message: "connect ETIMEDOUT after 5s" });
      else resolve({ ok: true, latencyMs: 30 + Math.round(Math.random() * 60), version: "1.4.2" });
    }, 900)
  );
}

/* ------------------------------------------------------------------ */
/* Gateway status                                                      */
/* ------------------------------------------------------------------ */

const logSamples = [
  "INFO  ws: client connected (desktop)",
  "DEBUG scheduler: tick, 0 jobs due",
  "INFO  http: GET /v1/profiles 200 4ms",
  "INFO  agent[work]: turn complete in 2.1s",
  "WARN  mcp[github]: rate limit 80% used",
  "INFO  http: POST /v1/chat 200 812ms",
];

function GatewayStatusDemo() {
  const [state, setState] = React.useState<GatewayRunState>("running");
  const [uptime, setUptime] = React.useState(5 * 3600 + 17 * 60);
  const [lines, setLines] = React.useState<string[]>(["INFO  gateway: listening on 127.0.0.1:8642"]);
  React.useEffect(() => {
    if (state !== "running") return;
    const id = setInterval(() => {
      setUptime((u) => u + 2);
      setLines((ls) => [...ls.slice(-40), logSamples[Math.floor(Math.random() * logSamples.length)]!]);
    }, 2000);
    return () => clearInterval(id);
  }, [state]);
  const transition = (via: GatewayRunState, to: GatewayRunState, line: string) => {
    setState(via);
    setLines((ls) => [...ls, line]);
    setTimeout(() => {
      setState(to);
      if (to === "running") setUptime(0);
      setLines((ls) => [...ls, to === "running" ? "INFO  gateway: listening on 127.0.0.1:8642" : "INFO  gateway: stopped"]);
    }, 1200);
  };
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <div className="flex h-8 items-center gap-3 rounded-box border border-border bg-subtle px-2 text-xs text-muted-foreground">
        <GatewayStatusPopover
          state={state}
          name="Local gateway"
          uptime={uptime}
          version="1.4.2"
          host="127.0.0.1:8642"
          logLines={lines}
          onRestart={() => transition("stopping", "running", "INFO  gateway: restarting…")}
          onStop={() => transition("stopping", "stopped", "INFO  gateway: shutting down…")}
          onStart={() => transition("starting", "running", "INFO  gateway: starting…")}
        />
        <span className="ml-auto">main · 3 agents</span>
      </div>
      <p className="text-xs text-muted-foreground">Status bar item: click it for uptime, version, controls and a live log tail.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notice bar                                                          */
/* ------------------------------------------------------------------ */

const noticeSource: NoticeItem[] = [
  { id: "update", tone: "info", message: "Sutra 1.5 is ready to install.", action: { label: "Restart to update", onClick: () => {} }, priority: 2 },
  { id: "quota", tone: "warning", message: "You've used 85% of this month's model budget.", action: { label: "Review usage", href: "#notice-bar" }, priority: 3 },
  { id: "gpu", tone: "destructive", message: "Office GPU box is unreachable. Jobs there are paused.", priority: 5 },
  { id: "promo", tone: "primary", message: "New: voice mode for every agent.", action: { label: "Try it", href: "#notice-bar" }, priority: 1 },
  { id: "update", tone: "info", message: "Sutra 1.5 is ready to install (duplicate id, deduped).", priority: 2 },
];

function NoticeDemo() {
  const [persisted, setPersisted] = React.useState<string[]>([]);
  const queue = useNoticeQueue(noticeSource, { onDismiss: (_, all) => setPersisted(all) });
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="overflow-hidden rounded-box border border-border">
        <RotatingNoticeBar notices={queue.notices} interval={5} onDismiss={queue.dismiss} />
        <div className="h-16 bg-background p-3 text-xs text-muted-foreground">App content… (hover or focus the strip to pause)</div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Dismissed (persist these): {persisted.length ? persisted.join(", ") : "none"}</span>
        <Button
          size="xs"
          variant="outline"
          leadingIcon={<RiRestartLine />}
          className="ml-auto"
          onClick={() => {
            queue.clearDismissed();
            setPersisted([]);
          }}
        >
          Restore notices
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Coachmarks + tips                                                   */
/* ------------------------------------------------------------------ */

const tourSteps: CoachmarkStep[] = [
  { target: "#workspace-switcher", title: "Switch profiles", body: "Pick a gateway and the profile you want to act as. Unreachable gateways are greyed out.", placement: "bottom" },
  { target: "#gateway-status", title: "Gateway status", body: "Check uptime, restart the gateway or tail its logs from the status bar." },
  { target: "#notice-bar", title: "Notices", body: "Important messages rotate here. Hover to pause, or dismiss what you've seen." },
  { target: "#keybind-editor", title: "Make it yours", body: "Rebind any shortcut. Conflicts are flagged before anything changes.", placement: "top" },
  { target: "#timeline-rail", title: "Jump through long chats", body: "Each tick is one of your prompts. Amber marks bookmarks, red marks flags.", placement: "left" },
];

function TourDemo() {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState("not started");
  return (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiCompass3Line />} onClick={() => setOpen(true)}>
        Start tour
      </Button>
      <p className="text-xs text-muted-foreground">Completion: {status} · ← → to move, Esc to skip</p>
      <CoachmarkTour
        steps={tourSteps}
        open={open}
        onOpenChange={setOpen}
        defaultStep={0}
        onFinish={() => setStatus("finished")}
        onSkip={(i) => setStatus(`skipped at step ${i + 1}`)}
      />
    </div>
  );
}

const tips = [
  { id: "slash", title: "Quick commands", body: "Type / in the composer to run a command or switch agents." },
  { id: "pin", title: "Pin a chat", body: "Right-click a chat in the sidebar to pin it to the top." },
  { id: "branch", title: "Branch a conversation", body: "Hover any message and choose Branch to explore an alternative." },
];

function TipDemo() {
  const [open, setOpen] = React.useState(true);
  const [muted, setMuted] = React.useState(false);
  return (
    <div className="flex min-h-48 w-full flex-col items-start gap-3">
      <TipBubble tips={tips} open={open && !muted} onOpenChange={setOpen} onDontShowAgain={() => setMuted(true)} tone="primary" side="right">
        <Button variant="secondary" leadingIcon={<RiLightbulbLine />}>
          Composer
        </Button>
      </TipBubble>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          setMuted(false);
          setOpen(true);
        }}
      >
        Show tips again{muted ? " (was muted)" : ""}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Keybind editor                                                      */
/* ------------------------------------------------------------------ */

const keybindDefaults: KeybindItem[] = [
  { id: "palette", label: "Open command palette", group: "General", keys: "mod+k" },
  { id: "new-chat", label: "New chat", group: "Chat", keys: "mod+shift+o" },
  { id: "focus-composer", label: "Focus composer", group: "Chat", keys: "/", description: "Jump to the message box" },
  { id: "toggle-sidebar", label: "Toggle sidebar", group: "View", keys: "mod+b" },
  { id: "next-turn", label: "Next turn", group: "View", keys: "alt+arrowdown" },
];

function LiveBindings({ overrides, onFire }: { overrides: Record<string, string>; onFire: (label: string) => void }) {
  useShortcuts(
    keybindDefaults
      .map((k) => ({ ...k, keys: k.id in overrides ? overrides[k.id]! : k.keys }))
      .filter((k) => k.keys)
      .map((k) => ({ id: k.id, label: k.label, group: k.group, keys: k.keys, handler: () => onFire(k.label) }))
  );
  return null;
}

function KeybindDemo() {
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [fired, setFired] = React.useState<string | null>(null);
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <ShortcutProvider>
      <LiveBindings overrides={overrides} onFire={setFired} />
      <div className="flex w-full max-w-2xl flex-col gap-3">
        <KeybindEditor
          shortcuts={keybindDefaults}
          value={overrides}
          onValueChange={setOverrides}
          onChange={(id, keys) => setLast(`${id} → ${keys || "(cleared)"}`)}
        />
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Bindings are live: try <ShortcutKeys keys={overrides["toggle-sidebar"] ?? "mod+b"} />. Last fired: {fired ?? "—"} · Last change: {last ?? "—"}
        </p>
      </div>
    </ShortcutProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Transcript + timeline rail                                          */
/* ------------------------------------------------------------------ */

const prompts = [
  "Summarize yesterday's standup notes",
  "Draft a reply to the vendor about the delayed invoice",
  "What changed in the auth service this week?",
  "Make the reply friendlier",
  "List open PRs that touch billing",
  "Why is the nightly build red?",
  "Rerun the failing test with verbose logs",
  "Explain the stack trace",
  "Propose a fix",
  "Write a regression test for it",
  "Open a PR with the fix",
  "Who should review this?",
  "Book 30 minutes with Priya tomorrow",
  "Move it to the afternoon",
  "Summarize the RFC on rate limiting",
  "Compare token bucket and sliding window",
  "Which one fits our gateway?",
  "Sketch the config schema",
  "Add per-profile overrides",
  "Generate example YAML",
  "What are the failure modes?",
  "Add metrics for throttled requests",
  "Draft the changelog entry",
  "Translate it to German",
  "Check the docs for broken links",
  "Fix the two broken links",
  "Plan next week's priorities",
  "Turn that into a checklist",
  "Remind me Friday to review it",
  "Thanks, that's all for today",
];

const transcriptTurns: TimelineRailTurn[] = prompts.map((p, i) => ({
  id: `ws-turn-${i + 1}`,
  preview: p,
  time: `${9 + Math.floor((i * 7) / 60)}:${String((i * 7) % 60).padStart(2, "0")} AM`,
  bookmarked: i === 8 || i === 17,
  flagged: i === 5,
}));

function TranscriptDemo() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<string | null>(null);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-[480px] w-full overflow-hidden rounded-box border border-border">
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col gap-4 p-4">
            {transcriptTurns.map((t, i) => (
              <div key={t.id} id={t.id} className="flex scroll-mt-4 flex-col gap-2">
                <div className="self-end rounded-box bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">{t.preview}</div>
                <div className="max-w-[85%] rounded-box bg-subtle px-3 py-2 text-sm text-foreground">
                  {`Here's what I found for “${t.preview.toLowerCase()}”. `}
                  {"Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(1 + (i % 4))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-l border-border bg-subtle/50">
          <TranscriptTimelineRail turns={transcriptTurns} scrollContainer={scrollRef} onActiveChange={setActive} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">In view: {active ?? "—"} · focus the rail and use ↑ ↓, Enter to jump</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function WorkspacePage() {
  return (
    <PageIntro
      eyebrow="Shell"
      title="Workspace & Shell"
      description="App chrome for multi-gateway agent apps: a gateway → profile switcher with a scope banner, saved connections, gateway status, a rotating notice strip, a dependency-free product tour, contextual tips, a keybind editor and a transcript timeline rail."
    >
      <Demo id="workspace-switcher" title="Workspace profile switcher" description="Three gateways (one unreachable) with profiles, latency, default badges and search. Pick a non-default profile to see the scope banner.">
        <SwitcherDemo />
      </Demo>

      <Demo id="connection-registry" title="Connection registry" description="Saved remote gateways: add or edit (name, URL/host, token / SSH key / none, extra headers), Test connection (URLs containing “office” or “fail” fail), set default, remove with confirmation." align="start">
        <ConnectionRegistry defaultConnections={savedConnections} onTest={fakeTest} className="w-full max-w-2xl" />
      </Demo>

      <Demo id="gateway-status" title="Gateway status popover" description="Status-bar item with uptime, version, restart / stop / start and a simulated live log tail.">
        <GatewayStatusDemo />
      </Demo>

      <Demo id="notice-bar" title="Rotating notice bar" description="useNoticeQueue dedupes by id and sorts by priority. Rotates every 5 s with a dot pager, pauses on hover / focus, prev / next, dismiss with a persistence callback. No auto-rotate under reduced motion." align="start">
        <NoticeDemo />
      </Demo>

      <Demo id="coachmarks" title="Coachmark tour" description="Spotlight cutout, anchored card that follows scroll and resize, Next / Back / Skip, step counter and keyboard. Steps point at the demos on this page.">
        <TourDemo />
      </Demo>

      <Demo id="tip-bubble" title="Tip bubble" description="Contextual tip anchored to an element with Next tip, accent color and Don't show again." align="start">
        <TipDemo />
      </Demo>

      <Demo id="keybind-editor" title="Keybind editor" description="Inside a ShortcutProvider. Edit → press keys (Esc cancels, Backspace clears). Conflicts warn with Replace. Reset per row or all." align="start">
        <KeybindDemo />
      </Demo>

      <Demo id="timeline-rail" title="Transcript timeline rail" description="30-turn transcript with a minimap rail: hover a tick for the prompt and time, click to jump, the in-view turn is highlighted. Amber = bookmark, red = flag." align="start">
        <TranscriptDemo />
      </Demo>
    </PageIntro>
  );
}

export default WorkspacePage;
