import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import {
  RiAddLine,
  RiArchiveLine,
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
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useNow } from "../../hooks/use-now";
import { MINUTE_MS, formatRelative, type FormatRelativeOptions, type TimeInput } from "../../lib/time";
import { type Tone } from "../../lib/tone";
import { Button } from "../../primitives/button";
import { StatusDot, type StatusDotVariant } from "../../primitives/status-badge";
import { InlineEditText } from "../../primitives/inline-edit-text";
import { ConversationGroupHeader, conversationRowClass } from "../ai/conversation-list";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../../primitives/context-menu";

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

/** How each session status maps onto `StatusDot`. */
const statusDotPreset: Record<AgentSessionStatus, { tone: Tone; pulse?: boolean; variant?: StatusDotVariant; className?: string }> = {
  running: { tone: "success", pulse: true },
  // StatusDot only has a ping halo; "waiting" keeps its slower breathing halo locally.
  waiting: { tone: "warning", pulse: true, className: "[&>span:first-child]:motion-safe:animate-pulse" },
  // Softer than the neutral dot so "idle" reads as quieter than "unread".
  idle: { tone: "neutral", className: "*:bg-muted-foreground/40" },
  unread: { tone: "primary" },
  failed: { tone: "destructive" },
  elsewhere: { tone: "info", variant: "hollow" },
};

export interface AgentStatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Session status (`running`, `waiting`, `idle`, `unread`, `failed` or `elsewhere`); sets the dot colour and the
   * default accessible label.
   */
  status: AgentSessionStatus;
  /** Accessible label override. */
  label?: string;
  /** Dot size. */
  size?: "sm" | "md";
  /** Hide from assistive tech when the status is announced elsewhere. */
  decorative?: boolean;
}

/** Session status dot (a `StatusDot` preset): running and waiting pulse, elsewhere is a hollow ring. */
export const AgentStatusDot = React.forwardRef<HTMLSpanElement, AgentStatusDotProps>(
  ({ status, label, size = "md", decorative, className, ...props }, ref) => {
    const preset = statusDotPreset[status] ?? statusDotPreset.idle;
    const text = label ?? agentStatusLabels[status] ?? status;
    return (
      <StatusDot
        ref={ref}
        data-status={status}
        tone={preset.tone}
        pulse={preset.pulse ?? false}
        variant={preset.variant}
        size={size}
        label={decorative ? "" : text}
        title={text}
        className={cn(preset.className, className)}
        {...props}
      />
    );
  }
);
AgentStatusDot.displayName = "AgentStatusDot";

/* ------------------------------------------------------------------ */
/* AgentSessionList                                                    */
/* ------------------------------------------------------------------ */

/** Session row time: "now", "5m", "3h", "2d", "Oct 4". */
const SESSION_TIME: FormatRelativeOptions = { style: "narrow", justNowMs: MINUTE_MS, maxRelativeDays: 6, invalid: "" };

/**
 * Compact relative time: "now", "5m", "3h", "2d", "Oct 4".
 * @deprecated Use `formatRelative(value, { now, style: "narrow", justNowMs: 60_000, maxRelativeDays: 6, invalid: "" })`.
 */
export function formatAgentRelativeTime(value: TimeInput | undefined, now: number = Date.now()) {
  return formatRelative(value, { ...SESSION_TIME, now });
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
  /** Sessions to list, each with title, status, time and optional group. */
  sessions: AgentSession[];
  /** Named groups that sessions can belong to; sessions are listed under their group. */
  groups?: AgentSessionGroup[];
  /** Heading. Default "Sessions". */
  title?: React.ReactNode;
  /** Id of the session that is open; `null` or unset marks none. */
  activeId?: string | null;
  /** Called with the session id when the user opens a session. */
  onActiveChange?: (id: string) => void;
  /** Controlled ids of the checked sessions (checkbox mode). */
  selectedIds?: string[];
  /** Initially checked ids when `selectedIds` is not controlled. */
  defaultSelectedIds?: string[];
  /** Called with the checked ids when the selection changes. */
  onSelectedIdsChange?: (ids: string[]) => void;
  /** Controlled search text. */
  query?: string;
  /** Initial search text when `query` is not controlled. */
  defaultQuery?: string;
  /** Called with the search text on every change. */
  onQueryChange?: (query: string) => void;
  /** Controlled status filters (`waiting`, `running`, `unread`, `failed`); empty shows all sessions. */
  statusFilter?: AgentSessionFilter[];
  /** Initial status filters when `statusFilter` is not controlled. */
  defaultStatusFilter?: AgentSessionFilter[];
  /** Called with the active filters when the user toggles one. */
  onStatusFilterChange?: (filter: AgentSessionFilter[]) => void;
  /** Controlled location tab: `local` or `remote`. */
  location?: AgentSessionLocation;
  /** Initial location tab when `location` is not controlled. */
  defaultLocation?: AgentSessionLocation;
  /** Called with the location when the user switches tab. */
  onLocationChange?: (location: AgentSessionLocation) => void;
  /** Show the local / remote switch. Default true. */
  showLocationTabs?: boolean;
  /** Start with selection checkboxes visible. */
  defaultCheckboxMode?: boolean;
  /**
   * Called when the user starts a new session, with the group id when started from a group; the button is hidden when
   * unset.
   */
  onNewSession?: (groupId?: string) => void;
  /** Called when the user presses New group; the button is hidden when unset. */
  onCreateGroup?: () => void;
  /** Called with the session id and the new title when the user renames a session. */
  onRenameSession?: (id: string, title: string) => void;
  /** Called with the group id and the new name when the user renames a group. */
  onRenameGroup?: (id: string, name: string) => void;
  /** Called with the ids of the chosen sessions when the user archives them. */
  onArchive?: (ids: string[]) => void;
  /** Called with the ids of the chosen sessions when the user marks them unread. */
  onMarkUnread?: (ids: string[]) => void;
  /** Called with the session ids and the target group id (`null` for ungrouped) when the user moves sessions. */
  onMoveToGroup?: (ids: string[], groupId: string | null) => void;
  /** Called with the ids of the chosen sessions after the user confirms deleting them. */
  onDelete?: (ids: string[]) => void;
  /** Reference time for relative timestamps. */
  now?: number;
  /** Shown when there is nothing to list. Default "No sessions match". */
  emptyState?: React.ReactNode;
  /** Content shown when there is nothing to list. @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
}

type Renaming = { kind: "session" | "group"; id: string } | null;

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
      emptyState,
      emptyText,
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
    const now = useNow({ active: nowProp === undefined && sessions.some((s) => s.updatedAt != null), interval: 30_000, fixed: nowProp });

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
          const next = order[clamp(i + (e.key === "ArrowDown" ? 1 : -1), 0, order.length - 1)];
          if (e.shiftKey && next) {
            if (!anchor.current || !order.includes(anchor.current)) anchor.current = id;
            const a = order.indexOf(anchor.current);
            const b = order.indexOf(next);
            setSelected(order.slice(Math.min(a, b), Math.max(a, b) + 1));
          } else if (next) {
            anchor.current = next;
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
            <ContextMenuItem icon={<RiEditLine aria-hidden />} onSelect={() => setRenaming({ kind: "session", id: s.id })}>
              Rename
            </ContextMenuItem>
          )}
          {onMarkUnread && (
            <ContextMenuItem icon={<RiMailUnreadLine aria-hidden />} onSelect={() => onMarkUnread(ids)}>
              Mark unread
            </ContextMenuItem>
          )}
          {onMoveToGroup && groups.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger icon={<RiFolderTransferLine aria-hidden />}>Move to group</ContextMenuSubTrigger>
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
            <ContextMenuItem icon={<RiArchiveLine aria-hidden />} onSelect={() => onArchive(ids)}>
              {ids.length > 1 ? `Archive ${ids.length}` : "Archive"}
            </ContextMenuItem>
          )}
          {onDelete && (
            <ContextMenuItem variant="destructive" icon={<RiDeleteBinLine aria-hidden />} onSelect={() => onDelete(ids)}>
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
      const time = formatRelative(s.updatedAt, { ...SESSION_TIME, now });
      const editing = renaming?.kind === "session" && renaming.id === s.id;
      return (
        <ContextMenu key={s.id}>
          <ContextMenuTrigger asChild>
            <li
              data-session-id={s.id}
              data-selected={isSelected || undefined}
              data-active={isActive || undefined}
              className={cn(conversationRowClass({ active: isActive, selected: isSelected }), "gap-1")}
            >
              {checkboxMode && (
                <CheckboxPrimitive.Root
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(s.id)}
                  aria-label={`Select ${s.title}`}
                  className={cn(
                    "ms-2 flex size-4 shrink-0 items-center justify-center rounded-xs border border-border-strong bg-background text-primary-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary",
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
                  <InlineEditText
                    defaultValue={s.title}
                    label="Session title"
                    className="h-6 flex-1 rounded-xs px-1.5 shadow-none"
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
                  className={cn("flex min-w-0 flex-1 items-start gap-2 rounded-control px-2 py-1.5 text-start", focusRing)}
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
          <ConversationGroupHeader
            name={group.name}
            count={items.length}
            expanded={!closed}
            onExpandedChange={(open) => setCollapsed((c) => ({ ...c, [group.id]: !open }))}
            triggerId={headerId}
            controlsId={listId}
            onRename={onRenameGroup ? (v) => onRenameGroup(group.id, v) : undefined}
            renameLabel="Group name"
            renameButton={false}
            editing={editing}
            onEditingChange={(on) => setRenaming(on ? { kind: "group", id: group.id } : null)}
            className="gap-1 px-1"
            triggerClassName="gap-1 rounded-xs px-1 py-1 text-xs text-muted-foreground hover:text-foreground"
            inputClassName="h-6 text-xs"
            actions={
              <>
                {onNewSession && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Start new session in ${group.name}`}
                    title="Start new session in this group"
                    onClick={() => onNewSession(group.id)}
                  >
                    <RiAddLine aria-hidden />
                  </Button>
                )}
                {(onRenameGroup || onNewSession) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label={`${group.name} group actions`}>
                        <RiMore2Line aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onRenameGroup && (
                        <DropdownMenuItem icon={<RiEditLine aria-hidden />} onSelect={() => setRenaming({ kind: "group", id: group.id })}>
                          Rename group
                        </DropdownMenuItem>
                      )}
                      {onNewSession && (
                        <DropdownMenuItem icon={<RiAddLine aria-hidden />} onSelect={() => onNewSession(group.id)}>
                          Start new session in this group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            }
          />
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
      <div ref={ref} data-slot="agent-session-list" className={cn("flex min-h-0 w-full flex-col gap-2 text-sm", className)} {...props}>
        <div className="flex flex-wrap items-center gap-1">
          <h2 id={titleId} className="me-auto px-1 text-sm font-semibold text-foreground">
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
            <RiSearchLine aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={filter.length ? `Filter by status, ${filter.length} selected` : "Filter by status"}
                className={cn("relative", filter.length > 0 && "text-primary")}
              >
                <RiFilter3Line aria-hidden />
                {filter.length > 0 && (
                  <span aria-hidden className="absolute end-0.5 top-0.5 size-1.5 rounded-full bg-primary" />
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
            <RiCheckboxMultipleLine aria-hidden />
          </Button>
          {onCreateGroup && (
            <Button variant="ghost" size="icon-xs" aria-label="New group" onClick={onCreateGroup}>
              <RiFolderAddLine aria-hidden />
            </Button>
          )}
          {onNewSession && (
            <Button variant="soft" size="xs" leadingIcon={<RiAddLine aria-hidden />} onClick={() => onNewSession()}>
              New
              <span className="sr-only"> session</span>
            </Button>
          )}
        </div>

        {searchOpen && (
          <div className="relative">
            <RiSearchLine aria-hidden className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
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
                "h-8 w-full rounded-control border border-input bg-background ps-7 pe-2 text-sm shadow-xs placeholder:text-muted-foreground",
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
            <span className="me-auto px-1 text-xs font-medium tabular-nums text-foreground" aria-live="polite">
              {selected.length} selected
            </span>
            {onArchive && (
              <Button variant="ghost" size="xs" leadingIcon={<RiArchiveLine aria-hidden />} onClick={() => onArchive(selected)}>
                Archive {selected.length}
              </Button>
            )}
            {onMarkUnread && (
              <Button variant="ghost" size="icon-xs" aria-label="Mark unread" onClick={() => onMarkUnread(selected)}>
                <RiMailUnreadLine aria-hidden />
              </Button>
            )}
            {onMoveToGroup && groups.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label="Move to group">
                    <RiFolderTransferLine aria-hidden />
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
                <RiDeleteBinLine aria-hidden />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" aria-label="Clear selection" onClick={() => setSelected([])}>
              <RiCloseLine aria-hidden />
            </Button>
          </div>
        )}

        <nav aria-labelledby={titleId} className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 scrollbar-thin">
          {empty ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyState ?? emptyText ?? "No sessions match"}</p>
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
