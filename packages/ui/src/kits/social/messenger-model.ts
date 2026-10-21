import type * as React from "react";
import {
  dateKey,
  formatClockTime,
  formatDayLabel,
  formatRelative,
  HOUR_MS,
  MINUTE_MS,
  toValidDate,
  type FormatDayLabelOptions,
} from "../../lib/time";

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

/** Day separators: "Today", "Yesterday", "Monday" within the last week, else "Oct 5" (with year if different). */
const MESSAGE_DAY: FormatDayLabelOptions = { weekdayWithinWeek: "long", tomorrow: false, locale: "en-US" };

/**
 * Day separator label: "Today", "Yesterday", a weekday within the last week, else "Oct 5" (with year if different).
 * @deprecated Use `formatDayLabel(date, { now, weekdayWithinWeek: "long", tomorrow: false, locale: "en-US" })`.
 */
export function formatMessageDay(date: Date, now: Date = new Date()) {
  return formatDayLabel(date, { ...MESSAGE_DAY, now });
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
  const day = formatDayLabel(d, { ...MESSAGE_DAY, now });
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
      out.push({ type: "date", key: `date-${key}`, date: parsed, label: formatDayLabel(parsed, { ...MESSAGE_DAY, now }) });
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
