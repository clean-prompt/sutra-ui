import * as React from "react";
import { RiSparklingFill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { formatClockTime, safeISO } from "../../lib/time";
import { Avatar, type AvatarProps, type AvatarSize } from "../../primitives/avatar";
import { Markdown, type MarkdownProps } from "../../patterns/markdown";

export type ChatMessageRole = "user" | "assistant" | "system";
export type ChatMessageVariant = "bubble" | "flat";

interface ChatMessageContextValue {
  role: ChatMessageRole;
  variant: ChatMessageVariant;
  streaming: boolean;
}

const ChatMessageContext = React.createContext<ChatMessageContextValue>({
  role: "assistant",
  variant: "bubble",
  streaming: false,
});

/** Read the enclosing message's role, variant and streaming state. */
export function useChatMessage() {
  return React.useContext(ChatMessageContext);
}

const caretClass =
  "inline-block h-[1.1em] w-[0.45em] translate-y-[0.2em] rounded-[1px] bg-foreground animate-caret-blink";

/** Appends a blinking caret to the last rendered markdown block. */
const caretAfterLast =
  "[&>:last-child]:after:ms-0.5 [&>:last-child]:after:inline-block [&>:last-child]:after:h-[1.1em] [&>:last-child]:after:w-[0.45em] [&>:last-child]:after:translate-y-[0.2em] [&>:last-child]:after:rounded-[1px] [&>:last-child]:after:bg-foreground [&>:last-child]:after:animate-caret-blink motion-reduce:[&>:last-child]:after:animate-none [&>:last-child]:after:content-['']";

export interface ChatMessageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  /** Who wrote the message: `user`, `assistant` or `system`; sets alignment and styling. */
  role?: ChatMessageRole;
  /** bubble: user messages sit right-aligned in a soft bubble · flat: every message is left-aligned with no bubble. */
  variant?: ChatMessageVariant;
  /** Shows a blinking caret after the content while the reply streams in. */
  streaming?: boolean;
}

/** A single chat turn. Compose with ChatMessageAvatar, ChatMessageBody, ChatMessageContent and friends. */
export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ role = "assistant", variant = "bubble", streaming = false, className, ...props }, ref) => {
    const ctx = React.useMemo(() => ({ role, variant, streaming }), [role, variant, streaming]);
    const alignRight = role === "user" && variant === "bubble";
    return (
      <ChatMessageContext.Provider value={ctx}>
        <div
          ref={ref}
          data-slot="chat-message"
          data-role={role}
          data-variant={variant}
          data-streaming={streaming || undefined}
          className={cn(
            "group/message relative flex w-full gap-3",
            alignRight && "flex-row-reverse",
            role === "system" && "justify-center",
            className
          )}
          {...props}
        />
      </ChatMessageContext.Provider>
    );
  }
);
ChatMessage.displayName = "ChatMessage";

/** Column that stacks header, content and footer next to the avatar. */
export const ChatMessageBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { role, variant } = useChatMessage();
    return (
      <div
        ref={ref}
        data-slot="chat-message-body"
        className={cn(
          "flex min-w-0 flex-col gap-1.5",
          role === "user" && variant === "bubble" ? "max-w-[85%] items-end" : "flex-1",
          role === "system" && "flex-none items-center",
          className
        )}
        {...props}
      />
    );
  }
);
ChatMessageBody.displayName = "ChatMessageBody";

export interface ChatMessageAvatarProps extends Omit<AvatarProps, "size" | "shape" | "status" | "verified"> {
  src?: string;
  alt?: string;
  /** Used for initials when there is no image. */
  name?: string;
  /** Custom fallback content (overrides initials / the assistant spark). */
  fallback?: React.ReactNode;
  /** Avatar size. */
  size?: "sm" | "md" | "lg";
}

const avatarSize: Record<NonNullable<ChatMessageAvatarProps["size"]>, { size: AvatarSize; frame?: string }> = {
  sm: { size: "xs" },
  md: { size: "sm" },
  lg: { size: "sm", frame: "size-9 text-sm [&_svg]:size-[18px]" },
};

/** Circular `Avatar` for a chat turn: image, initials, or the Sutra spark for assistant messages. */
export const ChatMessageAvatar = React.forwardRef<HTMLSpanElement, ChatMessageAvatarProps>(
  ({ src, alt, name, fallback, size = "md", frameClassName, fallbackClassName, ...props }, ref) => {
    const { role } = useChatMessage();
    const isAssistant = role !== "user";
    const spark = fallback === undefined && !name && isAssistant;
    const s = avatarSize[size];
    return (
      <Avatar
        ref={ref}
        data-slot="chat-message-avatar"
        size={s.size}
        src={src}
        name={name}
        alt={alt ?? (name ? undefined : isAssistant ? "Assistant" : "User")}
        fallback={spark ? <RiSparklingFill aria-hidden /> : fallback}
        initialsOptions={{ singleWord: 2 }}
        frameClassName={cn(
          s.frame,
          spark ? "bg-linear-to-br from-brand-400 to-brand-600 shadow-xs shadow-inner-highlight" : !src && "border border-border",
          frameClassName
        )}
        fallbackClassName={cn(spark && "bg-transparent text-white", fallbackClassName)}
        {...props}
      />
    );
  }
);
ChatMessageAvatar.displayName = "ChatMessageAvatar";

export interface ChatMessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render string children as markdown. */
  markdown?: boolean;
  /** Custom markdown renderers, forwarded to `Markdown`. */
  components?: MarkdownProps["components"];
  /** Overrides the message's streaming caret. */
  streaming?: boolean;
}

/** Message text: soft bubble for user turns, flowing prose for assistant turns. */
export const ChatMessageContent = React.forwardRef<HTMLDivElement, ChatMessageContentProps>(
  ({ markdown = false, components, streaming, className, children, ...props }, ref) => {
    const ctx = useChatMessage();
    const isStreaming = streaming ?? ctx.streaming;
    const bubble = ctx.role === "user" && ctx.variant === "bubble";
    const asMarkdown = markdown && typeof children === "string";
    const empty = children == null || children === "";

    return (
      <div
        ref={ref}
        data-slot="chat-message-content"
        className={cn(
          "min-w-0 text-[15px] leading-7 text-foreground",
          bubble && "rounded-2xl rounded-ee-md bg-muted px-4 py-2.5",
          ctx.role === "system" && "rounded-control border border-border bg-subtle px-3 py-1 text-xs leading-5 text-muted-foreground",
          className
        )}
        {...props}
      >
        {asMarkdown && !empty ? (
          <Markdown components={components} className={cn(isStreaming && caretAfterLast)}>
            {children as string}
          </Markdown>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {children}
            {isStreaming && <span aria-hidden className={cn(caretClass, !empty && "ms-0.5")} />}
          </div>
        )}
      </div>
    );
  }
);
ChatMessageContent.displayName = "ChatMessageContent";

export interface ChatMessageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Author name, shown before the timestamp. */
  name?: React.ReactNode;
  /** A Date / timestamp (formatted as a short time) or a preformatted string. */
  timestamp?: Date | string | number;
}

/** Sender name and time above the content. */
export const ChatMessageHeader = React.forwardRef<HTMLDivElement, ChatMessageHeaderProps>(
  ({ name, timestamp, className, children, ...props }, ref) => {
    const { role, variant } = useChatMessage();
    return (
      <div
        ref={ref}
        data-slot="chat-message-header"
        className={cn(
          "flex min-h-6 items-center gap-2 text-sm",
          role === "user" && variant === "bubble" && "flex-row-reverse",
          className
        )}
        {...props}
      >
        {name != null && <span className="font-medium text-foreground">{name}</span>}
        {timestamp != null && (
          <time
            dateTime={typeof timestamp === "string" ? undefined : safeISO(timestamp)}
            className="text-xs tabular-nums text-muted-foreground"
          >
            {typeof timestamp === "string" ? timestamp : formatClockTime(timestamp, { invalid: String(timestamp) })}
          </time>
        )}
        {children}
      </div>
    );
  }
);
ChatMessageHeader.displayName = "ChatMessageHeader";

/** Row under the content for actions and metadata. */
export const ChatMessageFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { role, variant } = useChatMessage();
    return (
      <div
        ref={ref}
        data-slot="chat-message-footer"
        className={cn(
          "flex min-h-7 items-center gap-1 text-xs text-muted-foreground",
          role === "user" && variant === "bubble" && "justify-end",
          className
        )}
        {...props}
      />
    );
  }
);
ChatMessageFooter.displayName = "ChatMessageFooter";
