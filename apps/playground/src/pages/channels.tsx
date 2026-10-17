import * as React from "react";
import {
  AccessRequestQueue,
  AgentAvatar,
  AgentAvatarBuilder,
  AgentMessageNotice,
  AgentRoom,
  AgentRoomMembers,
  Button,
  CreateAgentDialog,
  DelegateToolBody,
  GuidedSetupSteps,
  MessageComposer,
  PermissionPreflightCard,
  PersonaEditor,
  PlatformConfigForm,
  PlatformConnectorList,
  PlatformIcon,
  RemoteScreenViewer,
  RotatingQRPairing,
  RunTicker,
  SimpleSelect,
  SubagentTree,
  randomAvatarSpec,
  type AccessRequest,
  type AgentAvatarSpec,
  type AgentRoomMember,
  type AgentRoomMessage,
  type ApprovedChannelUser,
  type ChannelPlatform,
  type OsPermission,
  type PlatformConnector,
  type QRPairingPhase,
  type RemoteScreenState,
  type RunTickerActivity,
  type SubagentNode,
} from "@sutra/ui";
import { RiAddLine, RiRestartLine } from "@sutra/ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Connectors                                                          */
/* ------------------------------------------------------------------ */

const initialConnectors: PlatformConnector[] = [
  {
    id: "telegram",
    platform: "telegram",
    detail: "@sutra_helper_bot",
    state: "connected",
    enabled: true,
    config: { TELEGRAM_BOT_TOKEN: "123456789:AAE-demo-token-not-real-000000", TELEGRAM_ALLOWED_USERS: ["123456789"] },
  },
  { id: "whatsapp", platform: "whatsapp", detail: "Linked to +1 415 555 0123", state: "starting", enabled: true },
  {
    id: "slack",
    platform: "slack",
    detail: "Acme workspace",
    state: "startup_failed",
    error: "invalid_auth: SLACK_BOT_TOKEN was rejected by Slack",
    enabled: true,
  },
  { id: "discord", platform: "discord", state: "stopped", detail: "Sutra#4410", enabled: false },
  { id: "matrix", platform: "matrix", state: "not_configured" },
  {
    id: "webhook",
    platform: "webhook",
    state: "connected",
    detail: "Signed POSTs",
    enabled: true,
    ingressUrl: "https://agent.example.dev/hooks/in/7f3a9c",
  },
];

function ConnectorsDemo() {
  const [connectors, setConnectors] = React.useState(initialConnectors);
  const patch = (id: string, p: Partial<PlatformConnector>) =>
    setConnectors((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  return (
    <PlatformConnectorList
      className="w-full"
      connectors={connectors}
      gatewayStatus="running"
      onEnabledChange={(id, enabled) => patch(id, { enabled, state: enabled ? "starting" : "stopped" })}
      onTest={async (id) => {
        await new Promise((r) => setTimeout(r, 700));
        return id === "slack" ? { ok: false, message: "invalid_auth" } : { ok: true, latencyMs: 80 + Math.round(Math.random() * 120) };
      }}
      onSaveConfig={async (id, config) => {
        await new Promise((r) => setTimeout(r, 400));
        patch(id, { config, state: "starting", error: undefined });
      }}
      actions={
        <Button size="sm" variant="secondary" leadingIcon={<RiRestartLine />}>
          Restart gateway
        </Button>
      }
    />
  );
}

function ConfigFormDemo() {
  const [platform, setPlatform] = React.useState<ChannelPlatform>("telegram");
  const [saved, setSaved] = React.useState<string | null>(null);
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <SimpleSelect
        aria-label="Platform"
        value={platform}
        onValueChange={(v) => {
          setPlatform(v as ChannelPlatform);
          setSaved(null);
        }}
        options={(["telegram", "slack", "discord", "signal", "matrix", "sms"] as ChannelPlatform[]).map((p) => ({
          value: p,
          label: p.charAt(0).toUpperCase() + p.slice(1),
          icon: <PlatformIcon platform={p} size="sm" decorative className="size-5" />,
        }))}
      />
      <PlatformConfigForm key={platform} platform={platform} onSubmit={(v) => setSaved(JSON.stringify(v, null, 2))} />
      {saved && <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">{saved}</pre>}
    </div>
  );
}

function PlatformIconsDemo() {
  const all: ChannelPlatform[] = ["telegram", "whatsapp", "slack", "discord", "signal", "matrix", "email", "sms", "imessage", "webhook"];
  return (
    <div className="flex flex-wrap gap-3">
      {all.map((p) => (
        <div key={p} className="flex flex-col items-center gap-1.5">
          <PlatformIcon platform={p} size="lg" />
          <span className="text-2xs text-muted-foreground">{p}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pairing + setup + access                                            */
/* ------------------------------------------------------------------ */

function QRPairingDemo() {
  const [phase, setPhase] = React.useState<QRPairingPhase>("installing");
  const [session, setSession] = React.useState(0);
  React.useEffect(() => {
    if (phase !== "installing") return;
    const t = setTimeout(() => setPhase("waiting"), 2000);
    return () => clearTimeout(t);
  }, [phase, session]);
  return (
    <div className="flex flex-col items-center gap-3">
      <RotatingQRPairing
        title="Link WhatsApp"
        caption="WhatsApp → Settings → Linked devices → Link a device"
        phase={phase}
        onPhaseChange={setPhase}
        ttl={120}
        pollInterval={2000}
        getPayload={() => `wa-pair:${session}:${Math.floor(Date.now() / 20_000).toString(36)}`}
        error="The bridge exited with code 1."
        connectedLabel="Linked to +1 415 555 0123"
      />
      <div className="flex flex-wrap justify-center gap-1.5">
        <Button size="xs" variant="ghost" onClick={() => { setSession((s) => s + 1); setPhase("installing"); }}>
          Restart
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setPhase("connected")}>
          Simulate scan
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setPhase("expired")}>
          Expire
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setPhase("error")}>
          Fail
        </Button>
      </div>
    </div>
  );
}

function GuidedSetupDemo() {
  const [done, setDone] = React.useState<string[]>(["open"]);
  return (
    <div className="w-full max-w-lg">
      <GuidedSetupSteps
        value={done}
        onValueChange={setDone}
        steps={[
          { id: "open", title: "Open BotFather in Telegram", href: "https://t.me/BotFather", linkLabel: "Open BotFather" },
          { id: "newbot", title: "Create a bot", description: "Send this command, then pick a display name.", copyValue: "/newbot" },
          {
            id: "username",
            title: "Choose a username",
            description: "It must end in “bot”.",
            copyValue: "sutra_helper_bot",
          },
          {
            id: "token",
            title: "Paste the token BotFather sends you",
            description: "It looks like 123456789:AAE… and goes into TELEGRAM_BOT_TOKEN.",
          },
          { id: "dm", title: "Send your bot a message", description: "You'll get a pairing code to approve below." },
        ]}
      />
      <p className="mt-4 text-xs text-muted-foreground">{done.length} of 5 done</p>
    </div>
  );
}

const MIN = 60_000;

function AccessQueueDemo() {
  const [requests, setRequests] = React.useState<AccessRequest[]>(() => [
    { id: "r1", handle: "@ada_l", name: "Ada Lovelace", platform: "telegram", code: "K7Q2PX", requestedAt: Date.now() - 2 * MIN },
    { id: "r2", handle: "+44 7700 900123", platform: "whatsapp", code: "M4ZT9C", requestedAt: Date.now() - 18 * MIN },
    { id: "r3", handle: "grace#0001", name: "Grace Hopper", platform: "discord", code: "B2R8WN", requestedAt: Date.now() - 3 * 60 * MIN },
  ]);
  const [approved, setApproved] = React.useState<ApprovedChannelUser[]>(() => [
    { id: "u1", handle: "@vyom", name: "Vyom", platform: "telegram", approvedAt: Date.now() - 2 * 24 * 60 * MIN },
  ]);
  return (
    <AccessRequestQueue
      className="w-full max-w-xl"
      requests={requests}
      approved={approved}
      onApprove={(id) => {
        const r = requests.find((x) => x.id === id);
        setRequests((rs) => rs.filter((x) => x.id !== id));
        if (r) setApproved((a) => [...a, { id: r.id, handle: r.handle, name: r.name, platform: r.platform, approvedAt: Date.now() }]);
      }}
      onDeny={(id) => setRequests((rs) => rs.filter((x) => x.id !== id))}
      onRevoke={(id) => setApproved((a) => a.filter((x) => x.id !== id))}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Agent room                                                          */
/* ------------------------------------------------------------------ */

const roomMembers: AgentRoomMember[] = [
  { id: "you", name: "You", kind: "human" },
  { id: "ada", name: "Ada", kind: "agent", role: "Planner" },
  { id: "rex", name: "Researcher", kind: "agent", role: "Finds sources" },
  { id: "cri", name: "Critic", kind: "agent", role: "Pokes holes" },
];

const script: { authorId: string; text: string }[] = [
  { authorId: "ada", text: "Plan: 1) size the market, 2) list three competitors, 3) draft positioning. @Researcher can you take 1 and 2?" },
  { authorId: "rex", text: "On it. Early read: ~40k teams self-host agents today; Hermes, OpenHands and Goose are the closest comps." },
  { authorId: "cri", text: "That 40k number needs a source. Also, @Ada step 3 depends on pricing, which nobody owns yet." },
  { authorId: "ada", text: "Good catch. I'll fold pricing into step 3. @You, any constraints on price points?" },
];

function AgentRoomDemo() {
  const [members, setMembers] = React.useState(roomMembers);
  const [messages, setMessages] = React.useState<AgentRoomMessage[]>([
    { id: "m0", authorId: "you", text: "@Ada let's plan the launch for the self-hosted tier. Keep it short." },
    { id: "s1", authorId: "ada", kind: "system", text: "Round 1" },
  ]);
  const [step, setStep] = React.useState(0);
  const [round, setRound] = React.useState(1);
  const order = members.filter((m) => m.kind === "agent" && !m.muted).map((m) => m.id);
  const current = step < script.length ? script[step]!.authorId : "you";

  React.useEffect(() => {
    if (step >= script.length) return;
    const t = setTimeout(() => {
      const line = script[step]!;
      setMessages((ms) => [
        ...ms,
        ...(step === 1
          ? [{ id: `n${step}`, authorId: "ada", kind: "notice" as const, notice: { direction: "outgoing" as const, agent: "Researcher", payload: "Size the market for self-hosted agent runtimes.\nList three competitors with pricing." } }]
          : []),
        { id: `m${step + 1}-${round}`, authorId: line.authorId, text: line.text },
      ]);
      if (step === 2) setRound(2);
      setStep((s) => s + 1);
    }, 2600);
    return () => clearTimeout(t);
  }, [step, round]);

  const view = members.map((m) => {
    if (m.kind === "human") return m;
    if (m.id === current) return { ...m, status: "thinking" as const };
    if (m.id === "cri" && step < 2) return { ...m, status: "holding" as const };
    return { ...m, status: "idle" as const };
  });

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[1fr_18rem]">
      <AgentRoom
        className="h-[560px]"
        title="Launch planning"
        members={view}
        messages={messages}
        round={round}
        turnOrder={[...order, "you"]}
        currentSpeakerId={current}
        actions={
          <Button size="xs" variant="ghost" onClick={() => { setStep(0); setRound(1); setMessages((ms) => ms.slice(0, 2)); }}>
            Replay
          </Button>
        }
        composer={
          <MessageComposer
            emoji={false}
            placeholder="Message the room… use @ to mention"
            onSend={(text) => setMessages((ms) => [...ms, { id: `u${ms.length}`, authorId: "you", text }])}
          />
        }
      />
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Members & turn order</p>
        <AgentRoomMembers
          value={members}
          onValueChange={setMembers}
          available={[...roomMembers, { id: "ops", name: "Ops", kind: "agent", role: "Ships it" }]}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subagents                                                           */
/* ------------------------------------------------------------------ */

const activityPool = [
  "read src/server/routes.ts",
  "grep \"rateLimit\" --type ts",
  "run pnpm test auth",
  "edit src/server/limits.ts",
  "fetch https://docs.example.com/limits",
  "summarize 4 results",
  "write notes/limits.md",
];

function useSimulatedRun() {
  const t0 = React.useRef(Date.now()).current;
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1800);
    return () => clearInterval(id);
  }, []);
  const pick = (k: number) => activityPool[(tick + k) % activityPool.length]!;
  const heat = (k: number) => (Math.sin(tick / 2 + k) + 1) / 2;
  const tree: SubagentNode[] = [
    {
      id: "root",
      name: "Orchestrator",
      type: "planner",
      task: "Add per-tenant rate limits to the API",
      status: "running",
      startedAt: t0 - 95_000,
      tools: 4 + tick,
      tokens: 12_400 + tick * 310,
      cost: 0.04 + tick * 0.002,
      heat: 0.35,
      activity: "Waiting on 2 subagents",
      children: [
        { id: "scout", name: "Scout", type: "explore", task: "Find where requests are throttled", status: "done", elapsedMs: 41_000, tools: 9, tokens: 8_100, cost: 0.03, batch: { index: 1, total: 3 }, activity: "Found 3 call sites" },
        {
          id: "impl",
          name: "Implementer",
          type: "code",
          task: "Write the limiter and wire it in",
          status: "running",
          startedAt: t0 - 52_000,
          tools: 6 + tick,
          tokens: 9_000 + tick * 500,
          cost: 0.05 + tick * 0.004,
          heat: heat(0),
          activity: pick(0),
          batch: { index: 2, total: 3 },
          children: [
            { id: "test", name: "Tester", type: "test", task: "Cover burst and steady traffic", status: tick % 6 < 3 ? "running" : "waiting", startedAt: t0 - 20_000, tools: 2 + (tick % 4), tokens: 2_000, cost: 0.01, heat: heat(2), activity: pick(3) },
          ],
        },
        { id: "docs", name: "Doc writer", type: "write", task: "Document the new headers", status: tick > 8 ? "failed" : "waiting", tools: 1, batch: { index: 3, total: 3 }, activity: tick > 8 ? "Context window exceeded" : "Queued" },
      ],
    },
  ];
  const activities: RunTickerActivity[] = Array.from({ length: tick + 1 }, (_, i) => ({ id: String(i), text: activityPool[i % activityPool.length]! }));
  return { tree, activities };
}

function SubagentsDemo() {
  const { tree, activities } = useSimulatedRun();
  const [log, setLog] = React.useState<string[]>([]);
  return (
    <div className="flex w-full flex-col gap-4">
      <RunTicker activities={activities} label="Implementer" />
      <SubagentTree
        nodes={tree}
        onSteer={(id, text) => setLog((l) => [`→ ${id}: ${text}`, ...l].slice(0, 4))}
        onStop={(id) => setLog((l) => [`■ stop ${id}`, ...l].slice(0, 4))}
        onOpen={(id) => setLog((l) => [`open ${id}`, ...l].slice(0, 4))}
      />
      {log.length > 0 && <pre className="rounded-lg bg-muted p-2 font-mono text-xs">{log.join("\n")}</pre>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Persona                                                             */
/* ------------------------------------------------------------------ */

function AvatarDemo() {
  const [spec, setSpec] = React.useState<AgentAvatarSpec>(() => randomAvatarSpec("ada"));
  return (
    <div className="flex w-full flex-col gap-6">
      <AgentAvatarBuilder value={spec} onValueChange={setSpec} />
      <div className="flex flex-wrap items-center gap-3">
        {["ada", "rex", "critic", "ops", "scout", "nova", "juno", "kite"].map((s) => (
          <AgentAvatar key={s} spec={randomAvatarSpec(s)} size={40} label={s} />
        ))}
      </div>
    </div>
  );
}

function CreateAgentDemo() {
  const [agents, setAgents] = React.useState<{ name: string; avatar: AgentAvatarSpec; role: string }[]>([
    { name: "Ada", avatar: randomAvatarSpec("ada"), role: "Planner" },
  ]);
  return (
    <div className="flex flex-col items-center gap-4">
      <CreateAgentDialog
        existingNames={agents.map((a) => a.name)}
        onCreate={async (v) => {
          await new Promise((r) => setTimeout(r, 400));
          setAgents((a) => [...a, { name: v.name, avatar: v.avatar, role: v.role }]);
        }}
        modelSlot={
          <SimpleSelect
            aria-label="Default model"
            defaultValue="sonnet"
            options={[
              { value: "sonnet", label: "Balanced" },
              { value: "opus", label: "Most capable" },
              { value: "haiku", label: "Fastest" },
            ]}
          />
        }
        toolsetsSlot={<p className="text-xs text-muted-foreground">Toolset picker goes here (web, files, terminal…).</p>}
        trigger={<Button leadingIcon={<RiAddLine />}>New agent</Button>}
      />
      <ul className="flex flex-wrap justify-center gap-3">
        {agents.map((a) => (
          <li key={a.name} className="flex items-center gap-2 rounded-box border border-border px-3 py-2">
            <AgentAvatar spec={a.avatar} size={28} label="" />
            <span className="text-sm font-medium">{a.name}</span>
            {a.role && <span className="text-xs text-muted-foreground">{a.role}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Remote screen                                                       */
/* ------------------------------------------------------------------ */

function FakeDesktop() {
  return (
    <div className="relative size-full bg-[linear-gradient(135deg,#312e81_0%,#7c3aed_45%,#db2777_100%)]">
      <div className="absolute left-[8%] top-[10%] h-[55%] w-[48%] rounded-lg bg-white/90 shadow-2xl">
        <div className="flex h-5 items-center gap-1 rounded-t-lg bg-neutral-200 px-2">
          <span className="size-2 rounded-full bg-red-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-green-400" />
        </div>
        <div className="space-y-1.5 p-3">
          <div className="h-2 w-3/4 rounded bg-neutral-300" />
          <div className="h-2 w-1/2 rounded bg-neutral-300" />
          <div className="h-2 w-2/3 rounded bg-neutral-300" />
        </div>
      </div>
      <div className="absolute bottom-[14%] right-[8%] h-[40%] w-[34%] rounded-lg bg-neutral-900/90 p-3 font-mono text-[10px] text-green-300 shadow-2xl">
        $ pnpm build
        <br />✓ built in 2.1s
      </div>
      <div className="absolute inset-x-[30%] bottom-2 h-6 rounded-xl bg-white/25 backdrop-blur" />
    </div>
  );
}

function RemoteScreenDemo() {
  const [state, setState] = React.useState<RemoteScreenState>("connecting");
  const [latency, setLatency] = React.useState(48);
  React.useEffect(() => {
    if (state !== "connecting") return;
    const t = setTimeout(() => setState("live"), 1500);
    return () => clearTimeout(t);
  }, [state]);
  React.useEffect(() => {
    const id = setInterval(() => setLatency(30 + Math.round(Math.random() * 90)), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex w-full flex-col gap-3">
      <RemoteScreenViewer
        state={state}
        latencyMs={latency}
        title="Ada's computer"
        onScreenshot={() => {}}
        onReconnect={() => setState("connecting")}
      >
        <FakeDesktop />
      </RemoteScreenViewer>
      <div className="flex flex-wrap gap-1.5">
        {(["connecting", "live", "paused", "disconnected"] as RemoteScreenState[]).map((s) => (
          <Button key={s} size="xs" variant={s === state ? "soft" : "ghost"} onClick={() => setState(s)}>
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}

function PreflightDemo() {
  const [perms, setPerms] = React.useState<OsPermission[]>([
    { id: "screen", label: "Screen recording", description: "See what's on screen.", state: "granted" },
    { id: "ax", label: "Accessibility", description: "Move the pointer and type.", state: "denied" },
    { id: "mic", label: "Microphone", description: "Voice commands.", state: "unknown", optional: true },
    { id: "cam", label: "Camera", state: "unknown", optional: true },
  ]);
  return (
    <PermissionPreflightCard
      className="w-full max-w-md"
      permissions={perms}
      onOpenSettings={(id) => setPerms((ps) => ps.map((p) => (p.id === id ? { ...p, state: "granted" } : p)))}
      onRecheck={async () => {
        await new Promise((r) => setTimeout(r, 800));
        setPerms((ps) => ps.map((p) => (p.state === "unknown" ? { ...p, state: "denied" } : p)));
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function ChannelsPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Channels & Multi-agent"
      description="Connect an agent to messaging platforms, pair devices and approve users; run multi-agent rooms, watch delegation trees, design agent personas and supervise computer use."
    >
      <Demo id="platform-connectors" title="Platform connectors" description="Six channels in mixed states: connected, starting, startup failed, stopped, not configured and a webhook with a copyable ingress URL. Toggle, Test and Configure." align="start">
        <ConnectorsDemo />
      </Demo>

      <Demo id="platform-icons" title="Platform icons" description="Original monochrome glyph tiles (not brand logos).">
        <PlatformIconsDemo />
      </Demo>

      <Demo id="platform-config-form" title="Platform config form" description="Env-var style fields with per-platform ID rules. Paste several IDs into the allowlist: commas, spaces and new lines split them; invalid ones are rejected.">
        <ConfigFormDemo />
      </Demo>

      <Demo id="rotating-qr-pairing" title="Rotating QR pairing" description="Installs the bridge, then polls a pairing payload that rotates every 20 seconds (crossfade), with an expiry countdown, connected, expired and error phases.">
        <QRPairingDemo />
      </Demo>

      <Demo id="guided-setup" title="Guided setup steps" description="BotFather onboarding: numbered steps with copyable values, external links and “I did this” checks.">
        <GuidedSetupDemo />
      </Demo>

      <Demo id="access-requests" title="Access request queue" description="Pending pairing requests with codes; approve or deny. Approved users can be revoked after confirmation.">
        <AccessQueueDemo />
      </Demo>

      <Demo id="agent-room" title="Agent room" description="Three agents and you in a simulated round: speaker colors, turn chips, hold state, @mentions, thinking indicators and an agent-to-agent notice. Reorder, mute or add agents on the right." align="start">
        <AgentRoomDemo />
      </Demo>

      <Demo id="agent-message-notice" title="Agent message notice" description="Transcript rows for agent-to-agent messages with an expandable payload." align="start">
        <div className="w-full max-w-lg">
          <AgentMessageNotice direction="outgoing" agent="Researcher" payload={"Find three competitors with public pricing.\nReturn a table: name, tiers, price per seat."} />
          <AgentMessageNotice direction="incoming" agent="Planner" payload="Plan approved. Start with the pricing table, then draft positioning." />
        </div>
      </Demo>

      <Demo id="subagent-tree" title="Subagent tree & run ticker" description="Live simulated delegation: rails, status glyphs, streaming activity, rollups, heat, batch tags, sort / filter, Steer and Stop. Arrow keys navigate the tree." align="start">
        <SubagentsDemo />
      </Demo>

      <Demo id="delegate-tool" title="Delegate tool body" description="Body for a delegate tool call: one row per child task." align="start">
        <DelegateToolBody
          className="w-full max-w-xl"
          onOpen={() => {}}
          tasks={[
            { id: "1", title: "Find where requests are throttled", agent: "Scout", status: "done", summary: "3 call sites", elapsedMs: 41_000 },
            { id: "2", title: "Write the limiter and wire it in", agent: "Implementer", status: "running", summary: "edit src/server/limits.ts", elapsedMs: 52_000 },
            { id: "3", title: "Document the new headers", agent: "Doc writer", status: "waiting" },
          ]}
        />
      </Demo>

      <Demo id="agent-avatar-builder" title="Agent avatar builder" description="Shape, color, face, seeded generation and image upload, with a live SVG preview. The row below is randomAvatarSpec(seed) for a few seeds." align="start">
        <AvatarDemo />
      </Demo>

      <Demo id="create-agent" title="Create agent dialog" description="Name (validated, unique), avatar, role, description, persona with markdown preview, model and toolset slots.">
        <CreateAgentDemo />
      </Demo>

      <Demo id="persona-editor" title="Persona editor" description="Standalone SOUL.md editor with a preview tab." align="start">
        <PersonaEditor
          className="w-full max-w-xl"
          defaultValue={"# Ada\nYou are a calm, precise **planner**.\n\n- Break work into small steps\n- Ask before spending money\n- Cite sources"}
        />
      </Demo>

      <Demo id="remote-screen" title="Remote screen viewer" description="Computer-use screen frame with states, a control lease bar (Take over / Hand back), fit, fullscreen, latency and screenshot. Apps mount their own noVNC canvas as children; this demo uses a gradient placeholder." align="start">
        <RemoteScreenDemo />
      </Demo>

      <Demo id="permission-preflight" title="Permission preflight" description="OS permission checklist with Open settings and Re-check.">
        <PreflightDemo />
      </Demo>
    </PageIntro>
  );
}

export default ChannelsPage;
