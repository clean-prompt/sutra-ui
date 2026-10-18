import * as React from "react";
import {
  RiArrowLeftSLine,
  RiAttachment2,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseLine,
  RiEmotionLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiLogoutBoxRLine,
  RiPhoneLine,
  RiSendPlane2Fill,
  RiTimeLine,
  RiUserAddLine,
  RiVideoOnLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { pluralize } from "../lib/format";
import { useControllableState } from "../hooks/use-controllable-state";
import { EmojiPicker, EmojiReaction } from "../assets/emoji-reactions";
import { Avatar, type AvatarStatus } from "./avatar";
import { AvatarGroup } from "./avatar-group";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Switch } from "./switch";
import { Textarea } from "./textarea";
import {
  calendarDayDiff,
  dateKey,
  formatClockTime,
  formatDayLabel,
  formatRelative,
  HOUR_MS,
  MINUTE_MS,
  safeISO,
  toValidDate,
} from "../lib/time";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type MessageDirection = "incoming" | "outgoing";
export type MessageGroupPosition = "single" | "first" | "middle" | "last";

export interface MessageReplyTo {
  id?: string;
  senderName: string;
  text: React.ReactNode;
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reacted?: boolean;
}

export interface MessengerMessage {
  id: string;
  senderId: string;
  text?: string;
  createdAt: Date | number | string;
  status?: MessageDeliveryStatus;
  edited?: boolean;
  replyTo?: MessageReplyTo;
  reactions?: MessageReactionSummary[];
  /** Rich preview (shared note, password, file card…). */
  attachment?: React.ReactNode;
}

export type MessageListEntry =
  | { type: "date"; key: string; date: Date; label: string }
  | { type: "unread"; key: string; count: number }
  | { type: "group"; key: string; senderId: string; messages: MessengerMessage[] };

export interface GroupMessagesOptions {
  /** Max gap between consecutive messages from the same sender to share a group. Default 5 minutes. */
  windowMs?: number;
  /** Id of the first unread message; inserts an unread divider before it. */
  firstUnreadId?: string;
  /** Reference "now" for day labels. */
  now?: Date;
}

/** Day separator label: "Today", "Yesterday", a weekday within the last week, else "Oct 5" (with year if different). */
export function formatMessageDay(date: Date, now: Date = new Date()) {
  const diff = calendarDayDiff(now, date) ?? 0;
  if (diff > 1 && diff < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
  return formatDayLabel(date, { now, weekdayWithinWeek: false, tomorrow: false, locale: "en-US" });
}

/** Short clock time, e.g. "9:41 AM". */
export function formatMessageTime(date: Date | number | string) {
  return formatClockTime(date);
}

/** "last seen just now" / "5m ago" / "3h ago" / "yesterday" / "Oct 5". */
export function formatLastSeen(date: Date | number | string, now: Date = new Date()) {
  const d = toValidDate(date);
  if (!d) return "last seen recently";
  if (now.getTime() - d.getTime() < 23.5 * HOUR_MS) return `last seen ${formatRelative(d, { now, justNowMs: MINUTE_MS })}`;
  const day = formatMessageDay(d, now);
  return `last seen ${day === "Yesterday" ? "yesterday" : day}`;
}

/**
 * Turns a flat, chronological message list into render entries: day separators,
 * an optional unread divider, and groups of consecutive messages from the same
 * sender sent within `windowMs` of each other.
 */
export function groupMessages(messages: MessengerMessage[], options: GroupMessagesOptions = {}): MessageListEntry[] {
  const { windowMs = 5 * 60_000, firstUnreadId, now = new Date() } = options;
  const out: MessageListEntry[] = [];
  let lastDay = "";
  let group: Extract<MessageListEntry, { type: "group" }> | null = null;
  let lastTime = 0;
  const unreadIndex = firstUnreadId ? messages.findIndex((m) => m.id === firstUnreadId) : -1;

  messages.forEach((message, index) => {
    const parsed = toValidDate(message.createdAt);
    let breakGroup = false;
    const key = parsed ? dateKey(parsed) : lastDay;
    if (parsed && key !== lastDay) {
      out.push({ type: "date", key: `date-${key}`, date: parsed, label: formatMessageDay(parsed, now) });
      lastDay = key;
      breakGroup = true;
    }
    if (index === unreadIndex) {
      out.push({ type: "unread", key: "unread", count: messages.length - unreadIndex });
      breakGroup = true;
    }
    const time = parsed ? parsed.getTime() : lastTime;
    if (!breakGroup && group && group.senderId === message.senderId && time - lastTime <= windowMs) {
      group.messages.push(message);
    } else {
      group = { type: "group", key: `group-${message.id}`, senderId: message.senderId, messages: [message] };
      out.push(group);
    }
    lastTime = time;
  });
  return out;
}

/** Position of a message inside its group of `length`. */
export function messageGroupPosition(index: number, length: number): MessageGroupPosition {
  if (length <= 1) return "single";
  if (index === 0) return "first";
  if (index === length - 1) return "last";
  return "middle";
}

/* ------------------------------------------------------------------ */
/* MessageBubble                                                       */
/* ------------------------------------------------------------------ */

const radius: Record<MessageDirection, Record<MessageGroupPosition, string>> = {
  outgoing: {
    single: "rounded-2xl rounded-br-md",
    first: "rounded-2xl rounded-br-md",
    middle: "rounded-2xl rounded-r-md",
    last: "rounded-2xl rounded-tr-md",
  },
  incoming: {
    single: "rounded-2xl rounded-bl-md",
    first: "rounded-2xl rounded-bl-md",
    middle: "rounded-2xl rounded-l-md",
    last: "rounded-2xl rounded-tl-md",
  },
};

const statusLabel: Record<MessageDeliveryStatus, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
};

/** Delivery state glyph: clock, single tick, double tick, blue double tick, or a warning. */
export function MessageStatusIcon({ status, className }: { status: MessageDeliveryStatus; className?: string }) {
  const Icon =
    status === "sending" ? RiTimeLine : status === "sent" ? RiCheckLine : status === "failed" ? RiErrorWarningLine : RiCheckDoubleLine;
  return (
    <span data-status={status} className={cn("inline-flex items-center", className)}>
      <Icon
        aria-hidden
        className={cn(
          "size-3.5",
          status === "read" && "text-info",
          status === "failed" && "text-destructive",
          status === "sending" && "opacity-70"
        )}
      />
      <span className="sr-only">{statusLabel[status]}</span>
    </span>
  );
}

export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: MessageDirection;
  position?: MessageGroupPosition;
  timestamp?: Date | number | string;
  /** Show the time inside the bubble footer. Default true. */
  showTimestamp?: boolean;
  status?: MessageDeliveryStatus;
  onRetry?: () => void;
  replyTo?: MessageReplyTo;
  onReplyClick?: () => void;
  reactions?: MessageReactionSummary[];
  onReactionToggle?: (emoji: string, reacted: boolean) => void;
  /** Rich shared-item preview rendered above the text. */
  attachment?: React.ReactNode;
  edited?: boolean;
  /** Sender name shown above the first incoming bubble of a group (group chats). */
  senderName?: string;
  /** Avatar shown beside the last incoming bubble of a group. Space is reserved on other positions. */
  avatar?: React.ReactNode;
}

/** Human-to-human chat bubble with grouping radii, delivery ticks, reply quote, reactions and rich previews. */
export const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  (
    {
      direction = "incoming",
      position = "single",
      timestamp,
      showTimestamp = true,
      status,
      onRetry,
      replyTo,
      onReplyClick,
      reactions,
      onReactionToggle,
      attachment,
      edited,
      senderName,
      avatar,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const out = direction === "outgoing";
    const lastInGroup = position === "last" || position === "single";
    const firstInGroup = position === "first" || position === "single";
    const failed = status === "failed";

    return (
      <div
        ref={ref}
        data-direction={direction}
        data-position={position}
        data-status={status}
        className={cn("flex w-full items-end gap-2", out ? "justify-end" : "justify-start", lastInGroup ? "mb-2" : "mb-0.5", className)}
        {...props}
      >
        {!out && avatar !== undefined ? <div className="w-8 shrink-0">{lastInGroup ? avatar : null}</div> : null}
        <div className={cn("flex max-w-[78%] flex-col gap-1", out ? "items-end" : "items-start")}>
          {!out && senderName && firstInGroup ? <span className="px-3 text-xs font-medium text-muted-foreground">{senderName}</span> : null}
          <div
            className={cn(
              "relative min-w-16 px-3 py-2 text-sm shadow-xs",
              radius[direction][position],
              out ? "bg-primary text-primary-foreground" : "border border-border bg-card text-card-foreground",
              failed && "opacity-80"
            )}
          >
            {replyTo ? (
              <button
                type="button"
                onClick={onReplyClick}
                disabled={!onReplyClick}
                className={cn(
                  "mb-1.5 block w-full rounded-md border-l-2 px-2 py-1 text-left text-xs disabled:cursor-default",
                  out ? "border-primary-foreground/60 bg-primary-foreground/15" : "border-primary bg-muted",
                  focusRing
                )}
              >
                <span className="block font-semibold">{replyTo.senderName}</span>
                <span className="line-clamp-2 opacity-80">{replyTo.text}</span>
              </button>
            ) : null}
            {attachment ? <div className="-mx-1 mb-1.5 first:mt-0">{attachment}</div> : null}
            {children ? <div className="whitespace-pre-wrap break-words">{children}</div> : null}
            {showTimestamp && (timestamp !== undefined || status || edited) ? (
              <div className={cn("mt-0.5 flex items-center justify-end gap-1 text-2xs", out ? "text-primary-foreground/75" : "text-muted-foreground")}>
                {edited ? <span>edited</span> : null}
                {timestamp !== undefined ? <time dateTime={safeISO(timestamp)}>{formatMessageTime(timestamp)}</time> : null}
                {out && status ? <MessageStatusIcon status={status} className={status === "read" ? "[&_svg]:text-current" : undefined} /> : null}
              </div>
            ) : null}
          </div>
          {failed ? (
            <div className="flex items-center gap-1.5 text-xs text-destructive" role="status">
              <RiErrorWarningLine aria-hidden className="size-3.5" />
              <span>Not delivered</span>
              {onRetry ? (
                <button type="button" onClick={onRetry} className={cn("rounded-xs font-medium underline-offset-2 hover:underline", focusRing)}>
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {reactions && reactions.length > 0 ? (
            <div className={cn("-mt-2.5 flex flex-wrap gap-1 px-2", out ? "justify-end" : "justify-start")}>
              {reactions.map((r) => (
                <EmojiReaction
                  key={r.emoji}
                  size="sm"
                  emoji={r.emoji}
                  count={r.count}
                  reacted={r.reacted ?? false}
                  onToggle={(next) => onReactionToggle?.(r.emoji, next)}
                  className="shadow-xs"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);
MessageBubble.displayName = "MessageBubble";

/* ------------------------------------------------------------------ */
/* MessageList                                                         */
/* ------------------------------------------------------------------ */

export interface MessengerUser {
  name: string;
  avatarSrc?: string;
}

export interface MessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: MessengerMessage[];
  /** Messages from this sender render as outgoing. */
  currentUserId: string;
  users?: Record<string, MessengerUser>;
  windowMs?: number;
  firstUnreadId?: string;
  /** Show sender names and avatars on incoming groups (group chats). */
  showSenders?: boolean;
  onRetry?: (message: MessengerMessage) => void;
  onReactionToggle?: (message: MessengerMessage, emoji: string, reacted: boolean) => void;
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
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);
    const entries = React.useMemo(() => groupMessages(messages, { windowMs, firstUnreadId, now }), [messages, windowMs, firstUnreadId, now]);

    React.useEffect(() => {
      const el = innerRef.current;
      if (autoScroll && el) el.scrollTop = el.scrollHeight;
    }, [messages.length, autoScroll]);

    return (
      <div
        ref={innerRef}
        role="log"
        aria-live="polite"
        aria-label={props["aria-label"] ?? "Messages"}
        tabIndex={0}
        className={cn("flex flex-col overflow-y-auto px-3 py-4 scrollbar-thin", focusRing, className)}
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

/* ------------------------------------------------------------------ */
/* MessageComposer                                                     */
/* ------------------------------------------------------------------ */

export interface MessageComposerProps extends Omit<React.HTMLAttributes<HTMLFormElement>, "onSubmit"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text; the field clears afterwards. */
  onSend?: (text: string) => void;
  /** Shows the attach button. */
  onAttach?: () => void;
  /** Show the emoji picker button. Default true. */
  emoji?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Message being replied to, shown above the field. */
  replyingTo?: MessageReplyTo;
  onCancelReply?: () => void;
  maxRows?: number;
}

/** Message input: auto-growing textarea, attach and emoji buttons, Enter to send (Shift+Enter for a new line). */
export const MessageComposer = React.forwardRef<HTMLTextAreaElement, MessageComposerProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSend,
      onAttach,
      emoji = true,
      placeholder = "Message",
      disabled,
      replyingTo,
      onCancelReply,
      maxRows = 6,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const textRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => textRef.current as HTMLTextAreaElement);
    const [emojiOpen, setEmojiOpen] = React.useState(false);
    const canSend = value.trim().length > 0 && !disabled;

    const send = () => {
      if (!canSend) return;
      onSend?.(value.trim());
      setValue("");
      textRef.current?.focus();
    };

    const insert = (text: string) => {
      const el = textRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      setValue(value.slice(0, start) + text + value.slice(end));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(start + text.length, start + text.length);
      });
    };

    return (
      <form
        className={cn("flex flex-col gap-2 border-t border-border bg-background p-2", className)}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        {...props}
      >
        {replyingTo ? (
          <div className="flex items-start gap-2 rounded-md border-l-2 border-primary bg-muted px-2.5 py-1.5 text-xs">
            <div className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">Replying to {replyingTo.senderName}</span>
              <span className="line-clamp-1 text-muted-foreground">{replyingTo.text}</span>
            </div>
            {onCancelReply ? (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Cancel reply" onClick={onCancelReply}>
                <RiCloseLine aria-hidden />
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-end gap-1">
          {onAttach ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Attach" onClick={onAttach} disabled={disabled}>
              <RiAttachment2 aria-hidden />
            </Button>
          ) : null}
          <Textarea
            ref={textRef}
            aria-label={placeholder}
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            autoResize
            minRows={1}
            maxRows={maxRows}
            rows={1}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                send();
              }
            }}
            className="min-h-9 flex-1 resize-none rounded-2xl py-2"
          />
          {emoji ? (
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Insert emoji" disabled={disabled}>
                  <RiEmotionLine aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent size="auto" padded={false} side="top" align="end">
                <EmojiPicker
                  bare
                  autoFocus
                  onSelect={(e) => {
                    insert(e);
                    setEmojiOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          ) : null}
          <Button type="submit" size="icon" aria-label="Send" disabled={!canSend} className="rounded-full">
            <RiSendPlane2Fill aria-hidden />
          </Button>
        </div>
      </form>
    );
  }
);
MessageComposer.displayName = "MessageComposer";

/* ------------------------------------------------------------------ */
/* ChatHeader                                                          */
/* ------------------------------------------------------------------ */

export interface ChatHeaderMember {
  name: string;
  src?: string;
}

export interface ChatHeaderProps extends React.HTMLAttributes<HTMLElement> {
  name: string;
  avatarSrc?: string;
  /** Group members: renders stacked avatars instead of a single one. */
  members?: ChatHeaderMember[];
  /** `"online"`, a last-seen time, or any custom string. */
  presence?: "online" | Date | number | (string & {});
  typing?: boolean;
  onBack?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onInfo?: () => void;
  now?: Date;
}

/** Conversation header: avatar(s), name, presence or typing, call and info buttons. */
export const ChatHeader = React.forwardRef<HTMLElement, ChatHeaderProps>(
  ({ name, avatarSrc, members, presence, typing, onBack, onVoiceCall, onVideoCall, onInfo, now, className, children, ...props }, ref) => {
    const online = presence === "online";
    const subtitle = typing
      ? "typing…"
      : members && members.length > 0 && presence === undefined
        ? `${members.length} members`
        : online
          ? "online"
          : presence instanceof Date || typeof presence === "number"
            ? formatLastSeen(presence, now)
            : presence;
    const status: AvatarStatus | undefined = online ? "online" : undefined;

    return (
      <header ref={ref} className={cn("flex items-center gap-2 border-b border-border bg-background px-2 py-2", className)} {...props}>
        {onBack ? (
          <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
            <RiArrowLeftSLine aria-hidden />
          </Button>
        ) : null}
        {members && members.length > 0 ? (
          <AvatarGroup size="sm" max={3}>
            {members.map((m) => (
              <Avatar key={m.name} name={m.name} src={m.src} />
            ))}
          </AvatarGroup>
        ) : (
          <Avatar size="md" name={name} src={avatarSrc} status={status} />
        )}
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {subtitle ? (
            <p className={cn("truncate text-xs", typing || online ? "text-success" : "text-muted-foreground")}>{subtitle}</p>
          ) : null}
        </div>
        {children}
        {onVoiceCall ? (
          <Button variant="ghost" size="icon" aria-label="Voice call" onClick={onVoiceCall}>
            <RiPhoneLine aria-hidden />
          </Button>
        ) : null}
        {onVideoCall ? (
          <Button variant="ghost" size="icon" aria-label="Video call" onClick={onVideoCall}>
            <RiVideoOnLine aria-hidden />
          </Button>
        ) : null}
        {onInfo ? (
          <Button variant="ghost" size="icon" aria-label="Conversation info" onClick={onInfo}>
            <RiInformationLine aria-hidden />
          </Button>
        ) : null}
      </header>
    );
  }
);
ChatHeader.displayName = "ChatHeader";

/* ------------------------------------------------------------------ */
/* GroupInfoPanel                                                      */
/* ------------------------------------------------------------------ */

export interface GroupMember {
  id: string;
  name: string;
  src?: string;
  /** e.g. "owner", "admin", "member". Non-member roles render a badge. */
  role?: string;
  status?: AvatarStatus;
  subtitle?: string;
}

export interface GroupMediaItem {
  id: string;
  src?: string;
  alt: string;
  /** Fallback content when there is no image (icon, file type…). */
  preview?: React.ReactNode;
}

export interface GroupInfoPanelProps extends React.HTMLAttributes<HTMLElement> {
  name: string;
  description?: React.ReactNode;
  avatarSrc?: string;
  members: GroupMember[];
  currentUserId?: string;
  media?: GroupMediaItem[];
  onMediaClick?: (item: GroupMediaItem) => void;
  muted?: boolean;
  defaultMuted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  onAddMember?: () => void;
  onMemberClick?: (member: GroupMember) => void;
  onLeave?: () => void;
  leaveLabel?: string;
}

/** Side panel for a group chat: members with roles, shared media grid, mute and leave. */
export const GroupInfoPanel = React.forwardRef<HTMLElement, GroupInfoPanelProps>(
  (
    {
      name,
      description,
      avatarSrc,
      members,
      currentUserId,
      media,
      onMediaClick,
      muted: mutedProp,
      defaultMuted = false,
      onMutedChange,
      onAddMember,
      onMemberClick,
      onLeave,
      leaveLabel = "Leave group",
      className,
      ...props
    },
    ref
  ) => {
    const [muted, setMuted] = useControllableState({ value: mutedProp, defaultValue: defaultMuted, onChange: onMutedChange });
    const muteId = React.useId();
    const roleRank = (r?: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
    const sorted = [...members].sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));

    return (
      <aside ref={ref} aria-label={`${name} info`} className={cn("flex w-full flex-col gap-5 bg-background p-4", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar size="2xl" name={name} src={avatarSrc} shape="square" />
          <div>
            <h2 className="text-base font-semibold text-foreground">{name}</h2>
            <p className="text-xs text-muted-foreground">{members.length} members</p>
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <div className="flex items-center justify-between rounded-box border border-border px-3 py-2.5">
          <label htmlFor={muteId} className="text-sm font-medium text-foreground">
            Mute notifications
          </label>
          <Switch id={muteId} size="sm" checked={muted} onCheckedChange={setMuted} />
        </div>

        {media && media.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Shared media</h3>
            <ul className="grid grid-cols-3 gap-1.5">
              {media.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-label={m.alt}
                    onClick={() => onMediaClick?.(m)}
                    className={cn("flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", focusRing)}
                  >
                    {m.src ? <img src={m.src} alt="" className="size-full object-cover" /> : m.preview}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Members</h3>
            {onAddMember ? (
              <Button variant="ghost" size="xs" leadingIcon={<RiUserAddLine aria-hidden />} onClick={onAddMember}>
                Add
              </Button>
            ) : null}
          </div>
          <ul className="-mx-2">
            {sorted.map((m) => {
              const body = (
                <>
                  <Avatar size="sm" name={m.name} src={m.src} status={m.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {m.name}
                      {m.id === currentUserId ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                    </span>
                    {m.subtitle ? <span className="block truncate text-xs text-muted-foreground">{m.subtitle}</span> : null}
                  </span>
                  {m.role && m.role !== "member" ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-2xs font-medium text-primary-soft-foreground capitalize">{m.role}</span>
                  ) : null}
                </>
              );
              return (
                <li key={m.id}>
                  {onMemberClick ? (
                    <button
                      type="button"
                      onClick={() => onMemberClick(m)}
                      className={cn("flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-accent", focusRing)}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-2 py-1.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {onLeave ? (
          <Button variant="destructive-soft" leadingIcon={<RiLogoutBoxRLine aria-hidden />} onClick={onLeave}>
            {leaveLabel}
          </Button>
        ) : null}
      </aside>
    );
  }
);
GroupInfoPanel.displayName = "GroupInfoPanel";
