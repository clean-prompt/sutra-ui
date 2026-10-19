/** Chat composer: the PromptInput root (state, drag-and-drop, large-paste notice) and the restored-draft notice; re-exports the composer parts. */
import * as React from "react";
import { RiCloseLine, RiFileTextLine, RiHistoryLine, RiUploadCloud2Line } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { Button } from "../../primitives/button";
import { useControllableState } from "../../hooks/use-controllable-state";
import { PromptInputContext, type PromptInputContextValue } from "./prompt-input-internal";

export { usePromptInput } from "./prompt-input-internal";
export * from "./prompt-input-textarea";
export * from "./prompt-input-attachments";
export * from "./prompt-input-toolbar";
export * from "./prompt-input-model";

export interface PromptInputProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the current text when the user submits (Enter or the submit button). */
  onSubmit?: (value: string, event: React.FormEvent<HTMLFormElement>) => void;
  /** A response is streaming: the submit button becomes a stop button and Enter won't submit. */
  loading?: boolean;
  /** @deprecated Use `loading`. */
  isLoading?: boolean;
  /** Called by the stop button while `loading`. */
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
  /**
   * Opt-in: plain-text pastes longer than this many characters (e.g. 3000) become an attachment instead of
   * flooding the textarea. Routed to `onLargePaste`, else to `onFilesAdded` as a generated `.txt` File.
   */
  largePasteThreshold?: number;
  /** Receives an oversized paste (see `largePasteThreshold`). */
  onLargePaste?: (text: string) => void;
  /** The user chose "Paste inline" on the notice: the text is inserted; remove the attachment you created. */
  onLargePasteUndo?: (text: string, file?: File) => void;
  /** Auto-hide the large-paste notice after this many ms (0 = never). Default 8000. */
  largePasteNoticeDuration?: number;
}

interface LargePasteNotice {
  text: string;
  file?: File;
  selection: readonly [number, number];
  /** The composer text when the paste happened; the selection is only valid while it's unchanged. */
  base?: string;
}

/** Chat composer card. Compose with PromptInputAttachments, PromptInputTextarea and PromptInputToolbar. */
export const PromptInput = React.forwardRef<HTMLFormElement, PromptInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSubmit,
      loading: loadingProp,
      isLoading: isLoadingProp,
      onStop,
      disabled = false,
      clearOnSubmit = true,
      canSubmit: canSubmitProp,
      onFilesAdded,
      onContextDrop,
      largePasteThreshold,
      onLargePaste,
      onLargePasteUndo,
      largePasteNoticeDuration = 8000,
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
    const loading = loadingProp ?? isLoadingProp ?? false;
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
    const canSubmit = !disabled && !loading && (canSubmitProp ?? value.trim().length > 0);
    const acceptsFiles = !!onFilesAdded && !disabled;

    const addFiles = React.useCallback(
      (files: File[]) => {
        if (files.length > 0) onFilesAdded?.(files);
      },
      [onFilesAdded]
    );

    const [pasteNotice, setPasteNotice] = React.useState<LargePasteNotice | null>(null);
    const largePasteEnabled = !!largePasteThreshold && largePasteThreshold > 0 && (!!onLargePaste || !!onFilesAdded);
    const handleLargePaste = React.useCallback(
      (text: string, selection: readonly [number, number]) => {
        if (!largePasteThreshold || largePasteThreshold <= 0 || text.length <= largePasteThreshold) return false;
        if (onLargePaste) {
          onLargePaste(text);
          setPasteNotice({ text, selection, base: textareaRef.current?.value });
          return true;
        }
        if (onFilesAdded) {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const file = new File([text], `pasted-text-${stamp}.txt`, { type: "text/plain" });
          onFilesAdded([file]);
          setPasteNotice({ text, file, selection, base: textareaRef.current?.value });
          return true;
        }
        return false;
      },
      [largePasteThreshold, onLargePaste, onFilesAdded]
    );

    React.useEffect(() => {
      if (!pasteNotice || !largePasteNoticeDuration) return;
      const t = setTimeout(() => setPasteNotice(null), largePasteNoticeDuration);
      return () => clearTimeout(t);
    }, [pasteNotice, largePasteNoticeDuration]);

    const undoLargePaste = () => {
      if (!pasteNotice) return;
      // If the text changed since the paste, the recorded selection is stale: insert at the caret instead.
      const ta = textareaRef.current;
      const [start, end] =
        pasteNotice.base === undefined || pasteNotice.base === value || !ta
          ? pasteNotice.selection
          : [ta.selectionStart ?? value.length, ta.selectionEnd ?? value.length];
      const s0 = Math.min(start, value.length);
      const e0 = clamp(end, s0, value.length);
      setValue(value.slice(0, s0) + pasteNotice.text + value.slice(e0));
      onLargePasteUndo?.(pasteNotice.text, pasteNotice.file);
      setPasteNotice(null);
      textareaRef.current?.focus();
    };

    const ctx = React.useMemo<PromptInputContextValue>(
      () => ({
        value,
        setValue,
        loading,
        isLoading: loading,
        disabled,
        canSubmit,
        onStop,
        addFiles,
        acceptsFiles,
        textareaRef,
        dragging,
        registerDropOverlay,
        onLargePaste: largePasteEnabled ? handleLargePaste : undefined,
        handleLargePaste: largePasteEnabled ? handleLargePaste : undefined,
      }),
      [value, setValue, loading, disabled, canSubmit, onStop, addFiles, acceptsFiles, dragging, registerDropOverlay, largePasteEnabled, handleLargePaste]
    );

    const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const acceptsContext = !!onContextDrop && !disabled;
    const accepts = (e: React.DragEvent) =>
      (acceptsFiles && hasFiles(e)) || (acceptsContext && (e.dataTransfer?.types?.length ?? 0) > 0);

    return (
      <PromptInputContext.Provider value={ctx}>
        <form
          ref={ref}
          data-loading={loading || undefined}
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
          {pasteNotice && (
            <div
              role="status"
              data-slot="prompt-input-large-paste"
              data-prompt-input-ignore=""
              className="mx-3 mt-2.5 flex cursor-default items-center gap-2 rounded-control border border-border bg-subtle py-1 pl-2.5 pr-1 text-xs text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
            >
              <RiFileTextLine aria-hidden className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                Pasted {pasteNotice.text.length.toLocaleString()} characters as an attachment
              </span>
              <Button type="button" size="xs" variant="ghost" className="h-6" onClick={undoLargePaste}>
                Paste inline
              </Button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setPasteNotice(null)}
                className={cn("inline-flex size-6 items-center justify-center rounded-xs hover:bg-accent hover:text-foreground [&_svg]:size-3.5", focusRing)}
              >
                <RiCloseLine aria-hidden />
              </button>
            </div>
          )}
          {children}
          {dragging && customOverlays === 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-1 z-10 flex items-center justify-center gap-2 rounded-[inherit] border-2 border-dashed border-primary/50 bg-primary-soft/90 text-sm font-medium text-primary-soft-foreground animate-in fade-in-0"
            >
              <RiUploadCloud2Line aria-hidden className="size-5" />
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
/* Restored draft notice                                               */
/* ------------------------------------------------------------------ */

export interface PromptInputRestoredDraftProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Main line. Default "Restored your unsent draft". */
  message?: React.ReactNode;
  /** When the draft was saved, shown muted after the message (e.g. "2h ago"). */
  savedAt?: React.ReactNode;
  /** Discard the draft. Inside a PromptInput the text is also cleared unless `clearOnDiscard={false}`. */
  onDiscard?: () => void;
  /** Keep the draft (just dismisses the notice). */
  onKeep?: () => void;
  clearOnDiscard?: boolean;
  /** Controlled visibility. Uncontrolled notices hide themselves after either choice. */
  open?: boolean;
  /** Initial visibility when uncontrolled. Default true. */
  defaultOpen?: boolean;
  /** Called when Discard or Keep hides the notice. */
  onOpenChange?: (open: boolean) => void;
  discardLabel?: string;
  keepLabel?: string;
}

/** Notice shown when an unsent draft was restored into the composer, with Discard / Keep. */
export const PromptInputRestoredDraft = React.forwardRef<HTMLDivElement, PromptInputRestoredDraftProps>(
  (
    {
      message = "Restored your unsent draft",
      savedAt,
      onDiscard,
      onKeep,
      clearOnDiscard = true,
      open: openProp,
      defaultOpen = true,
      onOpenChange,
      discardLabel = "Discard",
      keepLabel = "Keep",
      className,
      ...props
    },
    ref
  ) => {
    const ctx = React.useContext(PromptInputContext);
    const [open, setInnerOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    if (!open) return null;
    return (
      <div
        ref={ref}
        role="status"
        data-slot="prompt-input-restored-draft"
        data-prompt-input-ignore=""
        className={cn(
          "flex cursor-default items-center gap-2 rounded-control border border-info/30 bg-info-soft py-1 pl-2.5 pr-1 text-xs text-info-soft-foreground",
          ctx && "mx-3 mt-2.5",
          className
        )}
        {...props}
      >
        <RiHistoryLine aria-hidden className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {message}
          {savedAt && <span className="ml-1 opacity-70">· {savedAt}</span>}
        </span>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="h-6 text-current"
          onClick={() => {
            onDiscard?.();
            if (ctx && clearOnDiscard) ctx.setValue("");
            setInnerOpen(false);
          }}
        >
          {discardLabel}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="secondary"
          className="h-6"
          onClick={() => {
            onKeep?.();
            setInnerOpen(false);
            ctx?.textareaRef.current?.focus();
          }}
        >
          {keepLabel}
        </Button>
      </div>
    );
  }
);
PromptInputRestoredDraft.displayName = "PromptInputRestoredDraft";
