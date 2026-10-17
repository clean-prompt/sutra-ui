import * as React from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiEditLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiThumbDownFill,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbUpLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button, type ButtonProps } from "./button";
import { useCopy } from "../hooks/use-copy";
import { useControllableState } from "../hooks/use-controllable-state";

export interface ChatMessageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Keep the row visible instead of revealing it on message hover. */
  alwaysVisible?: boolean;
}

/** Row of message actions, revealed when the parent ChatMessage is hovered or focused. */
export const ChatMessageActions = React.forwardRef<HTMLDivElement, ChatMessageActionsProps>(
  ({ alwaysVisible = false, className, ...props }, ref) => (
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
    />
  )
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
            <RiCheckLine key="check" className="animate-in zoom-in-50 duration-200" />
          ) : (
            <RiFileCopyLine key="copy" />
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
  onFeedback?: (value: ChatFeedback) => void;
  disabled?: boolean;
}

/** Thumbs up / down toggle pair. */
export const ChatFeedbackActions = React.forwardRef<HTMLDivElement, ChatFeedbackActionsProps>(
  ({ value, defaultValue = null, onFeedback, disabled, className, ...props }, ref) => {
    const [feedback, setFeedback] = useControllableState<ChatFeedback>({
      value,
      defaultValue,
      onChange: onFeedback,
    });
    const toggle = (next: "up" | "down") => setFeedback(feedback === next ? null : next);
    return (
      <div ref={ref} role="group" aria-label="Rate this response" className={cn("flex items-center gap-0.5", className)} {...props}>
        <ChatMessageAction
          label="Good response"
          pressed={feedback === "up"}
          disabled={disabled}
          onClick={() => toggle("up")}
        >
          {feedback === "up" ? <RiThumbUpFill className="animate-in zoom-in-75 duration-200" /> : <RiThumbUpLine />}
        </ChatMessageAction>
        <ChatMessageAction
          label="Bad response"
          pressed={feedback === "down"}
          disabled={disabled}
          onClick={() => toggle("down")}
        >
          {feedback === "down" ? <RiThumbDownFill className="animate-in zoom-in-75 duration-200" /> : <RiThumbDownLine />}
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
      {children ?? <RiRefreshLine />}
    </ChatMessageAction>
  )
);
ChatRegenerateAction.displayName = "ChatRegenerateAction";

export type ChatEditActionProps = Omit<ChatMessageActionProps, "label"> & { label?: string };

/** Edit the message. */
export const ChatEditAction = React.forwardRef<HTMLButtonElement, ChatEditActionProps>(
  ({ label = "Edit", children, ...props }, ref) => (
    <ChatMessageAction ref={ref} label={label} {...props}>
      {children ?? <RiEditLine />}
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
    const current = Math.min(Math.max(index, 0), count - 1);
    return (
      <div
        ref={ref}
        role="group"
        aria-label="Response versions"
        className={cn("flex items-center text-xs text-muted-foreground", className)}
        {...props}
      >
        <ChatMessageAction label="Previous version" disabled={current <= 0} onClick={() => setIndex(current - 1)}>
          <RiArrowLeftSLine />
        </ChatMessageAction>
        <span className="min-w-8 text-center font-medium tabular-nums" aria-live="polite">
          {current + 1}/{count}
        </span>
        <ChatMessageAction label="Next version" disabled={current >= count - 1} onClick={() => setIndex(current + 1)}>
          <RiArrowRightSLine />
        </ChatMessageAction>
      </div>
    );
  }
);
ChatBranchSwitcher.displayName = "ChatBranchSwitcher";
