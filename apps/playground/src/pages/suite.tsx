import * as React from "react";
import {
  Backlinks,
  Button,
  Card,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  ConflictResolver,
  EntityChip,
  Label,
  MentionInput,
  MentionText,
  OfflineBanner,
  QuickCapture,
  ShortcutKeys,
  SimpleTooltip,
  SutraAppIcon,
  SyncStatus,
  TodayTimeline,
  formatShortcut,
  parseCapture,
  sutraAppMeta,
  sutraApps,
  useShortcut,
  useShortcutRegistry,
  type BacklinkItem,
  type MentionSuggestion,
  type QuickCaptureValue,
  type SyncState,
  type TimelineItem,
} from "@cleanprompt/sutra-ui";
import { RiAddLine, RiKeyboardBoxLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Shortcuts                                                           */
/* ------------------------------------------------------------------ */

function ShortcutsDemo() {
  const [log, setLog] = React.useState<string[]>([]);
  const push = (msg: string) => setLog((l) => [msg, ...l].slice(0, 4));
  useShortcut("n", () => push("n: new item"), { label: "New item", group: "Suite demo" });
  useShortcut("g t", () => push("g t: go to today"), { label: "Go to today", group: "Suite demo" });
  useShortcut("mod+enter", () => push("mod+enter: save"), { label: "Save", group: "Suite demo", allowInInputs: true });
  const { groups } = useShortcutRegistry();

  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-2">
        <div className="space-y-3">
          <DemoLabel>Try: n · g then t · mod+enter (works in the field) · shift+? · mod+k</DemoLabel>
          <input
            aria-label="Shortcut playground field"
            placeholder="Typing here does not trigger single-key shortcuts"
            className="h-9 w-full rounded-control border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring"
          />
          <ul className="min-h-24 space-y-1 rounded-box border border-dashed border-border p-3 font-mono text-xs text-muted-foreground">
            {log.length === 0 ? <li>Press a shortcut…</li> : log.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <SimpleTooltip content="Quick capture" shortcut="mod+shift+space">
              <Button variant="secondary" leadingIcon={<RiAddLine />}>
                Hover me
              </Button>
            </SimpleTooltip>
            <ShortcutKeys keys="mod+shift+k" />
            <ShortcutKeys keys="g t" />
            <span className="text-xs text-muted-foreground">formatShortcut("mod+k") → {formatShortcut("mod+k")}</span>
          </div>
        </div>
        <div className="space-y-2">
          <DemoLabel className="flex items-center gap-1.5">
            <RiKeyboardBoxLine className="size-4" /> Live registry
          </DemoLabel>
          <div className="space-y-3 rounded-box border border-border p-3">
            {groups.map((g) => (
              <div key={g.group}>
                <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>
                <ul className="space-y-1">
                  {g.shortcuts.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{s.label}</span>
                      <ShortcutKeys keys={s.keys} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandItemShortcutDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        CommandItem with keys specs
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search…" aria-label="Search commands" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Create">
            <CommandItem shortcut="c">New task</CommandItem>
            <CommandItem shortcut="mod+shift+n">New note</CommandItem>
            <CommandItem shortcut="g c">Go to calendar</CommandItem>
            <CommandItem shortcut={["⌥", "J"]}>Journal entry (legacy array)</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mentions & backlinks                                                */
/* ------------------------------------------------------------------ */

const people: MentionSuggestion[] = [
  { id: "ana", title: "Ana Lima", type: "person", description: "Design" },
  { id: "ben", title: "Ben Okafor", type: "person", description: "Engineering" },
  { id: "chen", title: "Chen Wei", type: "person", description: "Product" },
];

const library: MentionSuggestion[] = [
  { id: "n1", title: "Q4 launch plan", type: "notes" },
  { id: "t1", title: "Draft launch email", type: "tasks" },
  { id: "e1", title: "Launch sync", type: "calendar", description: "Thu 10:00" },
  { id: "f1", title: "Brand assets.zip", type: "files" },
  { id: "j1", title: "Oct 12 reflection", type: "journal" },
];

const commands: MentionSuggestion[] = [
  { id: "today", title: "Today's date", type: "tag", insertText: new Date().toLocaleDateString(), description: "Insert the date" },
  { id: "todo", title: "Checkbox", type: "tasks", insertText: "[ ] ", description: "Start a to-do" },
];

function MentionDemo() {
  const [value, setValue] = React.useState("Sync with @[Ana Lima](person:ana) about #[Q4 launch plan](notes:n1) ");
  const onSearch = React.useCallback(async (trigger: string, query: string) => {
    await new Promise((r) => setTimeout(r, 150));
    const q = query.toLowerCase();
    const pool = trigger === "@" ? people : trigger === "#" ? library : commands;
    return pool.filter((s) => s.title.toLowerCase().includes(q));
  }, []);
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mention-demo">Comment</Label>
          <MentionInput id="mention-demo" value={value} onValueChange={setValue} onSearch={onSearch} rows={4} />
          <p className="text-xs text-muted-foreground">@ people · # notes, tasks and events · / commands (async search)</p>
        </div>
        <div className="space-y-2">
          <DemoLabel>Rendered with MentionText</DemoLabel>
          <Card className="p-4 text-sm leading-7">
            <MentionText value={value} getHref={(m) => `#${m.type}/${m.id}`} />
          </Card>
          <DemoLabel>Stored value</DemoLabel>
          <pre className="whitespace-pre-wrap break-all rounded-box bg-muted p-3 font-mono text-xs">{value}</pre>
        </div>
      </div>
    </div>
  );
}

const backlinks: BacklinkItem[] = [
  { id: "1", source: { type: "notes", id: "n2", title: "Weekly review" }, snippet: "Biggest risk this week is the Q4 launch plan slipping past the 20th." },
  { id: "2", source: { type: "notes", id: "n3", title: "Marketing brainstorm" }, snippet: "Tie the newsletter to the Q4 launch plan and the new pricing." },
  { id: "3", source: { type: "tasks", id: "t1", title: "Draft launch email", status: "done" }, snippet: "Use the timeline from Q4 launch plan." },
  { id: "4", source: { type: "calendar", id: "e1", title: "Launch sync", date: new Date(2026, 9, 15, 10) }, snippet: "Agenda: walk through the Q4 launch plan." },
  { id: "5", source: { type: "journal", id: "j1", title: "Oct 12 reflection" }, snippet: "Feeling good about the Q4 launch plan for once." },
];

/* ------------------------------------------------------------------ */
/* Quick capture                                                       */
/* ------------------------------------------------------------------ */

function QuickCaptureDemo() {
  const [captured, setCaptured] = React.useState<QuickCaptureValue[]>([]);
  const [open, setOpen] = React.useState(false);
  const add = (v: QuickCaptureValue) => setCaptured((c) => [v, ...c].slice(0, 5));
  const examples = ["event tomorrow 3pm Dentist #health", "task: Pay rent !high fri", "note: Gift ideas #family", "Coffee $4.50"];
  return (
    <div className="space-y-4">
      <QuickCapture variant="inline" onCapture={add} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <span className="text-xs text-muted-foreground">
          or press <ShortcutKeys keys="mod+shift+space" />
        </span>
      </div>
      <QuickCapture open={open} onOpenChange={setOpen} onCapture={add} />
      <div className="@container w-full">
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
          <div className="space-y-1.5">
            <DemoLabel>parseCapture()</DemoLabel>
            {examples.map((ex) => (
              <div key={ex} className="rounded-md border border-border p-2 text-xs">
                <p className="font-medium">{ex}</p>
                <code className="block break-all text-muted-foreground">{JSON.stringify(parseCapture(ex))}</code>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <DemoLabel>Captured</DemoLabel>
            {captured.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Type above and press Enter.</p>
            ) : (
              captured.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <EntityChip type={c.app} id={String(i)} title={c.title} />
                  <span className="text-xs text-muted-foreground">
                    {[c.date, c.time, c.priority, ...c.tags.map((t) => `#${t}`)].filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

function todayAt(h: number, m = 0) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function TimelineDemo() {
  const [items, setItems] = React.useState<TimelineItem[]>(() => [
    { id: "h1", app: "habits", title: "Meditate", streak: 12, done: true },
    { id: "t0", app: "tasks", title: "Inbox zero" },
    { id: "c0", app: "calendar", title: "Mom's birthday", allDay: true },
    { id: "c1", app: "calendar", title: "Standup", start: todayAt(9), end: todayAt(9, 30), meta: "Zoom" },
    { id: "c2", app: "calendar", title: "Design review", start: todayAt(9, 15), end: todayAt(10, 15), meta: "Room 4" },
    { id: "c3", app: "calendar", title: "1:1 with Ben", start: todayAt(9, 45), end: todayAt(10, 30) },
    { id: "t1", app: "tasks", title: "Send invoice", start: todayAt(11) },
    { id: "m1", app: "mail", title: "Reply to Ana", start: todayAt(13, 30) },
    { id: "c4", app: "calendar", title: "Focus block", start: todayAt(14), end: todayAt(16) },
    { id: "h2", app: "habits", title: "Run 5k", start: todayAt(18), end: todayAt(18, 45), streak: 4 },
    { id: "f1", app: "finance", title: "Pay rent", start: todayAt(17), meta: "$1,850" },
  ]);
  const [dense, setDense] = React.useState(false);
  const toggle = (item: TimelineItem, done: boolean) =>
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, done } : i)));
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-[1fr_16rem]">
        <TodayTimeline
          items={items}
          onToggle={toggle}
          density={dense ? "compact" : "comfortable"}
          title={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        />
        <div className="space-y-3">
          <Button variant="secondary" size="sm" onClick={() => setDense((d) => !d)}>
            {dense ? "Comfortable" : "Compact"} density
          </Button>
          <DemoLabel>Empty state</DemoLabel>
          <TodayTimeline items={[]} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

function SyncDemo() {
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const states: SyncState[] = ["synced", "syncing", "offline", "error", "conflict"];
  const lastSynced = React.useMemo(() => Date.now() - 4 * 60_000, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {states.map((s) => (
          <SyncStatus
            key={s}
            status={s}
            lastSyncedAt={lastSynced}
            pendingChanges={s === "syncing" || s === "offline" ? 3 : 0}
            onRetry={() => {}}
            onResolve={() => setConflictOpen(true)}
          />
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        {states.map((s) => (
          <SyncStatus key={`icon-${s}`} status={s} showLabel={false} lastSyncedAt={lastSynced} />
        ))}
      </div>
      <OfflineBanner offline pendingChanges={3} onRetry={() => {}} dismissible className="rounded-box border" />
      <Button variant="outline" onClick={() => setConflictOpen(true)}>
        Open conflict resolver
      </Button>
      <ConflictResolver
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        yours={{
          content: "Groceries\n- Milk\n- Eggs\n- Sourdough",
          source: "This Mac",
          updatedAt: Date.now() - 2 * 60_000,
        }}
        theirs={{
          content: "Groceries\n- Milk\n- Oat milk\n- Sourdough",
          source: "iPhone",
          updatedAt: Date.now() - 6 * 60_000,
        }}
        onKeepMine={() => {}}
        onKeepTheirs={() => {}}
        onMerge={() => {}}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function SuitePage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Suite"
      description="What makes Sutra feel like one product: a keyboard-first shortcut system and components that connect notes, tasks, calendar, mail, files, journal, finance and habits."
    >
      <Demo
        id="shortcuts"
        title="Shortcuts"
        description="ShortcutProvider registry with chords, sequences, scopes and input suppression. Press shift+? for the auto-generated cheat sheet, mod+k for the palette built from the same registry."
        align="start"
      >
        <ShortcutsDemo />
        <div>
          <CommandItemShortcutDemo />
        </div>
      </Demo>

      <Demo id="entity-chip" title="Entity Chip" description="Inline references tinted with each app's accent. Hover for a preview." align="start">
        <div className="flex flex-wrap items-center gap-2">
          <EntityChip type="notes" id="n1" title="Q4 launch plan" href="#" preview={<p className="text-sm">Goals, timeline and owners for the October launch…</p>} />
          <EntityChip type="tasks" id="t1" title="Draft launch email" status="done" />
          <EntityChip type="tasks" id="t2" title="Book venue" />
          <EntityChip type="calendar" id="e1" title="Launch sync" date={new Date(2026, 9, 15, 10)} />
          <EntityChip type="mail" id="m1" title="Re: Contract" />
          <EntityChip type="files" id="f1" title="Brand assets.zip" />
          <EntityChip type="journal" id="j1" title="Oct 12" />
          <EntityChip type="finance" id="x1" title="Rent" />
          <EntityChip type="habits" id="h1" title="Meditate" />
          <EntityChip type="person" id="p1" title="Ana Lima" />
          <EntityChip type="tag" id="g1" title="launch" size="sm" />
        </div>
      </Demo>

      <Demo id="mention-input" title="Mention Input" description="Type @, # or / to insert linked references. The value is plain text with tokens." align="start">
        <MentionDemo />
      </Demo>

      <Demo id="backlinks" title="Backlinks" description="Everything that links to the current item, grouped by app." align="start">
        <div className="@container w-full">
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
            <Backlinks items={backlinks} highlight="Q4 launch plan" />
            <Backlinks items={[]} />
          </div>
        </div>
      </Demo>

      <Demo id="quick-capture" title="Quick Capture" description="One input for everything: intent, dates, priority and tags are parsed live. Tab switches the target app." align="start">
        <QuickCaptureDemo />
      </Demo>

      <Demo id="today-timeline" title="Today Timeline" description="A merged agenda across apps with an hourly rail, a live now line and side-by-side overlaps." align="start">
        <TimelineDemo />
      </Demo>

      <Demo id="sync-status" title="Sync Status" description="Local-first states: indicator, offline banner and conflict resolution." align="start">
        <SyncDemo />
      </Demo>

      <Demo id="app-theming" title="App Theming" description='data-app="…" on any subtree retunes the brand tokens to that app’s accent.' align="start">
        <div className="@container w-full">
          <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @4xl:grid-cols-4">
            {sutraApps.map((app) => (
              <div key={app} data-app={app} className="space-y-3 rounded-box border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <SutraAppIcon app={app} size={28} />
                  <span className="font-medium">{sutraAppMeta[app].name}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,var(--app-from),var(--app-to))]" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Primary</Button>
                  <Button size="sm" variant="soft">
                    Soft
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Demo>
    </PageIntro>
  );
}
