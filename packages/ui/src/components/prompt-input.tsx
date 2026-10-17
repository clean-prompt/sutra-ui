import * as React from "react";
import { DropdownMenu } from "radix-ui";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpLine,
  RiAtLine,
  RiAttachment2,
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCodeLine,
  RiFlashlightFill,
  RiStopFill,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button, type ButtonProps } from "./button";
import { Spinner } from "./spinner";
import { useControllableState } from "../hooks/use-controllable-state";
import { DropdownMenu as Menu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";

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
  /** Something droppable is being dragged over the composer. */
  dragging: boolean;
  /** Mounted PromptInputDropOverlay parts replace the built-in drop hint. */
  registerDropOverlay: () => () => void;
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
  /**
   * Accept non-file drops too (e.g. files dragged from an editor's explorer as `text/uri-list`).
   * Called with the drop's DataTransfer when the drop carries no files (or `onFilesAdded` is unset).
   */
  onContextDrop?: (data: DataTransfer) => void;
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
      onContextDrop,
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
    const [customOverlays, setCustomOverlays] = React.useState(0);
    const registerDropOverlay = React.useCallback(() => {
      setCustomOverlays((n) => n + 1);
      return () => setCustomOverlays((n) => n - 1);
    }, []);
    const canSubmit = !disabled && !isLoading && (canSubmitProp ?? value.trim().length > 0);
    const acceptsFiles = !!onFilesAdded && !disabled;

    const addFiles = React.useCallback(
      (files: File[]) => {
        if (files.length > 0) onFilesAdded?.(files);
      },
      [onFilesAdded]
    );

    const ctx = React.useMemo<PromptInputContextValue>(
      () => ({ value, setValue, isLoading, disabled, canSubmit, onStop, addFiles, acceptsFiles, textareaRef, dragging, registerDropOverlay }),
      [value, setValue, isLoading, disabled, canSubmit, onStop, addFiles, acceptsFiles, dragging, registerDropOverlay]
    );

    const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const acceptsContext = !!onContextDrop && !disabled;
    const accepts = (e: React.DragEvent) =>
      (acceptsFiles && hasFiles(e)) || (acceptsContext && (e.dataTransfer?.types?.length ?? 0) > 0);

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
            if (!accepts(e)) return;
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => {
            onDragOver?.(e);
            if (!accepts(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            onDragLeave?.(e);
            if (!acceptsFiles && !acceptsContext) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={(e) => {
            onDrop?.(e);
            if (!acceptsFiles && !acceptsContext) return;
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            const files = Array.from(e.dataTransfer?.files ?? []);
            if (acceptsFiles && files.length > 0) addFiles(files);
            else if (acceptsContext && e.dataTransfer) onContextDrop?.(e.dataTransfer);
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
          {dragging && customOverlays === 0 && (
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

/* ------------------------------------------------------------------ */
/* Inline highlighting (mirror overlay)                                */
/* ------------------------------------------------------------------ */

export interface PromptInputHighlightRule {
  /** Global-or-not regex; every match is highlighted (use a capture group named `token` to highlight part of a match). */
  pattern?: RegExp;
  /** Explicit [start, end) character ranges. */
  ranges?: ReadonlyArray<readonly [number, number]>;
  className?: string;
  /** Exposed as `data-highlight` on the span (e.g. "mention", "tag", "command"). */
  kind?: string;
}

/** `true` = highlight `@file`, `#tag` and `/command` tokens; an array = custom rules; or both. */
export type PromptInputHighlight =
  | boolean
  | PromptInputHighlightRule[]
  | { mentions?: boolean; rules?: PromptInputHighlightRule[] };

export interface PromptInputHighlightSegment {
  text: string;
  start: number;
  end: number;
  kind?: string;
  className?: string;
}

const tokenHighlight = "rounded-xs bg-primary-soft text-primary-soft-foreground shadow-[0_0_0_1px_var(--color-primary-soft)]";

/** Built-in rules for agent prompts: `@path/to/file`, `#tag` and a leading `/command`. */
export const mentionHighlightRules: PromptInputHighlightRule[] = [
  { kind: "mention", pattern: /(?<token>[@#/]\[[^\]\n]+\]\([a-z]+:[^)\s]+\))/g, className: tokenHighlight },
  { kind: "mention", pattern: /(?:^|(?<=[\s(]))(?<token>@(?:"[^"\n]+"|[^\s@]*[^\s@.,;:!?)\]]))/g, className: tokenHighlight },
  { kind: "tag", pattern: /(?:^|(?<=[\s(]))(?<token>#[\p{L}\p{N}_][\p{L}\p{N}_\-./]*)/gu, className: "rounded-xs bg-info-soft text-info-soft-foreground shadow-[0_0_0_1px_var(--color-info-soft)]" },
  { kind: "command", pattern: /(?:^|(?<=\n))[ \t]*(?<token>\/[\w][\w\-:.]*)/g, className: "rounded-xs bg-warning-soft text-warning-soft-foreground shadow-[0_0_0_1px_var(--color-warning-soft)]" },
];

function resolveHighlightRules(highlight: PromptInputHighlight | undefined): PromptInputHighlightRule[] {
  if (!highlight) return [];
  if (highlight === true) return mentionHighlightRules;
  if (Array.isArray(highlight)) return highlight;
  return [...(highlight.rules ?? []), ...(highlight.mentions ? mentionHighlightRules : [])];
}

/** Split text into plain and highlighted segments. Earlier rules win where matches overlap. */
export function highlightTextSegments(text: string, rules: readonly PromptInputHighlightRule[]): PromptInputHighlightSegment[] {
  const marks: Array<{ start: number; end: number; kind?: string; className?: string }> = [];
  const free = (start: number, end: number) => marks.every((m) => end <= m.start || start >= m.end);
  for (const rule of rules) {
    const add = (start: number, end: number) => {
      const s = Math.max(0, start);
      const e = Math.min(text.length, end);
      if (e > s && free(s, e)) marks.push({ start: s, end: e, kind: rule.kind, className: rule.className });
    };
    for (const [start, end] of rule.ranges ?? []) add(start, end);
    if (rule.pattern) {
      const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g";
      const re = new RegExp(rule.pattern.source, flags.includes("d") ? flags : flags + "d");
      for (const m of text.matchAll(re)) {
        if (m[0].length === 0) continue;
        const idx = (m as RegExpMatchArray & { indices?: { groups?: Record<string, [number, number] | undefined> } }).indices;
        const token = idx?.groups?.token;
        if (token) add(token[0], token[1]);
        else add(m.index ?? 0, (m.index ?? 0) + m[0].length);
      }
    }
  }
  marks.sort((a, b) => a.start - b.start);
  const out: PromptInputHighlightSegment[] = [];
  let last = 0;
  for (const m of marks) {
    if (m.start > last) out.push({ text: text.slice(last, m.start), start: last, end: m.start });
    out.push({ text: text.slice(m.start, m.end), ...m });
    last = m.end;
  }
  if (last < text.length) out.push({ text: text.slice(last), start: last, end: text.length });
  return out;
}

const MIRRORED_STYLES = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "fontStretch", "fontFeatureSettings",
  "fontVariationSettings", "fontKerning", "letterSpacing", "wordSpacing", "lineHeight", "textTransform", "textIndent",
  "textAlign", "tabSize", "direction", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopStyle", "borderRightStyle",
  "borderBottomStyle", "borderLeftStyle", "whiteSpace", "wordBreak", "overflowWrap",
] as const;

export interface UseTextareaMirrorOptions {
  /** Skip all work when false. Default true. */
  enabled?: boolean;
}

/**
 * Keeps a mirror element laid out exactly like a textarea (font, padding, borders, wrapping, scrollbar gutter,
 * size and scroll offset) so text rendered in the mirror lines up with the textarea's glyphs.
 * Attach `mirrorRef` to an absolutely positioned element behind the textarea and `onScroll` to the textarea.
 */
export function useTextareaMirror(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  { enabled = true }: UseTextareaMirrorOptions = {}
) {
  const mirrorRef = React.useRef<HTMLDivElement | null>(null);
  const sync = React.useCallback(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror || typeof window === "undefined") return;
    const cs = window.getComputedStyle(ta);
    const style = mirror.style as unknown as Record<string, string>;
    for (const prop of MIRRORED_STYLES) {
      const v = (cs as unknown as Record<string, string>)[prop];
      if (v) style[prop] = v;
    }
    mirror.style.boxSizing = "border-box";
    mirror.style.borderColor = "transparent";
    if (ta.offsetWidth) mirror.style.width = `${ta.offsetWidth}px`;
    if (ta.offsetHeight) mirror.style.height = `${ta.offsetHeight}px`;
    const borders = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
    const gutter = Math.max(0, ta.offsetWidth - ta.clientWidth - borders);
    if (gutter) mirror.style.paddingRight = `${(parseFloat(cs.paddingRight) || 0) + gutter}px`;
    mirror.scrollTop = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;
  }, [textareaRef]);

  useIsoLayoutEffect(() => {
    if (enabled) sync();
  }, [enabled, value, sync]);

  React.useEffect(() => {
    const ta = textareaRef.current;
    if (!enabled || !ta || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => sync());
    observer.observe(ta);
    return () => observer.disconnect();
  }, [enabled, sync, textareaRef]);

  return { mirrorRef, sync, onScroll: sync };
}

export interface PromptInputTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue"> {
  minRows?: number;
  maxRows?: number;
  /** Submit on Enter (Shift+Enter inserts a newline). Default true. */
  submitOnEnter?: boolean;
  /**
   * Highlight tokens inline. Renders a synchronized mirror behind a transparent-text textarea, so caret,
   * selection, IME and native editing are untouched. `true` highlights `@file`, `#tag` and `/command`.
   */
  highlight?: PromptInputHighlight;
  /** Class for the mirror layer (rarely needed). */
  mirrorClassName?: string;
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
      onScroll,
      disabled: disabledProp,
      highlight,
      mirrorClassName,
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

    const rules = React.useMemo(() => resolveHighlightRules(highlight), [highlight]);
    const highlighting = rules.length > 0;
    const mirror = useTextareaMirror(textareaRef, value, { enabled: highlighting });
    const segments = React.useMemo(
      () => (highlighting ? highlightTextSegments(value, rules) : []),
      [highlighting, value, rules]
    );

    const textarea = (
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
        onScroll={(e) => {
          onScroll?.(e);
          if (highlighting) mirror.onScroll();
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
          highlighting &&
            "relative z-[1] text-transparent caret-foreground selection:bg-primary/25 selection:text-transparent",
          className
        )}
        {...props}
      />
    );

    if (!highlighting) return textarea;
    return (
      <div data-slot="prompt-input-highlight" className="relative w-full">
        <div
          ref={mirror.mirrorRef}
          aria-hidden
          data-slot="prompt-input-mirror"
          className={cn(
            "pointer-events-none absolute left-0 top-0 overflow-hidden whitespace-pre-wrap break-words border-0 px-4 pb-2 pt-3.5 text-[15px] leading-6 text-foreground [overflow-wrap:break-word]",
            className,
            "m-0 bg-transparent",
            mirrorClassName
          )}
        >
          {segments.map((seg) =>
            seg.kind || seg.className ? (
              <span key={seg.start} data-highlight={seg.kind ?? ""} className={seg.className}>
                {seg.text}
              </span>
            ) : (
              <React.Fragment key={seg.start}>{seg.text}</React.Fragment>
            )
          )}
          {value.endsWith("\n") || value === "" ? "\u200b" : null}
        </div>
        {textarea}
      </div>
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

/** Fast-mode indicator: on, off, or cooling down (pass `fastCooldown` seconds). */
export type PromptInputFastMode = "on" | "off" | "cooldown";

function useCooldownSeconds(seconds: number | undefined, active: boolean, onEnd?: () => void) {
  const [remaining, setRemaining] = React.useState(Math.max(0, Math.ceil(seconds ?? 0)));
  const endRef = React.useRef(onEnd);
  endRef.current = onEnd;
  const prev = React.useRef(remaining);
  React.useEffect(() => setRemaining(Math.max(0, Math.ceil(seconds ?? 0))), [seconds, active]);
  React.useEffect(() => {
    if (active && prev.current > 0 && remaining === 0) endRef.current?.();
    prev.current = remaining;
    if (!active || remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [active, remaining]);
  return remaining;
}

export interface PromptInputModelPillProps extends ButtonProps {
  /** Model name. */
  model?: React.ReactNode;
  icon?: React.ReactNode;
  /** Reasoning-effort display (e.g. "High" or a glyph), shown muted after the name. */
  effort?: React.ReactNode;
  /** Fast-mode indicator state. Omit to hide the indicator. */
  fast?: PromptInputFastMode;
  /** Seconds left while `fast="cooldown"`; counts down by itself. */
  fastCooldown?: number;
  /** Called when the cooldown countdown reaches zero. */
  onFastCooldownEnd?: () => void;
  /** Show the dropdown chevron. Default true. */
  chevron?: boolean;
}

/** Compact model button for agent composers: name, effort and a fast-mode indicator with cooldown countdown. */
export const PromptInputModelPill = React.forwardRef<HTMLButtonElement, PromptInputModelPillProps>(
  (
    { model, icon, effort, fast, fastCooldown, onFastCooldownEnd, chevron = true, variant = "ghost", size = "sm", className, children, ...props },
    ref
  ) => {
    const remaining = useCooldownSeconds(fastCooldown, fast === "cooldown", onFastCooldownEnd);
    const fastState = fast === "cooldown" && remaining <= 0 ? "off" : fast;
    const fastLabel =
      fastState === "on"
        ? "Fast mode on"
        : fastState === "cooldown"
          ? `Fast mode cooling down, ${remaining}s left`
          : "Fast mode off";
    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        data-fast={fastState}
        className={cn(
          "min-w-0 gap-1 px-2.5 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
          className
        )}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0 [&_svg]:size-4">{icon}</span>}
        <span className="truncate">{model ?? "Select model"}</span>
        {effort != null && effort !== false && (
          <span data-slot="model-pill-effort" className="inline-flex shrink-0 items-center gap-1 text-muted-foreground/80">
            {effort}
          </span>
        )}
        {fastState && (
          <span
            data-slot="model-pill-fast"
            data-state={fastState}
            title={fastLabel}
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
              fastState === "on" && "text-warning",
              fastState === "off" && "text-muted-foreground/50",
              fastState === "cooldown" && "text-muted-foreground"
            )}
          >
            <RiFlashlightFill aria-hidden className="size-3.5!" />
            {fastState === "cooldown" && <span aria-hidden>{remaining}s</span>}
            <span className="sr-only">{fastLabel}</span>
          </span>
        )}
        {children}
        {chevron && <RiArrowDownSLine aria-hidden className="shrink-0 opacity-70" />}
      </Button>
    );
  }
);
PromptInputModelPill.displayName = "PromptInputModelPill";

export interface PromptInputModelSelectProps extends Omit<ButtonProps, "value" | "defaultValue"> {
  models: PromptInputModel[];
  /** Reasoning-effort display next to the model name. */
  effort?: React.ReactNode;
  /** Fast-mode indicator: on, off or cooling down. */
  fast?: PromptInputFastMode;
  /** Seconds left while `fast="cooldown"`. */
  fastCooldown?: number;
  onFastCooldownEnd?: () => void;
  /** Extra menu content below the model list (e.g. effort or fast-mode toggles). */
  menuFooter?: React.ReactNode;
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
    {
      models,
      value,
      defaultValue,
      onValueChange,
      menuLabel = "Model",
      align = "start",
      effort,
      fast,
      fastCooldown,
      onFastCooldownEnd,
      menuFooter,
      className,
      ...props
    },
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
          <PromptInputModelPill
            ref={ref}
            model={current?.name}
            icon={current?.icon}
            effort={effort}
            fast={fast}
            fastCooldown={fastCooldown}
            onFastCooldownEnd={onFastCooldownEnd}
            className={className}
            {...props}
          />
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
            {menuFooter && (
              <>
                <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
                {menuFooter}
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }
);
PromptInputModelSelect.displayName = "PromptInputModelSelect";

/* ------------------------------------------------------------------ */
/* Drop overlay                                                        */
/* ------------------------------------------------------------------ */

export interface PromptInputDropOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Main line. Default "Drop to attach as context". */
  label?: React.ReactNode;
  /** Secondary line (e.g. accepted types). */
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

/** Full-composer overlay shown while files (or `onContextDrop` data) are dragged over the PromptInput; replaces the default hint. */
export const PromptInputDropOverlay = React.forwardRef<HTMLDivElement, PromptInputDropOverlayProps>(
  ({ label = "Drop to attach as context", description, icon, className, children, ...props }, ref) => {
    const { dragging, registerDropOverlay } = usePromptInput();
    useIsoLayoutEffect(() => registerDropOverlay(), [registerDropOverlay]);
    if (!dragging) return null;
    return (
      <div
        ref={ref}
        data-slot="prompt-input-drop-overlay"
        className={cn(
          "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 rounded-[inherit] border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px] animate-in fade-in-0",
          className
        )}
        {...props}
      >
        <span className="inline-flex items-center gap-2 rounded-box bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md">
          {icon ?? <RiUploadCloud2Line aria-hidden className="size-4" />}
          {label}
        </span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
        {children}
      </div>
    );
  }
);
PromptInputDropOverlay.displayName = "PromptInputDropOverlay";

/* ------------------------------------------------------------------ */
/* Context chip                                                        */
/* ------------------------------------------------------------------ */

/** A line or [start, end] line range. */
export type PromptInputLineRange = number | readonly [number, number];

/** `src/app.tsx` + [10, 20] → `src/app.tsx#L10-20`. */
export function formatContextRange(path: string, lines?: PromptInputLineRange) {
  if (lines == null) return path;
  if (typeof lines === "number") return `${path}#L${lines}`;
  const [a, b] = lines;
  return a === b ? `${path}#L${a}` : `${path}#L${a}-${b}`;
}

export interface PromptInputContextChipProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** File path, shown as its base name (full path in the tooltip). */
  path: string;
  lines?: PromptInputLineRange;
  /** Overrides the visible label. */
  label?: React.ReactNode;
  icon?: React.ReactNode;
  /** Whether the context is sent with the prompt (eye toggle). */
  included?: boolean;
  defaultIncluded?: boolean;
  onIncludedChange?: (included: boolean) => void;
  /** Show the eye toggle. Default true. */
  toggleable?: boolean;
  onRemove?: () => void;
  /** Makes the label a button (e.g. open the file). */
  onOpen?: () => void;
}

/** Removable chip for attached context such as the editor selection or the open file, with an include/exclude eye toggle. */
export const PromptInputContextChip = React.forwardRef<HTMLDivElement, PromptInputContextChipProps>(
  (
    {
      path,
      lines,
      label,
      icon,
      included: includedProp,
      defaultIncluded = true,
      onIncludedChange,
      toggleable = true,
      onRemove,
      onOpen,
      className,
      ...props
    },
    ref
  ) => {
    const [included, setIncluded] = useControllableState<boolean>({
      value: includedProp,
      defaultValue: defaultIncluded,
      onChange: onIncludedChange,
    });
    const full = formatContextRange(path, lines);
    const base = path.split(/[\\/]/).filter(Boolean).pop() ?? path;
    const range = formatContextRange("", lines);
    const iconButton = cn(
      "inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-3.5",
      focusRing
    );
    const text = label ?? (
      <>
        <span className="truncate">{base}</span>
        {range && <span className="shrink-0 text-muted-foreground">{range}</span>}
      </>
    );
    return (
      <div
        ref={ref}
        role="group"
        aria-label={`Context: ${full}`}
        title={full}
        data-included={included ? "" : undefined}
        data-prompt-input-ignore=""
        className={cn(
          "inline-flex h-7 max-w-64 shrink-0 cursor-default items-center gap-1 rounded-control border border-border bg-subtle pl-1.5 pr-0.5 text-xs font-medium text-foreground",
          !included && "border-dashed bg-transparent text-muted-foreground",
          className
        )}
        {...props}
      >
        <span aria-hidden className="inline-flex shrink-0 text-muted-foreground [&_svg]:size-3.5">
          {icon ?? <RiFileCodeLine />}
        </span>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className={cn("flex min-w-0 items-center rounded-xs font-mono hover:underline", !included && "line-through", focusRing)}
          >
            {text}
          </button>
        ) : (
          <span className={cn("flex min-w-0 items-center font-mono", !included && "line-through")}>{text}</span>
        )}
        {toggleable && (
          <button
            type="button"
            aria-pressed={included}
            aria-label={included ? `Exclude ${full} from context` : `Include ${full} in context`}
            title={included ? "Exclude from context" : "Include in context"}
            onClick={() => setIncluded(!included)}
            className={iconButton}
          >
            {included ? <RiEyeLine /> : <RiEyeOffLine />}
          </button>
        )}
        {onRemove && (
          <button type="button" aria-label={`Remove ${full}`} title="Remove" onClick={onRemove} className={iconButton}>
            <RiCloseLine />
          </button>
        )}
      </div>
    );
  }
);
PromptInputContextChip.displayName = "PromptInputContextChip";

/* ------------------------------------------------------------------ */
/* Add-context menu                                                    */
/* ------------------------------------------------------------------ */

export interface PromptInputAddContextItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export interface PromptInputAddContextMenuProps extends Omit<PromptInputButtonProps, "onChange"> {
  /** "Attach file…" (e.g. an editor file picker). Hidden when unset. */
  onAttachFile?: () => void;
  /** "Mention a file from this project…" (open a file search). Default: inserts "@" at the caret. */
  onMentionFile?: () => void;
  /** "Paste image". Default: reads images from the clipboard into `onFilesAdded` (when supported). */
  onPasteImage?: () => void;
  /** File input `accept` for "Upload from computer". */
  accept?: string;
  /** Replace or extend the item list: an array, or a function receiving the defaults. */
  items?: PromptInputAddContextItem[] | ((defaults: PromptInputAddContextItem[]) => PromptInputAddContextItem[]);
  /** Heading inside the menu. Default "Add context". */
  menuLabel?: string;
  align?: "start" | "center" | "end";
}

/** "+" menu for adding context: attach file, mention a project file, upload, paste image, or custom items. */
export const PromptInputAddContextMenu = React.forwardRef<HTMLButtonElement, PromptInputAddContextMenuProps>(
  (
    {
      onAttachFile,
      onMentionFile,
      onPasteImage,
      accept,
      items,
      menuLabel = "Add context",
      align = "start",
      label = "Add context",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const ctx = React.useContext(PromptInputContext);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const acceptsFiles = !!ctx?.acceptsFiles;
    const canReadClipboard =
      typeof navigator !== "undefined" && typeof (navigator.clipboard as Clipboard | undefined)?.read === "function";

    const insertAt = () => {
      const el = ctx?.textareaRef.current;
      if (!ctx || !el) return;
      const start = el.selectionStart ?? ctx.value.length;
      const end = el.selectionEnd ?? start;
      const before = ctx.value.slice(0, start);
      const insert = (before && !/\s$/.test(before) ? " " : "") + "@";
      ctx.setValue(before + insert + ctx.value.slice(end));
      const caret = start + insert.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    };

    const pasteImage = async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        const files: File[] = [];
        for (const item of clipboardItems) {
          const type = item.types.find((t) => t.startsWith("image/"));
          if (!type) continue;
          const blob = await item.getType(type);
          files.push(new File([blob], `pasted-image.${type.split("/")[1] ?? "png"}`, { type }));
        }
        ctx?.addFiles(files);
      } catch {
        /* permission denied or nothing to paste */
      }
    };

    const defaults: PromptInputAddContextItem[] = [];
    if (onAttachFile) defaults.push({ id: "attach-file", label: "Attach file…", icon: <RiAttachment2 />, onSelect: onAttachFile });
    if (onMentionFile || ctx)
      defaults.push({
        id: "mention-file",
        label: "Mention a file from this project…",
        icon: <RiAtLine />,
        shortcut: "@",
        onSelect: onMentionFile ?? insertAt,
      });
    if (acceptsFiles)
      defaults.push({
        id: "upload",
        label: "Upload from computer",
        icon: <RiUploadCloud2Line />,
        onSelect: () => inputRef.current?.click(),
      });
    if (onPasteImage || (acceptsFiles && canReadClipboard))
      defaults.push({ id: "paste-image", label: "Paste image", icon: <RiClipboardLine />, onSelect: onPasteImage ?? (() => void pasteImage()) });

    const list = typeof items === "function" ? items(defaults) : (items ?? defaults);

    return (
      <>
        <Menu>
          <DropdownMenuTrigger asChild>
            <PromptInputButton ref={ref} label={label} disabled={disabled ?? (!!ctx?.disabled || list.length === 0)} {...props}>
              {children ?? <RiAddLine />}
            </PromptInputButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} side="top" className="min-w-64">
            {menuLabel && (
              <>
                <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            {list.map((item) => (
              <DropdownMenuItem
                key={item.id}
                icon={item.icon}
                description={item.description}
                shortcut={item.shortcut}
                disabled={item.disabled}
                onSelect={item.onSelect}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Menu>
        {acceptsFiles && (
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            tabIndex={-1}
            accept={accept}
            onChange={(e) => {
              ctx?.addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        )}
      </>
    );
  }
);
PromptInputAddContextMenu.displayName = "PromptInputAddContextMenu";
