import * as React from "react";
import {
  ConversationList,
  ConversationRow,
  groupConversationsByDate,
  type ConversationDateGroupKey,
} from "./conversation-list";

export interface ChatListItemData {
  id: string;
  title: string;
  updatedAt: Date | string | number;
  pinned?: boolean;
}

/** @deprecated Use `ConversationDateGroupKey` from `conversation-list`. */
export type ChatListGroupKey = ConversationDateGroupKey;

/**
 * Group conversations into Pinned / Today / Yesterday / Previous 7 days / Previous 30 days / Older.
 * @deprecated Use `groupConversationsByDate` (same behaviour, also accepts items without `updatedAt`).
 */
export function groupChatsByDate<T extends ChatListItemData>(items: T[], now: Date = new Date()) {
  return groupConversationsByDate(items, now);
}

export interface ChatListItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title" | "onSelect"> {
  /** Chat title, shown on one line. */
  title: string;
  /** Marks the row as the open chat (highlight and `aria-current`). */
  active?: boolean;
  /** Shows a pin icon before the title. */
  pinned?: boolean;
  /** Called when the row is pressed. */
  onSelect?: () => void;
  /** Enables the rename action; called with the trimmed new title. */
  onRename?: (title: string) => void;
  /** Enables the delete action. */
  onDelete?: () => void;
  /** Extra hover actions rendered before rename/delete. */
  actions?: React.ReactNode;
}

/**
 * One conversation row with hover rename / delete actions and inline renaming.
 * @deprecated Use `ConversationRow` (default `rowActions="inline"`).
 */
export const ChatListItem = React.forwardRef<HTMLLIElement, ChatListItemProps>((props, ref) => (
  <ConversationRow ref={ref} rowActions="inline" {...props} />
));
ChatListItem.displayName = "ChatListItem";

export interface ChatListViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Chats to list, each with an id, title and date; grouped by recency. */
  items: ChatListItemData[];
  /** Id of the open chat; its row is highlighted. */
  activeId?: string;
  /** Called with the chat id when a row is pressed. */
  onSelect?: (id: string) => void;
  /**
   * Called with the chat id and the trimmed new title when the user renames a chat; the rename action is hidden when
   * unset.
   */
  onRename?: (id: string, title: string) => void;
  /** Called with the chat id when the user deletes a chat; the delete action is hidden when unset. */
  onDelete?: (id: string) => void;
  /** Show the search field (default true). */
  searchable?: boolean;
  /** Controlled search text. */
  search?: string;
  /** Initial search text when `search` is not controlled. */
  defaultSearch?: string;
  /** Called with the search text on every change. */
  onSearchChange?: (query: string) => void;
  /** Placeholder of the search field. */
  searchPlaceholder?: string;
  /** Shown when there are no items (or no search matches). */
  emptyState?: React.ReactNode;
  /** Content shown when there is nothing to list. @deprecated Use `emptyState`. */
  emptyMessage?: React.ReactNode;
  /** Reference "now" for date grouping (useful for tests and SSR). */
  now?: Date;
}

/**
 * Sidebar list of conversations grouped by recency, with search and inline rename / delete.
 * @deprecated Use `<ConversationList groupBy="date" searchable rowActions="inline" archivedSection={false} />`.
 */
export const ChatListView = React.forwardRef<HTMLDivElement, ChatListViewProps>(
  ({ searchable = true, emptyState, emptyMessage, ...props }, ref) => (
    <ConversationList
      ref={ref}
      groupBy="date"
      rowActions="inline"
      archivedSection={false}
      searchable={searchable}
      emptyState={emptyState ?? emptyMessage}
      {...props}
    />
  )
);
ChatListView.displayName = "ChatListView";
