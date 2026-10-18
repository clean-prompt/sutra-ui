import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiChat3Line,
  RiCheckboxMultipleLine,
  RiCloseLine,
  RiDraggable,
  RiErrorWarningLine,
  RiFileList3Line,
  RiMoreLine,
  RiSparkling2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { safeISO, toValidDate } from "../lib/date";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import { Badge, type BadgeColor } from "./badge";
import { Avatar } from "./avatar";
import { AgentAvatar, randomAvatarSpec, type AgentAvatarSpec } from "./agent-persona";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { CommentComposer, CommentThread, type CommentHandlers, type CommentThreadData } from "./comments";
import { LogViewer } from "./log-viewer";
import { SimpleSelect } from "./select";
import { Combobox } from "./combobox";
import { DatePicker } from "./date-picker";
import { Input, SearchInput } from "./input";
import { Textarea } from "./textarea";
import { Markdown } from "./markdown";
import { Switch } from "./switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export type KanbanPriority = "urgent" | "high" | "medium" | "low" | "none";
export type KanbanRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type KanbanSwimlanes = "none" | "assignee" | "priority";

export interface KanbanAssignee {
  id: string;
  name: string;
  /** "agent" renders an `AgentAvatar`. Default "human". */
  kind?: "human" | "agent";
  avatarSrc?: string;
  /** Agent avatar spec; derived from the id when omitted. */
  avatar?: AgentAvatarSpec;
  /** Short role description (shown for agents and profiles). */
  description?: string;
}

export interface KanbanLabel {
  id: string;
  name: string;
  color?: BadgeColor;
}

export interface KanbanCardData {
  id: string;
  title: string;
  columnId: string;
  description?: string;
  /** Label ids. */
  labels?: string[];
  priority?: KanbanPriority;
  assigneeId?: string;
  dueDate?: Date | number | string;
  subtasks?: { done: number; total: number };
  commentCount?: number;
  /** Status of the latest agent run on this task. */
  runStatus?: KanbanRunStatus;
  /** Story points or hours. */
  estimate?: number;
  /** Model override id for agent runs. */
  model?: string;
  /** Ids of tasks that block this one. */
  blockedBy?: string[];
  /** Ids of tasks this one blocks. */
  blocks?: string[];
  completed?: boolean;
}

export interface KanbanColumnData {
  id: string;
  title: string;
  /** Any CSS color for the header dot. */
  color?: string;
  wipLimit?: number;
  /** Cards in this column count as done (never overdue). */
  done?: boolean;
}

export interface KanbanBoardModel {
  columns: KanbanColumnData[];
  /** Cards in board order: per column, the array order is the display order. */
  cards: KanbanCardData[];
  labels?: KanbanLabel[];
  assignees?: KanbanAssignee[];
}

export interface KanbanMove {
  cardId: string;
  toColumn: string;
  toIndex: number;
}

export interface KanbanMoveResult {
  board: KanbanBoardModel;
  moved: boolean;
  fromColumn: string;
  fromIndex: number;
  toColumn: string;
  /** Clamped destination index. */
  toIndex: number;
  /** The destination column holds more cards than its WIP limit after the move. */
  overLimit: boolean;
}

export interface KanbanColumnMove {
  columnId: string;
  toIndex: number;
}

export interface KanbanFilters {
  search?: string;
  /** Assignee ids; use `KANBAN_UNASSIGNED` for cards without an assignee. */
  assignees?: string[];
  /** Label ids (a card matches when it has any of them). */
  labels?: string[];
  priorities?: KanbanPriority[];
}

export const KANBAN_UNASSIGNED = "__unassigned";

const priorityOrder: KanbanPriority[] = ["urgent", "high", "medium", "low", "none"];
const priorityLabel: Record<KanbanPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Cards of one column, in display order. */
export function kanbanColumnCards(board: KanbanBoardModel, columnId: string): KanbanCardData[] {
  return board.cards.filter((c) => c.columnId === columnId);
}

/** Card count, WIP limit and over-limit flag for a column. */
export function kanbanColumnWip(board: KanbanBoardModel, columnId: string) {
  const column = board.columns.find((c) => c.id === columnId);
  const count = kanbanColumnCards(board, columnId).length;
  const limit = column?.wipLimit;
  return { count, limit, over: limit != null && count > limit };
}

/** Pure: move a card to `toColumn` at `toIndex` (clamped). Returns the new board plus move details. */
export function moveCard(board: KanbanBoardModel, move: KanbanMove): KanbanMoveResult {
  const card = board.cards.find((c) => c.id === move.cardId);
  const column = board.columns.find((c) => c.id === move.toColumn);
  if (!card || !column) {
    return {
      board,
      moved: false,
      fromColumn: card?.columnId ?? "",
      fromIndex: -1,
      toColumn: move.toColumn,
      toIndex: -1,
      overLimit: false,
    };
  }
  const fromIndex = kanbanColumnCards(board, card.columnId).findIndex((c) => c.id === card.id);
  const rest = board.cards.filter((c) => c.id !== card.id);
  const dest = rest.filter((c) => c.columnId === column.id);
  const toIndex = clamp(Math.round(move.toIndex) || 0, 0, dest.length);
  const moved = !(card.columnId === column.id && fromIndex === toIndex);
  const count = dest.length + 1;
  const overLimit = column.wipLimit != null && count > column.wipLimit;
  const base = { fromColumn: card.columnId, fromIndex, toColumn: column.id, toIndex, overLimit };
  if (!moved) return { board, moved, ...base };
  let insertAt: number;
  if (toIndex < dest.length) insertAt = rest.indexOf(dest[toIndex]!);
  else if (dest.length) insertAt = rest.indexOf(dest[dest.length - 1]!) + 1;
  else insertAt = rest.length;
  const next = card.columnId === column.id ? card : { ...card, columnId: column.id };
  const cards = [...rest.slice(0, insertAt), next, ...rest.slice(insertAt)];
  return { board: { ...board, cards }, moved, ...base };
}

/** Pure: reorder a column. */
export function moveColumn(board: KanbanBoardModel, move: KanbanColumnMove): KanbanBoardModel {
  const from = board.columns.findIndex((c) => c.id === move.columnId);
  if (from < 0) return board;
  const rest = board.columns.filter((c) => c.id !== move.columnId);
  const to = clamp(Math.round(move.toIndex) || 0, 0, rest.length);
  if (to === from) return board;
  return { ...board, columns: [...rest.slice(0, to), board.columns[from]!, ...rest.slice(to)] };
}

/** Pure: keep the cards matching search, assignee, label and priority filters (columns unchanged). */
export function filterBoard(board: KanbanBoardModel, filters: KanbanFilters = {}): KanbanBoardModel {
  const terms = (filters.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const assignees = filters.assignees?.length ? new Set(filters.assignees) : null;
  const labels = filters.labels?.length ? new Set(filters.labels) : null;
  const priorities = filters.priorities?.length ? new Set(filters.priorities) : null;
  if (!terms.length && !assignees && !labels && !priorities) return board;
  const labelName = new Map((board.labels ?? []).map((l) => [l.id, l.name]));
  const personName = new Map((board.assignees ?? []).map((a) => [a.id, a.name]));
  const cards = board.cards.filter((c) => {
    if (assignees && !assignees.has(c.assigneeId ?? KANBAN_UNASSIGNED)) return false;
    if (labels && !(c.labels ?? []).some((l) => labels.has(l))) return false;
    if (priorities && !priorities.has(c.priority ?? "none")) return false;
    if (terms.length) {
      const hay = [
        c.id,
        c.title,
        c.description ?? "",
        ...(c.labels ?? []).map((l) => labelName.get(l) ?? l),
        c.assigneeId ? (personName.get(c.assigneeId) ?? "") : "",
      ]
        .join(" ")
        .toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  return { ...board, cards };
}

/* ------------------------------------------------------------------ */
/* Small parts                                                         */
/* ------------------------------------------------------------------ */

export interface KanbanPriorityIconProps extends React.SVGAttributes<SVGSVGElement> {
  priority: KanbanPriority;
}

/** Linear-style priority glyph (bars, or an alert square for urgent). */
export const KanbanPriorityIcon = React.forwardRef<SVGSVGElement, KanbanPriorityIconProps>(
  ({ priority, className, ...props }, ref) => {
    const level = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 }[priority];
    return (
      <svg
        ref={ref}
        viewBox="0 0 16 16"
        role="img"
        aria-label={`Priority: ${priorityLabel[priority]}`}
        className={cn("size-4 shrink-0", priority === "urgent" ? "text-destructive" : "text-muted-foreground", className)}
        {...props}
      >
        {priority === "urgent" ? (
          <>
            <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" />
            <rect x="7.1" y="4" width="1.8" height="5.2" rx="0.9" fill="var(--background)" />
            <circle cx="8" cy="11.3" r="1" fill="var(--background)" />
          </>
        ) : priority === "none" ? (
          [3, 7, 11].map((x) => <rect key={x} x={x} y="7.2" width="2.4" height="1.6" rx="0.8" fill="currentColor" opacity={0.6} />)
        ) : (
          [0, 1, 2].map((i) => (
            <rect
              key={i}
              x={2.5 + i * 4}
              y={12 - (i + 1) * 3}
              width="3"
              height={(i + 1) * 3 + 1}
              rx="0.8"
              fill="currentColor"
              opacity={i < level ? 1 : 0.25}
            />
          ))
        )}
      </svg>
    );
  }
);
KanbanPriorityIcon.displayName = "KanbanPriorityIcon";

export interface KanbanAssigneeAvatarProps {
  assignee: KanbanAssignee;
  /** Pixel size. Default 20. */
  size?: number;
  className?: string;
}

/** Human `Avatar` or procedural `AgentAvatar` for agent assignees. */
export function KanbanAssigneeAvatar({ assignee, size = 20, className }: KanbanAssigneeAvatarProps) {
  if (assignee.kind === "agent") {
    return (
      <AgentAvatar
        spec={assignee.avatar ?? randomAvatarSpec(assignee.id)}
        size={size}
        label={`${assignee.name} (agent)`}
        className={cn("shrink-0", className)}
      />
    );
  }
  return (
    <Avatar
      name={assignee.name}
      src={assignee.avatarSrc}
      size={size <= 20 ? "xs" : size <= 32 ? "sm" : "md"}
      className={cn("shrink-0", className)}
    />
  );
}

const runBadge: Record<KanbanRunStatus, { label: string; color: BadgeColor }> = {
  queued: { label: "Queued", color: "neutral" },
  running: { label: "Agent running", color: "info" },
  succeeded: { label: "Run succeeded", color: "success" },
  failed: { label: "Run failed", color: "destructive" },
  cancelled: { label: "Run cancelled", color: "gray" },
};

/** Badge for the status of an agent run (running shimmers, failed is red). */
export function KanbanRunBadge({ status, className }: { status: KanbanRunStatus; className?: string }) {
  const b = runBadge[status];
  return (
    <Badge size="sm" color={b.color} className={className} data-run-status={status}>
      {status === "running" ? (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
          <span className="text-shimmer motion-reduce:animate-none">{b.label}</span>
        </span>
      ) : (
        b.label
      )}
    </Badge>
  );
}

const toDate = (d: Date | number | string) => (d instanceof Date ? d : new Date(d));
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** True when `due` is before today and the card is not done. */
export function isKanbanOverdue(card: Pick<KanbanCardData, "dueDate" | "completed">, now: Date | number = Date.now(), done = false) {
  if (!card.dueDate || card.completed || done) return false;
  const due = toValidDate(card.dueDate);
  const today = toValidDate(now);
  if (!due || !today) return false;
  return startOfDay(due) < startOfDay(today);
}

/* ------------------------------------------------------------------ */
/* KanbanCard                                                          */
/* ------------------------------------------------------------------ */

export interface KanbanCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  card: KanbanCardData;
  assignee?: KanbanAssignee;
  labels?: KanbanLabel[];
  /** The card's column counts as done. */
  done?: boolean;
  /** Reference time for the overdue check. */
  now?: Date | number;
  locale?: string;
  onOpen?: () => void;
  /** Actions rendered top-right (e.g. a menu). */
  actions?: React.ReactNode;
  /** Props for the full-card activator button (drag listeners, aria). */
  activatorProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  activatorRef?: React.Ref<HTMLButtonElement>;
  /** Rendered as a drop placeholder. */
  placeholder?: boolean;
  /** Rendered in the drag overlay. */
  overlay?: boolean;
}

/** Task card: labels, title, priority, assignee (human or agent), due date, subtasks, comments, run status. */
export const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(
  (
    {
      card,
      assignee,
      labels = [],
      done,
      now,
      locale,
      onOpen,
      actions,
      activatorProps,
      activatorRef,
      placeholder,
      overlay,
      className,
      ...props
    },
    ref
  ) => {
    const metaId = React.useId();
    const overdue = isKanbanOverdue(card, now ?? Date.now(), done);
    const due = toValidDate(card.dueDate);
    const dueText = due ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(due) : "";
    const cardLabels = (card.labels ?? []).map((id) => labels.find((l) => l.id === id) ?? { id, name: id });
    const { "aria-describedby": dndDescribedBy, role: _role, ...restActivator } = activatorProps ?? {};
    return (
      <div
        ref={ref}
        data-kanban-card={card.id}
        data-overdue={overdue || undefined}
        className={cn(
          "group/card relative rounded-box border border-border bg-card p-3 text-left shadow-xs transition-[box-shadow,border-color,opacity]",
          "hover:border-border-strong hover:shadow-sm",
          placeholder && "opacity-40",
          overlay && "rotate-1 cursor-grabbing shadow-xl ring-2 ring-primary/30",
          card.runStatus === "failed" && "border-destructive/40",
          className
        )}
        {...props}
      >
        <button
          type="button"
          ref={activatorRef}
          data-kanban-activator={card.id}
          aria-label={card.title}
          aria-describedby={cn(metaId, typeof dndDescribedBy === "string" && dndDescribedBy) || undefined}
          {...(restActivator as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          onClick={(e) => {
            (restActivator.onClick as React.MouseEventHandler<HTMLButtonElement> | undefined)?.(e);
            if (!e.defaultPrevented) onOpen?.();
          }}
          onKeyUp={(e) => {
            if (e.key === " ") e.preventDefault();
          }}
          className={cn(
            "absolute inset-0 rounded-box",
            overlay ? "cursor-grabbing" : onOpen ? "cursor-pointer active:cursor-grabbing" : "cursor-grab",
            focusRing
          )}
        />
        <div id={metaId} aria-hidden className="pointer-events-none relative flex flex-col gap-2">
          {cardLabels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="sr-only">Labels:</span>
              {cardLabels.map((l) => (
                <Badge key={l.id} size="sm" color={l.color ?? "neutral"}>
                  {l.name}
                </Badge>
              ))}
            </div>
          )}
          <p className={cn("line-clamp-3 text-sm font-medium text-foreground", actions && "pr-6")}>{card.title}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
            {card.priority && card.priority !== "none" && (
              <span className="inline-flex items-center">
                <KanbanPriorityIcon priority={card.priority} aria-hidden />
                <span className="sr-only">Priority {priorityLabel[card.priority]}.</span>
              </span>
            )}
            {due && (
              <span
                data-testid="kanban-due"
                className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}
              >
                <RiCalendarLine aria-hidden className="size-3.5" />
                {overdue && <span className="sr-only">Overdue, due</span>}
                {!overdue && <span className="sr-only">Due</span>}
                {dueText}
              </span>
            )}
            {card.subtasks && card.subtasks.total > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 tabular-nums",
                  card.subtasks.done >= card.subtasks.total && "text-success"
                )}
              >
                <RiCheckboxMultipleLine aria-hidden className="size-3.5" />
                <span className="sr-only">Subtasks</span>
                {card.subtasks.done}/{card.subtasks.total}
              </span>
            )}
            {!!card.commentCount && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <RiChat3Line aria-hidden className="size-3.5" />
                {card.commentCount}
                <span className="sr-only">comments</span>
              </span>
            )}
            {card.runStatus && <KanbanRunBadge status={card.runStatus} />}
            {assignee && (
              <span className="ml-auto inline-flex items-center gap-1">
                <span className="sr-only">Assigned to {assignee.name}</span>
                <KanbanAssigneeAvatar assignee={assignee} size={20} />
              </span>
            )}
          </div>
        </div>
        {actions && <div className="absolute right-1.5 top-1.5">{actions}</div>}
      </div>
    );
  }
);
KanbanCard.displayName = "KanbanCard";

/* ------------------------------------------------------------------ */
/* KanbanBoard                                                         */
/* ------------------------------------------------------------------ */

interface Lane {
  key: string;
  title: string;
  assignee?: KanbanAssignee;
  priority?: KanbanPriority;
  cells: Record<string, KanbanCardData[]>;
}

function buildLanes(board: KanbanBoardModel, mode: KanbanSwimlanes): Lane[] {
  const cellsFor = (pred: (c: KanbanCardData) => boolean) => {
    const cells: Record<string, KanbanCardData[]> = {};
    for (const col of board.columns) cells[col.id] = [];
    for (const c of board.cards) if (pred(c)) cells[c.columnId]?.push(c);
    return cells;
  };
  if (mode === "assignee") {
    const lanes: Lane[] = (board.assignees ?? [])
      .filter((a) => board.cards.some((c) => c.assigneeId === a.id))
      .map((a) => ({ key: a.id, title: a.name, assignee: a, cells: cellsFor((c) => c.assigneeId === a.id) }));
    const known = new Set((board.assignees ?? []).map((a) => a.id));
    if (board.cards.some((c) => !c.assigneeId || !known.has(c.assigneeId)))
      lanes.push({
        key: KANBAN_UNASSIGNED,
        title: "Unassigned",
        cells: cellsFor((c) => !c.assigneeId || !known.has(c.assigneeId)),
      });
    return lanes;
  }
  if (mode === "priority") {
    return priorityOrder
      .filter((p) => board.cards.some((c) => (c.priority ?? "none") === p))
      .map((p) => ({ key: p, title: priorityLabel[p], priority: p, cells: cellsFor((c) => (c.priority ?? "none") === p) }));
  }
  return [{ key: "all", title: "All", cells: cellsFor(() => true) }];
}

const cardKey = (id: string) => `card:${id}`;
const columnKey = (id: string) => `column:${id}`;
const unkey = (key: string | number) => String(key).replace(/^(card|column|area):/, "");

export interface KanbanAddCardRequest {
  columnId: string;
  title: string;
}

export interface KanbanBoardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  board?: KanbanBoardModel;
  defaultBoard?: KanbanBoardModel;
  /** Called with the next board after any move (also in controlled mode). */
  onBoardChange?: (board: KanbanBoardModel) => void;
  /** Called when a card is dropped in a new place. `toIndex` is the index within the full (unfiltered) column. */
  onMove?: (move: KanbanMove) => void;
  onColumnMove?: (move: KanbanColumnMove) => void;
  onCardOpen?: (card: KanbanCardData) => void;
  /** Enables the per-column "Add card" composer. */
  onAddCard?: (request: KanbanAddCardRequest) => void;
  filters?: KanbanFilters;
  defaultFilters?: KanbanFilters;
  onFiltersChange?: (filters: KanbanFilters) => void;
  swimlanes?: KanbanSwimlanes;
  defaultSwimlanes?: KanbanSwimlanes;
  onSwimlanesChange?: (mode: KanbanSwimlanes) => void;
  collapsedColumns?: string[];
  defaultCollapsedColumns?: string[];
  onCollapsedColumnsChange?: (ids: string[]) => void;
  /** Slot at the start of the toolbar (e.g. a board switcher). */
  boardSwitcher?: React.ReactNode;
  /** Extra toolbar content at the end. */
  toolbarExtra?: React.ReactNode;
  /** Hide the filter toolbar. */
  hideToolbar?: boolean;
  /** Reference time for overdue checks. */
  now?: Date | number;
  locale?: string;
  /** Accessible name of the board. Default "Kanban board". */
  "aria-label"?: string;
}

interface ActiveDrag {
  type: "card" | "column";
  id: string;
  keyboard: boolean;
}

/** Drag-and-drop task board: sortable cards and columns, WIP limits, swimlanes, quick filters and screen-reader announcements. */
export const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(
  (
    {
      board: boardProp,
      defaultBoard,
      onBoardChange,
      onMove,
      onColumnMove,
      onCardOpen,
      onAddCard,
      filters: filtersProp,
      defaultFilters,
      onFiltersChange,
      swimlanes: swimlanesProp,
      defaultSwimlanes,
      onSwimlanesChange,
      collapsedColumns: collapsedProp,
      defaultCollapsedColumns,
      onCollapsedColumnsChange,
      boardSwitcher,
      toolbarExtra,
      hideToolbar,
      now,
      locale,
      "aria-label": ariaLabel = "Kanban board",
      className,
      ...props
    },
    ref
  ) => {
    const [board, setBoard] = useControllableState<KanbanBoardModel>({
      value: boardProp,
      defaultValue: defaultBoard ?? { columns: [], cards: [] },
      onChange: onBoardChange,
    });
    const [filters, setFilters] = useControllableState<KanbanFilters>({
      value: filtersProp,
      defaultValue: defaultFilters ?? {},
      onChange: onFiltersChange,
    });
    const [swimlanes, setSwimlanes] = useControllableState<KanbanSwimlanes>({
      value: swimlanesProp,
      defaultValue: defaultSwimlanes ?? "none",
      onChange: onSwimlanesChange,
    });
    const [collapsed, setCollapsed] = useControllableState<string[]>({
      value: collapsedProp,
      defaultValue: defaultCollapsedColumns ?? [],
      onChange: onCollapsedColumnsChange,
    });

    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRootRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const [preview, setPreviewState] = React.useState<KanbanBoardModel | null>(null);
    const previewRef = React.useRef<KanbanBoardModel | null>(null);
    const setPreview = React.useCallback((b: KanbanBoardModel | null) => {
      previewRef.current = b;
      setPreviewState(b);
    }, []);
    const [active, setActive] = React.useState<ActiveDrag | null>(null);
    const activeRef = React.useRef<ActiveDrag | null>(null);
    const announceRef = React.useRef<string | undefined>(undefined);
    const justDraggedRef = React.useRef(false);
    const [focusId, setFocusId] = React.useState<string | null>(null);
    const [message, setMessage] = React.useState("");
    const [addingTo, setAddingTo] = React.useState<string | null>(null);

    const view = preview ?? board;
    const filtered = React.useMemo(() => {
      const f = filterBoard(view, filters);
      if (active?.type === "card" && !f.cards.some((c) => c.id === active.id)) {
        return { ...f, cards: view.cards.filter((c) => c.id === active.id || f.cards.includes(c)) };
      }
      return f;
    }, [view, filters, active]);
    const lanes = React.useMemo(() => buildLanes(filtered, swimlanes), [filtered, swimlanes]);
    const lanesRef = React.useRef(lanes);
    lanesRef.current = lanes;
    const boardRef = React.useRef(board);
    boardRef.current = board;

    const assigneeById = React.useMemo(() => new Map((board.assignees ?? []).map((a) => [a.id, a])), [board.assignees]);

    React.useEffect(() => {
      if (!focusId) return;
      const el = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-kanban-activator],[data-kanban-column-handle]") ?? []).find(
        (n) => n.getAttribute("data-kanban-activator") === focusId || n.getAttribute("data-kanban-column-handle") === focusId
      );
      el?.focus();
      setFocusId(null);
    }, [focusId]);

    /* ---------- descriptions ---------- */
    const describeCard = (b: KanbanBoardModel, cardId: string) => {
      const card = b.cards.find((c) => c.id === cardId);
      if (!card) return null;
      const col = b.columns.find((c) => c.id === card.columnId);
      const list = kanbanColumnCards(b, card.columnId);
      return { card, col, index: list.findIndex((c) => c.id === cardId), total: list.length };
    };
    const columnTitle = (b: KanbanBoardModel, id: string) => b.columns.find((c) => c.id === id)?.title ?? id;
    const placeText = (b: KanbanBoardModel, cardId: string) => {
      const d = describeCard(b, cardId);
      if (!d) return "";
      const wip = kanbanColumnWip(b, d.card.columnId);
      return `column ${d.col?.title ?? d.card.columnId}, position ${d.index + 1} of ${d.total}${wip.over ? ". Column is over its WIP limit" : ""}`;
    };

    /* ---------- commit helpers ---------- */
    const commitMove = React.useCallback(
      (move: KanbanMove) => {
        const result = moveCard(boardRef.current, move);
        if (!result.moved) return result;
        onMove?.({ cardId: move.cardId, toColumn: result.toColumn, toIndex: result.toIndex });
        setBoard(result.board);
        return result;
      },
      [onMove, setBoard]
    );

    const menuMove = (cardId: string, move: KanbanMove) => {
      const result = commitMove(move);
      if (!result.moved) return;
      const title = boardRef.current.cards.find((c) => c.id === cardId)?.title ?? cardId;
      setMessage(`Moved card ${title} to ${placeText(result.board, cardId)}.`);
      setFocusId(cardId);
    };

    /* ---------- keyboard stepping ---------- */
    const findEl = (attr: string, value: string) =>
      Array.from(rootRef.current?.querySelectorAll<HTMLElement>(`[${attr}]`) ?? []).find((n) => n.getAttribute(attr) === value) ??
      null;

    const keyboardStep = (id: string, dx: number, dy: number): HTMLElement | null | false => {
      const cur = previewRef.current;
      const act = activeRef.current;
      if (!cur || !act) return false;
      if (act.type === "column") {
        if (!dx) return false;
        const from = cur.columns.findIndex((c) => c.id === id);
        const to = from + dx;
        if (from < 0 || to < 0 || to >= cur.columns.length) return false;
        const next = moveColumn(cur, { columnId: id, toIndex: to });
        setPreview(next);
        announceRef.current = `Column ${columnTitle(cur, id)} moved to position ${to + 1} of ${cur.columns.length}.`;
        return findEl("data-kanban-column-handle", cur.columns[to]!.id);
      }
      const card = cur.cards.find((c) => c.id === id);
      if (!card) return false;
      const lane = lanesRef.current.find((l) => l.cells[card.columnId]?.some((c) => c.id === id));
      if (!lane) return false;
      const colIndex = cur.columns.findIndex((c) => c.id === card.columnId);
      const visible = lane.cells[card.columnId] ?? [];
      const idx = visible.findIndex((c) => c.id === id);
      let targetCol = card.columnId;
      let pos: number;
      if (dy) {
        pos = idx + dy;
        if (pos < 0 || pos >= visible.length) return false;
      } else {
        const ci = colIndex + dx;
        if (ci < 0 || ci >= cur.columns.length) return false;
        targetCol = cur.columns[ci]!.id;
        pos = Math.min(idx, (lane.cells[targetCol] ?? []).length);
      }
      const rest = (lane.cells[targetCol] ?? []).filter((c) => c.id !== id);
      const full = kanbanColumnCards(cur, targetCol).filter((c) => c.id !== id);
      let toIndex: number;
      if (pos < rest.length) toIndex = full.indexOf(rest[pos]!);
      else if (rest.length) toIndex = full.indexOf(rest[rest.length - 1]!) + 1;
      else toIndex = full.length;
      const result = moveCard(cur, { cardId: id, toColumn: targetCol, toIndex });
      if (!result.moved) return false;
      setPreview(result.board);
      announceRef.current = `Moved card ${card.title} to column ${columnTitle(cur, targetCol)}, position ${pos + 1} of ${rest.length + 1}${result.overLimit ? ". Column is over its WIP limit" : ""}.`;
      const neighbour = rest[pos] ?? rest[rest.length - 1];
      return neighbour ? findEl("data-kanban-activator", neighbour.id) : findEl("data-kanban-area", `${lane.key}::${targetCol}`);
    };
    const keyboardStepRef = React.useRef(keyboardStep);
    keyboardStepRef.current = keyboardStep;

    const coordinateGetter = React.useCallback<KeyboardCoordinateGetter>((event, { active: a, currentCoordinates }) => {
      const dir = ({ ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } as Record<string, [number, number]>)[
        event.code
      ];
      if (!dir) return undefined;
      event.preventDefault();
      const el = keyboardStepRef.current(unkey(a), dir[0], dir[1]);
      if (el === false) return undefined;
      const r = el?.getBoundingClientRect();
      if (r && (r.width || r.height) && (r.left !== currentCoordinates.x || r.top !== currentCoordinates.y)) return { x: r.left, y: r.top };
      return { x: currentCoordinates.x + dir[0], y: currentCoordinates.y + dir[1] };
    }, []);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
      useSensor(KeyboardSensor, {
        coordinateGetter,
        keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
      })
    );

    const collisionDetection = React.useCallback<CollisionDetection>((args) => {
      if (args.active.data.current?.type === "column") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === "column"),
        });
      }
      const within = pointerWithin(args);
      if (within.length) {
        const cards = within.filter((c) => String(c.id).startsWith("card:"));
        return cards.length ? cards : within;
      }
      return closestCorners(args);
    }, []);

    /* ---------- drag handlers ---------- */
    const handleDragStart = (e: DragStartEvent) => {
      const type = e.active.data.current?.type === "column" ? "column" : "card";
      const next: ActiveDrag = {
        type,
        id: unkey(e.active.id),
        keyboard: typeof KeyboardEvent !== "undefined" && e.activatorEvent instanceof KeyboardEvent,
      };
      activeRef.current = next;
      setActive(next);
      setPreview(boardRef.current);
      setMessage("");
    };

    const handleDragOver = (e: DragOverEvent) => {
      const act = activeRef.current;
      const cur = previewRef.current;
      if (!act || act.keyboard || !cur || !e.over) return;
      const overType = e.over.data.current?.type as string | undefined;
      const overId = unkey(e.over.id);
      if (act.type === "column") {
        if (overType !== "column" || overId === act.id) return;
        const to = cur.columns.findIndex((c) => c.id === overId);
        setPreview(moveColumn(cur, { columnId: act.id, toIndex: to }));
        return;
      }
      const card = cur.cards.find((c) => c.id === act.id);
      if (!card) return;
      let targetCol: string | undefined;
      let toIndex = Infinity;
      if (overType === "card") {
        const overCard = cur.cards.find((c) => c.id === overId);
        if (!overCard || overCard.id === card.id) return;
        targetCol = overCard.columnId;
        toIndex = kanbanColumnCards(cur, targetCol).findIndex((c) => c.id === overId);
      } else if (overType === "area" || overType === "column") {
        targetCol = e.over.data.current?.columnId as string;
      }
      if (!targetCol || targetCol === card.columnId) return;
      setPreview(moveCard(cur, { cardId: card.id, toColumn: targetCol, toIndex }).board);
    };

    const finish = () => {
      activeRef.current = null;
      setActive(null);
      setPreview(null);
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    };

    const handleDragEnd = (e: DragEndEvent) => {
      const act = activeRef.current;
      let cur = previewRef.current;
      if (!act || !cur) return finish();
      if (act.type === "column") {
        const to = cur.columns.findIndex((c) => c.id === act.id);
        const from = boardRef.current.columns.findIndex((c) => c.id === act.id);
        if (to !== from && to >= 0) {
          onColumnMove?.({ columnId: act.id, toIndex: to });
          setBoard(moveColumn(boardRef.current, { columnId: act.id, toIndex: to }));
        }
        announceRef.current = `Dropped column ${columnTitle(cur, act.id)} at position ${to + 1} of ${cur.columns.length}.`;
        setFocusId(act.id);
        return finish();
      }
      if (!act.keyboard && e.over && e.over.data.current?.type === "card") {
        const overId = unkey(e.over.id);
        const card = cur.cards.find((c) => c.id === act.id);
        const overCard = cur.cards.find((c) => c.id === overId);
        if (card && overCard && overCard.id !== card.id && overCard.columnId === card.columnId) {
          const idx = kanbanColumnCards(cur, card.columnId).findIndex((c) => c.id === overId);
          cur = moveCard(cur, { cardId: card.id, toColumn: card.columnId, toIndex: idx }).board;
        }
      }
      const finalCard = cur.cards.find((c) => c.id === act.id);
      if (finalCard) {
        const toIndex = kanbanColumnCards(cur, finalCard.columnId).findIndex((c) => c.id === act.id);
        commitMove({ cardId: act.id, toColumn: finalCard.columnId, toIndex });
        announceRef.current = `Dropped card ${finalCard.title} in ${placeText(cur, act.id)}.`;
      }
      setFocusId(act.id);
      finish();
    };

    const handleDragCancel = () => {
      const act = activeRef.current;
      if (act) {
        const name = act.type === "column" ? `column ${columnTitle(boardRef.current, act.id)}` : `card ${describeCard(boardRef.current, act.id)?.card.title ?? act.id}`;
        announceRef.current = `Cancelled. Returned ${name} to its original position.`;
        setFocusId(act.id);
      }
      finish();
    };

    const takeAnnouncement = () => {
      const t = announceRef.current;
      announceRef.current = undefined;
      return t;
    };

    const announcements: Announcements = {
      onDragStart({ active: a }) {
        const id = unkey(a.id);
        const b = boardRef.current;
        if (a.data.current?.type === "column") {
          const i = b.columns.findIndex((c) => c.id === id);
          return `Picked up column ${columnTitle(b, id)}, position ${i + 1} of ${b.columns.length}. Use left and right arrow keys to move, Space to drop, Escape to cancel.`;
        }
        const d = describeCard(b, id);
        return `Picked up card ${d?.card.title ?? id} in ${placeText(b, id)}. Use arrow keys to move, Space to drop, Escape to cancel.`;
      },
      onDragMove() {
        return takeAnnouncement();
      },
      onDragOver({ active: a, over }) {
        if (activeRef.current?.keyboard) return takeAnnouncement();
        if (!over) return undefined;
        const b = previewRef.current ?? boardRef.current;
        const id = unkey(a.id);
        if (a.data.current?.type === "column") {
          const i = b.columns.findIndex((c) => c.id === unkey(over.id));
          return `Column ${columnTitle(b, id)} is over position ${i + 1} of ${b.columns.length}.`;
        }
        const overType = over.data.current?.type;
        if (overType === "card") {
          const d = describeCard(b, unkey(over.id));
          if (d) return `Card ${describeCard(b, id)?.card.title ?? id} is over column ${d.col?.title}, position ${d.index + 1} of ${d.total}.`;
        }
        const colId = over.data.current?.columnId as string | undefined;
        return colId ? `Card ${describeCard(b, id)?.card.title ?? id} is over column ${columnTitle(b, colId)}.` : undefined;
      },
      onDragEnd() {
        return takeAnnouncement();
      },
      onDragCancel() {
        return takeAnnouncement();
      },
    };

    /* ---------- render ---------- */
    const toggleCollapsed = (id: string) =>
      setCollapsed(collapsed.includes(id) ? collapsed.filter((c) => c !== id) : [...collapsed, id]);
    const hasLanes = swimlanes !== "none";
    const activeCard = active?.type === "card" ? view.cards.find((c) => c.id === active.id) : undefined;
    const activeColumn = active?.type === "column" ? view.columns.find((c) => c.id === active.id) : undefined;

    const renderCardMenu = (card: KanbanCardData) => {
      const list = kanbanColumnCards(board, card.columnId);
      const index = list.findIndex((c) => c.id === card.id);
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Actions for ${card.title}`}
              className="text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <RiMoreLine />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {onCardOpen && <DropdownMenuItem onSelect={() => onCardOpen(card)}>Open</DropdownMenuItem>}
            <DropdownMenuItem
              disabled={index <= 0}
              onSelect={() => menuMove(card.id, { cardId: card.id, toColumn: card.columnId, toIndex: index - 1 })}
            >
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index >= list.length - 1}
              onSelect={() => menuMove(card.id, { cardId: card.id, toColumn: card.columnId, toIndex: index + 1 })}
            >
              Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Move to…</DropdownMenuLabel>
            {board.columns.map((col) => (
              <DropdownMenuItem
                key={col.id}
                disabled={col.id === card.columnId}
                onSelect={() => menuMove(card.id, { cardId: card.id, toColumn: col.id, toIndex: Infinity })}
              >
                <span aria-hidden className="size-2 rounded-full" style={{ background: col.color ?? "var(--muted-foreground)" }} />
                {col.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    };

    return (
      <div ref={setRootRef} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
        {!hideToolbar && (
          <KanbanToolbar
            board={board}
            filters={filters}
            onFiltersChange={setFilters}
            swimlanes={swimlanes}
            onSwimlanesChange={setSwimlanes}
            boardSwitcher={boardSwitcher}
            extra={toolbarExtra}
          />
        )}
        <div role="status" aria-live="polite" className="sr-only" data-kanban-announcer="">
          {message}
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{
            announcements,
            restoreFocus: false,
            screenReaderInstructions: {
              draggable:
                "To pick up a card or column, press Space. While dragging, use the arrow keys to move it, Space to drop, or Escape to cancel. You can also use the card's actions menu to move it.",
            },
          }}
        >
          <section aria-label={ariaLabel} className="scrollbar-thin overflow-x-auto pb-2">
            <div className="inline-flex min-w-full flex-col">
              <SortableContext items={view.columns.map((c) => columnKey(c.id))} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-3" role="list" aria-label="Columns">
                  {view.columns.map((col) => (
                    <KanbanColumnHeader
                      key={col.id}
                      column={col}
                      wip={kanbanColumnWip(view, col.id)}
                      visibleCount={lanes.reduce((n, l) => n + (l.cells[col.id]?.length ?? 0), 0)}
                      collapsed={collapsed.includes(col.id)}
                      onToggleCollapsed={() => toggleCollapsed(col.id)}
                      onAdd={onAddCard ? () => setAddingTo(col.id) : undefined}
                      joined={!hasLanes}
                      placeholder={active?.type === "column" && active.id === col.id}
                    />
                  ))}
                </div>
              </SortableContext>
              {lanes.length === 0 && (
                <p className="px-1 py-6 text-sm text-muted-foreground">No cards match the current filters.</p>
              )}
              {lanes.map((lane, li) => (
                <div key={lane.key} className={cn(hasLanes && "mt-3")} role="group" aria-label={hasLanes ? `Swimlane ${lane.title}` : undefined}>
                  {hasLanes && (
                    <div className="sticky left-0 mb-2 flex w-fit items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                      {lane.assignee && <KanbanAssigneeAvatar assignee={lane.assignee} size={18} />}
                      {lane.priority && <KanbanPriorityIcon priority={lane.priority} aria-hidden />}
                      <span className="text-foreground">{lane.title}</span>
                      <span className="tabular-nums">{Object.values(lane.cells).reduce((n, c) => n + c.length, 0)}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {view.columns.map((col) => {
                      const cards = lane.cells[col.id] ?? [];
                      const isCollapsed = collapsed.includes(col.id);
                      return (
                        <KanbanCell
                          key={col.id}
                          laneKey={lane.key}
                          column={col}
                          collapsed={isCollapsed}
                          joined={!hasLanes}
                          over={kanbanColumnWip(view, col.id).over}
                          count={cards.length}
                        >
                          {!isCollapsed && addingTo === col.id && li === 0 && onAddCard && (
                            <KanbanAddCardComposer
                              columnTitle={col.title}
                              onSubmit={(title) => {
                                onAddCard({ columnId: col.id, title });
                                setAddingTo(null);
                              }}
                              onCancel={() => setAddingTo(null)}
                            />
                          )}
                          {!isCollapsed && (
                            <SortableContext items={cards.map((c) => cardKey(c.id))} strategy={verticalListSortingStrategy}>
                              <ul className="flex flex-col gap-2" aria-label={`${col.title}${hasLanes ? ` · ${lane.title}` : ""} cards`}>
                                {cards.map((card) => (
                                  <SortableKanbanCard
                                    key={card.id}
                                    card={card}
                                    assignee={card.assigneeId ? assigneeById.get(card.assigneeId) : undefined}
                                    labels={board.labels}
                                    done={col.done}
                                    now={now}
                                    locale={locale}
                                    placeholder={active?.type === "card" && active.id === card.id}
                                    onOpen={
                                      onCardOpen
                                        ? () => {
                                            if (!justDraggedRef.current) onCardOpen(card);
                                          }
                                        : undefined
                                    }
                                    actions={renderCardMenu(card)}
                                  />
                                ))}
                              </ul>
                            </SortableContext>
                          )}
                        </KanbanCell>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <KanbanCard
                card={activeCard}
                assignee={activeCard.assigneeId ? assigneeById.get(activeCard.assigneeId) : undefined}
                labels={board.labels}
                now={now}
                locale={locale}
                overlay
                activatorProps={{ tabIndex: -1, "aria-hidden": true }}
                className="w-72"
              />
            ) : activeColumn ? (
              <div className="flex h-10 w-72 items-center gap-2 rounded-box border border-border bg-card px-3 text-sm font-medium shadow-xl ring-2 ring-primary/30">
                <span aria-hidden className="size-2 rounded-full" style={{ background: activeColumn.color ?? "var(--muted-foreground)" }} />
                {activeColumn.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    );
  }
);
KanbanBoard.displayName = "KanbanBoard";

function SortableKanbanCard(props: Omit<KanbanCardProps, "activatorProps" | "activatorRef">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: cardKey(props.card.id),
    data: { type: "card", columnId: props.card.columnId },
  });
  return (
    <li style={{ transform: CSS.Translate.toString(transform), transition }} ref={setNodeRef}>
      <KanbanCard {...props} activatorRef={setActivatorNodeRef} activatorProps={{ ...attributes, ...listeners }} />
    </li>
  );
}

interface KanbanColumnHeaderProps {
  column: KanbanColumnData;
  wip: { count: number; limit?: number; over: boolean };
  visibleCount: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAdd?: () => void;
  joined: boolean;
  placeholder: boolean;
}

function KanbanColumnHeader({ column, wip, visibleCount, collapsed, onToggleCollapsed, onAdd, joined, placeholder }: KanbanColumnHeaderProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: columnKey(column.id),
    data: { type: "column", columnId: column.id },
  });
  const { role: _role, ...attrs } = attributes;
  const countText = wip.limit != null ? `${wip.count}/${wip.limit}` : `${wip.count}`;
  const filteredOut = visibleCount !== wip.count;
  return (
    <div
      ref={setNodeRef}
      role="listitem"
      data-kanban-column={column.id}
      data-over-limit={wip.over || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group/col flex shrink-0 items-center gap-1.5 border border-border bg-subtle px-2 py-2",
        joined ? "rounded-t-box border-b-0" : "rounded-box",
        collapsed ? "w-11 flex-col py-2" : "w-72",
        wip.over && "border-warning/60 bg-warning-soft/40",
        placeholder && "opacity-50"
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        data-kanban-column-handle={column.id}
        aria-label={`Reorder column ${column.title}`}
        {...attrs}
        {...listeners}
        className={cn("inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-control text-muted-foreground hover:bg-accent active:cursor-grabbing", focusRing)}
      >
        <RiDraggable aria-hidden className="size-4" />
      </button>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: column.color ?? "var(--muted-foreground)" }} />
      <h3
        className={cn(
          "min-w-0 truncate text-sm font-semibold text-foreground",
          collapsed && "[writing-mode:vertical-rl] rotate-180 py-1"
        )}
      >
        {column.title}
      </h3>
      <span
        className={cn(
          "shrink-0 rounded-control px-1.5 text-xs tabular-nums text-muted-foreground",
          wip.over && "bg-warning-soft font-semibold text-warning-soft-foreground"
        )}
      >
        <span aria-hidden>{filteredOut && !collapsed ? `${visibleCount} of ${countText}` : countText}</span>
        <span className="sr-only">
          {wip.count} cards{wip.limit != null ? `, WIP limit ${wip.limit}` : ""}
          {filteredOut ? `, ${visibleCount} shown` : ""}
        </span>
      </span>
      {wip.over && (
        <span className="inline-flex shrink-0 items-center text-warning" title="Over WIP limit">
          <RiErrorWarningLine aria-hidden className="size-4" />
          <span className="sr-only">Over WIP limit</span>
        </span>
      )}
      <div className={cn("flex items-center gap-0.5", collapsed ? "flex-col" : "ml-auto")}>
        {onAdd && !collapsed && (
          <Button size="icon-xs" variant="ghost" aria-label={`Add card to ${column.title}`} onClick={onAdd}>
            <RiAddLine />
          </Button>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${column.title}`}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <RiArrowRightSLine /> : <RiArrowDownSLine />}
        </Button>
      </div>
    </div>
  );
}

function KanbanCell({
  laneKey,
  column,
  collapsed,
  joined,
  over,
  count,
  children,
}: {
  laneKey: string;
  column: KanbanColumnData;
  collapsed: boolean;
  joined: boolean;
  over: boolean;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `area:${laneKey}::${column.id}`,
    data: { type: "area", columnId: column.id, lane: laneKey },
  });
  return (
    <div
      ref={setNodeRef}
      data-kanban-area={`${laneKey}::${column.id}`}
      className={cn(
        "flex shrink-0 flex-col gap-2 border border-border bg-subtle p-2 transition-colors",
        joined ? "min-h-40 rounded-b-box border-t-0" : "min-h-24 rounded-box",
        collapsed ? "w-11 items-center" : "w-72",
        over && "border-warning/60",
        isOver && "bg-primary-soft/40"
      )}
    >
      {collapsed ? (
        <span className="text-xs tabular-nums text-muted-foreground" aria-hidden>
          {count}
        </span>
      ) : (
        children
      )}
    </div>
  );
}

function KanbanAddCardComposer({ columnTitle, onSubmit, onCancel }: { columnTitle: string; onSubmit: (title: string) => void; onCancel: () => void }) {
  const [value, setValue] = React.useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
      className="flex flex-col gap-1.5"
    >
      <Input
        autoFocus
        size="sm"
        value={value}
        placeholder="Card title"
        aria-label={`New card title in ${columnTitle}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <div className="flex gap-1">
        <Button type="submit" size="xs" disabled={!value.trim()}>
          Add card
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

export interface KanbanToolbarProps {
  board: KanbanBoardModel;
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  swimlanes?: KanbanSwimlanes;
  onSwimlanesChange?: (mode: KanbanSwimlanes) => void;
  boardSwitcher?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
}

/** Quick filters for a board: search, assignee toggles, labels and swimlane grouping. */
export function KanbanToolbar({
  board,
  filters,
  onFiltersChange,
  swimlanes = "none",
  onSwimlanesChange,
  boardSwitcher,
  extra,
  className,
}: KanbanToolbarProps) {
  const selectedAssignees = filters.assignees ?? [];
  const active = !!(filters.search || selectedAssignees.length || filters.labels?.length || filters.priorities?.length);
  const toggleAssignee = (id: string) =>
    onFiltersChange({
      ...filters,
      assignees: selectedAssignees.includes(id) ? selectedAssignees.filter((a) => a !== id) : [...selectedAssignees, id],
    });
  return (
    <div role="toolbar" aria-label="Board filters" className={cn("flex flex-wrap items-center gap-2", className)}>
      {boardSwitcher}
      <SearchInput
        size="sm"
        aria-label="Search cards"
        placeholder="Filter cards…"
        value={filters.search ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        onClear={() => onFiltersChange({ ...filters, search: "" })}
        className="w-48"
      />
      {(board.assignees?.length ?? 0) > 0 && (
        <div role="group" aria-label="Filter by assignee" className="flex items-center -space-x-1">
          {board.assignees!.map((a) => {
            const pressed = selectedAssignees.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={pressed}
                aria-label={a.name}
                title={a.name}
                onClick={() => toggleAssignee(a.id)}
                className={cn(
                  "relative inline-flex rounded-full ring-2 ring-background transition-transform hover:z-10 hover:-translate-y-0.5",
                  pressed && "z-10 ring-primary",
                  focusRing
                )}
              >
                <span aria-hidden className="inline-flex">
                  <KanbanAssigneeAvatar assignee={a} size={24} />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {(board.labels?.length ?? 0) > 0 && (
        <Combobox
          multiple
          size="sm"
          aria-label="Filter by label"
          placeholder="Labels"
          className="w-44"
          maxChips={1}
          options={board.labels!.map((l) => ({ value: l.id, label: l.name }))}
          value={filters.labels ?? []}
          onValueChange={(labels) => onFiltersChange({ ...filters, labels })}
        />
      )}
      {onSwimlanesChange && (
        <SimpleSelect
          size="sm"
          aria-label="Group by"
          className="w-40"
          value={swimlanes}
          onValueChange={(v) => onSwimlanesChange(v as KanbanSwimlanes)}
          options={[
            { value: "none", label: "No swimlanes" },
            { value: "assignee", label: "By assignee" },
            { value: "priority", label: "By priority" },
          ]}
        />
      )}
      {active && (
        <Button size="sm" variant="ghost" leadingIcon={<RiCloseLine />} onClick={() => onFiltersChange({})}>
          Clear filters
        </Button>
      )}
      {extra && <div className="ml-auto flex items-center gap-2">{extra}</div>}
    </div>
  );
}

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
  status: KanbanRunStatus;
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
  open?: boolean;
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

const NONE = "__none";

export function formatKanbanDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function relTime(at: Date | number | string, now: number) {
  const diff = (now - toDate(at).getTime()) / 1000;
  if (!Number.isFinite(diff)) return "—";
  const abs = Math.abs(diff);
  const fmt = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return fmt.format(-Math.round(diff), "second");
  if (abs < 3600) return fmt.format(-Math.round(diff / 60), "minute");
  if (abs < 86400) return fmt.format(-Math.round(diff / 3600), "hour");
  return fmt.format(-Math.round(diff / 86400), "day");
}

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
  open,
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
  return (
    <Dialog open={open && !!task} onOpenChange={onOpenChange}>
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
}: Omit<TaskDetailDialogProps, "open" | "onOpenChange" | "task"> & {
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
                    <RiCloseLine />
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
        <div className="flex flex-col gap-1 pr-8">
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
                  className={cn("-mx-1 rounded-control px-1 text-left text-lg font-semibold hover:bg-accent", focusRing)}
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
            <p className="rounded-control border border-dashed border-border p-3 text-sm text-muted-foreground">No description.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            {onComment && <CommentComposer label="Add a comment" placeholder="Leave a comment…" submitLabel="Comment" onSubmit={onComment} />}
          </TabsContent>
          <TabsContent value="activity">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol aria-label="Activity" className="relative flex flex-col gap-3 border-l border-border pl-4">
                {activity.map((a) => (
                  <li key={a.id} className="relative text-sm">
                    <span aria-hidden className={cn("absolute -left-[21px] top-1.5 size-2 rounded-full ring-2 ring-background", a.actorKind === "agent" ? "bg-primary" : "bg-muted-foreground")} />
                    <span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">{a.action}</span>
                    <time dateTime={safeISO(a.at)} className="ml-1.5 text-xs text-muted-foreground">
                      {relTime(a.at, nowMs)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
          <TabsContent value="runs">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agent runs yet.</p>
            ) : (
              <ul aria-label="Agent runs" className="flex flex-col gap-2">
                {runs.map((r) => {
                  const agent = people.find((p) => p.id === r.agentId);
                  const end = r.endedAt ? toDate(r.endedAt).getTime() : r.status === "running" ? nowMs : NaN;
                  const duration = formatKanbanDuration(end - toDate(r.startedAt).getTime());
                  const isOpen = openLog === r.id;
                  return (
                    <li key={r.id} className="rounded-box border border-border bg-card p-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {agent && <KanbanAssigneeAvatar assignee={agent} size={20} />}
                        <span className="font-medium">{agent?.name ?? r.agentName ?? "Agent"}</span>
                        <KanbanRunBadge status={r.status} />
                        {r.model && <span className="font-mono text-xs text-muted-foreground">{r.model}</span>}
                        <span className="text-xs text-muted-foreground">
                          {relTime(r.startedAt, nowMs)} · <span className="tabular-nums">{duration}</span>
                        </span>
                        {r.log && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="ml-auto"
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
                          status={r.status === "running" ? "live" : "idle"}
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

      <aside aria-label="Properties" className="flex flex-col gap-3 border-t border-border bg-subtle p-5 md:overflow-y-auto md:border-l md:border-t-0 md:pt-12">
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

/* ------------------------------------------------------------------ */
/* OrchestrationPanel                                                  */
/* ------------------------------------------------------------------ */

export interface OrchestrationParticipant {
  agent: KanbanAssignee;
  /** Role in this task, e.g. "Writes tests". Falls back to the agent description. */
  role?: string;
  status?: KanbanRunStatus | "idle";
}

export interface OrchestrationPanelProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "title"> {
  /** Agent profiles that can orchestrate. */
  profiles: KanbanAssignee[];
  orchestratorId?: string;
  defaultOrchestratorId?: string;
  onOrchestratorChange?: (id: string | undefined) => void;
  autoDecompose?: boolean;
  defaultAutoDecompose?: boolean;
  onAutoDecomposeChange?: (on: boolean) => void;
  /** Split the task into subtasks now. Shows a button when set. */
  onDecompose?: () => void;
  decomposing?: boolean;
  participants?: OrchestrationParticipant[];
  title?: React.ReactNode;
}

/** Assign an orchestrator agent, toggle auto-decomposition into subtasks and list participating agents. */
export const OrchestrationPanel = React.forwardRef<HTMLElement, OrchestrationPanelProps>(
  (
    {
      profiles,
      orchestratorId,
      defaultOrchestratorId,
      onOrchestratorChange,
      autoDecompose,
      defaultAutoDecompose,
      onAutoDecomposeChange,
      onDecompose,
      decomposing,
      participants = [],
      title = "Orchestration",
      className,
      ...props
    },
    ref
  ) => {
    const switchId = React.useId();
    const headingId = React.useId();
    const [orch, setOrch] = useControllableState<string>({
      value: orchestratorId === undefined ? undefined : orchestratorId,
      defaultValue: defaultOrchestratorId ?? NONE,
      onChange: (v) => onOrchestratorChange?.(v === NONE ? undefined : v),
    });
    const [auto, setAuto] = useControllableState<boolean>({
      value: autoDecompose,
      defaultValue: defaultAutoDecompose ?? false,
      onChange: onAutoDecomposeChange,
    });
    const selected = profiles.find((p) => p.id === orch);
    return (
      <section
        ref={ref}
        aria-labelledby={headingId}
        className={cn("flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <h3 id={headingId} className="flex items-center gap-1.5 text-sm font-semibold">
          <RiSparkling2Line aria-hidden className="size-4 text-primary" />
          {title}
        </h3>
        <SimpleSelect
          size="sm"
          aria-label="Orchestrator agent"
          value={orch || NONE}
          onValueChange={setOrch}
          options={[
            { value: NONE, label: "No orchestrator" },
            ...profiles.map((p) => ({
              value: p.id,
              label: p.name,
              icon: <AgentAvatar spec={p.avatar ?? randomAvatarSpec(p.id)} size={16} label="" />,
            })),
          ]}
        />
        {selected?.description && <p className="text-xs text-muted-foreground">{selected.description}</p>}
        <div className="flex items-start justify-between gap-3">
          <label htmlFor={switchId} className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Auto-decompose</span>
            <span className="text-xs text-muted-foreground">Split this task into subtasks before agents start.</span>
          </label>
          <Switch id={switchId} size="sm" checked={auto} onCheckedChange={setAuto} />
        </div>
        {onDecompose && (
          <Button size="sm" variant="secondary" loading={decomposing} disabled={decomposing} onClick={onDecompose} leadingIcon={<RiSparkling2Line />}>
            Decompose now
          </Button>
        )}
        {participants.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium text-muted-foreground">Participating agents</h4>
            <ul aria-label="Participating agents" className="flex flex-col gap-2">
              {participants.map((p) => (
                <li key={p.agent.id} className="flex items-start gap-2">
                  <AgentAvatar spec={p.agent.avatar ?? randomAvatarSpec(p.agent.id)} size={24} label="" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{p.agent.name}</span>
                      {p.status && p.status !== "idle" && <KanbanRunBadge status={p.status} />}
                    </div>
                    {(p.role ?? p.agent.description) && (
                      <p className="text-xs text-muted-foreground">{p.role ?? p.agent.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }
);
OrchestrationPanel.displayName = "OrchestrationPanel";
