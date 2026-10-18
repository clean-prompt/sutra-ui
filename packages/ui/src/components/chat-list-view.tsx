import * as React from "react";
import { RiDeleteBinLine, RiPencilLine, RiPushpinFill, RiSearchLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { calendarDayDiff, toMs } from "../lib/time";
import { useControllableState } from "../hooks/use-controllable-state";

export interface ChatListItemData {
  id: string;
  title: string;
  updatedAt: Date | string | number;
  pinned?: boolean;
}

export type ChatListGroupKey = "pinned" | "today" | "yesterday" | "previous7" | "previous30" | "older";

const groupLabels: Record<ChatListGroupKey, string> = {
  pinned: "Pinned",
  today: "Today",
  yesterday: "Yesterday",
  previous7: "Previous 7 days",
  previous30: "Previous 30 days",
  older: "Older",
};

const groupOrder: ChatListGroupKey[] = ["pinned", "today", "yesterday", "previous7", "previous30", "older"];

function toTime(value: Date | string | number) {
  return toMs(value) ?? 0;
}

function bucketOf(time: number, now: Date): Exclude<ChatListGroupKey, "pinned"> {
  // Calendar days, so DST changes don't shift the boundaries.
  const days = calendarDayDiff(now, time) ?? 0;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 7) return "previous7";
  if (days <= 30) return "previous30";
  return "older";
}

/** Group conversations into Pinned / Today / Yesterday / Previous 7 days / Previous 30 days / Older. */
export function groupChatsByDate(items: ChatListItemData[], now: Date = new Date()) {
  const groups = new Map<ChatListGroupKey, ChatListItemData[]>();
  const sorted = [...items].sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
  for (const item of sorted) {
    const key = item.pinned ? "pinned" : bucketOf(toTime(item.updatedAt), now);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return groupOrder
    .filter((key) => groups.has(key))
    .map((key) => ({ key, label: groupLabels[key], items: groups.get(key)! }));
}

export interface ChatListItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title" | "onSelect"> {
  title: string;
  active?: boolean;
  pinned?: boolean;
  onSelect?: () => void;
  /** Enables the rename action; called with the trimmed new title. */
  onRename?: (title: string) => void;
  /** Enables the delete action. */
  onDelete?: () => void;
  /** Extra hover actions rendered before rename/delete. */
  actions?: React.ReactNode;
}

const actionButton = cn(
  "inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground [&_svg]:size-3.5",
  focusRing
);

/** One conversation row with hover rename / delete actions and inline renaming. */
export const ChatListItem = React.forwardRef<HTMLLIElement, ChatListItemProps>(
  ({ title, active, pinned, onSelect, onRename, onDelete, actions, className, ...props }, ref) => {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(title);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const cancelled = React.useRef(false);

    React.useEffect(() => {
      if (editing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [editing]);

    const startEditing = () => {
      cancelled.current = false;
      setDraft(title);
      setEditing(true);
    };
    const commit = () => {
      if (cancelled.current) return;
      cancelled.current = true;
      const next = draft.trim();
      setEditing(false);
      if (next && next !== title) onRename?.(next);
    };

    const hasActions = !!(onRename || onDelete || actions);

    return (
      <li ref={ref} className={cn("group/item relative list-none", className)} {...props}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            aria-label="Conversation title"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelled.current = true;
                setEditing(false);
              }
            }}
            className="h-8 w-full rounded-control border border-ring bg-background px-2.5 text-sm text-foreground shadow-xs outline-none ring-[3px] ring-ring/20"
          />
        ) : (
          <>
            <button
              type="button"
              onClick={onSelect}
              onDoubleClick={onRename ? startEditing : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-control px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent font-medium text-foreground",
                hasActions && "group-hover/item:pr-16 group-focus-within/item:pr-16",
                focusRing
              )}
            >
              {pinned && <RiPushpinFill aria-hidden className="size-3 shrink-0 text-muted-foreground" />}
              <span className="truncate">{title}</span>
            </button>
            {hasActions && (
              <div
                className={cn(
                  "absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 transition-opacity",
                  "group-focus-within/item:opacity-100 group-hover/item:opacity-100 [@media(hover:none)]:opacity-100"
                )}
              >
                {actions}
                {onRename && (
                  <button type="button" className={actionButton} aria-label={`Rename ${title}`} title="Rename" onClick={startEditing}>
                    <RiPencilLine aria-hidden />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className={cn(actionButton, "hover:bg-destructive-soft hover:text-destructive-soft-foreground")}
                    aria-label={`Delete ${title}`}
                    title="Delete"
                    onClick={onDelete}
                  >
                    <RiDeleteBinLine aria-hidden />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </li>
    );
  }
);
ChatListItem.displayName = "ChatListItem";

export interface ChatListViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: ChatListItemData[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
  /** Show the search field (default true). */
  searchable?: boolean;
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  /** Shown when there are no items (or no search matches). */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyMessage?: React.ReactNode;
  /** Reference "now" for date grouping (useful for tests and SSR). */
  now?: Date;
}

/** Sidebar list of conversations grouped by recency, with search and inline rename / delete. */
export const ChatListView = React.forwardRef<HTMLDivElement, ChatListViewProps>(
  (
    {
      items,
      activeId,
      onSelect,
      onRename,
      onDelete,
      searchable = true,
      search,
      defaultSearch = "",
      onSearchChange,
      searchPlaceholder = "Search chats…",
      emptyState,
      emptyMessage,
      now,
      className,
      ...props
    },
    ref
  ) => {
    const [query, setQuery] = useControllableState<string>({
      value: search,
      defaultValue: defaultSearch,
      onChange: onSearchChange,
    });
    const groupId = React.useId();

    const groups = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      const filtered = q ? items.filter((item) => item.title.toLowerCase().includes(q)) : items;
      return groupChatsByDate(filtered, now);
    }, [items, query, now]);

    return (
      <div ref={ref} className={cn("flex min-h-0 flex-col gap-2", className)} {...props}>
        {searchable && (
          <div className="relative px-2">
            <RiSearchLine aria-hidden className="pointer-events-none absolute left-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search conversations"
              className={cn(
                "h-8 w-full rounded-control border border-input bg-background pl-8 pr-2.5 text-sm shadow-xs placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
                focusRing
              )}
            />
          </div>
        )}
        <nav aria-label="Conversations" className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2">
          {groups.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
              {emptyState ?? emptyMessage ?? (query.trim() ? "No matching chats" : "No conversations yet")}
            </p>
          ) : (
            groups.map((group) => {
              const labelId = `${groupId}-${group.key}`;
              return (
                <section key={group.key} aria-labelledby={labelId} className="flex flex-col gap-0.5">
                  <h3 id={labelId} className="px-2.5 pb-1 pt-1 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </h3>
                  <ul className="flex flex-col gap-px">
                    {group.items.map((item) => (
                      <ChatListItem
                        key={item.id}
                        title={item.title}
                        active={item.id === activeId}
                        onSelect={onSelect ? () => onSelect(item.id) : undefined}
                        onRename={onRename ? (title) => onRename(item.id, title) : undefined}
                        onDelete={onDelete ? () => onDelete(item.id) : undefined}
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </nav>
      </div>
    );
  }
);
ChatListView.displayName = "ChatListView";
