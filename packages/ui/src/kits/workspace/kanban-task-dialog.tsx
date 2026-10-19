import * as React from "react";
import { RiCloseLine, RiFileList3Line, RiSparkling2Line } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { formatRelative, safeISO, toMs, toValidDate } from "../../lib/time";
import { formatDuration } from "../../lib/duration";
import { normalizeTaskStatus } from "../../lib/status";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { AgentAvatar, randomAvatarSpec } from "../../patterns/agent-avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../primitives/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import {
  CommentComposer,
  CommentThread,
  type CommentHandlers,
  type CommentThreadData,
} from "../../patterns/comments";
import { LogViewer } from "../../patterns/log-viewer";
import { SimpleSelect } from "../../primitives/select";
import { Combobox } from "../../primitives/combobox";
import { DatePicker } from "../../primitives/date-picker";
import { Input } from "../../primitives/input";
import { Textarea } from "../../primitives/textarea";
import { Markdown } from "../../patterns/markdown";
import { type KanbanBoardModel, type KanbanCardData, type KanbanPriority, type KanbanRunStatusInput } from "./kanban-model";
import { NONE, priorityLabel, priorityOrder } from "./kanban-internal";
import { KanbanAssigneeAvatar, KanbanPriorityIcon, KanbanRunBadge } from "./kanban-card";

/* ------------------------------------------------------------------ */
/* TaskDetailDialog                                                    */
/* ------------------------------------------------------------------ */

export interface KanbanTaskActivity {
  id: string;
  actor: string;
  actorKind?: "human" | "agent";
  /** What happened, e.g. "moved this from Todo to In progress". */
  action: React.ReactNode;
  at: Date | number | string;
}

export interface KanbanTaskRun {
  id: string;
  /** Assignee id of the agent that ran. */
  agentId?: string;
  agentName?: string;
  status: KanbanRunStatusInput;
  startedAt: Date | number | string;
  endedAt?: Date | number | string;
  model?: string;
  summary?: string;
  /** Log lines (the tail is shown in a LogViewer). */
  log?: string[];
}

export interface KanbanModelOption {
  value: string;
  label: string;
  description?: string;
}

export type KanbanDependencyKind = "blockedBy" | "blocks";

export interface TaskDetailDialogProps {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  task: KanbanCardData | null;
  /** Columns, assignees, labels and the other tasks (for dependencies). */
  board: KanbanBoardModel;
  /** Called with the changed fields. Status changes arrive as `{ columnId }`. */
  onChange?: (patch: Partial<KanbanCardData>) => void;
  onAddDependency?: (kind: KanbanDependencyKind, taskId: string) => void;
  onRemoveDependency?: (kind: KanbanDependencyKind, taskId: string) => void;
  /** Model override choices; the empty option means "inherit". */
  models?: KanbanModelOption[];
  /** Existing comments on the task. */
  comments?: CommentThreadData;
  commentHandlers?: CommentHandlers;
  /** Adds a new top-level comment. */
  onComment?: (body: string) => void;
  activity?: KanbanTaskActivity[];
  runs?: KanbanTaskRun[];
  currentUserId?: string;
  now?: Date | number;
  locale?: string;
  defaultTab?: "comments" | "activity" | "runs";
  /** Extra content at the end of the property sidebar (e.g. an OrchestrationPanel). */
  sidebarExtra?: React.ReactNode;
  /** Task key shown above the title, e.g. "SUT-42". Defaults to the id. */
  taskKey?: string;
}

const relTime = (at: Date | number | string, now: number, locale?: string) =>
  formatRelative(at, { now, locale, style: "long", seconds: true, future: true });

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Linear-style task modal: inline title, Markdown description, property sidebar, dependencies and Comments / Activity / Runs tabs. */
export function TaskDetailDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  task,
  board,
  onChange,
  onAddDependency,
  onRemoveDependency,
  models,
  comments,
  commentHandlers,
  onComment,
  activity = [],
  runs = [],
  currentUserId,
  now,
  locale,
  defaultTab = "comments",
  sidebarExtra,
  taskKey,
}: TaskDetailDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <Dialog open={open && !!task} onOpenChange={setOpen}>
      <DialogContent size="xl" className="gap-0 overflow-hidden p-0">
        {task && (
          <TaskDetailBody
            task={task}
            board={board}
            onChange={onChange}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
            models={models}
            comments={comments}
            commentHandlers={commentHandlers}
            onComment={onComment}
            activity={activity}
            runs={runs}
            currentUserId={currentUserId}
            now={now}
            locale={locale}
            defaultTab={defaultTab}
            sidebarExtra={sidebarExtra}
            taskKey={taskKey}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailBody({
  task,
  board,
  onChange,
  onAddDependency,
  onRemoveDependency,
  models,
  comments,
  commentHandlers,
  onComment,
  activity,
  runs,
  currentUserId,
  now,
  locale,
  defaultTab,
  sidebarExtra,
  taskKey,
}: Omit<TaskDetailDialogProps, "open" | "defaultOpen" | "onOpenChange" | "task"> & {
  task: KanbanCardData;
  activity: KanbanTaskActivity[];
  runs: KanbanTaskRun[];
}) {
  const nowMs = now instanceof Date ? now.getTime() : (now ?? Date.now());
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? "");
  const [descMode, setDescMode] = React.useState<"write" | "preview">(task.description ? "preview" : "write");
  const [openLog, setOpenLog] = React.useState<string | null>(null);
  const titleButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => setTitle(task.title), [task.title]);
  React.useEffect(() => setDescription(task.description ?? ""), [task.description]);

  const commitTitle = () => {
    const t = title.trim();
    setEditingTitle(false);
    if (t && t !== task.title) onChange?.({ title: t });
    else setTitle(task.title);
    requestAnimationFrame(() => titleButtonRef.current?.focus());
  };

  const people = board.assignees ?? [];
  const humans = people.filter((p) => p.kind !== "agent");
  const agents = people.filter((p) => p.kind === "agent");
  const taskTitle = (id: string) => board.cards.find((c) => c.id === id)?.title ?? id;
  const assignee = people.find((p) => p.id === task.assigneeId);

  const depSection = (kind: KanbanDependencyKind, label: string) => {
    const ids = task[kind] ?? [];
    const taken = new Set([task.id, ...(task.blockedBy ?? []), ...(task.blocks ?? [])]);
    const options = board.cards.filter((c) => !taken.has(c.id)).map((c) => ({ value: c.id, label: c.title, keywords: [c.id] }));
    return (
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
        {ids.length > 0 && (
          <ul aria-label={label} className="flex flex-col gap-1">
            {ids.map((id) => (
              <li key={id} className="flex items-center gap-2 rounded-control border border-border bg-card px-2 py-1 text-sm">
                <RiFileList3Line aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{taskTitle(id)}</span>
                {onRemoveDependency && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${taskTitle(id)} from ${label.toLowerCase()}`}
                    onClick={() => onRemoveDependency(kind, id)}
                  >
                    <RiCloseLine aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {onAddDependency && (
          <Combobox
            size="sm"
            aria-label={`Add ${label.toLowerCase()} task`}
            placeholder="Add task…"
            searchPlaceholder="Search tasks…"
            options={options}
            value=""
            onValueChange={(v) => v && onAddDependency(kind, v)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="grid max-h-[inherit] min-h-0 grid-cols-1 overflow-y-auto sm:max-h-[calc(100dvh-2rem)] md:grid-cols-[1fr_17rem] md:overflow-hidden">
      <div className="flex min-w-0 flex-col gap-4 p-6 md:overflow-y-auto">
        <div className="flex flex-col gap-1 pe-8">
          <span className="font-mono text-xs text-muted-foreground">{taskKey ?? task.id}</span>
          {editingTitle ? (
            <Input
              autoFocus
              aria-label="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTitle();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setTitle(task.title);
                  setEditingTitle(false);
                }
              }}
              className="text-lg font-semibold"
            />
          ) : (
            <DialogTitle asChild>
              <h2>
                <button
                  ref={titleButtonRef}
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  aria-label={`${task.title}, edit title`}
                  className={cn("-mx-1 rounded-control px-1 text-start text-lg font-semibold hover:bg-accent", focusRing)}
                >
                  {task.title}
                </button>
              </h2>
            </DialogTitle>
          )}
          {editingTitle && <DialogTitle className="sr-only">{task.title}</DialogTitle>}
          <DialogDescription className="sr-only">Task details, properties, dependencies and history.</DialogDescription>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Description</h3>
            <div role="group" aria-label="Description mode" className="flex gap-0.5 rounded-control bg-muted p-0.5">
              {(["write", "preview"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={descMode === m}
                  onClick={() => setDescMode(m)}
                  className={cn(
                    "rounded-control px-2 py-0.5 text-xs capitalize text-muted-foreground",
                    descMode === m && "bg-background text-foreground shadow-xs",
                    focusRing
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {descMode === "write" ? (
            <Textarea
              aria-label="Description"
              autoResize
              minRows={4}
              maxRows={14}
              placeholder="Add a description… (Markdown supported)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== (task.description ?? "") && onChange?.({ description })}
            />
          ) : description ? (
            <Markdown className="rounded-control border border-border p-3 text-sm">{description}</Markdown>
          ) : (
            <p className="rounded-control border border-dashed border-border p-3 text-sm text-muted-foreground">No description</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {depSection("blockedBy", "Blocked by")}
          {depSection("blocks", "Blocks")}
        </div>

        <Tabs defaultValue={defaultTab} variant="underline" size="sm">
          <TabsList>
            <TabsTrigger value="comments" badge={comments?.comments.length || undefined}>
              Comments
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="runs" badge={runs.length || undefined}>
              Runs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="flex flex-col gap-3">
            {comments && comments.comments.length > 0 ? (
              <CommentThread thread={comments} currentUserId={currentUserId} now={nowMs} {...commentHandlers} />
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            )}
            {onComment && <CommentComposer label="Add a comment" placeholder="Leave a comment…" submitLabel="Comment" onSubmit={onComment} />}
          </TabsContent>
          <TabsContent value="activity">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <ol aria-label="Activity" className="relative flex flex-col gap-3 border-s border-border ps-4">
                {activity.map((a) => (
                  <li key={a.id} className="relative text-sm">
                    <span aria-hidden className={cn("absolute -start-[21px] top-1.5 size-2 rounded-full ring-2 ring-background", a.actorKind === "agent" ? "bg-primary" : "bg-muted-foreground")} />
                    <span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">{a.action}</span>
                    <time dateTime={safeISO(a.at)} className="ms-1.5 text-xs text-muted-foreground">
                      {relTime(a.at, nowMs, locale)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
          <TabsContent value="runs">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agent runs yet</p>
            ) : (
              <ul aria-label="Agent runs" className="flex flex-col gap-2">
                {runs.map((r) => {
                  const agent = people.find((p) => p.id === r.agentId);
                  const end = r.endedAt ? (toMs(r.endedAt) ?? NaN) : normalizeTaskStatus(r.status) === "running" ? nowMs : NaN;
                  const duration = formatDuration(end - (toMs(r.startedAt) ?? NaN), { maxUnit: "h", negative: "invalid" });
                  const isOpen = openLog === r.id;
                  return (
                    <li key={r.id} className="rounded-box border border-border bg-card p-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {agent && <KanbanAssigneeAvatar assignee={agent} size={20} />}
                        <span className="font-medium">{agent?.name ?? r.agentName ?? "Agent"}</span>
                        <KanbanRunBadge status={r.status} />
                        {r.model && <span className="font-mono text-xs text-muted-foreground">{r.model}</span>}
                        <span className="text-xs text-muted-foreground">
                          {relTime(r.startedAt, nowMs, locale)} · <span className="tabular-nums">{duration}</span>
                        </span>
                        {r.log && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="ms-auto"
                            aria-expanded={isOpen}
                            onClick={() => setOpenLog(isOpen ? null : r.id)}
                          >
                            {isOpen ? "Hide log" : "Open log"}
                          </Button>
                        )}
                      </div>
                      {r.summary && <p className="mt-1 text-xs text-muted-foreground">{r.summary}</p>}
                      {isOpen && r.log && (
                        <LogViewer
                          className="mt-2"
                          aria-label={`Log for run ${r.id}`}
                          lines={r.log.slice(-500)}
                          height={200}
                          status={normalizeTaskStatus(r.status) === "running" ? "live" : "idle"}
                          downloadName={`${r.id}.log`}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <aside aria-label="Properties" className="flex flex-col gap-3 border-t border-border bg-subtle p-5 md:overflow-y-auto md:border-s md:border-t-0 md:pt-12">
        <PropertyRow label="Status">
          <SimpleSelect
            size="sm"
            aria-label="Status"
            value={task.columnId}
            onValueChange={(v) => onChange?.({ columnId: v })}
            options={board.columns.map((c) => ({
              value: c.id,
              label: c.title,
              icon: <span aria-hidden className="size-2 rounded-full" style={{ background: c.color ?? "var(--muted-foreground)" }} />,
            }))}
          />
        </PropertyRow>
        <PropertyRow label="Assignee">
          <SimpleSelect
            size="sm"
            aria-label="Assignee"
            value={task.assigneeId ?? NONE}
            onValueChange={(v) => onChange?.({ assigneeId: v === NONE ? undefined : v })}
            options={[
              { value: NONE, label: "Unassigned" },
              ...humans.map((p) => ({ value: p.id, label: p.name, icon: (
                  <span aria-hidden className="inline-flex">
                    <KanbanAssigneeAvatar assignee={p} size={16} />
                  </span>
                ), })),
              ...agents.map((p) => ({
                value: p.id,
                label: `${p.name} · agent`,
                icon: <AgentAvatar spec={p.avatar ?? randomAvatarSpec(p.id)} size={16} label="" />,
              })),
            ]}
          />
        </PropertyRow>
        <PropertyRow label="Priority">
          <SimpleSelect
            size="sm"
            aria-label="Priority"
            value={task.priority ?? "none"}
            onValueChange={(v) => onChange?.({ priority: v as KanbanPriority })}
            options={priorityOrder.map((p) => ({ value: p, label: priorityLabel[p], icon: <KanbanPriorityIcon priority={p} aria-hidden /> }))}
          />
        </PropertyRow>
        <PropertyRow label="Labels">
          <Combobox
            multiple
            size="sm"
            aria-label="Labels"
            placeholder="Add labels"
            maxChips={2}
            options={(board.labels ?? []).map((l) => ({ value: l.id, label: l.name }))}
            value={task.labels ?? []}
            onValueChange={(labels) => onChange?.({ labels })}
          />
        </PropertyRow>
        <PropertyRow label="Due date">
          <DatePicker
            size="sm"
            aria-label="Due date"
            clearable
            locale={locale}
            value={toValidDate(task.dueDate)}
            onValueChange={(d) => onChange?.({ dueDate: d })}
          />
        </PropertyRow>
        <PropertyRow label="Estimate">
          <Input
            size="sm"
            type="number"
            min={0}
            step={1}
            aria-label="Estimate"
            placeholder="Points"
            value={task.estimate ?? ""}
            onChange={(e) => onChange?.({ estimate: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </PropertyRow>
        {models && (
          <PropertyRow label="Model">
            <SimpleSelect
              size="sm"
              aria-label="Model override"
              value={task.model ?? NONE}
              onValueChange={(v) => onChange?.({ model: v === NONE ? undefined : v })}
              options={[{ value: NONE, label: "Default (inherit)" }, ...models.map((m) => ({ value: m.value, label: m.label, description: m.description }))]}
            />
          </PropertyRow>
        )}
        {assignee?.kind === "agent" && assignee.description && (
          <p className="flex gap-1.5 rounded-control bg-primary-soft/50 p-2 text-xs text-primary-soft-foreground">
            <RiSparkling2Line aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {assignee.description}
          </p>
        )}
        {sidebarExtra}
      </aside>
    </div>
  );
}
