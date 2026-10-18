import * as React from "react";
import { RiArchiveLine, RiArrowRightSLine, RiDeleteBinLine, RiFolderLine, RiFolderOpenLine, RiInboxUnarchiveLine, RiMore2Fill, RiPencilLine, RiPushpinLine, RiUnpinLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./dropdown-menu";

/* ------------------------------------------------------------------ */
/* ConversationSidebarList                                             */
/* ------------------------------------------------------------------ */

export interface SidebarConversation {
  id: string;
  title: string;
  pinned?: boolean;
  folderId?: string | null;
  archived?: boolean;
}

export interface SidebarFolder {
  id: string;
  name: string;
}

export interface ConversationSidebarListProps extends Omit<React.HTMLAttributes<HTMLElement>, "onSelect"> {
  conversations: SidebarConversation[];
  folders?: SidebarFolder[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onMove?: (id: string, folderId: string | null) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onDelete?: (id: string) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
  /** Folder ids expanded initially. Default all. */
  defaultExpandedFolders?: string[];
}

function InlineRename({ value, label, onCommit, onCancel }: { value: string; label: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = React.useState(value);
  const done = React.useRef(false);
  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    const v = text.trim();
    if (commit && v && v !== value) onCommit(v);
    else onCancel();
  };
  return (
    <input
      aria-label={label}
      autoFocus
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      className={cn("h-7 w-full min-w-0 rounded-sm border border-input bg-background px-2 text-sm", focusRing)}
    />
  );
}

/** Sidebar chat list with pinned, folders (inline rename), archived and a per-row action menu. */
export const ConversationSidebarList = React.forwardRef<HTMLElement, ConversationSidebarListProps>(
  (
    {
      conversations,
      folders = [],
      activeId,
      onSelect,
      onRename,
      onPin,
      onMove,
      onArchive,
      onDelete,
      onRenameFolder,
      defaultExpandedFolders,
      className,
      ...props
    },
    ref
  ) => {
    const uid = React.useId();
    const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(defaultExpandedFolders ?? folders.map((f) => f.id)));
    const [archivedOpen, setArchivedOpen] = React.useState(false);
    const [renaming, setRenaming] = React.useState<string | null>(null);
    const [renamingFolder, setRenamingFolder] = React.useState<string | null>(null);
    const renameNext = React.useRef<string | null>(null);

    const live = conversations.filter((c) => !c.archived);
    const pinned = live.filter((c) => c.pinned);
    const loose = live.filter((c) => !c.pinned && !(c.folderId && folders.some((f) => f.id === c.folderId)));
    const archived = conversations.filter((c) => c.archived);

    const toggleFolder = (id: string) =>
      setExpanded((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });

    const row = (c: SidebarConversation) => {
      const active = c.id === activeId;
      return (
        <li key={c.id} data-conversation={c.id} className={cn("group/row relative flex items-center rounded-control", active ? "bg-accent" : "hover:bg-accent/60")}>
          {renaming === c.id ? (
            <div className="flex-1 p-0.5">
              <InlineRename
                value={c.title}
                label="Conversation title"
                onCommit={(v) => {
                  onRename?.(c.id, v);
                  setRenaming(null);
                }}
                onCancel={() => setRenaming(null)}
              />
            </div>
          ) : (
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onSelect?.(c.id)}
              onDoubleClick={() => onRename && setRenaming(c.id)}
              className={cn("min-w-0 flex-1 truncate rounded-control px-2.5 py-1.5 text-left text-sm", active ? "font-medium text-foreground" : "text-foreground/90", focusRing)}
            >
              {c.title}
            </button>
          )}
          {renaming !== c.id ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${c.title}`}
                  className={cn(
                    "mr-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                    active && "opacity-100",
                    focusRing
                  )}
                >
                  <RiMore2Fill className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="right"
                className="w-48"
                onCloseAutoFocus={(e) => {
                  if (renameNext.current === c.id) {
                    e.preventDefault();
                    renameNext.current = null;
                    setRenaming(c.id);
                  }
                }}
              >
                {onRename ? (
                  <DropdownMenuItem icon={<RiPencilLine aria-hidden />} onSelect={() => {
                      renameNext.current = c.id;
                      setTimeout(() => {
                        if (renameNext.current === c.id) {
                          renameNext.current = null;
                          setRenaming(c.id);
                        }
                      }, 0);
                    }}>
                    Rename
                  </DropdownMenuItem>
                ) : null}
                {onPin ? (
                  <DropdownMenuItem icon={c.pinned ? <RiUnpinLine aria-hidden /> : <RiPushpinLine aria-hidden />} onSelect={() => onPin(c.id, !c.pinned)}>
                    {c.pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                ) : null}
                {onMove && folders.length ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger icon={<RiFolderLine aria-hidden />}>Move to</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44">
                      {folders.map((f) => (
                        <DropdownMenuItem key={f.id} icon={<RiFolderLine aria-hidden />} disabled={c.folderId === f.id} onSelect={() => onMove(c.id, f.id)}>
                          {f.name}
                        </DropdownMenuItem>
                      ))}
                      {c.folderId ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => onMove(c.id, null)}>Remove from folder</DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : null}
                {onArchive ? (
                  <DropdownMenuItem icon={c.archived ? <RiInboxUnarchiveLine aria-hidden /> : <RiArchiveLine aria-hidden />} onSelect={() => onArchive(c.id, !c.archived)}>
                    {c.archived ? "Unarchive" : "Archive"}
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" icon={<RiDeleteBinLine aria-hidden />} onSelect={() => onDelete(c.id)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </li>
      );
    };

    const sectionLabel = "px-2.5 pb-1 pt-3 text-2xs font-medium uppercase tracking-wide text-muted-foreground";

    return (
      <nav ref={ref} aria-label="Conversations" className={cn("flex flex-col text-sm", className)} {...props}>
        {pinned.length ? (
          <section aria-labelledby={`${uid}-pinned`}>
            <h3 id={`${uid}-pinned`} className={sectionLabel}>
              Pinned
            </h3>
            <ul className="space-y-0.5">{pinned.map(row)}</ul>
          </section>
        ) : null}
        {folders.length ? (
          <section aria-labelledby={`${uid}-folders`}>
            <h3 id={`${uid}-folders`} className={sectionLabel}>
              Folders
            </h3>
            <ul className="space-y-0.5">
              {folders.map((f) => {
                const items = live.filter((c) => !c.pinned && c.folderId === f.id);
                const isOpen = expanded.has(f.id);
                const contentId = `${uid}-folder-${f.id}`;
                return (
                  <li key={f.id} data-folder={f.id}>
                    <div className="group/folder flex items-center rounded-control hover:bg-accent/60">
                      {renamingFolder === f.id ? (
                        <div className="flex-1 p-0.5">
                          <InlineRename
                            value={f.name}
                            label="Folder name"
                            onCommit={(v) => {
                              onRenameFolder?.(f.id, v);
                              setRenamingFolder(null);
                            }}
                            onCancel={() => setRenamingFolder(null)}
                          />
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={contentId}
                            onClick={() => toggleFolder(f.id)}
                            onDoubleClick={() => onRenameFolder && setRenamingFolder(f.id)}
                            className={cn("flex min-w-0 flex-1 items-center gap-1.5 rounded-control px-2 py-1.5 text-left", focusRing)}
                          >
                            <RiArrowRightSLine aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                            {isOpen ? <RiFolderOpenLine aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : <RiFolderLine aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
                            <span className="truncate font-medium">{f.name}</span>
                            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{items.length}</span>
                          </button>
                          {onRenameFolder ? (
                            <button
                              type="button"
                              aria-label={`Rename folder ${f.name}`}
                              onClick={() => setRenamingFolder(f.id)}
                              className={cn(
                                "mr-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 hover:text-foreground group-hover/folder:opacity-100 focus-visible:opacity-100",
                                focusRing
                              )}
                            >
                              <RiPencilLine className="size-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                    {isOpen ? (
                      <ul id={contentId} className="ml-4 space-y-0.5 border-l border-border pl-1.5">
                        {items.map(row)}
                        {items.length === 0 ? <li className="px-2.5 py-1 text-xs text-muted-foreground">Empty</li> : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {loose.length ? (
          <section aria-labelledby={`${uid}-chats`}>
            <h3 id={`${uid}-chats`} className={sectionLabel}>
              Chats
            </h3>
            <ul className="space-y-0.5">{loose.map(row)}</ul>
          </section>
        ) : null}
        {archived.length ? (
          <section aria-label="Archived" className="mt-2 border-t border-border pt-1">
            <button
              type="button"
              aria-expanded={archivedOpen}
              onClick={() => setArchivedOpen((o) => !o)}
              className={cn("flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/60", focusRing)}
            >
              <RiArrowRightSLine aria-hidden="true" className={cn("size-4 transition-transform", archivedOpen && "rotate-90")} />
              <RiArchiveLine aria-hidden="true" className="size-4" />
              Archived
              <span className="ml-auto tabular-nums">{archived.length}</span>
            </button>
            {archivedOpen ? <ul className="space-y-0.5 opacity-80">{archived.map(row)}</ul> : null}
          </section>
        ) : null}
      </nav>
    );
  }
);
ConversationSidebarList.displayName = "ConversationSidebarList";
