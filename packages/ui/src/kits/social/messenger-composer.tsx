import * as React from "react";
import { RiAttachment2, RiCloseLine, RiEmotionLine, RiSendPlane2Fill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { EmojiPicker } from "../../assets/emoji-reactions";
import { Button } from "../../primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { Textarea } from "../../primitives/textarea";
import type { MessageReplyTo } from "./messenger-model";

/* ------------------------------------------------------------------ */
/* MessageComposer                                                     */
/* ------------------------------------------------------------------ */

export interface MessageComposerProps extends Omit<React.HTMLAttributes<HTMLFormElement>, "onSubmit"> {
  /** Controlled text of the field. */
  value?: string;
  /** Initial text when `value` is not controlled. */
  defaultValue?: string;
  /** Called with the text on every edit. */
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text; the field clears afterwards. */
  onSend?: (text: string) => void;
  /** Shows the attach button. */
  onAttach?: () => void;
  /** Show the emoji picker button. Default true. */
  emoji?: boolean;
  /** Placeholder of the field. Default "Message". */
  placeholder?: string;
  /** Disables the field and the buttons. */
  disabled?: boolean;
  /** Message being replied to, shown above the field. */
  replyingTo?: MessageReplyTo;
  /** Called when the user dismisses the reply preview; the close button is hidden when unset. */
  onCancelReply?: () => void;
  /** Rows after which the field stops growing and scrolls. Default 6. */
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
        data-slot="message-composer"
        {...props}
      >
        {replyingTo ? (
          <div className="flex items-start gap-2 rounded-md border-s-2 border-primary bg-muted px-2.5 py-1.5 text-xs">
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
