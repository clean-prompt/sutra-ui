import { calendarDayDiff } from "../../lib/time";
import { formatDuration } from "../../lib/duration";
import { clamp } from "../../lib/math";
import type { TaskStatusInput } from "../../lib/status";
import type { BadgeColor } from "../../primitives/badge";
import type { AgentAvatarSpec } from "../../patterns/agent-avatar";

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export type KanbanPriority = "urgent" | "high" | "medium" | "low" | "none";
/**
 * Legacy run-status spellings (kept so existing `Record<KanbanRunStatus, …>` maps still type-check).
 * Run-status props accept `KanbanRunStatusInput`, so the canonical `TaskStatus` names
 * (`pending`, `canceled`, …) work too.
 */
export type KanbanRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
/** What run-status props accept: the canonical `TaskStatus` plus every legacy spelling. */
export type KanbanRunStatusInput = KanbanRunStatus | TaskStatusInput;
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
  runStatus?: KanbanRunStatusInput;
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

/** True when `due` is before today and the card is not done. */
export function isKanbanOverdue(card: Pick<KanbanCardData, "dueDate" | "completed">, now: Date | number = Date.now(), done = false) {
  if (!card.dueDate || card.completed || done) return false;
  return (calendarDayDiff(now, card.dueDate) ?? 0) > 0;
}

/**
 * Time in a column: "45s", "3m 20s", "26h 5m" (hours are the largest unit; "—" for negative input).
 * @deprecated Use `formatDuration(ms, { maxUnit: "h", negative: "invalid" })` from lib/duration.
 */
export function formatKanbanDuration(ms: number) {
  return formatDuration(ms, { maxUnit: "h", negative: "invalid" });
}
