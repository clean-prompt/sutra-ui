import * as React from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiDeleteBinLine,
  RiDraggable,
  RiEyeLine,
  RiEyeOffLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Progress } from "./progress";
import { reorderArray } from "../lib/reorder";

export { reorderArray, reorderBy } from "../lib/reorder";
export { useReorder, type UseReorderOptions } from "../hooks/use-reorder";

/* ------------------------------------------------------------------ */
/* ReorderableList                                                     */
/* ------------------------------------------------------------------ */

export interface ReorderableListRenderContext {
  index: number;
  /** The item is being dragged or is picked up with the keyboard. */
  active: boolean;
}

export interface ReorderMove {
  from: number;
  to: number;
}

export interface ReorderableListProps<T> extends Omit<React.HTMLAttributes<HTMLUListElement>, "children"> {
  items: T[];
  getKey: (item: T) => string;
  /** Text used in announcements and button labels. Defaults to `String(item)`. */
  getLabel?: (item: T) => string;
  renderItem: (item: T, context: ReorderableListRenderContext) => React.ReactNode;
  onReorder: (items: T[], move: ReorderMove) => void;
  /** Show up / down buttons on each row. */
  moveButtons?: boolean;
  /** Show the drag handle (pointer drag + keyboard pick-up). Default true. */
  handle?: boolean;
  /** Accessible name of the list. */
  label?: string;
  itemClassName?: string;
  disabled?: boolean;
  ref?: React.Ref<HTMLUListElement>;
}

type ActiveState = { key: string; origin: number; mode: "keyboard" | "pointer" };
type PointerState = { y: number; offsetY: number; left: number; width: number; height: number };

/**
 * Accessible reorderable list: drag handle with placeholder, Space-to-lift keyboard moves, optional arrow buttons, live announcements.
 * A generic plain function (React 19 `ref` prop) rather than `forwardRef`, which would erase the item type `T`.
 */
export function ReorderableList<T>({
  items,
  getKey,
  getLabel = (item) => String(item),
  renderItem,
  onReorder,
  moveButtons,
  handle = true,
  label = "Reorderable list",
  itemClassName,
  disabled,
  className,
  ref,
  ...props
}: ReorderableListProps<T>) {
  const [order, setOrder] = React.useState<T[] | null>(null);
  const [active, setActive] = React.useState<ActiveState | null>(null);
  const [pointer, setPointer] = React.useState<PointerState | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const rows = React.useRef(new Map<string, HTMLLIElement>());
  const handles = React.useRef(new Map<string, HTMLButtonElement>());
  const instructionsId = React.useId();
  const working = order ?? items;
  const total = working.length;

  useIsoLayoutEffect(() => {
    if (active?.mode !== "keyboard") return;
    const el = handles.current.get(active.key);
    if (el && document.activeElement !== el) el.focus();
  });

  const indexOfKey = (list: T[], key: string) => list.findIndex((i) => getKey(i) === key);
  const labelOf = (key: string) => {
    const item = working.find((i) => getKey(i) === key);
    return item === undefined ? "" : getLabel(item);
  };

  const lift = (key: string, mode: ActiveState["mode"]) => {
    const origin = indexOfKey(items, key);
    setOrder(items);
    setActive({ key, origin, mode });
    if (mode === "keyboard") {
      setAnnouncement(
        `Picked up ${labelOf(key)}. Position ${origin + 1} of ${items.length}. Use the up and down arrow keys to move, Space to drop, Escape to cancel.`
      );
    }
  };

  const drop = () => {
    if (!active || !order) return;
    const to = indexOfKey(order, active.key);
    const name = labelOf(active.key);
    if (to !== active.origin) onReorder(order, { from: active.origin, to });
    setAnnouncement(`Dropped ${name} at position ${to + 1} of ${order.length}.`);
    setOrder(null);
    setActive(null);
    setPointer(null);
  };

  const cancel = () => {
    if (!active) return;
    setAnnouncement(`Reorder canceled. ${labelOf(active.key)} returned to position ${active.origin + 1} of ${items.length}.`);
    setOrder(null);
    setActive(null);
    setPointer(null);
  };

  const moveActive = (delta: number) => {
    if (!active || !order) return;
    const from = indexOfKey(order, active.key);
    const to = from + delta;
    if (to < 0 || to >= order.length) return;
    setOrder(reorderArray(order, from, to));
    setAnnouncement(`Moved ${labelOf(active.key)} to position ${to + 1} of ${order.length}.`);
  };

  const moveByButton = (key: string, delta: number) => {
    const from = indexOfKey(items, key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    onReorder(reorderArray(items, from, to), { from, to });
    setAnnouncement(`Moved ${getLabel(items[from]!)} to position ${to + 1} of ${items.length}.`);
  };

  const onHandleKeyDown = (key: string) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const lifted = active?.key === key && active.mode === "keyboard";
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (lifted) drop();
      else if (!active) lift(key, "keyboard");
    } else if (lifted && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      moveActive(event.key === "ArrowUp" ? -1 : 1);
    } else if (lifted && event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  const onHandleBlur = (key: string) => () => {
    if (active?.key !== key || active.mode !== "keyboard") return;
    setTimeout(() => {
      if (document.activeElement !== handles.current.get(key)) drop();
    }, 0);
  };

  const onPointerDown = (key: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button !== 0 || active) return;
    const row = rows.current.get(key);
    if (!row) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = row.getBoundingClientRect();
    lift(key, "pointer");
    setPointer({ y: event.clientY, offsetY: event.clientY - rect.top, left: rect.left, width: rect.width, height: rect.height });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!active || active.mode !== "pointer" || !order || !pointer) return;
    const y = event.clientY;
    setPointer({ ...pointer, y });
    let target = 0;
    for (const item of order) {
      const k = getKey(item);
      if (k === active.key) continue;
      const r = rows.current.get(k)?.getBoundingClientRect();
      if (r && r.top + r.height / 2 < y) target++;
    }
    const from = indexOfKey(order, active.key);
    if (target !== from) setOrder(reorderArray(order, from, target));
  };

  const activeItem = active ? working.find((i) => getKey(i) === active.key) : undefined;

  return (
    <>
      <ul
        ref={ref}
        aria-label={label}
        className={cn("relative flex flex-col gap-1", className)}
        {...props}
      >
        {working.map((item, index) => {
          const key = getKey(item);
          const isActive = active?.key === key;
          const name = getLabel(item);
          const placeholder = isActive && active.mode === "pointer";
          return (
            <li
              key={key}
              ref={(el) => {
                if (el) rows.current.set(key, el);
                else rows.current.delete(key);
              }}
              data-active={isActive || undefined}
              className={cn(
                "group/row flex items-center gap-1.5 rounded-control bg-background transition-shadow",
                isActive && active.mode === "keyboard" && "relative z-10 shadow-lg ring-2 ring-ring",
                placeholder && "border border-dashed border-border-strong bg-muted [&>*]:invisible",
                itemClassName
              )}
            >
              {handle ? (
                <button
                  type="button"
                  ref={(el) => {
                    if (el) handles.current.set(key, el);
                    else handles.current.delete(key);
                  }}
                  disabled={disabled}
                  aria-label={`Reorder ${name}`}
                  aria-describedby={instructionsId}
                  aria-pressed={isActive && active.mode === "keyboard"}
                  onKeyDown={onHandleKeyDown(key)}
                  onBlur={onHandleBlur(key)}
                  onPointerDown={onPointerDown(key)}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => active?.mode === "pointer" && drop()}
                  onPointerCancel={() => active?.mode === "pointer" && cancel()}
                  className={cn(
                    "flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50",
                    focusRing
                  )}
                >
                  <RiDraggable aria-hidden className="size-4" />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">{renderItem(item, { index, active: isActive })}</div>
              {moveButtons ? (
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Move ${name} up`}
                    disabled={disabled || index === 0 || !!active}
                    onClick={() => moveByButton(key, -1)}
                  >
                    <RiArrowUpSLine aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Move ${name} down`}
                    disabled={disabled || index === total - 1 || !!active}
                    onClick={() => moveByButton(key, 1)}
                  >
                    <RiArrowDownSLine aria-hidden />
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {active?.mode === "pointer" && pointer && activeItem !== undefined ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-control border border-border bg-background shadow-xl ring-1 ring-ring/30"
          style={{ top: pointer.y - pointer.offsetY, left: pointer.left, width: pointer.width, minHeight: pointer.height }}
        >
          {handle ? (
            <span className="flex h-8 w-6 shrink-0 items-center justify-center text-muted-foreground">
              <RiDraggable aria-hidden className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">{renderItem(activeItem, { index: indexOfKey(working, active.key), active: true })}</div>
        </div>
      ) : null}
      <span id={instructionsId} className="sr-only">
        Press Space to pick up. Use the up and down arrow keys to move, Space to drop, Escape to cancel.
      </span>
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
ReorderableList.displayName = "ReorderableList";

/* ------------------------------------------------------------------ */
/* Checklist                                                           */
/* ------------------------------------------------------------------ */

export interface ChecklistEntry {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  items?: ChecklistEntry[];
  defaultItems?: ChecklistEntry[];
  onItemsChange?: (items: ChecklistEntry[]) => void;
  /** Heading shown with the progress count. */
  label?: string;
  addPlaceholder?: string;
  hideCompleted?: boolean;
  defaultHideCompleted?: boolean;
  onHideCompletedChange?: (hide: boolean) => void;
  /** Allow adding, editing and deleting items. Default true. */
  editable?: boolean;
  /** Allow reordering. Default true. */
  reorderable?: boolean;
  /** Show up / down buttons in addition to the drag handle. */
  moveButtons?: boolean;
  createId?: () => string;
}

let checklistSeq = 0;
const defaultCreateId = () => `item-${Date.now().toString(36)}-${(checklistSeq++).toString(36)}`;

/** Subtask checklist with add / edit / delete / reorder, an "n/m" count with a thin progress bar and a hide-completed toggle. */
export const Checklist = React.forwardRef<HTMLDivElement, ChecklistProps>(
  (
    {
      items: itemsProp,
      defaultItems = [],
      onItemsChange,
      label = "Checklist",
      addPlaceholder = "Add an item",
      hideCompleted: hideProp,
      defaultHideCompleted = false,
      onHideCompletedChange,
      editable = true,
      reorderable = true,
      moveButtons,
      createId = defaultCreateId,
      className,
      ...props
    },
    ref
  ) => {
    const [items, setItems] = useControllableState({ value: itemsProp, defaultValue: defaultItems, onChange: onItemsChange });
    const [hide, setHide] = useControllableState({ value: hideProp, defaultValue: defaultHideCompleted, onChange: onHideCompletedChange });
    const [draft, setDraft] = React.useState("");
    const [editing, setEditing] = React.useState<{ id: string; text: string } | null>(null);
    const labelId = React.useId();

    const done = items.filter((i) => i.done).length;
    const visible = hide ? items.filter((i) => !i.done) : items;

    const update = (id: string, patch: Partial<ChecklistEntry>) => setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const remove = (id: string) => setItems(items.filter((i) => i.id !== id));
    const add = () => {
      const text = draft.trim();
      if (!text) return;
      setItems([...items, { id: createId(), text, done: false }]);
      setDraft("");
    };
    const saveEdit = () => {
      if (!editing) return;
      const text = editing.text.trim();
      if (text) update(editing.id, { text });
      else remove(editing.id);
      setEditing(null);
    };
    const onReorder = (next: ChecklistEntry[]) => {
      if (!hide) return setItems(next);
      const slots = items.map((i, idx) => (i.done ? -1 : idx)).filter((idx) => idx >= 0);
      const merged = items.slice();
      slots.forEach((slot, k) => {
        merged[slot] = next[k]!;
      });
      setItems(merged);
    };

    const renderRow = (item: ChecklistEntry) =>
      editing?.id === item.id ? (
        <input
          autoFocus
          aria-label={`Edit ${item.text}`}
          value={editing.text}
          onChange={(e) => setEditing({ id: item.id, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(null);
            }
          }}
          onBlur={saveEdit}
          className={cn("h-8 w-full rounded-control border border-input bg-background px-2 text-sm shadow-xs", focusRing)}
        />
      ) : (
        <div className="flex min-h-8 items-center gap-2">
          <Checkbox
            size="sm"
            checked={item.done}
            onCheckedChange={(v) => update(item.id, { done: v === true })}
            aria-label={item.text}
          />
          {editable ? (
            <button
              type="button"
              onClick={() => setEditing({ id: item.id, text: item.text })}
              aria-label={`Edit ${item.text}`}
              className={cn(
                "min-w-0 flex-1 truncate rounded-xs text-left text-sm",
                item.done ? "text-muted-foreground line-through" : "text-foreground",
                focusRing
              )}
            >
              {item.text}
            </button>
          ) : (
            <span className={cn("min-w-0 flex-1 truncate text-sm", item.done && "text-muted-foreground line-through")}>{item.text}</span>
          )}
          {editable ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete ${item.text}`}
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
            >
              <RiDeleteBinLine aria-hidden />
            </Button>
          ) : null}
        </div>
      );

    return (
      <div ref={ref} role="group" aria-labelledby={labelId} className={cn("flex flex-col gap-2", className)} {...props}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span id={labelId} className="text-sm font-medium text-foreground">
              {label}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums" data-checklist-count>
              {done}/{items.length}
            </span>
          </div>
          {done > 0 ? (
            <Button
              variant="ghost"
              size="xs"
              aria-pressed={hide}
              leadingIcon={hide ? <RiEyeLine aria-hidden /> : <RiEyeOffLine aria-hidden />}
              onClick={() => setHide(!hide)}
            >
              {hide ? `Show completed (${done})` : "Hide completed"}
            </Button>
          ) : null}
        </div>
        <Progress
          size="xs"
          value={items.length ? (done / items.length) * 100 : 0}
          color={items.length > 0 && done === items.length ? "success" : "primary"}
          aria-label={`${done} of ${items.length} done`}
        />
        {visible.length > 0 ? (
          reorderable ? (
            <ReorderableList
              items={visible}
              getKey={(i) => i.id}
              getLabel={(i) => i.text}
              onReorder={onReorder}
              moveButtons={moveButtons}
              label={label}
              renderItem={renderRow}
              itemClassName="pr-1"
            />
          ) : (
            <ul aria-label={label} className="flex flex-col gap-1">
              {visible.map((i) => (
                <li key={i.id} className="group/row px-1">
                  {renderRow(i)}
                </li>
              ))}
            </ul>
          )
        ) : hide && items.length > 0 ? (
          <p className="py-2 text-sm text-muted-foreground">All done.</p>
        ) : null}
        {editable ? (
          <div className="flex items-center gap-2 pl-1.5">
            <RiAddLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
              aria-label={addPlaceholder}
              placeholder={addPlaceholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className={cn(
                "h-8 flex-1 rounded-control bg-transparent px-1 text-sm placeholder:text-muted-foreground",
                focusRing
              )}
            />
          </div>
        ) : null}
      </div>
    );
  }
);
Checklist.displayName = "Checklist";
