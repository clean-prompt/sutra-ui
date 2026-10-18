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

/**
 * One conversation row with hover rename / delete actions and inline renaming.
 * @deprecated Use `ConversationRow` (default `rowActions="inline"`).
 */
export const ChatListItem = React.forwardRef<HTMLLIElement, ChatListItemProps>((props, ref) => (
  <ConversationRow ref={ref} rowActions="inline" {...props} />
));
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
