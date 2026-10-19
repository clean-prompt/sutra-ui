import * as React from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiEditLine,
  RiEmotionLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiThumbDownFill,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbUpLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { formatRelative as formatRelativeLib, safeISO, toValidDate, type FormatRelativeOptions } from "../../lib/time";
import { useNow } from "../../hooks/use-now";
import { Button, type ButtonProps } from "../../primitives/button";
import { useChangeKey } from "../../hooks/use-change-key";
import { useCopy } from "../../hooks/use-copy";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { SimpleTooltip } from "../../primitives/tooltip";
import { EmojiPicker, EmojiReaction, reactionPresets, type EmojiReactionItem } from "../../assets/emoji-reactions";

export interface ChatMessageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Keep the row visible instead of revealing it on message hover. */
  alwaysVisible?: boolean;
  /**
   * Opt-in reactions (controlled). When `reactions` or `defaultReactions` is set, a ChatReactions row renders
   * above the toolbar (always visible) and the toolbar gains an add-reaction button.
   */
  reactions?: EmojiReactionItem[];
  defaultReactions?: EmojiReactionItem[];
  onReactionsChange?: (reactions: EmojiReactionItem[]) => void;
  /** Fired when the user adds or removes a reaction. Setting only this adds the toolbar button without a row. */
  onReact?: (emoji: string, reacted: boolean) => void;
  /** Quick picks for the reaction picker. */
  reactionQuickPicks?: readonly string[];
}

/** Row of message actions, revealed when the parent ChatMessage is hovered or focused. */
export const ChatMessageActions = React.forwardRef<HTMLDivElement, ChatMessageActionsProps>(
  (
    { alwaysVisible = false, reactions, defaultReactions, onReactionsChange, onReact, reactionQuickPicks, className, children, ...props },
    ref
  ) => {
    const withRow = reactions !== undefined || defaultReactions !== undefined;
    const withReactions = withRow || !!onReact;
    const [list, setList] = useControllableState<EmojiReactionItem[]>({
      value: reactions,
      defaultValue: defaultReactions ?? [],
      onChange: onReactionsChange,
    });
    const react = (emoji: string, next?: boolean) => {
      const { list: updated, reacted } = toggleChatReaction(list, emoji, next);
      if (updated === list) return;
      if (withRow) setList(updated);
      onReact?.(emoji, reacted);
    };
    const toolbar = (
      <div
        ref={ref}
        role="toolbar"
        aria-label="Message actions"
        className={cn(
          "-ml-1.5 flex items-center gap-0.5 transition-opacity duration-150",
          !alwaysVisible &&
            "opacity-0 focus-within:opacity-100 group-hover/message:opacity-100 group-focus-within/message:opacity-100 [@media(hover:none)]:opacity-100",
          className
        )}
        {...props}
      >
        {children}
        {withReactions && <ChatReactionAction quickPicks={reactionQuickPicks} onSelect={(emoji) => react(emoji, true)} />}
      </div>
    );
    if (!withRow) return toolbar;
    return (
      <div className="flex flex-col gap-1.5">
        {list.length > 0 && <ChatReactions reactions={list} onToggle={(emoji) => react(emoji)} readOnly />}
        {toolbar}
      </div>
    );
  }
);
ChatMessageActions.displayName = "ChatMessageActions";

export interface ChatMessageActionProps extends Omit<ButtonProps, "size"> {
  /** Accessible name, also shown as the native tooltip. */
  label: string;
  /** Marks the action as a toggled-on state (aria-pressed). */
  pressed?: boolean;
}

/** Compact icon button used inside ChatMessageActions. */
export const ChatMessageAction = React.forwardRef<HTMLButtonElement, ChatMessageActionProps>(
  ({ label, pressed, variant = "ghost", className, title, ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size="icon-xs"
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      data-state={pressed === undefined ? undefined : pressed ? "on" : "off"}
      className={cn(
        "text-muted-foreground hover:text-foreground data-[state=on]:text-foreground",
        className
      )}
      {...props}
    />
  )
);
ChatMessageAction.displayName = "ChatMessageAction";

export interface ChatCopyActionProps extends Omit<ChatMessageActionProps, "label" | "onCopy"> {
  /** Text to copy. */
  text: string;
  label?: string;
  onCopy?: (text: string) => void;
}

/** Copies the message text and briefly flips to a check mark. */
export const ChatCopyAction = React.forwardRef<HTMLButtonElement, ChatCopyActionProps>(
  ({ text, label = "Copy", onCopy, onClick, children, ...props }, ref) => {
    const { copied, copy } = useCopy();
    return (
      <ChatMessageAction
        ref={ref}
        label={copied ? "Copied" : label}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          void copy(text).then((ok) => ok && onCopy?.(text));
        }}
        {...props}
      >
        {children ??
          (copied ? (
            <RiCheckLine aria-hidden key="check" className="animate-pop" />
          ) : (
            <RiFileCopyLine aria-hidden key="copy" />
          ))}
      </ChatMessageAction>
    );
  }
);
ChatCopyAction.displayName = "ChatCopyAction";

export type ChatFeedback = "up" | "down" | null;

export interface ChatFeedbackActionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  value?: ChatFeedback;
  defaultValue?: ChatFeedback;
  /** Called with the new rating; clicking the active thumb again clears it (null). */
  onValueChange?: (value: ChatFeedback) => void;
  /** @deprecated Use `onValueChange`. */
  onFeedback?: (value: ChatFeedback) => void;
  disabled?: boolean;
}

/** Thumbs up / down toggle pair. */
export const ChatFeedbackActions = React.forwardRef<HTMLDivElement, ChatFeedbackActionsProps>(
  ({ value, defaultValue = null, onValueChange, onFeedback, disabled, className, ...props }, ref) => {
    const [feedback, setFeedback] = useControllableState<ChatFeedback>({
      value,
      defaultValue,
      onChange: (next) => {
        onValueChange?.(next);
        onFeedback?.(next);
      },
    });
    const toggle = (next: "up" | "down") => setFeedback(feedback === next ? null : next);
    // The filled thumb pops when a rating is given, not when a message that was already rated first renders.
    const changes = useChangeKey(feedback);
    const pop = changes > 0 ? "animate-pop" : undefined;
    return (
      <div ref={ref} role="group" aria-label="Rate this response" className={cn("flex items-center gap-0.5", className)} {...props}>
        <ChatMessageAction
          label="Good response"
          pressed={feedback === "up"}
          disabled={disabled}
          onClick={() => toggle("up")}
        >
          {feedback === "up" ? <RiThumbUpFill key={changes} aria-hidden className={pop} /> : <RiThumbUpLine aria-hidden />}
        </ChatMessageAction>
        <ChatMessageAction
          label="Bad response"
          pressed={feedback === "down"}
          disabled={disabled}
          onClick={() => toggle("down")}
        >
          {feedback === "down" ? <RiThumbDownFill key={changes} aria-hidden className={pop} /> : <RiThumbDownLine aria-hidden />}
        </ChatMessageAction>
      </div>
    );
  }
);
ChatFeedbackActions.displayName = "ChatFeedbackActions";

export type ChatRegenerateActionProps = Omit<ChatMessageActionProps, "label"> & { label?: string };

/** Regenerate the response. */
export const ChatRegenerateAction = React.forwardRef<HTMLButtonElement, ChatRegenerateActionProps>(
  ({ label = "Regenerate", children, ...props }, ref) => (
    <ChatMessageAction ref={ref} label={label} {...props}>
      {children ?? <RiRefreshLine aria-hidden />}
    </ChatMessageAction>
  )
);
ChatRegenerateAction.displayName = "ChatRegenerateAction";

export type ChatEditActionProps = Omit<ChatMessageActionProps, "label"> & { label?: string };

/** Edit the message. */
export const ChatEditAction = React.forwardRef<HTMLButtonElement, ChatEditActionProps>(
  ({ label = "Edit", children, ...props }, ref) => (
    <ChatMessageAction ref={ref} label={label} {...props}>
      {children ?? <RiEditLine aria-hidden />}
    </ChatMessageAction>
  )
);
ChatEditAction.displayName = "ChatEditAction";

export interface ChatBranchSwitcherProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Number of alternative versions. */
  count: number;
  /** Zero-based index of the visible version. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (index: number) => void;
}

/** "‹ 2/3 ›" pager for switching between response versions. */
export const ChatBranchSwitcher = React.forwardRef<HTMLDivElement, ChatBranchSwitcherProps>(
  ({ count, value, defaultValue = 0, onValueChange, className, ...props }, ref) => {
    const [index, setIndex] = useControllableState<number>({ value, defaultValue, onChange: onValueChange });
    if (count < 2) return null;
    const current = clamp(index, 0, count - 1);
    return (
      <div
        ref={ref}
        role="group"
        aria-label="Response versions"
        className={cn("flex items-center text-xs text-muted-foreground", className)}
        {...props}
      >
        <ChatMessageAction label="Previous version" disabled={current <= 0} onClick={() => setIndex(current - 1)}>
          <RiArrowLeftSLine aria-hidden />
        </ChatMessageAction>
        <span className="min-w-8 text-center font-medium tabular-nums" aria-live="polite">
          {current + 1}/{count}
        </span>
        <ChatMessageAction label="Next version" disabled={current >= count - 1} onClick={() => setIndex(current + 1)}>
          <RiArrowRightSLine aria-hidden />
        </ChatMessageAction>
      </div>
    );
  }
);
ChatBranchSwitcher.displayName = "ChatBranchSwitcher";

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

/** Toggle (or set) the current user's reaction in a list. Returns the same array when nothing changes. */
export function toggleChatReaction(list: EmojiReactionItem[], emoji: string, next?: boolean) {
  const existing = list.find((r) => r.emoji === emoji);
  const reacted = next ?? !existing?.reacted;
  if (existing ? Boolean(existing.reacted) === reacted : !reacted) return { list, reacted };
  const updated = existing
    ? list
        .map((r) => (r.emoji === emoji ? { ...r, reacted, count: Math.max(0, r.count + (reacted ? 1 : -1)) } : r))
        .filter((r) => r.count > 0)
    : [...list, { emoji, count: 1, reacted: true }];
  return { list: updated, reacted };
}

interface ReactionPickerPopoverProps {
  quickPicks?: readonly string[];
  onSelect: (emoji: string) => void;
  children: React.ReactNode;
}

function ReactionPickerPopover({ quickPicks = reactionPresets, onSelect, children }: ReactionPickerPopoverProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent size="auto" padded={false} align="start" collisionPadding={8} className="overflow-hidden">
        <EmojiPicker
          bare
          autoFocus
          quickPicks={quickPicks}
          onSelect={(emoji) => {
            onSelect(emoji);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface ChatReactionActionProps extends Omit<ChatMessageActionProps, "label" | "onSelect"> {
  label?: string;
  quickPicks?: readonly string[];
  onSelect: (emoji: string) => void;
}

/** Toolbar button that opens the emoji picker to add a reaction. */
export const ChatReactionAction = React.forwardRef<HTMLButtonElement, ChatReactionActionProps>(
  ({ label = "Add reaction", quickPicks, onSelect, children, ...props }, ref) => (
    <ReactionPickerPopover quickPicks={quickPicks} onSelect={onSelect}>
      <ChatMessageAction ref={ref} label={label} {...props}>
        {children ?? <RiEmotionLine aria-hidden />}
      </ChatMessageAction>
    </ReactionPickerPopover>
  )
);
ChatReactionAction.displayName = "ChatReactionAction";

export interface ChatReactionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onToggle"> {
  /** Reactions (controlled). */
  reactions?: EmojiReactionItem[];
  defaultReactions?: EmojiReactionItem[];
  onReactionsChange?: (reactions: EmojiReactionItem[]) => void;
  /** Fired when the current user adds or removes a reaction. */
  onReact?: (emoji: string, reacted: boolean) => void;
  /** Intercept pill clicks (the caller updates the list itself). */
  onToggle?: (emoji: string) => void;
  /** Quick picks at the top of the picker. */
  quickPicks?: readonly string[];
  /** Hide the add-reaction button. */
  readOnly?: boolean;
  addLabel?: string;
  size?: "sm" | "md";
}

/** Reaction row under a chat message: emoji pills with counts and reacted state, plus an add-reaction picker. */
export const ChatReactions = React.forwardRef<HTMLDivElement, ChatReactionsProps>(
  (
    {
      reactions,
      defaultReactions = [],
      onReactionsChange,
      onReact,
      onToggle,
      quickPicks,
      readOnly = false,
      addLabel = "Add reaction",
      size = "sm",
      className,
      ...props
    },
    ref
  ) => {
    const [list, setList] = useControllableState<EmojiReactionItem[]>({
      value: reactions,
      defaultValue: defaultReactions,
      onChange: onReactionsChange,
    });
    const react = (emoji: string, next?: boolean) => {
      const { list: updated, reacted } = toggleChatReaction(list, emoji, next);
      if (updated === list) return;
      setList(updated);
      onReact?.(emoji, reacted);
    };
    if (readOnly && list.length === 0) return null;
    return (
      <div ref={ref} role="group" aria-label="Reactions" className={cn("flex flex-wrap items-center gap-1", className)} {...props}>
        {list.map((r) => (
          <EmojiReaction
            key={r.emoji}
            emoji={r.emoji}
            count={r.count}
            reacted={Boolean(r.reacted)}
            size={size}
            onToggle={() => (onToggle ? onToggle(r.emoji) : react(r.emoji))}
          />
        ))}
        {!readOnly && (
          <ReactionPickerPopover quickPicks={quickPicks} onSelect={(emoji) => react(emoji, true)}>
            <button
              type="button"
              aria-label={addLabel}
              title={addLabel}
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground data-[state=open]:border-solid data-[state=open]:bg-muted [&_svg]:size-3.5",
                size === "sm" ? "h-6 w-7" : "h-7 w-8",
                focusRing
              )}
            >
              <RiEmotionLine aria-hidden />
            </button>
          </ReactionPickerPopover>
        )}
      </div>
    );
  }
);
ChatReactions.displayName = "ChatReactions";

/* ------------------------------------------------------------------ */
/* MessageTimestampHover                                               */
/* ------------------------------------------------------------------ */

const toDate = (d: Date | number | string) => toValidDate(d) ?? new Date(NaN);

/** Message stamp: "just now", "5m ago", "3h ago", "Yesterday", "4d ago", then "Mar 5" / "Mar 5, 2024". */
const MESSAGE_TIME: FormatRelativeOptions = { style: "short", yesterday: "Yesterday", maxRelativeDays: 6 };

/**
 * Compact relative time: "just now", "5m ago", "3h ago", "Yesterday", "4d ago", then "Mar 5" / "Mar 5, 2024".
 * @deprecated Use `formatRelative(date, { now, yesterday: "Yesterday", maxRelativeDays: 6 })`.
 */
export function formatMessageRelativeTime(date: Date | number | string, now: Date | number = Date.now()) {
  return formatRelativeLib(date, { ...MESSAGE_TIME, now });
}

export interface MessageTimestampHoverProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  date: Date | number | string;
  /** Reference "now" (mostly for tests). Defaults to the current time, refreshed every minute. */
  now?: Date | number;
  formatRelative?: (date: Date, now: number) => string;
  formatFull?: (date: Date) => string;
  /** Keep visible instead of revealing on message hover/focus. */
  alwaysVisible?: boolean;
}

/** Relative message time revealed on hover/focus, with the full date in a tooltip. */
export const MessageTimestampHover = React.forwardRef<HTMLElement, MessageTimestampHoverProps>(
  ({ date, now: nowProp, formatRelative, formatFull, alwaysVisible = false, className, ...props }, ref) => {
    const tick = useNow({ active: nowProp === undefined, interval: 60_000 });
    const d = toDate(date);
    const now = nowProp === undefined ? tick : nowProp instanceof Date ? nowProp.getTime() : nowProp;
    const relative = formatRelative ? formatRelative(d, now) : formatRelativeLib(d, { ...MESSAGE_TIME, now });
    const full = formatFull
      ? formatFull(d)
      : d.toLocaleString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
    return (
      <SimpleTooltip content={full}>
        <time
          ref={ref as React.Ref<HTMLTimeElement>}
          dateTime={safeISO(d)}
          tabIndex={0}
          className={cn(
            "inline-flex cursor-default select-none rounded-xs text-xs tabular-nums text-muted-foreground transition-opacity duration-150",
            !alwaysVisible &&
              "opacity-0 hover:opacity-100 focus-visible:opacity-100 group-hover/message:opacity-100 group-focus-within/message:opacity-100 [@media(hover:none)]:opacity-100",
            focusRing,
            className
          )}
          {...props}
        >
          <span aria-hidden>{relative}</span>
          <span className="sr-only">{full}</span>
        </time>
      </SimpleTooltip>
    );
  }
);
MessageTimestampHover.displayName = "MessageTimestampHover";
