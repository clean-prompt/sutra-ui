import * as React from "react";
import {
  AgentJobForm,
  BlueprintGallery,
  Button,
  CronScheduleField,
  DeliveryTargetPicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  GoalStatusRow,
  HeartbeatStatusRow,
  JobDetail,
  JobList,
  JobStatePill,
  LoopStatusRow,
  StatusStack,
  WebhookRouteEditor,
  WebhookRouteList,
  toScheduleString,
  type AgentJob,
  type AgentJobDraft,
  type AgentJobRun,
  type AgentJobState,
  type Blueprint,
  type CronScheduleValue,
  type DeliveryPlatform,
  type DeliveryPlatformStatus,
  type DeliveryTarget,
  type WebhookRoute,
} from "@sutra/ui";
import {
  RiAddLine,
  RiArchiveLine,
  RiGitRepositoryLine,
  RiInboxLine,
  RiLineChartLine,
  RiPriceTag3Line,
  RiSendPlane2Line,
  RiSunLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Sample data (all local; no network)                                 */
/* ------------------------------------------------------------------ */

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;

const MODELS = [
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "claude-haiku", label: "Claude Haiku" },
  { value: "local-llama", label: "Llama 3.1 8B (local)" },
];
const MODEL_LABELS = Object.fromEntries(MODELS.map((m) => [m.value, m.label]));
const PROFILES = ["default", "work", "research"];
const SKILLS = [
  { value: "web-search", label: "Web search", description: "Search and read pages" },
  { value: "email", label: "Email", description: "Read and draft mail" },
  { value: "calendar", label: "Calendar" },
  { value: "github", label: "GitHub" },
  { value: "notes", label: "Notes" },
  { value: "weather", label: "Weather" },
  { value: "finance", label: "Finance quotes" },
];
const TOOLSETS = ["browser", "shell", "files", "http", "python"];

const DELIVERY_STATUS: Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>> = {
  telegram: { homeChannel: "@vyom" },
  slack: { configured: true },
  discord: { configured: false },
  email: { homeChannel: "me@example.com" },
  whatsapp: { disabledReason: "Needs a business account" },
};

const INITIAL_JOBS: AgentJob[] = [
  {
    id: "briefing",
    name: "Morning briefing",
    prompt: "Summarise unread email, today's calendar and the weather for Lisbon.",
    schedule: { kind: "cron", expr: "0 7 * * 1-5" },
    model: "claude-sonnet",
    profile: "default",
    skills: ["email", "calendar", "weather"],
    toolsets: ["browser"],
    mode: "agent",
    repeat: null,
    delivery: { platform: "telegram" },
    enabled: true,
    state: "scheduled",
    nextRunAt: NOW + 6 * HOUR,
    lastRunAt: NOW - 18 * HOUR,
    lastStatus: "succeeded",
  },
  {
    id: "triage",
    name: "Inbox triage",
    prompt: "Label and archive newsletters; flag anything that needs a reply today.",
    schedule: { kind: "interval", every: 30, unit: "m" },
    model: "claude-haiku",
    profile: "work",
    skills: ["email"],
    toolsets: [],
    mode: "agent",
    repeat: null,
    delivery: { platform: "local" },
    enabled: true,
    state: "scheduled",
    nextRunAt: NOW + 12 * MIN,
    lastRunAt: NOW - 18 * MIN,
    lastStatus: "failed",
  },
  {
    id: "repo",
    name: "Repo health check",
    prompt: "List open PRs older than a week and failing CI on main.",
    schedule: { kind: "cron", expr: "0 9 * * 1" },
    model: "claude-sonnet",
    skills: ["github"],
    toolsets: ["shell"],
    mode: "agent",
    repeat: 12,
    runCount: 4,
    delivery: { platform: "slack", destination: "#eng" },
    enabled: true,
    state: "running",
    lastRunAt: NOW - 2 * MIN,
    lastStatus: "running",
  },
  {
    id: "backup",
    name: "Nightly backup",
    prompt: "",
    script: "~/bin/backup.sh --quiet",
    schedule: { kind: "cron", expr: "0 2 * * *" },
    skills: [],
    toolsets: [],
    mode: "script",
    repeat: null,
    delivery: { platform: "email" },
    enabled: false,
    state: "paused",
    lastRunAt: NOW - 3 * 24 * HOUR,
    lastStatus: "succeeded",
  },
];

function makeRuns(jobId: string, count: number, offset = 0): AgentJobRun[] {
  return Array.from({ length: count }, (_, k) => {
    const i = k + offset;
    const failed = i % 5 === 1;
    return {
      id: `${jobId}-run-${i}`,
      startedAt: NOW - (i + 1) * 4 * HOUR,
      durationMs: 20_000 + ((i * 7919) % 90_000),
      status: failed ? "failed" : "succeeded",
      trigger: i % 4 === 2 ? "manual" : "schedule",
      costUsd: 0.01 + ((i * 37) % 9) / 100,
      tokens: 4000 + ((i * 1543) % 20_000),
      error: failed ? "Tool `browser.open` timed out after 30s (https://mail.example.com)" : undefined,
    } satisfies AgentJobRun;
  });
}

const BLUEPRINTS: Blueprint[] = [
  {
    id: "daily-briefing",
    title: "Daily briefing",
    description: "Weather, calendar and top headlines, delivered every morning.",
    icon: <RiSunLine />,
    schedule: "0 7 * * *",
    tags: ["daily", "personal"],
    cliCommand: 'sutra cron add "{schedule}" --blueprint daily-briefing --city "{city}" --to {channel}',
    slots: [
      { id: "city", label: "City", type: "text", required: true, placeholder: "Lisbon" },
      { id: "time", label: "Delivery time", type: "time", defaultValue: "07:00" },
      { id: "channel", label: "Send to", type: "channel" },
      { id: "news", label: "Include headlines", type: "boolean", defaultValue: true },
    ],
  },
  {
    id: "inbox-triage",
    title: "Inbox triage",
    description: "Label, archive and flag mail that needs a reply.",
    icon: <RiInboxLine />,
    schedule: "every 30m",
    tags: ["email", "work"],
    cliCommand: 'sutra cron add "every {every}m" --blueprint inbox-triage',
    slots: [
      { id: "every", label: "Check every (minutes)", type: "number", defaultValue: 30, min: 5, max: 240 },
      { id: "archive", label: "Auto-archive newsletters", type: "boolean", defaultValue: true },
    ],
  },
  {
    id: "repo-health",
    title: "Repo health check",
    description: "Stale PRs, failing CI and new security advisories.",
    icon: <RiGitRepositoryLine />,
    schedule: "0 9 * * 1",
    tags: ["dev", "weekly"],
    cliCommand: 'sutra cron add "{schedule}" --blueprint repo-health --repo {repo}',
    slots: [
      { id: "repo", label: "Repository", type: "text", required: true, placeholder: "owner/repo" },
      { id: "stale", label: "Stale after (days)", type: "number", defaultValue: 7, min: 1 },
    ],
  },
  {
    id: "weekly-report",
    title: "Weekly report",
    description: "A Friday summary of what you shipped, read and spent.",
    icon: <RiLineChartLine />,
    schedule: "0 17 * * 5",
    tags: ["weekly", "work"],
    slots: [
      { id: "format", label: "Format", type: "select", options: ["Bullet points", "Narrative", "Table"] },
      { id: "channel", label: "Send to", type: "channel" },
    ],
  },
  {
    id: "price-watch",
    title: "Price watch",
    description: "Alert me when a product drops below a target price.",
    icon: <RiPriceTag3Line />,
    schedule: "0 */6 * * *",
    tags: ["shopping", "personal"],
    cliCommand: 'sutra cron add "{schedule}" --blueprint price-watch --url "{url}" --below {target}',
    slots: [
      { id: "url", label: "Product URL", type: "text", required: true, placeholder: "https://shop.example.com/item" },
      { id: "target", label: "Target price", type: "number", required: true, min: 0 },
    ],
  },
  {
    id: "backup",
    title: "Backup",
    description: "Run a backup script nightly and deliver its output as-is (no agent).",
    icon: <RiArchiveLine />,
    schedule: "0 2 * * *",
    tags: ["ops", "daily"],
    cliCommand: 'sutra cron add "{schedule}" --script "{script}"',
    slots: [{ id: "script", label: "Script", type: "text", required: true, placeholder: "~/bin/backup.sh" }],
  },
];

const CHANNELS = [
  { value: "telegram:@vyom", label: "Telegram · @vyom" },
  { value: "slack:#general", label: "Slack · #general" },
  { value: "local", label: "Inbox" },
];

const EVENTS = [
  { value: "push", label: "push", description: "Commits pushed to a branch" },
  { value: "pull_request", label: "pull_request" },
  { value: "issues", label: "issues" },
  { value: "release", label: "release" },
  { value: "workflow_run", label: "workflow_run" },
  { value: "stripe.invoice.paid", label: "stripe.invoice.paid" },
  { value: "custom", label: "custom" },
];

const INITIAL_ROUTES: WebhookRoute[] = [
  {
    id: "gh",
    name: "GitHub → triage PRs",
    url: "https://hooks.sutra.local/w/gh_7f3a9c2e",
    events: ["pull_request", "issues"],
    delivery: { platform: "slack", destination: "#eng" },
    enabled: true,
    secretHint: "9f2c",
    deliveries: [
      { id: "d1", event: "pull_request", statusCode: 200, at: NOW - 4 * MIN, durationMs: 182 },
      { id: "d2", event: "issues", statusCode: 202, at: NOW - 40 * MIN, durationMs: 95 },
      { id: "d3", event: "pull_request", statusCode: 500, at: NOW - 3 * HOUR, durationMs: 2300, error: "Agent run failed: rate limited" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe invoices",
    url: "https://hooks.sutra.local/w/st_51c0d8aa",
    events: ["stripe.invoice.paid"],
    delivery: { platform: "email" },
    enabled: false,
    secretHint: "a01b",
    deliveries: [{ id: "d4", event: "stripe.invoice.paid", statusCode: null, at: NOW - 26 * HOUR, durationMs: 10_000, error: "Timed out" }],
  },
];

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function CronManagerDemo() {
  const [jobs, setJobs] = React.useState(INITIAL_JOBS);
  const [selectedId, setSelectedId] = React.useState<string>("triage");
  const [runs, setRuns] = React.useState<Record<string, AgentJobRun[]>>(() => Object.fromEntries(INITIAL_JOBS.map((j) => [j.id, makeRuns(j.id, 8)])));
  const [editing, setEditing] = React.useState<AgentJob | "new" | null>(null);
  const [log, setLog] = React.useState<string>("");

  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0];
  const setState = (job: AgentJob, state: AgentJobState) => setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, state, enabled: state !== "paused" } : j)));

  const actions = {
    onPause: (job: AgentJob) => setState(job, "paused"),
    onResume: (job: AgentJob) => setState(job, "scheduled"),
    onRunNow: (job: AgentJob) => {
      setRuns((r) => ({
        ...r,
        [job.id]: [{ id: `${job.id}-manual-${Date.now()}`, startedAt: Date.now(), status: "running", trigger: "manual" }, ...(r[job.id] ?? [])],
      }));
      setState(job, "running");
    },
    onEdit: (job: AgentJob) => setEditing(job),
    onDelete: (job: AgentJob) => {
      setJobs((js) => js.filter((j) => j.id !== job.id));
      setLog(`Deleted “${job.name}”`);
    },
  };

  const save = (draft: AgentJobDraft) => {
    if (draft.id) {
      setJobs((js) => js.map((j) => (j.id === draft.id ? { ...j, ...draft } : j)));
    } else {
      const id = `job-${Date.now()}`;
      setJobs((js) => [...js, { ...draft, id, state: draft.enabled ? "scheduled" : "paused", nextRunAt: Date.now() + 30 * MIN }]);
      setSelectedId(id);
    }
    setLog(`Saved “${draft.name}” → ${toScheduleString(draft.schedule)}`);
    setEditing(null);
  };

  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <DemoLabel>Scheduled jobs</DemoLabel>
          <Button size="sm" leadingIcon={<RiAddLine />} onClick={() => setEditing("new")}>
            New job
          </Button>
        </div>
        <JobList jobs={jobs} selectedId={selected?.id} onSelect={(j) => setSelectedId(j.id)} modelLabels={MODEL_LABELS} {...actions} />
        {log ? <p className="text-xs text-muted-foreground">{log}</p> : null}
      </div>
      {selected ? (
        <JobDetail
          className="min-w-0 rounded-box border border-border p-4"
          job={selected}
          modelLabel={selected.model ? MODEL_LABELS[selected.model] : undefined}
          runs={runs[selected.id] ?? []}
          hasMoreRuns={(runs[selected.id]?.length ?? 0) < 24}
          onLoadMoreRuns={() => setRuns((r) => ({ ...r, [selected.id]: [...(r[selected.id] ?? []), ...makeRuns(selected.id, 8, r[selected.id]?.length ?? 0)] }))}
          onOpenTranscript={(run) => setLog(`Open transcript ${run.id}`)}
          deliveryStatus={DELIVERY_STATUS}
          showTimeline
          {...actions}
        />
      ) : null}
      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent size="lg" className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New scheduled job" : "Edit job"}</DialogTitle>
            <DialogDescription>Runs on its schedule even when this window is closed.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <AgentJobForm
              key={editing === "new" ? "new" : editing.id}
              defaultValue={editing === "new" ? undefined : editing}
              models={MODELS}
              profiles={PROFILES}
              skills={SKILLS}
              toolsets={TOOLSETS}
              deliveryStatus={DELIVERY_STATUS}
              onConfigureChannels={() => setLog("Open Channels settings")}
              onCancel={() => setEditing(null)}
              onSubmit={save}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobFormDialogDemo() {
  const [open, setOpen] = React.useState(false);
  const [payload, setPayload] = React.useState<AgentJobDraft | null>(null);
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Button leadingIcon={<RiAddLine />} onClick={() => setOpen(true)}>
        Schedule a job
      </Button>
      {payload ? <pre className="max-h-64 w-full overflow-auto rounded-box bg-muted p-3 font-mono text-xs">{JSON.stringify(payload, null, 2)}</pre> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New scheduled job</DialogTitle>
            <DialogDescription>Agent mode runs a prompt; script mode delivers a command's stdout as-is.</DialogDescription>
          </DialogHeader>
          <AgentJobForm
            models={MODELS}
            profiles={PROFILES}
            skills={SKILLS}
            toolsets={TOOLSETS}
            deliveryStatus={DELIVERY_STATUS}
            onCancel={() => setOpen(false)}
            onSubmit={(job) => {
              setPayload(job);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleBuilderDemo() {
  const [value, setValue] = React.useState<CronScheduleValue | null>({ kind: "cron", expr: "0 9 * * 1-5" });
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <CronScheduleField defaultValue={value} onValueChange={(v) => setValue(v)} />
      <div className="flex flex-col gap-2">
        <DemoLabel>Emitted value</DemoLabel>
        <pre className="overflow-auto rounded-box bg-muted p-3 font-mono text-xs">{JSON.stringify(value, null, 2)}</pre>
        <DemoLabel>toScheduleString()</DemoLabel>
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{value ? toScheduleString(value) : "— invalid —"}</code>
      </div>
    </div>
  );
}

function BlueprintDemo() {
  const [created, setCreated] = React.useState<string>("");
  return (
    <div className="flex w-full flex-col gap-3">
      <BlueprintGallery
        blueprints={BLUEPRINTS}
        channels={CHANNELS}
        onCreate={(bp, values) => setCreated(`Created “${bp.title}” with ${JSON.stringify(values)}`)}
      />
      {created ? <p className="text-xs text-muted-foreground">{created}</p> : null}
      <DemoLabel>“Open in app” variant</DemoLabel>
      <BlueprintGallery blueprints={BLUEPRINTS.slice(0, 3).map((b) => ({ ...b, appHref: `#/automation/new?blueprint=${b.id}` }))} variant="open" searchable={false} />
    </div>
  );
}

function StatusStackDemo() {
  const [goal, setGoal] = React.useState({ turns: 3, paused: false, visible: true });
  const [loop, setLoop] = React.useState({ runs: 2, nextDueAt: Date.now() + 44 * MIN + 12_000, visible: true });
  const [beat, setBeat] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setBeat(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      <StatusStack className="rounded-b-none border-b-0">
        {goal.visible ? (
          <GoalStatusRow
            key="goal"
            priority={2}
            title="Ship the automation set and write release notes"
            turns={goal.turns}
            maxTurns={20}
            paused={goal.paused}
            onPause={() => setGoal((g) => ({ ...g, paused: true }))}
            onResume={() => setGoal((g) => ({ ...g, paused: false, turns: g.turns + 1 }))}
            onClear={() => setGoal((g) => ({ ...g, visible: false }))}
          />
        ) : null}
        {loop.visible ? (
          <LoopStatusRow
            key="loop"
            priority={1}
            every="45m"
            runs={loop.runs}
            nextDueAt={loop.nextDueAt}
            onRunNow={() => setLoop((l) => ({ ...l, runs: l.runs + 1, nextDueAt: Date.now() + 45 * MIN }))}
            onStop={() => setLoop((l) => ({ ...l, visible: false }))}
          />
        ) : null}
        <HeartbeatStatusRow key="hb" lastBeatAt={beat} intervalMs={15_000} onDismiss={() => {}} />
      </StatusStack>
      <div className="flex min-h-24 flex-col justify-between rounded-b-box border border-border bg-background p-3 shadow-xs">
        <p className="text-sm text-muted-foreground">Ask the agent anything…</p>
        <div className="flex justify-end">
          <Button size="icon-sm" aria-label="Send">
            <RiSendPlane2Line />
          </Button>
        </div>
      </div>
    </div>
  );
}

function WebhooksDemo() {
  const [routes, setRoutes] = React.useState(INITIAL_ROUTES);
  const [selectedId, setSelectedId] = React.useState<string | "new">("gh");
  const [newSecret, setNewSecret] = React.useState<string | null>(null);
  const selected = selectedId === "new" ? undefined : routes.find((r) => r.id === selectedId);
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <WebhookRouteList
        routes={routes}
        selectedId={selectedId === "new" ? null : selectedId}
        onSelect={(r) => {
          setSelectedId(r.id);
          setNewSecret(null);
        }}
        onToggleEnabled={(r, enabled) => setRoutes((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled } : x)))}
        onCreate={() => {
          setSelectedId("new");
          setNewSecret(null);
        }}
        deliveryStatus={DELIVERY_STATUS}
      />
      <WebhookRouteEditor
        key={selected?.id ?? "new"}
        className="rounded-box border border-border p-4"
        route={selected}
        events={EVENTS}
        newSecret={newSecret}
        deliveryStatus={DELIVERY_STATUS}
        onSave={(draft) => {
          if (draft.id) {
            setRoutes((rs) => rs.map((r) => (r.id === draft.id ? { ...r, ...draft } : r)));
            return;
          }
          const id = `wh-${Date.now()}`;
          const delivery: DeliveryTarget = draft.delivery;
          setRoutes((rs) => [...rs, { ...draft, delivery, id, url: `https://hooks.sutra.local/w/${id}`, secretHint: "c0de", deliveries: [] }]);
          setSelectedId(id);
          setNewSecret(`whsec_demo_${Math.random().toString(36).slice(2, 14)}c0de`);
        }}
        onRegenerateSecret={() => `whsec_demo_${Math.random().toString(36).slice(2, 14)}`}
        onTestSend={() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, statusCode: 200, durationMs: 140 + Math.round(Math.random() * 120) }), 600))}
        onRedeliver={() => {}}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function AutomationPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Agent: Automation"
      description="Schedule an agent's recurring jobs: a cron/interval schedule builder with a live preview, job list and detail with run history, templates, a status stack for goals and loops, and webhook routes."
    >
      <Demo id="cron-manager" title="Cron manager" description="Job list with state pills, next run (live countdown under an hour), last-run status and row actions; the detail pane shows next runs, configuration, a run timeline and paged history. New/Edit open the job form in a dialog." align="start">
        <CronManagerDemo />
      </Demo>

      <Demo id="job-form" title="Job form in a dialog" description="Name, prompt or script (no agent — stdout delivered as-is), schedule, model, profile, skills and toolsets pickers, repeat limit (∞ by default), delivery target and enabled switch, with validation.">
        <JobFormDialogDemo />
      </Demo>

      <Demo id="schedule-builder" title="Schedule builder" description="Interval, hourly, daily, weekdays, weekly, monthly, once and raw cron. Each mode keeps its inputs when you switch; custom cron validates live. Shows a plain-English summary and the next three runs in your time zone." align="start">
        <ScheduleBuilderDemo />
      </Demo>

      <Demo id="job-state" title="Job state pills" description="Scheduled, running (spinner), paused, error, completed and disabled.">
        {(["scheduled", "running", "paused", "error", "completed", "disabled"] as AgentJobState[]).map((s) => (
          <JobStatePill key={s} state={s} />
        ))}
      </Demo>

      <Demo id="delivery-target" title="Delivery target picker" description="Inbox or a messaging platform with a per-target field. Unconnected platforms are disabled with a reason; platforms without a home channel warn until you enter a destination (try Slack)." align="start">
        <DeliveryTargetPicker status={DELIVERY_STATUS} onConfigureChannels={() => {}} className="max-w-2xl" />
      </Demo>

      <Demo id="blueprint-gallery" title="Blueprint gallery" description="Six templates with schedule summaries and tags. Filter by tag or search; “Use template” expands an inline slot form (text, number, select, time, boolean, channel) with a copyable CLI command." align="start">
        <BlueprintDemo />
      </Demo>

      <Demo id="status-stack" title="Status stack" description="Goal (turn budget), loop (live countdown to the next run) and heartbeat rows above a composer. Collapsed it shows the top row with “+2 more”; motion respects reduced-motion." align="start" dots>
        <StatusStackDemo />
      </Demo>

      <Demo id="webhooks" title="Webhook routes" description="Routes with copyable URLs and enable switches. The editor shows a new signing secret once, then masks it with a confirmed regenerate; subscribe to events, pick a delivery target, send a test and redeliver recent deliveries." align="start">
        <WebhooksDemo />
      </Demo>
    </PageIntro>
  );
}

export default AutomationPage;
