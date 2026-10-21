/* Private lanes, ids and drop targets shared by the kanban board modules. Not re-exported from the kanban barrel. */
import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiDraggable, RiErrorWarningLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { KANBAN_UNASSIGNED, type KanbanAssignee, type KanbanBoardModel, type KanbanCardData, type KanbanColumnData, type KanbanPriority, type KanbanSwimlanes } from "./kanban-model";
import { priorityLabel, priorityOrder } from "./kanban-internal";
import { KanbanCard, type KanbanCardProps } from "./kanban-card";

export interface Lane {
  key: string;
  title: string;
  assignee?: KanbanAssignee;
  priority?: KanbanPriority;
  cells: Record<string, KanbanCardData[]>;
}

export function buildLanes(board: KanbanBoardModel, mode: KanbanSwimlanes): Lane[] {
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

export const cardKey = (id: string) => `card:${id}`;
export const columnKey = (id: string) => `column:${id}`;
export const unkey = (key: string | number) => String(key).replace(/^(card|column|area):/, "");

export interface ActiveDrag {
  type: "card" | "column";
  id: string;
  keyboard: boolean;
}

export function SortableKanbanCard(props: Omit<KanbanCardProps, "activatorProps" | "activatorRef">) {
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

export function KanbanColumnHeader({ column, wip, visibleCount, collapsed, onToggleCollapsed, onAdd, joined, placeholder }: KanbanColumnHeaderProps) {
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
        <span aria-hidden>{filteredOut && !collapsed ? <bdi dir="ltr">{`${visibleCount} of ${countText}`}</bdi> : countText}</span>
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
      <div className={cn("flex items-center gap-0.5", collapsed ? "flex-col" : "ms-auto")}>
        {onAdd && !collapsed && (
          <Button size="icon-xs" variant="ghost" aria-label={`Add card to ${column.title}`} onClick={onAdd}>
            <RiAddLine aria-hidden />
          </Button>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${column.title}`}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden /> : <RiArrowDownSLine aria-hidden />}
        </Button>
      </div>
    </div>
  );
}

export function KanbanCell({
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

export function KanbanAddCardComposer({ columnTitle, onSubmit, onCancel }: { columnTitle: string; onSubmit: (title: string) => void; onCancel: () => void }) {
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
