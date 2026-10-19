/** PromptInput toolbar parts: the toolbar row, tool group, toolbar button, attach button and submit/stop button. */
import * as React from "react";
import { RiArrowUpLine, RiAttachment2, RiStopFill } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Button, type ButtonProps } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { usePromptInput } from "./prompt-input-internal";

/** Bottom row of the composer: tools on the left, submit on the right. */
export const PromptInputToolbar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center justify-between gap-2 px-2.5 pb-2.5", className)} {...props} />
  )
);
PromptInputToolbar.displayName = "PromptInputToolbar";

/** Left-hand group of toolbar buttons. */
export const PromptInputTools = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-w-0 items-center gap-1", className)} {...props} />
  )
);
PromptInputTools.displayName = "PromptInputTools";

export interface PromptInputButtonProps extends ButtonProps {
  /** Toggle state for switches like "Web search". */
  pressed?: boolean;
  /** Accessible name / native tooltip (required for icon-only buttons). */
  label?: string;
}

/** Ghost toolbar button (attach, web search toggle, …). */
export const PromptInputButton = React.forwardRef<HTMLButtonElement, PromptInputButtonProps>(
  ({ pressed, label, variant = "ghost", size, className, children, title, ...props }, ref) => {
    const iconOnly = React.Children.toArray(children).every((c) => React.isValidElement(c));
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size ?? (iconOnly ? "icon-sm" : "sm")}
        aria-label={label}
        title={title ?? label}
        aria-pressed={pressed}
        data-state={pressed === undefined ? undefined : pressed ? "on" : "off"}
        className={cn(
          "text-muted-foreground hover:text-foreground",
          !iconOnly && "gap-1.5 px-2.5",
          "data-[state=on]:bg-primary-soft data-[state=on]:text-primary-soft-foreground data-[state=on]:hover:bg-primary-soft/70",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
PromptInputButton.displayName = "PromptInputButton";

export interface PromptInputAttachButtonProps extends Omit<PromptInputButtonProps, "onChange"> {
  /** File input `accept` filter, e.g. "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
}

/** Paperclip button that opens the file picker and forwards files to `onFilesAdded`. */
export const PromptInputAttachButton = React.forwardRef<HTMLButtonElement, PromptInputAttachButtonProps>(
  ({ accept, multiple = true, label = "Attach files", children, onClick, disabled, ...props }, ref) => {
    const { addFiles, acceptsFiles } = usePromptInput();
    const inputRef = React.useRef<HTMLInputElement>(null);
    return (
      <>
        <PromptInputButton
          ref={ref}
          label={label}
          disabled={disabled ?? !acceptsFiles}
          onClick={(e) => {
            onClick?.(e);
            if (!e.defaultPrevented) inputRef.current?.click();
          }}
          {...props}
        >
          {children ?? <RiAttachment2 aria-hidden />}
        </PromptInputButton>
        <input
          ref={inputRef}
          type="file"
          hidden
          tabIndex={-1}
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </>
    );
  }
);
PromptInputAttachButton.displayName = "PromptInputAttachButton";

export interface PromptInputSubmitProps extends Omit<ButtonProps, "type"> {
  submitLabel?: string;
  stopLabel?: string;
}

/** Round send button; turns into a stop button while loading. */
export const PromptInputSubmit = React.forwardRef<HTMLButtonElement, PromptInputSubmitProps>(
  ({ submitLabel = "Send message", stopLabel = "Stop generating", className, disabled, onClick, children, ...props }, ref) => {
    const { loading: isLoading, canSubmit, onStop } = usePromptInput();
    const stopping = isLoading && !!onStop;
    const label = isLoading ? stopLabel : submitLabel;
    return (
      <Button
        ref={ref}
        type={stopping ? "button" : "submit"}
        variant="primary"
        size="icon-sm"
        aria-label={label}
        title={label}
        disabled={disabled ?? (isLoading ? !onStop : !canSubmit)}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          if (stopping) {
            e.preventDefault();
            onStop?.();
          }
        }}
        className={cn("rounded-full disabled:opacity-40", className)}
        {...props}
      >
        {children ??
          (stopping ? (
            <RiStopFill aria-hidden key="stop" className="size-3.5 animate-in zoom-in-50 duration-150" />
          ) : isLoading ? (
            <Spinner key="spin" aria-hidden role="presentation" size="sm" className="text-current" />
          ) : (
            <RiArrowUpLine aria-hidden key="send" className="animate-in zoom-in-75 duration-150" />
          ))}
      </Button>
    );
  }
);
PromptInputSubmit.displayName = "PromptInputSubmit";
