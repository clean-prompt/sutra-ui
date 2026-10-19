import * as React from "react";
import { ConversationList } from "./conversation-list";

/* ------------------------------------------------------------------ */
/* ConversationSidebarList                                             */
/* ------------------------------------------------------------------ */

/** @deprecated Use `ConversationListItem` from `conversation-list`. */
export interface SidebarConversation {
  id: string;
  title: string;
  pinned?: boolean;
  folderId?: string | null;
  archived?: boolean;
}

/** @deprecated Use `ConversationFolder` from `conversation-list`. */
export interface SidebarFolder {
  id: string;
  name: string;
}

export interface ConversationSidebarListProps extends Omit<React.HTMLAttributes<HTMLElement>, "onSelect"> {
  /** Conversations to list, each with an id, title and optional folder, pinned and archived flags. */
  conversations: SidebarConversation[];
  /** Folders that conversations can be grouped into and moved to. */
  folders?: SidebarFolder[];
  /** Id of the open conversation; its row is highlighted. */
  activeId?: string;
  /** Called with the conversation id when a row is pressed. */
  onSelect?: (id: string) => void;
  /** Called with the conversation id and the trimmed new title when the user renames one. */
  onRename?: (id: string, title: string) => void;
  /** Called with the conversation id and the new pinned state. */
  onPin?: (id: string, pinned: boolean) => void;
  /** Called with the conversation id and the target folder id, or `null` to remove it from its folder. */
  onMove?: (id: string, folderId: string | null) => void;
  /** Called with the conversation id and the new archived state. */
  onArchive?: (id: string, archived: boolean) => void;
  /** Called with the conversation id when the user deletes one. */
  onDelete?: (id: string) => void;
  /** Called with the folder id and the trimmed new name when the user renames a folder. */
  onRenameFolder?: (folderId: string, name: string) => void;
  /** Folder ids expanded initially. Default all. */
  defaultExpandedFolders?: string[];
}

/**
 * Sidebar chat list with pinned, folders (inline rename), archived and a per-row action menu.
 * @deprecated Use `<ConversationList items={conversations} groupBy="folder" rowActions="menu" folders={…} />`.
 */
export const ConversationSidebarList = React.forwardRef<HTMLElement, ConversationSidebarListProps>(
  ({ conversations, ...props }, ref) => (
    <ConversationList
      ref={ref as React.Ref<HTMLDivElement>}
      items={conversations}
      groupBy="folder"
      rowActions="menu"
      {...props}
    />
  )
);
ConversationSidebarList.displayName = "ConversationSidebarList";
