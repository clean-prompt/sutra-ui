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
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDraggable,
  RiErrorWarningLine,
  RiMoreLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";
import {
  KANBAN_UNASSIGNED,
  filterBoard,
  kanbanColumnCards,
  kanbanColumnWip,
  moveCard,
  moveColumn,
  type KanbanAssignee,
  type KanbanBoardModel,
  type KanbanCardData,
  type KanbanColumnData,
  type KanbanColumnMove,
  type KanbanFilters,
  type KanbanMove,
  type KanbanPriority,
  type KanbanSwimlanes,
} from "./kanban-model";
import { priorityLabel, priorityOrder } from "./kanban-internal";
import { KanbanAssigneeAvatar, KanbanCard, KanbanPriorityIcon, type KanbanCardProps } from "./kanban-card";
import { KanbanToolbar } from "./kanban-toolbar";

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
    const setRootRef = useMergedRefs(rootRef, ref);

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
    const lanesRef = useLatestRef(lanes);
    const boardRef = useLatestRef(board);

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
    const keyboardStepRef = useLatestRef(keyboardStep);

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
              <RiMoreLine aria-hidden />
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
                <p className="px-1 py-6 text-sm text-muted-foreground">No cards match the current filters</p>
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
          {collapsed ? <RiArrowRightSLine aria-hidden /> : <RiArrowDownSLine aria-hidden />}
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
