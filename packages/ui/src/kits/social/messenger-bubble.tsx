import * as React from "react";
import { RiCheckDoubleLine, RiCheckLine, RiErrorWarningLine, RiTimeLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { useChangeKey } from "../../hooks/use-change-key";
import { EmojiReaction } from "../../assets/emoji-reactions";
import { safeISO } from "../../lib/time";
import {
  formatMessageTime,
  type MessageDeliveryStatus,
  type MessageDirection,
  type MessageGroupPosition,
  type MessageReactionSummary,
  type MessageReplyTo,
} from "./messenger-model";

/* ------------------------------------------------------------------ */
/* MessageBubble                                                       */
/* ------------------------------------------------------------------ */

const radius: Record<MessageDirection, Record<MessageGroupPosition, string>> = {
  outgoing: {
    single: "rounded-2xl rounded-ee-md",
    first: "rounded-2xl rounded-ee-md",
    middle: "rounded-2xl rounded-e-md",
    last: "rounded-2xl rounded-se-md",
  },
  incoming: {
    single: "rounded-2xl rounded-es-md",
    first: "rounded-2xl rounded-es-md",
    middle: "rounded-2xl rounded-s-md",
    last: "rounded-2xl rounded-ss-md",
  },
};

const statusLabel: Record<MessageDeliveryStatus, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
};

export interface MessageStatusIconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Delivery state (`sending`, `sent`, `delivered`, `read` or `failed`); picks the tick icon and its tone. */
  status: MessageDeliveryStatus;
}

/** Delivery state glyph: clock, single tick, double tick, blue double tick, or a warning. */
export const MessageStatusIcon = React.forwardRef<HTMLSpanElement, MessageStatusIconProps>(({ status, className, ...props }, ref) => {
  const Icon =
    status === "sending" ? RiTimeLine : status === "sent" ? RiCheckLine : status === "failed" ? RiErrorWarningLine : RiCheckDoubleLine;
  // The glyph pops in when the state changes it (clock, tick, double tick), never on the first render. Delivered to read keeps
  // the glyph and only fades its colour.
  const glyph = useChangeKey(Icon);
  return (
    <span ref={ref} data-status={status} className={cn("inline-flex items-center", className)} data-slot="message-status-icon" {...props}>
      <Icon
        key={glyph}
        aria-hidden
        className={cn(
          "size-3.5 transition-colors",
          glyph > 0 && "animate-pop",
          status === "read" && "text-info",
          status === "failed" && "text-destructive",
          status === "sending" && "opacity-70"
        )}
      />
      <span className="sr-only">{statusLabel[status]}</span>
    </span>
  );
});
MessageStatusIcon.displayName = "MessageStatusIcon";

export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `incoming` aligns the bubble to the start, `outgoing` to the end with the accent fill. */
  direction?: MessageDirection;
  /** Place in a run of messages from one sender (`single`, `first`, `middle`, `last`); shapes the corners. */
  position?: MessageGroupPosition;
  /** Time of the message (Date, epoch ms or ISO string), shown in the footer when `showTimestamp`. */
  timestamp?: Date | number | string;
  /** Show the time inside the bubble footer. Default true. */
  showTimestamp?: boolean;
  /** Delivery state of an outgoing message; shows the tick icon in the footer. */
  status?: MessageDeliveryStatus;
  /** Called when the user presses Retry on a `failed` message; the button is hidden when unset. */
  onRetry?: () => void;
  /** Quoted message this one replies to, shown above the text. */
  replyTo?: MessageReplyTo;
  /** Called when the user presses the quoted reply, for example to scroll to the original. */
  onReplyClick?: () => void;
  /** Reaction pills under the bubble, each with an emoji, count and whether you reacted. */
  reactions?: MessageReactionSummary[];
  /** Called with the emoji and the new reacted state when the user presses a reaction pill. */
  onReactionToggle?: (emoji: string, reacted: boolean) => void;
  /** Rich shared-item preview rendered above the text. */
  attachment?: React.ReactNode;
  /** Shows an "edited" mark in the footer. */
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
        data-slot="message-bubble"
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
                  "mb-1.5 block w-full rounded-md border-s-2 px-2 py-1 text-start text-xs disabled:cursor-default",
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
                <button type="button" onClick={onRetry} className={cn(hitArea, "rounded-xs font-medium underline-offset-2 hover:underline", focusRing)}>
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
