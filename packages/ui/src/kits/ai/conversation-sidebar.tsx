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
