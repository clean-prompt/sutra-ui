import * as React from "react";
import {
  BackendPicker,
  Button,
  CustomEndpointForm,
  EnsembleBuilder,
  FallbackChainEditor,
  HardwareFitHint,
  LocalModelBrowser,
  ModelInfoCard,
  ModelVisibilityManager,
  ProviderConnectDialog,
  ProviderKeysGroups,
  ProviderList,
  ProviderModelPicker,
  ProviderModelPickerPopover,
  ProviderQuotaChip,
  ReasoningPill,
  StagedSetupHero,
  SystemResourcesBar,
  TaskModelAssignment,
  type BackendOption,
  type DeviceCodePollResult,
  type EnsembleConfig,
  type LocalModelDownloadState,
  type LocalModelListing,
  type ModelRef,
  type ProviderEntry,
  type ProviderEnvKey,
  type ProviderKeyGroup,
  type ReasoningSettings,
  type RoutingProvider,
  type SetupStage,
  type TaskModelMap,
} from "@sutra/ui";
import { RiAttachment2, RiKey2Line, RiSendPlaneFill, RiShieldKeyholeLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Sample data (fictional providers, no network)                       */
/* ------------------------------------------------------------------ */

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const GB = 1024 ** 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const providerEntries: ProviderEntry[] = [
  { id: "nimbus", name: "Nimbus AI", auth: "oauth", status: "connected", account: "you@example.com", tokenExpiresAt: NOW + 12 * DAY, modelCount: 6, quota: { used: 62, resetsAt: NOW + 3 * HOUR, label: "weekly" } },
  { id: "corvid", name: "Corvid", auth: "api-key", status: "expired", account: "ck-…a91f", tokenExpiresAt: NOW - 2 * DAY, modelCount: 9 },
  { id: "hearth", name: "Hearth Local", auth: "local", status: "connected", account: "localhost:11434", modelCount: 4 },
  { id: "gateway", name: "Team Gateway", auth: "custom", status: "error", error: "TLS handshake failed", modelCount: 3 },
  { id: "relay", name: "Relay Router", auth: "api-key", status: "not-configured", description: "Hundreds of models behind one key" },
  { id: "aster", name: "Aster Labs", auth: "oauth", status: "not-configured", description: "Sign in with your Aster account" },
];

const routing: RoutingProvider[] = [
  {
    id: "nimbus",
    name: "Nimbus AI",
    configured: true,
    models: [
      { id: "opal-4", name: "Nimbus Opal 4", contextLength: 200_000, inputPrice: 3, outputPrice: 15, capabilities: ["tools", "vision", "reasoning"], knowledgeCutoff: "2025-03", notes: "Best for long agentic tasks; supports extended thinking." },
      { id: "quartz-mini", name: "Nimbus Quartz Mini", contextLength: 128_000, inputPrice: 0.25, outputPrice: 1.25, capabilities: ["tools", "vision"] },
      { id: "council", name: "Council Ensemble", ensemble: true, capabilities: ["reasoning"] },
    ],
  },
  {
    id: "corvid",
    name: "Corvid",
    configured: true,
    models: [
      { id: "c5", name: "Corvid 5", contextLength: 400_000, inputPrice: 1.25, outputPrice: 10, capabilities: ["tools", "reasoning"] },
      { id: "c5-mini", name: "Corvid 5 Mini", contextLength: 400_000, inputPrice: 0.15, outputPrice: 0.6, capabilities: ["tools"] },
      { id: "c-vision", name: "Corvid Vision", contextLength: 32_000, inputPrice: 0.5, outputPrice: 1.5, capabilities: ["vision"] },
    ],
  },
  {
    id: "hearth",
    name: "Hearth Local",
    configured: true,
    models: [
      { id: "wren-8b", name: "Wren 8B Instruct", contextLength: 32_768, inputPrice: 0, outputPrice: 0, capabilities: ["tools"] },
      { id: "nomic-embed", name: "Lattice Embed", contextLength: 8192, inputPrice: 0, outputPrice: 0 },
    ],
  },
  { id: "relay", name: "Relay Router", configured: false, models: [{ id: "auto", name: "Relay Auto" }, { id: "free", name: "Relay Free Tier" }] },
  { id: "aster", name: "Aster Labs", configured: false, models: [] },
];

const keyGroups: ProviderKeyGroup[] = [
  { id: "corvid", name: "Corvid", priority: 2, docsUrl: "https://example.com/corvid/keys", keys: [{ name: "CORVID_API_KEY", value: "ck-demo-7f2a91f", description: "Primary key" }, { name: "CORVID_ORG_ID", description: "Optional organization" }] },
  { id: "nimbus", name: "Nimbus AI", priority: 1, docsUrl: "https://example.com/nimbus/keys", keys: [{ name: "NIMBUS_API_KEY", description: "Used when OAuth is not signed in" }] },
  { id: "relay", name: "Relay Router", priority: 3, keys: [{ name: "RELAY_API_KEY" }] },
];

const localModels: LocalModelListing[] = [
  { id: "wren-8b", name: "Wren 8B Instruct", author: "wren-labs", paramsB: 8, downloads: 1_250_000, likes: 4200, description: "Small, fast general assistant with tool use.", tags: ["chat", "tools"], variants: [{ quant: "Q4_K_M", sizeGB: 4.9 }, { quant: "Q8_0", sizeGB: 8.5 }, { quant: "F16", sizeGB: 16 }] },
  { id: "kestrel-14b", name: "Kestrel Coder 14B", author: "kestrel", paramsB: 14, downloads: 380_000, likes: 1900, description: "Code completion and repair.", tags: ["code"], variants: [{ quant: "Q4_K_M", sizeGB: 8.9 }, { quant: "Q6_K", sizeGB: 12.1 }] },
  { id: "heron-32b", name: "Heron 32B", author: "heron", paramsB: 32, downloads: 210_000, likes: 2600, description: "Strong reasoning, needs a big GPU.", tags: ["reasoning"], variants: [{ quant: "Q4_K_M", sizeGB: 19.8 }, { quant: "Q8_0", sizeGB: 34.8 }] },
  { id: "heron-70b", name: "Heron 70B", author: "heron", paramsB: 70, downloads: 98_000, likes: 3100, variants: [{ quant: "Q4_K_M", sizeGB: 42.5 }] },
];

const hardware = { ramGB: 32, gpus: [{ name: "Demo GPU 12 GB", vramGB: 12 }] };

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function ProviderListDemo() {
  const [providers, setProviders] = React.useState(providerEntries);
  const [connecting, setConnecting] = React.useState<ProviderEntry | null>(null);
  return (
    <>
      <ProviderList
        className="max-w-3xl"
        providers={providers}
        onConnect={setConnecting}
        onManage={() => undefined}
        onDisconnect={(p) => setProviders((list) => list.map((x) => (x.id === p.id ? { ...x, status: "not-configured", account: undefined, quota: undefined } : x)))}
      />
      {connecting && (
        <ProviderConnectDialog
          open
          onOpenChange={(o) => !o && setConnecting(null)}
          provider={connecting}
          methods={connecting.auth === "oauth" ? ["device", "pkce", "api-key"] : ["api-key"]}
          {...simulatedConnect}
          onConnected={() => setProviders((list) => list.map((x) => (x.id === connecting.id ? { ...x, status: "connected", tokenExpiresAt: Date.now() + 30 * DAY } : x)))}
        />
      )}
    </>
  );
}

function makeDevicePoller(approveAfter: number) {
  let polls = 0;
  return async (): Promise<DeviceCodePollResult> => {
    await sleep(200);
    polls += 1;
    return polls >= approveAfter ? "approved" : "pending";
  };
}

const simulatedConnect = {
  onStartDeviceFlow: async () => {
    await sleep(600);
    return { userCode: "KQ7M-4XRT", verificationUrl: "https://login.example.com/device", expiresIn: 60, interval: 2 };
  },
  onPollDeviceFlow: makeDevicePoller(4),
  authorizeUrl: "https://login.example.com/authorize?demo=1",
  onSubmitCode: async (code: string) => {
    await sleep(500);
    if (code.length < 6) throw new Error("That code is too short. Paste the full code.");
  },
  getKeyUrl: "https://example.com/keys",
  onValidateKey: async (key: string) => {
    await sleep(700);
    return key.length >= 12 ? { ok: true, message: "Key works · 14 models available" } : { ok: false, message: "Rejected (401). Keys are at least 12 characters." };
  },
};

function ConnectDialogDemo() {
  const [open, setOpen] = React.useState<null | "oauth" | "short">(null);
  const [log, setLog] = React.useState<string[]>([]);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        <Button leadingIcon={<RiShieldKeyholeLine />} onClick={() => setOpen("oauth")}>
          Connect Nimbus AI
        </Button>
        <Button variant="secondary" onClick={() => setOpen("short")}>
          Device code that expires in 8s
        </Button>
      </div>
      <DemoLabel>Device code approves after ~4 polls. Paste-code accepts 6+ characters. API keys need 12+ characters.</DemoLabel>
      {log.length > 0 && <DemoLabel>{log.join(" · ")}</DemoLabel>}
      <ProviderConnectDialog
        open={open === "oauth"}
        onOpenChange={(o) => !o && setOpen(null)}
        provider={{ name: "Nimbus AI" }}
        {...simulatedConnect}
        onPollDeviceFlow={makeDevicePoller(4)}
        onSaveKey={() => setLog((l) => [...l, "key saved"])}
        onConnected={(m) => setLog((l) => [...l, `connected via ${m}`])}
      />
      <ProviderConnectDialog
        open={open === "short"}
        onOpenChange={(o) => !o && setOpen(null)}
        provider={{ name: "Aster Labs" }}
        methods={["device"]}
        onStartDeviceFlow={async () => {
          await sleep(400);
          return { userCode: "ZX81-PLMN", verificationUrl: "https://login.example.com/device", expiresIn: 8, interval: 2 };
        }}
        onPollDeviceFlow={async () => "pending"}
      />
    </div>
  );
}

function CustomEndpointDemo() {
  const [saved, setSaved] = React.useState<string | null>(null);
  return (
    <div className="w-full max-w-xl space-y-2">
      <CustomEndpointForm
        defaultValues={{ name: "Team Gateway", baseUrl: "https://llm.example.internal/v1", headers: [{ key: "X-Team", value: "platform" }] }}
        onTest={async (v) => {
          await sleep(900);
          if (v.baseUrl.includes("fail")) return { ok: false, error: "ECONNREFUSED: nothing is listening on that port." };
          return { ok: true, latencyMs: 120 + Math.random() * 120, models: ["gw-large", "gw-small", "gw-embed", "gw-vision", "gw-code"] };
        }}
        onSave={(v) => setSaved(`${v.name} → ${v.baseUrl} (${v.apiMode})`)}
      />
      <DemoLabel>{saved ? `Saved: ${saved}` : "Put “fail” in the URL to see an error."}</DemoLabel>
    </div>
  );
}

function KeysDemo() {
  const [groups, setGroups] = React.useState(keyGroups);
  const [custom, setCustom] = React.useState<ProviderEnvKey[]>([{ name: "HTTPS_PROXY", value: "http://proxy.internal:3128" }]);
  const setKey = (name: string, value: string | undefined) => {
    setGroups((gs) => gs.map((g) => ({ ...g, keys: g.keys.map((k) => (k.name === name ? { ...k, value } : k)) })));
    setCustom((cs) => (value === undefined ? cs.filter((c) => c.name !== name) : cs.map((c) => (c.name === name ? { ...c, value } : c))));
  };
  return (
    <ProviderKeysGroups
      className="max-w-3xl"
      groups={groups}
      customKeys={custom}
      onSetKey={setKey}
      onClearKey={(name) => setKey(name, undefined)}
      onAddCustomKey={(name, value) => setCustom((cs) => [...cs.filter((c) => c.name !== name), { name, value }])}
    />
  );
}

function PickerDemo() {
  const [value, setValue] = React.useState<ModelRef>({ providerId: "nimbus", modelId: "opal-4" });
  const [setup, setSetup] = React.useState<string | null>(null);
  return (
    <div className="grid w-full max-w-2xl gap-3">
      <ProviderModelPicker providers={routing} value={value} onSelect={setValue} onSetupProvider={setSetup} />
      <DemoLabel>
        Selected: {value.providerId}/{value.modelId}
        {setup && ` · Set up requested for ${setup}`}
      </DemoLabel>
      <div className="flex items-center gap-2">
        <DemoLabel>As a popover:</DemoLabel>
        <ProviderModelPickerPopover providers={routing} value={value} onValueChange={setValue} onSetupProvider={setSetup} />
      </div>
      <DemoLabel>Empty state (nothing configured):</DemoLabel>
      <ProviderModelPicker
        providers={routing.map((p) => ({ ...p, configured: false }))}
        emptyActions={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" leadingIcon={<RiKey2Line />}>
              Add API key
            </Button>
            <Button size="sm" leadingIcon={<RiShieldKeyholeLine />}>
              Sign in with OAuth
            </Button>
          </div>
        }
      />
    </div>
  );
}

function FallbackDemo() {
  const [chain, setChain] = React.useState<ModelRef[]>([
    { providerId: "nimbus", modelId: "opal-4" },
    { providerId: "corvid", modelId: "c5" },
    { providerId: "hearth", modelId: "wren-8b" },
  ]);
  return (
    <div className="w-full max-w-xl space-y-2">
      <FallbackChainEditor providers={routing} value={chain} onValueChange={setChain} />
      <DemoLabel>{chain.map((c) => c.modelId).join(" → ") || "empty"}</DemoLabel>
    </div>
  );
}

function TaskDemo() {
  const [value, setValue] = React.useState<TaskModelMap>({
    vision: { providerId: "corvid", modelId: "c-vision" },
    title: { providerId: "nimbus", modelId: "quartz-mini" },
    embeddings: { providerId: "hearth", modelId: "nomic-embed" },
  });
  return <TaskModelAssignment className="max-w-3xl" providers={routing} value={value} onValueChange={setValue} />;
}

function EnsembleDemo() {
  const [value, setValue] = React.useState<EnsembleConfig>({
    references: [
      { providerId: "nimbus", modelId: "opal-4" },
      { providerId: "corvid", modelId: "c5" },
    ],
    aggregator: null,
    rounds: 2,
  });
  return (
    <div className="w-full max-w-xl space-y-2">
      <EnsembleBuilder providers={routing} value={value} onValueChange={setValue} />
      <DemoLabel>Try adding “Council Ensemble” to see the recursion guard.</DemoLabel>
    </div>
  );
}

function ModelInfoDemo() {
  const [override, setOverride] = React.useState<number | null>(null);
  const provider = routing[0]!;
  return (
    <div className="grid grid-cols-1 w-full gap-4 lg:grid-cols-2">
      <ModelInfoCard model={provider.models[0]!} provider={provider} contextOverride={override} onContextOverrideChange={setOverride} />
      <ModelInfoCard model={routing[2]!.models[0]!} provider={routing[2]} />
    </div>
  );
}

function ComposerDemo() {
  const [reasoning, setReasoning] = React.useState<ReasoningSettings>({ thinking: true, fast: false, effort: "high" });
  const [model, setModel] = React.useState<ModelRef>({ providerId: "nimbus", modelId: "opal-4" });
  return (
    <div className="w-full max-w-2xl rounded-box border border-border bg-card p-3 shadow-sm">
      <div className="min-h-16 px-1 text-sm text-muted-foreground">Ask anything…</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Attach file">
          <RiAttachment2 />
        </Button>
        <ProviderModelPickerPopover providers={routing} value={model} onValueChange={setModel} triggerClassName="h-7 text-xs" />
        <ReasoningPill value={reasoning} onValueChange={setReasoning} />
        <ReasoningPill defaultValue={{ thinking: false, fast: true, effort: "low" }} supportsEffort={false} />
        <Button size="icon-sm" className="ml-auto" aria-label="Send">
          <RiSendPlaneFill />
        </Button>
      </div>
    </div>
  );
}

function BackendDemo() {
  const [value, setValue] = React.useState("local");
  const [configured, setConfigured] = React.useState<string | null>(null);
  const backends: BackendOption[] = React.useMemo(
    () => [
      { id: "local", name: "Local", kind: "local", description: "Run commands directly on this machine.", probe: async () => (await sleep(300), { latencyMs: 3 }) },
      { id: "docker", name: "Docker", kind: "docker", description: "Isolated container per session.", probe: async () => { await sleep(900); throw new Error("Docker daemon isn't running"); } },
      { id: "ssh", name: "SSH", kind: "ssh", description: "A remote host you control.", probe: async () => (await sleep(1400), { latencyMs: 84, detail: "build-box.internal" }) },
      { id: "modal", name: "Modal", kind: "modal", description: "Serverless sandboxes in the cloud.", configured: false },
      { id: "daytona", name: "Daytona", kind: "daytona", description: "Managed dev environments.", probe: async () => (await sleep(1100), { latencyMs: 142 }) },
      { id: "custom", name: "Custom", kind: "custom", description: "Your own executor over HTTP.", probe: async () => { await sleep(700); if (Math.random() < 0.5) throw new Error("Timed out after 5s"); return { latencyMs: 230 }; } },
    ],
    []
  );
  return (
    <div className="w-full max-w-3xl space-y-2">
      <BackendPicker backends={backends} value={value} onValueChange={setValue} onConfigure={setConfigured} />
      <DemoLabel>
        Selected: {value}
        {configured && ` · Configure ${configured}`}. “Custom” fails half the time; re-check it.
      </DemoLabel>
    </div>
  );
}

const initialStages: SetupStage[] = [
  { id: "engine", label: "Engine", description: "Install the local inference runtime", status: "active", actionLabel: "Install engine" },
  { id: "model", label: "Model", description: "Wren 8B Instruct · Q4_K_M fits fully on your GPU", status: "pending", actionLabel: "Use Wren 8B" },
  { id: "download", label: "Download", description: "Fetching 4.9 GB of weights", status: "pending", actionLabel: "Start download" },
  { id: "ready", label: "Ready", description: "Start chatting locally", status: "pending", actionLabel: "Open chat" },
];

function SetupHeroDemo() {
  const [stages, setStages] = React.useState(initialStages);
  const [received, setReceived] = React.useState(0);
  const [failedOnce, setFailedOnce] = React.useState(false);
  const total = 4.9 * GB;
  const rate = 180 * 1024 ** 2;
  const downloading = stages.find((s) => s.id === "download")?.status === "active";

  const advance = (id: string, extra?: Partial<SetupStage>) =>
    setStages((s) => {
      const i = s.findIndex((x) => x.id === id);
      return s.map((x, j) => (j === i ? { ...x, status: "done", error: undefined, ...extra } : j === i + 1 ? { ...x, status: "active" } : x));
    });

  React.useEffect(() => {
    if (!downloading) return;
    const t = setInterval(() => {
      setReceived((r) => {
        const next = Math.min(total, r + rate / 5);
        if (!failedOnce && next > total * 0.4) {
          setFailedOnce(true);
          setStages((s) => s.map((x) => (x.id === "download" ? { ...x, status: "error", error: "Connection reset at 40%. Your progress is kept." } : x)));
        } else if (next >= total) {
          advance("download");
        }
        return next;
      });
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloading, failedOnce]);

  return (
    <div className="w-full max-w-2xl space-y-2">
      <StagedSetupHero
        stages={stages}
        onAction={(id) => (id === "ready" ? undefined : id === "engine" ? void sleep(800).then(() => advance("engine")) : advance(id))}
        onRetry={(id) => setStages((s) => s.map((x) => (x.id === id ? { ...x, status: "active", error: undefined } : x)))}
        download={downloading ? { receivedBytes: received, totalBytes: total, bytesPerSecond: rate, label: "Wren 8B" } : undefined}
        onCancelDownload={() => setStages((s) => s.map((x) => (x.id === "download" ? { ...x, status: "error", error: "Download cancelled." } : x)))}
        readyContent={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-success">Wren 8B is ready on this machine.</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStages(initialStages);
                setReceived(0);
                setFailedOnce(false);
              }}
            >
              Restart demo
            </Button>
          </div>
        }
      />
      <DemoLabel>The download fails once at 40% so you can try Retry.</DemoLabel>
    </div>
  );
}

function BrowserDemo() {
  const [downloads, setDownloads] = React.useState<Record<string, LocalModelDownloadState>>({ "kestrel-14b": { status: "done" } });
  const timers = React.useRef<Record<string, ReturnType<typeof setInterval>>>({});
  React.useEffect(() => () => Object.values(timers.current).forEach(clearInterval), []);
  const start = (id: string, quant: string) => {
    const size = (localModels.find((m) => m.id === id)?.variants.find((v) => v.quant === quant)?.sizeGB ?? 1) * GB;
    const rate = (90 + Math.random() * 120) * 1024 ** 2;
    setDownloads((d) => ({ ...d, [id]: { status: "downloading", receivedBytes: 0, totalBytes: size, bytesPerSecond: rate, quant } }));
    timers.current[id] = setInterval(() => {
      setDownloads((d) => {
        const cur = d[id];
        if (!cur || cur.status !== "downloading") return d;
        const next = Math.min(size, (cur.receivedBytes ?? 0) + rate * 2);
        if (next >= size) {
          clearInterval(timers.current[id]);
          return { ...d, [id]: { status: "done", quant } };
        }
        return { ...d, [id]: { ...cur, receivedBytes: next } };
      });
    }, 250);
  };
  return (
    <div className="w-full max-w-3xl">
      <LocalModelBrowser
        models={localModels}
        hardware={hardware}
        downloads={downloads}
        onDownload={start}
        onCancelDownload={(id) => {
          clearInterval(timers.current[id]);
          setDownloads((d) => {
            const { [id]: _removed, ...rest } = d;
            return rest;
          });
        }}
      />
    </div>
  );
}

function ResourcesDemo() {
  const [r, setR] = React.useState({ cpu: 34, ram: 18.2, gpu: 71, vram: 9.4 });
  React.useEffect(() => {
    const t = setInterval(() => {
      const jitter = (v: number, d: number, min: number, max: number) => Math.max(min, Math.min(max, v + (Math.random() - 0.5) * d));
      setR((x) => ({ cpu: jitter(x.cpu, 18, 3, 100), ram: jitter(x.ram, 1.2, 8, 31.5), gpu: jitter(x.gpu, 20, 0, 100), vram: jitter(x.vram, 0.8, 2, 11.9) }));
    }, 1200);
    return () => clearInterval(t);
  }, []);
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between rounded-control border border-border bg-subtle px-3 py-1.5">
        <SystemResourcesBar cpuPercent={Math.round(r.cpu)} ram={{ usedGB: round(r.ram), totalGB: 32 }} gpuPercent={Math.round(r.gpu)} vram={{ usedGB: round(r.vram), totalGB: 12 }} />
        <span className="text-2xs text-muted-foreground">Hearth Local · Wren 8B</span>
      </div>
      <div className="rounded-control border border-border bg-subtle px-3 py-1.5">
        <SystemResourcesBar cpuPercent={12} ram={{ usedGB: 30.4, totalGB: 32 }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function ProvidersPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Providers & Models"
      description="Configure model providers, credentials and routing for an AI agent: connect accounts, pick models, set fallbacks and task models, build ensembles, choose an execution backend and run models locally. Every provider here is fictional and nothing touches the network."
    >
      <Demo id="provider-list" title="Provider list" description="Grouped into Connected and Available. Auth method, status, token expiry, model count and a quota chip. Connect, reconnect, manage or disconnect." align="start">
        <ProviderListDemo />
      </Demo>

      <Demo id="provider-quota-chip" title="Provider quota chip" description="Remaining quota with threshold colors (warn at 75% used, danger at 90%). Hover or focus for the reset time.">
        <ProviderQuotaChip used={20} resetsAt={NOW + 3 * HOUR} label="Session" />
        <ProviderQuotaChip used={80} resetsAt={NOW + 26 * HOUR} label="Weekly" />
        <ProviderQuotaChip used={96} resetsAt={NOW + 40 * 60_000} label="Daily" />
        <ProviderQuotaChip used={55} label="Custom thresholds" thresholds={{ warn: 50, danger: 70 }} />
      </Demo>

      <Demo id="provider-connect-dialog" title="Connect dialog" description="OAuth device code (user code, verification link, countdown, polling, expiry and restart), PKCE paste-code, and API key with “Get a key” and validation.">
        <ConnectDialogDemo />
      </Demo>

      <Demo id="custom-endpoint" title="Custom endpoint" description="Name, base URL, API mode, extra headers and key. Test connection reports latency and the models it found.">
        <CustomEndpointDemo />
      </Demo>

      <Demo id="provider-keys" title="Provider keys" description="Environment keys grouped by provider and sorted by priority. Reveal, hide, copy or clear set keys, fill in missing ones, and add custom variables." align="start">
        <KeysDemo />
      </Demo>

      <Demo id="provider-model-picker" title="Provider → model picker" description="Two columns with search highlighting, a Current tag, capability chips, context and price per Mtok. ← → switch columns, ↑ ↓ move, Enter selects. Unconfigured providers show a Set up CTA.">
        <PickerDemo />
      </Demo>

      <Demo id="model-visibility" title="Model visibility" description="Choose which models show in pickers for each provider, add a custom model id, or reset.">
        <ModelVisibilityManager className="max-w-xl" providers={routing.filter((p) => p.models.length > 0)} defaultValue={{ hidden: ["corvid/c5-mini"], custom: [] }} />
      </Demo>

      <Demo id="fallback-chain" title="Fallback chain" description="Primary model first, then fallbacks. Drag, use the arrow buttons, or press Space on the handle and use ↑ ↓. Add more through the picker.">
        <FallbackDemo />
      </Demo>

      <Demo id="task-model-assignment" title="Task model assignment" description="Auxiliary tasks use the main model (Auto) unless assigned. Reset to Auto asks for confirmation; “Use for all” copies a model to every task.">
        <TaskDemo />
      </Demo>

      <Demo id="ensemble-builder" title="Ensemble builder" description="Mixture-of-agents preset: reference models answer in parallel for N rounds, then an aggregator combines them. Ensembles can't contain ensembles.">
        <EnsembleDemo />
      </Demo>

      <Demo id="model-info-card" title="Model info card" description="Effective context length (auto or override), capabilities, pricing, knowledge cutoff and notes." align="start">
        <ModelInfoDemo />
      </Demo>

      <Demo id="reasoning-pill" title="Reasoning pill" description="Composer pill for thinking, fast mode and effort. The second pill is for a model without effort levels.">
        <ComposerDemo />
      </Demo>

      <Demo id="backend-picker" title="Backend picker" description="Execution backends as radio cards. Health probes run on mount: checking, healthy with latency, unreachable with a reason, or not configured. Re-check one or all.">
        <BackendDemo />
      </Demo>

      <Demo id="local-setup-hero" title="Local model quickstart" description="Engine → Model → Download → Ready, with one CTA per stage, download progress (bytes, rate, ETA), and retry on error.">
        <SetupHeroDemo />
      </Demo>

      <Demo id="local-model-browser" title="Local model browser" description="Search downloadable models, pick a quantization (the default is the largest that fits), see whether it fits your hardware, and download with progress.">
        <BrowserDemo />
      </Demo>

      <Demo id="hardware-fit" title="Hardware fit hint" description="estimateModelFit() for a 12 GB GPU and 32 GB RAM: fits fully on GPU, partial offload, CPU only, or won't fit." align="start">
        <div className="grid grid-cols-1 w-full gap-5 lg:grid-cols-2">
          <HardwareFitHint model={{ paramsB: 8, quant: "Q4_K_M" }} hardware={hardware} />
          <HardwareFitHint model={{ sizeGB: 19.8 }} hardware={hardware} />
          <HardwareFitHint model={{ sizeGB: 14 }} hardware={{ ramGB: 32 }} />
          <HardwareFitHint model={{ paramsB: 70, quant: "F16" }} hardware={hardware} />
        </div>
      </Demo>

      <Demo id="system-resources" title="System resources bar" description="Compact status-bar meters for CPU, RAM, GPU and VRAM with threshold colors." align="start">
        <ResourcesDemo />
      </Demo>
    </PageIntro>
  );
}

export default ProvidersPage;
