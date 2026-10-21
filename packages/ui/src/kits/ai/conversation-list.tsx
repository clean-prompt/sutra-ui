import * as React from "react";
import {
  RiArchiveLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiFolderLine,
  RiFolderOpenLine,
  RiInboxUnarchiveLine,
  RiMore2Fill,
  RiPencilLine,
  RiPushpinFill,
  RiPushpinLine,
  RiSearchLine,
  RiUnpinLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { calendarDayDiff, toMs } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";
import { InlineEditText } from "../../primitives/inline-edit-text";

/* ------------------------------------------------------------------ */
/* Data + date grouping                                                */
/* ------------------------------------------------------------------ */

export interface ConversationListItem {
  id: string;
  title: string;
  /** Used by `groupBy="date"`. Items without it land in "Older". */
  updatedAt?: Date | string | number;
  pinned?: boolean;
  /** Used by `groupBy="folder"` and the "Move to" menu. */
  folderId?: string | null;
  /** Shown in the collapsed "Archived" section (unless `archivedSection` is false). */
  archived?: boolean;
}

export interface ConversationFolder {
  id: string;
  name: string;
}

export type ConversationDateGroupKey = "pinned" | "today" | "yesterday" | "previous7" | "previous30" | "older";

const dateGroupLabels: Record<ConversationDateGroupKey, string> = {
  pinned: "Pinned",
  today: "Today",
  yesterday: "Yesterday",
  previous7: "Previous 7 days",
  previous30: "Previous 30 days",
  older: "Older",
};

const dateGroupOrder: ConversationDateGroupKey[] = ["pinned", "today", "yesterday", "previous7", "previous30", "older"];

function toTime(value: Date | string | number | undefined) {
  return value == null ? 0 : (toMs(value) ?? 0);
}

function bucketOf(time: number, now: Date): Exclude<ConversationDateGroupKey, "pinned"> {
  // Calendar days, so DST changes don't shift the boundaries.
  const days = calendarDayDiff(now, time) ?? 0;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 7) return "previous7";
  if (days <= 30) return "previous30";
  return "older";
}

/** Group conversations into Pinned / Today / Yesterday / Previous 7 days / Previous 30 days / Older, newest first. */
export function groupConversationsByDate<T extends { updatedAt?: Date | string | number; pinned?: boolean }>(
  items: T[],
  now: Date = new Date()
): Array<{ key: ConversationDateGroupKey; label: string; items: T[] }> {
  const groups = new Map<ConversationDateGroupKey, T[]>();
  const sorted = [...items].sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
  for (const item of sorted) {
    const key = item.pinned ? "pinned" : bucketOf(toTime(item.updatedAt), now);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return dateGroupOrder
    .filter((key) => groups.has(key))
    .map((key) => ({ key, label: dateGroupLabels[key], items: groups.get(key)! }));
}

/* ------------------------------------------------------------------ */
/* ConversationRow                                                     */
/* ------------------------------------------------------------------ */

export type ConversationRowActions = "inline" | "menu";

/** Row surface shared by conversation-style lists (hover / active / selected backgrounds). */
export function conversationRowClass({ active, selected }: { active?: boolean; selected?: boolean } = {}) {
  return cn(
    "group/row relative flex list-none items-center rounded-control transition-colors",
    selected ? "bg-primary-soft" : active ? "bg-accent" : "hover:bg-accent"
  );
}

const actionButton = cn(
  "inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground [&_svg]:size-3.5",
  focusRing
);

export interface ConversationRowProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title" | "onSelect"> {
  /** Conversation title, shown on one line and used as the rename field's value. */
  title: string;
  /** Marks the row as the open conversation (highlight and `aria-current`). */
  active?: boolean;
  /** Shows a pin icon before the title. */
  pinned?: boolean;
  /** Flips the menu's Archive item to Unarchive. */
  archived?: boolean;
  /** Current folder, for the "Move to" submenu. */
  folderId?: string | null;
  /** Targets for the "Move to" submenu. */
  folders?: ConversationFolder[];
  /** `inline`: hover icon buttons for rename / delete. `menu`: one "⋯" menu with every action. Default `inline`. */
  rowActions?: ConversationRowActions;
  /** Called when the row is pressed. */
  onSelect?: () => void;
  /** Enables rename (button or menu item, double-click, inline editor); called with the trimmed new title. */
  onRename?: (title: string) => void;
  /** Called when the user chooses delete (hover button or menu item); the action is hidden when unset. */
  onDelete?: () => void;
  /** Menu only: called with the new pinned state. */
  onPin?: (pinned: boolean) => void;
  /** Menu only: called with the target folder id, or null to remove from its folder. */
  onMove?: (folderId: string | null) => void;
  /** Menu only: called with the new archived state. */
  onArchive?: (archived: boolean) => void;
  /** Extra hover actions rendered before the built-in ones. */
  actions?: React.ReactNode;
  /** Controlled state of the inline rename editor. */
  editing?: boolean;
  /** Initial state of the rename editor when `editing` is not controlled. */
  defaultEditing?: boolean;
  /** Called with the new state when the rename editor opens or closes. */
  onEditingChange?: (editing: boolean) => void;
  /** Accessible name of the rename field. Default "Conversation title". */
  renameLabel?: string;
}

/** One conversation row: select button, inline rename and either hover icon buttons or a "⋯" action menu. */
export const ConversationRow = React.forwardRef<HTMLLIElement, ConversationRowProps>(
  (
    {
      title,
      active,
      pinned,
      archived,
      folderId,
      folders = [],
      rowActions = "inline",
      onSelect,
      onRename,
      onDelete,
      onPin,
      onMove,
      onArchive,
      actions,
      editing: editingProp,
      defaultEditing = false,
      onEditingChange,
      renameLabel = "Conversation title",
      className,
      ...props
    },
    ref
  ) => {
    const [editing, setEditing] = useControllableState<boolean>({
      value: editingProp,
      defaultValue: defaultEditing,
      onChange: onEditingChange,
    });
    const [menuOpen, setMenuOpen] = React.useState(false);
    const renameNext = React.useRef(false);

    const menu = rowActions === "menu";
    const canMove = !!onMove && folders.length > 0;
    const hasMenu = menu && !!(onRename || onPin || canMove || onArchive || onDelete);
    const hasActions = !!actions || hasMenu || (!menu && !!(onRename || onDelete));
    const startEditing = () => setEditing(true);

    return (
      <li ref={ref} data-slot="conversation-row" data-active={active || undefined} className={cn(conversationRowClass({ active }), className)} {...props}>
        {editing ? (
          <div className="flex-1 p-0.5">
            <InlineEditText
              defaultValue={title}
              label={renameLabel}
              onCommit={(next) => {
                setEditing(false);
                onRename?.(next);
              }}
              onCancel={() => setEditing(false)}
              className="h-7 px-2"
            />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onSelect}
              onDoubleClick={onRename ? startEditing : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-control px-2.5 text-start text-sm text-muted-foreground transition-colors hover:text-foreground",
                active && "font-medium text-foreground",
                hasActions && (menu && !actions ? "group-hover/row:pe-9 group-focus-within/row:pe-9 [@media(hover:none)]:pe-9" : "group-hover/row:pe-16 group-focus-within/row:pe-16 [@media(hover:none)]:pe-16"),
                hasActions && (menuOpen || (menu && active)) && (menu && !actions ? "pe-9" : "pe-16"),
                focusRing
              )}
            >
              {pinned && <RiPushpinFill aria-hidden className="size-3 shrink-0 text-muted-foreground" />}
              <span className="truncate">{title}</span>
            </button>
            {hasActions && (
              <div
                className={cn(
                  "absolute inset-y-0 end-1 flex items-center gap-0.5 opacity-0 transition-opacity",
                  "group-focus-within/row:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100",
                  (menuOpen || (menu && active)) && "opacity-100"
                )}
              >
                {actions}
                {!menu && onRename && (
                  <button type="button" className={actionButton} aria-label={`Rename ${title}`} title="Rename" onClick={startEditing}>
                    <RiPencilLine aria-hidden />
                  </button>
                )}
                {!menu && onDelete && (
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
                {hasMenu && (
                  <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label={`Actions for ${title}`} className={actionButton}>
                        <RiMore2Fill aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      side="right"
                      className="w-48"
                      onCloseAutoFocus={(e) => {
                        // Rename swaps the row for an input; keep focus from jumping back to the trigger.
                        if (renameNext.current) {
                          e.preventDefault();
                          renameNext.current = false;
                          setEditing(true);
                        }
                      }}
                    >
                      {onRename ? (
                        <DropdownMenuItem
                          icon={<RiPencilLine aria-hidden />}
                          onSelect={() => {
                            renameNext.current = true;
                            setTimeout(() => {
                              if (renameNext.current) {
                                renameNext.current = false;
                                setEditing(true);
                              }
                            }, 0);
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                      ) : null}
                      {onPin ? (
                        <DropdownMenuItem icon={pinned ? <RiUnpinLine aria-hidden /> : <RiPushpinLine aria-hidden />} onSelect={() => onPin(!pinned)}>
                          {pinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                      ) : null}
                      {canMove ? (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger icon={<RiFolderLine aria-hidden />}>Move to</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-44">
                            {folders.map((f) => (
                              <DropdownMenuItem key={f.id} icon={<RiFolderLine aria-hidden />} disabled={folderId === f.id} onSelect={() => onMove!(f.id)}>
                                {f.name}
                              </DropdownMenuItem>
                            ))}
                            {folderId ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => onMove!(null)}>Remove from folder</DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ) : null}
                      {onArchive ? (
                        <DropdownMenuItem
                          icon={archived ? <RiInboxUnarchiveLine aria-hidden /> : <RiArchiveLine aria-hidden />}
                          onSelect={() => onArchive(!archived)}
                        >
                          {archived ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                      ) : null}
                      {onDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem tone="destructive" icon={<RiDeleteBinLine aria-hidden />} onSelect={onDelete}>
                            Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </>
        )}
      </li>
    );
  }
);
ConversationRow.displayName = "ConversationRow";

/* ------------------------------------------------------------------ */
/* ConversationGroupHeader                                             */
/* ------------------------------------------------------------------ */

export interface ConversationGroupHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group name, shown in the header and used as the rename field's value. */
  name: string;
  /** Number of conversations in the group, shown beside the name. */
  count?: number;
  /** Whether the group is open; sets `aria-expanded` and the chevron direction. */
  expanded: boolean;
  /** Called with the new state when the user presses the header. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Id of the list this header expands (sets `aria-controls` while expanded). */
  controlsId?: string;
  /** Id for the toggle button. */
  triggerId?: string;
  /** Icon after the chevron (e.g. a folder). */
  icon?: React.ReactNode;
  /** Enables double-click rename (and the pencil button); called with the trimmed new name. */
  onRename?: (name: string) => void;
  /** Accessible name of the rename field. Default "Group name". */
  renameLabel?: string;
  /** Show a pencil button on hover. Default true when `onRename` is set. */
  renameButton?: boolean;
  /** Accessible name of the pencil button. Default "Rename {name}". */
  renameButtonLabel?: string;
  /** Controlled state of the inline rename editor. */
  editing?: boolean;
  /** Initial state of the rename editor when `editing` is not controlled. */
  defaultEditing?: boolean;
  /** Called with the new state when the rename editor opens or closes. */
  onEditingChange?: (editing: boolean) => void;
  /** Trailing buttons, hidden while renaming. */
  actions?: React.ReactNode;
  /** Extra classes for the toggle button. */
  triggerClassName?: string;
  /** Extra classes for the rename field. */
  inputClassName?: string;
}

/** Collapsible group / folder header with a count, inline rename and trailing actions. */
export const ConversationGroupHeader = React.forwardRef<HTMLDivElement, ConversationGroupHeaderProps>(
  (
    {
      name,
      count,
      expanded,
      onExpandedChange,
      controlsId,
      triggerId,
      icon,
      onRename,
      renameLabel = "Group name",
      renameButton,
      renameButtonLabel,
      editing: editingProp,
      defaultEditing = false,
      onEditingChange,
      actions,
      triggerClassName,
      inputClassName,
      className,
      ...props
    },
    ref
  ) => {
    const [editing, setEditing] = useControllableState<boolean>({
      value: editingProp,
      defaultValue: defaultEditing,
      onChange: onEditingChange,
    });
    const showRenameButton = renameButton ?? !!onRename;
    return (
      <div ref={ref} data-slot="conversation-group-header" className={cn("group/folder flex items-center gap-0.5 rounded-control", className)} {...props}>
        {editing ? (
          <div className="flex-1 p-0.5">
            <InlineEditText
              defaultValue={name}
              label={renameLabel}
              onCommit={(next) => {
                setEditing(false);
                onRename?.(next);
              }}
              onCancel={() => setEditing(false)}
              className={cn("h-7 px-2", inputClassName)}
            />
          </div>
        ) : (
          <>
            <button
              type="button"
              id={triggerId}
              aria-expanded={expanded}
              aria-controls={expanded ? controlsId : undefined}
              onClick={() => onExpandedChange?.(!expanded)}
              onDoubleClick={onRename ? () => setEditing(true) : undefined}
              className={cn("flex min-w-0 flex-1 items-center gap-1.5 rounded-control px-2 py-1.5 text-start text-sm", focusRing, triggerClassName)}
            >
              <RiArrowRightSLine
                aria-hidden
                className={cn("size-4 shrink-0 text-muted-foreground chevron-turn rtl:-scale-x-100", expanded && "rotate-90 rtl:-rotate-90")}
              />
              {icon}
              <span className="truncate font-medium">{name}</span>
              {count != null && <span className="ms-auto text-xs tabular-nums text-muted-foreground">{count}</span>}
            </button>
            {onRename && showRenameButton ? (
              <button
                type="button"
                aria-label={renameButtonLabel ?? `Rename ${name}`}
                onClick={() => setEditing(true)}
                className={cn(
                  actionButton,
                  "opacity-0 group-hover/folder:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                )}
              >
                <RiPencilLine aria-hidden />
              </button>
            ) : null}
            {actions}
          </>
        )}
      </div>
    );
  }
);
ConversationGroupHeader.displayName = "ConversationGroupHeader";

/* ------------------------------------------------------------------ */
/* ConversationList                                                    */
/* ------------------------------------------------------------------ */

export type ConversationGroupBy = "date" | "folder" | "none";

export interface ConversationListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Conversations to list, each with an id, title, date and optional folder, pinned and archived flags. */
  items: ConversationListItem[];
  /** Folders for `groupBy="folder"` and the "Move to" menu. */
  folders?: ConversationFolder[];
  /** `date`: Pinned / Today / … / Older. `folder`: Pinned / Folders / Chats. `none`: one flat list. Default `date`. */
  groupBy?: ConversationGroupBy;
  /** Show the search field. Default false. */
  searchable?: boolean;
  /** Controlled search text. */
  search?: string;
  /** Initial search text when `search` is not controlled. */
  defaultSearch?: string;
  /** Called with the search text on every change. */
  onSearchChange?: (query: string) => void;
  /** Placeholder of the search field. Default "Search chats…". */
  searchPlaceholder?: string;
  /** `inline`: hover rename / delete buttons. `menu`: a "⋯" menu with rename, pin, move, archive and delete. Default `inline`. */
  rowActions?: ConversationRowActions;
  /** Id of the open conversation; its row is highlighted. */
  activeId?: string;
  /** Called with the conversation id when a row is pressed. */
  onSelect?: (id: string) => void;
  /** Called with the conversation id and the trimmed new title when the user renames one. */
  onRename?: (id: string, title: string) => void;
  /** Called with the conversation id when the user deletes one. */
  onDelete?: (id: string) => void;
  /** Called with the conversation id and the new pinned state (menu rows only). */
  onPin?: (id: string, pinned: boolean) => void;
  /**
   * Called with the conversation id and the target folder id, or `null` to remove it from its folder (menu rows
   * only).
   */
  onMove?: (id: string, folderId: string | null) => void;
  /** Called with the conversation id and the new archived state (menu rows only). */
  onArchive?: (id: string, archived: boolean) => void;
  /** Called with the folder id and the trimmed new name when the user renames a folder group. */
  onRenameFolder?: (folderId: string, name: string) => void;
  /** Folder ids expanded initially. Default all. */
  defaultExpandedFolders?: string[];
  /** Collect archived items in a collapsed "Archived" section at the end. Default true. */
  archivedSection?: boolean;
  /** Shown when there is nothing to list (or no search matches). */
  emptyState?: React.ReactNode;
  /** Reference "now" for date grouping (useful for tests and SSR). */
  now?: Date;
  /** Name of the navigation landmark. Default "Conversations"; give each list on a page its own name. */
  "aria-label"?: string;
}

const sectionHeading = "px-2.5 pb-1 pt-1 text-xs font-medium text-muted-foreground";

/** Conversation sidebar: optional search, grouping by date or folder, archived section and inline or menu row actions. */
export const ConversationList = React.forwardRef<HTMLDivElement, ConversationListProps>(
  (
    {
      items,
      folders = [],
      groupBy = "date",
      searchable = false,
      search,
      defaultSearch = "",
      onSearchChange,
      searchPlaceholder = "Search chats…",
      rowActions = "inline",
      activeId,
      onSelect,
      onRename,
      onDelete,
      onPin,
      onMove,
      onArchive,
      onRenameFolder,
      defaultExpandedFolders,
      archivedSection = true,
      emptyState,
      now,
      "aria-label": ariaLabel = "Conversations",
      "aria-labelledby": ariaLabelledby,
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
    const uid = React.useId();
    const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(defaultExpandedFolders ?? folders.map((f) => f.id)));
    const [archivedOpen, setArchivedOpen] = React.useState(false);

    const q = query.trim().toLowerCase();
    const matching = q ? items.filter((item) => item.title.toLowerCase().includes(q)) : items;
    const live = archivedSection ? matching.filter((c) => !c.archived) : matching;
    const archived = archivedSection ? matching.filter((c) => c.archived) : [];

    const dateGroups = React.useMemo(
      () => (groupBy === "date" ? groupConversationsByDate(live, now) : []),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [groupBy, items, q, archivedSection, now]
    );

    const row = (c: ConversationListItem, showPin = false) => (
      <ConversationRow
        key={c.id}
        data-conversation={c.id}
        title={c.title}
        active={c.id === activeId}
        pinned={showPin && c.pinned}
        archived={c.archived}
        folderId={c.folderId}
        folders={folders}
        rowActions={rowActions}
        onSelect={onSelect ? () => onSelect(c.id) : undefined}
        onRename={onRename ? (title) => onRename(c.id, title) : undefined}
        onDelete={onDelete ? () => onDelete(c.id) : undefined}
        onPin={onPin ? (pinned) => onPin(c.id, pinned) : undefined}
        onMove={onMove ? (folderId) => onMove(c.id, folderId) : undefined}
        onArchive={onArchive ? (next) => onArchive(c.id, next) : undefined}
      />
    );

    const section = (key: string, label: React.ReactNode, children: React.ReactNode) => {
      const labelId = `${uid}-${key}`;
      return (
        <section key={key} aria-labelledby={labelId} className="flex flex-col gap-0.5">
          <h3 id={labelId} className={sectionHeading}>
            {label}
          </h3>
          {children}
        </section>
      );
    };

    const list = (children: React.ReactNode, className?: string) => <ul className={cn("flex flex-col gap-px", className)}>{children}</ul>;

    const toggleFolder = (id: string, open: boolean) =>
      setExpanded((s) => {
        const n = new Set(s);
        if (open) n.add(id);
        else n.delete(id);
        return n;
      });

    let body: React.ReactNode;
    if (groupBy === "date") {
      body = dateGroups.map((group) => section(group.key, group.label, list(group.items.map((c) => row(c)))));
    } else if (groupBy === "none") {
      body = live.length ? list(live.map((c) => row(c, true))) : null;
    } else {
      const folderIds = new Set(folders.map((f) => f.id));
      const pinned = live.filter((c) => c.pinned);
      const loose = live.filter((c) => !c.pinned && !(c.folderId && folderIds.has(c.folderId)));
      const visibleFolders = folders
        .map((f) => ({ folder: f, items: live.filter((c) => !c.pinned && c.folderId === f.id) }))
        .filter(({ items }) => !q || items.length > 0);
      body = (
        <>
          {pinned.length ? section("pinned", "Pinned", list(pinned.map((c) => row(c)))) : null}
          {visibleFolders.length
            ? section(
                "folders",
                "Folders",
                list(
                  visibleFolders.map(({ folder: f, items: folderItems }) => {
                    const isOpen = !!q || expanded.has(f.id);
                    const contentId = `${uid}-folder-${f.id}`;
                    return (
                      <li key={f.id} data-folder={f.id}>
                        <ConversationGroupHeader
                          name={f.name}
                          count={folderItems.length}
                          expanded={isOpen}
                          onExpandedChange={(open) => toggleFolder(f.id, open)}
                          controlsId={contentId}
                          className="hover:bg-accent/60"
                          icon={
                            isOpen ? (
                              <RiFolderOpenLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <RiFolderLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                            )
                          }
                          onRename={onRenameFolder ? (name) => onRenameFolder(f.id, name) : undefined}
                          renameLabel="Folder name"
                          renameButtonLabel={`Rename folder ${f.name}`}
                        />
                        {isOpen ? (
                          <ul id={contentId} className="ms-4 flex flex-col gap-px border-s border-border ps-1.5">
                            {folderItems.map((c) => row(c))}
                            {folderItems.length === 0 ? <li className="px-2.5 py-1 text-xs text-muted-foreground">Empty</li> : null}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })
                )
              )
            : null}
          {loose.length ? section("chats", "Chats", list(loose.map((c) => row(c)))) : null}
        </>
      );
    }

    const nothing =
      live.length === 0 && archived.length === 0 && !(groupBy === "folder" && !q && folders.length > 0);

    return (
      <div ref={ref} data-slot="conversation-list" className={cn("flex min-h-0 flex-col gap-2 text-sm", className)} {...props}>
        {searchable && (
          <div className="relative px-2">
            <RiSearchLine aria-hidden className="pointer-events-none absolute start-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              data-slot="conversation-list-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search conversations"
              className={cn(
                "h-8 w-full rounded-control border border-input bg-background ps-8 pe-2.5 text-sm shadow-xs placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
                focusRing
              )}
            />
          </div>
        )}
        <nav
          data-slot="conversation-list-nav"
          aria-label={ariaLabelledby ? undefined : ariaLabel}
          aria-labelledby={ariaLabelledby}
          className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2"
        >
          {nothing ? (
            <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
              {emptyState ?? (q ? "No matching chats" : "No conversations yet")}
            </p>
          ) : (
            <>
              {body}
              {archived.length ? (
                <section aria-label="Archived" className="border-t border-border pt-1">
                  <button
                    type="button"
                    aria-expanded={archivedOpen}
                    onClick={() => setArchivedOpen((o) => !o)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/60",
                      focusRing
                    )}
                  >
                    <RiArrowRightSLine aria-hidden className={cn("size-4 chevron-turn rtl:-scale-x-100", archivedOpen && "rotate-90 rtl:-rotate-90")} />
                    <RiArchiveLine aria-hidden className="size-4" />
                    Archived
                    <span className="ms-auto tabular-nums">{archived.length}</span>
                  </button>
                  {archivedOpen ? list(archived.map((c) => row(c)), "mt-0.5 opacity-80") : null}
                </section>
              ) : null}
            </>
          )}
        </nav>
      </div>
    );
  }
);
ConversationList.displayName = "ConversationList";
