import * as React from "react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { Avatar } from "../../primitives/avatar";
import { groupMessages, messageGroupPosition, type MessengerMessage } from "./messenger-model";
import { MessageBubble } from "./messenger-bubble";

/* ------------------------------------------------------------------ */
/* MessageList                                                         */
/* ------------------------------------------------------------------ */

export interface MessengerUser {
  name: string;
  avatarSrc?: string;
}

export interface MessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Messages in order, oldest first; grouped into runs by sender and time. */
  messages: MessengerMessage[];
  /** Messages from this sender render as outgoing. */
  currentUserId: string;
  /** Sender details by user id (name and avatar), used for sender names and avatars in group chats. */
  users?: Record<string, MessengerUser>;
  /** Largest gap in ms between messages that still share a run. Default 300000 (5 minutes). */
  windowMs?: number;
  /** Id of the first unread message; an "unread" divider is drawn above it. */
  firstUnreadId?: string;
  /** Show sender names and avatars on incoming groups (group chats). */
  showSenders?: boolean;
  /** Called with the message when the user retries a failed one. */
  onRetry?: (message: MessengerMessage) => void;
  /** Called with the message, the emoji and the new reacted state when the user presses a reaction pill. */
  onReactionToggle?: (message: MessengerMessage, emoji: string, reacted: boolean) => void;
  /** Reference time for date dividers; set it in tests and SSR for stable output. */
  now?: Date;
  /** Keep scrolled to the newest message. Default true. */
  autoScroll?: boolean;
}

/** Scrolling conversation with day separators, an unread divider and grouped bubbles. */
export const MessageList = React.forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      messages,
      currentUserId,
      users = {},
      windowMs,
      firstUnreadId,
      showSenders,
      onRetry,
      onReactionToggle,
      now,
      autoScroll = true,
      className,
      onScroll,
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLDivElement>(null);
    /** Whether the reader is at (or near) the bottom, as of their last scroll. */
    const pinnedRef = React.useRef(true);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);
    const entries = React.useMemo(() => groupMessages(messages, { windowMs, firstUnreadId, now }), [messages, windowMs, firstUnreadId, now]);

    // Follow the conversation only when a message is appended (not when history is prepended), and only
    // if the reader was already at the bottom or just sent it themselves.
    const last = messages[messages.length - 1];
    const lastId = last?.id;
    const lastMine = last?.senderId === currentUserId;
    React.useEffect(() => {
      const el = innerRef.current;
      if (!autoScroll || !el || !(pinnedRef.current || lastMine)) return;
      el.scrollTop = el.scrollHeight;
      pinnedRef.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastId, autoScroll]);

    return (
      <div
        ref={innerRef}
        role="log"
        aria-live="polite"
        aria-label={props["aria-label"] ?? "Messages"}
        tabIndex={0}
        className={cn(
          "flex flex-col overflow-y-auto px-3 py-4 scrollbar-thin",
          // The newest bubble rises in; earlier ones stay put. motion-safe rather than the global reduced-motion net, which matches .animate-fade-up itself and not this variant.
          "motion-safe:[&>[data-group]:last-child>:last-child]:animate-fade-up",
          focusRing,
          className
        )}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 48;
          onScroll?.(e);
        }}
        data-slot="message-list"
        {...props}
      >
        {entries.map((entry) => {
          if (entry.type === "date") {
            return (
              <div key={entry.key} className="sticky top-0 z-10 my-3 flex justify-center">
                <span className="rounded-full border border-border bg-background/90 px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">
                  {entry.label}
                </span>
              </div>
            );
          }
          if (entry.type === "unread") {
            return (
              <div key={entry.key} data-unread-divider className="my-3 flex items-center gap-3 text-xs font-medium text-primary">
                <span className="h-px flex-1 bg-primary/40" />
                {entry.count} new {pluralize(entry.count, "message")}
                <span className="h-px flex-1 bg-primary/40" />
              </div>
            );
          }
          const out = entry.senderId === currentUserId;
          const user = users[entry.senderId];
          return (
            <div key={entry.key} data-group={entry.senderId}>
              {entry.messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  direction={out ? "outgoing" : "incoming"}
                  position={messageGroupPosition(i, entry.messages.length)}
                  timestamp={m.createdAt}
                  status={out ? m.status : undefined}
                  edited={m.edited}
                  replyTo={m.replyTo}
                  reactions={m.reactions}
                  attachment={m.attachment}
                  senderName={showSenders && !out ? user?.name : undefined}
                  avatar={showSenders && !out ? <Avatar size="sm" name={user?.name ?? entry.senderId} src={user?.avatarSrc} /> : undefined}
                  onRetry={onRetry ? () => onRetry(m) : undefined}
                  onReactionToggle={onReactionToggle ? (emoji, reacted) => onReactionToggle(m, emoji, reacted) : undefined}
                >
                  {m.text}
                </MessageBubble>
              ))}
            </div>
          );
        })}
      </div>
    );
  }
);
MessageList.displayName = "MessageList";
