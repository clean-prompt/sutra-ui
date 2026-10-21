import * as React from "react";
import {
  Button,
  KanbanBoard,
  KanbanCard,
  MemoryMap,
  OrchestrationPanel,
  ShareCodeControls,
  SimpleSelect,
  TaskDetailDialog,
  TimeScrubber,
  moveCard,
  type CommentThreadData,
  type KanbanAssignee,
  type KanbanBoardModel,
  type KanbanCardData,
  type KanbanDependencyKind,
  type KanbanTaskActivity,
  type KanbanTaskRun,
  type MemoryMapViewState,
  type MemoryNode,
} from "@cleanprompt/sutra-ui";
import { RiLayoutColumnLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Board data                                                          */
/* ------------------------------------------------------------------ */

const DAY = 864e5;
const today = new Date();
const inDays = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);

const people: KanbanAssignee[] = [
  { id: "asha", name: "Asha Rao" },
  { id: "dev", name: "Dev Patel" },
  { id: "lin", name: "Lin Chen" },
  { id: "builder", name: "Builder", kind: "agent", description: "Implements scoped coding tasks and opens pull requests." },
  { id: "reviewer", name: "Reviewer", kind: "agent", description: "Reviews diffs, runs tests and leaves inline comments." },
  { id: "scout", name: "Scout", kind: "agent", description: "Researches docs and prior art, writes summaries." },
  { id: "conductor", name: "Conductor", kind: "agent", description: "Orchestrates other agents: plans, splits and assigns subtasks." },
];

const initialBoard: KanbanBoardModel = {
  columns: [
    { id: "backlog", title: "Backlog", color: "var(--muted-foreground)" },
    { id: "todo", title: "Todo", color: "#00b8db" },
    { id: "doing", title: "In progress", color: "#f0b100", wipLimit: 3 },
    { id: "review", title: "Review", color: "#8e51ff" },
    { id: "done", title: "Done", color: "#00c950", done: true },
  ],
  labels: [
    { id: "bug", name: "Bug", color: "destructive" },
    { id: "feature", name: "Feature", color: "brand" },
    { id: "docs", name: "Docs", color: "blue" },
    { id: "infra", name: "Infra", color: "orange" },
    { id: "design", name: "Design", color: "pink" },
  ],
  assignees: people,
  cards: [
    { id: "SUT-101", title: "Offline sync conflicts", columnId: "backlog", labels: ["feature"], priority: "medium" },
    { id: "SUT-102", title: "Dark mode charts audit", columnId: "backlog", labels: ["design"], priority: "low", assigneeId: "lin" },
    { id: "SUT-103", title: "Summarize vector DB options", columnId: "backlog", labels: ["docs"], assigneeId: "scout", priority: "none" },
    { id: "SUT-104", title: "Calendar invite parsing fails on recurring events", columnId: "todo", labels: ["bug"], priority: "urgent", assigneeId: "dev", dueDate: inDays(-2), commentCount: 4 },
    { id: "SUT-105", title: "Add keyboard shortcuts sheet", columnId: "todo", labels: ["feature"], priority: "medium", assigneeId: "builder", subtasks: { done: 0, total: 3 } },
    { id: "SUT-106", title: "Rotate staging secrets", columnId: "todo", labels: ["infra"], priority: "high", assigneeId: "asha", dueDate: inDays(3) },
    { id: "SUT-107", title: "Memory map time scrubber", columnId: "doing", labels: ["feature", "design"], priority: "high", assigneeId: "builder", runStatus: "running", subtasks: { done: 2, total: 5 }, commentCount: 2, dueDate: inDays(1) },
    { id: "SUT-108", title: "Fix flaky e2e login test", columnId: "doing", labels: ["bug", "infra"], priority: "high", assigneeId: "reviewer", runStatus: "failed", commentCount: 1 },
    { id: "SUT-109", title: "Onboarding copy pass", columnId: "doing", labels: ["docs"], priority: "low", assigneeId: "lin", subtasks: { done: 4, total: 4 } },
    { id: "SUT-110", title: "Kanban drag & drop announcements", columnId: "review", labels: ["feature"], priority: "medium", assigneeId: "dev", runStatus: "succeeded", commentCount: 6 },
    { id: "SUT-111", title: "Agent run log streaming", columnId: "review", labels: ["feature", "infra"], priority: "high", assigneeId: "conductor", subtasks: { done: 3, total: 4 } },
    { id: "SUT-112", title: "Research CRDT libraries", columnId: "review", labels: ["docs"], assigneeId: "scout", runStatus: "pending" },
    { id: "SUT-113", title: "Ship v0.4 release notes", columnId: "done", labels: ["docs"], assigneeId: "asha", dueDate: inDays(-5) },
    { id: "SUT-114", title: "Upgrade to React 19", columnId: "done", labels: ["infra"], assigneeId: "builder", runStatus: "succeeded" },
    { id: "SUT-115", title: "Avatar builder polish", columnId: "done", labels: ["design"], assigneeId: "lin" },
    { id: "SUT-116", title: "Token usage meter", columnId: "done", labels: ["feature"], assigneeId: "dev", subtasks: { done: 2, total: 2 } },
  ],
};

const websiteBoard: KanbanBoardModel = {
  columns: [
    { id: "todo", title: "Todo" },
    { id: "doing", title: "Doing", wipLimit: 2 },
    { id: "done", title: "Done", done: true },
  ],
  assignees: people,
  cards: [
    { id: "WEB-1", title: "Pricing page refresh", columnId: "todo", assigneeId: "lin" },
    { id: "WEB-2", title: "Changelog RSS feed", columnId: "doing", assigneeId: "builder", runStatus: "running" },
    { id: "WEB-3", title: "Fix footer links", columnId: "done", assigneeId: "dev" },
  ],
};

const models = [
  { value: "fast", label: "Fast (small)", description: "Cheap, quick drafts" },
  { value: "balanced", label: "Balanced" },
  { value: "deep", label: "Deep reasoning", description: "Slow, for hard problems" },
];

const sampleLog = Array.from({ length: 60 }, (_, i) =>
  i % 17 === 16 ? `ERROR step ${i}: test suite failed (2 failing)` : i % 7 === 6 ? `WARN step ${i}: retrying request` : `INFO step ${i}: ${["reading files", "planning edits", "editing", "running tests"][i % 4]}`
);

function runsFor(card: KanbanCardData): KanbanTaskRun[] {
  const a = people.find((p) => p.id === card.assigneeId);
  if (a?.kind !== "agent") return [];
  const now = Date.now();
  const runs: KanbanTaskRun[] = [
    { id: `${card.id}-r1`, agentId: a.id, status: "failed", startedAt: now - 3 * 3600_000, endedAt: now - 3 * 3600_000 + 252_000, model: "balanced", summary: "Tests failed after edit.", log: sampleLog },
  ];
  if (card.runStatus) runs.unshift({ id: `${card.id}-r2`, agentId: a.id, status: card.runStatus, startedAt: now - 8 * 60_000, endedAt: card.runStatus === "running" || card.runStatus === "pending" ? undefined : now - 60_000, model: card.model ?? "deep", log: sampleLog.slice(0, 30) });
  return runs;
}

function activityFor(card: KanbanCardData): KanbanTaskActivity[] {
  const now = Date.now();
  const assignee = people.find((p) => p.id === card.assigneeId);
  return [
    { id: "a3", actor: assignee?.name ?? "Asha Rao", actorKind: assignee?.kind, action: "moved this to its current column", at: now - 40 * 60_000 },
    { id: "a2", actor: "Asha Rao", action: `assigned ${assignee?.name ?? "nobody"}`, at: now - 5 * 3600_000 },
    { id: "a1", actor: "Dev Patel", action: "created this task", at: now - 3 * DAY },
  ];
}

/* ------------------------------------------------------------------ */
/* Kanban demos                                                        */
/* ------------------------------------------------------------------ */

function useTaskEditing(setBoard: React.Dispatch<React.SetStateAction<KanbanBoardModel>>) {
  const [comments, setComments] = React.useState<Record<string, CommentThreadData>>({});
  const patch = (id: string, p: Partial<KanbanCardData>) =>
    setBoard((b) => {
      let next = b;
      if (p.columnId) next = moveCard(next, { cardId: id, toColumn: p.columnId, toIndex: Infinity }).board;
      return { ...next, cards: next.cards.map((c) => (c.id === id ? { ...c, ...p } : c)) };
    });
  const link = (id: string, kind: KanbanDependencyKind, other: string, add: boolean) => {
    const inverse: KanbanDependencyKind = kind === "blockedBy" ? "blocks" : "blockedBy";
    const edit = (list: string[] | undefined, v: string) => (add ? [...new Set([...(list ?? []), v])] : (list ?? []).filter((x) => x !== v));
    setBoard((b) => ({
      ...b,
      cards: b.cards.map((c) => (c.id === id ? { ...c, [kind]: edit(c[kind], other) } : c.id === other ? { ...c, [inverse]: edit(c[inverse], id) } : c)),
    }));
  };
  const comment = (id: string, body: string) =>
    setComments((all) => {
      const thread = all[id] ?? { id, comments: [] };
      const c = { id: `${id}-${thread.comments.length}`, author: { id: "asha", name: "Asha Rao" }, body, createdAt: Date.now() };
      return { ...all, [id]: { ...thread, comments: [...thread.comments, c] } };
    });
  return { comments, patch, link, comment };
}

function TaskDialogFor({
  task,
  board,
  onClose,
  editing,
}: {
  task: KanbanCardData | null;
  board: KanbanBoardModel;
  onClose: () => void;
  editing: ReturnType<typeof useTaskEditing>;
}) {
  const [auto, setAuto] = React.useState(false);
  return (
    <TaskDetailDialog
      open={!!task}
      onOpenChange={(o) => !o && onClose()}
      task={task}
      board={board}
      models={models}
      currentUserId="asha"
      onChange={(p) => task && editing.patch(task.id, p)}
      onAddDependency={(kind, other) => task && editing.link(task.id, kind, other, true)}
      onRemoveDependency={(kind, other) => task && editing.link(task.id, kind, other, false)}
      comments={
        task
          ? (editing.comments[task.id] ?? {
              id: task.id,
              comments: task.commentCount
                ? [{ id: "seed", author: { id: "dev", name: "Dev Patel" }, body: "Can we land this **before Friday**?", createdAt: Date.now() - 2 * 3600_000 }]
                : [],
            })
          : undefined
      }
      onComment={(body) => task && editing.comment(task.id, body)}
      activity={task ? activityFor(task) : []}
      runs={task ? runsFor(task) : []}
      sidebarExtra={
        task && people.find((p) => p.id === task.assigneeId)?.kind === "agent" ? (
          <OrchestrationPanel
            className="mt-2"
            profiles={people.filter((p) => p.kind === "agent")}
            defaultOrchestratorId="conductor"
            autoDecompose={auto}
            onAutoDecomposeChange={setAuto}
            participants={people
              .filter((p) => p.kind === "agent" && p.id !== "conductor")
              .slice(0, 2)
              .map((agent) => ({ agent }))}
          />
        ) : null
      }
    />
  );
}

function KanbanBoardDemo() {
  const [boardId, setBoardId] = React.useState("sutra");
  const [boards, setBoards] = React.useState<Record<string, KanbanBoardModel>>({ sutra: initialBoard, website: websiteBoard });
  const board = boards[boardId]!;
  const setBoard: React.Dispatch<React.SetStateAction<KanbanBoardModel>> = (next) =>
    setBoards((all) => ({ ...all, [boardId]: typeof next === "function" ? next(all[boardId]!) : next }));
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [lastMove, setLastMove] = React.useState("");
  const editing = useTaskEditing(setBoard);
  const task = board.cards.find((c) => c.id === openId) ?? null;
  return (
    <>
      <KanbanBoard
        board={board}
        onBoardChange={setBoard}
        onMove={(m) => setLastMove(`${m.cardId} → ${m.toColumn} #${m.toIndex + 1}`)}
        onColumnMove={(m) => setLastMove(`column ${m.columnId} → #${m.toIndex + 1}`)}
        onCardOpen={(c) => setOpenId(c.id)}
        onAddCard={({ columnId, title }) =>
          setBoard((b) => ({ ...b, cards: [...b.cards, { id: `SUT-${200 + b.cards.length}`, title, columnId }] }))
        }
        boardSwitcher={
          <SimpleSelect
            size="sm"
            aria-label="Board"
            className="w-36"
            leadingIcon={<RiLayoutColumnLine />}
            value={boardId}
            onValueChange={setBoardId}
            options={[
              { value: "sutra", label: "Sutra app" },
              { value: "website", label: "Website" },
            ]}
          />
        }
        toolbarExtra={lastMove && <span className="text-xs text-muted-foreground">Last move: {lastMove}</span>}
      />
      <TaskDialogFor task={task} board={board} onClose={() => setOpenId(null)} editing={editing} />
    </>
  );
}

function KanbanCardsDemo() {
  const cards = initialBoard.cards.filter((c) => ["SUT-104", "SUT-107", "SUT-108", "SUT-116"].includes(c.id));
  return (
    <div className="grid grid-cols-1 w-full gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <KanbanCard
          key={c.id}
          card={c}
          labels={initialBoard.labels}
          assignee={people.find((p) => p.id === c.assigneeId)}
          done={c.columnId === "done"}
          onOpen={() => {}}
        />
      ))}
    </div>
  );
}

function TaskDetailDemo() {
  const [board, setBoard] = React.useState(initialBoard);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const editing = useTaskEditing(setBoard);
  return (
    <>
      <Button onClick={() => setOpenId("SUT-107")}>Open “Memory map time scrubber”</Button>
      <Button variant="secondary" onClick={() => setOpenId("SUT-104")}>
        Open an overdue human task
      </Button>
      <TaskDialogFor task={board.cards.find((c) => c.id === openId) ?? null} board={board} onClose={() => setOpenId(null)} editing={editing} />
    </>
  );
}

function OrchestrationDemo() {
  const [auto, setAuto] = React.useState(true);
  const [decomposing, setDecomposing] = React.useState(false);
  const [log, setLog] = React.useState("");
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <OrchestrationPanel
        profiles={people.filter((p) => p.kind === "agent")}
        defaultOrchestratorId="conductor"
        autoDecompose={auto}
        onAutoDecomposeChange={setAuto}
        decomposing={decomposing}
        onDecompose={() => {
          setDecomposing(true);
          setTimeout(() => {
            setDecomposing(false);
            setLog("Split into 4 subtasks: plan, implement, test, document.");
          }, 900);
        }}
        participants={[
          { agent: people[3]!, role: "Implements the scrubber and playback", status: "running" },
          { agent: people[4]!, role: "Reviews the diff and runs the test suite", status: "pending" },
          { agent: people[5]!, status: "idle" },
        ]}
      />
      {log && <p className="text-xs text-muted-foreground" role="status">{log}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Memory map data                                                     */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const memoryKinds = ["memory", "memory", "fact", "fact", "skill", "person", "project", "document"] as const;
const words: Record<string, string[]> = {
  memory: ["Morning run in the rain", "Call with mom", "Coffee at Blue Door", "Trip to the coast", "Late-night debugging", "Birthday dinner", "Moved desks"],
  fact: ["Prefers async standups", "Allergic to peanuts", "Timezone is IST", "Uses a split keyboard", "Rent due on the 1st", "Passport expires 2029"],
  skill: ["TypeScript", "Sourdough baking", "Sketching", "Rust basics", "Public speaking", "Spanish A2"],
  person: ["Asha", "Dev", "Lin", "Priya", "Marco", "Sam"],
  project: ["Sutra UI", "Garden planner", "Home lab", "Reading list", "Marathon plan"],
  document: ["Q3 plan", "Lease agreement", "Design notes", "Trip itinerary", "Recipe book"],
};

function generateMemory(count: number): MemoryNode[] {
  const r = rng(42);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const start = end - 182 * DAY;
  const times = Array.from({ length: count }, () => start + r() * (end - start)).sort((a, b) => a - b);
  const nodes: MemoryNode[] = [];
  times.forEach((t, i) => {
    const kind = memoryKinds[Math.floor(r() * memoryKinds.length)]!;
    const pool = words[kind]!;
    const label = `${pool[Math.floor(r() * pool.length)]}${i >= pool.length ? ` #${i}` : ""}`;
    const links: string[] = [];
    if (i > 0) {
      const n = 1 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) links.push(`m${Math.floor(r() * i)}`);
    }
    nodes.push({
      id: `m${i}`,
      label,
      kind,
      createdAt: t,
      weight: kind === "person" || kind === "project" ? 3 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3),
      links,
      description: kind === "fact" ? "Learned from a conversation; confirmed twice." : undefined,
    });
  });
  return nodes;
}

const memoryNodes = generateMemory(80);

function MemoryMapDemo() {
  const [hiddenKinds, setHiddenKinds] = React.useState<string[]>([]);
  const [range, setRange] = React.useState<[number, number] | undefined>(undefined);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<{ k: number; x: number; y: number } | undefined>(undefined);
  const [lastAction, setLastAction] = React.useState("");
  const [nodes, setNodes] = React.useState(memoryNodes);
  const extent: [number, number] = React.useMemo(() => {
    const ts = nodes.map((n) => n.createdAt as number);
    return [Math.min(...ts), Math.max(...ts)];
  }, [nodes]);
  const view: MemoryMapViewState = { hiddenKinds, range: range ?? extent, selectedId: selectedId ?? undefined, zoom };
  return (
    <div className="flex w-full flex-col gap-4">
      <MemoryMap
        nodes={nodes}
        radialTime
        seed={7}
        height={520}
        hiddenKinds={hiddenKinds}
        onHiddenKindsChange={setHiddenKinds}
        timeRange={range ?? extent}
        onTimeRangeChange={setRange}
        selectedId={selectedId}
        onSelect={(n) => setSelectedId(n?.id ?? null)}
        zoom={zoom}
        onZoomChange={setZoom}
        onOpen={(n) => setLastAction(`Open “${n.label}”`)}
        onEdit={(n) => setLastAction(`Edit “${n.label}”`)}
        onDelete={(n) => {
          setNodes((all) => all.filter((x) => x.id !== n.id).map((x) => ({ ...x, links: x.links?.filter((l) => l !== n.id) })));
          setSelectedId(null);
          setLastAction(`Deleted “${n.label}”`);
        }}
        toolbarExtra={lastAction && <span className="mr-2 text-xs text-muted-foreground">{lastAction}</span>}
      />
      <ShareCodeControls
        className="max-w-xl"
        state={view}
        onImport={(s) => {
          setHiddenKinds(s.hiddenKinds ?? []);
          setRange(s.range);
          setSelectedId(s.selectedId ?? null);
          setZoom(s.zoom);
        }}
      />
    </div>
  );
}

function MemoryOuterDemo() {
  return <MemoryMap nodes={memoryNodes.slice(0, 40)} radialTime="old-outer" seed={3} height={380} showScrubber={false} defaultListView={false} className="w-full" />;
}

function TimeScrubberDemo() {
  const [range, setRange] = React.useState<[number, number] | undefined>(undefined);
  const ts = memoryNodes.map((n) => n.createdAt as number);
  const extent: [number, number] = [Math.min(...ts), Math.max(...ts)];
  const value = range ?? extent;
  const count = memoryNodes.filter((n) => (n.createdAt as number) >= value[0] && (n.createdAt as number) <= value[1]).length;
  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <TimeScrubber nodes={memoryNodes} value={value} onValueChange={setRange} buckets={26} />
      <p className="text-xs text-muted-foreground">{count} memories revealed. Focus the scrubber and press Space to play or pause.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function KanbanMemoryPage() {
  return (
    <PageIntro
      eyebrow="Agent"
      title="Kanban & Memory Map"
      description="A task board shared by people and agents (drag and drop with keyboard and screen-reader support, WIP limits, swimlanes, filters, Linear-style task details, orchestration), and a memory graph over time with radial time rings, playback, a legend filter and share codes."
    >
      <Demo
        id="kanban-board"
        title="Kanban board"
        description="Drag cards within and between columns, or focus a card and press Space, use the arrow keys, then Space again. Each card's “…” menu offers Move up/down and Move to…. Drag column grips to reorder. In progress has a WIP limit of 3. Filter by search, assignee or label, group into swimlanes and switch boards. Click a card to open its details."
        align="start"
      >
        <KanbanBoardDemo />
      </Demo>
      <Demo id="kanban-card" title="Kanban cards" description="Overdue due date, subtask progress, comment count, priority, human and agent assignees, and agent run status (running shimmer, failed)." align="start">
        <KanbanCardsDemo />
      </Demo>
      <Demo
        id="task-detail-dialog"
        title="Task detail dialog"
        description="Click the title to edit it inline. Markdown description with Write/Preview, a property sidebar (status, assignee including agents, priority, labels, due date, estimate, model override), blocked by/blocks dependencies, and Comments, Activity and Runs tabs with a log tail."
      >
        <TaskDetailDemo />
      </Demo>
      <Demo id="orchestration-panel" title="Orchestration panel" description="Pick an orchestrator profile, toggle auto-decompose, split a task now and see participating agents.">
        <OrchestrationDemo />
      </Demo>
      <Demo
        id="memory-map"
        title="Memory map"
        description="80 generated memories over 6 months on time rings (oldest at the center). Scroll or pinch to zoom, drag to pan, hover for details, click to select, right-click the selected node for actions. Toggle kinds in the legend, scrub or play the timeline, switch to List view, and copy or load a share code."
        align="start"
      >
        <MemoryMapDemo />
      </Demo>
      <Demo id="memory-map-outer" title="Newest at the center" description="radialTime=&quot;old-outer&quot; puts the oldest ring outside. No scrubber." align="start">
        <MemoryOuterDemo />
      </Demo>
      <Demo id="time-scrubber" title="Time scrubber" description="Range slider over a histogram of items per period, with play/pause playback and speed control.">
        <TimeScrubberDemo />
      </Demo>
    </PageIntro>
  );
}

export default KanbanMemoryPage;
