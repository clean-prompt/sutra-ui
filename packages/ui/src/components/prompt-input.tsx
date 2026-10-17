import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { RiArrowDownSLine, RiArrowUpLine, RiAttachment2, RiCheckLine, RiStopFill, RiUploadCloud2Line } from "@remixicon/react";
import { cn } from "../lib/cn";
import { Button, type ButtonProps } from "./button";
import { Spinner } from "./spinner";
import { useControllableState } from "../hooks/use-controllable-state";

interface PromptInputContextValue {
  value: string;
  setValue: (value: string) => void;
  isLoading: boolean;
  disabled: boolean;
  canSubmit: boolean;
  onStop?: () => void;
  addFiles: (files: File[]) => void;
  acceptsFiles: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const PromptInputContext = React.createContext<PromptInputContextValue | null>(null);

/** Access the enclosing PromptInput state. */
export function usePromptInput() {
  const ctx = React.useContext(PromptInputContext);
  if (!ctx) throw new Error("PromptInput parts must be used within <PromptInput>");
  return ctx;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface PromptInputProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the current text when the user submits (Enter or the submit button). */
  onSubmit?: (value: string, event: React.FormEvent<HTMLFormElement>) => void;
  /** A response is streaming: the submit button becomes a stop button and Enter won't submit. */
  isLoading?: boolean;
  /** Called by the stop button while `isLoading`. */
  onStop?: () => void;
  disabled?: boolean;
  /** Clear the text after submitting (default true). */
  clearOnSubmit?: boolean;
  /** Override whether submitting is allowed (default: text is non-empty). Useful with attachments. */
  canSubmit?: boolean;
  /** Enables drag-and-drop, paste and the attach button. Receives the dropped / picked files. */
  onFilesAdded?: (files: File[]) => void;
}

/** Chat composer card. Compose with PromptInputAttachments, PromptInputTextarea and PromptInputToolbar. */
export const PromptInput = React.forwardRef<HTMLFormElement, PromptInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSubmit,
      isLoading = false,
      onStop,
      disabled = false,
      clearOnSubmit = true,
      canSubmit: canSubmitProp,
      onFilesAdded,
      className,
      children,
      onClick,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<string>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [dragging, setDragging] = React.useState(false);
    const dragDepth = React.useRef(0);
    const canSubmit = !disabled && !isLoading && (canSubmitProp ?? value.trim().length > 0);
    const acceptsFiles = !!onFilesAdded && !disabled;

    const addFiles = React.useCallback(
      (files: File[]) => {
        if (files.length > 0) onFilesAdded?.(files);
      },
      [onFilesAdded]
    );

    const ctx = React.useMemo<PromptInputContextValue>(
      () => ({ value, setValue, isLoading, disabled, canSubmit, onStop, addFiles, acceptsFiles, textareaRef }),
      [value, setValue, isLoading, disabled, canSubmit, onStop, addFiles, acceptsFiles]
    );

    const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

    return (
      <PromptInputContext.Provider value={ctx}>
        <form
          ref={ref}
          data-loading={isLoading || undefined}
          data-dragging={dragging || undefined}
          aria-disabled={disabled || undefined}
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onSubmit?.(value, e);
            if (clearOnSubmit) setValue("");
          }}
          onClick={(e) => {
            onClick?.(e);
            const target = e.target as HTMLElement;
            if (!target.closest("button, a, input, textarea, select, [role=menu], [role=menuitem], [data-prompt-input-ignore]")) {
              textareaRef.current?.focus();
            }
          }}
          onDragEnter={(e) => {
            onDragEnter?.(e);
            if (!acceptsFiles || !hasFiles(e)) return;
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => {
            onDragOver?.(e);
            if (!acceptsFiles || !hasFiles(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            onDragLeave?.(e);
            if (!acceptsFiles) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={(e) => {
            onDrop?.(e);
            if (!acceptsFiles) return;
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "relative flex w-full cursor-text flex-col rounded-2xl border border-input bg-background shadow-sm transition-[border-color,box-shadow] duration-150",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
            disabled && "cursor-not-allowed opacity-60",
            dragging && "border-ring ring-[3px] ring-ring/20",
            className
          )}
          {...props}
        >
          {children}
          {dragging && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-1 z-10 flex items-center justify-center gap-2 rounded-[inherit] border-2 border-dashed border-primary/50 bg-primary-soft/90 text-sm font-medium text-primary-soft-foreground animate-in fade-in-0"
            >
              <RiUploadCloud2Line className="size-5" />
              Drop files to attach
            </div>
          )}
        </form>
      </PromptInputContext.Provider>
    );
  }
);
PromptInput.displayName = "PromptInput";

export interface PromptInputTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue"> {
  minRows?: number;
  maxRows?: number;
  /** Submit on Enter (Shift+Enter inserts a newline). Default true. */
  submitOnEnter?: boolean;
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

/** Auto-growing textarea (1 → 8 rows). Enter submits, Shift+Enter adds a line, IME composition is respected. */
export const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  (
    {
      minRows = 1,
      maxRows = 8,
      submitOnEnter = true,
      placeholder = "Ask anything…",
      className,
      onChange,
      onKeyDown,
      onPaste,
      onCompositionStart,
      onCompositionEnd,
      disabled: disabledProp,
      ...props
    },
    ref
  ) => {
    const { value, setValue, isLoading, disabled, textareaRef, addFiles, acceptsFiles } = usePromptInput();
    const composing = React.useRef(false);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        assignRef(ref, node);
      },
      [ref, textareaRef]
    );

    const resize = React.useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      const style = window.getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || 24;
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const min = lineHeight * minRows + padding;
      const max = lineHeight * maxRows + padding;
      el.style.height = "auto";
      const next = Math.min(Math.max(el.scrollHeight, min), max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    }, [minRows, maxRows, textareaRef]);

    useIsoLayoutEffect(() => {
      resize();
    }, [value, resize]);

    React.useEffect(() => {
      const el = textareaRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;
      let width = el.clientWidth;
      const observer = new ResizeObserver(() => {
        if (el.clientWidth !== width) {
          width = el.clientWidth;
          resize();
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [resize, textareaRef]);

    return (
      <textarea
        ref={setRefs}
        rows={minRows}
        value={value}
        placeholder={placeholder}
        disabled={disabledProp ?? disabled}
        aria-label={props["aria-label"] ?? "Message"}
        onChange={(e) => {
          onChange?.(e);
          setValue(e.target.value);
        }}
        onCompositionStart={(e) => {
          composing.current = true;
          onCompositionStart?.(e);
        }}
        onCompositionEnd={(e) => {
          composing.current = false;
          onCompositionEnd?.(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || !submitOnEnter) return;
          if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
          if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          if (isLoading) return;
          e.currentTarget.form?.requestSubmit();
        }}
        onPaste={(e) => {
          onPaste?.(e);
          if (e.defaultPrevented || !acceptsFiles) return;
          const files = Array.from(e.clipboardData.files);
          if (files.length > 0) {
            e.preventDefault();
            addFiles(files);
          }
        }}
        className={cn(
          "scrollbar-thin block w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3.5 text-[15px] leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
PromptInputTextarea.displayName = "PromptInputTextarea";

/** Slot above the textarea for attachment previews. Renders nothing when empty. */
export const PromptInputAttachments = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    if (React.Children.count(children) === 0) return null;
    return (
      <div
        ref={ref}
        data-prompt-input-ignore=""
        className={cn("scrollbar-none flex cursor-default items-center gap-2 overflow-x-auto px-3 pb-0.5 pt-3 [&>*]:shrink-0", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PromptInputAttachments.displayName = "PromptInputAttachments";

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
          {children ?? <RiAttachment2 />}
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
    const { isLoading, canSubmit, onStop } = usePromptInput();
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
            <RiStopFill key="stop" className="size-3.5 animate-in zoom-in-50 duration-150" />
          ) : isLoading ? (
            <Spinner key="spin" aria-hidden role="presentation" size="sm" className="text-current" />
          ) : (
            <RiArrowUpLine key="send" className="animate-in zoom-in-75 duration-150" />
          ))}
      </Button>
    );
  }
);
PromptInputSubmit.displayName = "PromptInputSubmit";

export interface PromptInputModel {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  /** Small trailing tag such as "New" or "Pro". */
  badge?: string;
}

export interface PromptInputModelSelectProps extends Omit<ButtonProps, "value" | "defaultValue"> {
  models: PromptInputModel[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Heading inside the menu. */
  menuLabel?: string;
  align?: "start" | "center" | "end";
}

/** Model picker dropdown for the composer toolbar. */
export const PromptInputModelSelect = React.forwardRef<HTMLButtonElement, PromptInputModelSelectProps>(
  (
    { models, value, defaultValue, onValueChange, menuLabel = "Model", align = "start", className, ...props },
    ref
  ) => {
    const [selected, setSelected] = useControllableState<string>({
      value,
      defaultValue: defaultValue ?? models[0]?.id ?? "",
      onChange: onValueChange,
    });
    const current = models.find((m) => m.id === selected) ?? models[0];
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="sm"
            className={cn("gap-1 px-2.5 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground", className)}
            {...props}
          >
            {current?.icon && <span className="inline-flex [&_svg]:size-4">{current.icon}</span>}
            <span className="truncate">{current?.name ?? "Select model"}</span>
            <RiArrowDownSLine aria-hidden className="opacity-70" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align={align}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              "z-50 min-w-60 max-w-80 overflow-hidden rounded-box border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            {menuLabel && (
              <DropdownMenu.Label className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                {menuLabel}
              </DropdownMenu.Label>
            )}
            <DropdownMenu.RadioGroup value={selected} onValueChange={setSelected}>
              {models.map((model) => (
                <DropdownMenu.RadioItem
                  key={model.id}
                  value={model.id}
                  className="relative flex cursor-default select-none items-start gap-2.5 rounded-md py-2 pl-2 pr-8 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[disabled]:opacity-50"
                >
                  {model.icon && (
                    <span className="mt-0.5 inline-flex shrink-0 text-muted-foreground [&_svg]:size-4">{model.icon}</span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      {model.name}
                      {model.badge && (
                        <span className="rounded-xs bg-primary-soft px-1.5 py-px text-2xs font-medium text-primary-soft-foreground">
                          {model.badge}
                        </span>
                      )}
                    </span>
                    {model.description && (
                      <span className="text-xs leading-5 text-muted-foreground">{model.description}</span>
                    )}
                  </span>
                  <DropdownMenu.ItemIndicator className="absolute right-2 top-2.5 inline-flex text-primary">
                    <RiCheckLine className="size-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }
);
PromptInputModelSelect.displayName = "PromptInputModelSelect";
