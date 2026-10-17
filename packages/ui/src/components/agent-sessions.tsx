import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import {
  RiAddLine,
  RiArchiveLine,
  RiArrowDownSLine,
  RiCheckboxMultipleLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFilter3Line,
  RiFolderAddLine,
  RiFolderTransferLine,
  RiGitBranchLine,
  RiMailUnreadLine,
  RiMore2Line,
  RiSearchLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

/* ------------------------------------------------------------------ */
/* AgentStatusDot                                                      */
/* ------------------------------------------------------------------ */

export type AgentSessionStatus = "running" | "waiting" | "idle" | "unread" | "failed" | "elsewhere";

/** Default accessible labels for each session status. */
export const agentStatusLabels: Record<AgentSessionStatus, string> = {
  running: "Running",
  waiting: "Needs input",
  idle: "Idle",
  unread: "Unread",
  failed: "Failed",
  elsewhere: "Running elsewhere",
};

const dotColor: Record<AgentSessionStatus, string> = {
  running: "bg-success",
  waiting: "bg-warning",
  idle: "bg-muted-foreground/40",
  unread: "bg-primary",
  failed: "bg-destructive",
  elsewhere: "border-[1.5px] border-info bg-transparent",
};

export interface AgentStatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: AgentSessionStatus;
  /** Accessible label override. */
  label?: string;
  size?: "sm" | "md";
  /** Hide from assistive tech when the status is announced elsewhere. */
  decorative?: boolean;
}

/** Session status dot: running (animated), waiting, idle, unread, failed, elsewhere (hollow). */
export const AgentStatusDot = React.forwardRef<HTMLSpanElement, AgentStatusDotProps>(
  ({ status, label, size = "md", decorative, className, ...props }, ref) => {
    const s = size === "sm" ? "size-1.5" : "size-2";
    const animated = status === "running" || status === "waiting";
    return (
      <span
        ref={ref}
        data-status={status}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : (label ?? agentStatusLabels[status])}
        aria-hidden={decorative || undefined}
        title={label ?? agentStatusLabels[status]}
        className={cn("relative inline-flex shrink-0 items-center justify-center", size === "sm" ? "size-2" : "size-2.5", className)}
        {...props}
      >
        {animated && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full opacity-50 motion-reduce:hidden",
              status === "running" ? "bg-success animate-ping" : "bg-warning animate-pulse"
            )}
          />
        )}
        <span aria-hidden className={cn("relative rounded-full", s, dotColor[status])} />
      </span>
    );
  }
);
AgentStatusDot.displayName = "AgentStatusDot";

/* ------------------------------------------------------------------ */
/* AgentSessionList                                                    */
/* ------------------------------------------------------------------ */

type TimeInput = Date | number | string;

/** Compact relative time: "now", "5m", "3h", "2d", "Oct 4". */
export function formatAgentRelativeTime(value: TimeInput | undefined, now: number = Date.now()) {
  if (value == null) return "";
  const t = value instanceof Date ? value.getTime() : typeof value === "number" ? value : new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type AgentSessionFilter = "waiting" | "running" | "unread" | "failed";
export type AgentSessionLocation = "local" | "remote";

const filterLabels: Record<AgentSessionFilter, string> = {
  waiting: "Needs input",
  running: "Working",
  unread: "Unread",
  failed: "Failed",
};

function matchesFilter(status: AgentSessionStatus, f: AgentSessionFilter) {
  if (f === "running") return status === "running" || status === "elsewhere";
  return status === f;
}

export interface AgentSession {
  id: string;
  title: string;
  status: AgentSessionStatus;
  updatedAt?: TimeInput;
  groupId?: string;
  branch?: string;
  repo?: string;
  /** Preformatted cost, e.g. "$0.42". */
  cost?: string;
  /** Extra meta node appended to the meta line. */
  meta?: React.ReactNode;
  /** Default "local". */
  location?: AgentSessionLocation;
}

export interface AgentSessionGroup {
  id: string;
  name: string;
  defaultCollapsed?: boolean;
}

export interface AgentSessionListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onSelect"> {
  sessions: AgentSession[];
  groups?: AgentSessionGroup[];
  /** Heading. Default "Sessions". */
  title?: React.ReactNode;
  activeId?: string | null;
  onActiveChange?: (id: string) => void;
  selectedIds?: string[];
  defaultSelectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  statusFilter?: AgentSessionFilter[];
  defaultStatusFilter?: AgentSessionFilter[];
  onStatusFilterChange?: (filter: AgentSessionFilter[]) => void;
  location?: AgentSessionLocation;
  defaultLocation?: AgentSessionLocation;
  onLocationChange?: (location: AgentSessionLocation) => void;
  /** Show the local / remote switch. Default true. */
  showLocationTabs?: boolean;
  /** Start with selection checkboxes visible. */
  defaultCheckboxMode?: boolean;
  onNewSession?: (groupId?: string) => void;
  onCreateGroup?: () => void;
  onRenameSession?: (id: string, title: string) => void;
  onRenameGroup?: (id: string, name: string) => void;
  onArchive?: (ids: string[]) => void;
  onMarkUnread?: (ids: string[]) => void;
  onMoveToGroup?: (ids: string[], groupId: string | null) => void;
  onDelete?: (ids: string[]) => void;
  /** Reference time for relative timestamps. */
  now?: number;
  emptyText?: React.ReactNode;
}

type Renaming = { kind: "session" | "group"; id: string } | null;

function InlineRename({
  value,
  label,
  onCommit,
  onCancel,
  className,
}: {
  value: string;
  label: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const done = React.useRef(false);
  React.useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const commit = () => {
    if (done.current) return;
    done.current = true;
    const v = ref.current?.value.trim() ?? "";
    if (v && v !== value) onCommit(v);
    else onCancel();
  };
  return (
    <input
      ref={ref}
      defaultValue={value}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          done.current = true;
          onCancel();
        }
      }}
      onBlur={commit}
      className={cn(
        "h-6 min-w-0 flex-1 rounded-xs border border-input bg-background px-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    />
  );
}

/** Sessions sidebar for agent apps: groups, search, status filter, multi-select, bulk actions and keyboard navigation. */
export const AgentSessionList = React.forwardRef<HTMLDivElement, AgentSessionListProps>(
  (
    {
      sessions,
      groups = [],
      title = "Sessions",
      activeId,
      onActiveChange,
      selectedIds: selectedProp,
      defaultSelectedIds = [],
      onSelectedIdsChange,
      query: queryProp,
      defaultQuery = "",
      onQueryChange,
      statusFilter: filterProp,
      defaultStatusFilter = [],
      onStatusFilterChange,
      location: locationProp,
      defaultLocation = "local",
      onLocationChange,
      showLocationTabs = true,
      defaultCheckboxMode = false,
      onNewSession,
      onCreateGroup,
      onRenameSession,
      onRenameGroup,
      onArchive,
      onMarkUnread,
      onMoveToGroup,
      onDelete,
      now: nowProp,
      emptyText = "No sessions match",
      className,
      ...props
    },
    ref
  ) => {
    const [selected, setSelected] = useControllableState<string[]>({
      value: selectedProp,
      defaultValue: defaultSelectedIds,
      onChange: onSelectedIdsChange,
    });
    const [query, setQuery] = useControllableState({ value: queryProp, defaultValue: defaultQuery, onChange: onQueryChange });
    const [filter, setFilter] = useControllableState<AgentSessionFilter[]>({
      value: filterProp,
      defaultValue: defaultStatusFilter,
      onChange: onStatusFilterChange,
    });
    const [location, setLocation] = useControllableState<AgentSessionLocation>({
      value: locationProp,
      defaultValue: defaultLocation,
      onChange: onLocationChange,
    });
    const [searchOpen, setSearchOpen] = React.useState(Boolean(defaultQuery || queryProp));
    const [checkboxMode, setCheckboxMode] = React.useState(defaultCheckboxMode);
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(() =>
      Object.fromEntries(groups.map((g) => [g.id, Boolean(g.defaultCollapsed)]))
    );
    const [renaming, setRenaming] = React.useState<Renaming>(null);
    const [focusId, setFocusId] = React.useState<string | null>(null);
    const anchor = React.useRef<string | null>(null);
    const rowRefs = React.useRef(new Map<string, HTMLButtonElement>());
    const searchRef = React.useRef<HTMLInputElement>(null);
    const titleId = React.useId();
    const now = nowProp ?? Date.now();

    const groupIds = new Set(groups.map((g) => g.id));
    const q = query.trim().toLowerCase();
    const filtering = q.length > 0 || filter.length > 0;
    const visible = sessions.filter((s) => {
      if (showLocationTabs && (s.location ?? "local") !== location) return false;
      if (filter.length && !filter.some((f) => matchesFilter(s.status, f))) return false;
      if (q && ![s.title, s.branch, s.repo].some((v) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
    const ungrouped = visible.filter((s) => !s.groupId || !groupIds.has(s.groupId));
    const byGroup = groups.map((g) => ({ group: g, items: visible.filter((s) => s.groupId === g.id) }));
    const isCollapsed = (id: string) => !filtering && Boolean(collapsed[id]);
    const order = [
      ...ungrouped,
      ...byGroup.flatMap(({ group, items }) => (isCollapsed(group.id) ? [] : items)),
    ].map((s) => s.id);
    const selectedSet = new Set(selected);
    const tabStop = focusId && order.includes(focusId) ? focusId : (activeId && order.includes(activeId) ? activeId : order[0]);

    const focusRow = (id: string | undefined) => {
      if (!id) return;
      setFocusId(id);
      rowRefs.current.get(id)?.focus();
    };

    const toggleSelect = (id: string) => {
      anchor.current = id;
      setSelected(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    };

    const selectRange = (id: string) => {
      const from = anchor.current && order.includes(anchor.current) ? anchor.current : id;
      const a = order.indexOf(from);
      const b = order.indexOf(id);
      const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
      setSelected(Array.from(new Set([...selected, ...range])));
    };

    const onRowClick = (e: React.MouseEvent, id: string) => {
      setFocusId(id);
      if (e.shiftKey) {
        e.preventDefault();
        selectRange(id);
        return;
      }
      if (e.metaKey || e.ctrlKey || checkboxMode) {
        toggleSelect(id);
        return;
      }
      anchor.current = id;
      if (selected.length) setSelected([]);
      onActiveChange?.(id);
    };

    const onRowKeyDown = (e: React.KeyboardEvent, id: string) => {
      const i = order.indexOf(id);
      const mod = e.metaKey || e.ctrlKey;
      switch (e.key) {
        case "ArrowDown":
        case "ArrowUp": {
          e.preventDefault();
          const next = order[Math.min(order.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
          if (e.shiftKey && next) {
            if (!anchor.current) anchor.current = id;
            const a = order.indexOf(anchor.current);
            const b = order.indexOf(next);
            setSelected(order.slice(Math.min(a, b), Math.max(a, b) + 1));
          }
          focusRow(next);
          break;
        }
        case "Home":
          e.preventDefault();
          focusRow(order[0]);
          break;
        case "End":
          e.preventDefault();
          focusRow(order[order.length - 1]);
          break;
        case " ":
          e.preventDefault();
          toggleSelect(id);
          break;
        case "F2":
          if (onRenameSession) {
            e.preventDefault();
            setRenaming({ kind: "session", id });
          }
          break;
        case "Escape":
          if (selected.length) {
            e.preventDefault();
            setSelected([]);
          }
          break;
        case "a":
        case "A":
          if (mod) {
            e.preventDefault();
            setSelected(order);
          }
          break;
      }
    };

    const toggleFilter = (f: AgentSessionFilter, on: boolean) =>
      setFilter(on ? [...filter.filter((x) => x !== f), f] : filter.filter((x) => x !== f));

    const rowMenu = (s: AgentSession) => {
      const ids = selectedSet.has(s.id) && selected.length > 1 ? selected : [s.id];
      return (
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onActiveChange?.(s.id)}>Open</ContextMenuItem>
          {onRenameSession && (
            <ContextMenuItem icon={<RiEditLine />} onSelect={() => setRenaming({ kind: "session", id: s.id })}>
              Rename
            </ContextMenuItem>
          )}
          {onMarkUnread && (
            <ContextMenuItem icon={<RiMailUnreadLine />} onSelect={() => onMarkUnread(ids)}>
              Mark unread
            </ContextMenuItem>
          )}
          {onMoveToGroup && groups.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger icon={<RiFolderTransferLine />}>Move to group</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {groups.map((g) => (
                  <ContextMenuItem key={g.id} disabled={s.groupId === g.id} onSelect={() => onMoveToGroup(ids, g.id)}>
                    {g.name}
                  </ContextMenuItem>
                ))}
                {s.groupId && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => onMoveToGroup(ids, null)}>Remove from group</ContextMenuItem>
                  </>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          {(onArchive || onDelete) && <ContextMenuSeparator />}
          {onArchive && (
            <ContextMenuItem icon={<RiArchiveLine />} onSelect={() => onArchive(ids)}>
              {ids.length > 1 ? `Archive ${ids.length}` : "Archive"}
            </ContextMenuItem>
          )}
          {onDelete && (
            <ContextMenuItem variant="destructive" icon={<RiDeleteBinLine />} onSelect={() => onDelete(ids)}>
              {ids.length > 1 ? `Delete ${ids.length}` : "Delete"}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      );
    };

    const renderRow = (s: AgentSession) => {
      const isSelected = selectedSet.has(s.id);
      const isActive = activeId === s.id;
      const meta = [s.branch, s.repo, s.cost].filter(Boolean) as string[];
      const time = formatAgentRelativeTime(s.updatedAt, now);
      const editing = renaming?.kind === "session" && renaming.id === s.id;
      return (
        <ContextMenu key={s.id}>
          <ContextMenuTrigger asChild>
            <li
              data-session-id={s.id}
              data-selected={isSelected || undefined}
              data-active={isActive || undefined}
              className={cn(
                "group/session relative flex items-center gap-1 rounded-control",
                isSelected ? "bg-primary-soft" : isActive ? "bg-accent" : "hover:bg-accent/70"
              )}
            >
              {checkboxMode && (
                <CheckboxPrimitive.Root
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(s.id)}
                  aria-label={`Select ${s.title}`}
                  className={cn(
                    "ml-2 flex size-4 shrink-0 items-center justify-center rounded-xs border border-border-strong bg-background text-primary-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary",
                    focusRing
                  )}
                >
                  <CheckboxPrimitive.Indicator>
                    <RiCheckLine aria-hidden className="size-3" />
                  </CheckboxPrimitive.Indicator>
                </CheckboxPrimitive.Root>
              )}
              {editing ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
                  <AgentStatusDot status={s.status} decorative />
                  <InlineRename
                    value={s.title}
                    label="Session title"
                    onCommit={(v) => {
                      onRenameSession?.(s.id, v);
                      setRenaming(null);
                      requestAnimationFrame(() => focusRow(s.id));
                    }}
                    onCancel={() => {
                      setRenaming(null);
                      requestAnimationFrame(() => focusRow(s.id));
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  ref={(node) => {
                    if (node) rowRefs.current.set(s.id, node);
                    else rowRefs.current.delete(s.id);
                  }}
                  data-session-row=""
                  tabIndex={tabStop === s.id ? 0 : -1}
                  aria-current={isActive ? "true" : undefined}
                  onClick={(e) => onRowClick(e, s.id)}
                  onDoubleClick={() => onRenameSession && setRenaming({ kind: "session", id: s.id })}
                  onKeyDown={(e) => onRowKeyDown(e, s.id)}
                  onFocus={() => setFocusId(s.id)}
                  className={cn("flex min-w-0 flex-1 items-start gap-2 rounded-control px-2 py-1.5 text-left", focusRing)}
                >
                  <span className="flex h-5 items-center">
                    <AgentStatusDot status={s.status} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          s.status === "unread" ? "font-semibold text-foreground" : "text-foreground"
                        )}
                      >
                        {s.title}
                      </span>
                      {time && <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">{time}</span>}
                    </span>
                    {(meta.length > 0 || s.meta) && (
                      <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                        {s.branch && <RiGitBranchLine aria-hidden className="size-3 shrink-0" />}
                        <span className="truncate">{meta.join(" · ")}</span>
                        {s.meta}
                      </span>
                    )}
                    {isSelected && <span className="sr-only">, selected</span>}
                  </span>
                </button>
              )}
            </li>
          </ContextMenuTrigger>
          {rowMenu(s)}
        </ContextMenu>
      );
    };

    const renderGroup = ({ group, items }: { group: AgentSessionGroup; items: AgentSession[] }) => {
      if (filtering && items.length === 0) return null;
      const closed = isCollapsed(group.id);
      const headerId = `${titleId}-g-${group.id}`;
      const listId = `${titleId}-gl-${group.id}`;
      const editing = renaming?.kind === "group" && renaming.id === group.id;
      return (
        <div key={group.id} role="group" aria-label={group.name} data-group-id={group.id} className="mt-2">
          <div className="group/header flex items-center gap-1 px-1">
            {editing ? (
              <InlineRename
                value={group.name}
                label="Group name"
                className="h-6 text-xs"
                onCommit={(v) => {
                  onRenameGroup?.(group.id, v);
                  setRenaming(null);
                }}
                onCancel={() => setRenaming(null)}
              />
            ) : (
              <button
                type="button"
                id={headerId}
                aria-expanded={!closed}
                aria-controls={listId}
                onClick={() => setCollapsed((c) => ({ ...c, [group.id]: !closed }))}
                onDoubleClick={() => onRenameGroup && setRenaming({ kind: "group", id: group.id })}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-1 rounded-xs px-1 py-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground",
                  focusRing
                )}
              >
                <RiArrowDownSLine
                  aria-hidden
                  className={cn("size-3.5 shrink-0 transition-transform motion-reduce:transition-none", closed && "-rotate-90")}
                />
                <span className="truncate">{group.name}</span>
                <span className="ml-1 tabular-nums text-muted-foreground/80">{items.length}</span>
              </button>
            )}
            {onNewSession && !editing && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Start new session in ${group.name}`}
                title="Start new session in this group"
                onClick={() => onNewSession(group.id)}
              >
                <RiAddLine />
              </Button>
            )}
            {(onRenameGroup || onNewSession) && !editing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label={`${group.name} group actions`}>
                    <RiMore2Line />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRenameGroup && (
                    <DropdownMenuItem icon={<RiEditLine />} onSelect={() => setRenaming({ kind: "group", id: group.id })}>
                      Rename group
                    </DropdownMenuItem>
                  )}
                  {onNewSession && (
                    <DropdownMenuItem icon={<RiAddLine />} onSelect={() => onNewSession(group.id)}>
                      Start new session in this group
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {!closed && (
            <ul id={listId} className="mt-0.5 flex flex-col gap-px">
              {items.length ? items.map(renderRow) : <li className="px-3 py-1.5 text-xs text-muted-foreground">No sessions</li>}
            </ul>
          )}
        </div>
      );
    };

    const remoteCount = sessions.filter((s) => s.location === "remote").length;
    const localCount = sessions.length - remoteCount;
    const empty = visible.length === 0 && (filtering || groups.length === 0);

    return (
      <div ref={ref} className={cn("flex min-h-0 w-full flex-col gap-2 text-sm", className)} {...props}>
        <div className="flex items-center gap-1">
          <h2 id={titleId} className="mr-auto px-1 text-sm font-semibold text-foreground">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Search sessions"
            aria-expanded={searchOpen}
            onClick={() => {
              const next = !searchOpen;
              setSearchOpen(next);
              if (next) requestAnimationFrame(() => searchRef.current?.focus());
              else setQuery("");
            }}
          >
            <RiSearchLine />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={filter.length ? `Filter by status, ${filter.length} selected` : "Filter by status"}
                className={cn("relative", filter.length > 0 && "text-primary")}
              >
                <RiFilter3Line />
                {filter.length > 0 && (
                  <span aria-hidden className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
              {(Object.keys(filterLabels) as AgentSessionFilter[]).map((f) => (
                <DropdownMenuCheckboxItem
                  key={f}
                  checked={filter.includes(f)}
                  onCheckedChange={(on) => toggleFilter(f, on === true)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {filterLabels[f]}
                </DropdownMenuCheckboxItem>
              ))}
              {filter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setFilter([])}>Clear filters</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Select sessions"
            aria-pressed={checkboxMode}
            onClick={() => {
              if (checkboxMode) setSelected([]);
              setCheckboxMode(!checkboxMode);
            }}
            className={cn(checkboxMode && "bg-primary-soft text-primary-soft-foreground")}
          >
            <RiCheckboxMultipleLine />
          </Button>
          {onCreateGroup && (
            <Button variant="ghost" size="icon-xs" aria-label="New group" onClick={onCreateGroup}>
              <RiFolderAddLine />
            </Button>
          )}
          {onNewSession && (
            <Button variant="soft" size="xs" leadingIcon={<RiAddLine />} onClick={() => onNewSession()}>
              New
              <span className="sr-only"> session</span>
            </Button>
          )}
        </div>

        {searchOpen && (
          <div className="relative">
            <RiSearchLine aria-hidden className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  setSearchOpen(false);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  focusRow(order[0]);
                }
              }}
              placeholder="Search sessions"
              aria-label="Search sessions"
              className={cn(
                "h-8 w-full rounded-control border border-input bg-background pl-7 pr-2 text-sm shadow-xs placeholder:text-muted-foreground",
                focusRing
              )}
            />
          </div>
        )}

        {showLocationTabs && (
          <div role="group" aria-label="Session location" className="flex rounded-control bg-muted p-0.5">
            {(["local", "remote"] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                aria-pressed={location === loc}
                onClick={() => setLocation(loc)}
                className={cn(
                  "flex h-6 flex-1 items-center justify-center gap-1 rounded-[calc(var(--radius-control)-2px)] text-xs font-medium text-muted-foreground transition-colors",
                  "aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs",
                  focusRing
                )}
              >
                {loc === "local" ? "Local" : "Remote"}
                <span className="tabular-nums text-muted-foreground">{loc === "local" ? localCount : remoteCount}</span>
              </button>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="flex flex-wrap items-center gap-1 rounded-control border border-border bg-card px-1.5 py-1 shadow-xs"
          >
            <span className="mr-auto px-1 text-xs font-medium tabular-nums text-foreground" aria-live="polite">
              {selected.length} selected
            </span>
            {onArchive && (
              <Button variant="ghost" size="xs" leadingIcon={<RiArchiveLine />} onClick={() => onArchive(selected)}>
                Archive {selected.length}
              </Button>
            )}
            {onMarkUnread && (
              <Button variant="ghost" size="icon-xs" aria-label="Mark unread" onClick={() => onMarkUnread(selected)}>
                <RiMailUnreadLine />
              </Button>
            )}
            {onMoveToGroup && groups.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label="Move to group">
                    <RiFolderTransferLine />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Move to group</DropdownMenuLabel>
                  {groups.map((g) => (
                    <DropdownMenuItem key={g.id} onSelect={() => onMoveToGroup(selected, g.id)}>
                      {g.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onMoveToGroup(selected, null)}>No group</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete ${selected.length}`}
                onClick={() => onDelete(selected)}
                className="hover:text-destructive"
              >
                <RiDeleteBinLine />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" aria-label="Clear selection" onClick={() => setSelected([])}>
              <RiCloseLine />
            </Button>
          </div>
        )}

        <nav aria-labelledby={titleId} className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 scrollbar-thin">
          {empty ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            <>
              {ungrouped.length > 0 && <ul className="flex flex-col gap-px">{ungrouped.map(renderRow)}</ul>}
              {byGroup.map(renderGroup)}
            </>
          )}
        </nav>
      </div>
    );
  }
);
AgentSessionList.displayName = "AgentSessionList";
